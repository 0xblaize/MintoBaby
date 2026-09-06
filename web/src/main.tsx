import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import App from './App';

const GOOGLE_CLIENT_ID = __MINTOBABY_CONFIG__.googleClientId.trim();

function Application() {
  const content = (
    <AuthProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </AuthProvider>
  );

  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider> : content;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Application />
  </React.StrictMode>
);
