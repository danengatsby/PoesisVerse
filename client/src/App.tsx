import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import React from 'react';

// Import pages
import Home from '@/pages/Home';
import AuthPage from '@/pages/auth-page';
import NotFound from '@/pages/not-found';
import Subscribe from '@/pages/Subscribe';
import AddPoem from '@/pages/AddPoem';
import Subscribers from '@/pages/Subscribers';
import PoemManagement from '@/pages/PoemManagement';
import AdminDashboard from '@/pages/AdminDashboard';
import MassAdd from '@/pages/MassAdd';
import { useAuth } from '@/hooks/useAuth';

// Import wouter components
import { Switch, Route, Link, useLocation, useRoute } from "wouter";

// Import debug component
import { DebugComponent } from "@/components/DebugComponent";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="p-6 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">
              An error occurred in the application. Please try refreshing the page.
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Navigation component
const Navigation = () => {
  const auth = useAuth();
  const isAdmin = auth.user?.username === "Administrator";
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">Poetry Platform</Link>
          <div className="ml-8 flex space-x-4">
            <Link href="/" className="hover:text-gray-300">Home</Link>
            {auth.isAuthenticated && (
              <>
                {isAdmin && (
                  <Link href="/admin-dashboard" className="hover:text-gray-300">Dashboard</Link>
                )}
                {isAdmin && (
                  <Link href="/poems-management" className="hover:text-gray-300">Poeme</Link>
                )}
                {isAdmin && (
                  <Link href="/add-poem" className="hover:text-gray-300">Add Poem</Link>
                )}
                {isAdmin && (
                  <Link href="/subscribers" className="hover:text-gray-300">Subscribers</Link>
                )}
                {!auth.isSubscribed && (
                  <Link href="/subscribe" className="hover:text-gray-300">Subscribe</Link>
                )}
              </>
            )}
          </div>
        </div>
        <div>
          {!auth.isAuthenticated ? (
            <Link 
              href="/auth" 
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
            >
              Login / Register
            </Link>
          ) : (
            <div className="flex items-center space-x-4">
              <span>Welcome, {auth.user?.username}</span>
              {auth.isSubscribed && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">Premium</span>
              )}
              <button 
                onClick={() => auth.logout()}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Create a Protected Route wrapper component using wouter
const ProtectedRoute = ({ path, children }: { path: string, children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [matches] = useRoute(path);
  
  console.log(`ProtectedRoute: path=${path}, matches=${matches}, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);
  
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && matches) {
      console.log(`Redirecting to /auth from protected route ${path}`);
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, matches, setLocation, path]);
  
  if (!matches) return null;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // The key change is here - we now provide an explicit match props to any components that need it
  const matchProps = { match: { params: {} } };
  return isAuthenticated ? (
    <div {...matchProps}>
      {children}
    </div>
  ) : null;
};

// Wrapper component to provide match prop to any component
const WithMatch = ({ children, path, params }: { 
  children: React.ReactNode,
  path?: string,
  params?: Record<string, string> | any
}) => {
  // Create a match object for compatibility with components expecting it
  const matchProps = { match: { params: params || {} } };
  
  // We need to clone the child element and add the match prop
  return (
    <div {...matchProps}>
      {children}
    </div>
  );
};

// Router component
const Router = () => {
  console.log("Rendering Router component");
  return (
    <Switch>
      <Route path="/">
        <WithMatch>
          <Home />
        </WithMatch>
      </Route>
      
      <Route path="/auth">
        <WithMatch>
          <AuthPage />
        </WithMatch>
      </Route>
      
      <ProtectedRoute path="/subscribe">
        <WithMatch>
          <Subscribe />
        </WithMatch>
      </ProtectedRoute>
      
      <ProtectedRoute path="/add-poem">
        <WithMatch>
          <AddPoem />
        </WithMatch>
      </ProtectedRoute>
      
      <Route path="/edit-poem/:id">
        {(params) => {
          console.log("Edit poem route params:", params);
          // Asigurăm-ne că params.id este un string valid pentru a evita erori TypeScript
          const safeParams = { id: params?.id ? String(params.id) : "" };
          return (
            <ProtectedRoute path="/edit-poem/:id">
              <AddPoem match={{ params: safeParams }} />
            </ProtectedRoute>
          );
        }}
      </Route>
      
      <ProtectedRoute path="/subscribers">
        <WithMatch>
          <Subscribers />
        </WithMatch>
      </ProtectedRoute>
      
      <ProtectedRoute path="/poems-management">
        <WithMatch>
          <PoemManagement />
        </WithMatch>
      </ProtectedRoute>
      
      <ProtectedRoute path="/admin-dashboard">
        <WithMatch>
          <AdminDashboard />
        </WithMatch>
      </ProtectedRoute>
      
      <ProtectedRoute path="/mass-add">
        <WithMatch>
          <MassAdd />
        </WithMatch>
      </ProtectedRoute>
      
      <Route path="/:rest*">
        <WithMatch>
          <NotFound />
        </WithMatch>
      </Route>
    </Switch>
  );
};

function App() {
  // Listen for navigate events from components that don't have direct router access
  React.useEffect(() => {
    const handleNavigateEvent = (event: CustomEvent) => {
      const path = event.detail?.path;
      if (path) {
        // Instead of using window.location.href, we'll trigger a click on a link
        const link = document.createElement('a');
        link.href = path;
        link.click();
      }
    };
    
    window.addEventListener('navigate' as any, handleNavigateEvent as any);
    
    return () => {
      window.removeEventListener('navigate' as any, handleNavigateEvent as any);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <div className="flex-1 container mx-auto py-6 px-4">
              <ErrorBoundary>
                <DebugComponent name="Router">
                  <Router />
                </DebugComponent>
              </ErrorBoundary>
            </div>
          </div>
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
