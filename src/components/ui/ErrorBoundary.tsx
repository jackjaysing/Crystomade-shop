import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 捕捉執行期錯誤，避免整頁白屏 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[晶刻] 頁面錯誤', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-graphite px-6 text-center">
          <p className="font-display text-2xl text-amber-glow">頁面載入發生錯誤</p>
          <p className="mt-4 max-w-md text-sm text-white/60">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 rounded-lg border border-amber-glow/50 px-6 py-2 text-sm text-amber-glow"
          >
            重新整理
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
