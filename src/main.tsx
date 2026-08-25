import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register lightweight offline Service Worker
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('1STEP PWA Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('1STEP PWA Service Worker registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in preview / standalone webview if supported
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Safe fallback in dev environments
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

