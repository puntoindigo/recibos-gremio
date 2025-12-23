// components/ColoredSelectExample.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import ColoredSelect, { PRIORITY_OPTIONS, STATUS_OPTIONS, CATEGORY_OPTIONS } from './ColoredSelect';

export default function ColoredSelectExample() {
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [category, setCategory] = useState('feature');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Ejemplo de Desplegables con Colores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <ColoredSelect
            value={priority}
            onValueChange={setPriority}
            options={PRIORITY_OPTIONS}
            placeholder="Seleccionar prioridad..."
          />
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <ColoredSelect
            value={status}
            onValueChange={setStatus}
            options={STATUS_OPTIONS}
            placeholder="Seleccionar estado..."
          />
        </div>

        <div className="space-y-2">
          <Label>Categoría</Label>
          <ColoredSelect
            value={category}
            onValueChange={setCategory}
            options={CATEGORY_OPTIONS}
            placeholder="Seleccionar categoría..."
          />
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Valores seleccionados:</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Prioridad:</strong> {priority}</p>
            <p><strong>Estado:</strong> {status}</p>
            <p><strong>Categoría:</strong> {category}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
