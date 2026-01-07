import { useState, useEffect } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[300px] max-w-md animate-slide-in`}
        >
          <span className="text-2xl">{getIcon(toast.type)}</span>
          <p className="flex-1 font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:text-gray-200 text-xl font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
