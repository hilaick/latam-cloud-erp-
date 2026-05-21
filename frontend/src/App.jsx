import React, { useContext } from 'react'
import { ERPContext } from './context/ERPContext.jsx'

function App() {
  const { projects, customers, activePhase, setActivePhase, activeProjectId, setActiveProjectId, fetchState } = useContext(ERPContext)

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Latam Cloud ERP</h1>
          <p className="text-slate-600 mt-2">Modern Enterprise Stack: Vite + Flask Blueprints + PostgreSQL</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Projects</h3>
              <p className="text-2xl font-bold text-slate-800 mt-2">{projects.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Customers</h3>
              <p className="text-2xl font-bold text-slate-800 mt-2">{customers.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Active Phase</h3>
              <p className="text-2xl font-bold text-slate-800 mt-2">{activePhase}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Migration in Progress</h2>
          <p className="text-slate-600">
            This is the new Vite + React frontend. The old Babel Standalone components will be migrated in the next PR.
          </p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800">Current Architecture:</h3>
            <ul className="mt-2 space-y-1 text-blue-700">
              <li>• PostgreSQL RDS: {process.env.DATABASE_URL ? 'Connected' : 'Not Configured'}</li>
              <li>• Flask Blueprints: CRM endpoints modularized</li>
              <li>• React Context API: Global state management</li>
              <li>• Vite Build System: Modern bundler</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App