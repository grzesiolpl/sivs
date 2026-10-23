const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openFolder: (options) => ipcRenderer.invoke('dialog:openFolder', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
  
  // Shell
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // File system
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
  exists: (path) => ipcRenderer.invoke('fs:exists', path),
  
  // System
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  checkDependencies: () => ipcRenderer.invoke('system:checkDependencies'),
  
  // CLI
  runCLI: (command, args, cwd) => ipcRenderer.invoke('cli:run', command, args, cwd),
  
  // Settings
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key) => ipcRenderer.invoke('settings:setApiKey', key),
  
  // Finder
  openInFinder: (path) => ipcRenderer.invoke('finder:open', path),
  revealInFinder: (path) => ipcRenderer.invoke('finder:reveal', path),
});