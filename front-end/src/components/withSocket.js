import React from 'react';
import * as Actions from '../actions';
import _ from 'lodash';

export default function(WrapperComponent){
  return class extends React.Component {
    constructor(props){
      super(props);
      this.type = null;
      this.stdout = null;

      var self = this;
      Actions.setArg("socketOpen", false);
      this.socket = new WebSocket("ws://localhost:8086");
      this.socket.onopen = () => {
        Actions.setArg("socketOpen", true);
      };
      this.socket.onclose = () => {
        Actions.setArg("socketOpen", false);
      };
      this.socket.onmessage = (msg) => {
        var data;
        try {
          data = JSON.parse(msg.data);
        } catch ( e ) {
          return;
        }
        if ( data && data.type === self.type ){
          if ( data && ( data.data || data.error ) ){
            var output = _.get(self.props,"args.output") || [];
            var line = data.data || data.error;
            if ( line.match(/^\(/) ){
              if ( output.length && output[output.length - 1].match(/^\(/) ){
                output[output - 1] = line;
              } else {
                output.push(line);
              }
            } else {
              output.push(line);
            }
            Actions.setArg("output", output);
          }
          if ( data && data.finished === true ){
            Actions.setArg("backupStarted", false);
          }
          setTimeout( () => {
            if ( self.stdout ){
              self.stdout.scrollTop = self.stdout.scrollHeight;
            }
          }, 100 );
        }
      };
    }

    sendMessage(msg){
      var message;
      var isOpen = _.get(this.props, "args.socketOpen");
      if ( typeof msg === "object" ){
        if ( !Array.isArray(msg) && !msg.type ){
          message = JSON.stringify(
            Object.assign( {}, {
              type: this.type
            }, msg )
          );
        } else {
          message = JSON.stringify(msg);
        }
      } else {
        message = "" + msg;
      }
      if ( message && isOpen ){
        this.socket.send(message);
      }
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
          sendMessage={this.sendMessage.bind(this)}
          setSocketKey={(key) => {
            self.type = key;
          }}
          {...this.props}
        />
      );
    }
  }
};
