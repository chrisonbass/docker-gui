import React from 'react';
import * as Actions from './actions';
import Images from './pages/Images';
import Image from './pages/Image';
import Container from './pages/Container';
import Containers from './pages/Containers';
import ContainerRun from './pages/ContainerRun';
import Link from './components/Link';
import './App.css';

const onHistoryBackorForward = (e) => {
  Actions.setState(Actions.getInitialState());
};

class App extends React.Component {
  constructor(props){
    super(props);
    Actions.setApp(this);
    this.state = Actions.getInitialState();
  }

  componentDidMount(){
    window.onpopstate = onHistoryBackorForward;
  }

  componentWillUnmount(){
    window.onpopstate = () => {};
  }

  clearArgs(){
    this.setState({
      args: {}
    });
  }

  setArgs( args = {} ){
    this.setState({
      args
    });
  }

  render(){
    return (
      <div className="App">
        <header className="App-header">
          <p>
            <Link to="#" className="App-link" onClick={Actions.navClickListener("container")}>Docker GUI</Link>
          </p>
          <p>
            Mark Moss
          </p>
        </header>
        <ul className="App-nav">
          <li>
            <Link to="/containers/show/all">Containers</Link>
          </li>
          <li>
            <Link to="/images">Images</Link>
          </li>
        </ul>
        <div className="App-body">
          { this.state.view === "containers" ? (
            <Containers {...this.state} />
          ) : null }
          { this.state.view === "images" ? (
            <Images {...this.state} />
          ) : null }
          { this.state.view === "image" ? (
            <Image {...this.state} />
          ) : null }
          { this.state.view === "container-run" ? (
            <ContainerRun {...this.state} />
          ) : null }
          { this.state.view === "container" ? (
            <Container {...this.state} />
          ) : null }
        </div>
      </div>
    );
  }
}

export default App;
