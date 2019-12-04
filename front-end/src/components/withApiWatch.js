import React from 'react';
import * as Actions from '../actions';

export default function(WrapperComponent){
  return class extends React.Component {
    constructor(props){
      super(props);
      this.apiId = [];
      this.repeating = [];
      this.timer = null;
      this.mounted = false;
    }

    componentDidMount(){
      this.mounted = true;
      if ( this.repeating ){
        this.timer = setInterval(this.timerCallback.bind(this), 1500);
        this.timerCallback();
      }
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

    componentWillUnmount(){
      this.mounted = false;
      if ( this.timer ){
        clearInterval(this.timer);
        this.timer = null;
      }
      this.repeating.concat(this.apiId).forEach( (id) => {
        var c = id;
        if ( id && id.id ){
          c = id.id;
        }
        Actions.clearStateKey(c);
      } );
    }

    timerCallback(e){
      if ( !this.mounted ){
        if ( this.timer ){
          clearInterval(this.timer);
          this.timer = null;
        }
        return;
      }
      this.repeating.forEach( (item) => {
        Actions.api(item.id, item.endpoint, item.params);
      } );
    }

    render(){
      var self = this;
      var add =  (id) => {
        if ( self.apiId.indexOf(id) < 0 ){
          self.apiId.push(id);
        }
      };
      var repeat = (id, endpoint, params = {}) => {
        if ( self.mounted === true ){
          console.warn("`addRepeatingApi` must be called before `withApiWatch` is mounted")
          return;
        }
        var found = self.repeating.find( (item) => {
          return item.id === id;
        } );
        if ( !found ){
          self.repeating.push({
            id,
            endpoint,
            params,
            timer: null
          });
        }
      };
      return (
        <WrapperComponent 
          addRepeatingApi={repeat}
          addApiWatchId={add}
          setApiWatchId={add}
          {...this.props}
        />
      );
    }
  }
};
