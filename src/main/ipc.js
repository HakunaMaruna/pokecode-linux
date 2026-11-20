const { ipcMain } = require('electron');
const fs = require('fs');
const { runOpenCode } = require('../agents/opencode');
const { runGit } = require('./git');

function setupIPC() {
  ipcMain.handle('read-file', async (event, filePath) => {
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('save-file', async (event, { filePath, content }) => {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('ask-agent', async (event, prompt) => {
    try {
      return await runOpenCode(prompt);
    } catch (err) {
      return `Ошибка агента: ${err.message}`;
    }
  });

  ipcMain.handle('git-cmd', async (event, { command, cwd }) => {
    return await runGit(command, cwd);
  });
}

module.exports = { setupIPC };
