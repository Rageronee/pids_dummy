/**
 * Ringkasan: shared\src\components\ErrorBoundary.tsx
 * Tujuan: Komponen UI untuk PIDS.
 * Catatan: Komentar diringkas di atas; tidak mengubah logika.
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
    children?: ReactNode;
    mode?: 'display' | 'operator';
    systemName?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`${this.props.systemName || 'System'} Crash:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.mode === 'display') {
                return (
                    <div className="flex flex-col h-screen w-full bg-[#1d2d6a] text-white font-sans items-center justify-center p-10 text-center">
                        <AlertTriangle size={120} className="text-[#ee6f1f] mb-8 animate-pulse" />
                        <h1 className="text-6xl font-bold italic tracking-tighter uppercase mb-4 drop-shadow-2xl">
                            System Maintenance
                        </h1>
                        <p className="text-2xl font-bold text-blue-200/80 max-w-2xl leading-relaxed mb-12">
                            PIDS System is currently undergoing routine maintenance or recovering from an unexpected state. Please stand by.
                        </p>
                        <div className="bg-white/10 px-8 py-4 rounded-full border border-white/20">
                            <span className="font-mono text-xs opacity-70 tracking-wider">
                                Error Code: {this.state.error?.message || 'UNKNOWN_EXCEPTION'}
                            </span>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans items-center justify-center p-12 text-center select-none">
                    <div className="bg-red-50 p-8 rounded-full mb-8">
                        <AlertCircle size={80} className="text-red-500" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#1d2d6a] mb-4">
                        {this.props.systemName || 'Controller Interface'} Error
                    </h1>
                    <p className="text-xl font-medium text-slate-500 max-w-lg leading-relaxed mb-10">
                        The interface ran into a problem rendering the active configuration screen.
                    </p>

                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-3 px-8 py-4 bg-[#ee6f1f] hover:bg-[#d45d15] text-white rounded-2xl font-bold tracking-wider transition-all active:scale-95 shadow-xl shadow-orange-900/20"
                    >
                        <RefreshCcw size={20} />
                        Reload Interface
                    </button>

                    <div className="mt-12 opacity-40 font-mono text-[10px] break-all max-w-xl text-left bg-slate-200 p-4 rounded-xl text-slate-600">
                        {this.state.error?.stack || this.state.error?.message}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

