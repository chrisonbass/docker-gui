import React from 'react';
import withApiWatch from '../components/withApiWatch';
import withSocket from '../components/withSocket';
import * as Actions from '../actions';
import Link from '../components/Link';
import _ from 'lodash';
import './Images.css';

class Container extends React.Component {
  constructor(props){
    super(props);
    this.mounted = false;
    this.timer = null;
    this.stdout = null;
    if ( this.props.setSocketKey ){
      this.props.setSocketKey("container-create-directory-backup");
    }
  }

  getId(){
    return this.props.args.id;
  }

  componentDidMount(){
    this.mounted = true;
    var id = this.getId(),
      key = `container-${id}`;
    this.props.addApiWatchId(key);
    this.props.addApiWatchId("run-command");
    Actions.api(key, `container/inspect/${id}`);
    var self = this;
    this.timer = setInterval(() => {
      if ( self.props[key].isLoading === true ){
        return;
      }
      if ( self.props[key].error ){
        clearInterval(self.timer);
        self.timer = null;
        return;
      }
      Actions.api(key, `container/inspect/${id}`);
    }, 1000 );
  }

  componentWillUnmount(){
    this.mounted = false;
    if ( this.timer ){
      clearInterval(this.timer);
    }
    this.timer = null;
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
            this.props.sendMessage({
              sourceDirectory: path,
              containerId: this.getId(),
              volumeName: volName
            });
          }
        }
      } else {
        Actions.api("run-command", `container/${self.getId()}/perform/${cmd}`, {
          method: "post"
        } );
      }
    };
  }

  render(){
    var container = this.props[`container-${this.getId()}`] || {},
      isShowFull = this.props.args.isShowFull || false,
      isSocketOpen = _.get(this.props, "args.socketOpen");
    if ( Array.isArray(container) ){
      container = container[0];
    }
    var state = container.State ? container.State.Status : null,
      stateFieldList = [
        "Status","Running","Paused","Restarting","Dead"
      ],
      output = _.get(this.props, "args.output");
    return (
      <div className='Image'>
        <h1>Container {this.props.args.id}</h1>
        <p>This page show the details and available actions for a Container</p>
        <span className={`toggler danger${(isSocketOpen === true ? " checked" : "")}`}> 
          Connection Open
        </span><br />
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
        { output ? [
          <p key='blank'></p>,
          <pre 
            className="console" 
            key="console"
            ref={this.props.stdoutRef}
          >
            {output.join("")}
          </pre>
        ] : null }
      </div>
    );
  }
}

export default withSocket(withApiWatch(Container));
