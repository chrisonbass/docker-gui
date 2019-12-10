import React from 'react';
import withApiWatch from '../components/withApiWatch';
import * as Actions from '../actions';
import _ from 'lodash';

class Volume extends React.Component {
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
      if ( data && data.type === "volume-create-backup" ){
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
          Actions.setArg("backupStarted", false);
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

  componentDidMount(){
    this.props.addApiWatchId("volume-delete");
    this.props.addRepeatingApi("volume-info", "volume/" + this.getId());
  }

  getId(){
    return this.props.args.id;
  }

  handleBackupClick(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var name = this.getId();
    var {
      socketOpen
    } = this.props.args;
    if ( name && socketOpen ){
      this.socket.send(JSON.stringify({
        type: "volume-create-backup",
        name
      }));
      Actions.setArg("backupStarted", true);
    } 
    else if ( !socketOpen ){
      Actions.setMessage("Socket is not connected.  Please refresh the page.", "error");
    }
    else if ( !name ) {
      Actions.setMessage("Please enter a path first.", "error");
    }
  }

  handleDeleteClick(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    if ( !window.confirm("Are you sure you want to delete this image?") ){
      return;
    } 
    Actions.api("volume-delete", "volume/" + this.getId(), {
      method: "DELETE"
    } );
  }

  parseValue(val){
    if ( Array.isArray(val) ){
      return val.join(", ");
    }
    switch ( typeof val ){
      case "string":
      case "number":
        return val;
      case "object":
        return this.objectToString(val);
      default:
        return val;
    }
  }

  objectToString(obj){
    return (
      <ul>
        { Object.keys(obj).map( (k) => {
          return (
            <li key={`entry-${k}`}><strong>{k}</strong> => {this.parseValue(obj[k])}</li>
          );
        } ) }
      </ul>
    );
  }

  render(){
    var volume = _.get(this.props, "volume-info.results.basic"),
      volumeDetails = _.get(this.props, "volume-info.results.meta"),
      socketOpen = _.get(this.props,"args.socketOpen") || false,
      output = _.get(this.props, "args.output"),
      backupStarted = _.get(this.props, "args.backupStarted") || false,
      self = this;

    var keysUsed = [];

    return (
      <div className="Volume">
        <h1>Volume {this.getId()}</h1>
        <p>This page container information about a specific Volume, and provides simple actions to manage the Volume.</p>
        <p>
          <span className={`toggler danger${(socketOpen === true ? " checked" : "")}`}> 
            Connection Open
          </span><br />
          <em>This page uses WebSockets to stream the output of the build process to this page.  If the indicator above is red, there is no connection.</em><br />
          { backupStarted ? (
            <span className={`toggler danger${(backupStarted === true ? " checked" : "")}`}> 
              Backup Started
            </span>
          ) : null }
        </p>
        <ul>
          <li>
            <a href="void" className="text-danger" onClick={this.handleDeleteClick.bind(this)}>
              Delete Volume
            </a>
          </li>
          { !backupStarted  ? (
            <li>
              <a href="void" onClick={this.handleBackupClick.bind(this)}>
                Create Backup
              </a>
            </li>
          ) : null }
        </ul>
        <div className="row">
          <div className="col-6">
            <table className="border">
              <thead>
                <tr>
                  <th>
                    Name
                  </th>
                  <th>
                    Value 
                  </th>
                </tr>
              </thead>
              <tbody>
                { volume ? (
                  Object.keys(volume).map( (key, index) => {
                    keysUsed.push(key.toLowerCase());
                    return (
                      <tr key={`volume-basic-${key}-${index}`}>
                        <td>{key}</td><td>{this.parseValue(volume[key])}</td>
                      </tr>
                    );
                  } )
                ) : null }
                { volumeDetails ? (
                  Object.keys(volumeDetails).map( (key, index) => {
                    if ( keysUsed.indexOf(key.toLowerCase()) >= 0 ){
                      return null;
                    }
                    return (
                      <tr key={`volume-meta-${key}-${index}`}>
                        <td>{key}</td><td>{this.parseValue(volumeDetails[key])}</td>
                      </tr>
                    );
                  } )
                ) : null }
              </tbody>
            </table>
          </div>
        </div>
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

export default withApiWatch(Volume);
