import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

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
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
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

        return this.props.children;
    }
}
