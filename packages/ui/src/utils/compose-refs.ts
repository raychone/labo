import type { Ref } from "react";

export function composeRefs<TElement>(
  ...refs: ReadonlyArray<Ref<TElement> | undefined>
): (element: TElement | null) => void {
  return (element) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(element);
      } else if (ref !== null && ref !== undefined) {
        ref.current = element;
      }
    }
  };
}
