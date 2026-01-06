'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BarChart3, 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  Database, 
  CheckSquare, 
  BookOpen, 
  Settings,
  Percent,
  Building2,
  ClipboardList
} from 'lucide-react';

export interface ConfigurationState {
  // Paneles de Debug
  showDebugPanel: boolean;
  showUploadSessions: boolean;
  showDatabaseDebug: boolean;
  showConsoleLogs: boolean;
  showPerformanceMetrics: boolean;
  
  // Opciones Visuales
  dropdownStyle: 'matrix' | 'cyber' | 'holographic' | 'tech';
  fontFamily: 'inter' | 'mono' | 'serif' | 'system';
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  colorScheme: 'default' | 'dark' | 'matrix' | 'cyber' | 'holographic';
  
  // Herramientas del Sistema
  enablePendingItems: boolean;
  enableUserManagement: boolean;
  enableEmployeeManagement: boolean;
  enableCompanyManagement: boolean;
  enableBackupSystem: boolean;
  enableControlSystem: boolean;
  enableDiscountsSystem: boolean;
  enableReceiptsSystem: boolean;
  enableExportSystem: boolean;
  enableDocumentation: boolean;
  enableSupabaseStorage: boolean;
}

const defaultConfig: ConfigurationState = {
  // Paneles de Debug
  showDebugPanel: false,
  showUploadSessions: false,
  showDatabaseDebug: false,
  showConsoleLogs: false,
  showPerformanceMetrics: false,
  
  // Opciones Visuales
  dropdownStyle: 'matrix',
  fontFamily: 'inter',
  fontSize: 'base',
  colorScheme: 'default',
  
  // Herramientas del Sistema
  enablePendingItems: true,
  enableUserManagement: true,
  enableEmployeeManagement: true,
  enableCompanyManagement: true,
  enableBackupSystem: true,
  enableControlSystem: true,
  enableDiscountsSystem: true,
  enableReceiptsSystem: true,
  enableExportSystem: true,
  enableDocumentation: true,
  enableSupabaseStorage: false,
};

interface ConfigurationContextType {
  config: ConfigurationState;
  isLoaded: boolean;
  saveConfiguration: (newConfig: Partial<ConfigurationState>) => void;
  resetConfiguration: () => void;
  getFilteredNavigationItems: () => any[];
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const ConfigurationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ConfigurationState>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar configuración desde localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('app-configuration');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Guardar configuración
  const saveConfiguration = useCallback((newConfig: Partial<ConfigurationState>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    localStorage.setItem('app-configuration', JSON.stringify(updatedConfig));
  }, [config]);

  // Resetear configuración
  const resetConfiguration = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.setItem('app-configuration', JSON.stringify(defaultConfig));
  }, []);

  // Obtener elementos de navegación filtrados
  const getFilteredNavigationItems = useCallback(() => {
    
    const items = [
      { 
        id: 'tablero', 
        label: 'Dashboard', 
        icon: BarChart3, 
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        activeBgColor: 'bg-indigo-100',
        shortcut: 'H',
        enabledConfigKey: null
      },
      { 
        id: 'recibos', 
        label: 'Recibos', 
        icon: FileText, 
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        activeBgColor: 'bg-blue-100',
        shortcut: 'R',
        enabledConfigKey: 'enableReceiptsSystem'
      },
      { 
        id: 'control', 
        label: 'Control', 
        icon: Shield, 
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        activeBgColor: 'bg-green-100',
        shortcut: 'C',
        enabledConfigKey: 'enableControlSystem'
      },
      { 
        id: 'export', 
        label: 'Exportar', 
        icon: CreditCard, 
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        activeBgColor: 'bg-purple-100',
        shortcut: 'X',
        enabledConfigKey: 'enableExportSystem'
      },
      { 
        id: 'descuentos', 
        label: 'Descuentos', 
        icon: Percent, 
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        activeBgColor: 'bg-orange-100',
        shortcut: 'D',
        enabledConfigKey: 'enableDiscountsSystem'
      },
      { 
        id: 'empleados', 
        label: 'Empleados', 
        icon: Users, 
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        activeBgColor: 'bg-emerald-100',
        shortcut: 'E',
        permission: 'empleados',
        enabledConfigKey: 'enableEmployeeManagement'
      },
      { 
        id: 'empresas', 
        label: 'Empresas', 
        icon: Building2, 
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        activeBgColor: 'bg-cyan-100',
        shortcut: 'M',
        permission: 'empresas',
        enabledConfigKey: 'enableCompanyManagement'
      },
      { 
        id: 'accesos', 
        label: 'Accesos', 
        icon: ClipboardList, 
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
        activeBgColor: 'bg-violet-100',
        shortcut: 'A',
        permission: 'accesos',
        enabledConfigKey: null
      },
      { 
        id: 'usuarios', 
        label: 'Usuarios', 
        icon: Users, 
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        activeBgColor: 'bg-red-100',
        shortcut: 'U',
        enabledConfigKey: 'enableUserManagement'
      },
      { 
        id: 'backup', 
        label: 'Backup', 
        icon: Database, 
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        activeBgColor: 'bg-teal-100',
        shortcut: 'B',
        enabledConfigKey: 'enableBackupSystem'
      },
      { 
        id: 'pending-items', 
        label: 'Pendientes', 
        icon: CheckSquare, 
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        activeBgColor: 'bg-emerald-100',
        shortcut: 'P',
        enabledConfigKey: 'enablePendingItems'
      },
      { 
        id: 'documentacion', 
        label: 'Documentación', 
        icon: BookOpen, 
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        activeBgColor: 'bg-cyan-100',
        shortcut: 'O',
        enabledConfigKey: 'enableDocumentation'
      },
      { 
        id: 'configuracion', 
        label: 'Configuración', 
        icon: Settings, 
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        activeBgColor: 'bg-gray-100',
        shortcut: 'F',
        enabledConfigKey: null
      },
    ];

    const filteredItems = items.filter(item => {
      // Si tiene permiso definido, verificar primero el permiso
      if (item.permission) {
        if (!canAccess(item.permission)) {
          return false;
        }
      }
      
      // Luego verificar si está habilitado en la configuración
      if (item.enabledConfigKey === null) {
        return true;
      }
      // @ts-ignore
      const isEnabled = (config as any)[item.enabledConfigKey];
      return isEnabled;
    });
    
    return filteredItems;
  }, [config, session]);

  return (
    <ConfigurationContext.Provider value={{
      config,
      isLoaded,
      saveConfiguration,
      resetConfiguration,
      getFilteredNavigationItems
    }}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};
