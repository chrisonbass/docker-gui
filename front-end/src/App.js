import React from 'react';
import * as Actions from './actions';
import Images from './pages/Images';
import Image from './pages/Image';
import Container from './pages/Container';
import Containers from './pages/Containers';
import ContainerRun from './pages/ContainerRun';
import PageNotFound from './pages/PageNotFound';
import Home from './pages/Home';
import Link from './components/Link';
import './App.css';

class App extends React.Component {
  constructor(props){
    super(props);
    /**
     * Create Global access reference to
     * Main App Wrapper Component
     */
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

  render(){
    return (
      <div className="App">
        <header className="App-header">
          <ul className="App-nav">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/containers/show/running">Containers</Link>
            </li>
            <li>
              <Link to="/images">Images</Link>
            </li>
          </ul>
          <p>
            <a style={{color:"white",textDecoration: "none"}} href="https://github.com/chrisonbass/docker-gui">@chrisonbass</a>
          </p>
        </header>
        {/** =========== OUTPUT ERROR ============= **/}
        { this.state.message && ("" + this.state.message).length ? (
          <div className={`App-msg-${this.state.messageType === "success" ? "success" : "error"}`}>
            <a href="#" onClick={Actions.clearMessage} className="close">x</a>
            <pre>
              {this.state.message}
            </pre>
          </div>
        ) : null }

        <div className="App-body">
          { this.route(this.state.view) }
        </div>
      </div>
    );
  }
}

export default App;