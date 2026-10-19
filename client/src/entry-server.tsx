import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App.js';

export function render(url: string, context?: { initialData?: any }) {
  if (context?.initialData) {
    (globalThis as any).__INITIAL_DATA__ = context.initialData;
  } else {
    delete (globalThis as any).__INITIAL_DATA__;
  }

  try {
    const html = ReactDOMServer.renderToString(
      <React.StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </React.StrictMode>
    );

    return { html };
  } finally {
    delete (globalThis as any).__INITIAL_DATA__;
  }
}
