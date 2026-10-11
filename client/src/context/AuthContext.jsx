// Keeps track of who is logged in and shares it with the whole app.
//
//   const { user, login, logout } = useAuth();
//
// Remember: this only decides what the screen SHOWS. The backend checks the
// token and the role again on every single request.

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { onSessionExpired, tokenStorage } from '../api/axiosClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while the saved token is being checked
  const [sessionExpired, setSessionExpired] = useState(false);

  // On first load: if a token was saved earlier, ask the server who it belongs to.
  useEffect(() => {
    onSessionExpired(() => {
      tokenStorage.clear();
      setUser(null);
      setSessionExpired(true);
    });

    if (!tokenStorage.get()) {
      setLoading(false);
      return;
    }

    authApi
      .getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    tokenStorage.set(result.token);
    setSessionExpired(false);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSessionExpired(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout }),
    [user, loading, sessionExpired, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
