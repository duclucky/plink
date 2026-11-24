import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { httpBackend } from './backend';
import { Splash } from './ui/Splash';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash
      backend={httpBackend}
      onOpen={(event) => requestExpandedMode(event.nativeEvent, 'game')}
    />
  </StrictMode>
);
