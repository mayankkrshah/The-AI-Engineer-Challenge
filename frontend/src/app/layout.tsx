'use client';

import React, { useState, useEffect } from "react";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  CssBaseline, 
  Container, 
  Menu, 
  MenuItem,
  Button,
  TextField,
  Divider,
  IconButton,
  Select,
  Slider,
  Tooltip,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import KeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getApiUrl } from '../utils/config';
import axios from 'axios';
import theme from './theme';
import { SessionProvider, useSessionContext } from './SessionContext';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Sidebar component that uses SessionContext
function Sidebar(props: { apiKey: string; setApiKey: React.Dispatch<React.SetStateAction<string>> }) {
  const {
    sessions,
    currentSessionId,
    handleSwitchSession,
    handleNewSession,
    handleDeleteSession
  } = useSessionContext();

  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.');
  const [selectedTemplate, setSelectedTemplate] = useState('General Assistant');
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const systemPromptTemplates = [
    { name: 'General Assistant', prompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.' },
    { name: 'Code Expert', prompt: 'You are an expert software developer. Provide detailed code explanations, debugging help, and best practices.' },
    { name: 'Creative Writer', prompt: 'You are a creative writer. Help with storytelling, content creation, and creative writing projects.' },
    { name: 'Academic Tutor', prompt: 'You are an academic tutor. Help explain complex concepts, provide educational guidance, and assist with learning.' },
    { name: 'Business Analyst', prompt: 'You are a business analyst. Help with data analysis, business strategy, and professional insights.' },
  ];

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try { 
        await axios.get(`${getApiUrl()}/health`); 
        setBackendHealthy(true); 
      } catch { 
        setBackendHealthy(false); 
      }
      setHealthChecked(true);
    };
    if (!healthChecked) checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [healthChecked]);

  const handleTemplateSelect = (templateName: string) => {
    const template = systemPromptTemplates.find(t => t.name === templateName);
    if (template) {
      setSystemPrompt(template.prompt);
      setSelectedTemplate(templateName);
    }
  };

  // General Assistant default prompt
  const generalAssistantPrompt = 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.';

  // On mount and when template changes, sync prompt if not custom
  useEffect(() => {
    if (selectedTemplate === 'General Assistant' && (systemPrompt === '' || systemPrompt === generalAssistantPrompt)) {
      setSystemPrompt(generalAssistantPrompt);
    }
  }, [selectedTemplate]);

  // When user types in the prompt, set template to Custom
  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    if (selectedTemplate !== '' && value !== generalAssistantPrompt) {
      setSelectedTemplate('');
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  useEffect(() => {
    if (settingsOpen) {
      const storedApiKey = sessionStorage.getItem('OPENAI_API_KEY') || '';
      props.setApiKey(storedApiKey);
    }
  }, [settingsOpen, props.setApiKey]);

  // Show modal on first load if no API key
  useEffect(() => {
    const storedApiKey = sessionStorage.getItem('OPENAI_API_KEY');
    if (!storedApiKey) {
      setSettingsOpen(true);
    }
  }, []);

  // Listen for API key cleared event (when key is invalid)
  useEffect(() => {
    const handleApiKeyCleared = () => {
      setSettingsOpen(true);
    };
    window.addEventListener('apiKeyCleared', handleApiKeyCleared);
    return () => window.removeEventListener('apiKeyCleared', handleApiKeyCleared);
  }, []);

  useEffect(() => {
    if (selectedTemplate === 'General Assistant') {
      setSystemPrompt('You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.');
    }
  }, [selectedTemplate]);

  return (
    <aside style={{
      width: 380,
      minWidth: 300,
      maxWidth: 420,
      background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      color: '#222',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      zIndex: 1,
      padding: 0,
      margin: 0,
    }}>
      {/* New Chat Button at the top */}
      <div style={{ padding: '1.2rem 1.2rem 0.5rem 1.2rem' }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleNewSession}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '12px 24px',
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }}
        >
          ✨ New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0 1.2rem 1.2rem 1.2rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.3) transparent'
      }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            style={{
              background: session.id === currentSessionId 
                ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(245, 158, 66, 0.2) 100%)'
                : 'transparent',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '8px',
              cursor: 'pointer',
              border: session.id === currentSessionId 
                ? '1px solid rgba(124, 58, 237, 0.3)'
                : '1px solid transparent',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
            onClick={() => handleSwitchSession(session.id)}
            onMouseEnter={() => setHoveredSession(session.id)}
            onMouseLeave={() => setHoveredSession(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: '#222',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {session.name}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(34,34,34,0.7)',
                  marginTop: '4px'
                }}>
                  {session.messages.length} messages
                </div>
              </div>
              {/* Show menu button only if more than one session */}
              {hoveredSession === session.id && sessions.length > 1 && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchorEl(e.currentTarget);
                      setMenuSessionId(session.id);
                    }}
                    style={{ 
                      color: 'rgba(34,34,34,0.7)',
                      padding: '4px'
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  {/* Menu for this session only */}
                  <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl) && menuSessionId === session.id}
                    onClose={() => setMenuAnchorEl(null)}
                    sx={{
                      '& .MuiPaper-root': {
                        backgroundColor: 'rgba(35, 37, 38, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                      },
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        if (menuSessionId) handleDeleteSession(menuSessionId);
                        setMenuAnchorEl(null);
                      }}
                      style={{ color: '#ff6b6b' }}
                    >
                      Delete Session
                    </MenuItem>
                  </Menu>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Settings Section */}
      <div style={{
        padding: '1.2rem',
        borderTop: '1px solid #b47ac7',
        background: 'linear-gradient(135deg, #a259c4 0%, #ffb347 100%)',
        boxShadow: '0 -2px 16px 0 rgba(162, 89, 196, 0.12)',
        borderBottomLeftRadius: '18px',
        borderBottomRightRadius: '18px',
        color: '#222',
        minHeight: '220px',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <KeyIcon fontSize="small" />
            API Key
          </div>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setSettingsOpen(true)}
            sx={{
              color: '#a259c4',
              borderColor: '#a259c4',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#ffb347',
                color: '#ffb347',
              }
            }}
          >
            ⚙️ Settings & API Key
          </Button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <SettingsSuggestIcon fontSize="small" />
            Model
          </div>
          <FormControl fullWidth size="small">
            <Select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              sx={{
                backgroundColor: '#fff',
                borderRadius: '4px',
                color: '#222',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#b47ac7',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ffb347',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#a259c4',
                },
              }}
            >
              <MenuItem value="gpt-4o-mini">GPT-4o Mini</MenuItem>
              <MenuItem value="gpt-4o">GPT-4o</MenuItem>
              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: '8px'
          }}>
            Temperature: {temperature}
          </div>
          <Slider
            value={temperature}
            onChange={(_, value) => setTemperature(value as number)}
            min={0}
            max={2}
            step={0.1}
            sx={{
              color: '#a259c4',
              '& .MuiSlider-thumb': {
                backgroundColor: '#fff',
                border: '2px solid #ffb347',
                borderRadius: '4px',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#ffb347',
                borderRadius: '4px',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#b47ac7',
                borderRadius: '4px',
              },
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: '8px'
          }}>
            System Prompt Template
          </div>
          <FormControl fullWidth size="small">
            <Select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              sx={{
                backgroundColor: '#fff',
                borderRadius: '4px',
                color: '#222',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#b47ac7',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ffb347',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#a259c4',
                },
              }}
            >
              <MenuItem value="">Custom</MenuItem>
              {systemPromptTemplates.map((template) => (
                <MenuItem key={template.name} value={template.name}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <TextField
          multiline
          rows={3}
          value={systemPrompt}
          onChange={(e) => handleSystemPromptChange(e.target.value)}
          placeholder="Enter custom system prompt..."
          size="small"
          fullWidth
          sx={{
            backgroundColor: '#fff',
            borderRadius: '4px',
            input: {
              color: '#222',
              '::placeholder': {
                color: '#888',
                opacity: 1,
              },
            },
            '& fieldset': {
              borderColor: '#b47ac7',
            },
            '&:hover fieldset': {
              borderColor: '#ffb347',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#a259c4',
            },
          }}
        />

        {!backendHealthy && (
          <div style={{
            marginTop: '1rem',
            padding: '8px 12px',
            backgroundColor: 'rgba(244, 67, 54, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: '#ffcdd2',
            fontSize: '0.8rem'
          }}>
            ⚠️ Backend connection failed
          </div>
        )}
      </div>

      {/* Settings Popup */}
      <Dialog 
        open={settingsOpen} 
        onClose={(event, reason) => {
          // Only allow closing if there's a valid API key
          if (props.apiKey.startsWith('sk-')) {
            handleSettingsClose();
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={!props.apiKey.startsWith('sk-')}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #a259c4 0%, #ffb347 100%)',
          color: '#fff',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          🚀 Welcome to AI Chat!
          {props.apiKey.startsWith('sk-') && (
            <IconButton
              onClick={handleSettingsClose}
              sx={{ color: '#fff' }}
              size="small"
            >
              ✕
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, color: '#222', fontWeight: 500 }}>
              To get started, you need an OpenAI API key.
            </Typography>
          </Box>
          
          <TextField
            type="password"
            label="OpenAI API Key"
            placeholder="sk-..."
            fullWidth
            size="small"
            value={props.apiKey}
            onChange={(e) => props.setApiKey(e.target.value)}
            sx={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#b47ac7',
                },
                '&:hover fieldset': {
                  borderColor: '#ffb347',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#a259c4',
                },
              },
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              if (props.apiKey.startsWith('sk-')) {
                sessionStorage.setItem('OPENAI_API_KEY', props.apiKey);
                window.dispatchEvent(new Event('apiKeyChanged'));
                handleSettingsClose();
              }
            }}
            variant="contained"
            disabled={!props.apiKey.startsWith('sk-')}
            sx={{
              background: 'linear-gradient(135deg, #a259c4 0%, #ffb347 100%)',
              color: '#fff',
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: '8px',
            }}
          >
            Start Chatting!
          </Button>
        </DialogActions>
      </Dialog>
    </aside>
  );
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedApiKey = sessionStorage.getItem('OPENAI_API_KEY');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <Script id="env-config" strategy="beforeInteractive">
          {`window.env = ${JSON.stringify({
            NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY
          })};`}
        </Script>
      </head>
      <body className={inter.className} style={{ background: 'linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)', minHeight: '100vh', minWidth: '100vw', margin: 0, padding: 0 }}>
        <ThemeProvider theme={theme}>
          <SessionProvider>
            <CssBaseline />
            <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
              <Sidebar apiKey={apiKey} setApiKey={setApiKey} />
              {/* Main Chat Area */}
              <main style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '0 0 0 24px',
                overflow: 'hidden'
              }}>
                {props.children}
              </main>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
