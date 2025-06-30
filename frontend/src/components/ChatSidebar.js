import React, { useState, useEffect, useContext } from 'react';
import { ListGroup, Button, Spinner, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ChatSidebar.css';

const ChatSidebar = ({ onSelectChat, onNewChat, onDeleteChat, onRenameChat, currentChatId }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [chatToRename, setChatToRename] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://math-assistant.onrender.com/chat_history');
      // Parse messages for each chat in the history
      const historyWithParsedMessages = response.data.map(chat => ({
        ...chat,
        messages: typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages,
      }));
      setChatHistory(historyWithParsedMessages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setShowDeleteModal(true);
  };

  const handleRenameClick = (e, chat) => {
    e.stopPropagation();
    setChatToRename(chat.id);
    setNewTitle(chat.title);
    setShowRenameModal(true);
  };

  const confirmDelete = async () => {
    if (onDeleteChat) {
      await onDeleteChat(chatToDelete);
      // After deletion, refresh the history
      fetchChatHistory(); 
    }
    setShowDeleteModal(false);
  };

  const confirmRename = async () => {
    try {
      const chatToUpdate = chatHistory.find(chat => chat.id === chatToRename);
      if (!chatToUpdate) return;

      const messagesPayload = typeof chatToUpdate.messages === 'string'
          ? JSON.parse(chatToUpdate.messages)
          : chatToUpdate.messages;

      await axios.put(`https://math-assistant.onrender.com/chat_history/${chatToRename}`, {
        title: newTitle,
        messages: messagesPayload
      });

      const updatedHistory = chatHistory.map(chat =>
        chat.id === chatToRename ? { ...chat, title: newTitle } : chat
      );
      setChatHistory(updatedHistory);

      if (onRenameChat) {
        onRenameChat(chatToRename, newTitle);
      }

      setShowRenameModal(false);
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const downloadChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      const chat = chatHistory.find(c => c.id === chatId);
      if (!chat) return;
      
      // Format the chat data for download
      const messages = chat.messages;
      let chatText = `# ${chat.title}\n`;
      chatText += `Date: ${new Date(chat.timestamp).toLocaleString()}\n\n`;
      
      messages.forEach(msg => {
        const sender = msg.sender === 'user' ? currentUser.name : 'Math Assistant';
        chatText += `${sender}: ${msg.text}\n\n`;
      });
      
      // Create and trigger download
      const blob = new Blob([chatText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.title.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      alert('Chat download started!');
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading chat:', error);
    }
  };

  const shareChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      const chat = chatHistory.find(c => c.id === chatId);
      if (!chat) return;
      
      // Create a shareable text
      const messages = chat.messages;
      let chatText = `# ${chat.title}\n`;
      chatText += `Date: ${new Date(chat.timestamp).toLocaleString()}\n\n`;
      
      messages.forEach(msg => {
        const sender = msg.sender === 'user' ? 'Me' : 'Math Assistant';
        chatText += `${sender}: ${msg.text}\n\n`;
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(chatText).then(() => {
        alert('Chat copied to clipboard!');
      });
    } catch (error) {
      console.error('Error sharing chat:', error);
    }
  };

  // Add this CSS to make sure the chat history items are properly styled
  const chatHistoryItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    marginBottom: '5px',
    borderRadius: '8px'
  };

  const chatActionsStyle = {
    display: 'flex'
  };

  return (
    <div className="chat-sidebar">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Chat History</h5>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={onNewChat}
        >
          <i className="bi bi-plus-lg me-1"></i> New Chat
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" /> Loading...
        </div>
      ) : chatHistory.length === 0 ? (
        <div className="text-center text-muted py-3">
          No chat history yet
        </div>
      ) : (
        <ListGroup>
          {chatHistory.map(chat => (
            <ListGroup.Item 
              key={chat.id}
              action
              active={currentChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              style={chatHistoryItemStyle}
              className="d-flex justify-content-between align-items-center"
            >
              <div className="text-truncate" style={{ maxWidth: '70%' }}>
                {chat.title || 'Untitled Chat'}
              </div>
              <div style={chatActionsStyle}>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 me-2 text-muted"
                  onClick={(e) => shareChat(e, chat.id)}
                  title="Share chat"
                >
                  <i className="bi bi-share"></i>
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 me-2 text-muted"
                  onClick={(e) => downloadChat(e, chat.id)}
                  title="Download chat"
                >
                  <i className="bi bi-download"></i>
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 me-2 text-muted"
                  onClick={(e) => handleRenameClick(e, chat)}
                  title="Rename chat"
                >
                  <i className="bi bi-pencil"></i>
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 text-muted"
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  title="Delete chat"
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this chat? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Rename Modal */}
      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rename Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New Title</Form.Label>
            <Form.Control 
              type="text" 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={confirmRename}
            disabled={!newTitle.trim()}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ChatSidebar;




