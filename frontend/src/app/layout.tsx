'use client';

import React, { useState, useEffect, useRef } from "react";
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
    setCurrentSessionPdf,
    clearCurrentSessionPdf,
  } = useSessionContext();

  const [model, setModel] = useState('gpt-4o-mini');
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  // Find current session's PDF info
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentPdf = currentSession?.pdf;

  // PDF upload handler (per-session)
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
      setCurrentSessionPdf({
        sessionId: response.data.session_id,
        filename: response.data.filename,
        chunkSize: response.data.chunk_size,
        chunkOverlap: response.data.chunk_overlap,
        numChunks: response.data.num_chunks,
      });
      setPdfUploadStatus('success');
    } catch (err: any) {
      setPdfUploadStatus('error');
      setPdfError(err?.response?.data?.detail || 'PDF upload failed.');
      clearCurrentSessionPdf();
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // PDF remove handler (per-session)
  const handleRemovePdf = async () => {
    if (!currentPdf?.sessionId) return;
    try {
      await axios.post(`${getApiUrl()}/remove_pdf`, null, { params: { session_id: currentPdf.sessionId } });
    } catch (err: any) {
      // Ignore error, always clear state
    } finally {
      clearCurrentSessionPdf();
      setPdfUploadStatus('idle');
      if (inputRef.current) inputRef.current.value = '';
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
            ref={inputRef}
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
        {/* Remove PDF Button (only show if current session has a PDF) */}
        {currentPdf && (
          <Button
            variant="outlined"
            color="error"
            fullWidth
            sx={{ mt: 1, borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
            onClick={handleRemovePdf}
          >
            Remove PDF
          </Button>
        )}
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
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
