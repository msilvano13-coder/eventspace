"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: error.message || "3D rendering failed",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 gap-4 p-8">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 className="text-sm font-semibold">3D Preview Unavailable</h3>
          </div>
          <p className="text-xs text-stone-500 text-center max-w-xs">
            Your browser couldn&apos;t render the 3D view. This can happen on older devices or when GPU resources are limited.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs font-medium text-rose-500 hover:text-rose-600 border border-rose-200 px-4 py-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
