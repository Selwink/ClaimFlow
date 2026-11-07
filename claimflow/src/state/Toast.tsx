import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem { id: number; tekst: string; actie?: { label: string; doe: () => void } }
type Toon = (tekst: string, actie?: ToastItem["actie"]) => void;

const ToastContext = createContext<Toon>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<number>();
  const toon = useCallback<Toon>((tekst, actie) => {
    window.clearTimeout(timer.current);
    setItem({ id: Date.now(), tekst, actie });
    timer.current = window.setTimeout(() => setItem(null), actie ? 7000 : 2800);
  }, []);
  return (
    <ToastContext.Provider value={toon}>
      {children}
      <div className="toast-plek" aria-live="polite">
        {item && (
          <div className="toast" key={item.id} role="status">
            <span>{item.tekst}</span>
            {item.actie && (
              <button type="button" onClick={() => { item.actie?.doe(); setItem(null); }}>{item.actie.label}</button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
