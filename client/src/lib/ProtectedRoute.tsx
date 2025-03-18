import { useEffect } from 'react';
import { useRouter } from './SimpleRouter';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  path: string;
  component?: React.ComponentType<{ match?: { params: Record<string, string> } }>;
  children?: React.ReactNode;
}

export function ProtectedRoute({ path, component: Component, children }: ProtectedRouteProps) {
  const { path: currentPath, navigate } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Add debugging logs
  console.log(`ProtectedRoute: path=${path}, matches=true, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentPath.startsWith(path.split(':')[0])) {
      console.log(`Redirecting to /auth from protected route ${path}`);
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate, currentPath, path]);

  // For dynamic routes, match if the current path starts with the non-parameterized part
  const pathBase = path.split(':')[0]; // e.g. "/edit-poem/" from "/edit-poem/:id"
  const isPathMatch = path.includes(':')
    ? currentPath.startsWith(pathBase)
    : currentPath === path;

  // Only render if this is the current path
  if (!isPathMatch) {
    console.log(`ProtectedRoute ${path} not rendering: not on current path`);
    return null;
  }

  if (isLoading) {
    console.log(`ProtectedRoute ${path} showing loading indicator`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log(`ProtectedRoute ${path} not rendering: not authenticated`);
    return null;
  }

  // Create a match object for compatibility with wouter
  // Extract parameters from the currentPath if it's a dynamic route
  let params = {};
  
  if (path.includes(':')) {
    // Extract parameter name from the path template
    const paramName = path.split(':')[1]; // e.g. "id" from "/edit-poem/:id"
    
    // Extract parameter value from the current path
    const paramValue = currentPath.substring(pathBase.length);
    
    // Add to params object
    params = { [paramName]: paramValue };
    
    console.log(`Extracted params for ${path}:`, params);
  }

  try {
    if (children) {
      return <>{children}</>; // Just pass through children if provided
    }
    return Component ? <Component match={{ params }} /> : null;
  } catch (error) {
    console.error(`Error rendering protected component for path ${path}:`, error);
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        <h3 className="font-bold">Error in protected route {path}:</h3>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
}