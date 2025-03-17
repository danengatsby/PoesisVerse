import { createContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

// Definirea interfeței utilizator pentru aplicația noastră
interface User {
  id: number;
  username: string;
  email: string;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isSubscribed: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Funcție pentru verificarea sesiunii curente
  const checkSession = async () => {
    try {
      const response = await apiRequest("GET", "/api/users/profile");
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsSubscribed(userData.isSubscribed);
        setIsLoading(false);
      } else {
        setUser(null);
        setIsSubscribed(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setUser(null);
      setIsSubscribed(false);
      setIsLoading(false);
    }
  };

  // Verifică sesiunea la încărcarea aplicației
  useEffect(() => {
    checkSession();
    
    // Verifică sesiunea la fiecare 5 minute pentru a menține starea actualizată
    const intervalId = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSubscribed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
