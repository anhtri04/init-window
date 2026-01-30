import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Collection, App, RunResult } from '../../shared/types';

interface AppContextType {
  collections: Collection[];
  loading: boolean;
  refreshCollections: () => Promise<void>;
  createCollection: (name: string, apps: App[]) => Promise<Collection>;
  updateCollection: (id: string, updates: { name?: string; apps?: App[] }) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setAutoStart: (id: string) => Promise<void>;
  clearAutoStart: () => Promise<void>;
  runCollection: (id: string) => Promise<RunResult>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCollections = useCallback(async () => {
    const data = await window.electron.getCollections();
    setCollections(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  const createCollection = async (name: string, apps: App[]): Promise<Collection> => {
    const collection = await window.electron.createCollection(name, apps);
    await refreshCollections();
    return collection;
  };

  const updateCollection = async (id: string, updates: { name?: string; apps?: App[] }) => {
    await window.electron.updateCollection(id, updates);
    await refreshCollections();
  };

  const deleteCollection = async (id: string) => {
    await window.electron.deleteCollection(id);
    await refreshCollections();
  };

  const setAutoStart = async (id: string) => {
    await window.electron.setAutoStart(id);
    await refreshCollections();
  };

  const clearAutoStart = async () => {
    await window.electron.clearAutoStart();
    await refreshCollections();
  };

  const runCollection = async (id: string): Promise<RunResult> => {
    return window.electron.runCollection(id);
  };

  return (
    <AppContext.Provider
      value={{
        collections,
        loading,
        refreshCollections,
        createCollection,
        updateCollection,
        deleteCollection,
        setAutoStart,
        clearAutoStart,
        runCollection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
