var exec = require('child_process').exec;
var fs = require('fs');
var dir = __dirname + "\\..\\static\\";

var file = dir + "index.html";
if ( fs.existsSync(file) ){
  var contents = fs.readFileSync(file).toString();
  if ( contents.match(/\/static/) ){
    contents = contents.replace(/"\/static/g, "\"./static");
  }
  fs.writeFileSync(file, contents);
} else {
  console.error("File not found: " + file);
}
