import {readFile, writeFile} from 'node:fs/promises';

export function exemptionKey(idA, idB) {
    return [idA, idB].sort().join('|');
}

export function createExemptionStore(filePath) {
    async function list() {
        try {
            const data = JSON.parse(await readFile(filePath, 'utf8'));
            return Array.isArray(data.pairs) ? data.pairs : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }

            throw error;
        }
    }

    async function save(pairs) {
        await writeFile(filePath, JSON.stringify({version: 1, pairs}, null, 2), 'utf8');
        return pairs;
    }

    async function add(idA, idB) {
        const pairs = await list();
        const key = exemptionKey(idA, idB);

        return pairs.includes(key) ? pairs : save([...pairs, key]);
    }

    async function remove(key) {
        return save((await list()).filter((pair) => pair !== key));
    }

    return {list, add, remove};
}
