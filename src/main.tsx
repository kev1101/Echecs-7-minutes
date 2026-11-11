import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProfileProvider } from './state/profile';
import './styles.css';

// Demande au navigateur de ne pas effacer nos données (IndexedDB) quand l'espace manque
void navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileProvider>
      <App />
    </ProfileProvider>
  </StrictMode>
);
