import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electron', {
  // Configuración
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),

  // Notificaciones
  showNotification: (options: { title: string; body: string }) =>
    ipcRenderer.invoke('show-notification', options),

  // Información del sistema
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Escuchar eventos
  on: (channel: string, callback: Function) => {
    const validChannels = ['new-message', 'refresh-emails'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remover listeners
  removeListener: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
});

// Declaración de tipos para TypeScript
declare global {
  interface Window {
    electron: {
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<boolean>;
      showNotification: (options: { title: string; body: string }) => Promise<void>;
      getPlatform: () => Promise<{ platform: string; arch: string; version: string }>;
      on: (channel: string, callback: Function) => void;
      removeListener: (channel: string, callback: Function) => void;
    };
  }
}
