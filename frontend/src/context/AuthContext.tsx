import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

// The shape of a logged-in user (matches what the backend returns)
interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
}

// What the context makes available to the app
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Create the context (undefined until a Provider supplies a value)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The Provider wraps the app and holds the actual state
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // On first load, restore any saved session from localStorage
  // (this is what keeps the user logged in across page refreshes)
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Called on successful login — store in state AND localStorage
  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  // Called on logout — clear state AND localStorage
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components can read the context easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}