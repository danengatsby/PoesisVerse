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

  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentPath === path) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate, currentPath, path]);

  // Only render if this is the current path
  if (currentPath !== path) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Create a match object for compatibility with wouter
  const match = { params: {} };
  return <Component match={match} />;
}