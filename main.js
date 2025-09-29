import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR_NAME = "zapcon-data";
let cachedDataDir = null;
const tempKeyCache = new Map();

function getDataDir() {
  if (cachedDataDir) return cachedDataDir;

  try {
    cachedDataDir = path.join(app.getPath("userData"), DATA_DIR_NAME);
  } catch (error) {
    // Fallback to the old location if app.getPath fails (shouldn't happen after ready)
    cachedDataDir = path.join(__dirname, "data");
  }

  if (!fs.existsSync(cachedDataDir)) {
    fs.mkdirSync(cachedDataDir, { recursive: true });
  }

  return cachedDataDir;
}

const getServersPath = () => path.join(getDataDir(), "servers.json");
const getConfigPath = () => path.join(getDataDir(), "config.json");

function loadServers() {
  const filePath = getServersPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}
function saveServers(data) {
  try {
    fs.writeFileSync(getServersPath(), JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw error;
  }
}
function loadConfig() {
  const filePath = getConfigPath();
  if (!fs.existsSync(filePath)) return { terminalPath: "" };
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data.trim()) return { terminalPath: "" };
    return JSON.parse(data);
  } catch (error) {
    return { terminalPath: "" };
  }
}
function saveConfig(data) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw error;
  }
}

function buildSshArgs(server) {
  if (!server) return null;
  const { user, host } = server;
  if (!user || !host) return null;

  const args = ['ssh'];

  if (server.key && String(server.key).trim()) {
    args.push('-i');
    args.push(String(server.key).trim());
  }

  const portValue = parseInt(server.port, 10);
  const port = Number.isFinite(portValue) && portValue > 0 ? portValue : 22;
  args.push('-p');
  args.push(String(port));

  args.push(`${user}@${host}`);

  return args;
}

const WINDOWS_SPECIAL_CHARS = /[\s"&'`^|<>]/;

function quoteForWindows(arg) {
  if (arg === undefined || arg === null) return '""';
  const str = String(arg);
  if (str.length === 0) return '""';
  if (!WINDOWS_SPECIAL_CHARS.test(str)) {
    return str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

const POSIX_SAFE_PATTERN = /^[A-Za-z0-9_\/.\-:@%=+,]+$/;

function quoteForPosix(arg) {
  if (arg === undefined || arg === null) return "''";
  const str = String(arg);
  if (str.length === 0) return "''";
  if (POSIX_SAFE_PATTERN.test(str)) {
    return str;
  }
    return "'" + str.replace(/'/g, "'\"'\"'") + "'";
}

function joinArgsForWindows(args) {
  return args.map(quoteForWindows).join(' ');
}

function joinArgsForPosix(args) {
  return args.map(quoteForPosix).join(' ');
}

function detectWindowsTerminalType(executablePath) {
  const lower = executablePath.toLowerCase();
  if (lower.endsWith('git-bash.exe') || (lower.includes('git') && lower.endsWith('bash.exe'))) return 'git-bash';
  if (lower.endsWith('bash.exe')) return 'bash';
  if (lower.endsWith('powershell.exe') || lower.endsWith('pwsh.exe')) return 'powershell';
  if (lower.endsWith('cmd.exe')) return 'cmd';
  return 'custom';
}

function resolveWindowsTerminal(preferredPath) {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (candidatePath) => {
    if (!candidatePath) return;
    const normalized = path.normalize(candidatePath);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  if (preferredPath && preferredPath.trim()) {
    addCandidate(preferredPath.trim());
  }

  const programFolders = [
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.ProgramW6432,
  ].filter(Boolean);

  for (const base of programFolders) {
    addCandidate(path.join(base, 'Git', 'bin', 'bash.exe'));
    addCandidate(path.join(base, 'Git', 'usr', 'bin', 'bash.exe'));
    addCandidate(path.join(base, 'Git', 'git-bash.exe'));
  }

  const systemRoot = process.env.SystemRoot || 'C:\Windows';
  addCandidate(path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  addCandidate(path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'pwsh.exe'));
  addCandidate(path.join(systemRoot, 'System32', 'cmd.exe'));

  const comspec = process.env.ComSpec || process.env.COMSPEC || path.join(systemRoot, 'System32', 'cmd.exe');
  addCandidate(comspec);

  const existing = candidates.find(candidatePath => {
    try {
      return fs.existsSync(candidatePath);
    } catch (error) {
      return false;
    }
  });

  const resolvedPath = existing || comspec;
  if (!resolvedPath) return null;

  return {
    path: resolvedPath,
    type: detectWindowsTerminalType(resolvedPath),
  };
}

function prepareWindowsPrivateKey(originalPath) {
  if (!originalPath) return null;
  try {
    const resolved = path.resolve(originalPath);
    if (!fs.existsSync(resolved)) return originalPath;

    const cacheEntry = tempKeyCache.get(resolved);
    if (cacheEntry && fs.existsSync(cacheEntry.path)) {
      const sourceStat = fs.statSync(resolved);
      if (cacheEntry.sourceMtime === sourceStat.mtimeMs) {
        return cacheEntry.path;
      }
    }

    const keysDir = path.join(getDataDir(), "keys");
    fs.mkdirSync(keysDir, { recursive: true });

    const hash = crypto.createHash("sha1").update(resolved).digest("hex");
    const ext = path.extname(resolved) || ".pem";
    const destPath = path.join(keysDir, `${hash}${ext}`);

    const contents = fs.readFileSync(resolved);
    fs.writeFileSync(destPath, contents, { mode: 0o600 });
    try {
      fs.chmodSync(destPath, 0o600);
    } catch (chmodError) {
      // Ignore chmod errors on Windows; ACLs are handled by the filesystem.
    }

    const sourceStat = fs.statSync(resolved);
    tempKeyCache.set(resolved, { path: destPath, sourceMtime: sourceStat.mtimeMs });

    return destPath;
  } catch (error) {
    console.error("Failed to prepare private key for Windows SSH:", error);
    return originalPath;
  }
}

function launchWindowsTerminal(server, preferredTerminalPath) {
  const sshArgs = buildSshArgs(server);
  if (!sshArgs) {
    console.error('Invalid server configuration for SSH.');
    return false;
  }

  const terminalInfo = resolveWindowsTerminal(preferredTerminalPath);
  if (!terminalInfo) {
    console.error('Unable to resolve a terminal application on Windows.');
    return false;
  }

  const sshCommandWindows = joinArgsForWindows(sshArgs);
  const sshCommandPosix = joinArgsForPosix(sshArgs);
  const title = `SSH to ${server.user}@${server.host}`;
  const safeTitleBase = title.replace(/[\r\n"']/g, '').trim();
  const safeTitle = (safeTitleBase.length > 60 ? safeTitleBase.slice(0, 60) : safeTitleBase) || 'SSH Session';

  let terminalArgs;

  switch (terminalInfo.type) {
    case 'git-bash':
    case 'bash':
      terminalArgs = ['--login', '-i', '-c', `${sshCommandPosix}; exec bash`];
      break;
    case 'powershell':
      terminalArgs = ['-NoExit', '-Command', `Write-Host 'Connecting to ${server.user}@${server.host}...'; ${sshCommandWindows}`];
      break;
    case 'cmd':
      terminalArgs = ['/k', `title ${safeTitle} && ${sshCommandWindows}`];
      break;
    default:
      terminalArgs = ['--login', '-i', '-c', `${sshCommandPosix}; exec bash`];
      break;
  }

  try {
    const child = spawn('cmd.exe', ['/c', 'start', '""', terminalInfo.path, ...terminalArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });

    if (child && child.pid) {
      child.unref();
      return true;
    }
  } catch (error) {
    console.error('Failed to launch SSH terminal on Windows:', error);
  }

  return false;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets/logo.png"), // App icon
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile("build/index.html");
  }
}

app.whenReady().then(() => {
  getDataDir();
  createWindow();
});

// ---------- IPC Handlers ----------
ipcMain.handle("get-servers", () => loadServers());
ipcMain.handle("save-server", (e, server) => {
  try {
    let servers = loadServers();
    if (server.id) {
      const idx = servers.findIndex(s => s.id === server.id);
      if (idx >= 0) {
        servers[idx] = server;
      } else {
        server.id = Date.now();
        servers.push(server);
      }
    } else {
      server.id = Date.now();
      servers.push(server);
    }
    saveServers(servers);
    return server;
  } catch (error) {
    throw error;
  }
});
ipcMain.handle("delete-server", (e, id) => {
  saveServers(loadServers().filter(s => s.id !== id));
  return true;
});

ipcMain.handle("get-config", () => loadConfig());
ipcMain.handle("save-config", (e, cfg) => { saveConfig(cfg); return true; });

ipcMain.handle("select-terminal", async (event) => {
  try {
    const browserWindow = BrowserWindow.fromWebContents(event.sender) || null;
    const { canceled, filePaths } = await dialog.showOpenDialog(browserWindow, {
      properties: ["openFile"],
      title: "Select Terminal Application",
      filters: [
        { name: "Executable Files", extensions: ["exe", "app"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return canceled ? null : (filePaths?.[0] ?? null);
  } catch (error) {
    console.error("select-terminal dialog error", error);
    return null;
  }
});

ipcMain.handle("select-key-file", async (event) => {
  try {
    const browserWindow = BrowserWindow.fromWebContents(event.sender) || null;
    const { canceled, filePaths } = await dialog.showOpenDialog(browserWindow, {
      properties: ["openFile"],
      title: "Select SSH Private Key File",
      filters: [
        { name: "SSH Key Files", extensions: ["pem", "key", "ppk"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return canceled ? null : (filePaths?.[0] ?? null);
  } catch (error) {
    console.error("select-key-file dialog error", error);
    return null;
  }
});

ipcMain.handle("connect-server", (e, id) => {
  try {
    const servers = loadServers();
    const server = servers.find(s => s.id === id);
    if (!server) return false;

    const { user, host, key, port } = server;
    const { terminalPath } = loadConfig();

    const preparedKey = process.platform === "win32"
      ? prepareWindowsPrivateKey(key)
      : key;

    const connectionInfo = { user, host, key: preparedKey, port };

    if (process.platform === "win32") {
      return launchWindowsTerminal(connectionInfo, terminalPath);
    }

    const sshArgs = buildSshArgs(connectionInfo);
    if (!sshArgs) return false;

    const sshCommandPosix = joinArgsForPosix(sshArgs);

    if (process.platform === "darwin") {
      const escapedForAppleScript = sshCommandPosix
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      spawn("osascript", [
        "-e",
        `tell application "Terminal" to do script "${escapedForAppleScript}"`
      ], { detached: true, stdio: "ignore" });
      return true;
    } else {
      const terminalExecutable = terminalPath && terminalPath.trim() ? terminalPath.trim() : null;
      if (!terminalExecutable) {
        console.error('No terminal application configured for this platform.');
        return false;
      }
      const child = spawn(terminalExecutable, ["--", "bash", "-c", `${sshCommandPosix}; exec bash`], { 
        detached: true,
        stdio: "ignore" 
      });
      child.unref();
      return true;
    }
  } catch (error) {
    console.error('connect-server error', error);
    return false;
  }
});

// Cleanup function to remove temp SSH batch files
function cleanupTempFiles() {
  try {
    const dataDir = getDataDir();
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      files.forEach(file => {
        if (file.startsWith("ssh_") && file.endsWith(".bat")) {
          const filePath = path.join(dataDir, file);
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            // Ignore errors - file might be in use
          }
        }
      });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Cleanup when app is closing
app.on('before-quit', cleanupTempFiles);
app.on('window-all-closed', cleanupTempFiles);
