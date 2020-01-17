// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;

window.electron = {
  ipcRenderer: ipcRenderer,
  remote: remote
};

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
});
