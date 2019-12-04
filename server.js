var express = require('express');
var exec = require('child_process').exec;
var cors = require('cors')
var app = express();

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
  var cmd = "docker image ";
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

var serverPort = process.env.PORT || 8085;

app.listen( serverPort, () => {
  var str = `Node Server started: \nlocalhost:${serverPort}`;
  console.log(str);
} );
