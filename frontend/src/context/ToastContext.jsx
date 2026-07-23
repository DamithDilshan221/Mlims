import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-md w-full pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
              t.type === 'success' ? 'bg-emerald-900 text-emerald-50 border-emerald-700' :
              t.type === 'error' ? 'bg-red-900 text-red-50 border-red-700' :
              'bg-slate-900 text-slate-50 border-slate-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-400 flex-shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 mr-3 text-red-400 flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 mr-3 text-blue-400 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-3 p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      info: (msg) => console.log('Toast info:', msg),
    };
  }
  return context;
};
