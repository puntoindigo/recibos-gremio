// components/ConceptUnificationModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Save, Edit, Trash2 } from 'lucide-react';
import { CONCEPT_MAPPINGS, ConceptMapping } from '@/lib/concept-mapping';

interface ConceptUnificationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ConceptUnificationModal({ open, onClose }: ConceptUnificationModalProps) {
  const [mappings, setMappings] = useState<ConceptMapping[]>(CONCEPT_MAPPINGS);
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');

  const handleEditMapping = (index: number) => {
    setEditingMapping(index);
    setTempName(mappings[index].unifiedName);
  };

  const handleSaveMapping = (index: number) => {
    if (tempName.trim()) {
      const updatedMappings = [...mappings];
      updatedMappings[index].unifiedName = tempName.trim();
      setMappings(updatedMappings);
    }
    setEditingMapping(null);
    setTempName('');
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setTempName('');
  };

  const handleSaveAll = () => {
    // Aquí se guardarían los cambios en localStorage o base de datos
    console.log('Guardando mapeos unificados:', mappings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Unificación de Conceptos entre Empresas</DialogTitle>
          <DialogDescription>
            Configura cómo se unifican los conceptos de diferentes empresas para mostrar datos consistentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1 -mx-1">
          <div className="space-y-4">
            {mappings.map((mapping, index) => (
              <Card key={mapping.unifiedCode}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{mapping.unifiedCode}</Badge>
                      {editingMapping === index ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="w-64"
                            placeholder="Nombre unificado"
                          />
                          <Button size="sm" onClick={() => handleSaveMapping(index)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{mapping.unifiedName}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditMapping(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(mapping.companyMappings).map(([company, code]) => (
                      <div key={company} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{company}</span>
                        <Badge variant="secondary">{code}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t -mx-6 px-6 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
