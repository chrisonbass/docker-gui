const { dialog, ipcMain, shell } = require('electron');
const spawn = require('child_process').spawn;

const state = {
  timesImageListed: 0,
  timesVolumesListed: 0,
  timesContainersListed: 0,
  volumesListed: {}
};

const parseColumnsRows = (body) => {
  var lines = body.split(/\n|\r/);
  var columns = lines.shift().split(/\s{2,}/).map( col => col.trim() );
  var rows = lines.map( (line, lineIndex) => {
    var ret = {},
      row = line.split(/\s{2,}/).map( col => col.trim() );
    columns.forEach( (col, index) => {
      if ( !col ){
        return;
      }
      if ( col ){
        ret[col] = row[index] || "";
      }
    } );
    return ret;
  } );
  return rows;
};

const outputConsoleCommand = (messenger, cmd, params) => {
  if ( params === false ){
    messenger.reply("console", {
      data: cmd
    } );
  } else {
    messenger.reply("console", {
      data: "\n" + cmd + " " + params.join(' ') + "\n"
    } )
  }
};

const StreamAccumulator = function(){
  var output = "";
  this.reply = (type, out) => {
    if ( out && out.data ){
      if ( !out.finished ){
        output += out.data;
      }
    }
    else if ( typeof out === "string" ){
      output += out;
    }
  };
  this.isAccumulator = true;
  this.getOutput = () => ("" + output).trim();
};

const streamCommandline = (ipcMessenger, type, cmd, params) => {
  return new Promise( (resolve, reject) => {
    if ( params === undefined ){
      params = [];
    }
    var out = spawn(cmd, params);
    console.log(cmd + " " + params.join(' '));
    if ( type === "console" ){
      //outputConsoleCommand(ipcMessenger, cmd, params);
    }
    out.on('error', function(e){
      ipcMessenger.reply(type, {
        type: type,
        error: e.toString()
      });
      reject(e);
    });
    out.stdout.on('data', function(data){
      ipcMessenger.reply(type, {
        data: "\n" + data.toString().trim()
      });
    } );
    out.stderr.on('data', function(data){
      ipcMessenger.reply(type, {
        error: "\n" + data.toString().trim()
      });
    } );
    out.on('exit', function(code){
      resolve();
    });
  } );
};

exports.default = (mainWindow, ipc) => {
  ipcMain.on('open-external', function(e, args){
    if ( args && args.href ){
      shell.openExternal(args.href);
    }
  } );
  ipcMain.on('process-action', function(e, args){
    if ( args && args.type ){
      // Request parameters assigned to json
      var json = args.request || {};
      switch ( args.type ){
        case "pick-directory":
          var directory = dialog.showOpenDialogSync(mainWindow, {
            properties: ['openDirectory']
          });
          if ( directory !== undefined ){
            e.reply(json.id || "pick-directory", {
              directory: directory,
              request: json
            } );
          }
          break;

        case "pick-file":
          var file = dialog.showOpenDialogSync(mainWindow, {
            properties: ['openFile']
          });
          if ( file !== undefined ){
            e.reply(json.id || "pick-file", {
              file: file
            } );
          }
          break;

        case "build-image":
          var cmd = "docker",
            params = ["build"];
          if ( json.name ){
            params.push("--tag");
            params.push(json.name);
          }
          if ( json.buildArgs ){
            json.buildArgs.forEach( (arg) => {
              params.push("--build-arg");
              params.push(`${arg.name}=${arg.value}`);
            } );
          }
          if ( json.path ){
            var path = json.path.replace(/\\{2,}/,'\\');
            params.push(path);
          }
          streamCommandline(e, "console", cmd, params);
          break;

        case "image-inspect":
          var key = "image-inspect";
          var acc = new StreamAccumulator(),
            cmd = "docker",
            params = [
              "image",
              "inspect",
              json.id
            ];
          streamCommandline(acc, key, cmd, params)
          .then( () => {
            var body = acc.getOutput();
            try {
              body = JSON.parse(body);
              e.reply(key, body);
            } catch ( e ){
              e.reply(key, {
                error: e
              });
            }
          } )
          .catch( (err) => {
            e.reply(key, {
              error: err
            } );
          } );
          break;

        case "image-list":
          var key = "image-list";
          var acc = new StreamAccumulator(),
            cmd = "docker",
            params = [
              "image",
              "ls"
            ];

          streamCommandline(acc, key, cmd, params)
          .then( () => {
            var body = acc.getOutput();
            var listTable = parseColumnsRows(body);
            if ( state.timesImageListed === 0 ){
              state.timesImageListed++;
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, body, false);
            }
            e.reply(key, listTable);
          } )
          .catch( (err) => {
            e.reply(key, {
              error: err
            } );
          } );
          break;

        case "volume-list":
          var acc = new StreamAccumulator(),
            cmd = "docker",
            params = [
              "volume",
              "ls"
            ];
          streamCommandline(acc, "volume-list", cmd, params)
          .then( () => {
            var body = acc.getOutput();
            var listTable = parseColumnsRows(body);
            if ( state.timesVolumesListed === 0 ){
              state.timesVolumesListed++;
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, body, false);
            }
            e.reply("volume-list", listTable);
          } )
          .catch( (err) => {
            e.reply("volume-list", {
              error: err
            } );
          } );
          break;

        case "volume-info":
          var acc = new StreamAccumulator(),
            cmd = "docker",
            params = [
              "volume",
              "inspect",
              json.name
            ];
          streamCommandline(acc, "volume-info", cmd, params)
          .then( () => {
            var output = acc.getOutput();
            if ( !state.volumesListed[json.name] ){
              state.volumesListed[json.name] = true;
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, output, false);
            }
            try {
              output = JSON.parse(output);
              console.log(output);
              e.reply("volume-info", output);
            } catch ( exc ) {
              console.log(exc);
              e.reply("volume-info", exc.toString());
            }
          } )
          .catch( (err) => {
            e.reply("volume-info", {
              error: err
            } );
          } );
          break;

        case "volume-create-backup":
          if ( json.name ){
            var volName = json.name,
              containerName = hash() + hash(),
              backupName = volName + "-backup-" + hash();
            streamCommandline(e, "console", "docker", [ "volume", "create", backupName ])
            .then( () => {
              streamCommandline(e, "console", "docker", [
                "run",
                "--rm","-dt",
                "-v",volName + ":/data",
                "-v", backupName + ":/backup",
                "--name", containerName,
                "alpine:latest"
              ] )
              .then( () => {
                streamCommandline(e, "console", "docker", [
                  "exec",
                  containerName,
                  "cp", 
                  "-a",
                  "/data/.", 
                  "/backup/"
                ] )
                .then( () => {
                  streamCommandline(e, "console", "docker", [
                    "container", "stop", containerName
                  ]);
                } );
              } )
            } );
          } else {
            e.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `name` parameter in request"
            }));
          }
          break;

        case "container-run":
          var imageId = json.imageId,
            params = json,
            cmd = "docker",
            cmdParams = [
              "run",
              "-d"
            ];
          if ( params.flags && params.flags.length ){
            cmdParams = cmdParams.concat([
              `-${params.flags.join('')}`
            ]);
          }
          if ( params.options && params.options.length ){
            params.options.forEach( (option) => {
              cmdParams = cmdParams.concat([
                option.key,
                option.value
              ]);
            } );
          }
          if ( params.ports && Object.keys(params.ports).length ){
            Object.keys(params.ports).forEach( (remote) => {
              cmdParams = cmdParams.concat([
                '-p',
                `${params.ports[remote]}:${remote}`
              ]);
            } );
          }
          if ( params.volumes && params.volumes.length ){
            params.volumes.forEach( (vol) => {
              cmdParams = cmdParams.concat([
                '-v',
                `${vol.volumeId}:${vol.remote}`
              ]);
            } );
          }
          if ( params.mounts && params.mounts.length ){
            params.mounts.forEach( (vol) => {
              cmdParams = cmdParams.concat([
                '-v',
                `${vol.local}:${vol.remote}`
              ]);
            } );
          }
          if ( params.additionalArgs && params.additionalArgs.length ){
            cmdParams = cmdParams.concat((`${params.additionalArgs}`).trim().split(/\s+/).map( v => v.trim()));
          }
          cmdParams.push(`${imageId}`);
          cmdParams = cmdParams.map( v => v.trim() ).filter( v => v.length );
          console.log({
            "cmd": cmd,
            "params": cmdParams
          });
          streamCommandline(e, "console", cmd, cmdParams)
          .catch( (err) => {
            console.log("An Error Occurred during Container Run");
            console.log(err);
            e.reply("console", {
              data: "\nAn error occurred during build\n" + err.message
            });
          } );
          break;

        case "containers-list":
          var acc = new StreamAccumulator(),
            cmd = "docker",
            params = [ ];
          if ( json.type === "all" ){
            params = [
              "ps", "-a"
            ];
          } else {
            params = [
              "container", "ls"
            ];
          }
          streamCommandline(acc, "containers-list", cmd, params)
          .then( () => {
            var body = acc.getOutput();
            var listTable = parseColumnsRows(body);
            if ( state.timesContainersListed === 0 ){
              state.timesContainersListed++;
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, body, false);
            }
            e.reply("containers-list", listTable);
          } )
          .catch( (err) => {
            e.reply("containers-list", {
              error: err
            } );
          } );
          break;

        case "container-create-directory-backup":
          var t = "container-create-directory-backup",
            dir = json.sourceDirectory,
            container = json.containerId;
          if ( !dir ){
            e.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `sourceDirectory` parameter in request"
            }));
          }
          else if ( !container ){
            e.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `containerId` parameter in request"
            }));
          }
          else {
            var volName = json.volumeName || container + "-backup-vol-" + hash(),
              backupDir = "backup-" + hash(),
              tmpContainerName = "tmp-" + hash(),
              imgName = container + "-temp-image-" + hash();
            streamCommandline(e, "console", "docker", ["volume","create",volName])
            .then(() => {
              streamCommandline(e, "console", "docker", [ "commit", container, imgName ])
              .then(() => {
                streamCommandline(e, "console", "docker", [
                  "run",
                  "-dt",
                  "--name",
                  tmpContainerName,
                  "-v",
                  volName + ":/" + backupDir,
                  imgName
                ])
                .then(() => {
                  streamCommandline(e, "console", "docker", [
                    "exec",
                    tmpContainerName,
                    "cp",
                    "-r",
                    "/" + dir + "/.",
                    "/" + backupDir + "/"
                  ])
                  .then(() => {
                    streamCommandline(e, "console", "docker", ["stop",tmpContainerName])
                    .then(() => {
                      streamCommandline(e, "console", "docker", ["rm",tmpContainerName])
                      .then(() => {
                        streamCommandline(e, "console", "docker", ["image", "rm",imgName]);
                      } )
                    } )
                  } )
                } )
              } )
            } );
          }
          break;
      }
    }
  } );
};
