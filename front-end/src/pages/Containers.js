import React from 'react';
import * as Actions from '../actions';
import Link from '../components/Link';
import withIPC from '../components/withIPC';
import './Containers.css';

class Containers extends React.Component {
  constructor(props){
    super(props);
    this.mounted = false;
    this.timer = null;
    this.removeContainerListener = null;
  }

  getType(){
    var type = this.props.args || {};
    type = type.type || "all";
    return type;
  }

  componentDidMount(){
    var self = this;
    this.mounted = true;
    this.fireMessage();
    this.timer = setInterval(() => {
      self.fireMessage();
    }, 1000);
    this.removeContainerListener = this.props.onMessage("containers-list", (e, args) => {
      Actions.mergeState("containers", args);
    } );
  }

  fireMessage(){
    this.props.sendMessage("process-action", {
      type: "containers-list",
      request: {
        type: this.getType()
      }
    } );
  }

  componentWillUnmount(){
    this.mounted = false;
    if ( this.removeContainerListener ){
      this.removeContainerListener();
    }
    if ( this.timer ){
      clearInterval(this.timer);
    }
  }

  componentDidUpdate(prevProps){
    var type = this.getType();
    if ( prevProps.args.type !== type ){
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
                  { Object.keys(first).map( (col) => <th key={col}>{col}</th> ) }
                </tr>
              </thead>
              <tbody>
              { containers.map ( (container, index) => {
                var total = 0,
                  emptyCount = 0;
                Object.keys(container).forEach( (con,i) => {
                  total++;
                  if ( !container[con] ){
                    emptyCount++;
                  }
                } );
                // Skip Empty row
                if ( total === emptyCount ){
                  return null;
                }
                return (
                  <tr key={`row-${index}`}>
                    { Object.keys(container).map( (con,i) => {
                      var v = container[con];
                      if ( con === "IMAGE" ){
                        v = <Link to={`/image/${v}`} className="no-style">{v}</Link>;
                      }
                      else if ( con === "CONTAINER ID" ){
                        v = <Link to={`/container/${v}`} className="no-style">{v}</Link>;
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
