import React from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import Home from './Home.js';
import Header from './Header.js';
import Hourly from './Hourly.js';
import Daily from './Daily.js';
import Resorts from './Resorts.js';
import axios from 'axios';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resorts: [],
    }
  }

  async componentDidMount() {
    await this.getResorts();
  }

  getResorts = async () => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/resorts`,
      }

      let data = await axios(config);
      data = data.data;

      data.sort((a, b) => a.name > b.name ? 1 : -1);

      this.setState({
        resorts: data,
      })

    } catch (error) {
      console.log(error.message, 'App.js getResorts');
    }
  }

  render() {
    return (
      <>
        <Router>
          <Header />
          <Routes>

            <Route
              exact path="/"
              element={<Home resorts={this.state.resorts}/>}
            >
            </Route>

            <Route
              exact path="/Hourly"
              element={<Hourly resorts={this.state.resorts}/>}
            >
            </Route>

            <Route
              exact path="/Daily"
              element={<Daily resorts={this.state.resorts}/>}
            >
            </Route>

            <Route
              exact path="/Resorts"
              element={<Resorts />}
            >
            </Route>

          </Routes>
        </Router>
      </>
    );
  }
}

export default App;