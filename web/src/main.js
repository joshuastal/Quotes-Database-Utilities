const {app, BrowserWindow, ipcMain, shell} = require('electron');
const {findDuplicates} = require('./quote-utilities/duplicate-finder.js');
const {sendQuotesToJSON} = require('./quote-utilities/quote-backend-service.js');
const {createGoogleOAuth} = require('./auth/google-oauth.js');

let mainWindow;
const googleOAuth = createGoogleOAuth({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    openExternal: (url) => shell.openExternal(url),
});

ipcMain.handle('quotes:send-to-json', (_event, quotes) => {
    return sendQuotesToJSON(quotes);
});

ipcMain.handle('quotes:find-duplicates', (_event, quotes) => {
    return findDuplicates(quotes);
});

ipcMain.handle('auth:google-sign-in', (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
        throw new Error('Google sign-in is only available to the main renderer.');
    }

    return googleOAuth.beginGoogleSignIn();
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { // Close the app if not on MacOS
        app.quit();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
