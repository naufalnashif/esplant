import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-svh place-items-center bg-background px-6" data-testid="error-boundary">
          <div className="max-w-lg rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-300">
            <p className="mb-2 font-bold">Terjadi error saat memuat halaman.</p>
            <pre className="whitespace-pre-wrap break-words font-data text-xs">{this.state.error.message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
