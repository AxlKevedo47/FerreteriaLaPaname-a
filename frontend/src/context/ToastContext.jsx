import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icono } from '../components/Icono.jsx';

const ToastContext = createContext(null);
let contador = 0;

const ICONOS = {
  exito: 'check-circle',
  error: 'alerta',
  info: 'info',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const temporizadores = useRef(new Map());

  const cerrar = useCallback((id) => {
    const temporizador = temporizadores.current.get(id);
    if (temporizador) {
      clearTimeout(temporizador);
      temporizadores.current.delete(id);
    }
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje, tipo = 'info') => {
      const id = ++contador;
      setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
      const temporizador = setTimeout(() => cerrar(id), 6000);
      temporizadores.current.set(id, temporizador);
      return id;
    },
    [cerrar],
  );

  const valor = useMemo(
    () => ({
      mostrar,
      exito: (mensaje) => mostrar(mensaje, 'exito'),
      error: (mensaje) => mostrar(mensaje, 'error'),
      info: (mensaje) => mostrar(mensaje, 'info'),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tipo}`} role="status">
            <Icono nombre={ICONOS[toast.tipo] ?? 'info'} tamano={19} />
            <p className="toast__mensaje">{toast.mensaje}</p>
            <button
              type="button"
              className="toast__cerrar"
              onClick={() => cerrar(toast.id)}
              aria-label="Cerrar mensaje"
            >
              <Icono nombre="cerrar" tamano={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast debe usarse dentro de ToastProvider.');
  }
  return contexto;
}
