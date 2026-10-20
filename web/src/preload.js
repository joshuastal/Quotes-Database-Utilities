// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


const {contextBridge, ipcRenderer} = require('electron');

// Expose quote utilities to the renderer process
contextBridge.exposeInMainWorld('quotes', {
    sendQuotesToJSON: quotes => ipcRenderer.invoke('quotes:send-to-json', quotes),
    findDuplicates: quotes => ipcRenderer.invoke('quotes:find-duplicates', quotes),
    findSimilar: (text, quotes) => ipcRenderer.invoke('quotes:find-similar', text, quotes),
    listExemptions: () => ipcRenderer.invoke('duplicates:list-exemptions'),
    addExemption: (idA, idB) => ipcRenderer.invoke('duplicates:add-exemption', idA, idB),
    removeExemption: key => ipcRenderer.invoke('duplicates:remove-exemption', key),
});

contextBridge.exposeInMainWorld('auth', {
    beginGoogleSignIn: () => ipcRenderer.invoke('auth:google-sign-in'),
});
