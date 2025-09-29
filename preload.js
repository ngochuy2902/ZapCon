import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // Server management
  getServers: () => ipcRenderer.invoke("get-servers"),
  saveServer: (server) => ipcRenderer.invoke("save-server", server),
  deleteServer: (id) => ipcRenderer.invoke("delete-server", id),
  connectServer: (id) => ipcRenderer.invoke("connect-server", id),

  // Config management
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  selectTerminal: () => ipcRenderer.invoke("select-terminal"),
  selectKeyFile: () => ipcRenderer.invoke("select-key-file"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
