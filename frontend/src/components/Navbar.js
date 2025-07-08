import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const AppNavbar = ({ onAdminClick }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Navbar expand="lg" className="shadow-sm" variant={darkMode ? 'dark' : 'light'}>
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          <span className="text-primary">Math</span>Assistant
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            {currentUser && <Nav.Link as={Link} to="/chat">Chat</Nav.Link>}
            <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
          </Nav>
          <Nav>
            <Button 
              variant={darkMode ? "outline-light" : "outline-dark"} 
              size="sm" 
              className="me-3"
              onClick={toggleDarkMode}
            >
              {darkMode ? <i className="bi bi-sun"></i> : <i className="bi bi-moon"></i>}
            </Button>
            <Button 
              variant="outline-warning" 
              size="sm" 
              className="me-3"
              onClick={onAdminClick}
            >
              <i className="bi bi-shield-lock"></i> Admin
            </Button>
            
            {currentUser ? (
              <>
                <span className="navbar-text me-3">
                  Hello, {currentUser.name}
                </span>
                <Button variant="outline-primary" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="primary" as={Link} to="/register">
                Register
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
