import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name || !email || !message) {
      setError('Please fill in all fields');
      return;
    }
    
    // In a real app, you would send this data to your backend
    console.log({ name, email, message });
    
    // Show success message
    setSubmitted(true);
    setError('');
    
    // Reset form
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <>
      <AppNavbar />
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Body className="p-4">
                <h2 className="text-center mb-4">Contact Us</h2>
                
                {submitted && (
                  <Alert variant="success">
                    Thank you for your message! We'll get back to you soon.
                  </Alert>
                )}
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="name">
                    <Form.Label>Your Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="email">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="message">
                    <Form.Label>Message</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message"
                    />
                  </Form.Group>

                  <div className="d-grid">
                    <Button variant="primary" type="submit">
                      Send Message
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row className="mt-5">
          <Col md={4}>
            <Card className="h-100 text-center p-4">
              <Card.Body>
                <i className="bi bi-envelope" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                <h4 className="mt-3">Email</h4>
                <p>amitdiwakar946@gmail.com</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center p-4">
              <Card.Body>
                <i className="bi bi-telephone" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                <h4 className="mt-3">Phone</h4>
                <p>+91 6395490029</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center p-4">
              <Card.Body>
                <i className="bi bi-geo-alt" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                <h4 className="mt-3">Social Media</h4>
                <div className="d-flex justify-content-center gap-3 mt-2">
                  <a href="https://github.com/amitsitare" target="_blank" rel="noopener noreferrer" className="text-muted fs-5">
                    <i className="bi bi-github"></i>
                  </a>
                  <a href="https://www.linkedin.com/in/amit-diwakar-cse/" target="_blank" rel="noopener noreferrer" className="text-muted fs-5">
                    <i className="bi bi-linkedin"></i>
                  </a>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default Contact;
