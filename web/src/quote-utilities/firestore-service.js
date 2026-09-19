import dotenv from 'dotenv';
import {initializeApp} from "firebase/app";
import {addDoc, collection, deleteDoc, doc, getDocs, getFirestore, serverTimestamp, updateDoc} from 'firebase/firestore';
import {Quote} from './quote.js'
import {AVAILABLE_TAGS, MAX_TAGS} from './tags.js';

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

        const toIso = value =>
            typeof value?.toDate === "function"
                ? value.toDate().toISOString()
                : value ?? null;

        return new Quote(
            document.id,
            data.Author,
            data.Quote,
            data.tags ?? [],
            toIso(data.createdAt),
            toIso(data.updatedAt)
        );
    }).sort((first, second) => {
        if (!first.createdAt) return 1;
        if (!second.createdAt) return -1;

        return Date.parse(second.createdAt) - Date.parse(first.createdAt);
    });
}

export async function addQuote(quote) {
    const documentReference = await addDoc(collection(db, 'Quotes'), {
        Author: quote.author,
        Quote: quote.quote,
        tags: quote.tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return {...quote, id: documentReference.id};
}

export async function updateQuote(id, field, value) {
    if (typeof id !== 'string' || !id.trim()) {
        throw new Error('A quote ID is required.');
    }

    if (field === 'tags') {
        const tags = Array.isArray(value) ? [...value] : null;
        const hasValidTags = tags
            && tags.length >= 1
            && tags.length <= MAX_TAGS
            && new Set(tags).size === tags.length
            && tags.every((tag) => {
                return typeof tag === 'string' && tag.trim() !== '' && AVAILABLE_TAGS.includes(tag);
            });

        if (!hasValidTags) {
            throw new Error('Tags must be an array of 1 to 3 unique catalog tags.');
        }

        await updateDoc(doc(db, 'Quotes', id), {
            tags,
            updatedAt: serverTimestamp(),
        });

        return {id, field, value: tags};
    }

    if (field !== 'author' && field !== 'quote') {
        throw new Error('Only Author, Quote, and Tags can be updated.');
    }

    if (typeof value !== 'string') {
        throw new Error('The updated value must be text.');
    }

    const normalizedValue = field === 'author'
        ? (value.trim() ? value : 'Unknown')
        : value;

    if (field === 'quote' && !value.trim()) {
        throw new Error('Quote cannot be empty.');
    }

    if (field === 'quote' && value.length > 547) {
        throw new Error('Quote cannot be longer than 547 characters.');
    }

    await updateDoc(doc(db, 'Quotes', id), {
        [field === 'author' ? 'Author' : 'Quote']: normalizedValue,
        updatedAt: serverTimestamp(),
    });

    return {id, field, value: normalizedValue};
}

export async function deleteQuote(quote) {
    await deleteDoc(doc(db, 'Quotes', quote.id));
}
