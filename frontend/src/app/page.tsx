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
import { useSessionContext } from './SessionContext';

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
  // Use SessionContext for all session/message management
  const {
    sessions,
    currentSessionId,
    addMessageToCurrentSession,
    handleSwitchSession,
    handleNewSession,
    handleDeleteSession
  } = useSessionContext();

  // Find the current session and its messages
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  // Local state for chat functionality
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !apiKey.startsWith('sk-')) return;
    const userMessage = input.trim();
    setInput('');
    addMessageToCurrentSession({ text: userMessage, sender: 'user' });
    setIsLoading(true);
    setError(null);
    try {
      // Build request body based on mode
      const body: any = {
        system_prompt: systemPrompt,
        user_message: userMessage,
        model,
      };
      body.api_key = apiKey;
      const response = await axios.post(`${getApiUrl()}/chat`, body);
      addMessageToCurrentSession({ text: response.data, sender: 'bot' });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error contacting backend.');
    } finally {
      setIsLoading(false);
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
      <Box component="form" onSubmit={handleSend} sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 1.5, background: 'rgba(255,255,255,0.98)', borderRadius: 0, borderTop: '1px solid #ececec', boxShadow: 1, gap: 1, minHeight: 90 }}>
        <TextField
          label="Type your message"
          placeholder="Ask me anything..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
