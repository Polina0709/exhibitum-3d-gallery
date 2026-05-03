import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export default function GalleryModel({ artworks }) {
    const { scene } = useGLTF('/diploma_museum_new.glb');
    const { invalidate } = useThree();

    useEffect(() => {
        if (!artworks || artworks.length === 0) return;

        const textureLoader = new THREE.TextureLoader();
        const placeholders = {};

        scene.traverse((child) => {
            if (child.isMesh) {
                child.matrixAutoUpdate = false;
                child.updateMatrix();

                if (child.name.includes('Place')) {
                    placeholders[child.name] = child;
                }
            }
        });

        artworks.forEach((artwork) => {
            const targetSlotName = artwork.placementSlot;

            if (targetSlotName && placeholders[targetSlotName]) {
                const targetMesh = placeholders[targetSlotName];

                if (targetMesh.userData.loadedArtworkId === artwork.id) {
                    return;
                }

                textureLoader.load(
                    artwork.imageUrl,
                    (texture) => {
                        texture.flipY = true;
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.center.set(0.5, 0.5);
                        texture.rotation = Math.PI / 2;
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.repeat.x = -1;

                        if (targetMesh.material && targetMesh.material.map) {
                            targetMesh.material.map.dispose();
                            targetMesh.material.dispose();
                        }

                        const imageMaterial = new THREE.MeshStandardMaterial({
                            map: texture,
                            roughness: 0.3,
                            metalness: 0.1,
                            emissive: new THREE.Color(0xffffff),
                            emissiveMap: texture,
                            emissiveIntensity: 0.15
                        });

                        targetMesh.material = imageMaterial;
                        targetMesh.material.needsUpdate = true;
                        targetMesh.userData.loadedArtworkId = artwork.id;

                        invalidate();
                    }
                );
            }
        });
    }, [scene, artworks, invalidate]);

    useEffect(() => {
        return () => {
            scene.traverse((child) => {
                if (child.isMesh && child.name.includes('Place_') && child.material) {
                    if (child.material.map) child.material.map.dispose();
                    if (child.material.emissiveMap) child.material.emissiveMap.dispose();
                    child.material.dispose();
                    child.userData.loadedArtworkId = null;
                }
            });
        };
    }, [scene]);

    return <primitive object={scene} />;
}