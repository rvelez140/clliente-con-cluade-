import { app, BrowserWindow, Menu, shell, ipcMain, Notification, Tray, nativeImage } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let tray: Tray | null = null;

// Configuración persistente
const store = new Store({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    theme: 'gmail',
    notifications: true,
    startMinimized: false,
  }
});

// Iniciar el backend local de Express
function startBackendServer() {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    const backendPath = path.join(__dirname, '../../backend/dist/index.js');
    backendProcess = spawn('node', [backendPath], {
      cwd: path.join(__dirname, '../../backend'),
      env: {
        ...process.env,
        PORT: '3001',
        NODE_ENV: 'production',
      }
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../build/icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'New Message',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('new-message');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Gemini Mail');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

function createWindow() {
  const bounds = store.get('windowBounds') as { width: number; height: number };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'Gemini Mail',
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: false,
  });

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow?.show();
    }
  });

  // Guardar dimensiones de ventana
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', { width: bounds.width, height: bounds.height });
    }
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimizar a bandeja en lugar de cerrar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  createMenu();
  createTray();
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template: any = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Message',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('new-message');
          },
        },
        { type: 'separator' },
        {
          label: 'Check Mail',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.send('refresh-emails');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' },
        ]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/gemini-mail');
          },
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/gemini-mail/docs');
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const message = `Gemini Mail v${app.getVersion()}\n\nNext-generation email client with AI integration`;
            const options = {
              type: 'info',
              title: 'About Gemini Mail',
              message: message,
            };
            require('electron').dialog.showMessageBox(options);
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-config', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-config', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('show-notification', (event, options) => {
  if (Notification.isSupported() && store.get('notifications')) {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: path.join(__dirname, '../build/icon.png'),
    });

    notification.on('click', () => {
      mainWindow?.show();
    });

    notification.show();
  }
});

ipcMain.handle('get-platform', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
  };
});

// App lifecycle
app.on('ready', () => {
  startBackendServer();
  createWindow();

  // Auto-updater setup (para producción)
  if (process.env.NODE_ENV === 'production') {
    // Aquí se puede integrar electron-updater
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;

  // Cerrar el backend
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
