import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root ausente no index.html');

createRoot(root).render(
  <StrictMode>
    <main className="p-4">Fast O.S.</main>
  </StrictMode>,
);
