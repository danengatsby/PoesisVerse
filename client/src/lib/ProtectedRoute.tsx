import { useEffect } from 'react';
import { useRouter } from './SimpleRouter';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { currentPath, navigateTo } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigateTo('/auth');
    }
  }, [isLoading, isAuthenticated, navigateTo]);

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

  if (currentPath === path) {
    return <Component />;
  }

  return null;
}