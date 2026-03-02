import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-rose-500 text-2xl">⚠</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">页面发生错误</h2>
            <p className="text-zinc-500 text-sm mb-6 font-mono break-all">
              {this.state.error?.message ?? '未知错误'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-emerald-500 text-black rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
