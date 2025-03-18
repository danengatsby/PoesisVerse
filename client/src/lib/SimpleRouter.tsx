import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation as useWouterLocation } from 'wouter';

// Define a simple router context
interface RouterContextType {
  path: string;
  navigate: (to: string) => void;
  match?: { params: Record<string, string> }; // Add match property for compatibility with wouter
}

// Create the context with default values
const RouterContext = createContext<RouterContextType>({
  path: window.location.pathname,
  navigate: () => {},
  match: { params: {} }, // Default empty match object
});

// COMPATIBILITY LAYER: This hook provides SimpleRouter interface using wouter under the hood
export function useRouter() {
  const [location, setLocation] = useWouterLocation();
  
  // Create a navigate function that uses wouter's setLocation
  const navigate = (to: string) => {
    console.log(`SimpleRouter navigate: ${to}`);
    setLocation(to);
  };
  
  // Return an object that matches the SimpleRouter interface
  return {
    path: location,
    navigate,
    match: { params: {} }
  };
}

// Props for the router provider component
interface RouterProviderProps {
  children: ReactNode;
}

// Router provider component that manages navigation state
export function RouterProvider({ children }: RouterProviderProps) {
  const [path, setPath] = useState(window.location.pathname);

  // Handle browser history navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Navigation function
  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  // Provide routing context to children
  return (
    <RouterContext.Provider value={{ path, navigate, match: { params: {} } }}>
      {children}
    </RouterContext.Provider>
  );
}

// Props for Route component
interface RouteProps {
  path: string;
  component: React.ComponentType<{ match?: { params: Record<string, string> } }>;
}

// Route component for rendering based on current path
export function Route({ path, component: Component }: RouteProps) {
  const { path: currentPath } = useRouter();
  
  // Add console logging for debugging
  console.log(`Route check: currentPath=${currentPath}, routePath=${path}`);
  
  // Special case for wildcard route (404 page)
  if (path === '*') {
    const definedRoutes = ['/', '/auth', '/subscribe', '/add-poem'];
    if (!definedRoutes.includes(currentPath)) {
      console.log(`Rendering wildcard route (* matched at ${currentPath})`);
      // Create a match object for compatibility with wouter
      const match = { params: {} };
      return <Component match={match} />;
    }
    return null;
  }
  
  // Simple path matching - exact match only for now
  if (currentPath === path) {
    console.log(`Route matched: ${path}`);
    // Create a match object for compatibility with wouter
    const match = { params: {} };
    try {
      return <Component match={match} />;
    } catch (error) {
      console.error(`Error rendering component for path ${path}:`, error);
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          <h3 className="font-bold">Error in route {path}:</h3>
          <pre>{error instanceof Error ? error.message : String(error)}</pre>
        </div>
      );
    }
  }
  
  return null;
}

// Props for Link component
interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

// Link component for navigation
export function Link({ href, children, className, onClick }: LinkProps) {
  const { navigate } = useRouter();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(href);
    if (onClick) onClick(e);
  };
  
  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}