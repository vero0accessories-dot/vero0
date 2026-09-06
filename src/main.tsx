import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Silence benign WebSocket / Vite connection errors in the sandboxed preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (
      msg &&
      (msg.includes('WebSocket') ||
       msg.includes('websocket') ||
       msg.includes('vite') ||
       msg.includes('HMR') ||
       msg.includes('connection'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg &&
      (msg.includes('WebSocket') ||
       msg.includes('websocket') ||
       msg.includes('vite') ||
       msg.includes('HMR') ||
       msg.includes('connection'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

