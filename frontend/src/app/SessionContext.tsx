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
  handleSwitchSession: (id: string) => void;
  handleNewSession: () => void;
  handleDeleteSession: (id: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSessionContext = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be used within a SessionProvider');
  return ctx;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        messages: session.messages.map((msg: any) => ({ ...msg, sender: msg.sender as 'user' | 'bot' }))
      }));
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) setCurrentSessionId(parsedSessions[0].id);
    } else {
      const initialSession: Session = {
        id: Date.now().toString(),
        name: 'Session ' + new Date().toLocaleString(),
        messages: [{ text: 'Hello! How can I assist you today?', sender: 'bot' }]
      };
      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
    }
  }, []);

  // Persist sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

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

  const handleSwitchSession = (id: string) => {
    setCurrentSessionId(id);
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
      if (id === currentSessionId && updated.length > 0) {
        setCurrentSessionId(updated[0].id);
      } else if (updated.length === 0) {
        // If all sessions deleted, create a new one
        const newId = Date.now().toString();
        const newSession: Session = {
          id: newId,
          name: 'Session ' + new Date().toLocaleString(),
          messages: [{ text: 'Hello! How can I assist you today?', sender: 'bot' }]
        };
        setCurrentSessionId(newId);
        return [newSession];
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
      handleSwitchSession,
      handleNewSession,
      handleDeleteSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}; 