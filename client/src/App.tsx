import { useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Subscribe from "@/pages/Subscribe";
import { AuthProvider } from "./context/AuthContext";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Importăm noul component
import AddPoem from "@/pages/AddPoem";

// Simple route component
function Route({ path, component: Component }) {
  const [matches] = useRoute(path);
  return matches ? <Component /> : null;
}

function Router() {
  // Check all possible routes
  const [isHome] = useRoute("/");
  const [isAuth] = useRoute("/auth");
  const [isSubscribe] = useRoute("/subscribe");
  const [isAddPoem] = useRoute("/add-poem");
  
  // If none of the routes match, show NotFound
  const isNotFound = !isHome && !isAuth && !isSubscribe && !isAddPoem;
  
  return (
    <>
      {isHome && <Home />}
      {isAuth && <AuthPage />}
      <ProtectedRoute path="/subscribe" component={Subscribe} />
      <ProtectedRoute path="/add-poem" component={AddPoem} />
      {isNotFound && <NotFound />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
