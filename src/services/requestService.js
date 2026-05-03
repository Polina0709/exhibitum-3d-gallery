import { collection, addDoc, query, where, getDocs, increment, arrayUnion, arrayRemove} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { updateDoc, doc } from "firebase/firestore";

export const submitApplication = async (userId, artistName, title, description, file) => {
    try {
        const uniqueFileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `artworks/${userId}/${uniqueFileName}`);

        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);

        const requestData = {
            userId: userId,
            artistName: artistName,
            title: title,
            description: description,
            imageUrl: imageUrl,
            status: "pending",
            positionX: null,
            positionY: null,
            positionZ: null,
            createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, "requests"), requestData);
        return docRef.id;

    } catch (error) {
        console.error("Error when submitting an application:", error);
        throw error;
    }
};

export const getUserRequests = async (userId) => {
    try {
        const q = query(collection(db, "requests"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const requests = [];
        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        return requests;
    } catch (error) {
        console.error("Error when receiving applications:", error);
        throw error;
    }
};

export const getAllRequests = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "requests"));
        const requests = [];
        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        return requests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error("Error receiving all applications:", error);
        throw error;
    }
};

export const updateRequestStatus = async (requestId, newStatus, placementSlot = null) => {
    try {
        const requestRef = doc(db, "requests", requestId);

        const updateData = {
            status: newStatus
        };

        if (placementSlot) {
            updateData.placementSlot = placementSlot;
        }

        await updateDoc(requestRef, updateData);
    } catch (error) {
        console.error("Status update error:", error);
        throw error;
    }
};

export const getApprovedRequests = async () => {
    try {
        const q = query(collection(db, "requests"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);

        const requests = [];
        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        return requests;
    } catch (error) {
        console.error("Error receiving approved applications:", error);
        throw error;
    }
};

export const incrementViews = async (id) => {
    try {
        const requestRef = doc(db, 'requests', id);
        await updateDoc(requestRef, {
            views: increment(1)
        });
    } catch (error) {
        console.error("Error updating views:", error);
    }
};

export const incrementLikes = async (id) => {
    try {
        const requestRef = doc(db, 'requests', id);
        await updateDoc(requestRef, {
            likes: increment(1)
        });
    } catch (error) {
        console.error("Likes update error:", error);
    }
};

export const decrementLikes = async (id) => {
    try {
        const docRef = doc(db, 'requests', id);
        await updateDoc(docRef, {
            likes: increment(-1)
        });
    } catch (error) {
        console.error("Error decrementing likes:", error);
    }
};

export const addCommentToArtwork = async (id, commentData) => {
    try {
        const requestRef = doc(db, 'requests', id);
        await updateDoc(requestRef, {
            comments: arrayUnion(commentData)
        });
    } catch (error) {
        console.error("Error adding comment:", error);
    }
};

export const deleteCommentFromArtwork = async (id, commentData) => {
    try {
        const requestRef = doc(db, 'requests', id);
        await updateDoc(requestRef, {
            comments: arrayRemove(commentData)
        });
    } catch (error) {
        console.error("Error deleting comment:", error);
    }
};

export const getApprovedRequestsByArtist = async (userId) => {
    try {
        const q = query(
            collection(db, 'requests'),
            where('userId', '==', userId),
            where('status', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching artist artworks:", error);
        return [];
    }
};
