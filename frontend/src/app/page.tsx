'use client';

import React, { useState, FormEvent, useEffect } from 'react';

// Supported file formats for display
const SUPPORTED_FORMATS = [
  'PDF', 'DOCX', 'DOC', 'TXT', 'MD', 'HTML',
  'XLSX', 'XLS', 'CSV', 'PPTX', 'PPT', 'JSON', 
  'YAML', 'XML', 'RTF', 'SOL', 'JS', 'TS', 
  'PY', 'RS', 'GO', 'CSS', 'SCSS'
];
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import axios, { AxiosError } from 'axios';
import { getApiUrl } from '../utils/config';
import Slider from '@mui/material/Slider';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ReactMarkdown from 'react-markdown';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import SummarizeIcon from '@mui/icons-material/Summarize';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HistoryIcon from '@mui/icons-material/History';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import KeyIcon from '@mui/icons-material/VpnKey';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { AppBar, Toolbar, CssBaseline, Container, Menu } from '@mui/material';
import { useSessionContext } from './SessionContext';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  id?: string;
  isError?: boolean;
  errorMessage?: string;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  pdf?: {
    filename?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    numChunks?: number;
  };
}

declare global {
  interface Window {
    env?: {
      NEXT_PUBLIC_OPENAI_API_KEY?: string;
    };
  }
}

function parseSessions(raw: any): { id: string; name: string; messages: Message[] }[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function ChatPage() {
  // Use SessionContext for all session/message management
  const {
    sessions,
    currentSessionId,
    addMessageToCurrentSession,
    updateMessageInCurrentSession,
    removeMessagesAfter,
    handleSwitchSession,
    handleNewSession,
    handleDeleteSession,
    genericPrompt
  } = useSessionContext();

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentPdf = currentSession?.pdf;

  // Local state for chat functionality
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const predefinedPrompts = [
    { label: 'Summarize', icon: <SummarizeIcon />, text: 'Summarize the above.' },
    { label: "Explain like I'm 5", icon: <LightbulbIcon />, text: "Explain the above like I'm 5." },
    { label: 'Correct grammar', icon: <SpellcheckIcon />, text: 'Correct the grammar in the above.' },
    { label: 'Make concise', icon: <EditNoteIcon />, text: 'Rewrite the above to be more concise.' },
  ];

  // On mount, load API key from sessionStorage and listen for changes
  useEffect(() => {
    const getKey = () => sessionStorage.getItem('OPENAI_API_KEY') || '';
    setApiKey(getKey());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'OPENAI_API_KEY') setApiKey(getKey());
    };
    const onApiKeyChanged = () => setApiKey(getKey());
    window.addEventListener('storage', onStorage);
    window.addEventListener('apiKeyChanged', onApiKeyChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('apiKeyChanged', onApiKeyChanged);
    };
  }, []);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${getApiUrl()}/health`);
        setBackendHealthy(true);
      } catch (error) {
        setBackendHealthy(false);
      }
      setHealthChecked(true);
    };

    if (!healthChecked) {
      checkHealth();
    }

    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [healthChecked]);

  // Handle sending a message
  const handleSend = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (!input.trim() || !apiKey.startsWith('sk-')) return;
    const userMessage = input.trim();
    setInput('');
    const messageId = Date.now().toString();
    addMessageToCurrentSession({ text: userMessage, sender: 'user', id: messageId });
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (currentPdf) {
                  // File chat mode
        response = await axios.post(`${getApiUrl()}/file_chat`, {
          session_id: currentPdf.sessionId,
          question: userMessage,
          api_key: apiKey,
          model,
        });
        addMessageToCurrentSession({ text: response.data, sender: 'bot', id: (Date.now() + 1).toString() });
      } else {
        // Normal chat mode
        const body: any = {
          system_prompt: genericPrompt,
          user_message: userMessage,
          model,
          temperature: 0.7,
        };
        body.api_key = apiKey;
        response = await axios.post(`${getApiUrl()}/chat`, body);
        addMessageToCurrentSession({ text: response.data, sender: 'bot', id: (Date.now() + 1).toString() });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error contacting backend.';
      setError(errorMsg);
      updateMessageInCurrentSession(messageId, { isError: true, errorMessage: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Handle message editing and regenerate AI response
  const handleEditMessage = async (messageId: string, newText: string) => {
    // 1. Update the user message
    updateMessageInCurrentSession(messageId, { text: newText });
    setEditingMessageId(null);
    setEditingText('');

    // 2. Remove all messages after this user message (including the bot response)
    removeMessagesAfter(messageId);

    // 3. Regenerate AI response for the edited message
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = sessionStorage.getItem('OPENAI_API_KEY') || '';
      if (!apiKey.startsWith('sk-')) throw new Error('Invalid API key');
      // Use the current systemPrompt, model, and temperature
      const body: any = {
        system_prompt: genericPrompt,
        user_message: newText,
        model,
        temperature: 0.7,
        api_key: apiKey,
      };
      const response = await axios.post(`${getApiUrl()}/chat`, body);
      addMessageToCurrentSession({ text: response.data, sender: 'bot', id: (Date.now() + 1).toString() });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Error contacting backend.';
      addMessageToCurrentSession({ 
        text: 'Sorry, there was an error processing your request.', 
        sender: 'bot', 
        id: (Date.now() + 1).toString(),
        isError: true,
        errorMessage: errorMsg
      });
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copying message text
  const handleCopyMessage = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(messageId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* File Chat Mode Header */}
      {currentPdf && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          background: '#f4f6fa',
          border: '1px solid #e0e7ef',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          mb: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#2563eb', fontWeight: 700, letterSpacing: 0.5 }}>
              File Chat Mode
            </Typography>
            <Typography variant="body2" sx={{ color: '#222', fontWeight: 500 }}>
              {currentPdf.filename && <span><b>File:</b> {currentPdf.filename} </span>}
              {typeof currentPdf.chunkSize === 'number' && typeof currentPdf.numChunks === 'number' && (
                <span style={{ marginLeft: 12, color: '#555' }}>
                  <b>Chunks:</b> {currentPdf.numChunks} (size: {currentPdf.chunkSize}, overlap: {currentPdf.chunkOverlap})
                </span>
              )}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', mt: 0.5, fontStyle: 'italic' }}>
              Supports {SUPPORTED_FORMATS.length} formats: {SUPPORTED_FORMATS.slice(0, 8).join(', ')}
              {SUPPORTED_FORMATS.length > 8 && `, +${SUPPORTED_FORMATS.length - 8} more`}
            </Typography>
          </Box>
        </Box>
      )}
      {/* Chat messages */}
      <Paper elevation={2} sx={{ flex: 1, mb: 0, p: 2, background: 'rgba(255,255,255,0.98)', borderRadius: 0, boxShadow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
        {/* Only the message list is scrollable */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="sidebar-scroll">
          <List>
            {sessions.find(s => s.id === currentSessionId)?.messages.map((message, index) => (
              <Fade in timeout={400} key={message.id || index}>
                <ListItem sx={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                  <Box 
                    sx={{
                      textAlign: message.sender === 'user' ? 'right' : 'left',
                      background: message.isError 
                        ? 'linear-gradient(135deg, #ffebee 60%, #ffcdd2 100%)'
                        : message.sender === 'user'
                          ? 'linear-gradient(135deg, #e3f2fd 60%, #b3c6fc 100%)'
                          : 'linear-gradient(135deg, #f1f8e9 60%, #f9e7c4 100%)',
                      borderRadius: '16px',
                      padding: '12px 18px',
                      maxWidth: '70%',
                      width: 'fit-content',
                      boxShadow: '0 2px 12px #7C3AED22',
                      position: 'relative',
                      transition: 'background 0.3s',
                      fontSize: '1.08em',
                      fontFamily: 'Inter, Roboto, Arial, sans-serif',
                      border: message.isError ? '1px solid #f44336' : 'none',
                    }}
                    onMouseEnter={() => setHoveredMessageId(message.id || null)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {editingMessageId === message.id ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: '70%', width: '100%' }}>
                        <TextField
                          multiline
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{ width: '100%', maxWidth: '100%' }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={() => setEditingMessageId(null)}>
                            Cancel
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleEditMessage(message.id!, editingText)}>
                            Save
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <ReactMarkdown
                          components={{
                            code({node, className, children, ...props}) {
                              return (
                                <Box component="span" sx={{
                                  display: 'block',
                                  background: '#7C3AED',
                                  color: 'white',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5,
                                  fontFamily: 'Fira Mono, monospace',
                                  fontSize: '0.95em',
                                  my: 1,
                                  overflowX: 'auto',
                                }}>
                                  {children}
                                </Box>
                              );
                            },
                            li({children, ...props}) {
                              return <li style={{ color: '#F59E42', fontWeight: 600 }}>{children}</li>;
                            },
                          }}
                        >
                          {typeof message.text === 'string' ? message.text : JSON.stringify(message.text)}
                        </ReactMarkdown>
                        {message.isError && message.errorMessage && (
                          <Box sx={{ 
                            mt: 1, 
                            p: 1, 
                            backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                            borderRadius: 1,
                            border: '1px solid rgba(244, 67, 54, 0.3)',
                            fontSize: '0.8em',
                            color: '#d32f2f'
                          }}>
                            <strong>Error:</strong> {message.errorMessage}
                          </Box>
                        )}
                        
                        {/* Hover menu for user messages */}
                        {message.sender === 'user' && hoveredMessageId === message.id && (
                          <Box sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '4px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 10,
                            animation: 'fadeIn 0.2s ease-in-out',
                            '@keyframes fadeIn': {
                              '0%': { opacity: 0, transform: 'scale(0.9)' },
                              '100%': { opacity: 1, transform: 'scale(1)' }
                            }
                          }}>
                            <Tooltip title="Copy message">
                              <IconButton
                                size="small"
                                onClick={() => handleCopyMessage(message.text, message.id!)}
                                sx={{
                                  color: copySuccess === message.id ? '#4caf50' : '#666',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    background: 'rgba(76, 175, 80, 0.1)',
                                    color: '#4caf50'
                                  }
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit message">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingMessageId(message.id!);
                                  setEditingText(message.text);
                                }}
                                sx={{
                                  color: '#666',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    background: 'rgba(33, 150, 243, 0.1)',
                                    color: '#2196f3'
                                  }
                                }}
                              >
                                <EditNoteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        
                        {/* Copy success indicator */}
                        {copySuccess === message.id && (
                          <Box sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            background: '#4caf50',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            zIndex: 11,
                            animation: 'slideIn 0.3s ease-out',
                            '@keyframes slideIn': {
                              '0%': { opacity: 0, transform: 'translateY(-10px)' },
                              '100%': { opacity: 1, transform: 'translateY(0)' }
                            }
                          }}>
                            Copied!
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </ListItem>
              </Fade>
            ))}
            {isLoading && (
              <Fade in timeout={400}>
                <ListItem sx={{ justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                  <Box sx={{
                    background: 'linear-gradient(135deg, #f1f8e9 60%, #f9e7c4 100%)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    maxWidth: '70%',
                    width: 'fit-content',
                    boxShadow: '0 2px 12px #7C3AED22',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: '120px',
                  }}>
                    <CircularProgress size={16} sx={{ color: '#7C3AED' }} />
                    <Typography sx={{ color: '#333', fontWeight: 500, fontSize: '0.9em' }}>
                      Thinking...
                    </Typography>
                  </Box>
                </ListItem>
              </Fade>
            )}
          </List>
        </Box>
      </Paper>
      {/* Input box - always at the bottom */}
      <Box component="form" onSubmit={handleSend} sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 1.5, background: 'rgba(255,255,255,0.98)', borderRadius: 0, borderTop: '1px solid #ececec', boxShadow: 1, gap: 1, minHeight: 90 }}>
        <TextField
          label="Type your message"
          placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!backendHealthy || !apiKey.startsWith('sk-')}
          multiline
          rows={3}
          sx={{ background: !backendHealthy || !apiKey.startsWith('sk-') ? '#f8d7da' : 'white', borderRadius: 2, transition: 'background 0.3s', minHeight: 70 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {!backendHealthy || !apiKey.startsWith('sk-') && (
                  <Tooltip title="Enter your OpenAI API key in the sidebar to enable chat.">
                    <KeyIcon color="error" />
                  </Tooltip>
                )}
              </InputAdornment>
            )
          }}
          aria-label="Chat input"
        />
        <Button
          variant="contained"
          type="submit"
          color="primary"
          disabled={!backendHealthy || !apiKey.startsWith('sk-') || !input.trim()}
          sx={{ fontWeight: 700, borderRadius: 2, boxShadow: 2, minWidth: 80, height: 56 }}
          aria-label="Send message"
        >
          Send
        </Button>
      </Box>
      {!backendHealthy && (
        <Typography color="error" variant="caption" sx={{ mt: 1, ml: 1 }}>
          Backend is unreachable. Please ensure the backend server is running.
        </Typography>
      )}
      {!apiKey.startsWith('sk-') && (
        <Typography color="warning.main" variant="caption" sx={{ mt: 1, ml: 1 }}>
          Please enter a valid OpenAI API key in the sidebar to enable chat.
        </Typography>
      )}
    </Box>
  );
}
