import { useEffect } from 'react';
import { useRouter } from './SimpleRouter';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<{ match?: { params: Record<string, string> } }>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { path: currentPath, navigate } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Add debugging logs
  console.log(`ProtectedRoute check: currentPath=${currentPath}, routePath=${path}, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentPath === path) {
      console.log(`Redirecting to /auth from protected route ${path}`);
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate, currentPath, path]);

  // Only render if this is the current path
  if (currentPath !== path) {
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

  console.log(`ProtectedRoute ${path} rendering component`);
  // Create a match object for compatibility with wouter
  const match = { params: {} };
  try {
    return <Component match={match} />;
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