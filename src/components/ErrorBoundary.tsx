import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryTheme {
  bg?: string;
  surface?: string;
  text?: string;
  subtext?: string;
  accent?: string;
  border?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  theme?: ErrorBoundaryTheme;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const { theme, fallbackTitle } = this.props;

    const bg = theme?.bg || '#121418';
    const surface = theme?.surface || '#1c1f26';
    const text = theme?.text || '#ffffff';
    const subtext = theme?.subtext || '#9ca3af';
    const accent = theme?.accent || '#00e676';
    const border = theme?.border || '#2a2f3d';

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          color: text,
          padding: '16px',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '360px',
            width: '100%',
            backgroundColor: surface,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: accent,
                display: 'inline-block',
              }}
            />
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: text,
              }}
            >
              {fallbackTitle || 'Произошла ошибка модуля'}
            </h3>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: subtext,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {error.message || 'Неизвестная ошибка во время работы интерфейса'}
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: '6px',
              padding: '8px 16px',
              backgroundColor: accent,
              color: '#121418',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Перезапустить модуль
          </button>
        </div>
      </div>
    );
  }
}
