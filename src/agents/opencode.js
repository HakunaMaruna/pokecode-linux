const { spawn } = require('child_process');

/**
 * Запуск OpenCode как CLI-команды
 * @param {string} prompt - Запрос к агенту
 * @returns {Promise<string>} - Ответ агента
 */
function runOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    // В реальности команда может быть 'npx opencode' или путь к бинарнику
    const opencode = spawn('opencode', ['--query', prompt]);
    
    let output = '';
    let error = '';

    opencode.stdout.on('data', (data) => { output += data.toString(); });
    opencode.stderr.on('data', (data) => { error += data.toString(); });

    opencode.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`OpenCode exited with code ${code}: ${error}`));
      }
    });

    opencode.on('error', (err) => reject(err));
  });
}

module.exports = { runOpenCode };
