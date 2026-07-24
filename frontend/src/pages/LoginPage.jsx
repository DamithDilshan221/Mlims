import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

import { Lock, AlertCircle, CheckCircle2, Shield as ShieldIcon } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, ArrowLeft, Lock, User, Eye, EyeOff } from 'lucide-react';


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err.response?.status === 423) {
        setError('Account locked. Please contact an administrator.');
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(59,130,246,0.5) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(37,99,235,0.3) 0%, transparent 50%)' }} />
        <div className="relative text-center max-w-md">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary-600/30">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Medico-Legal<br />Information Management</h1>
          <p className="text-slate-400 leading-relaxed">
            A secure digital platform for the Department of Forensic Medicine to manage cases, examinations, and court documentation.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> 24/7 Active</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Role-based Access</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Audit Logged</div>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Back to Landing */}
          {/* <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </button> */}

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">MLIMS</p>
              <p className="text-xs text-slate-500">Department of Forensic Medicine</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-slate-400 text-center">
            Authorized personnel only. All access is monitored and audited.
          </p>
        </div>
      </div>
    </div>
  );

};

export default LoginPage;

