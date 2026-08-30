import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import { auth } from './firebase'
import './index.css'
import App from './App.jsx'

// Intercept all axios requests to inject the current user's token
axios.interceptors.request.use(async (config) => {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    console.error("Interceptor failed to get token:", e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)