import { clsx } from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "error" | "info" | "success" | "warning";

export interface ToastOptions {
  readonly durationMs?: number;
  readonly message: ReactNode;
  readonly title?: ReactNode;
  readonly variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  readonly id: string;
  readonly variant: ToastVariant;
}

export interface ToastApi {
  readonly dismissToast: (id: string) => void;
  readonly showToast: (options: ToastOptions) => string;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextToastId = 0;

function createToastId(): string {
  nextToastId += 1;
  return `toast-${nextToastId}`;
}

export interface ToastProviderProps {
  readonly children: ReactNode;
  readonly maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 4 }: ToastProviderProps): ReactNode {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = createToastId();
      const toast: ToastItem = {
        ...options,
        id,
        variant: options.variant ?? "info",
      };
      setToasts((currentToasts) => [toast, ...currentToasts].slice(0, maxToasts));
      return id;
    },
    [maxToasts],
  );

  const value = useMemo<ToastApi>(() => ({ dismissToast, showToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="dl-toast-region">
        {toasts.map((toast) => (
          <ToastMessage dismissToast={dismissToast} key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({
  dismissToast,
  toast,
}: {
  readonly dismissToast: (id: string) => void;
  readonly toast: ToastItem;
}): ReactNode {
  useEffect(() => {
    if (toast.durationMs === undefined) {
      return undefined;
    }

    const timeout = window.setTimeout(() => dismissToast(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast.durationMs, toast.id]);

  return (
    <div className={clsx("dl-toast", `dl-toast--${toast.variant}`)} role="status">
      <div className="dl-toast__content">
        {toast.title ? <strong>{toast.title}</strong> : null}
        <span>{toast.message}</span>
      </div>
      <button aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)} type="button">
        x
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
