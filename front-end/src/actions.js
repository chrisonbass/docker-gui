import _ from 'lodash';

var app = null;

export const hash = () => {
  var chars = "abcdef1234567890",
    str = "";
  while ( str.length < 10 ){
    str += chars[parseInt( Math.random() * chars.length, 10 )];
  }
  return str;
};

export const setApp = (appInstance) => {
  app = appInstance;
};

export const setState = (state = {}) => {
  app.setState(state);
};

export const getState = () => {
  return app.state;
};

export const mergeState = (key, state = {}) => {
  app.setState(Object.assign({}, app.state, {
    [key]: state
  }));
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

export const getArgsDisplay = () => {
  var args = Object.assign({}, ( _.get(app.state, "args") || {} ));
  if ( args.hasOwnProperty("socketOpen") ){
    delete args.socketOpen;
  }
  return JSON.stringify(args, null, 2);
};

export const outputArgs = (e) => {
  if ( e && e.preventDefault ){
    e.preventDefault();
  }
  var filename = window.prompt("Enter a filename", "args") || "args";
  if ( !filename.match(/\.json$/) ){
    filename += ".json";
  }
  var data = Object.assign({}, app.state.args);
  if ( data.hasOwnProperty('socketOpen') ){
    delete data.socketOpen;
  }
  data = JSON.stringify(data);
  var file = new Blob([data], {type: "json"});
  if (window.navigator.msSaveOrOpenBlob){ // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  }
  else { // Others
    var a = document.createElement("a"),
        url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);  
    }, 0); 
  }
};

export const handleLoadArgs = (e) => {
  var file = _.get(e, "target.files[0]");
  if (file) {
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      try {
        var json = JSON.parse(evt.target.result);
        var state = Object.assign({}, app.state);
        state.args = Object.assign({}, state.args, json);
        state.isLoadArgs = false;
        setState(state);
      } catch (e ){
        console.error(e);
        setState({isLoadArgs: false});
      }
    }
    reader.onerror = function (evt) {
      console.error(evt);
      setState({isLoadArgs: false});
    }
  }
};

export const getInitialState = () => {
  var state = {
    view: "home", 
    isLoadArgs: false,
    console: [],
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
      r: /\/image\/create$/,
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
    // Match /volume/create
    {
      r: /\/volume\/create$/,
      v: "volume-create"
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

