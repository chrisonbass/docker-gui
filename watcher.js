var fs = require('fs'),
  exec = require('child_process').exec;

var running = false,
  started = null,
  que = 0;

const build = () => {
  if ( running === true ){
    var check = Math.round((new Date).getTime() / 1000);
    if ( check - started > 1 ){
      que++;
    }
    return;
  }
  started = Math.round((new Date).getTime() / 1000);
  running = true;
  console.log("Running Build - Will Take a Moment\n\n");
  var path =  "./front-end";
  exec("npm run build", { cwd: path }, (err, stdout, stderr) => {
    if ( err ){
      console.error(err);
    }
    if ( stdout ){
      console.log(stdout);
    }
    if ( stderr ){
      console.error(stderr);
    }
    console.log("\n\nFinished Running Build \n\n");
    running = false;
    if ( que > 0 ){
      console.log("\nChange discovered during build\n\n");
      que = 0;
      build();
    }
  } );
};
fs.watch('./front-end/src', {recursive: true}, build );

console.log("Watching For Changes");
