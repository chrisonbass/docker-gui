import React from 'react';
import * as Actions from '../actions';
import _ from 'lodash';

export default function(WrapperComponent, isBodyWrapper = true){
  return class extends React.Component {
    constructor(props){
      super(props);
      this.type = null;
      this.stdout = null;
      this.timer = null;
      this.repeats = [];
      this.listeners = [];
      this.mounted = false;
      this.callback = this._callback.bind(this);
    }

    componentDidMount(){
      this.mounted = true;
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
        this.sendMessage(r.msg, r.args);
      } );
    }

    _callback(e, args){
      var data = args;
      if ( data && ( data.data || data.error ) ){
        var output = _.get(this.props,"console");
        if ( Array.isArray(output) ){
          output = output.slice();
          var line = data.data || data.error;
          console.log("stdout: " + line);
          output.push(line);
          Actions.mergeState("console", output);
        }
      }
      setTimeout( () => {
        if ( this.stdout ){
          this.stdout.scrollTop = this.stdout.scrollHeight;
        }
      }, 100 );
    }

    sendMessage(msg, args = {}){
      window.electron.ipcRenderer.send(msg, args);
    }

    render(){
      var self = this;
      return (
        <WrapperComponent 
          stdoutRef={(r) => {
            if ( r ){
              self.stdout = r;
            }
          }}
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
