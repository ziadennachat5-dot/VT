import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Error boundary for development
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
}

// Render with error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
