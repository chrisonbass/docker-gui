var express = require('express');
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
          var out = spawn(cmd, params);
          out.on('error', function(e){
            console.error(e);
            ws.send(JSON.stringify({
              type: "build-image",
              error: e.toString()
            }));
          });
          out.stdout.on('data', function(data){
            ws.send(JSON.stringify({
              type: "build-image",
              data: data.toString()
            }));
          } );
          out.stderr.on('data', function(data){
            ws.send(JSON.stringify({
              type: "build-image",
              error: data.toString()
            }));
          } );
          out.on('exit', function(code){
            ws.send(JSON.stringify({
              type: 'build-image',
              data: "Finished with code: " + code,
              finished: true
            }));
          });
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
      ret[col] = row[index] || "";
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
      res.json(parseColumnsRows(out));
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
      res.json(parseColumnsRows(out));
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
  console.log({
    body: req.body,
    params: req.params
  });
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



app.listen( serverPort, () => {
  var str = `Node Server started: \nlocalhost:${serverPort}`;
  console.log(str);
} );
