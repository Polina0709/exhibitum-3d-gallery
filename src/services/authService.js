import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const googleProvider = new GoogleAuthProvider();

export const registerUser = async (email, password, role = "artist") => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            role: role,
            createdAt: new Date()
        });
        return { user, role };
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists() ? userDoc.data().role : "guest";
        return { user, role };
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
};

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        let role = "artist";

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                role: role,
                createdAt: new Date()
            });
        } else {
            role = userDoc.data().role;
        }

        return { user, role };
    } catch (error) {
        console.error("Google authorization error:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    await signOut(auth);
};