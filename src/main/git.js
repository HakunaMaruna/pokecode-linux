const { exec } = require('child_process');

function runGit(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(`git ${command}`, { cwd }, (err, stdout, stderr) => {
      if (err) return resolve(stderr || err.message); // Возвращаем ошибку как текст
      resolve(stdout);
    });
  });
}

module.exports = { runGit };
