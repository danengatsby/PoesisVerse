import { createContext, useContext, useState, useEffect, ReactNode, MouseEvent } from 'react';

interface RouterContextType {
  currentPath: string;
  navigateTo: (path: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigateTo: () => {},
});

export function useRouter() {
  return useContext(RouterContext);
}

interface RouterProviderProps {
  children: ReactNode;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigateTo }}>
      {children}
    </RouterContext.Provider>
  );
}

interface RouteProps {
  path: string;
  component: React.ComponentType;
}

export function Route({ path, component: Component }: RouteProps) {
  const { currentPath } = useRouter();
  
  // Special case for wildcard route (404 page)
  if (path === '*' && currentPath !== '/' && currentPath !== '/auth' && 
      currentPath !== '/subscribe' && currentPath !== '/add-poem') {
    return <Component />;
  }
  
  // Simple path matching
  if (currentPath === path) {
    return <Component />;
  }
  
  return null;
}

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export function Link({ href, children, className, onClick }: LinkProps) {
  const { navigateTo } = useRouter();
  
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateTo(href);
    if (onClick) onClick(e);
  };
  
  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}