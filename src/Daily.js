import React from 'react';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import './Hourly.css';

class Daily extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resortForecast: [],
    }
  }

  componentDidMount() {
    console.log(this.props.resorts);
  }

  getForecast = async (resort) => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/dailyWeather/${resort}`,
      }

      let data = await axios(config);
      data = data.data;

      data.sort((a, b) => a.key > b.key ? 1 : -1);

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
            {this.props.resorts.map((resort, index) => {
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
                <th>Wind Speed</th>
                <th>Visibility</th>
                <th>Icon</th>
              </tr>
            </thead>
            <tbody>
              {this.state.resortForecast.map((forecast, index) => {
                return (
                  <tr key={index}>
                    <td>{forecast.resort}</td>
                    <td>{forecast.month}/{forecast.date}/{forecast.year} {forecast.dateTime} {forecast.time}</td>
                    <td>{forecast.snow.toFixed(1)}"</td>
                    <td>{forecast.precipType}</td>
                    <td>{forecast.temp.toFixed(1)} °F</td>
                    <td>{forecast.windspeed.toFixed(1)} mph</td>
                    <td>{forecast.visibility.toFixed(1)} miles</td>
                    <td>{forecast.icon}</td>
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

export default Daily;
