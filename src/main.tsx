import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { APP_CONFIG } from './config/app'

// Console banner
console.log(
  `%c
  ████████╗███████╗███╗   ███╗
  ╚══██╔══╝██╔════╝████╗ ████║
     ██║   █████╗  ██╔████╔██║
     ██║   ██╔══╝  ██║╚██╔╝██║
     ██║   ██║     ██║ ╚═╝ ██║
     ╚═╝   ╚═╝     ╚═╝     ╚═╝
  %c ${APP_CONFIG.name} %c v${APP_CONFIG.version} %c

  %c${APP_CONFIG.repository}%c
  `,
  'color: #10b981; font-family: monospace; font-weight: bold;',
  'background: #10b981; color: #000; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
  'background: #1e293b; color: #10b981; padding: 4px 8px; border-radius: 0 4px 4px 0;',
  '',
  'color: #64748b; text-decoration: underline;',
  ''
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
