import React from 'react';
import _ from 'lodash';
import * as Actions from './actions';
import Volume from './pages/Volume';
import Volumes from './pages/Volumes';
import Images from './pages/Images';
import Image from './pages/Image';
import ImageCreate from './pages/ImageCreate';
import Container from './pages/Container';
import Containers from './pages/Containers';
import ContainerRun from './pages/ContainerRun';
import PageNotFound from './pages/PageNotFound';
import Home from './pages/Home';
import Link from './components/Link';
import './App.scss';

window.appActions = Actions;
window.appBasePath = window.location.pathname;

class App extends React.Component {
  constructor(props){
    super(props);
    /**
     * Create Global access reference to
     * Main App Wrapper Component */
    Actions.setApp(this);

    this.originalPopstateListener = window.onpopstate;

    /**
     * Main App State
     * Changes are managed through
     * Actions.js function calls
     */
    this.state = Actions.getInitialState();
  }

  handleHistoryEvent(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    Actions.setState(Actions.getInitialState());
  }

  componentDidMount(){
    window.onpopstate = this.handleHistoryEvent;
  }

  componentWillUnmount(){
    window.onpopstate = this.originalPopstateListener;
  }

  route(viewName){
    var ret = null;
    switch ( viewName ){
      // Containers List Page
      case "containers":
        ret = <Containers {...this.state} />;
        break;

      // Images List Page
      case "images":
        ret = <Images {...this.state} />;
        break;

      // Image Create Page
      case "image-create":
        ret = <ImageCreate {...this.state} />;
        break;

      // Image Summary Page
      case "image":
        ret = <Image {...this.state} />;
        break;

      // Start Container from Image Page
      case "container-run":
        ret = <ContainerRun {...this.state} />;
        break;

      // Container Summary Page
      case "container":
        ret = <Container {...this.state} />;
        break;
        
      // Volume Summary Page
      case "volume":
        ret = <Volume {...this.state} />;
        break;

      // Volumes List Page
      case "volumes":
        ret = <Volumes {...this.state} />;
        break;
        
      // Home Page
      case "home":
        ret = <Home />;
        break;

      default: 
        ret = <PageNotFound />;
        break;
    }
    return ret;
  }

  handleLoadSwitch(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    Actions.setState({
      isLoadArgs: !this.state.isLoadArgs
    });
  }

  toggleConsoleControl(e){
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    Actions.setAppSetting("consoleOpen", !_.get(this.state, "app.consoleOpen"));
  }

  render(){
    window.appState = this.state;
    var app = _.get(this.state, "app") || {};
    return (
      <div className="App">
        <header className="App-header">
          <ul className="App-nav">
            <li>
              <Link to={window.appBasePath}>Home</Link>
            </li>
            <li>
              <Link to="/containers/show/running">Containers</Link>
            </li>
            <li>
              <Link to="/images">Images</Link>
            </li>
            <li>
              <Link to="/volumes">Volumes</Link>
            </li>
          </ul>
          <p>
            <Link style={{color:"white",textDecoration: "none"}} href="https://github.com/chrisonbass/docker-gui">@ChrisOnBass</Link>
          </p>
        </header>

        <div className="App-body">
          <div>
            {/** =========== OUTPUT ERROR ============= **/}
            { this.state.message && ("" + this.state.message).length ? (
              <div className={`App-msg-${this.state.messageType === "success" ? "success" : "error"}`}>
                <a href="void" onClick={Actions.clearMessage} className="close">x</a>
                <pre>
                  {this.state.message}
                </pre>
              </div>
            ) : null }
            { this.route(this.state.view) }
            <p></p>
            <div className="App-footer">
              <div className="row">
                <div className="col-6" style={{textAlign:'left'}}>
                { this.state.isLoadArgs === true ? (
                  <div>
                    <strong>Please select the Args json file to load</strong><br />
                    <button onClick={this.handleLoadSwitch.bind(this)}>Show Current Args</button><br />
                    <input type="file" onChange={Actions.handleLoadArgs} />
                  </div>
                ) : (
                  <div className="args-section">
                    <strong>Current Page Args</strong><br />
                    <button onClick={Actions.outputArgs}>Save Args</button><span>&nbsp;</span>
                    <button onClick={this.handleLoadSwitch.bind(this)}>Load Args</button><br />
                    <pre>
                      { Actions.getArgsDisplay() }
                    </pre>
                  </div>
                ) }
                </div>
              </div>
            </div>
          </div>
          <div className="console" id="app-console">
            <a className={"toggle" + ( app.consoleOpen === false ? " closed" : "" )} href="javascript://void" onClick={this.toggleConsoleControl.bind(this)}>
              &lt;
            </a>
            { this.state.console && this.state.console.length ? (
              <pre>
                { this.state.console.join(" ") }
              </pre>
            ) : null } 
          </div>
        </div>

      </div>
    );
  }
}

export default App;
