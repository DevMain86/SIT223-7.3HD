import { createContext, useContext } from "react";

// The shape of a logged-in user (matches what the backend returns)
export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
}

// What the context makes available to the app
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Create the context (undefined until a Provider supplies a value)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook so components can read the context easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}