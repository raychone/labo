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
          title="Pagina nu a putut fi afișată"
          description="Reîncarcă pagina sau revino la panoul principal."
          retryAction={<Button onClick={() => window.location.reload()}>Reîncarcă</Button>}
        />
      );
    }

    return this.props.children;
  }
}
