const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupIPC } = require('./ipc');
const { setupPTY } = require('./pty');

function createWindow() {
  setupIPC(); // Инициализация IPC
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('src/renderer/index.html');
  setupPTY(require('electron').ipcMain, win);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
