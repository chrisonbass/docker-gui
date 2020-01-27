const { dialog, ipcMain, shell } = require('electron');
const spawn = require('child_process').spawn;

var state = {
  parsingVolumeList: false
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
  var output = "",
    hasError = false;
  this.reply = (type, out) => {
    if ( out && out.data ){
      output += out.data;
    }
    else if ( out && out.error ){
      hasError = true;
      output += out.error;
    }
    else if ( typeof out === "string" ){
      output += out;
    }
  };
  this.isAccumulator = true;
  this.hasError = () => hasError;
  this.getOutput = () => ("" + output).trim();
};

const streamCommandline = (ipcMessenger, type, cmd, params) => {
  return new Promise( (resolve, reject) => {
    var acc = new StreamAccumulator();
    if ( params === undefined ){
      params = [];
    }
    params = params.map( v => ("" + v).trim() ).filter( v => v.length );
    var out = spawn(cmd, params);
    if ( type === "console" ){
      outputConsoleCommand(ipcMessenger, cmd, params);
    }
    out.on('error', function(e){
      var str = e.toString();
      ipcMessenger.reply(type, {
        type: type,
        error: str
      });
      acc.reply(type, {
        type: type,
        error: str
      });
      outputConsoleCommand(ipcMessenger, "\n\n", false);
      reject(e);
    });
    out.stdout.on('data', function(data){
      var str = data.toString();
      acc.reply(type, {
        data: str
      });
      ipcMessenger.reply(type, {
        data: str
      });
    } );
    out.stderr.on('data', function(data){
      var str = data.toString();
      acc.reply(type, {
        data: str
      });
      ipcMessenger.reply(type, {
        error: str
      });
    } );
    out.on('exit', function(code){
      acc.reply(type, {
        data: "\n\n"
      });
      if ( type === "console" ){
        outputConsoleCommand(ipcMessenger, "\n\n", false);
      }
      resolve(acc.getOutput());
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
            if ( Array.isArray(directory) && directory.length === 1 ){
              directory = directory[0];
            }
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
            if ( json.firstRun === true ){
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, "\n", false);
            }           
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
            if ( json.firstRun === true ){
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, "\n", false);
              outputConsoleCommand(e, body, false);
              outputConsoleCommand(e, "\n\n", false);
            }
            e.reply(key, listTable);
          } )
          .catch( (err) => {
            e.reply(key, {
              error: err
            } );
          } );
          break;

        case "image-run-command":
          var cmd = "docker",
            id = json.id,
            params = ["image"]
              .concat(("" + json.cmd).split(/\s+/))
              .concat(json.options);
          if ( id ){
            params.push(id);
            streamCommandline(e, "console", cmd, params)
            .then( () => {
              e.reply("image-run-command", Object.assign({},{
                result: "success"
              }, json) );
            } )
            .catch( () => {
              e.reply("image-run-command", Object.assign({},{
                result: "error"
              }, json) );
            } );
          } else {
            e.reply("console", Object.assign({},{
              data: "\n ## ERROR ##\n\nNo Image Id Provided\n"
            }, json) );
            e.reply("image-run-command", Object.assign({},{
              result: "error"
            }, json) );
          }
          break;

        case "volume-list":
         if ( state.parsingVolumeList === true ){
            console.log("Ignoring Volume List as it's currently running");
           return;
         }
          console.log("running volume list");
         state.parsingVolumeList = true;
          var cmd = "docker",
            params = [
              "system",
              "df",
              "-v"
            ];
          streamCommandline(e, "volume-list", cmd, params)
          .then( (out) => {
            var lines = ("" + out).split(/\n|\r/),
              body = [],
              started = false,
              line,
              i = 0;
            for( i; i < lines.length; i++ ){
              line = ("" + lines[i]).trim();
              if ( line.match(/^VOLUME NAME.*LINKS.*SIZE$/) ){
                started = true;
              } else if ( started === false ){
                continue;
              }
              if ( started === true ){
                if ( line === "" ){
                  break;
                } else {
                  body.push(line);
                }
              }
            }
            if ( body && body.length ){
              body = body.join("\n").trim();
            }
            var listTable = parseColumnsRows(body);
            if ( Array.isArray(listTable) ){
              var sortName = (a,b) => {
                if ( a["VOLUME NAME"] < b["VOLUME NAME"] ){
                  return -1;
                }
                else if ( a["VOLUME NAME"] > b["VOLUME NAME"] ){
                  return 1;
                }
                else {
                  return 0;
                }
              };
              listTable.sort( (a, b) => {
                if ( a.LINKS > b.LINKS ){
                  return -1;
                }
                else if ( a.LINKS < b.LINKS ){
                  return 1;
                }
                else if ( a.LINKS === b.LINKS ){
                  return sortName(a, b);
                }
              } );
            }
            if ( json.firstRun === true ){
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, "\n* Partial Output\n", false);
              outputConsoleCommand(e, body, false);
              outputConsoleCommand(e, "\n\n", false);
            }
            state.parsingVolumeList = false;
            e.reply("volume-list", listTable);
          } )
          .catch( (err) => {
            state.parsingVolumeList = false;
            e.reply("volume-list", {
              error: err
            } );
          } );
          break;

        case "volume-info":
          var cmd = "docker",
            params = [
              "volume",
              "inspect",
              json.name
            ];
          streamCommandline(e, "volume-info", cmd, params)
          .then( (out) => {
            if ( json.firstRun === true ){
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, "\n", false);
              outputConsoleCommand(e, out, false);
              outputConsoleCommand(e, "\n\n", false);
            }
            try {
              var basic = JSON.parse(out);
              e.reply("volume-info", basic);
            } catch ( exc ) {
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

        case "container-run-cmd":
          var cmd = "docker",
            params = [ "container" ]
              .concat( ("" + json.cmd).split(/\s/) )
              .concat([ json.id ]);
          streamCommandline(e, "console", cmd, params)
          .then( (out) => {
            e.reply(args.type, {
              result: "success",
              cmd: json.cmd
            } );
          } )
          .catch( (err) => {
            e.reply(args.type, {
              result: "error",
              cmd: json.cmd,
              error: err
            } );
          } );
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
            if ( json.firstRun === true ){
              outputConsoleCommand(e, cmd, params);
              outputConsoleCommand(e, "\n", false);
              outputConsoleCommand(e, body, false);
              outputConsoleCommand(e, "\n\n", false);
            }
            e.reply("containers-list", listTable);
          } )
          .catch( (err) => {
            e.reply("containers-list", {
              error: err
            } );
          } );
          break;

        case "container-inspect":
          var cmd = "docker",
            params = [
              "inspect",
              json.id
            ];
            streamCommandline(e, "noop", cmd, params)
            .then( (body) => {
              var res;
              try {
                res = JSON.parse(body);
                res.result = "succes";
              } catch ( caughtError ){
                res = { 
                  result: "error",
                  error: "Error parsing output" 
                }; 
              }
              if ( json.firstRun === true ){
                outputConsoleCommand(e,cmd, params);
                outputConsoleCommand(e,"\n", false);
              }
              e.reply("container-inspect", res );
            } )
            .catch( (err) => {
              e.reply("container-inspect", {
                result: "error",
                error: err
              } );
            } );
          break;

        case "container-stats":
          var cmd = "docker",
            params = [
              "stats",
              "--no-stream",
              json.id
            ];
          streamCommandline(e, "noop", cmd, params)
            .then( (out) => {
              var table = parseColumnsRows(("" + out).trim());
              if ( table ){
                e.reply("container-stats", table);
              }
            } )
            .catch( (err) => {
              console.log("container stats error");
              console.error(err);
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
