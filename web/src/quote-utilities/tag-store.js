import {readFile, writeFile} from 'node:fs/promises';

export function createTagStore(filePath, defaultTags) {
    async function list() {
        try {
            const data = JSON.parse(await readFile(filePath, 'utf8'));
            return Array.isArray(data.tags) ? data.tags : [...defaultTags];
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [...defaultTags];
            }

            throw error;
        }
    }

    async function save(tags) {
        await writeFile(filePath, JSON.stringify({version: 1, tags}, null, 2), 'utf8');
        return tags;
    }

    async function add(tag) {
        const tags = await list();
        return tags.includes(tag) ? tags : save([...tags, tag]);
    }

    async function remove(tag) {
        return save((await list()).filter((existing) => existing !== tag));
    }

    return {list, add, remove};
}
