import React, { useContext } from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram, Linkedin } from 'react-bootstrap-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import './Footer.css';

const Footer = () => {
  const { darkMode } = useContext(ThemeContext);
  const { currentUser } = useContext(AuthContext);

  return (
    <footer className={`footer py-5 ${darkMode ? 'footer-dark' : ''}`}>
      <Container>
        <Row>
          <Col md={4} className="mb-4 mb-md-0">
            <h5 className="footer-title">Math Learner</h5>
            <p className="text-muted">
              An AI-powered platform to help you instantly evaluate math problems, understand detailed solutions, and master new concepts.
            </p>
          </Col>
          <Col md={2} className="mb-4 mb-md-0">
            <h5 className="footer-title">Navigate</h5>
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/" className="text-muted">Home</Nav.Link>
              {currentUser ? (
                <>
                  <Nav.Link as={Link} to="/chat" className="text-muted">Chat</Nav.Link>
                  <Nav.Link as={Link} to="/contact" className="text-muted">Contact</Nav.Link>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login" className="text-muted">Login</Nav.Link>
                  <Nav.Link as={Link} to="/register" className="text-muted">Register</Nav.Link>
                  <Nav.Link as={Link} to="/contact" className="text-muted">Contact</Nav.Link>
                </>
              )}
            </Nav>
          </Col>
          <Col md={3} className="mb-4 mb-md-0">
            <h5 className="footer-title">Contact</h5>
            <ul className="list-unstyled text-muted">
              <li className="mb-2"><i className="bi bi-envelope-fill me-2"></i> amitdiwakar946@gmail.com</li>
              <li className="mb-2"><i className="bi bi-telephone-fill me-2"></i> +91 6395490029</li>
            </ul>
          </Col>
          <Col md={3}>
            <h5 className="footer-title">Follow Us</h5>
            <div className="d-flex gap-3">
              <a href="https://github.com/amitsitare" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="GitHub">
                <Github />
              </a>
              <a href="https://x.com/home?lang=en" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                <Twitter />
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                <Instagram />
              </a>
              <a href="https://www.linkedin.com/in/amit-diwakar-cse/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                <Linkedin />
              </a>
            </div>
          </Col>
        </Row>
        <hr className="my-4" />
        <Row>
          <Col className={`text-center ${darkMode ? 'text-light' : 'text-muted'}`}>
            <p>&copy; {new Date().getFullYear()} Math Learner. All Rights Reserved.</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;



