import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  text: string;
  sender: 'user' | 'bot';
  id?: string;
  isError?: boolean;
  errorMessage?: string;
}

export interface Session {
  id: string;
  name: string;
  messages: Message[];
}

interface SessionContextType {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  currentSessionId: string;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string>>;
  addMessageToCurrentSession: (msg: Message) => void;
  updateMessageInCurrentSession: (messageId: string, updatedMessage: Partial<Message>) => void;
  removeMessagesAfter: (messageId: string) => void;
  handleSwitchSession: (id: string) => void;
  handleNewSession: () => void;
  handleDeleteSession: (id: string) => void;
  systemPrompt: string;
  setSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSessionContext = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be used within a SessionProvider');
  return ctx;
};

const defaultPrompt = 'You are a knowledgeable, helpful, and friendly AI assistant. Provide clear, accurate, and well-structured responses. Always be concise yet comprehensive, use examples when helpful, and maintain a warm, professional tone. If you\'re unsure about something, acknowledge the limitation and suggest alternatives.';
const defaultTemplate = '🧑‍💼 General Assistant';

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState<string>(defaultPrompt);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          messages: session.messages.map((msg: any) => ({ ...msg, sender: msg.sender as 'user' | 'bot' }))
        }));
        setSessions(parsedSessions);
        if (parsedSessions.length > 0) {
          setCurrentSessionId(parsedSessions[0].id);
        }
      } catch (error) {
        console.error('Error parsing saved sessions:', error);
        // If parsing fails, create a new session
        createInitialSession();
      }
    } else {
      createInitialSession();
    }
  }, []);

  const createInitialSession = () => {
    const initialSession: Session = {
      id: Date.now().toString(),
      name: 'Session ' + new Date().toLocaleString(),
      messages: [{ text: 'Hello! How can I assist you today?', sender: 'bot' }]
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
  };

  // Persist sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  // Ensure we always have a valid current session
  useEffect(() => {
    if (sessions.length > 0 && (!currentSessionId || !sessions.some(s => s.id === currentSessionId))) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  const addMessageToCurrentSession = (msg: Message) => {
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messages: [...session.messages, { ...msg, id: msg.id || Date.now().toString() }] }
        : session
    ));
  };

  const updateMessageInCurrentSession = (messageId: string, updatedMessage: Partial<Message>) => {
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { 
            ...session, 
            messages: session.messages.map(msg => 
              msg.id === messageId ? { ...msg, ...updatedMessage } : msg
            )
          }
        : session
    ));
  };

  const removeMessagesAfter = (messageId: string) => {
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { 
            ...session, 
            messages: session.messages.slice(0, session.messages.findIndex(msg => msg.id === messageId) + 1)
          }
        : session
    ));
  };

  const handleSwitchSession = (id: string) => {
    // Validate that the session exists before switching
    const sessionExists = sessions.some(session => session.id === id);
    if (sessionExists) {
      setCurrentSessionId(id);
    } else {
      console.warn(`Session with id ${id} not found`);
      // Fallback to first session if the requested session doesn't exist
      if (sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      }
    }
  };

  const handleNewSession = () => {
    const newId = Date.now().toString();
    const newSession: Session = {
      id: newId,
      name: 'Session ' + new Date().toLocaleString(),
      messages: [{ text: 'Hello! How can I assist you today?', sender: 'bot' }]
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => {
      const updated = prev.filter(session => session.id !== id);
      
      // If we're deleting the current session
      if (id === currentSessionId) {
        if (updated.length > 0) {
          // Switch to the first available session
          setCurrentSessionId(updated[0].id);
        } else {
          // If no sessions left, create a new one
          const newId = Date.now().toString();
          const newSession: Session = {
            id: newId,
            name: 'Session ' + new Date().toLocaleString(),
            messages: [{ text: 'Hello! How can I assist you today?', sender: 'bot' }]
          };
          setCurrentSessionId(newId);
          return [newSession];
        }
      }
      
      return updated;
    });
  };

  return (
    <SessionContext.Provider value={{
      sessions,
      setSessions,
      currentSessionId,
      setCurrentSessionId,
      addMessageToCurrentSession,
      updateMessageInCurrentSession,
      removeMessagesAfter,
      handleSwitchSession,
      handleNewSession,
      handleDeleteSession,
      systemPrompt,
      setSystemPrompt,
      selectedTemplate,
      setSelectedTemplate
    }}>
      {children}
    </SessionContext.Provider>
  );
}; 