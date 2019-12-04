import React from 'react';
import * as Actions from '../actions';

export default (props) => {
  const listener = (e) => {
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    window.history.pushState({}, props.title || "Page Change", props.to);
    if ( typeof props.onClick === "function" ){
      props.onClick();
    }
    Actions.setState(Actions.getInitialState());
  };
  return (
    <a href={props.to} onClick={listener} className={props.className || ""}>
      {props.children}
    </a>
  );
};
