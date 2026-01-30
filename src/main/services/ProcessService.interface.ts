import { App } from '../../shared/types';

export interface ProcessService {
  scanRunningProcesses(): Promise<App[]>;
  isProcessRunning(executablePath: string): Promise<boolean>;
  launchApp(executablePath: string): Promise<void>;
  extractIcon(executablePath: string): Promise<string | undefined>;
}
