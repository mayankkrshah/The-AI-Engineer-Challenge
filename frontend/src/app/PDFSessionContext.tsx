import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PDFSessionContextType {
  pdfSessionId: string | null;
  setPdfSessionId: (id: string | null) => void;
  pdfUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  setPdfUploadStatus: (status: 'idle' | 'uploading' | 'success' | 'error') => void;
  pdfError: string | null;
  setPdfError: (err: string | null) => void;
}

const PDFSessionContext = createContext<PDFSessionContextType | undefined>(undefined);

export const PDFSessionProvider = ({ children }: { children: ReactNode }) => {
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);

  return (
    <PDFSessionContext.Provider value={{ pdfSessionId, setPdfSessionId, pdfUploadStatus, setPdfUploadStatus, pdfError, setPdfError }}>
      {children}
    </PDFSessionContext.Provider>
  );
};

export const usePDFSession = () => {
  const ctx = useContext(PDFSessionContext);
  if (!ctx) throw new Error('usePDFSession must be used within a PDFSessionProvider');
  return ctx;
}; 