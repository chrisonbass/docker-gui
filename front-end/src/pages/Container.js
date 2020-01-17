import React from 'react';
import withIPC from '../components/withIPC';
import * as Actions from '../actions';
import Link from '../components/Link';
import _ from 'lodash';
import './Images.css';

class Container extends React.Component {
  getId(){
    return this.props.args.id;
  }

  getKey(){
    return `container-${this.getId()}`;
  }

  componentDidMount(){
    var id = this.getId(),
      key = this.getKey();

    this.props.onMessage("container-inspect", (e, args) => {
      Actions.mergeState(key, args);
    } );
    this.props.repeatMessage("process-action", {
      type: "container-inspect",
      id
    } );
  }

  toggleShowFullDetails(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var isShowFull = this.props.args.isShowFull === true ? false : true;
    Actions.setArg("isShowFull", isShowFull);
  }

  containerCommand(cmd){
    var self = this;
    return (e) => {
      e.preventDefault();
      if ( cmd === "create-dir-backup" ){
        var path = window.prompt("Please enter the full path to the container's folder.","/app");
        if ( path ){
          var volName = window.prompt("Please enter a name for the volume.");
          if ( volName ){
            this.props.sendMessage("process-action", {
              type: "container-create-dir-backup", 
              request: {
                sourceDirectory: path,
                volumeName: volName,
                containerId: this.getId()
              }
            } );
          }
        }
      } else {
        this.props.sendMessage( "process-action", {
          type: "container-run-cmd", 
          request: {
            id: self.getId(),
            cmd
          }
        } );
      }
    };
  }

  render(){
    var container = _.get(this.props,this.getKey()) || {},
      isShowFull = _.get(this.props,"args.isShowFull") || false;
    if ( Array.isArray(container) ){
      container = container[0];
    }
    var state = container.State ? container.State.Status : null,
      stateFieldList = [
        "Status","Running","Paused","Restarting","Dead"
      ];
    return (
      <div className='Image'>
        <h1>Container {this.props.args.id}</h1>
        <p>This page show the details and available actions for a Container</p>
        <h2>Details</h2>
        <ul className="inline">
          { state === "exited" ? [
            <li key="start">
              <a href="void" onClick={this.containerCommand("start")}>
                Start
              </a>
            </li>,
            <li key="remove">
              <a href="void" className="text-danger" onClick={this.containerCommand("rm")}>
                Remove
              </a>
            </li>,
          ] : null } 
          { state === "running" ? [

            <li key="stop">
              <a href="void" onClick={this.containerCommand("stop")}>
                Stop
              </a>
            </li>,
            <li key="pause">
              <a href="void" onClick={this.containerCommand("pause")}>
                Pause
              </a>
            </li>,
            <li key="restart">
              <a href="void" onClick={this.containerCommand("restart")}>
                Restart
              </a>
            </li>,
            <li key="create-dir-backup">
              <a href="void" onClick={this.containerCommand("create-dir-backup")}>
                Create Volume from Container Directory
              </a>
            </li>
          ] : null }
          { state === "paused" ? (
            <li>
              <a href="void" onClick={this.containerCommand("unpause")}>
                Unpause
              </a>
            </li>
          ) : null }
          <li>
            <a key="full-link" href="void" onClick={this.toggleShowFullDetails.bind(this)}>
              { isShowFull ? "Hide Raw Details" : "Show Raw Details" }
            </a> 
          </li>
        </ul>
        { !isShowFull ? (
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
              { state === "running" ? (
                <tr>
                  <td>
                    Started At
                  </td>
                  <td>
                    {container.State.StartedAt}
                  </td>
                </tr>
              ) : null }
              { container.State ? (
              <tr>
                <td>
                  State
                </td>
                <td>
                  <ul>
                    { stateFieldList.map( (field) => {
                      return (
                        <li key={field}>
                          <strong>{field}</strong> : {"" + container.State[field]}
                        </li>
                      );
                    } ) }
                  </ul>
                </td>
              </tr>
              ) : null }
              { container.Config && container.Config.Image ? (
              <tr>
                <td>
                  Image
                </td>
                <td>
                  <Link to={`/image/${container.Config.Image}`}>{container.Config.Image}</Link>
                </td>
              </tr>
              ) : null }
            </tbody>
          </table>
        ) : null }
        { isShowFull === true ? [
          <pre key="details-dump">
            {JSON.stringify(container, null, 2)}
          </pre>
        ] : null }
      </div>
    );
  }
}

export default withIPC(Container);
