'use client';

import React, { useState, FormEvent } from 'react';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import axios, { AxiosError } from 'axios';
import { getApiUrl } from '../utils/config';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

declare global {
  interface Window {
    env?: {
      NEXT_PUBLIC_OPENAI_API_KEY?: string;
    };
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! How can I assist you today?", sender: "bot" }
  ]);
  const [input, setInput] = useState<string>('');

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (input.trim()) {
      const newMessage: Message = { text: input, sender: 'user' };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput('');

      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

        if (!apiKey) {
          throw new Error('OpenAI API key is not configured. Please check your environment variables in Vercel.');
        }

        const response = await axios.post(`${getApiUrl()}/chat`, {
          developer_message: "You are a helpful AI assistant.",
          user_message: newMessage.text,
          api_key: apiKey,
          model: "gpt-3.5-turbo"
        });
        const botMessage: Message = { text: response.data, sender: 'bot' };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } catch (error) {
        console.error('Error sending message:', error);
        let errorMessageText = 'An unknown error occurred.';
        if (axios.isAxiosError(error)) {
          const responseError = error.response?.data?.detail || error.message;
          errorMessageText = `Error: Could not communicate with backend. Details: ${responseError}. Status: ${error.response?.status}`;
        } else if (error instanceof Error) {
           errorMessageText = `Error: ${error.message}`;
        }
        const errorMessage: Message = { text: errorMessageText, sender: 'bot' };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    }
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        FastAPI Chat
      </Typography>
      <Paper elevation={3} sx={{ height: '70vh', overflowY: 'auto', mb: 2, p: 2 }}>
        <List>
          {messages.map((message, index) => (
            <ListItem key={index} sx={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              <ListItemText
                primary={message.text}
                sx={{
                  textAlign: message.sender === 'user' ? 'right' : 'left',
                  backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#f1f8e9',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  maxWidth: '80%',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Type your message"
          placeholder="Ask me anything..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button variant="contained" type="submit">
          Send
        </Button>
      </Box>
    </Container>
  );
}
