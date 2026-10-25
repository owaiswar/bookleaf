import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';
import { AuthProvider } from './context/AuthContext.js';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
