import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import './styles/index.css';

const container = document.getElementById('root');

if (container) {
  if (container.hasChildNodes() && container.innerHTML.trim() !== '<!--ssr-outlet-->') {
    // SSR Hydration
    hydrateRoot(
      container,
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  } else {
    // Client-side render fallback
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  }
}
