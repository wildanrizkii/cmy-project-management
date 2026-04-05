"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-gray-500 mb-6">
              Halaman ini mengalami error. Coba muat ulang atau hubungi administrator.
            </p>
            {this.state.message && (
              <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded p-2 mb-6 text-left break-all">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
