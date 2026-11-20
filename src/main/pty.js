const pty = require('node-pty');
const os = require('os');

function setupPTY(ipcMain, win) {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || process.cwd(),
    env: process.env
  });

  ptyProcess.on('data', (data) => {
    win.webContents.send('terminal-output', data);
  });

  ipcMain.on('terminal-input', (event, data) => {
    ptyProcess.write(data);
  });
}

module.exports = { setupPTY };
