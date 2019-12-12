import React from 'react';
import * as Actions from '../actions';
import withApiWatch from '../components/withApiWatch';
import _ from 'lodash';

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
    if ( this.props[key] ){
      Actions.api(key, `image/inspect/${this.props.args.imageId}`);
    }
    Actions.api("volumes", "volumes");
  }
 
  handleForm(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var args = this.props.args || {},
      options = [],
      mounts = [],
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
    if ( args.mounts && args.mounts.length ){
      args.mounts.forEach( (vol) => {
        if ( vol.local && vol.remote ){
          mounts.push(vol);
        }
      } );
    }
    if ( args.volumes && args.volumes.length ){
      args.volumes.forEach( (vol) => {
        if ( vol.volumeId && vol.remote ){
          volumes.push(vol);
        }
      } );
    }
    Actions.api("container_run", `container/run/${this.props.args.imageId}`, {
      method: "post",
      body: JSON.stringify({
        options,
        mounts,
        volumes,
        additionalArgs: args.additionalArgs || "",
        ports: args.ports,
      })
    });
  }

  addBountMount(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var mounts = this.props.args.mounts || [];
    mounts.push({
      local: "",
      remote: ""
    });
    Actions.setArg("mounts", mounts);
  }

  addVolume(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    var volumes = this.props.args.volumes || [];
    volumes.push({
      volumeId: "",
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
          var match,
            i,
            mounts,
            argType;
          if ( name.match(/port_/) ){
            var ports = this.props.args.ports || {};
            ports[name.replace(/port_/,'')] = e.target.value;
            Actions.setArg("ports", ports);
          } 
          else if ( match = name.match(/(mounts|volumes)-(\d+)-(volumeId|local|remote)/) ){
            argType = match[1];
            i = match[2];
            var type = match[3];
            mounts = self.props.args[argType] || [];
            mounts = mounts.slice();
            if ( mounts[i] ){
              mounts[i][type] = e.target.value;
            }
            Actions.setArg(argType, mounts);
          }
          else if ( match = name.match(/remove-(volumes|mounts)-(\d+)/) ){
            e.preventDefault();
            argType = match[1];
            i = match[2];
            mounts = ( _.get(self.props,`args.${argType}`) || [] ).slice();
            mounts.splice(i,1);
            Actions.setArg(argType, mounts);
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
      mounts = args.mounts || [],
      volumes = args.volumes || [],
      availableVolumes = _.get(this.props, "volumes.output") || [];
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
          {/** ==================== BIND MOUNT MAPPING ==================== **/}
          <p>
            <strong>Volume Binding Mapping</strong> <em>(optional)</em><br />
            <em>Binds a local directory to a directory in the container.  Please use full paths</em>
          </p>
          <div className="row">
            <div className="col-6">
            { mounts.map( (vol,index) => {
              return (
                <div key={`vol-${index}`} className="flex-row flex-justify-between">
                  <div>
                    <input placeholder="local" value={vol.local} onChange={self.inputListener(`mounts-${index}-local`)} />
                  </div>
                  <span>=></span>
                  <div>
                    <input placeholder="container" value={vol.remote} onChange={self.inputListener(`mounts-${index}-remote`)} /> &nbsp;
                    <a href="void" onClick={this.inputListener(`remove-mounts-${index}`)} className="no-style text-danger">- Delete</a>
                  </div>
                </div>
              );
            } ) }
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <a href="void" onClick={this.addBountMount.bind(this)}>
                + Add a Local Mount
              </a>
            </div>
          </div>
          {/** ==================== VOLUME MAPPING ==================== **/}
          <p>
            <strong>Volume Mapping</strong> <em>(optional)</em><br />
            <em>Binds a docker volume to a directory in the container.  Please use full paths</em>
          </p>
          <div className="row">
            <div className="col-6">
            { volumes.map( (vol,index) => {
              return (
                <div key={`vol-${index}`} className="flex-row flex-justify-between">
                  <div>
                    <div className="flex-col">
                      <select value={vol.volumeId || ""} onChange={self.inputListener(`volumes-${index}-volumeId`)}>
                        <option>Select a Volume</option>
                        { availableVolumes.map( (vol, vi) => {
                          return (
                            <option key={vol['VOLUME NAME']}>{vol['VOLUME NAME']}</option>
                          );
                        } ) }
                      </select>
                    </div>
                  </div>
                  <span>=></span>
                  <div>
                    <input placeholder="container" value={vol.remote} onChange={self.inputListener(`volumes-${index}-remote`)} /> &nbsp;
                    <a href="void" onClick={this.inputListener(`remove-volumes-${index}`)} className="no-style text-danger">- Delete</a>
                  </div>
                </div>
              );
            } ) }
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <a href="void" onClick={this.addVolume.bind(this)}>
                + Add a Volume
              </a>
            </div>
          </div>
          {/** ==================== Additional Arguments ==================== **/}
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
