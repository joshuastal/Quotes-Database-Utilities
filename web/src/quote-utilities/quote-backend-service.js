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
