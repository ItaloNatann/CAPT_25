// components/Notification.tsx
import { useEffect, useState } from "react";

type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationProps {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Notification({ 
  type, 
  message, 
  isVisible, 
  onClose, 
  duration = 4000 
}: NotificationProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setTimeout(onClose, 300); // Espera a que termine la animación de salida
      }, duration);
      return () => clearTimeout(timer);
    } else {
      // Animación de salida cuando se cierra manualmente
      setShouldRender(false);
      const timer = setTimeout(onClose, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    setShouldRender(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible && !shouldRender) return null;

  const styles = {
    success: "bg-gradient-to-r from-green-50 to-green-25 border-l-4 border-green-400 text-green-800 shadow-lg shadow-green-100/50",
    error: "bg-gradient-to-r from-red-50 to-red-25 border-l-4 border-red-400 text-red-800 shadow-lg shadow-red-100/50",
    warning: "bg-gradient-to-r from-yellow-50 to-yellow-25 border-l-4 border-yellow-400 text-yellow-800 shadow-lg shadow-yellow-100/50",
    info: "bg-gradient-to-r from-blue-50 to-blue-25 border-l-4 border-blue-400 text-blue-800 shadow-lg shadow-blue-100/50"
  };

  const icons = {
    success: (
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L6.53 10.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    ),
    error: (
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    ),
    warning: (
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    ),
    info: (
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    )
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`
        ${styles[type]} 
        rounded-xl p-4
        transform transition-all duration-300 ease-out
        ${shouldRender 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-2 opacity-0 scale-95'
        }
        backdrop-blur-sm bg-white/80
        border border-white/20
        shadow-2xl
        hover:shadow-xl
        transition-shadow
      `}>
        <div className="flex items-start gap-4">
          {icons[type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-5">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1.5 hover:bg-black/5 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <svg className="h-4 w-4 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        
        {/* Barra de progreso */}
        {isVisible && (
          <div className="mt-3 h-1 bg-current opacity-20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current rounded-full transition-all duration-300 ease-linear"
              style={{
                width: shouldRender ? '100%' : '0%',
                transition: `width ${duration}ms linear`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}