import React from 'react';
import withIPC from './withIPC';
import * as Actions from '../actions';
import './FileSelector.scss';

class FileSelector extends React.Component {
  constructor(props){
    super(props);
    this.input = null;
    this.id = Actions.hash();
    this.listeners = [];
    this.type = props.type === "file" ? "file" : "directory";
  }

  componentDidMount(){
    var self = this;
    this.listeners.push( this.props.onMessage(this.id, (e, args) => {
      if ( self.props.onChange ){
        self.props.onChange( args[this.type] );
      }
    } ) );
  }

  componentWillUnmount(){
    this.listeners.forEach( (listener) => {
      if ( typeof listener === "function" ){
        listener();
      }
    } );
  }

  handleSelect(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    this.props.sendMessage("process-action", {
      type: `pick-${this.type}`,
      request: {
        id: this.id
      }
    } );
  }

  render(){
    var self = this;
    return (
      <div className="file-selector">
        <button type="button" onClick={this.handleSelect.bind(this)}>
          Select
        </button>
        <div>
          <input readOnly value={this.props.value || ""} ref={(r) => { 
            if ( r ){
              self.input = r;
            }
          } } />
        </div>
      </div>
    );
  }
}

export default withIPC(FileSelector);
