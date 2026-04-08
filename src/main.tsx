/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Quill } from 'react-quill-new';

// Fix for quill-image-resize-module-react in Vite production build
if (typeof window !== 'undefined') {
  (window as any).Quill = Quill;
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
