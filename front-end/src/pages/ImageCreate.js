import React from 'react';
import withApiWatch from '../components/withApiWatch';
import withSocket from '../components/withSocket';
import * as Actions from '../actions';
import _ from 'lodash';

class ImageCreate extends React.Component {
  constructor(props){
    super(props); 
    if ( this.props.setSocketKey ){
      this.props.setSocketKey("build-image");
    }
  }

  handleFormSubmit(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var {
      path,
      name,
      buildArgs,
      socketOpen
    } = this.props.args;
    if ( path && socketOpen ){
      this.props.sendMessage({
        name,
        path,
        buildArgs
      });
    } 
    else if ( !socketOpen ){
      Actions.setMessage("Socket is not connected.  Please refresh the page.", "error");
    }
    else if ( !path ) {
      Actions.setMessage("Please enter a path first.", "error");
    }
  }

  handleAddArg(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var buildArgs = ( _.get(this.props,"args.buildArgs") || [] ).slice();
    buildArgs.push({
       name: "",
      value: ""
    });
    Actions.setArg("buildArgs", buildArgs);
  }

  getArgChangeListener(index, key){
    var self = this;
    return (e) => {
      var args = ( _.get(self.props, "args.buildArgs") || [] ).slice();
      if ( key === "delete" && e && e.preventDefault ){
        e.preventDefault();
        args.splice(index, 1);
        Actions.setArg("buildArgs", args);
        return;
      }
      if ( args[index] ){
        var newArg = Object.assign({}, args[index], {
          [key]: e.target.value
        } );
        args.splice(index, 1, newArg);
        Actions.setArg("buildArgs", args);
      }
    };
  }

  render(){
    var socketOpen = _.get(this.props,"args.socketOpen") || false,
      output = _.get(this.props, "args.output"),
      path = _.get(this.props,"args.path") || "",
      buildArgs = _.get(this.props, "args.buildArgs"),
      name = _.get(this.props,"args.name") || "";

    return (
      <div className="Image-create">
        <h1>Create an Image</h1>
        <p>This page can be used to build an image from a Dockerfile</p>
        <p>
          <span className={`toggler danger${(socketOpen === true ? " checked" : "")}`}> 
            Connection Open
          </span><br />
          <em>This page uses WebSockets to stream the output of the build process to this page.  If the indicator above is red, there is no connection.</em><br />
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
          <div className="row">
            <div className="col-6">
              <div className="flex-col">
                <p>
                  <strong>Build Args</strong><br />
                  Arguments placed here will be replace any ARG/ENV values 
                </p>
                { buildArgs && buildArgs.length ? (
                  buildArgs.map( (arg, index) => {
                    return (
                      <div key={`arg-${index}`} className="flex-fill">
                        <div className="flex-col" style={{marginRight: "10px"}}>
                          <strong>Name</strong>
                          <input value={arg.name} onChange={this.getArgChangeListener(index, "name")} />
                        </div>
                        <div className="flex-col" style={{marginRight: "10px"}}>
                          <strong>Value</strong>
                          <textarea value={arg.value} onChange={this.getArgChangeListener(index, "value")} />
                        </div>
                        <a href="void" className="text-danger" onClick={this.getArgChangeListener(index, "delete")}>
                          - Delete
                        </a>
                      </div>
                    );
                  } )
                ) : null }
                <a href="void" onClick={this.handleAddArg.bind(this)}>
                  + add Arg
                </a>
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
          <pre className="console" key="console" ref={this.props.stdoutRef}>
            {output.join("")}
          </pre>
        ] : null }
      </div>
    );
  }
};

export default withApiWatch(withSocket(ImageCreate));
