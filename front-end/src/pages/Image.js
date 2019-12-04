import React from 'react';
import withApiWatch from '../components/withApiWatch';
import * as Actions from '../actions';
import Link from '../components/Link';
import _ from 'lodash';
import './Images.css';

class Image extends React.Component {
  getId(){
    return this.props.args.id;
  }

  componentDidMount(){
    this.props.addRepeatingApi(`image-${this.getId()}`, `image/inspect/${this.getId()}`);
    this.props.addApiWatchId(`image-${this.getId()}`);
    this.props.addApiWatchId(`run-img-command`);
  }

  toggleShowFullDetails(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var isShowFull = this.props.args.isShowFull === true ? false : true;
    Actions.setArg("isShowFull", isShowFull);
  }

  imageCommand(cmd){
    var self = this;
    return (e) => {
      e.preventDefault();
      var params = {
        method: "post"
      };
      if ( cmd === "force-rm" ){
        cmd = "rm";
        params.body = JSON.stringify({
          options: ["-f"]
        });
      }
      Actions.api("run-img-command", `image/${self.getId()}/perform/${cmd}`, params );
    };
  }

  render(){
    var image = this.props[`image-${this.getId()}`] || {},
      isLoading = _.get(this.props,`image-${this.getId()}.isLoading`) || false,
      isShowFull = this.props.args.isShowFull || false;
    if ( Array.isArray(image) ){
      image = image[0]
    }
    return (
      <div className='Image'>
        <h1>Image {this.props.args.id}</h1>
        <p>This page show the details and available actions for an Image</p>
        <h2>Details</h2>
        { isLoading && !image.Size ? (
          <p>Please wait while the image details is loaded</p>
        ) : null }
        <ul className="inline">
          <li>
            <Link to={`/container/run/${this.getId()}`}>
              Create a Container
            </Link>
          </li>
          <li>
            <a href="void" className="text-danger" onClick={this.imageCommand("rm")}>
              Delete Image
            </a>
          </li>
          <li>
            <a href="void" className="text-danger" onClick={this.imageCommand("force-rm")}>
              Force Delete Image
            </a>
          </li>
          <li>
            <a key="full-link" href="void" onClick={this.toggleShowFullDetails.bind(this)}>
              { isShowFull ? "Hide Raw Details" : "Show Raw Details" }
            </a> 
          </li>
        </ul>
        { !isShowFull ? (
          <table className="border">
            <thead>
              <tr>
                <th>
                  Name
                </th>
                <th>
                  Value 
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Author
                </td>
                <td>
                  {image.Author}
                </td>
              </tr>
              <tr>
                <td>
                  Architecture
                </td>
                <td>
                  {image.Architecture}
                </td>
              </tr>
              <tr>
                <td>
                  OS
                </td>
                <td>
                  {image.Os}
                </td>
              </tr>
              <tr>
                <td>
                  Size
                </td>
                <td>
                  {image.Size > 0 ? (
                    <ul className="no-bullets">
                      <li>
                        {(image.Size/1000000).toFixed(2)} MB
                      </li>
                      <li>
                        {(image.Size/1000000000).toFixed(2)} GB
                      </li>
                    </ul>
                  ) : null }
                </td>
              </tr>
              <tr>
                <td>
                  Tags
                </td>
                <td>
                  { image.RepoTags && image.RepoTags.length ? (
                    <ul className="no-bullets">
                      {image.RepoTags.map( (tag, index) => {
                        return (
                          <li key={`tag-${index}`}>{tag}</li>
                        );
                      } ) }
                    </ul>
                  ) : "None" }
                </td>
              </tr>
              <tr>
                <td>
                  Exposed Ports
                </td>
                <td>
                  { image.Config && image.Config.ExposedPorts ? (
                    <ul className="no-bullets">
                      { Object.keys(image.Config.ExposedPorts).map((key,index) => {
                        return (
                          <li key={`port-${key}`}>{key.replace(/(\d+).*/,"$1")}</li>
                        );
                      } ) }
                    </ul>
                  ) : "None" }
                </td>
              </tr>
              <tr>
                <td>
                  Environment Variables
                </td>
                <td>
                  { image.Config && image.Config.Env ? (
                    <ul className="no-bullets">
                      { image.Config.Env.map((key,index) => {
                        if ( key.match(/^PATH/) ){
                          return null;
                        }
                        return (
                          <li key={`port-${key}`}>{key.replace(/(\d+).*/,"$1")}</li>
                        );
                      } ) }
                    </ul>
                  ) : "None" }
                </td>
              </tr>
              <tr>
                <td>
                  Labels
                </td>
                <td>
                  { image.Config && image.Config.Labels ? (
                    <ul className="no-bullets">
                      { Object.keys(image.Config.Labels).map((key,index) => {
                        return (
                          <li key={`label-${key}`}><em>{key}</em> : "{image.Config.Labels[key]}"</li>
                        );
                      } ) }
                    </ul>
                  ) : "None" }
                </td>
              </tr>
            </tbody>
          </table>
        ) : null }
        { isShowFull === true ? [
          <pre key="details-dump">
            {JSON.stringify(image, null, 2)}
          </pre>
        ] : null }
      </div>
    );
  }
}

export default withApiWatch(Image);
