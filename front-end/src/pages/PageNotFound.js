import React from 'react';
import Link from '../components/Link';

export default function(props){
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>
        Return to the <Link to="/">Home page</Link>.
      </p>
    </div>
  );
};
