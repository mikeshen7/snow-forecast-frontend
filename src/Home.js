import React from 'react';

class Home extends React.Component {

  render() {

    return (
      <>
        <h1>home page</h1>
        {this.props.resorts.map((resort) => {
          return (
            <h2>{resort.name}</h2>
          )
        })}
      </>
    );
  }
}
export default Home;
