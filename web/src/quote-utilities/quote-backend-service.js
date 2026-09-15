import difflib from 'difflib';
import {writeFile} from 'node:fs/promises';


export async function sendQuotesToJSON(quotes) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `./quotes_${timestamp}.json`;
    const fileURL = new URL(fileName, import.meta.url);
    const json = JSON.stringify(quotes, null, 2);
    await writeFile(fileURL, json, 'utf8');
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
