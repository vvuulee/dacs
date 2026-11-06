import { Component } from 'react';
import ErrorState from './ErrorState';

export default class RouteErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Lỗi trong trang:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorState message={error.message} onRetry={() => this.setState({ error: null })} />;
  }
}
