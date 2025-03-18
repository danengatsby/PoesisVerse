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
import { useAuth } from '@/hooks/useAuth';

// Import wouter components
import { Switch, Route, Link, useLocation, useRoute } from "wouter";

// Import debug component
import { DebugComponent } from "@/components/DebugComponent";

// Navigation component
const Navigation = () => {
  const auth = useAuth();
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">Poetry Platform</Link>
          <div className="ml-8 flex space-x-4">
            <Link href="/" className="hover:text-gray-300">Home</Link>
            {auth.isAuthenticated && (
              <>
                <Link href="/add-poem" className="hover:text-gray-300">Add Poem</Link>
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
  
  return isAuthenticated ? <>{children}</> : null;
};

// Router component
const Router = () => {
  console.log("Rendering Router component");
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      
      <Route path="/auth">
        <AuthPage />
      </Route>
      
      <ProtectedRoute path="/subscribe">
        <Subscribe />
      </ProtectedRoute>
      
      <ProtectedRoute path="/add-poem">
        <AddPoem />
      </ProtectedRoute>
      
      <Route path="/:rest*">
        <NotFound />
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
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <div className="flex-1 container mx-auto py-6 px-4">
            <DebugComponent name="Router">
              <Router />
            </DebugComponent>
          </div>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
