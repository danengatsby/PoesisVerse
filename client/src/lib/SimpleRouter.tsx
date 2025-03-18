import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define a simple router context
interface RouterContextType {
  path: string;
  navigate: (to: string) => void;
}

// Create the context with default values
const RouterContext = createContext<RouterContextType>({
  path: window.location.pathname,
  navigate: () => {},
});

// Custom hook for accessing the router
export function useRouter() {
  return useContext(RouterContext);
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
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

// Props for Route component
interface RouteProps {
  path: string;
  component: React.ComponentType;
}

// Route component for rendering based on current path
export function Route({ path, component: Component }: RouteProps) {
  const { path: currentPath } = useRouter();
  
  // Special case for wildcard route (404 page)
  if (path === '*') {
    const definedRoutes = ['/', '/auth', '/subscribe', '/add-poem'];
    if (!definedRoutes.includes(currentPath)) {
      return <Component />;
    }
    return null;
  }
  
  // Simple path matching - exact match only for now
  if (currentPath === path) {
    return <Component />;
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