import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const context = useContext(AuthContext);
  const { toast } = useToast();

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sign in");
      }
      
      const userData = await response.json();
      // Context will be updated via the AuthContext useEffect that checks the session
      
      toast({
        title: "Success",
        description: "You are now logged in.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/register", { 
        username, 
        email, 
        password 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      
      const userData = await response.json();
      // Context will be updated via the AuthContext useEffect that checks the session
      
      toast({
        title: "Success",
        description: "Account created successfully.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      const response = await apiRequest("POST", "/api/logout", {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to log out");
      }
      
      // Context will be updated via the AuthContext useEffect that checks the session
      
      toast({
        title: "Success",
        description: "You have been logged out.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    ...context,
    login,
    register,
    logout,
  };
}
