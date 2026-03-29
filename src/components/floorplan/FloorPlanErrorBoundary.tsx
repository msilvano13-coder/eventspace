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

export class FloorPlanErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: error.message || "Something went wrong",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-50 gap-4 p-8">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 className="text-sm font-semibold">Floor Plan Error</h3>
          </div>
          <p className="text-xs text-stone-500 text-center max-w-sm">
            {this.state.error || "The floor plan editor encountered an unexpected error."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs font-medium text-rose-500 hover:text-rose-600 border border-rose-200 px-4 py-2 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="text-xs font-medium text-stone-500 hover:text-stone-600 border border-stone-200 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
