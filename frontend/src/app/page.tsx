'use client';

import React, { useState, FormEvent, useEffect } from 'react';
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
import { AppBar, Toolbar, CssBaseline, Container, Menu } from '@mui/material';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);

  const predefinedPrompts = [
    { label: 'Summarize', icon: <SummarizeIcon />, text: 'Summarize the above.' },
    { label: "Explain like I'm 5", icon: <LightbulbIcon />, text: "Explain the above like I'm 5." },
    { label: 'Correct grammar', icon: <SpellcheckIcon />, text: 'Correct the grammar in the above.' },
    { label: 'Make concise', icon: <EditNoteIcon />, text: 'Rewrite the above to be more concise.' },
  ];

  const systemPromptTemplates = [
    { 
      name: 'General Assistant', 
      prompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.' 
    },
    { 
      name: 'Code Expert', 
      prompt: 'You are an expert software developer. Provide detailed code explanations, debugging help, and best practices.' 
    },
    { 
      name: 'Creative Writer', 
      prompt: 'You are a creative writer. Help with storytelling, content creation, and creative writing projects.' 
    },
    { 
      name: 'Academic Tutor', 
      prompt: 'You are an academic tutor. Help explain complex concepts, provide educational guidance, and assist with learning.' 
    },
    { 
      name: 'Business Analyst', 
      prompt: 'You are a business analyst. Help with data analysis, business strategy, and professional insights.' 
    },
  ];

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const parsedSessions = parseSessions(savedSessions);
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        setCurrentSessionId(parsedSessions[0].id);
        setMessages(parsedSessions[0].messages);
      }
    } else {
      // Create initial session
      const initialSession = { 
        id: Date.now().toString(), 
        name: 'Session ' + new Date().toLocaleString(), 
        messages: [{ text: "Hello! How can I assist you today?", sender: 'bot' as 'bot' }] 
      };
      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
      setMessages(initialSession.messages);
    }
  }, []);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }
  }, [apiKey]);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Switch between sessions
  const handleSwitchSession = (id: string) => {
    setCurrentSessionId(id);
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
    }
  };

  // Start new session
  const handleNewSession = () => {
    const newId = Date.now().toString();
    const newSession = { id: newId, name: 'Session ' + new Date().toLocaleString(), messages: [{ text: "Hello! How can I assist you today?", sender: 'bot' as 'bot' }] };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
  };

  // Handle template selection
  const handleTemplateSelect = (templateName: string) => {
    const template = systemPromptTemplates.find(t => t.name === templateName);
    if (template) {
      setSystemPrompt(template.prompt);
      setSelectedTemplate(templateName);
    }
  };

  // Handle custom system prompt change
  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    setSelectedTemplate(''); // Clear template selection when user types custom prompt
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !apiKey || !backendHealthy) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    const newUserMessage: Message = { text: userMessage, sender: 'user' };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // Update current session
    const updatedSessions = sessions.map(session =>
      session.id === currentSessionId
        ? { ...session, messages: updatedMessages }
        : session
    );
    setSessions(updatedSessions);

    try {
      const response = await axios.post(`${getApiUrl()}/chat`, {
        system_prompt: systemPrompt,
        user_message: userMessage,
        model: model,
        api_key: apiKey
      });

      let botText = '';
      if (typeof response.data === 'string') {
        botText = response.data;
      } else if (response.data && typeof response.data.detail === 'string') {
        botText = response.data.detail;
      } else {
        botText = 'Sorry, there was an unexpected response from the server.';
      }
      const botMessage: Message = { text: botText, sender: 'bot' };
      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Update session with bot response
      const finalSessions = sessions.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: finalMessages }
          : session
      );
      setSessions(finalSessions);

    } catch (error: any) {
      let errorText = 'Sorry, there was an error processing your request. Please try again.';
      if (error.response && error.response.data && typeof error.response.data.detail === 'string') {
        errorText = error.response.data.detail;
      }
      const errorMessage: Message = { 
        text: errorText, 
        sender: 'bot' 
      };
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);

      // Update session with error message
      const errorSessions = sessions.map(session =>
        session.id === currentSessionId
          ? { ...session, messages: errorMessages }
          : session
      );
      setSessions(errorSessions);
    }
  };

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

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    setSessions(updatedSessions);
    
    // If we're deleting the current session, switch to the first available session
    if (sessionId === currentSessionId && updatedSessions.length > 0) {
      setCurrentSessionId(updatedSessions[0].id);
      setMessages(updatedSessions[0].messages);
    } else if (updatedSessions.length === 0) {
      // If no sessions left, create a new one
      handleNewSession();
    }
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat messages */}
      <Paper elevation={2} sx={{ flex: 1, mb: 0, p: 2, background: 'rgba(255,255,255,0.98)', borderRadius: 0, boxShadow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
        {/* Only the message list is scrollable */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="sidebar-scroll">
          <List>
            {messages.map((message, index) => (
              <Fade in timeout={400} key={index}>
                <ListItem sx={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                  <Box sx={{
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                    background: message.sender === 'user'
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
                  }}>
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
                  </Box>
                </ListItem>
              </Fade>
            ))}
          </List>
        </Box>
      </Paper>
      {/* Input box - always at the bottom */}
      <Box component="form" onSubmit={handleSend} sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 1, background: 'rgba(255,255,255,0.98)', borderRadius: 0, borderTop: '1px solid #ececec', boxShadow: 1, gap: 1 }}>
        <TextField
          label="Type your message"
          placeholder="Ask me anything..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!backendHealthy || !apiKey}
          sx={{ background: !backendHealthy || !apiKey ? '#f8d7da' : 'white', borderRadius: 2, transition: 'background 0.3s' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {!backendHealthy || !apiKey && (
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
          disabled={!backendHealthy || !apiKey || !input.trim()}
          sx={{ fontWeight: 700, borderRadius: 2, boxShadow: 2, minWidth: 80, height: 40 }}
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
    </Box>
  );
}
