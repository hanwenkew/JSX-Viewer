import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress specific React warnings that trigger Vite's error overlay
// but are non-fatal for previewing AI-generated mockups.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    const msg = args[0];
    if (
      msg.includes('a style property during rerender') ||
      msg.includes('React does not recognize the') ||
      msg.includes('Invalid DOM property') ||
      msg.includes('for a non-boolean attribute') ||
      msg.includes('unique "key" prop')
    ) {
      return;
    }
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
