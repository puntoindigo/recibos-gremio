// components/DocumentationPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Clock, 
  ExternalLink, 
  BookOpen,
  Download,
  Eye,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
// PendingItemsViewManager removido - ahora es independiente

interface DocumentInfo {
  name: string;
  path: string;
  title: string;
  description: string;
  lastModified: Date;
  size: number;
  type: 'markdown' | 'readme' | 'development' | 'case' | 'status';
}

export default function DocumentationPanel() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [docContent, setDocContent] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Lista de documentos disponibles
      const docsList: DocumentInfo[] = [
        {
          name: 'DASHBOARD_PLUS_BUTTONS.md',
          path: '/DASHBOARD_PLUS_BUTTONS.md',
          title: 'Botones + del Dashboard',
          description: 'Documentación completa de los botones + implementados en el Dashboard',
          lastModified: new Date('2025-10-18T14:30:00Z'),
          size: 15420,
          type: 'development'
        },
        {
          name: 'ESTADO_ACTUAL.md',
          path: '/ESTADO_ACTUAL.md',
          title: 'Estado Actual del Proyecto',
          description: 'Resumen del estado actual del sistema de gestión de recibos',
          lastModified: new Date('2025-10-18T12:15:00Z'),
          size: 8750,
          type: 'status'
        },
        {
          name: 'DESARROLLO_2025-01-17.md',
          path: '/DESARROLLO_2025-01-17.md',
          title: 'Desarrollo 17 de Octubre 2025',
          description: 'Registro de desarrollo y cambios realizados el 17 de octubre',
          lastModified: new Date('2025-10-17T18:45:00Z'),
          size: 12300,
          type: 'development'
        },
        {
          name: 'CASO_594_SUBIDAS_RESUELTO.md',
          path: '/CASO_594_SUBIDAS_RESUELTO.md',
          title: 'Caso 594 Subidas - Resuelto',
          description: 'Documentación del caso de las 594 subidas interrumpidas y su resolución',
          lastModified: new Date('2025-10-17T16:20:00Z'),
          size: 9800,
          type: 'case'
        },
        {
          name: 'README.md',
          path: '/README.md',
          title: 'Documentación Principal',
          description: 'Documentación principal del proyecto',
          lastModified: new Date('2025-10-15T10:30:00Z'),
          size: 15600,
          type: 'readme'
        },
        {
          name: 'PENDIENTES_DESARROLLO.md',
          path: '/PENDIENTES_DESARROLLO.md',
          title: 'Items Pendientes de Desarrollo',
          description: 'Lista de funcionalidades y mejoras pendientes con gestión drag & drop',
          lastModified: new Date('2025-10-18T16:00:00Z'),
          size: 12800,
          type: 'development'
        },
        {
          name: 'DROPDOWN_DEMO',
          path: '/dropdown-demo',
          title: 'Demo de Dropdowns',
          description: '3 propuestas de diseño moderno, tech y matrix para dropdowns',
          lastModified: new Date('2025-10-18T18:00:00Z'),
          size: 0,
          type: 'development'
        }
      ];

      // Ordenar por fecha de modificación descendente
      const sortedDocs = docsList.sort((a, b) => 
        b.lastModified.getTime() - a.lastModified.getTime()
      );

      setDocuments(sortedDocs);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast.error('Error cargando documentación');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentContent = async (doc: DocumentInfo) => {
    try {
      setSelectedDoc(doc);
      
      // Si es el documento de items pendientes, mostrar el gestor
      if (doc.name === 'PENDIENTES_DESARROLLO.md') {
        setDocContent('PENDING_ITEMS_MANAGER');
        return;
      }
      
      // Si es la demo de dropdowns, redirigir
      if (doc.name === 'DROPDOWN_DEMO') {
        window.open('/dropdown-demo', '_blank');
        return;
      }
      
      const response = await fetch(doc.path);
      if (response.ok) {
        const content = await response.text();
        setDocContent(content);
      } else {
        toast.error('Error cargando el documento');
      }
    } catch (error) {
      console.error('Error cargando contenido:', error);
      toast.error('Error cargando el documento');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'development': return 'bg-blue-100 text-blue-800';
      case 'status': return 'bg-green-100 text-green-800';
      case 'case': return 'bg-orange-100 text-orange-800';
      case 'readme': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'development': return '🔧';
      case 'status': return '📊';
      case 'case': return '📋';
      case 'readme': return '📖';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gestor :: Documentación</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Gestor :: Documentación</h1>
          <Badge variant="outline" className="text-sm">
            <Clock className="h-4 w-4 mr-1" />
            {documents.length} documentos
          </Badge>
        </div>
      </div>

      {selectedDoc ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDoc(null)}
              >
                ← Volver
              </Button>
              <div>
                <h2 className="text-xl font-semibold">{selectedDoc.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedDoc.name} • {formatFileSize(selectedDoc.size)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedDoc.path, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedDoc.path;
                  link.download = selectedDoc.name;
                  link.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>

          {docContent === 'PENDING_ITEMS_MANAGER' ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <p>Los Items Pendientes ahora son una sección independiente.</p>
                  <p>Usa el menú principal para acceder a ellos.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-96">
                  {docContent}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc, index) => (
            <Card 
              key={doc.name} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadDocumentContent(doc)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {doc.name === 'DROPDOWN_DEMO' ? '🎨' : getTypeIcon(doc.type)}
                    </span>
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {doc.name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getTypeColor(doc.type)}>
                    {doc.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {doc.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {doc.lastModified.toLocaleDateString('es-AR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {formatFileSize(doc.size)}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
