'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Palette, 
  Type, 
  Monitor, 
  Zap,
  Matrix,
  Sparkles,
  Bug,
  Database,
  FileText,
  Users,
  UserCheck,
  Building2,
  Shield,
  BarChart3,
  ChevronDown,
  Check,
  X,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import ConceptUnificationModal from './ConceptUnificationModal';

const ConfigurationPanel: React.FC = () => {
  const { config, saveConfiguration, resetConfiguration } = useConfiguration();
  const [showConceptUnification, setShowConceptUnification] = useState(false);

  const handleStorageToggle = async (checked: boolean) => {
    if (checked) {
      // Verificar si Supabase está configurado
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        toast.error('❌ Supabase no configurado', {
          description: 'Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local',
          duration: 5000
        });
        return;
      }
      
      // Verificar si hay datos migrados
      try {
        // Aquí podrías verificar si hay datos en Supabase
        toast.warning('⚠️ Verificación requerida', {
          description: 'Asegúrate de haber migrado los datos a Supabase antes de activar',
          duration: 4000
        });
      } catch (error) {
        toast.error('❌ Error de conexión', {
          description: 'No se pudo conectar con Supabase. Verifica la configuración.',
          duration: 5000
        });
        return;
      }
    }
    
    handleSaveConfiguration({ enableSupabaseStorage: checked });
  };

  const handleSaveConfiguration = (newConfig: Partial<typeof config>) => {
    saveConfiguration(newConfig);
    
    // Efectos visuales llamativos según el tipo de cambio
    if (newConfig.showDebugPanel !== undefined) {
      toast.success('🐛 Panel de Debug ' + (newConfig.showDebugPanel ? 'ACTIVADO' : 'DESACTIVADO'), {
        duration: 3000,
        description: newConfig.showDebugPanel ? '¡Las herramientas de desarrollo están ahora visibles!' : 'Panel de debug oculto'
      });
    } else if (newConfig.showUploadSessions !== undefined) {
      toast.success('📤 Sesiones de Subida ' + (newConfig.showUploadSessions ? 'ACTIVADAS' : 'DESACTIVADAS'), {
        duration: 3000,
        description: newConfig.showUploadSessions ? '¡Monitoreo de subidas en tiempo real!' : 'Monitoreo de subidas deshabilitado'
      });
    } else if (newConfig.showDatabaseDebug !== undefined) {
      toast.success('🗄️ Debug de Base de Datos ' + (newConfig.showDatabaseDebug ? 'ACTIVADO' : 'DESACTIVADO'), {
        duration: 3000,
        description: newConfig.showDatabaseDebug ? '¡Información de BD en tiempo real!' : 'Debug de BD deshabilitado'
      });
    } else if (newConfig.showConsoleLogs !== undefined) {
      toast.success('📝 Logs de Consola ' + (newConfig.showConsoleLogs ? 'ACTIVADOS' : 'DESACTIVADOS'), {
        duration: 3000,
        description: newConfig.showConsoleLogs ? '¡Logs en tiempo real visibles!' : 'Logs de consola ocultos'
      });
    } else if (newConfig.showPerformanceMetrics !== undefined) {
      toast.success('⚡ Métricas de Rendimiento ' + (newConfig.showPerformanceMetrics ? 'ACTIVADAS' : 'DESACTIVADAS'), {
        duration: 3000,
        description: newConfig.showPerformanceMetrics ? '¡Monitoreo de rendimiento activo!' : 'Métricas deshabilitadas'
      });
    } else if (newConfig.dropdownStyle !== undefined) {
      const styleNames = {
        'matrix': '🔮 Matrix Glitch',
        'cyber': '⚡ Cyber Neon', 
        'holographic': '✨ Holographic Glass',
        'tech': '⚙️ Tech Minimal'
      };
      toast.success('🎨 Estilo de Dropdown Cambiado', {
        duration: 3000,
        description: `Nuevo estilo: ${styleNames[newConfig.dropdownStyle] || newConfig.dropdownStyle}`,
        action: {
          label: 'Ver Cambio',
          onClick: () => {
            // Scroll to dropdown preview
            const preview = document.querySelector('[data-dropdown-preview]');
            if (preview) {
              preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
              preview.classList.add('animate-pulse');
              setTimeout(() => preview.classList.remove('animate-pulse'), 2000);
            }
          }
        }
      });
    } else if (newConfig.fontFamily !== undefined) {
      const fontNames = {
        'inter': '🔤 Inter (Moderno)',
        'mono': '💻 Monospace (Tech)',
        'serif': '📚 Serif (Elegante)',
        'system': '⚙️ Sistema (Nativo)'
      };
      toast.success('🔤 Fuente Cambiada', {
        duration: 3000,
        description: `Nueva fuente: ${fontNames[newConfig.fontFamily] || newConfig.fontFamily}`,
        action: {
          label: 'Aplicar',
          onClick: () => {
            // Aplicar la fuente globalmente
            document.documentElement.style.setProperty('--font-family', newConfig.fontFamily);
            document.body.style.fontFamily = newConfig.fontFamily === 'mono' ? 'monospace' : 
                                          newConfig.fontFamily === 'serif' ? 'serif' : 'sans-serif';
          }
        }
      });
    } else if (newConfig.fontSize !== undefined) {
      const sizeNames = {
        'sm': 'Pequeño',
        'base': 'Normal', 
        'lg': 'Grande',
        'xl': 'Extra Grande'
      };
      toast.success('📏 Tamaño de Fuente Cambiado', {
        duration: 3000,
        description: `Nuevo tamaño: ${sizeNames[newConfig.fontSize] || newConfig.fontSize}`,
        action: {
          label: 'Aplicar',
          onClick: () => {
            // Aplicar el tamaño globalmente
            const sizeMap = { 'sm': '14px', 'base': '16px', 'lg': '18px', 'xl': '20px' };
            document.documentElement.style.setProperty('--font-size', sizeMap[newConfig.fontSize]);
            document.body.style.fontSize = sizeMap[newConfig.fontSize];
          }
        }
      });
    } else if (newConfig.colorScheme !== undefined) {
      // Aplicar el esquema de colores inmediatamente
      document.documentElement.setAttribute('data-theme', newConfig.colorScheme);
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${newConfig.colorScheme}`);
      
      // Aplicar estilos CSS dinámicamente según el esquema
      const root = document.documentElement;
      switch (newConfig.colorScheme) {
        case 'dark':
          root.style.setProperty('--background', '#0f0f0f');
          root.style.setProperty('--foreground', '#f0f0f0');
          root.style.setProperty('--primary', '#3b82f6');
          root.style.setProperty('--secondary', '#64748b');
          break;
        case 'matrix':
          root.style.setProperty('--background', '#000000');
          root.style.setProperty('--foreground', '#00ff00');
          root.style.setProperty('--primary', '#00ff00');
          root.style.setProperty('--secondary', '#008000');
          break;
        case 'cyber':
          root.style.setProperty('--background', '#0a0a0a');
          root.style.setProperty('--foreground', '#00ffff');
          root.style.setProperty('--primary', '#00ffff');
          root.style.setProperty('--secondary', '#0080ff');
          break;
        case 'holographic':
          root.style.setProperty('--background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
          root.style.setProperty('--foreground', '#ffffff');
          root.style.setProperty('--primary', '#ff6b6b');
          root.style.setProperty('--secondary', '#4ecdc4');
          break;
        default:
          root.style.removeProperty('--background');
          root.style.removeProperty('--foreground');
          root.style.removeProperty('--primary');
          root.style.removeProperty('--secondary');
      }
    } else if (Object.keys(newConfig).some(key => key.startsWith('enable'))) {
      // No mostrar toasts para otros cambios de herramientas del sistema
      // Los cambios se aplican automáticamente y el menú se actualiza
    } else {
      toast.success('⚙️ Configuración actualizada', {
        duration: 2000,
        description: 'Los cambios se han aplicado correctamente'
      });
    }
  };

  const handleResetConfiguration = () => {
    resetConfiguration();
    toast.success('🔄 Configuración restablecida', {
      duration: 3000,
      description: 'Todos los valores han vuelto a su estado por defecto',
      action: {
        label: 'Ver Cambios',
        onClick: () => {
          // Scroll to top and add animation
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const configPanel = document.querySelector('[data-config-panel]');
          if (configPanel) {
            configPanel.classList.add('animate-pulse');
            setTimeout(() => configPanel.classList.remove('animate-pulse'), 2000);
          }
        }
      }
    });
  };

  // Helper para crear switches animados
  const createAnimatedSwitch = (
    icon: React.ReactNode,
    title: string,
    description: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    iconColor: string
  ) => (
    <div className="flex items-center justify-between p-3 border rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 group">
      <div className="flex items-center gap-3">
        <div className={`transition-transform duration-300 group-hover:rotate-12 ${iconColor}`}>
          {icon}
        </div>
        <div>
          <Label className="text-base font-medium">{title}</Label>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="transition-all duration-300 hover:scale-110"
      />
    </div>
  );

  const fontOptions = [
    { value: 'inter', label: 'Inter (Moderno)', icon: '🔤', preview: 'AaBbCc' },
    { value: 'mono', label: 'Monospace (Tech)', icon: '💻', preview: 'AaBbCc' },
    { value: 'serif', label: 'Serif (Elegante)', icon: '📚', preview: 'AaBbCc' },
    { value: 'system', label: 'Sistema (Nativo)', icon: '⚙️', preview: 'AaBbCc' }
  ];

  const fontSizeOptions = [
    { value: 'sm', label: 'Pequeño', preview: 'Texto pequeño' },
    { value: 'base', label: 'Normal', preview: 'Texto normal' },
    { value: 'lg', label: 'Grande', preview: 'Texto grande' },
    { value: 'xl', label: 'Extra Grande', preview: 'Texto extra grande' }
  ];

  const colorSchemeOptions = [
    { value: 'default', label: 'Por Defecto', icon: '🎨' },
    { value: 'dark', label: 'Oscuro', icon: '🌙' },
    { value: 'matrix', label: 'Matrix', icon: '🔮' },
    { value: 'cyber', label: 'Cyber', icon: '⚡' },
    { value: 'holographic', label: 'Holográfico', icon: '✨' }
  ];


          // Componente para mostrar paneles de debug dinámicamente
          const DebugPanel = ({ title, isActive, children }: { title: string; isActive: boolean; children: React.ReactNode }) => {
            if (!isActive) return null;
            
            return (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in slide-in-from-top-2 duration-500 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="h-4 w-4 text-red-600 animate-pulse" />
                  <h4 className="font-medium text-red-800">{title}</h4>
                  <Badge variant="destructive" className="text-xs animate-bounce">DEBUG</Badge>
                </div>
                <div className="animate-fade-in">
                  {children}
                </div>
              </div>
            );
          };


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-config-panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
            <p className="text-gray-600">Personaliza la apariencia y funcionalidades de la aplicación</p>
          </div>
        </div>
        <Button onClick={handleResetConfiguration} variant="outline">
          Restablecer
        </Button>
      </div>

              {/* HERRAMIENTAS DEL SISTEMA - PRIMERA SECCIÓN */}
              <Card data-system-tools>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-green-600" />
            Herramientas del Sistema
          </CardTitle>
          <CardDescription>
            Activa o desactiva las diferentes funcionalidades de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {createAnimatedSwitch(
                      <FileText className="h-5 w-5" />,
                      "Items Pendientes",
                      "Gestión de tareas pendientes",
            config.enablePendingItems,
            (checked) => {
              handleSaveConfiguration({ enablePendingItems: checked });
            },
                      "text-blue-600"
                    )}

            {createAnimatedSwitch(
              <Users className="h-5 w-5" />,
              "Gestión de Usuarios",
              "Administración de usuarios",
              config.enableUserManagement,
              (checked) => handleSaveConfiguration({ enableUserManagement: checked }),
              "text-purple-600"
            )}

            {createAnimatedSwitch(
              <UserCheck className="h-5 w-5" />,
              "Gestión de Empleados",
              "Administración de empleados",
              config.enableEmployeeManagement,
              (checked) => handleSaveConfiguration({ enableEmployeeManagement: checked }),
              "text-emerald-600"
            )}

            {createAnimatedSwitch(
              <Building2 className="h-5 w-5" />,
              "Gestión de Empresas",
              "Administración de empresas",
              config.enableCompanyManagement,
              (checked) => handleSaveConfiguration({ enableCompanyManagement: checked }),
              "text-orange-600"
            )}


            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-orange-600" />
                <div>
                  <Label className="text-base font-medium">Sistema de Backup</Label>
                  <p className="text-sm text-gray-500">Respaldo de datos</p>
                </div>
              </div>
              <Switch
                checked={config.enableBackupSystem}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableBackupSystem: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="text-base font-medium">Sistema de Control</Label>
                  <p className="text-sm text-gray-500">Control de nóminas</p>
                </div>
              </div>
              <Switch
                checked={config.enableControlSystem}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableControlSystem: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <Label className="text-base font-medium">Sistema de Descuentos</Label>
                  <p className="text-sm text-gray-500">Gestión de descuentos</p>
                </div>
              </div>
              <Switch
                checked={config.enableDiscountsSystem}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableDiscountsSystem: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <Label className="text-base font-medium">Sistema de Recibos</Label>
                  <p className="text-sm text-gray-500">Gestión de recibos</p>
                </div>
              </div>
              <Switch
                checked={config.enableReceiptsSystem}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableReceiptsSystem: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                <div>
                  <Label className="text-base font-medium">Sistema de Exportación</Label>
                  <p className="text-sm text-gray-500">Exportación de datos</p>
                </div>
              </div>
              <Switch
                checked={config.enableExportSystem}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableExportSystem: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-pink-600" />
                <div>
                  <Label className="text-base font-medium">Analytics</Label>
                  <p className="text-sm text-gray-500">Análisis y estadísticas</p>
                </div>
              </div>
              <Switch
                checked={config.enableAnalytics}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableAnalytics: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-yellow-600" />
                <div>
                  <Label className="text-base font-medium">Características de Seguridad</Label>
                  <p className="text-sm text-gray-500">Funciones de seguridad</p>
                </div>
              </div>
              <Switch
                checked={config.enableSecurityFeatures}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableSecurityFeatures: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <Label className="text-base font-medium">Documentación</Label>
                  <p className="text-sm text-gray-500">Sistema de documentación</p>
                </div>
              </div>
              <Switch
                checked={config.enableDocumentation}
                onCheckedChange={(checked) => handleSaveConfiguration({ enableDocumentation: checked })}
              />
            </div>
          </div>
          
          {/* Botón para unificación de conceptos */}
          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={() => setShowConceptUnification(true)}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Unificar Conceptos entre Empresas
            </Button>
          </div>
          
        {/* Botón para limpieza de archivos huérfanos */}
        <div className="mt-4">
          <Button
            onClick={async () => {
              if (typeof window.cleanOrphanedFiles === 'function') {
                try {
                  const result = await window.cleanOrphanedFiles();
                  if (result && result.total > 0) {
                    toast.success(`✅ Limpieza completada: ${result.total} archivos procesados`);
                  } else {
                    toast.info('ℹ️ No se encontraron archivos huérfanos para limpiar');
                  }
                } catch (error) {
                  toast.error('❌ Error en limpieza de archivos');
                  console.error('Error:', error);
                }
              } else {
                toast.error('❌ Función de limpieza no disponible');
              }
            }}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Limpieza de Archivos Huérfanos
          </Button>
        </div>
        </CardContent>
      </Card>

      {/* Paneles de Debug */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-600" />
            Paneles de Debug
          </CardTitle>
          <CardDescription>
            Controla la visibilidad de los paneles de desarrollo y depuración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Panel de Debug Principal</Label>
              <p className="text-sm text-gray-500">Muestra herramientas de desarrollo y depuración</p>
            </div>
            <Switch
              checked={config.showDebugPanel}
              onCheckedChange={(checked) => handleSaveConfiguration({ showDebugPanel: checked })}
            />
          </div>
          
          <DebugPanel title="Panel de Debug Principal" isActive={config.showDebugPanel}>
            <div className="space-y-2 text-sm">
              <p>• Información de estado de la aplicación</p>
              <p>• Métricas de rendimiento en tiempo real</p>
              <p>• Herramientas de depuración de base de datos</p>
              <p>• Logs del sistema y errores</p>
            </div>
          </DebugPanel>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Sesiones de Subida</Label>
              <p className="text-sm text-gray-500">Muestra información de sesiones de carga de archivos</p>
            </div>
            <Switch
              checked={config.showUploadSessions}
              onCheckedChange={(checked) => handleSaveConfiguration({ showUploadSessions: checked })}
            />
          </div>
          
          <DebugPanel title="Sesiones de Subida" isActive={config.showUploadSessions}>
            <div className="space-y-2 text-sm">
              <div>• Estado de subidas activas: <Badge variant="outline">3 sesiones</Badge></div>
              <div>• Archivos procesados: <Badge variant="outline">15/20</Badge></div>
              <div>• Tiempo estimado restante: <Badge variant="outline">2 min</Badge></div>
              <div>• Errores encontrados: <Badge variant="destructive">0</Badge></div>
            </div>
          </DebugPanel>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Debug de Base de Datos</Label>
              <p className="text-sm text-gray-500">Muestra información de depuración de la base de datos</p>
            </div>
            <Switch
              checked={config.showDatabaseDebug}
              onCheckedChange={(checked) => handleSaveConfiguration({ showDatabaseDebug: checked })}
            />
          </div>
          
          <DebugPanel title="Debug de Base de Datos" isActive={config.showDatabaseDebug}>
            <div className="space-y-2 text-sm">
              <div>• Registros en base de datos: <Badge variant="outline">1,234</Badge></div>
              <div>• Tamaño de la base: <Badge variant="outline">45.2 MB</Badge></div>
              <div>• Última actualización: <Badge variant="outline">hace 2 min</Badge></div>
              <div>• Estado de conexión: <Badge variant="default" className="bg-green-500">Activa</Badge></div>
            </div>
          </DebugPanel>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Logs de Consola</Label>
              <p className="text-sm text-gray-500">Muestra logs de consola en tiempo real</p>
            </div>
            <Switch
              checked={config.showConsoleLogs}
              onCheckedChange={(checked) => handleSaveConfiguration({ showConsoleLogs: checked })}
            />
          </div>
          
          <DebugPanel title="Logs de Consola" isActive={config.showConsoleLogs}>
            <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
              <p>[14:32:15] INFO: Usuario autenticado correctamente</p>
              <p>[14:32:16] DEBUG: Cargando datos de recibos...</p>
              <p>[14:32:17] SUCCESS: 15 archivos procesados</p>
              <p>[14:32:18] WARN: Archivo duplicado detectado</p>
            </div>
          </DebugPanel>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Métricas de Rendimiento</Label>
              <p className="text-sm text-gray-500">Muestra métricas de rendimiento del sistema</p>
            </div>
            <Switch
              checked={config.showPerformanceMetrics}
              onCheckedChange={(checked) => handleSaveConfiguration({ showPerformanceMetrics: checked })}
            />
          </div>
          
          <DebugPanel title="Métricas de Rendimiento" isActive={config.showPerformanceMetrics}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">CPU: <Badge variant="outline">23%</Badge></div>
                <div className="font-medium">Memoria: <Badge variant="outline">156 MB</Badge></div>
              </div>
              <div>
                <div className="font-medium">Tiempo de respuesta: <Badge variant="outline">45ms</Badge></div>
                <div className="font-medium">Peticiones/min: <Badge variant="outline">12</Badge></div>
              </div>
            </div>
          </DebugPanel>
        </CardContent>
      </Card>

      {/* Opciones Visuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-600" />
            Opciones Visuales
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia visual de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fuente y Tamaño - Una sola línea con muestra */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-base font-semibold">Fuente</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(value) => handleSaveConfiguration({ fontFamily: value as any })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Muestra de fuente */}
              <div className="mt-2 p-2 bg-gray-50 rounded border text-sm" style={{ fontFamily: config.fontFamily === 'inter' ? 'Inter, sans-serif' : config.fontFamily === 'mono' ? 'monospace' : config.fontFamily === 'serif' ? 'serif' : 'system-ui' }}>
                <span className="text-gray-600">Muestra:</span> <span className="font-medium">AaBbCc 123</span>
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-base font-semibold">Tamaño</Label>
              <Select
                value={config.fontSize}
                onValueChange={(value) => handleSaveConfiguration({ fontSize: value as any })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Muestra de tamaño */}
              <div className={`mt-2 p-2 bg-gray-50 rounded border ${config.fontSize === 'sm' ? 'text-sm' : config.fontSize === 'lg' ? 'text-lg' : config.fontSize === 'xl' ? 'text-xl' : 'text-base'}`}>
                <span className="text-gray-600">Muestra:</span> <span className="font-medium">Texto de ejemplo</span>
              </div>
            </div>
          </div>

          {/* Esquema de Colores */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Esquema de Colores</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              {colorSchemeOptions.map((option) => (
                <div
                  key={option.value}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-300 text-center transform hover:scale-110 hover:shadow-lg ${
                    config.colorScheme === option.value
                              ? 'border-blue-500 bg-blue-50 shadow-lg scale-110'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                          onClick={() => handleSaveConfiguration({ colorScheme: option.value as any })}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sección de Storage */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          Storage
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="text-base font-medium text-blue-800">Storage Supabase</Label>
                <p className="text-sm text-blue-600">Usar Supabase en lugar de IndexedDB</p>
                {config.enableSupabaseStorage && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Requiere migración de datos y configuración de Supabase
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={config.enableSupabaseStorage}
              onCheckedChange={handleStorageToggle}
            />
          </div>
        </div>
      </div>
      
      {/* Modal de unificación de conceptos */}
      <ConceptUnificationModal
        open={showConceptUnification}
        onClose={() => setShowConceptUnification(false)}
      />
    </div>
  );
};

export default ConfigurationPanel;
