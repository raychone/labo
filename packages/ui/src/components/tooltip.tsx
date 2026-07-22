import { clsx } from "clsx";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type Attributes,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

interface TooltipTriggerProps {
  readonly "aria-describedby"?: string;
  readonly onBlur?: (event: FocusEvent<HTMLElement>) => void;
  readonly onFocus?: (event: FocusEvent<HTMLElement>) => void;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  readonly onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
}

export interface TooltipProps {
  readonly children: ReactElement<TooltipTriggerProps>;
  readonly className?: string;
  readonly content: ReactNode;
  readonly position?: "bottom" | "top";
}

export function Tooltip({ children, className, content, position = "top" }: TooltipProps): ReactNode {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  if (!isValidElement<TooltipTriggerProps>(children)) {
    return children;
  }

  const triggerProps: Partial<TooltipTriggerProps> & Attributes = {
    onBlur: (event) => {
      children.props.onBlur?.(event);
      setIsOpen(false);
    },
    onFocus: (event) => {
      children.props.onFocus?.(event);
      setIsOpen(true);
    },
    onKeyDown: (event) => {
      children.props.onKeyDown?.(event);
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    },
    onMouseEnter: (event) => {
      children.props.onMouseEnter?.(event);
      setIsOpen(true);
    },
    onMouseLeave: (event) => {
      children.props.onMouseLeave?.(event);
      setIsOpen(false);
    },
  };

  return (
    <span className={clsx("dl-tooltip", className)}>
      {cloneElement(children, {
        ...triggerProps,
        ...(isOpen ? { "aria-describedby": tooltipId } : {}),
      })}
      {isOpen ? (
        <span className={clsx("dl-tooltip__content", `dl-tooltip__content--${position}`)} id={tooltipId} role="tooltip">
          {content}
        </span>
      ) : null}
    </span>
  );
}
