import React from 'react';
import axios from 'axios';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import './Resorts.css';
import { Next } from 'react-bootstrap/esm/PageItem';

class Resorts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      resorts: [],
      validated: false,
      formName: '',
      formLat: '',
      formLon: '',
    }
  }

  componentDidMount() {
    this.getResorts();
  }

  handleNameInput = (event) => {
    event.preventDefault();
    this.setState({
      formName: event.target.value,
    })
  }

  handleLatInput = (event) => {
    event.preventDefault();
    this.setState({
      formLat: +event.target.value,
    })
  }

  handleLonInput = (event) => {
    event.preventDefault();
    this.setState({
      formLon: +event.target.value,
    })
  }

  handleAddResort = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (form.checkValidity() === true) {
      this.setState({
        validated: true,
      });
    } else {
      event.stopPropagation();
    }

    let validData = false;

    if (typeof (this.state.formName) === 'string' &&
      typeof (this.state.formLat) === 'number' &&
      typeof (this.state.formLon) === 'number') {
      validData = true;
    };

    // If form is incomplete, stop function here.
    if (validData === false) return false;

    let newResort = {
      name: this.state.formName,
      lat: this.state.formLat,
      lon: this.state.formLon,
    }

    try {
      let config = {
        method: 'POST',
        url: `${process.env.REACT_APP_SERVER}/resorts`,
        data: newResort,
      }

      await axios(config);

      this.getResorts();

    } catch (error) {
      console.log(error.message);
    }
  }

  handleUpdateResort = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (form.checkValidity() === true) {
      this.setState({
        validated: true,
      });
    } else {
      event.stopPropagation();
    }

    let validData = false;

    if (typeof (this.state.formName) === 'string' &&
      typeof (this.state.formLat) === 'number' &&
      typeof (this.state.formLon) === 'number') {
      validData = true;
    };

    // If form is incomplete, stop function here.
    if (validData === false) return false;

    let updatedResort = this.state.selectedResort;
    console.log(updatedResort);

    let newResort = {
      name: this.state.formName,
      lat: this.state.formLat,
      lon: this.state.formLon,
    }

    try {
      let config = {
        method: 'POST',
        url: `${process.env.REACT_APP_SERVER}/resorts`,
        data: newResort,
      }

      await axios(config);

      this.getResorts();

    } catch (error) {
      console.log(error.message);
    }
  }

  getResorts = async () => {
    try {
      let config = {
        method: 'GET',
        url: `${process.env.REACT_APP_SERVER}/resorts`,
      }

      let resortsArray = await axios(config);
      resortsArray = resortsArray.data;

      this.setState({
        resorts: resortsArray,
      })

    } catch (error) {
      console.log(error.message);
    }
  }

  deleteResort = async (resortName) => {
    try {
      let config = {
        method: 'DELETE',
        url: `${process.env.REACT_APP_SERVER}/resorts/${resortName}`,
      }

      await axios(config);

      this.getResorts();

    } catch (error) {
      console.log(error.message);
      Next(error);
    }
  }

  render() {
    return (
      <>
        <div className="router-body">

          <Form
            noValidate validated={this.state.validated}
            className='resort-form'>
            <Form.Label>Ski Resort Form</Form.Label>
            <Form.Group controlId="name">
              <Form.Control type='text' placeholder="Resort Name" required onChange={this.handleNameInput}></Form.Control>
              <Form.Control.Feedback type="invalid">Please enter in the Resort Name</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="lat">
              <Form.Control type='number' placeholder="Latitude" required onChange={this.handleLatInput}></Form.Control>
              <Form.Control.Feedback type="invalid">Please enter in the latitude</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="lon">
              <Form.Control type='number' placeholder="Longitude" required onChange={this.handleLonInput}></Form.Control>
              <Form.Control.Feedback type="invalid">Please enter in the longitude</Form.Control.Feedback>
            </Form.Group>
            <Button type='submit' id="submit-button" onClick={this.handleAddResort}>Add</Button>
          </Form>

          <Table bordered>
            <thead>
              <tr>
                <th>Resort Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {this.state.resorts.map((resort, index) => {
                return (
                  <tr key={index}>
                    <td>{resort.name}</td>
                    <td>{resort.lat}</td>
                    <td>{resort.lon}</td>
                    <td><Button type='submit' onClick={() => this.deleteResort(resort.name)}>Delete</Button></td>
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

export default Resorts;
