import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ErrorBoundaryCore } from "./errorBoundaryCore.ts";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  title?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private core: ErrorBoundaryCore;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.core = new ErrorBoundaryCore(props.onReset);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return ErrorBoundaryCore.getDerivedStateFromError(error);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[Dashboard ErrorBoundary caught error]:", error, errorInfo);
  }

  reset = (): void => {
    this.core.reset();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }

      return (
        <div
          role="alert"
          className="p-6 my-4 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-sm text-right"
          dir="rtl"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 text-base">
                {this.props.title ?? "حدث خطأ غير متوقع أثناء عرض هذا القسم"}
              </h3>
              <p className="text-xs text-rose-600 mt-0.5">
                تعذر تحميل البيانات بشكل صحيح. لم يتم عرض أي بيانات مالية افتراضية للحفاظ على دقة السجلات.
              </p>
            </div>
          </div>

          <div className="bg-white/80 border border-rose-100 rounded-xl p-3 mb-4 text-xs font-mono text-rose-800 break-words max-h-32 overflow-auto" dir="ltr">
            {this.state.error.message || String(this.state.error)}
          </div>

          <div className="flex gap-2 justify-start">
            <button
              type="button"
              onClick={this.reset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <RefreshCw size={13} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyIcon?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function QueryStateView({
  isLoading,
  isError,
  error,
  isEmpty = false,
  emptyTitle = "لا توجد بيانات متاحة",
  emptyDesc = "لم يتم العثور على أي عناصر مسجلة في هذا القسم.",
  emptyIcon = "📋",
  onRetry,
  children,
}: QueryStateProps): ReactNode {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
        <RefreshCw size={24} className="animate-spin text-purple-600 mb-3" />
        <p className="text-sm font-semibold text-gray-600">جارٍ تحميل البيانات…</p>
      </div>
    );
  }

  if (isError) {
    const errorMsg = error instanceof Error ? error.message : String(error ?? "تعذر الاتصال بالخادم");
    return (
      <div
        role="alert"
        className="p-6 my-4 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-sm text-right"
        dir="rtl"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-rose-900 text-base">فشل تحميل البيانات</h3>
            <p className="text-xs text-rose-600 mt-0.5">
              حدث خطأ أثناء جلب البيانات من الخادم. لا يتم عرض أي قيم افتراضية غير مؤكدة.
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-rose-100 rounded-xl p-3 mb-4 text-xs font-mono text-rose-800 break-words" dir="ltr">
          {errorMsg}
        </div>

        {onRetry && (
          <div className="flex gap-2 justify-start">
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <RefreshCw size={13} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl mb-4 shadow-sm">
          {emptyIcon}
        </div>
        <p className="font-bold text-gray-700 mb-1">{emptyTitle}</p>
        {emptyDesc && <p className="text-gray-400 text-sm max-w-xs">{emptyDesc}</p>}
      </div>
    );
  }

  return children;
}
