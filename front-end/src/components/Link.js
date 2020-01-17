import React from 'react';
import withIPC from './withIPC';
import * as Actions from '../actions';

var allowed = [
  "className", "style"
];
class Link extends React.Component {
  listener(e){
    var props = this.props;
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    if ( props.href ){
      this.props.sendMessage( "open-external", {
        href: props.href
      } );
    } else {
      window.history.pushState({}, props.title || "Page Change", props.to);
      if ( typeof props.onClick === "function" ){
        props.onClick();
      }
      Actions.setState(Actions.getInitialState());
    }
  }

  render() {
    var props = this.props,
      additional = {};

    allowed.forEach( (p) => {
      if ( props.hasOwnProperty(p) ){
        additional[p] = props[p];
      }
    } );

    return (
      <a href={props.to || props.href} onClick={this.listener.bind(this)} {...additional}>
        {props.children}
      </a>
    );
  }
};

export default withIPC(Link, false);
