import React from 'react';
import { useStorageType } from '@/hooks/useStorageType';

export default function StorageDebug() {
  const { storageType, isSupabase, isIndexedDB } = useStorageType();
  
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Storage Debug</h3>
      <div className="space-y-2">
        <p className="text-sm text-blue-600">
          <strong>Tipo actual:</strong> {storageType}
        </p>
        <p className="text-sm text-blue-600">
          <strong>Supabase:</strong> {isSupabase ? '✅ Activado' : '❌ Desactivado'}
        </p>
        <p className="text-sm text-blue-600">
          <strong>IndexedDB:</strong> {isIndexedDB ? '✅ Activado' : '❌ Desactivado'}
        </p>
      </div>
      <button
        onClick={() => alert(`Storage Debug funcionando!\nTipo: ${storageType}`)}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
      >
        Probar
      </button>
    </div>
  );
}
