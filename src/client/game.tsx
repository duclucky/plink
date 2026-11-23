import './index.css';

import { showToast } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { httpBackend } from './backend';
import type { Host } from './ui/host';

const host: Host = { toast: (text) => showToast(text) };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App backend={httpBackend} host={host} />
  </StrictMode>
);
