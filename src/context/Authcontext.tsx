import React, { createContext, useState, useEffect, ReactNode } from "react";

export interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (newToken: string, newUser: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: () => {
    console.warn("Login function not yet provided by AuthProvider");
  },
  logout: () => {
    console.warn("Logout function not yet provided by AuthProvider");
  },
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken: string | null = localStorage.getItem("token");
    const storedUser: string | null = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        console.error(
          "AuthProvider useEffect: Error parsing stored user data from localStorage:",
          error
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user"); 
        setToken(null);
        setUser(null); 
        console.log(
          "AuthProvider useEffect: Cleared invalid data from localStorage."
        );
      }
    } else {
      // console.log("AuthProvider useEffect: No existing token or user found in localStorage.");
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: AuthUser): void => {
    console.log(
      "AuthContext login function called with new token and user data."
    );
    setToken(newToken);
    setUser(newUser);

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    console.log(
      "AuthContext login: User state and localStorage updated. Navigation should happen in the calling component."
    );
  };

  const logout = (): void => {
    console.log("AuthContext logout function called.");
    setToken(null);
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user"); 
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    logout,
  };

  console.log("AuthProvider rendering. Current context value:", contextValue);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;