import React from 'react';
import * as Actions from '../actions';
import Link from '../components/Link';
import './Images.css';

class Container extends React.Component {
  constructor(props){
    super(props);
    this.mounted = false;
    this.timer = null;
  }

  getId(){
    return this.props.args.id;
  }

  componentDidMount(){
    this.mounted = true;
    var id = this.getId(),
      key = `container-${id}`;
    Actions.api(key, `container/inspect/${id}`);
    var self = this;
    this.timer = setInterval(() => {
      if ( self.props[key].isLoading === true ){
        return;
      }
      Actions.api(key, `container/inspect/${id}`);
    }, 3000 );
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
    return ((e) => {
      e.preventDefault();
      Actions.api("run-command", `container/${this.getId()}/perform/${cmd}`, {
        method: "post"
      } );
    }).bind(this);
  }

  render(){
    var container = this.props[`container-${this.getId()}`] || {},
      isShowFull = this.props.args.isShowFull || false;
    if ( Array.isArray(container) ){
      container = container[0];
    }
    var state = container.State ? container.State.Status : null;
    var stateFieldList = [
      "Status","Running","Paused","Restarting","Dead"
    ];
    return (
      <div className='Image'>
        <h1>Container {this.props.args.id}</h1>
        <p>This page show the details and available actions for a Container</p>
        <h2>Details</h2>
        <ul className="inline">
          { state === "running" ? [
            <li key="stop">
              <a href="#" onClick={this.containerCommand("stop")}>
                Stop
              </a>
            </li>,
            <li key="pause">
              <a href="#" onClick={this.containerCommand("pause")}>
                Pause
              </a>
            </li>,
            <li key="restart">
              <a href="#" onClick={this.containerCommand("restart")}>
                Restart
              </a>
            </li>
          ] : null }
          { state === "paused" ? (
            <li>
              <a href="#" onClick={this.containerCommand("unpause")}>
                Unpause
              </a>
            </li>
          ) : null }
          <li>
            <a key="full-link" href="#" onClick={this.toggleShowFullDetails.bind(this)}>
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

export default Container;
