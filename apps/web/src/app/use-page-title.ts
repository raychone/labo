import { useEffect } from "react";

export function usePageTitle(pageTitle: string, laboratoryName: string): void {
  useEffect(() => {
    document.title = `${pageTitle} - ${laboratoryName}`;
  }, [laboratoryName, pageTitle]);
}
