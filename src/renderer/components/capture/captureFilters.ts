import type { App } from '../../../shared/types';

const USER_APP_EXCEPTIONS = [
  'visual studio code',
  'vscode',
  'visual studio',
  'azure data studio',
  'sql server management studio',
  'ssms',
  'windows terminal',
  'powershell',
  'powertoys',
  'dotnet',
  'microsoft edge',
  'microsoft teams',
  'skype',
  'outlook',
  'onenote',
  'microsoft to do',
  'microsoft whiteboard',
  'onedrive',
  'xbox',
  'minecraft',
];

export function isUserApp(app: App): boolean {
  const lowerName = app.name.toLowerCase();
  const lowerPath = app.path.toLowerCase();

  const isException = USER_APP_EXCEPTIONS.some(
    (exception) => lowerName.includes(exception) || lowerPath.includes(exception)
  );

  if (isException) return true;

  return (
    !lowerPath.includes('microsoft') &&
    !lowerPath.includes('windows') &&
    !lowerPath.startsWith('c:\\windows') &&
    !lowerPath.startsWith('c:\\programdata') &&
    !lowerName.startsWith('windows')
  );
}
