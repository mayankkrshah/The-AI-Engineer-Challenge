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
  Switch,
  Alert
} from '@mui/material';
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import KeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getApiUrl } from '../utils/config';
import axios from 'axios';
import theme from './theme';
import { SessionProvider, useSessionContext } from './SessionContext';
import { PDFSessionProvider, usePDFSession } from './PDFSessionContext';

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
    handleDeleteSession,
    systemPrompt,
    setSystemPrompt,
    selectedTemplate,
    setSelectedTemplate
  } = useSessionContext();

  const { pdfSessionId, setPdfSessionId, pdfUploadStatus, setPdfUploadStatus, pdfError, setPdfError } = usePDFSession();

  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const systemPromptTemplates = [
    { name: '🧑‍💼 General Assistant', prompt: 'You are a knowledgeable, helpful, and friendly AI assistant. Provide clear, accurate, and well-structured responses. Always be concise yet comprehensive, use examples when helpful, and maintain a warm, professional tone. If you\'re unsure about something, acknowledge the limitation and suggest alternatives.' },
    { name: '💻 Code Expert', prompt: 'You are an expert software developer with deep knowledge of multiple programming languages, frameworks, and best practices. Always provide: 1) Clear, well-commented code examples, 2) Explanations of the logic and approach, 3) Best practices and potential pitfalls, 4) Alternative solutions when applicable. Use proper code formatting and include error handling where relevant. Focus on writing maintainable, efficient, and secure code.' },
    { name: '✍️ Creative Writer', prompt: 'You are a creative writer and storyteller with expertise in various writing styles and genres. Help users develop compelling narratives, engaging content, and creative ideas. Provide constructive feedback, suggest improvements, and help with character development, plot structure, and writing techniques. Always maintain the user\'s voice while enhancing their creative vision. Be encouraging and supportive of their creative process.' },
    { name: '🎓 Academic Tutor', prompt: 'You are an experienced academic tutor who excels at breaking down complex concepts into understandable parts. Use the Socratic method when appropriate, provide step-by-step explanations, and encourage critical thinking. Always verify understanding before moving forward, use relevant examples, and connect concepts to real-world applications. Be patient, supportive, and adapt your teaching style to the learner\'s needs.' },
    { name: '🧠 Logic & Math Solver', prompt: 'You are a step-by-step reasoning engine specializing in logical thinking and mathematical problem-solving. Always: 1) Break down complex problems into smaller, manageable steps, 2) Show your work and reasoning process clearly, 3) Explain each step and why it\'s necessary, 4) Verify your solution and check for errors, 5) Consider alternative approaches when possible. Use clear notation, diagrams when helpful, and ensure your logic is sound and well-explained.' },
    { name: '🧾 Instruction Follower', prompt: 'You are a precise and reliable assistant that follows user instructions exactly as specified. Your core principles: 1) Execute instructions precisely without deviation or interpretation unless clarification is needed, 2) Ask for clarification if instructions are ambiguous, 3) Complete tasks thoroughly and completely, 4) Maintain consistency in approach and output format, 5) Confirm completion and provide clear deliverables. Be methodical, thorough, and dependable in all tasks.' },
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
    } else if (templateName === 'Custom') {
      setSystemPrompt('');
      setSelectedTemplate('Custom');
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

  // When user types in the prompt, keep the selected template but allow customization
  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    // Do NOT switch to Custom when editing the prompt
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

  // PDF upload handler
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPdfUploadStatus('uploading');
    setPdfError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', props.apiKey);
      const response = await axios.post(`${getApiUrl()}/upload_pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPdfSessionId(response.data.session_id);
      setPdfUploadStatus('success');
    } catch (err: any) {
      setPdfUploadStatus('error');
      setPdfError(err?.response?.data?.detail || 'PDF upload failed.');
    }
  };

  return (
    <aside style={{
      width: 380,
      minWidth: 300,
      maxWidth: 420,
      background: '#f7f8fa',
      color: '#222',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      zIndex: 1,
      padding: 0,
      margin: 0,
      borderRight: '1px solid #e5e7eb',
      boxShadow: '2px 0 8px 0 rgba(0,0,0,0.04)',
    }}>
      {/* New Chat Button at the top */}
      <div style={{ padding: '1.2rem 1.2rem 0.5rem 1.2rem' }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleNewSession}
          style={{
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '12px 24px',
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
        >
          New Chat
        </Button>
        {/* PDF Upload Button */}
        <label htmlFor="pdf-upload-input">
          <input
            id="pdf-upload-input"
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handlePdfUpload}
          />
          <Button
            variant="outlined"
            fullWidth
            component="span"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2, borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
            disabled={pdfUploadStatus === 'uploading'}
          >
            {pdfUploadStatus === 'uploading' ? 'Uploading PDF...' : 'Upload PDF'}
          </Button>
        </label>
        {pdfUploadStatus === 'success' && (
          <Alert severity="success" sx={{ mt: 1, borderRadius: '8px' }}>
            PDF uploaded! You can now chat with it.
          </Alert>
        )}
        {pdfUploadStatus === 'error' && pdfError && (
          <Alert severity="error" sx={{ mt: 1, borderRadius: '8px' }}>
            {pdfError}
          </Alert>
        )}
      </div>

      {/* Sessions List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0 1.2rem 1.2rem 1.2rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,0.08) transparent'
      }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            style={{
              background: session.id === currentSessionId 
                ? '#e8eaf0'
                : 'transparent',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '8px',
              cursor: 'pointer',
              border: session.id === currentSessionId 
                ? '1px solid #2563eb'
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
                  color: '#1a202c',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {session.name}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {session.messages.length} messages
                </div>
              </div>
              {/* Show menu button for all sessions (including the last one) */}
              {hoveredSession === session.id && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchorEl(e.currentTarget);
                      setMenuSessionId(session.id);
                    }}
                    style={{ 
                      color: '#6b7280',
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
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        color: '#222',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        if (menuSessionId) handleDeleteSession(menuSessionId);
                        setMenuAnchorEl(null);
                      }}
                      style={{ color: '#dc2626' }}
                      title={sessions.length === 1 ? "Delete this session and create a new fresh one" : "Delete this session"}
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
        borderTop: '1px solid #e5e7eb',
        background: '#f7f8fa',
        boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.04)',
        borderBottomLeftRadius: '18px',
        borderBottomRightRadius: '18px',
        color: '#374151',
        minHeight: '220px',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#111827',
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
              color: '#374151',
              borderColor: '#d1d5db',
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#9ca3af',
                color: '#111827',
                backgroundColor: '#f9fafb',
              }
            }}
          >
            ⚙️ Settings & API Key
          </Button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#111827',
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
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                color: '#374151',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9ca3af',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
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
            fontWeight: 600,
            color: '#111827',
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
              color: '#3b82f6',
              '& .MuiSlider-thumb': {
                backgroundColor: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: '4px',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#3b82f6',
                borderRadius: '4px',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
              },
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '8px'
          }}>
            System Prompt Template
          </div>
          <FormControl fullWidth size="small">
            <Select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                color: '#374151',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9ca3af',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },
              }}
            >
              {systemPromptTemplates.map((template) => (
                <MenuItem key={template.name} value={template.name}>
                  {template.name}
                </MenuItem>
              ))}
              <MenuItem value="Custom">
                ✏️ Custom
              </MenuItem>
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
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            input: {
              color: '#374151',
              '::placeholder': {
                color: '#9ca3af',
                opacity: 1,
              },
            },
            '& fieldset': {
              borderColor: '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: '#9ca3af',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
            },
          }}
        />

        {!backendHealthy && (
          <div style={{
            marginTop: '1rem',
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fecaca',
            color: '#dc2626',
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
            background: '#f7f8fa',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700,
          textAlign: 'center',
          background: '#f7f8fa',
          color: '#1a202c',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1.2rem',
        }}>
          Welcome to AI Chat
          {props.apiKey.startsWith('sk-') && (
            <IconButton
              onClick={handleSettingsClose}
              sx={{ color: '#6b7280' }}
              size="small"
            >
              ✕
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, color: '#374151', fontWeight: 500 }}>
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
                  borderColor: '#e5e7eb',
                },
                '&:hover fieldset': {
                  borderColor: '#2563eb',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#2563eb',
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
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              px: 3,
              py: 1,
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
              '&:hover': {
                background: '#1d4ed8',
              },
            }}
          >
            Start Chatting
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
      <body className={inter.className} style={{ 
        background: '#f7f8fa',
        minHeight: '100vh', 
        minWidth: '100vw', 
        margin: 0, 
        padding: 0 
      }}>
        <ThemeProvider theme={theme}>
          <SessionProvider>
            <PDFSessionProvider>
              <CssBaseline />
              <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
                <Sidebar apiKey={apiKey} setApiKey={setApiKey} />
                {/* Main Chat Area */}
                <main style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: '#fff',
                  borderRadius: '0 0 0 24px',
                  overflow: 'hidden',
                  boxShadow: 'none',
                }}>
                  {props.children}
                </main>
              </div>
            </PDFSessionProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
