import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Environment, Html, useProgress, Bvh } from '@react-three/drei';
import { Link, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import GalleryModel from '../components/GalleryModel';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { getApprovedRequests, incrementViews, incrementLikes, decrementLikes, addCommentToArtwork } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Exhibition.css';
import footstepsSound from '../assets/footsteps.mp3';
import { useMultiplayer } from '../hooks/useMultiplayer';

const MOVEMENT_SPEED = 7;

const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const rayDirLeft = new THREE.Vector3();
const rayDirRight = new THREE.Vector3();
const tempNormal = new THREE.Vector3();

const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/.test(navigator.userAgent));

function Loader({ loadingText }) {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="loader-text">
                {loadingText} {progress.toFixed(0)}%
            </div>
        </Html>
    );
}

function TeleportManager({ targetSlot, setTargetSlot, startY }) {
    const { camera, scene } = useThree();

    useEffect(() => {
        if (targetSlot) {
            const mesh = scene.getObjectByName(targetSlot);
            if (mesh) {
                const targetPos = new THREE.Vector3();
                mesh.getWorldPosition(targetPos);

                const roomCenter = new THREE.Vector3(0, startY, 0);
                const dirToCenter = new THREE.Vector3().subVectors(roomCenter, targetPos).normalize();

                camera.position.set(
                    targetPos.x + dirToCenter.x * 3,
                    startY,
                    targetPos.z + dirToCenter.z * 3
                );
            }
            setTimeout(() => setTargetSlot(null), 0);
        }
    }, [targetSlot, scene, camera, startY, setTargetSlot]);

    return null;
}

function InteractionManager({ artworks, onSelect, isPanelOpen }) {
    const { camera, scene } = useThree();

    useEffect(() => {
        const clickRaycaster = new THREE.Raycaster();

        const handlePointerDown = (e) => {
            if (e.button !== 0 && e.type !== 'touchstart') return;
            if (isPanelOpen) return;

            if (e.target && e.target.closest('.joystick-area')) return;

            let clientX = window.innerWidth / 2;
            let clientY = window.innerHeight / 2;

            if (e.type === 'touchstart' && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }

            const x = (clientX / window.innerWidth) * 2 - 1;
            const y = -(clientY / window.innerHeight) * 2 + 1;

            clickRaycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const intersects = clickRaycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const hit = intersects[0];
                if (hit.distance < 4 && hit.object.name.includes('Place_')) {
                    const slotName = hit.object.name;
                    const clickedArtwork = artworks.find(a => a.placementSlot === slotName);

                    if (clickedArtwork) {
                        if (!isMobile) document.exitPointerLock();
                        onSelect(clickedArtwork);
                    }
                }
            }
        };

        window.addEventListener('mousedown', handlePointerDown);
        if (isMobile) window.addEventListener('touchstart', handlePointerDown);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            if (isMobile) window.removeEventListener('touchstart', handlePointerDown);
        };
    }, [camera, scene, artworks, onSelect, isPanelOpen]);

    return null;
}

function MobileLook({ isPanelOpen }) {
    const { camera } = useThree();
    const previousTouch = useRef(null);

    useEffect(() => {
        camera.rotation.reorder('YXZ');
        const handleTouchStart = (e) => {
            if (isPanelOpen) return;
            const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth / 2);
            if (touch) previousTouch.current = { x: touch.clientX, y: touch.clientY };
        };

        const handleTouchMove = (e) => {
            if (isPanelOpen || !previousTouch.current) return;
            const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth / 2);
            if (!touch) return;

            const movementX = touch.clientX - previousTouch.current.x;
            const movementY = touch.clientY - previousTouch.current.y;

            camera.rotation.y -= movementX * 0.005;
            camera.rotation.x -= movementY * 0.005;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

            previousTouch.current = { x: touch.clientX, y: touch.clientY };
        };

        const handleTouchEnd = () => { previousTouch.current = null; };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [camera, isPanelOpen]);

    return null;
}

function Firefly({ pos }) {
    if (typeof pos.x !== 'number' || isNaN(pos.x)) return null;

    return (
        <mesh position={[pos.x, pos.y, pos.z]}>
            <sphereGeometry args={[0.15, 25, 25]} />
            <meshBasicMaterial color="#FDF9F2" transparent opacity={0.8} />
            <pointLight distance={4} intensity={1} color="#AF878D" />
        </mesh>
    );
}

function Fireflies({ currentUser }) {
    const players = useMultiplayer(currentUser);

    return (
        <group>
            {Object.entries(players).map(([id, pos]) => (
                <Firefly key={id} pos={pos} />
            ))}
        </group>
    );
}

function Player({ startY, joystickMove }) {
    const { forward, backward, left, right } = usePlayerControls();
    const { camera, scene } = useThree();

    const collidersRef = useRef([]);
    const isCached = useRef(false);
    const raycaster = useRef(new THREE.Raycaster());

    const footstepAudio = useRef(null);
    const PLAYER_RADIUS = 1.0;

    useEffect(() => {
        footstepAudio.current = new Audio(footstepsSound);
        footstepAudio.current.loop = true;
        footstepAudio.current.volume = 0.6;

        return () => {
            if (footstepAudio.current) {
                footstepAudio.current.pause();
                footstepAudio.current = null;
            }
        };
    }, []);

    useFrame((state, delta) => {
        if (!isCached.current) {
            const solidObjects = [];
            let totalMeshes = 0;
            scene.traverse((child) => {
                if (child.isMesh && child.visible) {
                    totalMeshes++;
                    if (!child.name.includes('Place')) {
                        solidObjects.push(child);
                    }
                }
            });
            if (totalMeshes > 10) {
                collidersRef.current = solidObjects;
                isCached.current = true;
            }
        }

        const moveZ = Number(backward) - Number(forward) + joystickMove.y;
        const moveX = Number(left) - Number(right) - joystickMove.x;

        const inputLength = Math.sqrt(moveX * moveX + moveZ * moveZ);

        if (footstepAudio.current) {
            if (inputLength > 0.05 && isCached.current) {
                if (footstepAudio.current.paused) {
                    footstepAudio.current.play().catch(() => console.warn("Audio waiting for user interaction"));
                }
                const normalizedSpeed = Math.min(inputLength, 1.0);
                footstepAudio.current.playbackRate = 2.0 + (normalizedSpeed * 1.0);
            } else {
                if (!footstepAudio.current.paused) {
                    footstepAudio.current.pause();
                }
            }
        }

        frontVector.set(0, 0, moveZ);
        sideVector.set(moveX, 0, 0);

        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(MOVEMENT_SPEED * delta)
            .applyEuler(camera.rotation);

        direction.y = 0;
        const speed = direction.length();

        if (speed > 0.001 && isCached.current) {
            direction.normalize();
            camera.position.addScaledVector(direction, speed);

            rayDirLeft.copy(direction).applyAxisAngle(upVector, 0.6);
            rayDirRight.copy(direction).applyAxisAngle(upVector, -0.6);

            const rays = [direction, rayDirLeft, rayDirRight];

            for (let i = 0; i < 3; i++) {
                raycaster.current.set(camera.position, rays[i]);
                raycaster.current.far = PLAYER_RADIUS;

                const hits = raycaster.current.intersectObjects(collidersRef.current, false);

                if (hits.length > 0) {
                    const hit = hits[0];
                    const penetrationDepth = PLAYER_RADIUS - hit.distance;

                    tempNormal.copy(hit.face.normal);
                    tempNormal.y = 0;

                    if (tempNormal.lengthSq() > 0) {
                        tempNormal.normalize();
                        camera.position.addScaledVector(tempNormal, penetrationDepth);
                    }
                }
            }
        }

        camera.position.y = startY;
    });

    return null;
}

function JoystickOverlay({ onMove }) {
    const baseRef = useRef(null);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

    const handleTouch = (e) => {
        if (e.type !== 'touchend' && e.touches.length > 0) {
            const touch = Array.from(e.touches).find(t => t.clientX < window.innerWidth / 2);
            if (!touch) return handleEnd();

            const base = baseRef.current.getBoundingClientRect();
            const centerX = base.left + base.width / 2;
            const centerY = base.top + base.height / 2;
            const maxRadius = base.width / 2;

            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxRadius) {
                dx = (dx / distance) * maxRadius;
                dy = (dy / distance) * maxRadius;
            }

            setStickPos({ x: dx, y: dy });
            onMove({ x: dx / maxRadius, y: dy / maxRadius });
        }
    };

    const handleEnd = () => {
        setStickPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
    };

    return (
        <div className="joystick-area">
            <div
                ref={baseRef}
                className="joystick-base"
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                onTouchEnd={handleEnd}
            >
                <div
                    className="joystick-stick"
                    style={{ transform: `translate(${stickPos.x}px, ${stickPos.y}px)` }}
                />
            </div>
        </div>
    );
}

export default function Exhibition() {
    const { currentUser } = useAuth();
    const location = useLocation();
    const { t } = useTranslation();
    const startPosition = [-25, 6, 0.103];

    const [artworks, setArtworks] = useState(null);
    const [selectedArtwork, setSelectedArtwork] = useState(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    const [teleportTarget, setTeleportTarget] = useState(null);
    const [isMapOpen, setIsMapOpen] = useState(false);

    const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });

    const storageKey = `likedArtworks_${currentUser ? currentUser.uid : 'guest'}`;
    const [likedArtworks, setLikedArtworks] = useState(new Set());

    const [commentName, setCommentName] = useState('');
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        const savedLikes = localStorage.getItem(storageKey);
        if (savedLikes) {
            setLikedArtworks(new Set(JSON.parse(savedLikes)));
        } else {
            setLikedArtworks(new Set());
        }
    }, [storageKey]);

    useEffect(() => {
        const fetchArtworks = async () => {
            try {
                const approved = await getApprovedRequests();
                setArtworks(approved);
            } catch (error) {
                console.error("Database loading error:", error);
                setArtworks([]);
            }
        };
        fetchArtworks();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const pressedKey = e.key.toLowerCase();

            if ((pressedKey === 'm' || pressedKey === 'к' || pressedKey === 'ь') && !selectedArtwork) {
                setIsMapOpen(prev => {
                    if (!prev && !isMobile) document.exitPointerLock();
                    return !prev;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedArtwork]);

    const handleArtworkSelect = async (artwork) => {
        setSelectedArtwork(artwork);
        await incrementViews(artwork.id);
        setArtworks(prev => prev.map(a =>
            a.id === artwork.id ? { ...a, views: (a.views || 0) + 1 } : a
        ));
    };

    useEffect(() => {
        if (artworks && artworks.length > 0 && !initialLoadDone) {
            const params = new URLSearchParams(location.search);
            const artworkIdFromUrl = params.get('artworkId');

            if (artworkIdFromUrl) {
                const targetArtwork = artworks.find(a => a.id === artworkIdFromUrl);
                if (targetArtwork) {
                    setTeleportTarget(targetArtwork.placementSlot);
                    handleArtworkSelect(targetArtwork);
                }
            }
            setTimeout(() => setInitialLoadDone(true), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artworks, location.search, initialLoadDone]);

    const handleFastTravel = (artwork) => {
        setTeleportTarget(artwork.placementSlot);
        setIsMapOpen(false);
    };

    const handleLikeToggle = async () => {
        if (!selectedArtwork) return;

        const isLiked = likedArtworks.has(selectedArtwork.id);
        const newLiked = new Set(likedArtworks);

        if (isLiked) {
            newLiked.delete(selectedArtwork.id);
        } else {
            newLiked.add(selectedArtwork.id);
        }

        setLikedArtworks(newLiked);
        localStorage.setItem(storageKey, JSON.stringify([...newLiked]));

        const delta = isLiked ? -1 : 1;
        setSelectedArtwork(prev => ({ ...prev, likes: Math.max(0, (prev.likes || 0) + delta) }));
        setArtworks(prev => prev.map(a =>
            a.id === selectedArtwork.id ? { ...a, likes: Math.max(0, (a.likes || 0) + delta) } : a
        ));

        try {
            if (isLiked) {
                await decrementLikes(selectedArtwork.id);
            } else {
                await incrementLikes(selectedArtwork.id);
            }
        } catch (e) {
            console.error("Like update error:", e);
        }
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/exhibition?artworkId=${selectedArtwork.id}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert(t('share_success')))
            .catch(err => console.error('Copy error: ', err));
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentName.trim() || !commentText.trim()) return;

        const newComment = {
            name: commentName,
            text: commentText,
            date: new Date().toISOString(),
        };

        setSelectedArtwork(prev => ({
            ...prev,
            comments: [...(prev.comments || []), newComment]
        }));
        setArtworks(prev => prev.map(a =>
            a.id === selectedArtwork.id ? { ...a, comments: [...(a.comments || []), newComment] } : a
        ));

        setCommentName('');
        setCommentText('');

        await addCommentToArtwork(selectedArtwork.id, newComment);
    };

    if (artworks === null) {
        return (
            <div className="exhibition-loading-screen">
                {t('connecting_db')}
            </div>
        );
    }

    return (
        <div className="exhibition-wrapper">
            <div className="exit-btn-container">
                <Link to="/" className="exit-btn">
                    <span className="exit-icon">⟵</span> {t('exit')}
                </Link>
            </div>

            {isMobile && !selectedArtwork && !isMapOpen && (
                <button
                    className="mobile-map-btn"
                    onClick={() => setIsMapOpen(true)}
                >
                    {t('map_btn')}
                </button>
            )}

            {!isMobile && (
                <div className="controls-hint">
                    <p dangerouslySetInnerHTML={{ __html: t('controls_desktop_html') }} />
                </div>
            )}
            {isMobile && (
                <div className="controls-hint">
                    <p>{t('controls_mobile')}</p>
                </div>
            )}

            {!isMobile && <div className="crosshair"></div>}

            {isMobile && !selectedArtwork && !isMapOpen && (
                <JoystickOverlay onMove={setJoystickMove} />
            )}

            {isMapOpen && !selectedArtwork && (
                <div className="overlay-backdrop">
                    <div className="map-modal">
                        <div className="map-header">
                            <h2>{t('fast_travel')}</h2>
                            <button onClick={() => setIsMapOpen(false)} className="close-btn">✕</button>
                        </div>

                        <div className="map-grid">
                            {artworks.map(artwork => (
                                <div key={artwork.id} onClick={() => handleFastTravel(artwork)} className="map-card">
                                    <div className="map-image-wrapper">
                                        <img src={artwork.imageUrl} alt={artwork.title} />
                                    </div>
                                    <h4>{artwork.title}</h4>
                                    <p>{artwork.artistName}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {selectedArtwork && (
                <div className="overlay-backdrop">
                    <div className="artwork-modal">
                        <div className="artwork-image-section">
                            <img src={selectedArtwork.imageUrl} alt={selectedArtwork.title} />
                        </div>

                        <div className="artwork-info-section">
                            <button onClick={() => setSelectedArtwork(null)} className="close-btn modal-close">✕</button>

                            <h2>{selectedArtwork.title}</h2>
                            <p className="artist-name">
                                {selectedArtwork.artistName}
                                <Link to={`/artist/${selectedArtwork.userId}`} className="visit-profile-link" style={{display: 'block', fontSize: '12px', color: '#AF878D', marginTop: '5px'}}>
                                    {t('view_profile')}
                                </Link>
                            </p>
                            <hr />

                            <div className="artwork-description">
                                <p>{selectedArtwork.description}</p>
                            </div>

                            <div className="reviews-section">
                                <h3>{t('reviews')}</h3>
                                <div className="reviews-list">
                                    {(!selectedArtwork.comments || selectedArtwork.comments.length === 0) ? (
                                        <p className="no-reviews">{t('no_reviews')}</p>
                                    ) : (
                                        selectedArtwork.comments.map((msg, idx) => (
                                            <div key={idx} className="review-item">
                                                <div className="review-header">
                                                    <strong>{msg.name}</strong>
                                                    <span>{new Date(msg.date).toLocaleDateString()}</span>
                                                </div>
                                                <p>{msg.text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleSubmitComment} className="review-form">
                                    <input
                                        type="text"
                                        placeholder={t('your_name')}
                                        value={commentName}
                                        onChange={(e) => setCommentName(e.target.value)}
                                        className="review-input"
                                        maxLength={30}
                                        required
                                    />
                                    <div className="review-input-group">
                                        <input
                                            type="text"
                                            placeholder={t('write_review')}
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="review-input flex-grow"
                                            maxLength={150}
                                            required
                                        />
                                        <button type="submit" className="review-submit-btn">➔</button>
                                    </div>
                                </form>
                            </div>

                            <div className="artwork-actions">
                                <div className="stat-item">
                                    <span>👁️</span> {(selectedArtwork.views || 0) + (selectedArtwork.views === undefined ? 0 : 1)}
                                </div>

                                <div className="stat-item">
                                    {t('lbl_likes_capital')}: <strong>{selectedArtwork.likes || 0}</strong>
                                </div>

                                <button onClick={handleShare} className="share-btn" title={t('share_title')}>
                                    🔗 {t('share')}
                                </button>

                                <button
                                    onClick={handleLikeToggle}
                                    className={`like-btn ${likedArtworks.has(selectedArtwork.id) ? 'liked' : ''}`}
                                    title={likedArtworks.has(selectedArtwork.id) ? t('unlike_title') : t('like_title')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        transition: 'transform 0.2s ease'
                                    }}
                                    onPointerDown={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
                                    onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {likedArtworks.has(selectedArtwork.id) ? '❤️' : '🤍'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Canvas
                camera={{ position: startPosition, fov: 60 }}
                dpr={[1, 2]}
                gl={{ powerPreference: "high-performance", antialias: true }}
            >
                <color attach="background" args={['#fdf7ed']} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 5]} intensity={1.5} />
                <Environment preset="city" />

                <Suspense fallback={<Loader loadingText={t('loading')} />}>
                    <Bvh firstHitOnly>
                        <GalleryModel artworks={artworks} />
                    </Bvh>
                </Suspense>

                <InteractionManager artworks={artworks} onSelect={handleArtworkSelect} isPanelOpen={!!selectedArtwork || isMapOpen} />
                <TeleportManager targetSlot={teleportTarget} setTargetSlot={setTeleportTarget} startY={startPosition[1]} />
                <Player startY={startPosition[1]} joystickMove={joystickMove} />

                <Fireflies currentUser={currentUser} />

                {!selectedArtwork && !isMapOpen && !isMobile && <PointerLockControls />}
                {isMobile && <MobileLook isPanelOpen={!!selectedArtwork || isMapOpen} />}
            </Canvas>
        </div>
    );
}