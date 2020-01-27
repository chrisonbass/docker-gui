# Local Docker GUI

This is a simple graphical interface to ease the pain of starting/stopping/creating Docker containers.

### Getting Started
Clone this repo, then run the following command in the cloned directory
```
npm install
```
Then, run this command to start the local server
```
npm start
```

From this point you should be able to access the GUI from `http://localhost:8085`

### TODO ###
- Fix Volume Actions
  - Modal Dialog Prompt for Vol Create
  - Remove window.prompt calls (not supported in Electron)
  - Fix bug in backup creation (hash function missing on backend)
- Update Container Tables 
  - Provide Quick actions
  - Show CPU/Memory usage

