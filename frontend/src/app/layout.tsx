'use client';

import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import Container from '@mui/material/Container';
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="env-config" strategy="beforeInteractive">
          {`window.env = ${JSON.stringify({
            NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY
          })};`}
        </Script>
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
              {props.children}
            </Container>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
