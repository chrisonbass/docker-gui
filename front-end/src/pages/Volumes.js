import React from 'react';
import _ from 'lodash';
import Link from '../components/Link';
import withApiWatch from '../components/withApiWatch';
import * as Actions from '../actions';

class Volumes extends React.Component {
  componentDidMount(){
    this.props.addRepeatingApi("volumes", "volumes");
    this.props.addApiWatchId("volume-create");
  }

  handleNewVolume(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var volumeName = window.prompt("Please enter a name for the Volume.");
    if ( volumeName ){
      Actions.api("volume-create", "volume/create", {
        method: "post",
        body: JSON.stringify({
          name: volumeName
        })
      } );
    }
  }

  render(){
    var volumes = _.get(this.props, "volumes.output") || [];
    return (
      <div className='Volumes'>
        <h1>Volumes</h1>
        <p>This page lists the available volumes.</p>
        <ul>
          <li>
            <a href="void" onClick={this.handleNewVolume.bind(this)}>
              Create new Volume
            </a>
          </li>
        </ul>
        { volumes && volumes.length ? (
          <table className="border">
            <thead>
              <tr>
                { Object.keys(volumes[0]).map( (col,i) => {
                  return (
                    <th key={`col-${col}`}>{col}</th>
                  );
                } ) }
              </tr>
            </thead>
            <tbody>
              { volumes.map( (vol, index) => {
                return (
                  <tr key={`vol-${index}`}>
                    { Object.keys(vol).map( (v,i) => {
                      var val = vol[v];
                      if ( v === "VOLUME NAME" ){
                        val = <Link to={`/volume/${vol[v]}`}>{vol[v]}</Link>;
                      }
                      return (
                        <td key={`vol-key-${v}`}>
                          {val}
                        </td>
                      );
                    } ) }
                  </tr>
                );
              } ) }
            </tbody>
          </table>
        ) : null }
      </div>
    );
  }
}

export default withApiWatch(Volumes);
