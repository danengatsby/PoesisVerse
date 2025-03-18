import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";

// Import the test router for debugging
import RouterTest from './RouterTest';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterTest />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
