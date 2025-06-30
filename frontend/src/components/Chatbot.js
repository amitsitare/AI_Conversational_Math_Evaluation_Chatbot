import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { Card, Form, Button, InputGroup, Modal, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ChatSidebar from './ChatSidebar';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState(null);
  const [topic, setTopic] = useState(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [difficultyLevel, setDifficultyLevel] = useState(1); // 1=easy, 2=medium, 3=hard
  const messagesEndRef = useRef(null);
  
  // New state for file upload and custom question modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCustomQuestionModal, setShowCustomQuestionModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // New state for chat history
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const { currentUser } = useContext(AuthContext);

  // Initialize welcome message with user's name if available
  useEffect(() => {
    setMessages([{ 
      text: `Hi ${currentUser?.name || 'there'}! I'm your Math Learning Assistant. What grade level are you studying?`, 
      sender: 'bot',
      options: ['Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
    }]);
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // New handlers for continuous chat session
  const saveChatSession = useCallback(async () => {
    try {
      // Only save if there are meaningful messages (more than just welcome)
      if (messages.length <= 1) return;

      // Generate session title based on first meaningful interaction
      let sessionTitle = chatTitle;
      if (sessionTitle === 'New Chat' && messages.length > 1) {
        // Find first user message to create title
        const firstUserMsg = messages.find(msg => msg.sender === 'user');
        if (firstUserMsg) {
          sessionTitle = `Chat Session - ${firstUserMsg.text.substring(0, 30)}${firstUserMsg.text.length > 30 ? '...' : ''}`;
        } else if (grade && topic) {
          sessionTitle = `${topic} - ${grade} Session`;
        } else if (grade) {
          sessionTitle = `${grade} Math Session`;
        } else {
          sessionTitle = `Math Session - ${new Date().toLocaleDateString()}`;
        }
        setChatTitle(sessionTitle);
      }

      const payload = {
        title: sessionTitle,
        messages: messages
      };

      // If we already have a chat ID, update the existing session
      if (currentChatId) {
        await axios.put(`https://math-assistant.onrender.com/chat_history/${currentChatId}`, payload);
      } else {
        // Create new session
        const response = await axios.post('https://math-assistant.onrender.com/chat_history', payload);
        setCurrentChatId(response.data.id);
      }
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }, [messages, chatTitle, grade, topic, currentChatId]);

  // Set up axios with auth token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Save session on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 1 && currentChatId) {
        const payload = {
          title: chatTitle,
          messages: messages
        };
        // Use sendBeacon for reliable saving on page unload.
        // It needs a Blob or FormData, so we stringify and create a Blob.
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(`https://math-assistant.onrender.com/chat_history/${currentChatId}`, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also save when component unmounts for in-app navigation
      if (messages.length > 1) {
        saveChatSession();
      }
    };
  }, [messages, currentChatId, chatTitle, saveChatSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (input.trim() === '') return;
    
    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Handle conversation flow
    if (!grade) {
      handleGradeSelection(input);
    } else if (!topic && !waitingForAnswer) {
      handleTopicSelection(input);
    } else if (waitingForAnswer) {
      handleAnswerSubmission(input);
    } else {
      // Direct question mode
      await handleDirectQuestion(input);
    }
    
    // Auto-save chat session after each message (continuous session)
    saveChatSession();
  };

  const handleGradeSelection = (selectedGrade) => {
    setGrade(selectedGrade);
    setChatTitle(`Math - ${selectedGrade}`);
    setMessages(prev => [...prev, {
      text: `Great! What math topic would you like to practice? (e.g., Algebra, Geometry, Calculus)`,
      sender: 'bot',
      options: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Arithmetic']
    }]);
  };

  const handleTopicSelection = (selectedTopic) => {
    setTopic(selectedTopic);
    setChatTitle(`${selectedTopic} - ${grade}`);
    setDifficultyLevel(1); // Always start at easy for new topic
    generateQuestion(selectedTopic, 1);
  };

  const generateQuestion = async (topicName, diffOverride) => {
    const diff = diffOverride || difficultyLevel;
    try {
      // Add a placeholder message that will be updated with streaming content
      const placeholderIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        text: `Generating a ${topicName} question for you...`,
        sender: 'bot'
      }]);

      // Start streaming response
      const response = await fetch('https://math-assistant.onrender.com/generate_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          grade,
          subject: 'Math',
          topic: topicName,
          difficultyLevel: diff
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate question');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      // Update the placeholder message to show streaming
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[placeholderIndex] = {
          text: '',
          sender: 'bot',
          streaming: true
        };
        return newMessages;
      });

      const processStreamChunk = (data, currentText) => {
        if (data.chunk) {
          const newText = currentText + data.chunk;
          // Update the message with accumulated text
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              text: newText,
              sender: 'bot',
              streaming: !data.done
            };
            return newMessages;
          });
          return newText;
        }
        // Handle completion without chunk (just done signal)
        if (data.done) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              ...newMessages[placeholderIndex],
              streaming: false
            };
            return newMessages;
          });
        }
        return currentText;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              streamedText = processStreamChunk(data, streamedText);
              if (data.done) {
                setCurrentQuestion(streamedText);
                setWaitingForAnswer(true);
                break;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }

      // Ensure streaming indicator is removed after completion
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[placeholderIndex]) {
          newMessages[placeholderIndex] = {
            ...newMessages[placeholderIndex],
            streaming: false
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Error generating question:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I had trouble generating a question. Please try again.',
        sender: 'bot'
      }]);
    }
  };

  const handleAnswerSubmission = async (answer) => {
    try {
      // Add a placeholder message that will be updated with streaming content
      const placeholderIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        text: 'Checking your answer...',
        sender: 'bot'
      }]);

      // Start streaming response
      const response = await fetch('https://math-assistant.onrender.com/answer_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question: currentQuestion,
          answer,
          grade,
          subject: 'Math',
          topic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check answer');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';
      let isCorrect = false;

      // Update the placeholder message to show streaming
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[placeholderIndex] = {
          text: '',
          sender: 'bot',
          streaming: true
        };
        return newMessages;
      });

      const processAnswerStreamChunk = (data, currentText) => {
        if (data.chunk) {
          const newText = currentText + data.chunk;
          // Check for correctness in the streamed text
          if (newText.toLowerCase().includes('correct!')) isCorrect = true;
          // Update the message with accumulated text
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              text: newText,
              sender: 'bot',
              streaming: !data.done,
              options: data.done ? ['Yes, another question', 'Try a different topic', 'No thanks'] : undefined
            };
            return newMessages;
          });
          return newText;
        }
        // Handle completion without chunk (just done signal)
        if (data.done) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              ...newMessages[placeholderIndex],
              streaming: false,
              options: ['Yes, another question', 'Try a different topic', 'No thanks']
            };
            return newMessages;
          });
        }
        return currentText;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              streamedText = processAnswerStreamChunk(data, streamedText);
              if (data.done) {
                setWaitingForAnswer(false);
                break;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }

      // Adjust difficulty and add motivational feedback, but do NOT auto-generate next question
      let newDifficulty = difficultyLevel;
      let feedbackMsg = '';
      if (isCorrect) {
        newDifficulty = Math.min(3, difficultyLevel + 1);
        if (newDifficulty > difficultyLevel) {
          feedbackMsg = "Great job! Let's try a slightly harder question next! 🚀";
        } else {
          feedbackMsg = "Awesome! Keep going!";
        }
      } else {
        newDifficulty = Math.max(1, difficultyLevel - 1);
        if (newDifficulty < difficultyLevel) {
          feedbackMsg = "That's okay! Let's try an easier one to build your confidence. 💪";
        } else {
          feedbackMsg = "Don't give up! Practice makes perfect.";
        }
      }
      setDifficultyLevel(newDifficulty);
      setMessages(prev => [...prev, { text: feedbackMsg, sender: 'bot' }]);
      // Do NOT auto-generate next question here

    } catch (error) {
      console.error('Error checking answer:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I had trouble checking your answer. Please try again.',
        sender: 'bot'
      }]);
      setWaitingForAnswer(false);
    }
  };

  const handleDirectQuestion = async (question) => {
    try {
      // Add a placeholder message that will be updated with streaming content
      const placeholderIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        text: 'Thinking...',
        sender: 'bot'
      }]);

      // Start streaming response
      const response = await fetch('https://math-assistant.onrender.com/direct_question_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question,
          grade,
          subject: 'Math',
          topic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to answer question');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      // Update the placeholder message to show streaming
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[placeholderIndex] = {
          text: '',
          sender: 'bot',
          streaming: true
        };
        return newMessages;
      });

      const processDirectStreamChunk = (data, currentText) => {
        if (data.chunk) {
          const newText = currentText + data.chunk;
          // Update the message with accumulated text
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              text: newText,
              sender: 'bot',
              streaming: !data.done
            };
            return newMessages;
          });
          return newText;
        }
        // Handle completion without chunk (just done signal)
        if (data.done) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[placeholderIndex] = {
              ...newMessages[placeholderIndex],
              streaming: false
            };
            return newMessages;
          });
        }
        return currentText;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              streamedText = processDirectStreamChunk(data, streamedText);
              if (data.done) {
                // Check if this is a redirection message and add topic options
                if (streamedText.includes("What math topic would you like to explore?") ||
                    streamedText.includes("Sorry Sir, this is not a math question")) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[placeholderIndex] = {
                      ...newMessages[placeholderIndex],
                      options: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Arithmetic']
                    };
                    return newMessages;
                  });
                }
                break;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }

      // Ensure streaming indicator is removed after completion
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[placeholderIndex]) {
          newMessages[placeholderIndex] = {
            ...newMessages[placeholderIndex],
            streaming: false
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Error answering question:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I had trouble answering your question. Please try again.',
        sender: 'bot'
      }]);
    }
  };

  // Use this function in the message options rendering
  const handleOptionClick = (option) => {
    if (option === 'Yes, another question') {
      // Use the latest difficultyLevel (already updated after last answer)
      generateQuestion(topic);
    } else if (option === 'Try a different topic') {
      setTopic(null);
      setMessages(prev => [...prev, {
        text: `What math topic would you like to practice next?`,
        sender: 'bot',
        options: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Arithmetic']
      }]);
    } else if (['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Arithmetic'].includes(option)) {
      // Handle topic selection from redirection or topic change
      if (!grade) {
        // If no grade is set, ask for grade first
        setMessages(prev => [...prev,
          { text: option, sender: 'user' },
          {
            text: `Great choice! What grade level are you studying?`,
            sender: 'bot',
            options: ['Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
          }
        ]);
        setTopic(option); // Store the selected topic
      } else {
        // If grade is already set, proceed with topic selection
        handleTopicSelection(option);
      }
    } else {
      setInput(option);
      handleSend();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // New handlers for file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadedFile) return;
    
    setIsUploading(true);
    setShowUploadModal(false);
    
    // Add a message showing the uploaded file
    setMessages(prev => [...prev, { 
      text: `Uploaded: ${uploadedFile.name}`, 
      sender: 'user' 
    }]);
    
    setMessages(prev => [...prev, { 
      text: 'Processing your uploaded question...', 
      sender: 'bot' 
    }]);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('grade', grade || 'Class 10'); // Default to Class 10 if not set
      formData.append('subject', 'Math');
      
      // Call the backend API to process the uploaded image
      const response = await axios.post('https://math-assistant.onrender.com/upload_question', formData);
      const answer = response.data.answer;
      
      setMessages(prev => [...prev, {
        text: answer,
        sender: 'bot'
      }]);
      setIsUploading(false);
      
      // Auto-save chat session after upload
      saveChatSession();
    } catch (error) {
      console.error('Error processing uploaded question:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I had trouble processing your uploaded question. Please try again.',
        sender: 'bot'
      }]);
      setIsUploading(false);
    }
    
    // Reset the file input
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler for custom question
  const handleCustomQuestionSubmit = () => {
    if (!customQuestion.trim()) return;
    
    setShowCustomQuestionModal(false);
    setInput(customQuestion);
    setCustomQuestion('');
    handleSend();
  };

  const handleCustomQuestionKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomQuestionSubmit();
    }
  };

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([{ 
      text: `Hi ${currentUser?.name || 'there'}! I'm your Math Learning Assistant. What grade level are you studying?`, 
      sender: 'bot',
      options: ['Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
    }]);
    setGrade(null);
    setTopic(null);
    setWaitingForAnswer(false);
    setCurrentQuestion(null);
    setChatTitle('New Chat');
  }, [currentUser]);

  const handleSelectChat = useCallback(async (chatId) => {
    try {
      const response = await axios.get(`https://math-assistant.onrender.com/chat_history/${chatId}`);
      const chat = response.data;
      
      const parsedMessages = typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages;
      
      setMessages(parsedMessages);
      setCurrentChatId(chatId);
      setChatTitle(chat.title || 'Chat Session');
      
      // Reset and infer state from loaded messages
      let loadedGrade = null;
      let loadedTopic = null;

      for (const message of parsedMessages) {
        if (message.sender === 'bot' && message.text.includes('Great! What math topic')) {
          const gradeMatch = parsedMessages.find(m => m.sender === 'user' && m.text.startsWith('Class'));
          if (gradeMatch) {
            loadedGrade = gradeMatch.text;
          }
        }
        if (message.sender === 'bot' && message.text.includes('Generating a')) {
          const topicMatch = parsedMessages.find(m => m.sender === 'user' && !m.text.startsWith('Class'));
           if (topicMatch) {
            loadedTopic = topicMatch.text;
          }
        }
      }
      
      setGrade(loadedGrade);
      setTopic(loadedTopic);
      setWaitingForAnswer(false);
      setCurrentQuestion(null);

    } catch (error) {
      console.error('Error loading chat history:', error);
      handleNewChat();
    }
  }, [handleNewChat]);

  // On initial load, fetch the most recent chat history or start a new chat.
  // This effect runs only once when the user logs in.
  useEffect(() => {
    const fetchMostRecentHistory = async () => {
      try {
        const response = await axios.get('https://math-assistant.onrender.com/chat_history');
        if (response.data && response.data.length > 0) {
          // Load the most recent chat
          handleSelectChat(response.data[0].id);
        } else {
          // No history, start a new chat
          handleNewChat();
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
        handleNewChat(); // Start new chat on error
      }
    };

    if (currentUser) {
      fetchMostRecentHistory();
    }
  }, [currentUser]); // IMPORTANT: Only re-run when the user logs in/out

  const handleDeleteChat = async (chatId) => {
    try {
      await axios.delete(`https://math-assistant.onrender.com/chat_history/${chatId}`);
      // If the deleted chat is the current chat, start a new chat
      if (chatId === currentChatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleRenameChat = (chatId, newTitle) => {
    if (chatId === currentChatId) {
      setChatTitle(newTitle);
    }
  };

  return (
    <>
      <Card className="shadow-sm chatbot-card">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <Button 
            variant="link" 
            className="text-white p-0 me-2" 
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <i className={`bi bi-${showSidebar ? 'x' : 'list'}`}></i>
          </Button>
          <h4 className="mb-0 flex-grow-1 text-center">🎓 Math Learning Assistant</h4>
          <Button 
            variant="link" 
            className="text-white p-0" 
            onClick={handleNewChat}
          >
            <i className="bi bi-plus-lg"></i>
          </Button>
        </Card.Header>
        
        <Card.Body className="p-0 d-flex flex-column">
          <Row className="g-0 h-100">
            {showSidebar && (
              <Col md={3} className="chat-sidebar-col">
                <ChatSidebar 
                  onSelectChat={handleSelectChat} 
                  onNewChat={handleNewChat}
                  onDeleteChat={handleDeleteChat}
                  onRenameChat={handleRenameChat}
                  currentChatId={currentChatId}
                />
              </Col>
            )}
            <Col md={showSidebar ? 9 : 12}>
              <div className="messages-area p-3 flex-grow-1 overflow-auto">
                {messages.map((message, index) => (
                  <div key={index} className={`mb-3 d-flex ${message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div 
                      className={`p-3 rounded-3 ${message.sender === 'user' 
                        ? 'bg-primary text-white' 
                        : 'bg-body-tertiary'}`}
                      style={{ maxWidth: '85%' }} /* Increased from 75% */
                    >
                      <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                        {message.text}
                        {message.streaming && (
                          <span className="typing-indicator">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                          </span>
                        )}
                      </div>
                      
                      {message.options && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {message.options.map((option, i) => (
                            <Button 
                              key={i} 
                              variant={message.sender === 'user' ? "light" : "outline-primary"} 
                              size="sm"
                              onClick={() => handleOptionClick(option)}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 border-top">
                <InputGroup>
                  <Form.Control
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button variant="primary" onClick={handleSend}>
                    <i className="bi bi-send"></i>
                  </Button>
                </InputGroup>
                
                {/* New buttons for upload and custom question */}
                <div className="d-flex justify-content-center gap-3 mt-2">
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setShowUploadModal(true)}
                    className="d-flex align-items-center"
                  >
                    <i className="bi bi-upload me-1"></i> Upload Question
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setShowCustomQuestionModal(true)}
                    className="d-flex align-items-center"
                  >
                    <i className="bi bi-pencil-square me-1"></i> Custom Question
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Upload Question Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Upload an image or text file of your math question.</p>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Choose file</Form.Label>
            <Form.Control 
              type="file" 
              accept="image/*,.pdf,.txt" 
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
          </Form.Group>
          <p className="text-muted small">
            Supported formats: JPG, PNG, PDF, TXT (max 5MB)
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUploadSubmit}
            disabled={!uploadedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Question Modal */}
      <Modal show={showCustomQuestionModal} onHide={() => setShowCustomQuestionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ask a Custom Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Enter your math question</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={4} 
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={handleCustomQuestionKeyDown}
              placeholder="E.g., How do I solve the quadratic equation x² + 5x + 6 = 0?"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomQuestionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCustomQuestionSubmit}
            disabled={!customQuestion.trim()}
          >
            Ask Question
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Chatbot;
