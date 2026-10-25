import {createRoot} from 'react-dom/client';
import App from '../client/src/App.js';
import '../client/src/index.css';
import { AuthProvider } from '../client/src/context/AuthContext.js';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
