import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { AppMetric, CollectionMetric } from '../../shared/types';
import { MetricsService } from './MetricsService.interface';
import { collectionService } from './CollectionService';

const execAsync = promisify(exec);

interface WindowsProcessMetricRow {
  processId?: number;
  name?: string;
  executablePath?: string;
  creationDate?: string;
  workingSetSize?: number;
  cpuPercent?: number;
  elapsedTime?: number;
}

class WindowsMetricsService implements MetricsService {
  async getCollectionMetrics(collectionId: string): Promise<CollectionMetric | null> {
    const collection = collectionService.get(collectionId);

    if (!collection) {
      return null;
    }

    const processRows = await this.getProcessMetricRows();
    const now = new Date();

    const apps: AppMetric[] = collection.apps.map((app) => {
      const matchingRows = this.findMatchingProcessRows(app.path, processRows);
      const memoryBytes = matchingRows.reduce((sum, row) => sum + Number(row.workingSetSize ?? 0), 0);
      const cpuPercent = matchingRows.reduce((sum, row) => sum + Number(row.cpuPercent ?? 0), 0);
      const pidList = matchingRows
        .map((row) => Number(row.processId))
        .filter((pid) => Number.isFinite(pid) && pid > 0);

      const startedDates = matchingRows
        .map((row) => this.parseDate(row.creationDate))
        .filter((date): date is Date => Boolean(date));
      const oldestStartedAt = startedDates.length > 0
        ? new Date(Math.min(...startedDates.map((date) => date.getTime())))
        : undefined;

      const elapsedTimes = matchingRows
        .map((row) => Number(row.elapsedTime))
        .filter((seconds) => Number.isFinite(seconds) && seconds > 0);
      const uptimeSeconds = oldestStartedAt
        ? Math.max(0, Math.floor((now.getTime() - oldestStartedAt.getTime()) / 1000))
        : elapsedTimes.length > 0
          ? Math.max(...elapsedTimes)
          : undefined;

      return {
        appId: app.id,
        name: app.name,
        path: app.path,
        icon: app.icon,
        isRunning: matchingRows.length > 0,
        processCount: matchingRows.length,
        cpuPercent: this.round(cpuPercent, 1),
        memoryMB: this.round(memoryBytes / 1024 / 1024, 1),
        uptimeSeconds,
        startedAt: oldestStartedAt?.toISOString(),
        pidList,
      };
    });

    return {
      collectionId,
      totalApps: collection.apps.length,
      runningApps: apps.filter((app) => app.isRunning).length,
      totalCpuPercent: this.round(apps.reduce((sum, app) => sum + app.cpuPercent, 0), 1),
      totalMemoryMB: this.round(apps.reduce((sum, app) => sum + app.memoryMB, 0), 1),
      longestUptimeSeconds: apps.reduce(
        (max, app) => Math.max(max, app.uptimeSeconds ?? 0),
        0
      ),
      apps,
      updatedAt: now.toISOString(),
    };
  }

  private async getProcessMetricRows(): Promise<WindowsProcessMetricRow[]> {
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      $perfMap = @{}
      Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
        Where-Object { $_.IDProcess -gt 0 } |
        ForEach-Object { $perfMap[[int]$_.IDProcess] = $_ }

      $rows = Get-CimInstance Win32_Process | ForEach-Object {
        $perf = $perfMap[[int]$_.ProcessId]
        [PSCustomObject]@{
          processId = [int]$_.ProcessId
          name = $_.Name
          executablePath = $_.ExecutablePath
          creationDate = if ($_.CreationDate) { $_.CreationDate.ToString('o') } else { $null }
          workingSetSize = if ($_.WorkingSetSize) { [double]$_.WorkingSetSize } else { 0 }
          cpuPercent = if ($perf) { [double]$perf.PercentProcessorTime } else { 0 }
          elapsedTime = if ($perf) { [double]$perf.ElapsedTime } else { $null }
        }
      }

      $rows | ConvertTo-Json -Depth 3 -Compress
    `;

    const psBase64 = Buffer.from(psScript, 'utf16le').toString('base64');
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${psBase64}`;
    const { stdout } = await execAsync(command, { maxBuffer: 20 * 1024 * 1024, timeout: 15000 });
    const trimmed = stdout.trim();

    if (!trimmed) {
      return [];
    }

    const parsed = JSON.parse(trimmed) as WindowsProcessMetricRow[] | WindowsProcessMetricRow;
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  private findMatchingProcessRows(
    executablePath: string,
    rows: WindowsProcessMetricRow[]
  ): WindowsProcessMetricRow[] {
    const normalizedPath = executablePath.toLowerCase();
    const executableName = path.basename(executablePath).toLowerCase();

    return rows.filter((row) => {
      const rowPath = row.executablePath?.toLowerCase();
      const rowName = row.name?.toLowerCase();

      return rowPath ? rowPath === normalizedPath : rowName === executableName;
    });
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}

export const metricsService = new WindowsMetricsService();
