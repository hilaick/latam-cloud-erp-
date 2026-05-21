import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ERPProvider } from './context/ERPContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ERPProvider>
      <App />
    </ERPProvider>
  </React.StrictMode>,
)