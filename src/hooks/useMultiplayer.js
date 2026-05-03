import { useState, useEffect } from 'react';
import { ref, set, onValue, onDisconnect, remove } from 'firebase/database';
import { useThree } from '@react-three/fiber';
import { rtdb } from '../firebase';

export function useMultiplayer(currentUser) {
    const { camera } = useThree();
    const [players, setPlayers] = useState({});

    const [playerId] = useState(() =>
        currentUser ? currentUser.uid : `guest_${Math.random().toString(36).substring(2, 9)}`
    );

    useEffect(() => {
        if (!rtdb) {
            return;
        }

        const playerRef = ref(rtdb, `players/${playerId}`);

        onDisconnect(playerRef).remove();

        const playersRef = ref(rtdb, 'players');
        const unsubscribe = onValue(playersRef, (snapshot) => {
            const data = snapshot.val() || {};
            const others = { ...data };
            delete others[playerId];
            setPlayers(others);
        });


        const interval = setInterval(() => {
            set(playerRef, {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z,
                timestamp: Date.now()
            });
        }, 100);

        return () => {
            clearInterval(interval);
            remove(playerRef);
            unsubscribe();
        };
    }, []);

    return players;
}