const { spawn } = require('child_process');

function runOpenCode(prompt) {
  return new Promise((resolve, reject) => {
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
