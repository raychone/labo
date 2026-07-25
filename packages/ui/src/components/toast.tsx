import { clsx } from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "error" | "info" | "success" | "warning";

export interface ToastOptions {
  readonly durationMs?: number;
  readonly message: ReactNode;
  readonly persist?: boolean;
  readonly title?: ReactNode;
  readonly variant?: ToastVariant;
}

interface ToastItem extends Omit<ToastOptions, "durationMs" | "persist" | "variant"> {
  readonly createdAt: number;
  readonly durationMs: number | null;
  readonly id: string;
  readonly variant: ToastVariant;
}

export interface ToastApi {
  readonly clearToasts: () => void;
  readonly dismissToast: (id: string) => void;
  readonly showToast: (options: ToastOptions) => string;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextToastId = 0;

function createToastId(): string {
  nextToastId += 1;
  return `toast-${nextToastId}`;
}

const DEFAULT_TOAST_DURATIONS = {
  error: 7000,
  info: 4000,
  success: 3500,
  warning: 5500,
} as const satisfies Record<ToastVariant, number>;

export interface ToastProviderProps {
  readonly children: ReactNode;
  readonly maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 4 }: ToastProviderProps): ReactNode {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const timeoutsRef = useRef(new Map<string, number>());

  const clearTimer = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const clearToasts = useCallback(() => {
    for (const timeoutId of timeoutsRef.current.values()) {
      window.clearTimeout(timeoutId);
    }
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = createToastId();
      const variant = options.variant ?? "info";
      const toast: ToastItem = {
        ...options,
        createdAt: Date.now(),
        durationMs: options.persist === true ? null : options.durationMs ?? DEFAULT_TOAST_DURATIONS[variant],
        id,
        variant,
      };
      setToasts((currentToasts) => {
        const nextToasts = [toast, ...currentToasts].slice(0, maxToasts);
        for (const removedToast of currentToasts.filter((currentToast) => !nextToasts.some((nextToast) => nextToast.id === currentToast.id))) {
          clearTimer(removedToast.id);
        }
        return nextToasts;
      });
      return id;
    },
    [clearTimer, maxToasts],
  );

  useEffect(() => {
    for (const toast of toasts) {
      if (toast.durationMs === null || timeoutsRef.current.has(toast.id)) {
        continue;
      }

      const timeoutId = window.setTimeout(() => dismissToast(toast.id), toast.durationMs);
      timeoutsRef.current.set(toast.id, timeoutId);
    }
  }, [dismissToast, toasts]);

  useEffect(() => clearToasts, [clearToasts]);

  const value = useMemo<ToastApi>(() => ({ clearToasts, dismissToast, showToast }), [clearToasts, dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="dl-toast-region">
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
  return (
    <div
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      className={clsx("dl-toast", `dl-toast--${toast.variant}`)}
      data-created-at={toast.createdAt}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className="dl-toast__content">
        {toast.title ? <strong>{toast.title}</strong> : null}
        <span>{toast.message}</span>
      </div>
      <button aria-label="Închide notificarea" onClick={() => dismissToast(toast.id)} type="button">
        ×
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
