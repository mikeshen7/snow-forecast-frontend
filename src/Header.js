import React from 'react';
import { Navbar, NavItem } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Header.css';

class Header extends React.Component {
  render() {
    return (
      <>
        <header>
          <Navbar collapseOnSelect expand="lg" bg="dark">
            <NavItem><Link to="/" className="nav-link">Home</Link></NavItem>
            <NavItem><Link to="/Forecast" className="nav-link">Forecast</Link></NavItem>
            <NavItem><Link to="/Resorts" className="nav-link">Resorts</Link></NavItem>
          </Navbar>
        </header>
      </>
    );
  }
}

export default Header;