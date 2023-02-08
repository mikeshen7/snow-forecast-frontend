import React from 'react';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import './Forecast.css';

class Forecast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resortForecast: [],
    }
  }

  componentDidMount() {
    this.getForecast();
  }

  getForecast = async () => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/weather/Crystal Mountain Resort`,
      }

      let data = await axios(config);
      data = data.data;
      data.sort((a,b) => (a.dateTimeEpoch > b.dateTimeEpoch) ? 1 : -1);

      this.setState({
        resortForecast: data,
      })


    } catch (error) {
      console.log(error.message);
    }
  }

  render() {
    return (
      <>
        <div className="router-body">
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
