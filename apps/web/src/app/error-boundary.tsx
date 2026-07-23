import { Button, ErrorState } from "@dental-lab/ui";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ShellErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(error, info);
    }
  }

  public override render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title="Pagina nu a putut fi afisata"
          description="Reincarca pagina sau revino la dashboard."
          retryAction={<Button onClick={() => window.location.reload()}>Reincarca</Button>}
        />
      );
    }

    return this.props.children;
  }
}
