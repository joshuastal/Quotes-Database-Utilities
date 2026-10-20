import difflib from 'difflib';

export const DUPLICATE_THRESHOLD = 0.85;

// realQuickRatio() and quickRatio() are upper bounds on ratio(), so skipping
// pairs that fail them is exact. Seq2 is set once per outer loop because the
// matcher caches its analysis of b.
function isSimilar(matcher) {
    return matcher.realQuickRatio() >= DUPLICATE_THRESHOLD
        && matcher.quickRatio() >= DUPLICATE_THRESHOLD
        && matcher.ratio() >= DUPLICATE_THRESHOLD;
}

function bySimilarity(first, second) {
    return second.similarity - first.similarity;
}

export function findDuplicates(quotes) {
    const matcher = new difflib.SequenceMatcher(null, '', '');
    const duplicates = [];

    for (let j = 1; j < quotes.length; j++) {
        matcher.setSeq2(quotes[j].quote);

        for (let i = 0; i < j; i++) {
            matcher.setSeq1(quotes[i].quote);

            if (isSimilar(matcher)) {
                duplicates.push({
                    idA: quotes[i].id,
                    idB: quotes[j].id,
                    similarity: matcher.ratio(),
                    opcodes: matcher.getOpcodes(),
                });
            }
        }
    }

    return duplicates.sort(bySimilarity);
}

export function findSimilar(text, quotes) {
    const matcher = new difflib.SequenceMatcher(null, '', text);
    const matches = [];

    for (const quote of quotes) {
        matcher.setSeq1(quote.quote);

        if (isSimilar(matcher)) {
            matches.push({
                id: quote.id,
                similarity: matcher.ratio(),
                opcodes: matcher.getOpcodes(),
            });
        }
    }

    return matches.sort(bySimilarity);
}
