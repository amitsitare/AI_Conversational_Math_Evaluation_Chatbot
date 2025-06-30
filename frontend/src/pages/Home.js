import React, { useContext, useState } from 'react';
import { Container, Row, Col, Button, Card, Modal, Form, Table, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BarChart, Cpu, Star } from 'react-bootstrap-icons';
import { ThemeContext } from '../context/ThemeContext';
import './Home.css';

const Home = () => {
  const { darkMode } = useContext(ThemeContext);

  // Admin modal state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [tableData, setTableData] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');

  // Open admin modal
  const handleAdminClick = () => {
    setShowAdmin(true);
    setAdminPassword('');
    setAdminError('');
    setTables([]);
    setTableData(null);
    setSelectedTable('');
  };

  // Fetch tables
  const fetchTables = async () => {
    setAdminLoading(true);
    setAdminError('');
    setTables([]);
    setTableData(null);
    setSelectedTable('');
    try {
      const res = await fetch('https://math-assistant.onrender.com/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setTables(data.tables);
      } else {
        setAdminError(data.error || 'Wrong password');
      }
    } catch (e) {
      setAdminError('Server error');
    }
    setAdminLoading(false);
  };

  // Fetch table data
  const fetchTableData = async (table) => {
    setAdminLoading(true);
    setAdminError('');
    setTableData(null);
    setSelectedTable(table);
    try {
      const res = await fetch('https://math-assistant.onrender.com/admin/table_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword, table })
      });
      const data = await res.json();
      if (res.ok) {
        setTableData(data);
      } else {
        setAdminError(data.error || 'Error fetching table data');
      }
    } catch (e) {
      setAdminError('Server error');
    }
    setAdminLoading(false);
  };

  return (
    <>
      <AppNavbar onAdminClick={handleAdminClick} />
      <div className="hero-section">
        <Container>
          <Row className="align-items-center py-5">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">Master Your Math Skills, Instantly</h1>
              <p className="lead mb-4">
                Our AI-powered platform provides instant, step-by-step evaluations for any math problem. Get the feedback you need to understand concepts, not just find answers.
              </p>
              <div className="d-grid gap-2 d-md-flex">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="px-4 me-md-2">Get Started for Free</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline-secondary" size="lg" className="px-4">Login</Button>
                </Link>
              </div>
            </Col>
            <Col lg={6} className="mt-5 mt-lg-0 text-center">
              <img 
                src="https://img.freepik.com/free-vector/calculator-concept-illustration_114360-1239.jpg?t=st=1719469557~exp=1719473157~hmac=62174a72d11925b43f9a941f6f1c7d242691456a297c588dd1c72f7c0062a4ac&w=740" 
                alt="Math Evaluation" 
                className="img-fluid rounded-3 hero-image"
                style={{ maxWidth: '450px' }}
              />
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <Container className="py-5">
        <Row>
          <Col className="text-center">
            <h2 className="fw-bold section-title">Why Choose Our Platform?</h2>
          </Col>
        </Row>
        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 shadow-sm feature-card">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <Cpu size={40} className="text-primary" />
                </div>
                <Card.Title as="h4" className="fw-bold">AI-Powered Evaluation</Card.Title>
                <Card.Text>
                  Submit any math question and get an instant, detailed, step-by-step solution from our advanced AI.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 shadow-sm feature-card">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <BarChart size={40} className="text-primary" />
                </div>
                <Card.Title as="h4" className="fw-bold">Identify Gaps</Card.Title>
                <Card.Text>
                  Our system analyzes your answers to pinpoint your strengths and weaknesses, helping you focus your studies.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 shadow-sm feature-card">
              <Card.Body className="text-center p-4">
                <div className="mb-3">
                  <Star size={40} className="text-primary" />
                </div>
                <Card.Title as="h4" className="fw-bold">Master Concepts</Card.Title>
                <Card.Text>
                  Go beyond right or wrong. Understand the 'how' and 'why' behind each problem to build lasting knowledge.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* CTA Section */}
      <div className={darkMode ? 'bg-dark text-light' : 'bg-light'}>
        <Container>
          <Row className="py-5">
            <Col className="text-center p-md-5">
              <h2 className="fw-bold mb-3">Ready to Excel in Math?</h2>
              <p className="lead mb-4">
                Join thousands of students improving their skills every day. Your next level of math mastery is just a click away.
              </p>
              <Link to="/register">
                <Button variant="primary" size="lg" className="px-5 py-3">Take Your First Assessment</Button>
              </Link>
            </Col>
          </Row>
        </Container>
      </div>
      <Footer />

      {/* Admin Modal */}
      <Modal show={showAdmin} onHide={() => setShowAdmin(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Admin Database Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Step 1: Password */}
          {tables.length === 0 && (
            <Form
              onSubmit={e => {
                e.preventDefault();
                fetchTables();
              }}
            >
              <Form.Group className="mb-3">
                <Form.Label>Enter Admin Password</Form.Label>
                <Form.Control
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  autoFocus
                />
              </Form.Group>
              {adminError && <Alert variant="danger">{adminError}</Alert>}
              <Button type="submit" variant="primary" disabled={adminLoading}>
                {adminLoading ? <Spinner size="sm" animation="border" /> : 'Show Tables'}
              </Button>
            </Form>
          )}
          {/* Step 2: Table List */}
          {tables.length > 0 && !tableData && (
            <>
              <h5>Database Tables</h5>
              <ul className="list-group mb-3">
                {tables.map(table => (
                  <li
                    key={table}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: 'pointer' }}
                    onClick={() => fetchTableData(table)}
                  >
                    {table}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={() => setTables([])}>
                Back
              </Button>
            </>
          )}
          {/* Step 3: Table Data */}
          {tableData && (
            <>
              <h5>Table: {selectedTable}</h5>
              <div className="table-responsive mb-3">
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      {tableData.columns.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, i) => (
                          <td key={i}>{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Button variant="secondary" onClick={() => setTableData(null)} className="me-2">
                Back to Tables
              </Button>
              <Button variant="danger" onClick={() => setShowAdmin(false)}>
                Close
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Home;
