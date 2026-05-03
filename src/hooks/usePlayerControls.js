import { useState, useEffect } from 'react';

export const usePlayerControls = () => {
    const [movement, setMovement] = useState({
        forward: false,
        backward: false,
        left: false,
        right: false,
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setMovement((m) => ({ ...m, forward: true }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setMovement((m) => ({ ...m, backward: true }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setMovement((m) => ({ ...m, left: true }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setMovement((m) => ({ ...m, right: true }));
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setMovement((m) => ({ ...m, forward: false }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setMovement((m) => ({ ...m, backward: false }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setMovement((m) => ({ ...m, left: false }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setMovement((m) => ({ ...m, right: false }));
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return movement;
};