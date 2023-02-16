import React from 'react';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import './Forecast.css';

class Forecast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resorts: [],
      resortForecast: [],
    }
  }

  componentDidMount() {
    this.getResorts();
  }

  getResorts = async () => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/resorts`,
      }

      let data = await axios(config);
      data = data.data;

      data.sort((a,b) => a.name > b.name ? 1 : -1);

      this.setState({
        resorts: data,
      })


    } catch (error) {
      console.log(error.message);
    }
  }

  getForecast = async (resort) => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/weather/${resort}`,
      }

      let data = await axios(config);
      data = data.data;

      this.setState({
        resortForecast: data,
      })


    } catch (error) {
      console.log(error.message);
    }
  }

  handleResortSelect = async (event) => {
    event.preventDefault();
    this.getForecast(event.target.value);
  }


  render() {
    return (
      <>
        <div className="router-body">
          <Form.Control
            as='select'
            onChange={this.handleResortSelect}
          >
            <option>Select a Resort</option>
            {this.state.resorts.map((resort, index) => {
              return <option value={resort.name} key={index}>{resort.name}</option>
            })}
          </Form.Control>

          <Table bordered>
            <thead>
              <tr>
                <th>Resort Name</th>
                <th>Date</th>
                <th>Snow</th>
                <th>Precip Type</th>
                <th>Temp</th>
              </tr>
            </thead>
            <tbody>
              {this.state.resortForecast.map((forecast, index) => {
                return (
                  <tr key={index}>
                    <td>{forecast.resort}</td>
                    <td>{forecast.month}/{forecast.date}/{forecast.year} {forecast.dateTime}</td>
                    <td>{forecast.snow}"</td>
                    <td>{forecast.precipType}</td>
                    <td>{forecast.temp} °F</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div >
      </>
    );
  }
}

export default Forecast;
