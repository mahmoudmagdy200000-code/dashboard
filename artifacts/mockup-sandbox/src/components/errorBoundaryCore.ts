export class ErrorBoundaryCore {
  hasError = false;
  error: Error | null = null;
  onResetCallback?: () => void;

  constructor(onReset?: () => void) {
    this.onResetCallback = onReset;
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  reset(): void {
    this.hasError = false;
    this.error = null;
    this.onResetCallback?.();
  }

  setError(error: Error): void {
    this.hasError = true;
    this.error = error;
  }
}
