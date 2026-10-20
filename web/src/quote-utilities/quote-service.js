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

function toMatchInput(quotes) {
    return quotes.map(({id, quote}) => ({id, quote}));
}

export async function getDuplicates(quotes) {
    return window.quotes.findDuplicates(toMatchInput(quotes));
}

export async function findSimilarQuotes(text, quotes) {
    return window.quotes.findSimilar(text, toMatchInput(quotes));
}

export async function listExemptions() {
    return window.quotes.listExemptions();
}

export async function addExemption(idA, idB) {
    return window.quotes.addExemption(idA, idB);
}

export async function removeExemption(key) {
    return window.quotes.removeExemption(key);
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
