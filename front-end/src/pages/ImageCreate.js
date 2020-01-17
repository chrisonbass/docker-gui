import React from 'react';
import withIPC from '../components/withIPC';
import FileSelector from '../components/FileSelector';
import * as Actions from '../actions';
import _ from 'lodash';

class ImageCreate extends React.Component {
  handleFormSubmit(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var {
      path,
      name,
      buildArgs
    } = this.props.args;

    if ( path ){
      this.props.sendMessage("process-action", {
        type: "build-image",
        request: {
          name,
          path,
          buildArgs
        }
      } );
    } 
    else {
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
    var path = _.get(this.props,"args.path") || "",
      buildArgs = _.get(this.props, "args.buildArgs"),
      name = _.get(this.props,"args.name") || "";

    return (
      <div className="Image-create">
        <h1>Create an Image</h1>
        <p>This page can be used to build an image from a Dockerfile</p>
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
                <FileSelector 
                  type="directory"
                  onChange={(value) => {
                    Actions.setArg("path", value);
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
      </div>
    );
  }
};

export default withIPC(ImageCreate);
