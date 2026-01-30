export interface App {
  id: string;
  name: string;
  path: string;
  icon?: string;
}

export interface Collection {
  id: string;
  name: string;
  apps: App[];
  isAutoStart: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  autoStartDelay: number;
  showNotifications: boolean;
  minimizeToTray: boolean;
}

export interface AppData {
  collections: Collection[];
  settings: AppSettings;
}

export interface RunResultItem {
  app: string;
  reason?: string;
}

export interface RunResult {
  launched: string[];
  skipped: RunResultItem[];
  failed: RunResultItem[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoStartDelay: 15,
  showNotifications: true,
  minimizeToTray: true,
};
