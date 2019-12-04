import React from 'react';
import Link from '../components/Link';
import * as Actions from '../actions';

class Images extends React.Component {
  componentDidMount(){
    Actions.api("images", "images");
  }

  render(){
    var images = this.props.images || {};
    return (
      <div className='Images'>
        <h1>Images</h1>
        <p>This page lists the available images</p>

        { images && images.isLoading === true ? (
          <p>Loading...</p>
        ) : null }

        { images && images.output ? (
          <table className="border">
            <thead>
              <tr>
                <th>Image ID</th>
                <th>Repository</th>
                <th>Size</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              { images.output.map( (image, index) => {
                return (
                  <tr key={image['IMAGE ID']}>
                    <td>
                      <Link to={`/image/${image['IMAGE ID']}`}>{image['IMAGE ID']}</Link>
                    </td>
                    <td>
                      {image.REPOSITORY}
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

export default Images;
