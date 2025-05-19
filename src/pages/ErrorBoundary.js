// Create ErrorBoundary.js
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">Error loading component</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;