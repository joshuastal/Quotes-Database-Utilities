// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


const {contextBridge, ipcRenderer} = require('electron');

// Expose quote utilities to the renderer process
contextBridge.exposeInMainWorld('quotes', {
    addQuote: quote => ipcRenderer.invoke('quotes:add', quote),
    updateQuote: (id, field, value) => ipcRenderer.invoke('quotes:update', id, field, value),
    deleteQuote: quote => ipcRenderer.invoke('quotes:delete', quote),
    fetchQuotes: () => ipcRenderer.invoke('quotes:fetch'),
    sendQuotesToJSON: quotes => ipcRenderer.invoke('quotes:send-to-json', quotes),
    findQuotesByField: (quotes, field, value) => ipcRenderer.invoke('quotes:find-by-field', quotes, field, value),
    findDuplicates: quotes => ipcRenderer.invoke('quotes:find-duplicates', quotes),
});
