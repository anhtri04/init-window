import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { CaptureAndBuildScreen } from './components/screens/CaptureAndBuildScreen';
import { CollectionsListScreen } from './components/screens/CollectionsListScreen';
import { EditCollectionScreen } from './components/screens/EditCollectionScreen';

type Screen = 'capture' | 'collections' | 'edit';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('capture');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setScreen('edit');
  };

  const handleEditComplete = () => {
    setEditingId(null);
    setScreen('collections');
  };

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
            className={`flex-1 py-3 text-sm font-medium ${
              screen === 'capture'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            Capture
          </button>
          <button
            onClick={() => setScreen('collections')}
            className={`flex-1 py-3 text-sm font-medium ${
              screen === 'collections'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            Collections
          </button>
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
