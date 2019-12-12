var express = require('express');
var http = require('http');
var WebSocket = require('ws');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var cors = require('cors')
var app = express();

var serverPort = process.env.PORT || 8085,
  socketPort = serverPort + 1;

/**
 * We use sockets for commands that can take a while to 
 * run.  Specifically, the image create command
 */
const streamCommandline = (ws, type, cmd, params) => {
  return new Promise( (resolve, reject) => {
    if ( params === undefined ){
      params = [];
    }
    var out = spawn(cmd, params);
    ws.send(JSON.stringify({
      type: type,
      data: cmd + " " + params.join(" ") + "\n"
    }));
    out.on('error', function(e){
      ws.send(JSON.stringify({
        type: type,
        error: e.toString()
      }));
      reject(e);
    });
    out.stdout.on('data', function(data){
      ws.send(JSON.stringify({
        type: type,
        data: data.toString()
      }));
    } );
    out.stderr.on('data', function(data){
      ws.send(JSON.stringify({
        type: type,
        error: data.toString()
      }));
    } );
    out.on('exit', function(code){
      ws.send(JSON.stringify({
        type: type,
        data: "Finished with code: " + code + "\n",
        finished: true
      }));
      resolve();
    });
  } );
};

const socket = new WebSocket.Server({port: socketPort});
socket.on('connection', (ws) => {
  ws.on('message', (req) => {
    var json;
    try {
      json = JSON.parse(req);
    } catch ( e ){
      ws.send(JSON.stringify({
        error: "Invalid message.  Must be a JSON string"
      }));
      return;
    }
    if ( json && json.type  ){
      switch ( json.type ){
        case "build-image":
          var cmd = "docker",
            params = ["build"];
          if ( json.name ){
            params.push("--tag");
            params.push(json.name);
          }
          if ( json.path ){
            var path = json.path.replace(/\\{2,}/,'\\');
            params.push(path);
          }
          streamCommandline(ws, json.type, cmd, params);
          break;

        case "volume-create-backup":
          if ( json.name ){
            var volName = json.name,
              containerName = hash() + hash(),
              backupName = volName + "-backup-" + hash();
            streamCommandline(ws, json.type, "docker", [ "volume", "create", backupName ])
            .then( () => {
              streamCommandline(ws, json.type, "docker", [
                "run",
                "--rm","-dt",
                "-v",volName + ":/data",
                "-v", backupName + ":/backup",
                "--name", containerName,
                "alpine:latest"
              ] )
              .then( () => {
                streamCommandline(ws, json.type, "docker", [
                  "exec",
                  containerName,
                  "cp", 
                  "-a",
                  "/data/.", 
                  "/backup/"
                ] )
                .then( () => {
                  streamCommandline(ws, json.type, "docker", [
                    "container", "stop", containerName
                  ]);
                } );
              } )
            } );
          } else {
            ws.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `name` parameter in request"
            }));
          }
          break;

        case "container-create-directory-backup":
          var t = "container-create-directory-backup",
            dir = json.sourceDirectory,
            container = json.containerId;
          if ( !dir ){
            ws.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `sourceDirectory` parameter in request"
            }));
          }
          else if ( !container ){
            ws.send(JSON.stringify({
              type: "create-volume-backup",
              error: "Missing `containerId` parameter in request"
            }));
          }
          else {
            var volName = container + "-backup-vol-" + hash(),
              backupDir = "backup-" + hash(),
              tmpContainerName = "tmp-" + hash(),
              imgName = container + "-temp-image-" + hash();
            streamCommandline(ws, json.type, "docker", ["volume","create",volName])
            .then(() => {
              streamCommandline(ws, json.type, "docker", [ "commit", container, imgName ])
              .then(() => {
                streamCommandline(ws, json.type, "docker", [
                  "run",
                  "-dt",
                  "--name",
                  tmpContainerName,
                  "-v",
                  volName + ":/" + backupDir,
                  imgName
                ])
                .then(() => {
                  streamCommandline(ws, json.type, "docker", [
                    "exec",
                    tmpContainerName,
                    "cp",
                    "-r",
                    "/" + dir + "/.",
                    "/" + backupDir + "/"
                  ])
                  .then(() => {
                    streamCommandline(ws, json.type, "docker", ["stop",tmpContainerName])
                    .then(() => {
                      streamCommandline(ws, json.type, "docker", ["rm",tmpContainerName])
                      .then(() => {
                        streamCommandline(ws, json.type, "docker", ["image", "rm",imgName]);
                      } )
                    } )
                  } )
                } )
              } )
            } );
          }
          break;
      }
    } else {
      ws.send(JSON.stringify({
        error: "Malformed request.  Expecting an object with a 'type' index."
      }));
      return;
    }
  } );
} );

const hash = () => {
  var chars = "abcdef0123456789",
    ret = "",
    i;
  while ( ret.length < 8 ){ 
    i = Math.floor(Math.random() * Math.floor(chars.length - 1));
    ret += chars[i];
  }
  return ret;
};

app.use(cors())
app.use("/", express.static('static-content'))

/**
 * Express Middleware for converting
 * the raw body of the request to 
 * JSON if possible
 */
app.use( (req, res, next) => {
  var data = "";
  req.on('data', (chunk) => {
    data += chunk;
  } );
  req.on('end', () => {
    var json; 
    try {
      if ( data ){
        json = JSON.parse(data);
        req.body = json;
      } else {
        req.body = {};
      }
    } catch ( e ){
      req.body = {};
    }
    next();
  } );
} );

var parseColumnsRows = (body) => {
  var lines = body.split(/\n|\r/);
  var columns = lines.shift().split(/\s{2,}/);
  var rows = lines.map( (line) => {
    var ret = {},
      row = line.split(/\s{2,}/);
    columns.forEach( (col, index) => {
      if ( col && row[index] ){
        ret[col] = row[index] || "";
      }
    } );
    return ret;
  } );
  return {
    output: rows
  };
};

app.get("/images", (req, res) => {
  exec("docker image ls", (err, out, stderr) => {
    if ( err ){
      console.error(err);
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json(parseColumnsRows(out.trim()));
    }
  } );
} );

app.get("/image/inspect/:id", (req, res) => {
  var cmd = "docker inspect " + req.params.id;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json(JSON.parse(out));
    }
  } );
} );

app.post("/image/:id/perform/:action", (req, res) => {
  var body = req.body,
    cmd = `docker image ${req.params.action}`;
  if ( body && body.options && body.options.length ){
    body.options.forEach( (opt) => {
      cmd += ` ${opt}`;
    } );
  }
  cmd += ` ${req.params.id}`;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json({
        command: cmd,
        results: out
      });
    }
  } );
} );

app.get("/container/inspect/:id", (req, res) => {
  var cmd = "docker inspect " + req.params.id;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json(JSON.parse(out));
    }
  } );
} );

var showContainers = (req, res) => {
  var cmd = "docker ";
  if ( req.params.type === "all" ){
    cmd += "ps -a";
  } else {
    cmd += "container ls";
  }
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json(parseColumnsRows(out.trim()));
    }
  } );
};

app.get("/containers/show/:type", showContainers );

app.get("/containers/show", showContainers );

app.post("/container/:id/perform/:action", (req, res) => {
  var cmd = "docker container ";
  cmd += req.params.action + " ";
  cmd += req.params.id;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json({
        command: cmd,
        results: out
      });
    }
  } );
} );

app.post("/container/run/:imageId", (req, res) => {
  var imageId = req.params.imageId,
    params = req.body,
    cmd = "docker run -d";
  if ( params.name ){
    cmd += ` --name ${params.body.name}`;
  }
  if ( params.flags && params.flags.length ){
    cmd += ` -${params.flags.join('')}`;
  }
  if ( params.options && params.options.length ){
    params.options.forEach( (option) => {
      cmd += ` ${option.key} ${option.value}`;
    } );
  }
  if ( params.ports && Object.keys(params.ports).length ){
    Object.keys(params.ports).forEach( (remote) => {
      cmd += ` -p ${params.ports[remote]}:${remote}`;
    } );
  }
  if ( params.volumes && params.volumes.length ){
    params.volumes.forEach( (vol) => {
      cmd += ` -v ${vol.local}:${vol.remote}`;
    } );
  }
  if ( params.additionalArgs && params.additionalArgs.length ){
    cmd += ` ${params.additionalArgs}`;
  }
  cmd += ` ${imageId}`;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      res.json({
        command: cmd,
        results: out
      });
    }
  } );
} );

app.get("/volumes", (req, res) => {
  var cmd = "docker volume ls",
    query = req.query;
  exec(cmd, (err, out, stderr) => {
    if ( err ){
      console.error(err);
      res.json({
        "error": ("" + err),
        "fullError" : err
      });
    } else if ( out ){
      var data = parseColumnsRows(out.trim()),
        filterName = query.name || query.volume_name || null;
      if ( filterName && data.output && data.output.length  ){
        data.output = data.output.filter( (dat) => {
          return dat['VOLUME NAME'] === filterName;
        } );
      }
      exec("docker system df -v", (err2, out2, stderr2) => {
        if ( !err2 && !stderr2 ){
          var lines = out2.split(/\n|\r/),
            volLines = "",
            isRunning = false,
            isFinished = false;
          lines.forEach( (line) => {
            if ( isFinished === true ){
              return;
            }
            if ( !isRunning && line.match(/^VOLUME NAME/) ){
              isRunning = true;
              volLines += line + "\n";
            }
            else if ( isRunning && line ){
              volLines += line + "\n";
            } else if ( isRunning && !line ){
              isFinished = true;
            }
          } );
          if ( volLines ){
            var details = parseColumnsRows(volLines.trim());
            if ( details && details.output && data && data.output ){
              data.output = data.output.map( (dat) => {
                details.output.forEach( (det) => {
                  if (det['VOLUME NAME'] === dat['VOLUME NAME']){
                    dat = Object.assign({}, dat, det);
                  }
                } );
                return dat;
              } );
            }
          }
          res.json(data);
        } else {
          res.json(data);
        }
      } );
    }
  } );
} );

app.get("/volume/:name", (req, res) => {
  var volName = req.params.name;
  if ( volName ){
    var cmd = "docker volume inspect " + volName;
    exec(cmd , (err, out, stderr) => {
      if ( stderr ){
        res.json({
          error: stderr
        });
      }
      else if ( err ){
        res.json({
          error: "An error occurred",
          fullError: err
        });
      } else {
        var results;
        try {
          results = JSON.parse(out);
          if ( Array.isArray(results) && results.length === 1 ){
            results = results.pop();
            results = {
              basic: results,
              meta: null
            };
          }
          http.get("http://localhost:" + serverPort + "/volumes?name=" + volName, (response) => {
            var content = "";
            response.on("data", chunk => content += chunk);
            response.on("end", () => {
              try {
                content = JSON.parse(content);
                if ( content && content.output && content.output.length ){
                  results.meta = content.output.pop();
                }
                res.json({
                  command: cmd,
                  results: results
                });
              } catch ( e ){
                res.json({
                  command: cmd,
                  results: results
                });
              }
            } );
          } );
        } catch ( e ){
          results = out;
          res.json({
            command: cmd,
            results: results
          });
        }
      }
    } )
  }
  else {
    res.json({
      "error": "Invalid Volume Name"
    });
  }
} );

app.post("/volume/create", (req, res) => {
  if ( req.body ){
    if ( req.body.name ){
      var sendOutput,
        volumeFound = false;
      // Check if name already exists
      http.get("http://localhost:" + serverPort + "/volumes?name=" + encodeURIComponent(req.body.name), (response) => {
        var content = "";
        response.on('data', chunk => content += chunk);
        response.on('end', () => {
          try {
            var results = JSON.parse(content);
            if ( results.output && results.output.length ){
              volumeFound = true;
            }
          } catch( e ){
            volumeFound = false
          }
          sendOutput();
        } );
      } );
      sendOutput = () => {
        if ( volumeFound ){
          res.json({
            error: "Cannot create Volume because one already exists with that name"
          });
        } else {
          var cmd = "docker volume create " + req.body.name;
          exec(cmd, (err, out, stderr) => {
            if ( err ){
              res.json({
                error: stderr || "An error occurred",
                fullError: err
              });
            }
            else {
              res.json({
                command: cmd,
                results: out
              });
            }
          } );
        }
      };
    }
  } else {
    res.json({
      error: "This endpoint expects a the parameter `name` in the body of the request."
    });
  }
} );

app.post("/volume/create-backup", (req, res) => {
  if ( req.body ){
    if ( req.body.name ){
      var backupName = req.body.name + "-backup-" + hash(),
        data = JSON.stringify({name: backupName}),
        url = "http://localhost:" + serverPort + "/volume/create",
        options = {
          hostname: 'localhost',
          port: serverPort,
          path: '/volume/create',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };
      var request = http.request(options, (response) => {
        var content = "";
        response.on('data', chunk => content += chunk);
        response.on('end', () => {
          try {
            content = JSON.parse(content);
            if ( content.results ){
              var containerName = hash() + hash();
              var backCommand = "docker run -dt --rm --name " + containerName +
                " -v " + req.body.name + ":/data " +
                " -v " + backupName + ":/backup " +
                " alpine:latest " + 
                " && docker exec " + containerName + " cp -a /data/. /backup/ " + 
                " && docker stop " + containerName;
              exec(backCommand, (err, out, stderr) => {
                if ( err ){
                  res.json({
                    error: stderr || "An error occurred.",
                    fullError: err
                  });
                }
                else if ( out ){
                  res.json({
                    results: out,
                    command: backCommand
                  });
                }
              } );
            } else {
              res.json({
                error: "An error occurred while creating backup"
              });
            }
          } catch ( e ){
            res.json({
              error: "An error occurred.",
              fullError: e
            });
          }
        } );
      } );
      request.on('error', (err) => {
        res.json({
          error: "An error occurred.",
          fullError: err
        });
      } );
      request.write(data);
      request.end();
    }
    else {
      res.json({
        error: "Malformed request: Missing `name` parameter in request body."
      });
    }
  } 
  else {
    res.json({
      error: "Malformed request"
    });
  } 
} );

app.delete("/volume/:name", (req, res) => {
  if ( req.params.name ){
    var cmd = "docker volume rm " + req.params.name;
    exec(cmd, (err, out, stderr) => {
      if ( err ){
        res.json({
          error: stderr || "An error occurred",
          fullError: err
        });
      } 
      else if ( out ) {
        res.json({
          command: cmd,
          results: out
        });
      }
      else {
        res.json({
          error: "An unknown error occurred"
        });
      }
    } );
  } 
  else {
    res.json({
      error: "Malformed request"
    });
  }
} );

app.listen( serverPort, () => {
  var str = `Node Server started: \nlocalhost:${serverPort}`;
  console.log(str);
} );
