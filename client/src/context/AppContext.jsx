import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  return (
    <AppContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
