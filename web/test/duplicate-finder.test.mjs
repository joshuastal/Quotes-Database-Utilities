import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {findDuplicates, findSimilar} from '../src/quote-utilities/duplicate-finder.js';
import {createExemptionStore} from '../src/quote-utilities/exemption-store.js';

const legacyPath = fileURLToPath(new URL('../../data/legacy/quotes.json', import.meta.url));

async function loadLegacyQuotes() {
    const legacy = JSON.parse(await readFile(legacyPath, 'utf8'));
    return legacy.map((quote, index) => ({id: `q${index}`, quote: quote.quote}));
}

// Output of the original brute-force loop (new SequenceMatcher per pair, ratio() >= 0.85)
// on the legacy quotes, sorted by similarity. Re-running that loop takes ~18 s.
const BRUTE_FORCE_PAIRS = [
    {idA: 'q414', idB: 'q509', similarity: 1},
    {idA: 'q3', idB: 'q328', similarity: 0.994535519125683},
    {idA: 'q26', idB: 'q466', similarity: 0.9661016949152542},
];

test('findDuplicates matches the brute-force results on the legacy quotes', async () => {
    const quotes = await loadLegacyQuotes();
    const started = performance.now();
    const pairs = findDuplicates(quotes);
    const elapsed = performance.now() - started;

    assert.deepEqual(
        pairs.map(({idA, idB, similarity}) => ({idA, idB, similarity})),
        BRUTE_FORCE_PAIRS
    );
    assert.ok(pairs.every((pair) => Array.isArray(pair.opcodes)));
    assert.ok(elapsed < 2000, `findDuplicates took ${Math.round(elapsed)} ms`);
});

test('findSimilar scores an exact copy as 1 and ignores unrelated text', async () => {
    const quotes = await loadLegacyQuotes();
    const [best] = findSimilar(quotes[10].quote, quotes);

    assert.equal(best.id, 'q10');
    assert.equal(best.similarity, 1);
    assert.deepEqual(findSimilar('Completely unrelated sentence about rockets and weather.', quotes), []);
});

test('exemption store adds, lists, and removes pairs', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'exemptions-'));
    const store = createExemptionStore(path.join(directory, 'duplicate-exemptions.json'));

    try {
        assert.deepEqual(await store.list(), []);
        assert.deepEqual(await store.add('b', 'a'), ['a|b']);
        assert.deepEqual(await store.add('a', 'b'), ['a|b']);
        assert.deepEqual(await store.list(), ['a|b']);
        assert.deepEqual(await store.remove('a|b'), []);
        assert.deepEqual(await store.list(), []);
    } finally {
        await rm(directory, {recursive: true, force: true});
    }
});
