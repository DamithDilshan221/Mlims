import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLocked(false);
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      if (err.response?.status === 423) {
        setIsLocked(true);
        setError("Account locked. Please contact an administrator.");
      } else {
        // Generic message for 401 (invalid credentials)
        setError("Invalid username or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full glass-panel overflow-hidden shadow-2xl">
        <div className="bg-slate-900 p-8 text-center border-b border-slate-800">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
            <ShieldIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">MLIMS Login</h2>
          <p className="text-slate-400 mt-2 text-sm">Medico-Legal Information Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          {error && (
            <div className={clsx(
              "p-4 rounded-lg flex items-start text-sm border",
              isLocked 
                ? "bg-red-50 text-red-700 border-red-200" 
                : "bg-amber-50 text-amber-800 border-amber-200"
            )}>
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

function ShieldIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    </svg>
  );
}

export default LoginPage;
