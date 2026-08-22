import { Component } from "react";

// A render crash anywhere in the tree would otherwise blank the whole
// dashboard; this keeps the shell visible and says what happened.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Dashboard crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
          <h1>Something went wrong</h1>
          <p>The dashboard hit an unexpected error. Reload the page to retry.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
