import React from 'react';
import withIPC from '../components/withIPC';
import * as Actions from '../actions';
import _ from 'lodash';

class Volume extends React.Component {
  componentDidMount(){
    this.props.onMessage("volume-delete", (e, args) => {
      Actions.mergeState("volume-delete", args);
    } );
    this.props.onMessage("volume-info", (e, args) => {
      Actions.mergeState("volume-info", args);
    } );
    this.props.repeatMessage("process-action", {
      type: "volume-info",
      request: {
        name: this.getId()
      }
    } );
    this.props.sendMessage("process-action", {
      type: "volume-info",
      request: {
        name: this.getId(),
        firstRun: true
      }
    } );
  }

  getId(){
    return this.props.args.id;
  }

  handleBackupClick(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var name = this.getId();
    if ( name ){
      this.props.sendMessage("process-action",{
        type: "volume-create-backup",
        request: {
          name
        }
      });
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
    this.props.sendMessage("process-action", {
      type: "volume-delete",
      request: {
        volumeId: this.getId()
      }
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
      self = this;

    var keysUsed = [];

    return (
      <div className="Volume">
        <h1>Volume {this.getId()}</h1>
        <p>This page container information about a specific Volume, and provides simple actions to manage the Volume.</p>
        <ul>
          <li>
            <a href="void" className="text-danger" onClick={this.handleDeleteClick.bind(this)}>
              Delete Volume
            </a>
          </li>
          <li>
            <a href="void" onClick={this.handleBackupClick.bind(this)}>
              Create Backup
            </a>
          </li>
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
      </div>
    );
  }
};

export default withIPC(Volume);
