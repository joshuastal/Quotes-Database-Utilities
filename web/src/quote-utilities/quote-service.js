import {fetchQuotes} from './firestore-service.js';
import {findDuplicates} from './duplicate-finder.js';
import difflib from 'difflib';


export async function getDuplicates(quotes) {
    return findDuplicates(quotes);
}

export async function getQuotes() {
    return await fetchQuotes();
}

export function findQuotesByField(quotes, field, value) {
    const search = String(value).trim().toLowerCase();

    if (!search) {
        return quotes;
    }

    return quotes.filter(quote => {
        if (field === 'tags') {
            return quote.tags.some(tag => {
                const candidate = tag.toLowerCase();

                if (candidate.includes(search)) {
                    return true;
                }

                const similarity = new difflib.SequenceMatcher(
                    null,
                    search,
                    candidate
                ).ratio();

                return similarity >= 0.85;
            });
        }

        const candidate = String(quote[field] ?? '').toLowerCase();

        if (candidate.includes(search)) {
            return true;
        }

        const similarity = new difflib.SequenceMatcher(
            null,
            search,
            candidate
        ).ratio();

        if (field === 'author') {
            return similarity >= 0.85;
        } else if (field === 'quote') {
            return similarity >= 0.50;
        }
        return false;
    });
}

try {
    const quotes = await getQuotes();
    const filtered = findQuotesByField(quotes, 'tags', 'godness');
    console.log(filtered);

} catch (error) {
    console.error(error);
}