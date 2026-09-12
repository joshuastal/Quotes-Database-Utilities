import difflib from 'difflib';

export function findDuplicates(quotes) {
    const threshold = 0.85;
    const duplicates = [];

    for (let i = 0; i < quotes.length; i++) {
        for (let j = i + 1; j < quotes.length; j++) {
            const matcher = new difflib.SequenceMatcher(
                null,
                quotes[i].quote,
                quotes[j].quote
            )

            const similarity = matcher.ratio()
            if (similarity >= threshold) {
                duplicates.push({
                    quoteA: quotes[i],
                    quoteB: quotes[j],
                    similarity: similarity
                });
                console.log(
                    "\nSimilarity: " + similarity.toFixed(2) + "\n Quote A: " + quotes[i].quote + "\n Quote B: " + quotes[j].quote + ""
                );
            }


        }
    }

    console.log(duplicates.length);
    return duplicates;
}