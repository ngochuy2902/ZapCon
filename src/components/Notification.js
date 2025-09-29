import React, { useEffect } from 'react';

const typeStyles = {
  success: 'bg-green-100 border-green-200 text-green-800',
  error: 'bg-red-100 border-red-200 text-red-800',
  warning: 'bg-yellow-100 border-yellow-200 text-yellow-800',
  info: 'bg-blue-100 border-blue-200 text-blue-800',
};

const icons = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'ℹ',
};

const Notification = ({ notification, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [notification, duration, onClose]);

  if (!notification) return null;

  const { type = 'info', message } = notification;
  const styleClass = typeStyles[type] ?? typeStyles.info;
  const icon = icons[type] ?? icons.info;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-3 border rounded-md px-4 py-3 shadow-md ${styleClass}`}>
        <span className="text-lg font-semibold">{icon}</span>
        <span className="text-sm leading-snug">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
