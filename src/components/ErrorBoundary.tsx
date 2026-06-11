import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg border-4 border-ink bg-[#FFDE59] p-8 shadow-[8px_8px_0px_#1A1A1A]">
            <div className="flex items-center gap-4 mb-6">
              <AlertTriangle size={48} className="text-ink flex-shrink-0" />
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">System Error</h1>
                <p className="text-lg font-medium leading-tight">Something went wrong while rendering this view.</p>
              </div>
            </div>
            
            <div className="bg-white border-4 border-ink p-4 mb-8 overflow-auto max-h-48 text-sm font-mono">
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full group relative flex items-center justify-center gap-2 border-4 border-ink bg-ink text-white py-4 font-black uppercase tracking-widest text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_#1A1A1A] hover:bg-white hover:text-ink active:translate-y-0 active:shadow-none transition-all"
            >
              <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
