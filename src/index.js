import React from 'react';
import { Buffer } from 'buffer';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from './WalletContext';
import { ThemeProvider } from './context/ThemeContext';

window.Buffer = window.Buffer || Buffer;

// Prevent irrelevant MetaMask errors from crashing the React app during development
const isMetaMaskError = (msg) => 
  msg && (msg.includes('MetaMask') || msg.includes('Failed to connect to MetaMask') || msg.includes('rpc-cap'));

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && isMetaMaskError(event.reason.message)) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (event.error && event.error.message && isMetaMaskError(event.error.message)) {
    event.preventDefault();
  }
});

// Suppress console.error for MetaMask to hide the dev overlay
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && isMetaMaskError(args[0])) {
    return;
  }
  originalConsoleError.apply(console, args);
};


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();