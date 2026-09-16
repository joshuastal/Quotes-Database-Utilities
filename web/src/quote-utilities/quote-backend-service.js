import difflib from 'difflib';
import {writeFile} from 'node:fs/promises';
import {dialog} from 'electron';

export async function sendQuotesToJSON(quotes) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const json = JSON.stringify(quotes, null, 2);

    const {canceled, filePath} = await dialog.showSaveDialog({
        title: 'Export quotes',
        defaultPath: `quotes_${timestamp}.json`,
        filters: [
            {name: 'JSON files', extensions: ['json']}
        ]
    });

    if (canceled || !filePath) {
        return;
    }

    await writeFile(filePath, json, 'utf8');
    return filePath;
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
