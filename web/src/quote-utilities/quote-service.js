import {
    addQuote as addFirestoreQuote,
    deleteQuote as deleteFirestoreQuote,
    fetchQuotes,
    updateQuote as updateFirestoreQuote,
} from './firestore-service.js';

function ensureOnline() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("No network connection.");
    }
}

export async function getDuplicates(quotes) {
    return window.quotes.findDuplicates(quotes);
}

export function getQuotes() {
    ensureOnline();
    return fetchQuotes();
}

export function deleteQuote(quote) {
    ensureOnline();
    return deleteFirestoreQuote(quote);
}

export function addQuote(quote) {
    ensureOnline();
    return addFirestoreQuote(quote);
}

export function updateQuote(id, field, value) {
    ensureOnline();
    return updateFirestoreQuote(id, field, value);
}

export async function sendQuotesToJSON(quotes) {
    return window.quotes.sendQuotesToJSON(quotes);
}
