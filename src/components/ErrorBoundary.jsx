import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl text-center bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Ocorreu um erro</h2>
            <p className="text-sm text-gray-600 mb-6">Um erro interno impediu que a página fosse exibida corretamente.</p>
            <pre className="text-xs text-left p-3 bg-gray-100 rounded-md overflow-auto">{String(this.state.error)}</pre>
            <div className="mt-6">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded">Recarregar</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
