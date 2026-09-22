// This file is the file that the browser will use to communicate with the main process.
// As such, it cannot import any node modules and must use the `window` object.
// renderer.js will be calling this file

// The window object is opened by the preload script in the preload.js file

function ensureOnline() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("No network connection.");
    }
}

export async function getDuplicates(quotes) {
    return window.duplicates.findDuplicates(quotes);
}

export async function getQuotes() {
    ensureOnline();
    return window.quotes.fetchQuotes();
}

export function findQuotesByField(quotes, field, value) {
    return window.quotes.findQuotesByField(quotes, field, value);
}

export function deleteQuote(quote) {
    ensureOnline();
    return window.quotes.deleteQuote(quote);
}

export function addQuote(quote) {
    ensureOnline();
    return window.quotes.addQuote(quote);
}

export function updateQuote(id, field, value) {
    ensureOnline();
    return window.quotes.updateQuote(id, field, value);
}

export async function sendQuotesToJSON(quotes) {
    return window.quotes.sendQuotesToJSON(quotes);
}
