import { createContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  subscribe: () => void;
}

// Valori inițiale pentru context
const initialContextValues: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isSubscribed: false,
  checkSession: async () => {},
  login: async () => { throw new Error("Not implemented"); },
  register: async () => { throw new Error("Not implemented"); },
  logout: async () => {}
};

export const AuthContext = createContext<AuthContextType>(initialContextValues);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  // Funcție pentru verificarea sesiunii curente
  const checkSession = async () => {
    try {
      const response = await apiRequest("GET", "/api/users/profile");
      // Dacă ajungem aici, înseamnă că request-ul a fost reușit (nu s-a aruncat excepție)
      const userData = await response.json();
      setUser(userData);
      setIsSubscribed(userData.isSubscribed);
      setIsLoading(false);
    } catch (error) {
      // Gestionăm erorile silențios pentru verificarea sesiunii
      // console.error("Error checking session:", error); 
      setUser(null);
      setIsSubscribed(false);
      setIsLoading(false);
    }
  };

  // Funcție pentru autentificare
  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const userData = await response.json();
      setUser(userData);
      setIsSubscribed(userData.isSubscribed);
      return userData;
    } catch (error: any) {
      toast({
        title: "Autentificare eșuată",
        description: error.message || "A apărut o eroare la autentificare",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Funcție pentru înregistrare
  const register = async (username: string, email: string, password: string): Promise<User> => {
    try {
      const response = await apiRequest("POST", "/api/register", { username, email, password });
      const userData = await response.json();
      setUser(userData);
      setIsSubscribed(userData.isSubscribed);
      return userData;
    } catch (error: any) {
      toast({
        title: "Înregistrare eșuată",
        description: error.message || "A apărut o eroare la înregistrare",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Funcție pentru deconectare
  const logout = async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/logout");
      setUser(null);
      setIsSubscribed(false);
      toast({
        title: "Deconectat cu succes",
        description: "Ați fost deconectat de la cont",
      });
    } catch (error: any) {
      toast({
        title: "Deconectare eșuată",
        description: error.message || "A apărut o eroare la deconectare",
        variant: "destructive",
      });
      throw error;
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
        checkSession,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
