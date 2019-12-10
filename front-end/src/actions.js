var app = null;

export const setApp = (appInstance) => {
  app = appInstance;
};

export const setState = (state = {}) => {
  app.setState(state);
};

export const clearStateKey = (key) => {
  if ( app && app.state.hasOwnProperty(key) ){
    delete app.state[key];
    app.setState(app.state);
  }
};

export const setMessage = (message = "", messageType = "success") => {
  if ( typeof message === "string" && message.length ){
    app.setState({
      message,
      messageType
    });
  } 
  else if ( typeof message !== "string" ){
    console.error(`setErrorMessage only accepts strings.  A '${(typeof message)}' was provided`);
  }
  else {
    console.error("Trying to call setErrorMessage with an empty string");
  }
};

export const clearMessage = (e = null) => {
  if ( e && e.preventDefault ){
    e.preventDefault();
  }
  app.setState({
    message: null,
    messageType: "success"
  });
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
    view: "unknown", 
    args: { }
  };
  var loc = window.location.pathname;
  var matchFound = false;
  var matches = [
    // Matches Home Page /
    {
      r: /^\/$/,
      v: "home"
    },
    {
      r: /^\/image\/create$/,
      v: "image-create"
    },
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
    // Matches /volumes
    {
      r: /\/volumes\/?$/,
      v: "volumes"
    },
    // Matches /volume/:id
    {
      r: /\/volume\/(.*)/,
      v: "volume",
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

