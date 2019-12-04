import React from 'react';
import * as Actions from '../actions';
import Link from '../components/Link';
import './Containers.css';

class Containers extends React.Component {
  constructor(props){
    super(props);
    this.mounted = false;
    this.timer = null;
  }

  getType(){
    var type = this.props.args || {};
    type = type.type || "all";
    return type;
  }

  componentDidMount(){
    var type = this.getType();
    Actions.api("containers", `containers/show/${type}`);
    this.mounted = true;
    var self = this;
    this.timer = setInterval(() => {
      if ( !self.mounted ){
        clearInterval(self.timer);
        return;
      }
      Actions.api("containers", `containers/show/${self.getType()}`);
    }, 3000);
  }

  componentWillUnmount(){
    this.mounted = false;
    if ( this.timer ){
      clearInterval(this.timer);
    }
    this.timer = null;
  }

  componentDidUpdate(prevProps){
    var type = this.getType();
    if ( prevProps.args.type !== type ){
      Actions.api("containers", `containers/show/${type}`);
    }
  }

  render(){
    var args = this.props.args || {},
      containers = this.props.containers || [];
    if ( containers.output && containers.output.length ){
      containers = containers.output;
    }
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

export default Containers;
