import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';
import SetupNotice from './components/SetupNotice.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { isFirebaseConfigured } from './firebase.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isFirebaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </StrictMode>,
);
