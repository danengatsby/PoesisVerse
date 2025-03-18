import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export function useAuth() {
  const { toast } = useToast();

  // Get current user info
  const {
    data: authData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/auth/check", { 
          signal,
          credentials: "include" // Include cookies/session in request
        });
        if (!res.ok) {
          throw new Error("Failed to verify authentication status");
        }
        return res.json();
      } catch (err) {
        console.error("Error checking auth status:", err);
        return { isAuthenticated: false, user: null };
      }
    },
  });
  
  // Extract user from auth data
  const user = authData?.user || null;
  
  // Check subscription status with Stripe
  const {
    data: subscriptionData,
    isLoading: isLoadingSubscription,
  } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      try {
        // Use fetch directly with error handling to avoid apiRequest issues
        const res = await fetch("/api/subscription", {
          method: "GET",
          credentials: "include",
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            return { isActive: false };
          }
          throw new Error("Failed to verify subscription status");
        }
        
        return await res.json();
      } catch (err) {
        console.error("Error checking subscription status:", err);
        return { isActive: false };
      }
    },
    enabled: !!user && !!user.stripeSubscriptionId,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/check"], { 
        isAuthenticated: true, 
        user: userData 
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/check"], { 
        isAuthenticated: true, 
        user: userData 
      });
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout", {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/check"], { 
        isAuthenticated: false, 
        user: null 
      });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string) => {
    return registerMutation.mutateAsync({ username, email, password });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  // Determine actual subscription status by combining database and Stripe status
  const isSubscribed = user?.isSubscribed === true || (subscriptionData?.isActive === true);
  
  // Allow subscribing if not already subscribed
  const subscribeUser = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe",
        variant: "destructive",
      });
      return;
    }
    
    // Redirect to subscription page
    window.location.href = "/subscribe";
  };
  
  // Refresh subscription status
  const refreshSubscription = async () => {
    if (!user) return;
    await queryClient.refetchQueries({ queryKey: ["/api/subscription"] });
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || isLoadingSubscription,
    error,
    isSubscribed,
    subscriptionDetails: subscriptionData?.subscription,
    login,
    register,
    logout,
    subscribe: subscribeUser,
    refreshSubscription,
  };
}