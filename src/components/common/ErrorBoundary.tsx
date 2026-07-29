import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Uncaught error in APES application:', error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                An unexpected error occurred while loading this page. Please refresh or return to the main dashboard.
              </p>
            </div>

            {this.state.error && process.env.NODE_ENV !== 'production' && (
              <div className="p-3 bg-slate-950 rounded-xl text-left border border-slate-700/60 overflow-x-auto text-xs font-mono text-rose-300 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 btn bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 btn bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Home className="w-4 h-4" />
                Reload App
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              APES Performance Evaluation System &bull; HDI Family of Companies
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
