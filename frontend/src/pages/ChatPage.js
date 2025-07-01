import React, { useContext } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import AppNavbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { AuthContext } from '../context/AuthContext';
import './ChatPage.css';

const ChatPage = () => {
  const { currentUser,loading } = useContext(AuthContext);

   // Show a spinner while AuthContext is loading
   if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Optional: handle case when currentUser is not set
  if (!currentUser) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <p>User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="chat-page-container">
      <AppNavbar />
      <div className="chat-content">
        <Container className="py-4 chat-container">
          <Row>
            <Col>
              <h2 className="mb-4">Welcome, {currentUser?.name || 'Student'}!</h2>
              <p className="lead mb-4">
                Ask any math question or practice with guided problems. I'm here to help you learn!
              </p>
            </Col>
          </Row>
          <Row>
            <Col>
              <Chatbot />
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default ChatPage;






