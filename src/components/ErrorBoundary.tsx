
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { FallbackProps } from 'react-error-boundary';
import { ZeeMascot } from './ui/ZeeMascot';

// Tier 1: Catastrophic App Failure (No Sidebar, Full Screen)
export const GlobalErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg border-4 border-ink bg-[#FFDE59] p-8 shadow-[8px_8px_0px_#1A1A1A]">
        <div className="flex items-center gap-4 mb-6">
          <ZeeMascot variant="cooked" size={80} className="flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">System Error</h1>
            <p className="text-lg font-medium leading-tight">A critical error crashed the application.</p>
          </div>
        </div>
        
        <div className="bg-white border-4 border-ink p-4 mb-8 overflow-auto max-h-48 text-sm font-mono whitespace-pre-wrap">
          {(error as Error)?.message || 'Unknown error occurred'}
        </div>

        <button 
          onClick={resetErrorBoundary}
          className="w-full group relative flex items-center justify-center gap-2 border-4 border-ink bg-ink text-white py-4 font-black uppercase tracking-widest text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_#1A1A1A] hover:bg-white hover:text-ink active:translate-y-0 active:shadow-none transition-all"
        >
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          Reload Application
        </button>
      </div>
    </div>
  );
};

// Tier 2: Layout Content Failure (Sidebar survives, takes up main content area)
export const LayoutErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl border-4 border-ink bg-error text-white p-8 shadow-[8px_8px_0px_#1A1A1A]">
        <div className="flex items-center gap-4 mb-6">
          <ZeeMascot variant="cooked" size={72} className="flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">View Crashed</h2>
            <p className="text-base font-medium leading-tight">This specific page encountered an error, but your navigation is safe.</p>
          </div>
        </div>
        
        <div className="bg-black/20 border-4 border-ink p-4 mb-8 overflow-auto max-h-40 text-sm font-mono whitespace-pre-wrap">
          {(error as Error)?.message || 'Unknown error occurred'}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={resetErrorBoundary}
            className="flex-1 flex items-center justify-center gap-2 border-4 border-ink bg-white text-ink py-3 font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-[4px_4px_0px_#1A1A1A] active:translate-y-0 active:shadow-none transition-all"
          >
            <RefreshCcw size={18} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

// Tier 3: Widget/Component Failure (Small inline error box)
export const WidgetErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="w-full border-4 border-ink bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden">
      {/* Neo-brutalist hazard stripes overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)' }}></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-error p-2 border-2 border-ink">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Widget Failed</h3>
            <p className="text-sm font-medium opacity-80 truncate max-w-[200px] sm:max-w-xs">{(error as Error)?.message}</p>
          </div>
        </div>
        
        <button 
          onClick={resetErrorBoundary}
          className="shrink-0 flex items-center gap-2 border-2 border-ink bg-secondary text-white px-4 py-2 font-bold uppercase text-sm hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0 active:shadow-none transition-all"
        >
          <RefreshCcw size={14} />
          Retry
        </button>
      </div>
    </div>
  );
};
