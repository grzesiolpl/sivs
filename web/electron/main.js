const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { join } = require('path');
const { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow = null;
let nextServer = null;
let nextPort = 3000;

// Fix PATH for macOS GUI apps
function fixPath() {
  const paths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    process.env.PATH
  ].join(':');
  process.env.PATH = paths;
}

function getWorkspaceDir() {
  const homeDir = app.getPath('home');
  return join(homeDir, 'AI-Video-Studio-Workspace');
}

function getStudioResourcesDir() {
  if (isDev) {
    return join(__dirname, '..', '..', 'AI-Video-Studio');
  }
  return join(process.resourcesPath, 'AI-Video-Studio');
}

function ensureWorkspace() {
  const workspaceDir = getWorkspaceDir();
  if (!existsSync(workspaceDir)) {
    mkdirSync(workspaceDir, { recursive: true });
  }
  
  const subdirs = ['projects', 'logs', 'config'];
  for (const subdir of subdirs) {
    const fullPath = join(workspaceDir, subdir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
  
  // Copy studio resources if not exists
  const studioResources = getStudioResourcesDir();
  const configFile = join(workspaceDir, 'config', 'settings.yaml');
  if (!existsSync(configFile) && existsSync(join(studioResources, 'config', 'settings.yaml'))) {
    copyFileSync(join(studioResources, 'config', 'settings.yaml'), configFile);
  }
  
  return workspaceDir;
}

function copyStudioResources(workspaceDir) {
  const studioResources = getStudioResourcesDir();
  const targetDir = join(workspaceDir, '..', 'AI-Video-Studio'); // Working copy for CLI
  
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  
  const dirsToCopy = ['scripts', 'templates', 'config', 'references'];
  for (const dir of dirsToCopy) {
    const src = join(studioResources, dir);
    const dest = join(targetDir, dir);
    if (existsSync(src)) {
      copyDirRecursive(src, dest);
    }
  }
}

function copyDirRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function createWindow() {
  fixPath();
  
  const workspaceDir = ensureWorkspace();
  copyStudioResources(workspaceDir);
  
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'SIVS - Super Intelligence Video Studio',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: false, // Allow loading local files
    },
    show: false,
    backgroundColor: '#ffffff',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load the app
  const startUrl = isDev 
    ? `http://localhost:${nextPort}` 
    : `file://${join(__dirname, '..', '.next', 'standalone', 'server.js')}`;
  
  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    // In production, we serve via internal Next.js server
    startNextServer().then(() => {
      mainWindow.loadURL(`http://localhost:${nextPort}`);
    });
  }
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, '..', '.next', 'standalone', 'server.js');
    const serverDir = join(__dirname, '..', '.next', 'standalone');
    
    if (!require('fs').existsSync(serverPath)) {
      reject(new Error('Next.js standalone build not found. Run `npm run build` first.'));
      return;
    }
    
    nextServer = spawn('node', ['server.js'], {
      cwd: serverDir,
      env: { 
        ...process.env, 
        PORT: nextPort.toString(),
        NODE_ENV: 'production',
        STUDIO_PATH: join(process.resourcesPath, 'AI-Video-Studio')
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    nextServer.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
      if (data.toString().includes('Ready on') || data.toString().includes('started on')) {
        setTimeout(resolve, 500);
      }
    });
    
    nextServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });
    
    nextServer.on('error', (err) => {
      reject(err);
    });
    
    nextServer.on('close', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });
    
    // Timeout
    setTimeout(() => resolve(), 10000);
  });
}

function stopNextServer() {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Open file/folder dialogs
  ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });
  
  ipcMain.handle('dialog:openFolder', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, { 
      ...options, 
      properties: ['openDirectory', 'createDirectory'] 
    });
    return result;
  });
  
  ipcMain.handle('dialog:saveFile', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });
  
  ipcMain.handle('dialog:showMessage', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
  });
  
  // Shell operations
  ipcMain.handle('shell:openPath', async (event, path) => {
    return shell.openPath(path);
  });
  
  ipcMain.handle('shell:openExternal', async (event, url) => {
    return shell.openExternal(url);
  });
  
  // File system operations
  ipcMain.handle('fs:readFile', async (event, path) => {
    try {
      return readFileSync(path, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  });
  
  ipcMain.handle('fs:writeFile', async (event, path, content) => {
    try {
      writeFileSync(path, content);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  });
  
  ipcMain.handle('fs:exists', async (event, path) => {
    return existsSync(path);
  });
  
  // System info
  ipcMain.handle('system:getInfo', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      workspaceDir: getWorkspaceDir(),
      studioResourcesDir: getStudioResourcesDir(),
      path: process.env.PATH,
      isDev,
    };
  });
  
  // Check system dependencies
  ipcMain.handle('system:checkDependencies', async () => {
    const checks = {
      ffmpeg: false,
      ffprobe: false,
      python3: false,
      kinocut: false,
    };
    
    const commands = [
      { key: 'ffmpeg', cmd: 'ffmpeg -version' },
      { key: 'ffprobe', cmd: 'ffprobe -version' },
      { key: 'python3', cmd: 'python3 --version' },
      { key: 'kinocut', cmd: 'kino doctor' },
    ];
    
    for (const { key, cmd } of commands) {
      try {
        const { stdout } = await execAsync(cmd, { timeout: 5000 });
        checks[key] = true;
      } catch (err) {
        checks[key] = false;
      }
    }
    
    return checks;
  });
  
  // Run CLI commands
  ipcMain.handle('cli:run', async (event, command, args, cwd) => {
    return new Promise((resolve) => {
      const child = spawn(command, args, { 
        cwd: cwd || process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      
      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      
      child.on('error', (err) => {
        resolve({ code: -1, stdout, stderr: err.message });
      });
    });
  });
  
  // Get API key
  ipcMain.handle('settings:getApiKey', async () => {
    const envPath = join(getWorkspaceDir(), '.env');
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      const match = content.match(/OPENROUTER_API_KEY=(.+)/);
      return match ? match[1] : null;
    }
    return null;
  });
  
  ipcMain.handle('settings:setApiKey', async (event, key) => {
    const envPath = join(getWorkspaceDir(), '.env');
    let content = '';
    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf-8');
      content = content.replace(/OPENROUTER_API_KEY=.*\n?/g, '');
    }
    content += `OPENROUTER_API_KEY=${key}\n`;
    writeFileSync(envPath, content);
    return { success: true };
  });
  
  // Open in Finder
  ipcMain.handle('finder:open', async (event, path) => {
    await shell.openPath(path);
  });
  
  ipcMain.handle('finder:reveal', async (event, path) => {
    shell.showItemInFolder(path);
  });
}

// App lifecycle
app.whenReady().then(() => {
  fixPath();
  setupIpcHandlers();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopNextServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNextServer();
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// execAsync function for system checks
function execAsync(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [], { 
      shell: true,
      ...options,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}