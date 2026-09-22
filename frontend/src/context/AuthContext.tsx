import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext, type User } from "./useAuth";

function readSavedSession(): { token: string | null; user: User | null } {
  const savedToken = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  if (!savedToken || !savedUser) return { token: null, user: null };

  try {
    return { token: savedToken, user: JSON.parse(savedUser) as User };
  } catch {
    return { token: null, user: null };
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSavedSession().user);
  const [token, setToken] = useState<string | null>(() => readSavedSession().token);

  // Called on successful login — store in state AND localStorage
  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

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