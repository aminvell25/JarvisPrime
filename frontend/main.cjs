const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    transparent: true,
    frame: false,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webAudio: true
    }
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  const distPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    win.loadFile(distPath);
  } else {
    win.loadFile('index.html');
  }
}

// IPC handlers per comunicazione con renderer
ipcMain.on('audio-data', (_event, buffer) => {
  // Placeholder: qui si può processare audio dal renderer se necessario
  console.log('Received audio buffer from renderer', buffer?.byteLength || 0);
});

ipcMain.on('renderer-log', (_event, { level, message }) => {
  console.log(`[renderer:${level}] ${message}`);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
