import React from 'react';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import './Hourly.css';

class Hourly extends React.Component {
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
        url: `${process.env.REACT_APP_SERVER}/weather/${resort}`,
      }

      let data = await axios(config);
      data = data.data;

      data.sort((a, b) => a.key > b.key ? 1 : -1);

      let currentDate;

      data.forEach((forecast) => {
        currentDate = new Date(forecast.datetimeEpoch);
        forecast = {
          dayOfWeek: currentDate.getDay() + 1,
          date: currentDate.getDate(),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          hour: currentDate.getUTCHours() - 8,
          min: currentDate.getMinutes(),
        }
      });

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
                <th>Date Time Epoch</th>
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
                    <td>{forecast.dateTimeEpoch}</td>
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

export default Hourly;
