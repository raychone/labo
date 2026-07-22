import { clsx } from "clsx";
import { useId, useState, type ReactNode } from "react";

export interface AccordionItem {
  readonly content: ReactNode;
  readonly id: string;
  readonly title: ReactNode;
}

export interface AccordionProps {
  readonly allowMultiple?: boolean;
  readonly className?: string;
  readonly defaultOpenIds?: readonly string[];
  readonly items: readonly AccordionItem[];
  readonly onOpenIdsChange?: (openIds: readonly string[]) => void;
  readonly openIds?: readonly string[];
}

export function Accordion({
  allowMultiple = false,
  className,
  defaultOpenIds = [],
  items,
  onOpenIdsChange,
  openIds,
}: AccordionProps): ReactNode {
  const generatedId = useId();
  const [internalOpenIds, setInternalOpenIds] = useState<readonly string[]>(defaultOpenIds);
  const currentOpenIds = openIds ?? internalOpenIds;

  function updateOpenIds(nextOpenIds: readonly string[]): void {
    if (openIds === undefined) {
      setInternalOpenIds(nextOpenIds);
    }
    onOpenIdsChange?.(nextOpenIds);
  }

  function toggleItem(itemId: string): void {
    const isOpen = currentOpenIds.includes(itemId);
    if (allowMultiple) {
      updateOpenIds(isOpen ? currentOpenIds.filter((id) => id !== itemId) : [...currentOpenIds, itemId]);
    } else {
      updateOpenIds(isOpen ? [] : [itemId]);
    }
  }

  return (
    <div className={clsx("dl-accordion", className)}>
      {items.map((item) => {
        const isOpen = currentOpenIds.includes(item.id);
        const triggerId = `${generatedId}-${item.id}-trigger`;
        const panelId = `${generatedId}-${item.id}-panel`;
        return (
          <section className="dl-accordion__item" key={item.id}>
            <h3>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="dl-accordion__trigger"
                id={triggerId}
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <span>{item.title}</span>
                <span aria-hidden="true">{isOpen ? "-" : "+"}</span>
              </button>
            </h3>
            <div
              aria-labelledby={triggerId}
              className="dl-accordion__panel"
              hidden={!isOpen}
              id={panelId}
              role="region"
            >
              {item.content}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export interface TabItem {
  readonly content: ReactNode;
  readonly id: string;
  readonly label: ReactNode;
}

export interface TabsProps {
  readonly className?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly orientation?: "horizontal" | "vertical";
  readonly tabs: readonly TabItem[];
  readonly value?: string;
}

export function Tabs({
  className,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  tabs,
  value,
}: TabsProps): ReactNode {
  const generatedId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? tabs[0]?.id ?? "");
  const selectedValue = value ?? internalValue;

  function selectTab(nextValue: string): void {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function moveSelection(currentIndex: number, direction: 1 | -1): void {
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab !== undefined) {
      selectTab(nextTab.id);
      window.setTimeout(() => document.getElementById(`${generatedId}-${nextTab.id}-tab`)?.focus(), 0);
    }
  }

  return (
    <div className={clsx("dl-tabs", `dl-tabs--${orientation}`, className)}>
      <div aria-orientation={orientation} className="dl-tabs__list" role="tablist">
        {tabs.map((tab, index) => {
          const isSelected = selectedValue === tab.id;
          return (
            <button
              aria-controls={`${generatedId}-${tab.id}-panel`}
              aria-selected={isSelected}
              className="dl-tabs__tab"
              id={`${generatedId}-${tab.id}-tab`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveSelection(index, 1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveSelection(index, -1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  selectTab(tabs[0]?.id ?? tab.id);
                } else if (event.key === "End") {
                  event.preventDefault();
                  selectTab(tabs.at(-1)?.id ?? tab.id);
                }
              }}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          aria-labelledby={`${generatedId}-${tab.id}-tab`}
          className="dl-tabs__panel"
          hidden={selectedValue !== tab.id}
          id={`${generatedId}-${tab.id}-panel`}
          key={tab.id}
          role="tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
