import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, Home, Headset, ShieldAlert } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    try {
      window.location.reload();
    } catch (_) {}
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.href = "/";
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          id="vero-error-boundary-screen"
          className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans"
        >
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full bg-[#121212] border border-[#2A2A2A] rounded-2xl p-8 sm:p-10 shadow-2xl text-center backdrop-blur-md">
            {/* VERO Luxury Brand Mark */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-amber-900/30 border border-[#D4AF37]/40 flex items-center justify-center shadow-lg shadow-amber-900/20">
                <ShieldAlert className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </div>

            <div className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-2">
              VERO MAISON • NOTIFICATION
            </div>

            {/* Exact Requested Title */}
            <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-white mb-4">
              Something went wrong.
            </h1>

            {/* Exact Requested Subtext / Body */}
            <div className="text-sm sm:text-base text-gray-300 space-y-3 leading-relaxed mb-8">
              <p>
                We’re sorry, but an unexpected error occurred.
                <br />
                Please try again in a moment.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 border-t border-[#222] pt-3">
                If the problem persists, please contact{" "}
                <span className="text-[#D4AF37] font-medium">VERO Support</span>.
              </p>
            </div>

            {/* Interactive Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                id="btn-error-try-again"
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-[#D4AF37] to-[#B8972E] text-black font-medium text-sm rounded-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                id="btn-error-go-home"
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-[#1C1C1C] hover:bg-[#252525] text-gray-200 border border-[#333] font-medium text-sm rounded-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#D4AF37]" />
                <span>Home</span>
              </button>
            </div>

            {/* Contact Support Link */}
            <div className="pt-4 border-t border-[#222] flex items-center justify-center">
              <a
                id="link-contact-support"
                href="mailto:support@vero.com?subject=VERO%20App%20Support%20Request"
                className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-[#D4AF37] transition-colors py-1 px-3 rounded hover:bg-[#1A1A1A]"
              >
                <Headset className="w-3.5 h-3.5" />
                <span>Contact VERO Support (support@vero.com)</span>
              </a>
            </div>

            {/* Optional Collapsible Technical Details for Diagnostics */}
            {this.state.error && (
              <div className="mt-6 pt-4 border-t border-[#1F1F1F] text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] text-gray-500 hover:text-gray-400 underline transition-colors cursor-pointer"
                >
                  {this.state.showDetails ? "Hide technical diagnostic details" : "Show technical diagnostic details"}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-black/70 border border-gray-800 rounded text-[10px] text-red-300 overflow-x-auto max-h-36 font-mono whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
