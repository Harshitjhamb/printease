import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "./api";

const AuthCtx = createContext(null);

const LS_KEYS = {
  activeMode: "activeMode", // 'user' | 'admin'
  tokenUser: "token_user",
  userUser: "user_user",
  tokenAdmin: "token_admin",
  userAdmin: "user_admin"
};

function readJson(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  const [activeMode, setActiveMode] = useState(() => localStorage.getItem(LS_KEYS.activeMode) || "user");
  const [tokenUser, setTokenUser] = useState(() => localStorage.getItem(LS_KEYS.tokenUser) || "");
  const [userUser, setUserUser] = useState(() => readJson(LS_KEYS.userUser));
  const [tokenAdmin, setTokenAdmin] = useState(() => localStorage.getItem(LS_KEYS.tokenAdmin) || "");
  const [userAdmin, setUserAdmin] = useState(() => readJson(LS_KEYS.userAdmin));

  useEffect(() => {
    localStorage.setItem(LS_KEYS.activeMode, activeMode);
  }, [activeMode]);

  useEffect(() => {
    // set axios auth header from active mode
    const activeToken = activeMode === "admin" ? tokenAdmin : tokenUser;
    setAuthToken(activeToken);
  }, [activeMode, tokenAdmin, tokenUser]);

  useEffect(() => {
    if (tokenUser) localStorage.setItem(LS_KEYS.tokenUser, tokenUser);
    else localStorage.removeItem(LS_KEYS.tokenUser);
  }, [tokenUser]);

  useEffect(() => {
    if (userUser) localStorage.setItem(LS_KEYS.userUser, JSON.stringify(userUser));
    else localStorage.removeItem(LS_KEYS.userUser);
  }, [userUser]);

  useEffect(() => {
    if (tokenAdmin) localStorage.setItem(LS_KEYS.tokenAdmin, tokenAdmin);
    else localStorage.removeItem(LS_KEYS.tokenAdmin);
  }, [tokenAdmin]);

  useEffect(() => {
    if (userAdmin) localStorage.setItem(LS_KEYS.userAdmin, JSON.stringify(userAdmin));
    else localStorage.removeItem(LS_KEYS.userAdmin);
  }, [userAdmin]);

  const activeToken = activeMode === "admin" ? tokenAdmin : tokenUser;
  const activeUser = activeMode === "admin" ? userAdmin : userUser;

  const value = useMemo(
    () => ({
      // active session
      activeMode,
      token: activeToken,
      user: activeUser,
      isAuthed: Boolean(activeToken && activeUser),

      // session availability (for switcher)
      hasUserSession: Boolean(tokenUser && userUser),
      hasAdminSession: Boolean(tokenAdmin && userAdmin),

      switchMode(mode) {
        setActiveMode(mode);
      },

      async loginAs(mode, email, password) {
        const { data } = await api.post("/auth/login", { email, password });
        if (mode === "admin" && data.user?.role !== "admin") {
          throw new Error("This account is not an admin.");
        }
        if (mode === "admin") {
          setTokenAdmin(data.token);
          setUserAdmin(data.user);
          setActiveMode("admin");
        } else {
          setTokenUser(data.token);
          setUserUser(data.user);
          setActiveMode("user");
        }
        return data;
      },

      async signup(name, email, phone, rollNo, password) {
        const { data } = await api.post("/auth/signup", { name, email, phone, rollNo, password });
        setTokenUser(data.token);
        setUserUser(data.user);
        setActiveMode("user");
        return data;
      },

      logout(mode = activeMode) {
        if (mode === "admin") {
          setTokenAdmin("");
          setUserAdmin(null);
          if (activeMode === "admin") setActiveMode("user");
        } else {
          setTokenUser("");
          setUserUser(null);
          if (activeMode === "user") setActiveMode("admin");
        }
      }
    }),
    [activeMode, activeToken, activeUser, tokenUser, userUser, tokenAdmin, userAdmin]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
