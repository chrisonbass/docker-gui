import React from 'react';
import * as Actions from '../actions';
import Link from '../components/Link';
import withIPC from '../components/withIPC';
import './Containers.css';

var colKeys = [
  "CONTAINER ID",
  "NAMES",
  "STATUS",
  "PORTS",
  "CREATED",
  "IMAGE",
  "COMMAND"
];
class Containers extends React.Component {
  getType(){
    var type = this.props.args || {};
    type = type.type || "all";
    return type;
  }

  componentDidMount(){
    this.fireMessage();
    this.props.repeatMessage("process-action", () => ( {
      type: "containers-list",
      request: {
        type: this.getType()
      }
    } ) );
    this.props.onMessage("containers-list", (e, args) => {
      Actions.mergeState("containers", args);
    } );
  }

  fireMessage(){
    this.props.sendMessage("process-action", {
      type: "containers-list",
      request: {
        type: this.getType(),
        firstRun: true
      }
    } );
  }

  componentDidUpdate(prevProps){
    if ( prevProps.args.type !== this.getType() ){
      this.fireMessage();
    }
  }

  render(){
    var args = this.props.args || {},
      containers = this.props.containers || [];
    var first = containers.length ? containers[0] : null;
    return (
      <React.Fragment>
        <div className='Containers'>
          <h1>Containers</h1>
          <div className="Containers-options">
            <Link to={`/containers/show/${this.getType() === "all" ? "running" : "all"}`} className={`toggler${(args.type === "all" ? " checked" : "")}`}>
              Show All
            </Link>
          </div>
          { args.type === "all" ? (
            <p>This page is showing all containers.</p>
          ) : (
            <p>This page is showing only the running containers.</p>
          ) }
          { first ? (
            <table className="border">
              <thead>
                <tr>
                  { colKeys.map( (col) => <th key={col}>{col}</th> ) }
                </tr>
              </thead>
              <tbody>
              { containers.map ( (container, index) => {
                return (
                  <tr key={`row-${index}`}>
                    { colKeys.map( (con,i) => {
                      var v = container[con];
                      if ( con === "IMAGE" ){
                        v = <Link to={`/image/${v}`} className="no-style">{v}</Link>;
                      }
                      else if ( con === "CONTAINER ID" ){
                        var p = v;
                        if ( container['NAMES'] ){
                          p = container['NAMES'];
                        }
                        v = <Link to={`/container/${p}`} className="no-style">{v}</Link>;
                      }
                      else if ( con === "PORTS" && v.length ){
                        v = (
                          <ul>
                            { v.split(/,/).map( (line, lineI) => {
                              return (
                                <li key={`line-${lineI}`}>
                                  {line}
                                </li>
                              );
                            } ) }
                          </ul>
                        );
                      }
                      return (
                        <td key={`row-${i}`}>{v}</td> 
                      );
                    } ) }
                  </tr>
                );
              } ) }
              </tbody>
            </table>
          ) : null }
        </div>
      </React.Fragment>
    );
  }
}

export default withIPC(Containers);
