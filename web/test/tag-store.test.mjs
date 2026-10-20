import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createTagStore} from '../src/quote-utilities/tag-store.js';
import {normalizeTag} from '../src/quote-utilities/tags.js';

const DEFAULTS = ['courage', 'patience', 'hope'];

async function withStore(run) {
    const dir = await mkdtemp(path.join(tmpdir(), 'tag-store-'));
    const filePath = path.join(dir, 'tag-catalog.json');

    try {
        await run(createTagStore(filePath, DEFAULTS), filePath);
    } finally {
        await rm(dir, {recursive: true, force: true});
    }
}

test('tag store returns the defaults when no file exists', async () => {
    await withStore(async (store) => {
        assert.deepEqual(await store.list(), DEFAULTS);
    });
});

test('tag store adds, ignores duplicates, removes, and persists', async () => {
    await withStore(async (store, filePath) => {
        assert.deepEqual(await store.add('holy_spirit'), [...DEFAULTS, 'holy_spirit']);
        assert.deepEqual(await store.add('hope'), [...DEFAULTS, 'holy_spirit']);
        assert.deepEqual(await store.remove('courage'), ['patience', 'hope', 'holy_spirit']);
        assert.deepEqual(await store.add('courage'), ['patience', 'hope', 'holy_spirit', 'courage']);

        const saved = JSON.parse(await readFile(filePath, 'utf8'));
        assert.deepEqual(saved, {version: 1, tags: ['patience', 'hope', 'holy_spirit', 'courage']});
        assert.deepEqual(await createTagStore(filePath, DEFAULTS).list(), saved.tags);
        assert.deepEqual(DEFAULTS, ['courage', 'patience', 'hope']);
    });
});

test('normalizeTag matches the catalog style', () => {
    assert.equal(normalizeTag(' Holy Spirit '), 'holy_spirit');
    assert.equal(normalizeTag('Long-Suffering'), 'long-suffering');
    assert.equal(normalizeTag('a, b'), 'a_b');
    assert.equal(normalizeTag('!!'), '');
});
