import { clsx } from "clsx";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { getFocusableElements } from "../utils/dom.js";

export interface OverlayBaseProps {
  readonly children: ReactNode;
  readonly closeOnBackdrop?: boolean;
  readonly description?: ReactNode;
  readonly initialFocusRef?: React.RefObject<HTMLElement | null>;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly title: ReactNode;
}

function useOverlayLifecycle(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null> | undefined,
): void {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const initialElement =
        initialFocusRef?.current ?? getFocusableElements(containerRef.current ?? document.body)[0];
      initialElement?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [containerRef, initialFocusRef, isOpen]);
}

function handleFocusTrap(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null): void {
  if (event.key !== "Tab" || container === null) {
    return;
  }

  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);

  if (firstElement === undefined || lastElement === undefined) {
    event.preventDefault();
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

export interface ModalProps extends OverlayBaseProps, Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly footer?: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    children,
    className,
    closeOnBackdrop = true,
    description,
    footer,
    initialFocusRef,
    isOpen,
    onOpenChange,
    title,
    ...props
  },
  ref,
) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useOverlayLifecycle(isOpen, dialogRef, initialFocusRef);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="dl-overlay"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={clsx("dl-modal", className)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onOpenChange(false);
          }
          handleFocusTrap(event, dialogRef.current);
        }}
        ref={(element) => {
          dialogRef.current = element;
          if (typeof ref === "function") {
            ref(element);
          } else if (ref !== null) {
            ref.current = element;
          }
        }}
        role="dialog"
        {...props}
      >
        <header className="dl-overlay__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button aria-label="Close dialog" className="dl-overlay__close" onClick={() => onOpenChange(false)} type="button">
            x
          </button>
        </header>
        <div className="dl-overlay__content">{children}</div>
        {footer ? <footer className="dl-overlay__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
});

export interface DrawerProps extends OverlayBaseProps, Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  readonly position?: "bottom" | "right";
}

export const Drawer = forwardRef<HTMLElement, DrawerProps>(function Drawer(
  {
    children,
    className,
    closeOnBackdrop = true,
    description,
    initialFocusRef,
    isOpen,
    onOpenChange,
    position = "right",
    title,
    ...props
  },
  ref,
) {
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  useOverlayLifecycle(isOpen, drawerRef, initialFocusRef);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="dl-overlay"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <aside
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={clsx("dl-drawer", `dl-drawer--${position}`, className)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onOpenChange(false);
          }
          handleFocusTrap(event, drawerRef.current);
        }}
        ref={(element) => {
          drawerRef.current = element;
          if (typeof ref === "function") {
            ref(element);
          } else if (ref !== null) {
            ref.current = element;
          }
        }}
        role="dialog"
        {...props}
      >
        <header className="dl-overlay__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button aria-label="Close drawer" className="dl-overlay__close" onClick={() => onOpenChange(false)} type="button">
            x
          </button>
        </header>
        <div className="dl-overlay__content">{children}</div>
      </aside>
    </div>,
    document.body,
  );
});
