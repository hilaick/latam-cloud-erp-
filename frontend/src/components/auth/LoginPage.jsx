import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' — register is Admin-only server-side
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        // Redirect to app — handled by App.jsx routing
        window.location.reload();  // Force clean state reset
      } else {
        // Register mode (requires Admin token — won't work for first user, but 
        // first Admin user is seeded via DB migration script)
        setError('Registration is Admin-only. Contact your administrator for an account.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/10 blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-emerald-600/15 to-cyan-600/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25 mb-4">
            <i className="fas fa-cloud-upload-alt text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ERP Migration Factory</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-Tenant Execution Control Plane</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Hilaick N."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 outline-none transition-colors"
                  required={mode === 'register'}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="········"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-purple-500/25 transition-all"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i> Please wait...</>
              ) : mode === 'login' ? (
                <><i className="fas fa-sign-in-alt mr-2"></i> Sign In</>
              ) : (
                <><i className="fas fa-user-plus mr-2"></i> Request Account</>
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 mt-6 text-center">
            {mode === 'login'
              ? 'Secure JWT-based authentication. Sessions expire after 8 hours.'
              : 'New accounts require Administrator approval.'}
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-500 mt-6">
          Huawei Cloud LATAM &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
