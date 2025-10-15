'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Split, AlertCircle } from 'lucide-react';

interface PdfSplitDialogProps {
  isOpen: boolean;
  fileName: string;
  totalPages: number;
  onSplit: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

export function PdfSplitDialog({ 
  isOpen, 
  fileName, 
  totalPages, 
  onSplit, 
  onSkip, 
  onCancel 
}: PdfSplitDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Split className="h-5 w-5 text-blue-600" />
            <span>PDF Multi-página Detectado</span>
          </CardTitle>
          <CardDescription>
            Se detectó un PDF de LIME con múltiples páginas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">{fileName}</p>
              <p className="text-sm text-blue-700">
                {totalPages} página{totalPages > 1 ? 's' : ''} detectada{totalPages > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">¿Cómo proceder?</p>
              <p className="text-sm text-amber-700">
                Puedes dividir el PDF en páginas individuales o procesarlo como un solo archivo.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button 
              onClick={onSplit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Split className="h-4 w-4 mr-2" />
              Dividir en páginas
            </Button>
            <Button 
              onClick={onSkip}
              variant="outline"
              className="flex-1"
            >
              Procesar completo
            </Button>
          </div>
          
          <Button 
            onClick={onCancel}
            variant="ghost"
            className="w-full"
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
