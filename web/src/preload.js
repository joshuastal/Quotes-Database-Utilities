// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


const {contextBridge, ipcRenderer} = require('electron');

// Expose quote utilities to the renderer process
contextBridge.exposeInMainWorld('quotes', {
    sendQuotesToJSON: quotes => ipcRenderer.invoke('quotes:send-to-json', quotes),
    findDuplicates: quotes => ipcRenderer.invoke('quotes:find-duplicates', quotes),
});

contextBridge.exposeInMainWorld('auth', {
    beginGoogleSignIn: () => ipcRenderer.invoke('auth:google-sign-in'),
});
