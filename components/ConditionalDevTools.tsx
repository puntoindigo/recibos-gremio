'use client';

import { useSession } from 'next-auth/react';
import PersistentDevTools from './PersistentDevTools';

export default function ConditionalDevTools() {
  const { data: session } = useSession();
  
  // No mostrar DevTools para ADMIN_REGISTRO
  if (session?.user?.role === 'ADMIN_REGISTRO') {
    return null;
  }
  
  return <PersistentDevTools />;
}

