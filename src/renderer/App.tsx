import React, { useState, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ShortcutBar } from './components/shared/ShortcutBar';
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

  const handleBackToCapture = useCallback(() => {
    setScreen('capture');
  }, []);

  // Global navigation shortcuts
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

  return (
    <div className="h-screen flex flex-col bg-cream">
      {/* Screen content */}
      <div className="flex-1 overflow-hidden">
        {screen === 'capture' && (
          <CaptureAndBuildScreen onBuildComplete={() => setScreen('collections')} />
        )}
        {screen === 'collections' && (
          <CollectionsListScreen onEdit={handleEdit} />
        )}
        {screen === 'edit' && editingId && (
          <EditCollectionScreen
            collectionId={editingId}
            onSave={handleEditComplete}
            onCancel={handleEditComplete}
          />
        )}
      </div>

      {/* Bottom navigation */}
      {screen !== 'edit' && (
        <div className="border-t bg-white flex">
          <button
            onClick={() => setScreen('capture')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              screen === 'capture'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Capture
          </button>
          <button
            onClick={() => setScreen('collections')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              screen === 'collections'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Collections
          </button>
        </div>
      )}

      {/* Keyboard shortcut hints */}
      {/* {screen === 'capture' && (
        <ShortcutBar
          shortcuts={[
            { key: 'Ctrl+1', label: 'Capture' },
            { key: 'Ctrl+2', label: 'Collections' },
          ]}
        />
      )}
      {screen === 'collections' && (
        <ShortcutBar
          shortcuts={[
            { key: 'Ctrl+1', label: 'Capture' },
            { key: 'Ctrl+2', label: 'Collections' },
          ]}
        />
      )}
      {screen === 'edit' && (
        <ShortcutBar
          shortcuts={[
            { key: 'Ctrl+S', label: 'Save' },
            { key: 'Esc', label: 'Cancel' },
          ]}
        />
      )} */}
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