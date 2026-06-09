import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AmbienceProvider } from './context/AmbienceContext'
import { ApiHealthProvider } from './context/ApiHealthContext'
import './styles/tokens.css'
import './styles/atmosphere.css'
import './styles/skeletons.css'
import './styles/material.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AmbienceProvider>
          <ApiHealthProvider>
            <App />
          </ApiHealthProvider>
        </AmbienceProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
