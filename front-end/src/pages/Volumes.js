import React from 'react';
import _ from 'lodash';
import Link from '../components/Link';
import withApiWatch from '../components/withApiWatch';

class Volumes extends React.Component {
  componentDidMount(){
    this.props.addRepeatingApi("volumes", "volumes");
  }

  render(){
    var volumes = _.get(this.props, "volumes.output") || [];
    return (
      <div className='Images'>
        <h1>Images</h1>
        <p>This page lists the available images</p>
        <ul>
          <li>
            <Link to="/volume/create">
              Create new Image
            </Link>
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
