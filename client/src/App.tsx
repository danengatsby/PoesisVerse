import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Subscribe from "@/pages/Subscribe";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "@/pages/auth-page";
import AddPoem from "@/pages/AddPoem";

// Import our custom router components
import { RouterProvider, Route } from "./lib/SimpleRouter";
import { ProtectedRoute } from "./lib/ProtectedRoute";

function Router() {
  return (
    <>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/subscribe" component={Subscribe} />
      <ProtectedRoute path="/add-poem" component={AddPoem} />
      <Route path="*" component={NotFound} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider>
          <Router />
        </RouterProvider>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
