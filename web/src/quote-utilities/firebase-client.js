import {initializeApp} from "firebase/app";
import {
    browserLocalPersistence,
    GoogleAuthProvider,
    initializeAuth,
    onAuthStateChanged,
    signInWithCredential,
    signOut,
} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const apiKey = process.env.FIREBASE_API_KEY;

if (!apiKey) {
    throw new Error("FIREBASE_API_KEY is not configured.");
}

const firebaseConfig = {
    apiKey,
    authDomain: "test-6aa80.firebaseapp.com",
    databaseURL: "https://test-6aa80-default-rtdb.firebaseio.com",
    projectId: "test-6aa80",
    storageBucket: "test-6aa80.appspot.com",
    messagingSenderId: "69152779419",
    appId: "1:69152779419:web:bd93aa7508fe71eec3aa3e",
    measurementId: "G-704JZL1VZ6",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {persistence: browserLocalPersistence});
const db = getFirestore(app);

export async function signInWithGoogleTokens({idToken, accessToken} = {}) {
    if (typeof idToken !== "string" || !idToken
        || typeof accessToken !== "string" || !accessToken) {
        throw new Error("Google sign-in returned invalid tokens.");
    }

    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    return signInWithCredential(auth, credential);
}

export {app, auth, db, onAuthStateChanged, signOut};
