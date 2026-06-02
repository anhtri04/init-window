import React from 'react';
import { Collection, CollectionMetric, RunResult, AppMetric } from '../../../shared/types';
import { Button } from '../shared/Button';

interface CollectionDetailPanelProps {
  collection?: Collection;
  metric: CollectionMetric | null;
  metricsLoading: boolean;
  metricsError: string | null;
  running: boolean;
  runResult: RunResult | null;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAutoStart: () => void;
  onRefresh: () => void;
  onDismissRunResult: () => void;
}

function formatMemory(memoryMB?: number): string {
  if (!memoryMB) return '--';
  return memoryMB >= 1024 ? `${(memoryMB / 1024).toFixed(1)} GB` : `${Math.round(memoryMB)} MB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(1, minutes)}m`;
}

function formatUpdatedAt(value?: string): string {
  if (!value) return 'Not updated yet';
  return `Last updated ${new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-canvas p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.4px] text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate">{helper}</p>
    </div>
  );
}

function AppIcon({ app }: { app: AppMetric }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-green-soft text-sm font-semibold text-brand-green-dark">
      {app.icon ? (
        <img src={`file://${app.icon}`} alt="" className="h-full w-full object-contain" />
      ) : (
        app.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function AppMetricRow({ app }: { app: AppMetric }) {
  return (
    <div className="grid grid-cols-[minmax(180px,1fr)_110px_90px_100px_110px_90px] items-center gap-3 border-t border-hairline-soft px-4 py-3 text-sm first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <AppIcon app={app} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{app.name}</p>
          <p className="truncate text-xs text-steel">{app.path}</p>
        </div>
      </div>
      <div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            app.isRunning ? 'bg-brand-green-soft text-brand-green-dark' : 'bg-surface text-steel'
          }`}
        >
          {app.isRunning ? 'Running' : 'Not running'}
        </span>
      </div>
      <p className="font-semibold text-charcoal">{app.isRunning ? `${app.cpuPercent.toFixed(1)}%` : '--'}</p>
      <p className="font-semibold text-charcoal">{app.isRunning ? formatMemory(app.memoryMB) : '--'}</p>
      <p className="text-slate">{formatDuration(app.uptimeSeconds)}</p>
      <p className="text-slate">{app.isRunning ? app.processCount : '--'}</p>
    </div>
  );
}

export function CollectionDetailPanel({
  collection,
  metric,
  metricsLoading,
  metricsError,
  running,
  runResult,
  onRun,
  onEdit,
  onDelete,
  onToggleAutoStart,
  onRefresh,
  onDismissRunResult,
}: CollectionDetailPanelProps) {
  if (!collection) {
    return (
      <main className="flex flex-1 items-center justify-center bg-surface-soft p-5">
        <div className="rounded-xl border border-hairline bg-canvas p-6 text-center text-slate">
          Select a collection to view metrics.
        </div>
      </main>
    );
  }

  const apps = metric?.apps ?? collection.apps.map((app) => ({
    appId: app.id,
    name: app.name,
    path: app.path,
    icon: app.icon,
    isRunning: false,
    processCount: 0,
    cpuPercent: 0,
    memoryMB: 0,
    pidList: [],
  }));

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-surface-soft">
      <div className="border-b border-hairline bg-canvas px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel">Collection dashboard</p>
        <h1 className="mt-1 text-3xl font-medium leading-tight tracking-[-0.5px] text-ink">
          {collection.name}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-hairline bg-canvas px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onRun} disabled={running} size="sm">
                {running ? 'Launching...' : '▶ Run'}
              </Button>
              <Button onClick={onEdit} variant="secondary" size="sm">
                ✎ Edit
              </Button>
              <Button onClick={onDelete} variant="danger" size="sm">
                🗑 Delete
              </Button>
              <Button
                onClick={onToggleAutoStart}
                variant={collection.isAutoStart ? 'primary' : 'secondary'}
                size="sm"
              >
                {collection.isAutoStart ? '★ Auto Start' : '☆ Auto Start'}
              </Button>
              <Button onClick={onRefresh} variant="secondary" size="sm" disabled={metricsLoading}>
                {metricsLoading ? '⟳ Updating...' : '⟳ Refresh'}
              </Button>
            </div>

            <div className="text-xs font-medium text-steel">
              {metricsError ? 'Update failed' : metricsLoading && !metric ? 'Updating...' : formatUpdatedAt(metric?.updatedAt)}
            </div>
          </div>

          {runResult && (
            <div className="rounded-xl border border-hairline bg-canvas p-4 text-sm">
              <div className="flex justify-between gap-4">
                <div className="space-y-1">
                  {runResult.launched.length > 0 && (
                    <p className="text-brand-green-dark">Launched: {runResult.launched.join(', ')}</p>
                  )}
                  {runResult.skipped.length > 0 && (
                    <p className="text-slate">Skipped: {runResult.skipped.map((item) => item.app).join(', ')}</p>
                  )}
                  {runResult.failed.length > 0 && (
                    <p className="text-red-700">Failed: {runResult.failed.map((item) => item.app).join(', ')}</p>
                  )}
                </div>
                <button onClick={onDismissRunResult} className="text-steel hover:text-ink">×</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label="Running"
              value={`${metric?.runningApps ?? 0} / ${collection.apps.length}`}
              helper="apps active"
            />
            <MetricCard
              label="CPU Usage"
              value={metric ? `${metric.totalCpuPercent.toFixed(1)}%` : '--'}
              helper="total collection CPU"
            />
            <MetricCard
              label="Memory"
              value={metric ? formatMemory(metric.totalMemoryMB) : '--'}
              helper="working set total"
            />
            <MetricCard
              label="Runtime"
              value={formatDuration(metric?.longestUptimeSeconds)}
              helper="longest active app"
            />
          </div>

          {metricsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {metricsError}
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-hairline bg-canvas">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apps in collection</h2>
                <p className="text-sm text-slate">Status, CPU, memory, runtime, and process count.</p>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(180px,1fr)_110px_90px_100px_110px_90px] gap-3 border-t border-hairline bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-steel">
              <span>App</span>
              <span>Status</span>
              <span>CPU</span>
              <span>Memory</span>
              <span>Runtime</span>
              <span>Processes</span>
            </div>

            <div>
              {apps.length === 0 ? (
                <div className="border-t border-hairline-soft px-4 py-8 text-center text-sm text-slate">
                  This collection has no apps yet.
                </div>
              ) : (
                apps.map((app) => <AppMetricRow key={app.appId} app={app} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
