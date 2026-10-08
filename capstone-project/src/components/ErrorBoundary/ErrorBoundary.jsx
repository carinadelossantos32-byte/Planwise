import { Component } from "react";

// Catches a crash in any page and shows a recovery screen instead of a blank page
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="page-error" role="alert">
        <h1>Something went wrong</h1>
        <p>This page ran into a problem. Your saved records are not affected.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
