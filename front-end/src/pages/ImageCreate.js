import React from 'react';
import withApiWatch from '../components/withApiWatch';
import * as Actions from '../actions';
import _ from 'lodash';

class ImageCreate extends React.Component {
  constructor(props){
    super(props); 
    var self = this;
    Actions.setArg("socketOpen", false);
    this.socket = new WebSocket("ws://localhost:8086");
    this.socket.onopen = () => {
      Actions.setArg("socketOpen", true);
    };
    this.socket.onclose = () => {
      Actions.setArg("socketOpen", false);
    };
    this.socket.onmessage = (msg) => {
      var data;
      try {
        data = JSON.parse(msg.data);
      } catch ( e ) {
        return;
      }
      if ( data && data.type === "build-image" ){
        if ( data && ( data.data || data.error ) ){
          var output = _.get(self.props,"args.output") || [];
          var line = data.data || data.error;
          if ( line.match(/^\(/) ){
            if ( output.length && output[output.length - 1].match(/^\(/) ){
              output[output - 1] = line;
            } else {
              output.push(line);
            }
          } else {
            output.push(line);
          }
          Actions.setArg("output", output);
        }
        if ( data && data.finished === true ){
          Actions.setArg("buildStarted", false);
        }
        setTimeout( () => {
          if ( self.stdout ){
            self.stdout.scrollTop = self.stdout.scrollHeight;
          }
        }, 100 );
      }
    };

    this.stdout = null;
  }

  handleFormSubmit(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var {
      path,
      name,
      socketOpen
    } = this.props.args;
    if ( path && socketOpen ){
      this.socket.send(JSON.stringify({
        type: "build-image",
        name,
        path
      }));
      Actions.setArg("buildStarted", true);
    } 
    else if ( !socketOpen ){
      Actions.setMessage("Socket is not connected.  Please refresh the page.", "error");
    }
    else if ( !path ) {
      Actions.setMessage("Please enter a path first.", "error");
    }
  }

  render(){
    var socketOpen = _.get(this.props,"args.socketOpen") || false,
      output = _.get(this.props, "args.output"),
      buildStarted = _.get(this.props, "args.buildStarted") || false,
      path = _.get(this.props,"args.path") || "",
      name = _.get(this.props,"args.name") || "",
      self = this;

    return (
      <div className="Image-create">
        <h1>Create an Image</h1>
        <p>This page can be used to build an image from a Dockerfile</p>
        <p>
          <span className={`toggler danger${(socketOpen === true ? " checked" : "")}`}> 
            Connection Open
          </span><br />
          <em>This page uses WebSockets to stream the output of the build process to this page.  If the indicator above is red, there is no connection.</em><br />
          { buildStarted ? (
            <span className={`toggler danger${(buildStarted === true ? " checked" : "")}`}> 
              Build Started
            </span>
          ) : null }
        </p>
        <form onSubmit={this.handleFormSubmit.bind(this)}>
          <div className="row">
            <div className="col-6">
              <div className="flex-col">
                <p>
                  <strong>Name</strong> <em>(optional)</em><br />
                  Please enter name to easily identify this image
                </p>
                <input 
                  type="text" 
                  onChange={(e) => {
                    Actions.setArg("name", e.target.value);
                  }}
                  value={name}
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <div className="flex-col">
                <p>
                  <strong>Build Directory</strong><br />
                  Please enter the full path of the <strong>directory</strong> where your Dockerfile is located
                </p>
                <input 
                  type="text" 
                  onChange={(e) => {
                    Actions.setArg("path", e.target.value);
                  }}
                  value={path}
                />
              </div>
            </div>
          </div>
          <p></p>
          <div className="row">
            <div className="col-12">
              <button type="submit">Create Image</button>
            </div>
          </div>
        </form>
        { output ? [
          <p key='blank'></p>,
          <pre 
            className="console" 
            key="console"
            ref={ (r) => {
              self.stdout = r;
            } }
          >
            {output.join("")}
          </pre>
        ] : null }
      </div>
    );
  }
};

export default withApiWatch(ImageCreate);
