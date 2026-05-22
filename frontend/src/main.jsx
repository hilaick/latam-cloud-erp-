import React from 'react'
import ReactDOM from 'react-dom/client'
import { ERPProvider } from './context/ERPContext.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ERPProvider>
      <App />
    </ERPProvider>
  </React.StrictMode>
)