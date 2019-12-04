import React from 'react';
import * as Actions from '../actions';
import withApiWatch from '../components/withApiWatch';

class ContainerRun extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      flag: false
    };
  }

  componentDidMount(){
    var key = `image-${this.props.args.imageId}`;
    this.props.addApiWatchId("container_run");
    this.props.addApiWatchId(key);
    if ( !this.props[key] ){
      Actions.api(key, `image/inspect/${this.props.args.imageId}`);
    }
  }
 
  handleForm(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var args = this.props.args || {},
      options = [],
      volumes = [];
    var map = {
      flagRm: "--rm",
      flagTty: "-t"
    };
    Object.keys(args).forEach( (key) => {
      if ( map.hasOwnProperty(key) ){
        var v = map[key].split(/\s/);
        options.push({
          key: v[0],
          value: v[1] || ""
        });
      }
    } );
    if ( args.name && args.name.length ){
      options.push({
        key: "--name",
        value: args.name
      });
    }
    if ( args.volumes && args.volumes.length ){
      args.volumes.forEach( (vol) => {
        if ( vol.local && vol.remote ){
          volumes.push(vol);
        }
      } );
    }
    Actions.api("container_run", `container/run/${this.props.args.imageId}`, {
      method: "post",
      body: JSON.stringify({
        options,
        volumes,
        additionalArgs: args.additionalArgs || "",
        ports: args.ports,
      })
    });
  }

  addVolume(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var volumes = this.props.args.volumes || [];
    volumes.push({
      local: "",
      remote: ""
    });
    Actions.setArg("volumes", volumes);
  }

  inputListener(name){
    var self = this;
    return (e) => {
      switch ( name ){
        case "flagRm":
          Actions.setArg("flagRm", self.props.args.flagRm ? false : true);
          self.setState({
            flag: !self.state.flag
          });
          break;

        case "flagTty":
          Actions.setArg("flagTty", self.props.args.flagTty === true ? false : true);
          break;

        default:
          var match;
          if ( name.match(/port_/) ){
            var ports = this.props.args.ports || {};
            ports[name.replace(/port_/,'')] = e.target.value;
            Actions.setArg("ports", ports);
          } 
          else if ( match = name.match(/volume-(\d+)-(local|remote)/) ){
            var i = match[1],
              type = match[2];
            var volumes = self.props.args.volumes || [];
            volumes = volumes.slice();
            if ( volumes[i] ){
              volumes[i][type] = e.target.value;
            }
            Actions.setArg("volumes", volumes);
          }
          else if ( match = name.match(/remove-volume-(\d+)/) ){
            e.preventDefault();
            var i = match[1];
            var volumes = self.props.args.volumes ? self.props.args.volumes.slice() : [];
            volumes.splice(i,1);
            Actions.setArg("volumes", volumes);
          }
          else {
            Actions.setArg(name, e.target.value);
          }
          break;
      }
    };
  }

  render(){
    var imageKey = `image-${this.props.args.imageId}`;
    var image = this.props[imageKey] || {},
      args = this.props.args,
      ports = args.ports || {},
      additionalArgs = args.additionalArgs || "",
      volumes = args.volumes || [];
    if ( Array.isArray(image) ){
      image = image[0];
    }
    var self = this;
    return (
      <div className="Container-run">
        <h1>Start a Container</h1>
        <p>From this page you can start a new container using the selected image.  Please customize the details below to set different options on the container.</p>
        <form onSubmit={this.handleForm.bind(this)}>
          <p>
            <strong>Name</strong> <em>(optional)</em><br />
            <em>Gives the container a name so you can easily run commands on the container.</em>
          </p>
          <div className="row">
            <div className="col-6">
              <div className="flex-col">
                <input value={args.name || ""} onChange={this.inputListener("name")} />
              </div>
            </div>
          </div>
          {/** ==================== FLAGS ==================== **/}
          <p><strong>Flags</strong></p>
          <div className="flex-col">
            <span>
              <label>
                <input type="checkbox" value={!!args.flagRm} onChange={this.inputListener("flagRm")} checked={args.flagRm ? true : false} /> Don't Persist
              </label>
              &nbsp;- <em>When the container is stopped, it is automatically removed, and can't be restarted.</em>
            </span>
            <span>
              <label>
                <input type="checkbox" value={!!args.flagTty} onChange={this.inputListener("flagTty")} checked={args.flagTty ? true : false} /> Prevent Exit
                &nbsp;- <em>Containers exit if a script isn't set to run at start, this flag prevents the container from exiting</em> 
              </label>
            </span>
          </div>
          {/** ==================== PORT MAPPING ==================== **/}
          <p>
            <strong>Port Mapping</strong> <em>(optional)</em><br />
            <em>If left empty, that port will not be exposed to localhost</em>
          </p>
          <div className="row">
            <div className="col-6">
                <div className="flex-row flex-justify-between">
                  <span>Local Port</span><span></span><span>Container Port</span>
                </div>
            { image.Config && image.Config.ExposedPorts ? ( 
              Object.keys(image.Config.ExposedPorts).map( (port) => {
                port = port.replace(/(\d+).*/,"$1");
                return (
                  <div key={`port-${port}`} className="flex-row flex-justify-between">
                    <div>
                      <input onChange={self.inputListener(`port_${port}`)} value={ports[port] || ""} />
                    </div>
                    <span>=></span>
                    <div>
                      <input readOnly value={port} />
                    </div>
                  </div>
                )
              } )
            ) : "No Exposed Ports" }
            </div>
          </div>
          {/** ==================== VOLUME MAPPING ==================== **/}
          <p>
            <strong>Volume Binding Mapping</strong> <em>(optional)</em><br />
            <em>Binds a local directory to a directory in the container.  Please use full paths</em>
          </p>
          <div className="row">
            <div className="col-6">
            { volumes.map( (vol,index) => {
              return (
                <div key={`vol-${index}`} className="flex-row flex-justify-between">
                  <div>
                    <input placeholder="local" value={vol.local} onChange={self.inputListener(`volume-${index}-local`)} />
                  </div>
                  <span>=></span>
                  <div>
                    <input placeholder="container" value={vol.remote} onChange={self.inputListener(`volume-${index}-remote`)} /> &nbsp;
                    <a href="#" onClick={this.inputListener(`remove-volume-${index}`)} className="no-style text-danger">- Delete</a>
                  </div>
                </div>
              );
            } ) }
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <a href="#" onClick={this.addVolume.bind(this)}>
                + Add a Volume
              </a>
            </div>
          </div>
          {/** ==================== VOLUME MAPPING ==================== **/}
          <p>
            <strong>Additional Arguments</strong><br />
            <em>Enter any other options/arguments to the command.</em>
          </p>
          <div className="row">
            <div className="col-6">
              <div className="flex-col">
                <input placeholder="docker run arguments" value={additionalArgs} onChange={self.inputListener(`additionalArgs`)} />
              </div>
            </div>
          </div>
          <p></p>
          <div className="row">
            <div className="col-6">
              <button type="submit">Start Container</button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default withApiWatch(ContainerRun);
