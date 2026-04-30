const { contextBridge, ipcRenderer } = require('electron');

// API esposte al renderer in modo sicuro via contextIsolation
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio: placeholder per invio audio raw al processo principale (futuro)
  sendAudio: (buffer) => {
    ipcRenderer.send('audio-data', buffer);
  },

  // Messaging: ricevi messaggi dal main process
  onMessage: (callback) => {
    const wrapper = (_event, value) => callback(value);
    ipcRenderer.on('from-main', wrapper);
    // Cleanup helper
    return () => ipcRenderer.removeListener('from-main', wrapper);
  },

  // Utile per logging/debug dal renderer al main
  log: (level, message) => {
    ipcRenderer.send('renderer-log', { level, message });
  }
});
