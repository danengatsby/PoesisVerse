import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Subscribe from "@/pages/Subscribe";
import { AuthProvider } from "./context/AuthContext";

// Importăm noul component
import AddPoem from "@/pages/AddPoem";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/add-poem" component={AddPoem} />
      <Route component={NotFound} />
    </Switch>
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
