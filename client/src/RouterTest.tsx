import React from 'react';
import { RouterProvider, Route, Link } from "./lib/SimpleRouter";
import Home from '@/pages/Home';
import AuthPage from '@/pages/auth-page';
import { useAuth } from '@/hooks/useAuth';

// Simple test component for debug info
const DebugPage = () => {
  const auth = useAuth();
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Debug Information</h2>
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold">Auth State:</h3>
        <pre className="text-sm mt-2 bg-white p-2 rounded">
          {JSON.stringify({
            isAuthenticated: auth.isAuthenticated, 
            isLoading: auth.isLoading,
            isSubscribed: auth.isSubscribed,
            user: auth.user ? {
              id: auth.user.id,
              username: auth.user.username,
              email: auth.user.email,
              isSubscribed: auth.user.isSubscribed
            } : null
          }, null, 2)}
        </pre>
      </div>
      <button 
        onClick={() => auth.logout()}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
};

// Router component
const Router = () => {
  return (
    <>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/debug" component={DebugPage} />
    </>
  );
};

// Nav component with links
const Navigation = () => {
  const auth = useAuth();
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex space-x-4">
        <li><Link href="/" className="hover:text-gray-300">Home</Link></li>
        {!auth.isAuthenticated && (
          <li><Link href="/auth" className="hover:text-gray-300">Login/Register</Link></li>
        )}
        <li><Link href="/debug" className="hover:text-gray-300">Debug</Link></li>
        {auth.isAuthenticated && (
          <li>
            <span className="text-green-400 ml-4">
              Logged in as: {auth.user?.username}
            </span>
          </li>
        )}
      </ul>
    </nav>
  );
};

// App component that combines everything
export default function RouterTest() {
  return (
    <RouterProvider>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 p-4">
          <Router />
        </div>
      </div>
    </RouterProvider>
  );
}