import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find the root element')
}

const root = createRoot(rootElement)

try {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} catch (error) {
  console.error('Error rendering app:', error)
  root.render(
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      color: '#333',
      backgroundColor: '#fff'
    }}>
      <h1>Une erreur est survenue</h1>
      <p>Veuillez rafraîchir la page ou réessayer plus tard.</p>
    </div>
  )
}
