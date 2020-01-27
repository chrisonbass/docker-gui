import React from 'react';
import * as Actions from '../actions';
import _ from 'lodash';

var stdout = null;
export default function(WrapperComponent, isBodyWrapper = true){
  return class extends React.Component {
    constructor(props){
      super(props);
      this.type = null;
      this.timer = null;
      this.repeats = [];
      this.listeners = [];
      this.mounted = false;
      this.callback = this._callback.bind(this);
    }

    componentDidMount(){
      this.mounted = true;
      if ( stdout === null ){
        stdout = document.getElementById("app-console");
      }
      if ( isBodyWrapper === true ){
        window.electron.ipcRenderer.on('console', this.callback);
      }
    }

    componentWillUnmount(){
      if ( isBodyWrapper === true ){
        window.electron.ipcRenderer.removeListener('console', this.callback);
      }
      this.mounted = false;
      this.repeats = [];
      if ( this.timer ){
        clearInterval(this.timer);
      }
      if ( this.listeners && this.listeners.length ){
        this.listeners.forEach( (removeListener) => {
          if ( typeof removeListener === "function" ){
            removeListener();
          }
        } );
      }
    }

    handleRepeatMessage(msg, args){
      this.repeats.push({
        msg,
        args
      });
      if ( !this.timer ){
        this.timer = setInterval(this.handleRepeat.bind(this), 1500);
      }
    }

    handleRepeat(e){
      if ( !this.mounted ){
        return;
      }
      this.repeats.forEach( (r) => {
        var args = r.args;
        if ( typeof args === "function" ){
          args = args();
        }
        this.sendMessage(r.msg, args, true);
      } );
    }

    _callback(e, args){
      var data = args;
      if ( data && ( data.data || data.error ) ){
        var output = _.get(this.props,"console");
        if ( Array.isArray(output) ){
          output = output.slice();
          var line = data.data || data.error;
          output.push(line);
          Actions.mergeState("console", output);
        }
      }
      setTimeout( () => {
        if ( stdout ){
          stdout.scrollTop = stdout.scrollHeight;
        }
      }, 100 );
    }

    sendMessage(msg, args = {}, isRepeat = false){
      if ( isRepeat === false ){
        console.log("Sending Message: " + msg);
        console.log(args);
      }
      window.electron.ipcRenderer.send(msg, args);
    }

    render(){
      var self = this;
      return (
        <WrapperComponent 
          onMessage={(msg, callback) => {
            const cb = (e, args) => {
              if ( typeof callback === "function" ){
                callback(e, args);
              }
            };
            window.electron.ipcRenderer.on(msg, cb);
            this.listeners.push( () => {
              window.electron.ipcRenderer.removeListener(msg, cb);
            } );
          }}
          repeatMessage={this.handleRepeatMessage.bind(this)}
          sendMessage={this.sendMessage.bind(this)}
          {...this.props}
        />
      );
    }
  }
};
