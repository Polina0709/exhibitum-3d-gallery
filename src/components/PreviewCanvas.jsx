import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useProgress } from '@react-three/drei';
import GalleryModel from './GalleryModel';
import { getApprovedRequests } from '../services/requestService';

function Loader() {
    const { progress } = useProgress();
    return <Html center>{progress.toFixed(0)} % loaded</Html>;
}

export default function PreviewCanvas() {
    const [artworks, setArtworks] = useState([]);

    useEffect(() => {
        const fetchArtworks = async () => {
            try {
                const approved = await getApprovedRequests();
                setArtworks(approved);
            } catch (error) {
                console.error("Error loading pictures for preview:", error);
            }
        };
        fetchArtworks();
    }, []);

    return (
        <Canvas camera={{ position: [-230, 100, 0], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            <Environment preset="city" />

            <Suspense fallback={<Loader />}>

                <GalleryModel artworks={artworks} />
            </Suspense>

            <OrbitControls
                enablePan={false}
                minDistance={5}
                maxDistance={25}
                autoRotate={true}
                autoRotateSpeed={0.5}
            />
        </Canvas>
    );
}