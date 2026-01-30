import { App, Collection, AppSettings, RunResult } from '../shared/types';
declare const electronAPI: {
    scanProcesses: () => Promise<App[]>;
    getCollections: () => Promise<Collection[]>;
    getCollection: (id: string) => Promise<Collection | undefined>;
    createCollection: (name: string, apps: App[]) => Promise<Collection>;
    updateCollection: (id: string, updates: {
        name?: string;
        apps?: App[];
    }) => Promise<Collection | null>;
    deleteCollection: (id: string) => Promise<boolean>;
    setAutoStart: (id: string) => Promise<Collection | null>;
    clearAutoStart: () => Promise<void>;
    runCollection: (id: string) => Promise<RunResult>;
    getSettings: () => Promise<AppSettings>;
    updateSettings: (settings: AppSettings) => Promise<AppSettings>;
    enableAutoStart: () => Promise<void>;
    disableAutoStart: () => Promise<void>;
    isAutoStartEnabled: () => Promise<boolean>;
};
export type ElectronAPI = typeof electronAPI;
export {};
//# sourceMappingURL=index.d.ts.map