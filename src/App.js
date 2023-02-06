import React from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import Home from './Home.js';
import Header from './Header.js';
import Forecast from './Forecast.js';
import Resorts from './Resorts.js';

class App extends React.Component {

  render() {
    return (
      <>
        <Router>
          <Header />
          <Routes>

            <Route
              exact path="/"
              element={<Home />}
            >
            </Route>

            <Route
              exact path="/Forecast"
              element={<Forecast />}
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