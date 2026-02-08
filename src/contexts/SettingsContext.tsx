import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { hasStoredKey } from '@/services/cryptoService';

// --- State ---

interface SettingsState {
  apiKeyConfigured: boolean;
}

const initialState: SettingsState = {
  apiKeyConfigured: false,
};

// --- Actions ---

type SettingsAction = { type: 'KEY_SAVED' } | { type: 'KEY_CLEARED' };

// --- Reducer ---

function settingsReducer(
  state: SettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case 'KEY_SAVED':
      return { ...state, apiKeyConfigured: true };
    case 'KEY_CLEARED':
      return { ...state, apiKeyConfigured: false };
    default:
      return state;
  }
}

// --- Context ---

interface SettingsContextValue {
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

// --- Provider ---

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  useEffect(() => {
    if (hasStoredKey()) {
      dispatch({ type: 'KEY_SAVED' });
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
      {children}
    </SettingsContext.Provider>
  );
}

// --- Hook ---

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
