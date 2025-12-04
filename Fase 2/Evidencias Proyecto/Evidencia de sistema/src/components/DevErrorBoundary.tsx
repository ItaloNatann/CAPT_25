import React from "react";

type Props = { children: React.ReactNode };

export default class DevErrorBoundary extends React.Component<Props, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // log detallado en consola
    console.error("[ErrorBoundary] error:", error);
    console.error("[ErrorBoundary] info:", info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Ups, falló el render de esta pantalla.</h2>
          <p style={{ color: "#b00" }}>{this.state.error.message}</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
