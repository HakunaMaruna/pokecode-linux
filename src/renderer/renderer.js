const monaco = require('monaco-editor');
const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');
const { ipcRenderer } = require('electron');

// Редактор
monaco.editor.create(document.getElementById('monaco-editor'), {
    value: '// Добро пожаловать в PokeCode\nconsole.log("Hello World!");',
    language: 'javascript',
    theme: 'vs-dark'
});

// Терминал
const term = new Terminal();
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
fitAddon.fit();

term.onData(data => ipcRenderer.send('terminal-input', data));
ipcRenderer.on('terminal-output', (event, data) => term.write(data));

// Чат
const chatInput = document.getElementById('chat-input');
const chatHistory = document.getElementById('chat-history');

chatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && chatInput.value) {
        const prompt = chatInput.value;
        chatHistory.innerHTML += `<div><b>Вы:</b> ${prompt}</div>`;
        chatInput.value = '';

        chatHistory.innerHTML += `<div><i>Агент думает...</i></div>`;
        const response = await ipcRenderer.invoke('ask-agent', prompt);
        
        chatHistory.lastElementChild.remove();
        chatHistory.innerHTML += `<div><b>OpenCode:</b> ${response}</div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});
