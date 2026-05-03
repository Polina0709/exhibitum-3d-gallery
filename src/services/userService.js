import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const getUserProfile = async (uid) => {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
};

export const updateUserProfile = async (uid, profileData) => {
    try {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, profileData, { merge: true });
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

export const uploadAvatar = async (uid, file) => {
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `avatars/${uid}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading avatar:", error);
        throw error;
    }
};