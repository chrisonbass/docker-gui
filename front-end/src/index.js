import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// Used by Link and Actions.getInitialState to
// determin current page view
window.appLocation = "/";

const setupRightClickMenu = () => {
  const remote = window.electron.remote;
  const Menu = remote.Menu;
  const MenuItem = remote.MenuItem;

  let rightClickPosition = null;

  const menu = new Menu()
  const menuItem = new MenuItem({
    label: 'Inspect Element',
    click: () => {
      remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y);
    }
  });
  menu.append(menuItem);

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    rightClickPosition = {x: e.x, y: e.y};
    menu.popup(remote.getCurrentWindow());
  }, false)
};
setupRightClickMenu();

ReactDOM.render(<App />, document.getElementById('root'));
