// This file is the file that the browser will use to communicate with the main process.
// As such, it cannot import any node modules and must use the `window` object.
// renderer.js will be calling this file

// The window object is opened by the preload script in the preload.js file

export async function getDuplicates(quotes) {
    return window.duplicates.findDuplicates(quotes);
}

export async function getQuotes() {
    return window.quotes.fetchQuotes();
}

export function findQuotesByField(quotes, field, value) {
    return window.quotes.findQuotesByField(quotes, field, value);
}

export function deleteQuote(quote) {
    return window.quotes.deleteQuote(quote);
}

export function addQuote(quote) {
    return window.quotes.addQuote(quote);
}

export async function sendQuotesToJSON(quotes) {
    return window.quotes.sendQuotesToJSON(quotes);
}
