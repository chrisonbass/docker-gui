import React from 'react';
import * as Actions from '../actions';

export default function(WrapperComponent){
  return class extends React.Component {
    constructor(props){
      super(props);
      this.apiId = [];
    }

    componentDidUpdate(prevProps){
      if ( this.apiId ){
        var messages = [],
          type = "success",
          prev = prevProps.message || null;
        this.apiId.forEach( (id) => {
          var apiResults = this.props[id];
          if ( apiResults ){
            if ( apiResults.error ){
              messages.push(apiResults.error);
              type = "error";
            }
            else if ( apiResults.results ){
              var msg = "";
              if ( apiResults.command ){
                msg += `Successful Result\n`;
                msg += `Command:\n ${apiResults.command}`;
                msg += "\n\n";
              }
              msg += `Ouput:\n${apiResults.results}`;
              messages.push(msg);
            }
          }
        } );
        if ( messages && messages.length ){
          var msgJoined = messages.join("\n\n");
          if ( prev !== msgJoined ){
            Actions.setMessage(msgJoined, type);
          }
        }
      }
    }

    render(){
      var self = this;
      var add =  (id) => {
        if ( self.apiId.indexOf(id) < 0 ){
          self.apiId.push(id);
        }
      };
      return (
        <WrapperComponent 
          addApiWatchId={add}
          setApiWatchId={add}
          {...this.props}
        />
      );
    }
  }
};
