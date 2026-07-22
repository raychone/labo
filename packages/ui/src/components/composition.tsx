import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "./button.js";
import { TextInput, type TextInputProps } from "./form-controls.js";

export interface SearchInputProps extends Omit<TextInputProps, "type"> {
  readonly isLoading?: boolean;
  readonly onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, isLoading = false, onClear, value, ...props },
  ref,
) {
  const canClear = onClear !== undefined && value !== undefined && String(value).length > 0;

  return (
    <div className="dl-search-input">
      <span className="dl-search-input__icon" aria-hidden="true">search</span>
      <TextInput className={clsx("dl-search-input__control", className)} ref={ref} type="search" value={value} {...props} />
      {isLoading ? <span className="dl-search-input__loading" aria-label="Search loading" role="status" /> : null}
      {canClear ? (
        <button aria-label="Clear search" className="dl-search-input__clear" onClick={onClear} type="button">
          x
        </button>
      ) : null}
    </div>
  );
});

export interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  readonly actions?: ReactNode;
  readonly filters?: ReactNode;
  readonly onClearFilters?: () => void;
  readonly search?: ReactNode;
}

export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(function FilterBar(
  { actions, className, filters, onClearFilters, search, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-filter-bar", className)} ref={ref} {...props}>
      {search ? <div className="dl-filter-bar__search">{search}</div> : null}
      {filters ? <div className="dl-filter-bar__filters">{filters}</div> : null}
      <div className="dl-filter-bar__actions">
        {onClearFilters ? (
          <Button onClick={onClearFilters} variant="ghost">
            Clear filters
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
});

export type TimelineVariant = "error" | "info" | "neutral" | "success" | "warning";

export interface TimelineItem {
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly timestamp?: ReactNode;
  readonly title: ReactNode;
  readonly variant?: TimelineVariant;
}

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  readonly items: readonly TimelineItem[];
}

export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(function Timeline(
  { className, items, ...props },
  ref,
) {
  return (
    <ol className={clsx("dl-timeline", className)} ref={ref} {...props}>
      {items.map((item, index) => (
        <li className={clsx("dl-timeline__item", `dl-timeline__item--${item.variant ?? "neutral"}`)} key={index}>
          <span className="dl-timeline__marker" aria-hidden="true">{item.icon}</span>
          <div className="dl-timeline__content">
            <strong>{item.title}</strong>
            {item.description ? <p>{item.description}</p> : null}
            {item.timestamp ? <time>{item.timestamp}</time> : null}
          </div>
        </li>
      ))}
    </ol>
  );
});

export type StepState = "completed" | "current" | "error" | "upcoming";

export interface StepperItem {
  readonly description?: ReactNode;
  readonly label: ReactNode;
  readonly state: StepState;
}

export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  readonly items: readonly StepperItem[];
  readonly orientation?: "horizontal" | "vertical";
}

export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { className, items, orientation = "horizontal", ...props },
  ref,
) {
  return (
    <ol className={clsx("dl-stepper", `dl-stepper--${orientation}`, className)} ref={ref} {...props}>
      {items.map((item, index) => (
        <li className={clsx("dl-stepper__item", `dl-stepper__item--${item.state}`)} key={index}>
          <span className="dl-stepper__marker" aria-hidden="true">{index + 1}</span>
          <span className="dl-stepper__text">
            <strong>{item.label}</strong>
            <span>{item.state}</span>
            {item.description ? <small>{item.description}</small> : null}
          </span>
        </li>
      ))}
    </ol>
  );
});
