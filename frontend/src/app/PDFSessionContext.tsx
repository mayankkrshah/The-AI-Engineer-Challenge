import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PDFSessionContextType {
  pdfSessionId: string | null;
  setPdfSessionId: (id: string | null) => void;
  pdfUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  setPdfUploadStatus: (status: 'idle' | 'uploading' | 'success' | 'error') => void;
  pdfError: string | null;
  setPdfError: (err: string | null) => void;
  pdfFilename: string | null;
  setPdfFilename: (filename: string | null) => void;
  chunkSize: number | null;
  setChunkSize: (size: number | null) => void;
  chunkOverlap: number | null;
  setChunkOverlap: (overlap: number | null) => void;
  numChunks: number | null;
  setNumChunks: (num: number | null) => void;
}

const PDFSessionContext = createContext<PDFSessionContextType | undefined>(undefined);

export const PDFSessionProvider = ({ children }: { children: ReactNode }) => {
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [chunkSize, setChunkSize] = useState<number | null>(null);
  const [chunkOverlap, setChunkOverlap] = useState<number | null>(null);
  const [numChunks, setNumChunks] = useState<number | null>(null);

  return (
    <PDFSessionContext.Provider value={{ pdfSessionId, setPdfSessionId, pdfUploadStatus, setPdfUploadStatus, pdfError, setPdfError, pdfFilename, setPdfFilename, chunkSize, setChunkSize, chunkOverlap, setChunkOverlap, numChunks, setNumChunks }}>
      {children}
    </PDFSessionContext.Provider>
  );
};

export const usePDFSession = () => {
  const ctx = useContext(PDFSessionContext);
  if (!ctx) throw new Error('usePDFSession must be used within a PDFSessionProvider');
  return ctx;
}; 