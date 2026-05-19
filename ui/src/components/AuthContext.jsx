import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearToken, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState(() => getToken());

  useEffect(() => {
    function handleLogout() {
      clearToken();
      setTokenState(null);
      queryClient.clear();
    }

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [queryClient]);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login(nextToken) {
        setToken(nextToken);
        setTokenState(nextToken);
      },
      logout() {
        clearToken();
        setTokenState(null);
        queryClient.clear();
      }
    }),
    [queryClient, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
