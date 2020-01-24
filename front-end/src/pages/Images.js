import React from 'react';
import withIPC from '../components/withIPC';
import Link from '../components/Link';
import * as Actions from '../actions';

class Images extends React.Component {

  componentDidMount(){
    this.props.repeatMessage("process-action", {
      type: "image-list"
    } );
    this.props.sendMessage("process-action", {
      type: "image-list",
      request: {
        firstRun: true
      }
    } );
    this.props.onMessage("image-list", (e, args) => {
      console.log("Images update");
      Actions.mergeState("images", args);
    } );
  }

  render(){
    var images = this.props.images || [];
    return (
      <div className='Images'>
        <h1>Images</h1>
        <p>This page lists the available images</p>
        <ul>
          <li>
            <Link to="/image/create">
              Create new Image
            </Link>
          </li>
        </ul>
        { images && images ? (
          <table className="border">
            <thead>
              <tr>
                <th>Image ID</th>
                <th>Name</th>
                <th>Size</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              { images.map( (image, index) => {
                if ( !image['IMAGE ID'] ){
                  return null;
                }
                return (
                  <tr key={image['IMAGE ID']}>
                    <td>
                      <Link to={`/image/${image['IMAGE ID']}`}>{image['IMAGE ID']}</Link>
                    </td>
                    <td>
                      {image.REPOSITORY}:{image.TAG}
                    </td>
                    <td>
                      {image.SIZE}
                    </td>
                    <td>
                      {image.CREATED}
                    </td>
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

export default withIPC(Images);
