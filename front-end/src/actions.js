var app = null;

export const setApp = (appInstance) => {
  app = appInstance;
};

export const setState = (state = {}) => {
  app.setState(state);
};

export const setArg = (name, value) => {
  var state =  Object.assign( {}, app.state, {
    args: Object.assign({}, app.state.args, {
      [name]: value
    } )
  } );
  app.setState(state);
};

export const navClickListener = (view, args = {}) => {
  return (e) => {
    if ( e && e.preventDefault ){
      e.preventDefault();
    }
    app.setState({
      view,
      args
    });
  };
};

export const api = (id, endpoint, params = {}) => {
  var state = app.state[id] || {};
  app.setState({
    [id]: Object.assign({}, state, {
      isLoading: true
    } )
  });
  fetch( "http://localhost:8085/" + endpoint, Object.assign({}, {
    method: "GET",
  }, params) )
  .then( (res) => {
    return res.json();
  } )
  .then( (json) => {
    if ( Array.isArray(json) && json.length === 1 ){
      json = json[0];
    }
    app.setState({
      [id]: json
    });
  } )
  .catch( (err) => {
    app.setState({
      [id]: {
        error: err
      }
    });
  } );
};

export const getInitialState = () => {
  var state = {
    view: "container", // container(s) | image(s) | image-build | container-run
    args: {
      type: "all"
    }
  };
  var loc = window.location.pathname;
  var matchFound = false;
  var matches = [
    // Matches /image/:id
    {
      r: /\/image\/(.*)/,
      v: "image",
      m: (match) => {
        return {
          id: match[1]
        };
      }
    },
    // Matches /images
    {
      r: /\/images/,
      v: "images"
    },
    // Matches /containers/show/:type
    {
      r: /\/containers\/show\/(.*)/,
      v: "containers",
      m: (match) => {
        return {
          type: match[1]
        };
      }
    },
    // Matches /container/run/:id
    {
      r: /\/container\/run\/(.*)/,
      v: "container-run",
      m: (match) => {
        return {
          imageId: match[1]
        };
      }
    },
    // Matches /container/:id
    {
      r: /\/container\/(.*)/,
      v: "container",
      m: (match) => {
        return {
          id: match[1]
        };
      }
    },

  ];
  matches.forEach( (check) => {
    if ( matchFound === true ){
      return;
    }
    var m = check.r.exec( loc );
    if ( m  ){
      if ( check.v ){
        state.view = check.v;
      }
      state.args = check.m ? check.m(m) : {};
      matchFound = true;
    }
  } );
  return state;
};

