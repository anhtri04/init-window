import React, { useState, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CaptureAndBuildScreen } from './components/screens/CaptureAndBuildScreen';
import { CollectionsListScreen } from './components/screens/CollectionsListScreen';
import { EditCollectionScreen } from './components/screens/EditCollectionScreen';

type Screen = 'capture' | 'collections' | 'edit';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('capture');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setScreen('edit');
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditingId(null);
    setScreen('collections');
  }, []);

  useKeyboardShortcuts(
    [
      {
        key: '1',
        ctrl: true,
        action: () => setScreen('capture'),
        description: 'Capture tab',
      },
      {
        key: '2',
        ctrl: true,
        action: () => setScreen('collections'),
        description: 'Collections tab',
      },
    ],
    screen !== 'edit'
  );

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? 'bg-brand-teal-deep text-on-dark' : 'text-slate active:bg-canvas'
    }`;

  return (
    <div className="h-screen flex flex-col bg-surface-soft text-ink">
      <div className="flex-1 overflow-hidden">
        {screen === 'capture' && (
          <CaptureAndBuildScreen onBuildComplete={() => setScreen('collections')} />
        )}
        {screen === 'collections' && <CollectionsListScreen onEdit={handleEdit} />}
        {screen === 'edit' && editingId && (
          <EditCollectionScreen
            collectionId={editingId}
            onSave={handleEditComplete}
            onCancel={handleEditComplete}
          />
        )}
      </div>

      {screen !== 'edit' && (
        <div className="border-t border-hairline bg-canvas p-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
            <button onClick={() => setScreen('capture')} className={tabClass(screen === 'capture')}>
              Capture
            </button>
            <button
              onClick={() => setScreen('collections')}
              className={tabClass(screen === 'collections')}
            >
              Collections
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
