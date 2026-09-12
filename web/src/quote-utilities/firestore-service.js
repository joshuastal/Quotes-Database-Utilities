import dotenv from 'dotenv';
import {initializeApp} from "firebase/app";
import {collection, getDocs, getFirestore} from 'firebase/firestore';
import {Quote} from './quote.js'

dotenv.config({
    path: new URL('../.env', import.meta.url),
    quiet: true
});

const apiKey = process.env.FIREBASE_API_KEY;


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: apiKey,
    authDomain: "test-6aa80.firebaseapp.com",
    databaseURL: "https://test-6aa80-default-rtdb.firebaseio.com",
    projectId: "test-6aa80",
    storageBucket: "test-6aa80.appspot.com",
    messagingSenderId: "69152779419",
    appId: "1:69152779419:web:bd93aa7508fe71eec3aa3e",
    measurementId: "G-704JZL1VZ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function fetchQuotes() {
    const snapshot = await getDocs(collection(db, 'Quotes'));

    return snapshot.docs.map(document => {
        const data = document.data();

        return new Quote(
            document.id,
            data.Author,
            data.Quote,
            data.tags ?? [],
        );
    })
}