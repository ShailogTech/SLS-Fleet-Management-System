import React, { createContext, useContext, useRef, useCallback } from 'react';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const refreshFnRef = useRef(null);

  // Pages call this on mount to register their fetch function.
  // Returns a cleanup that clears the registration on unmount.
  const registerRefresh = useCallback((fn) => {
    refreshFnRef.current = fn;
  }, []);

  // Header calls this — awaits the registered fetch so spinner stops when done.
  const triggerRefresh = useCallback(async () => {
    if (refreshFnRef.current) {
      await refreshFnRef.current();
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ registerRefresh, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used within a RefreshProvider');
  return ctx;
};
