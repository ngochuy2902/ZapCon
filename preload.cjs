const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getServers: () => ipcRenderer.invoke("get-servers"),
  saveServer: (server) => ipcRenderer.invoke("save-server", server),
  deleteServer: (id) => ipcRenderer.invoke("delete-server", id),
  connectServer: (id) => ipcRenderer.invoke("connect-server", id),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  selectTerminal: () => ipcRenderer.invoke("select-terminal"),
  selectKeyFile: () => ipcRenderer.invoke("select-key-file"),
});
