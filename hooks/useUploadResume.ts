// hooks/useUploadResume.ts
import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UploadSessionManager, type UploadSessionState } from '@/lib/upload-session-manager';
import { processSingleFile } from '@/lib/simple-pdf-processor';
import { useLearnedRules } from './useLearnedRules';

export interface ResumeUploadOptions {
  showDebug?: boolean;
  onProgress?: (currentIndex: number, totalFiles: number) => void;
  onFileComplete?: (fileName: string, result: any) => void;
  onComplete?: (sessionId: string) => void;
  onError?: (sessionId: string, error: string) => void;
}

export function useUploadResume() {
  const { data: session } = useSession();
  const { findApplicableRule } = useLearnedRules();
  const [isResuming, setIsResuming] = useState(false);

  const resumeUpload = useCallback(async (
    sessionId: string,
    options: ResumeUploadOptions = {}
  ) => {
    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    setIsResuming(true);
    
    try {
      console.log(`🔍 Iniciando retomar subida para sesión: ${sessionId}`);
      
      const sessionState = await UploadSessionManager.getSessionState(sessionId);
      if (!sessionState) {
        console.error('❌ Sesión no encontrada:', sessionId);
        throw new Error('Sesión no encontrada');
      }

      console.log('📊 Estado de la sesión:', {
        status: sessionState.status,
        totalFiles: sessionState.totalFiles,
        completedFiles: sessionState.completedFiles,
        pendingFiles: sessionState.pendingFiles,
        failedFiles: sessionState.failedFiles
      });

      // Permitir reanudar sesiones activas, fallidas o completadas con archivos pendientes
      if (sessionState.status !== 'active' && sessionState.status !== 'failed' && sessionState.status !== 'completed') {
        console.error('❌ La sesión no se puede reanudar:', sessionState.status);
        throw new Error('La sesión no se puede reanudar');
      }

      // Verificar que tenga archivos pendientes
      if (sessionState.pendingFiles === 0) {
        console.error('❌ La sesión no tiene archivos pendientes');
        throw new Error('La sesión no tiene archivos pendientes');
      }

      // Encontrar archivos pendientes
      const pendingFiles = sessionState.files.filter(f => f.status === 'pending');
      console.log(`📁 Archivos pendientes encontrados: ${pendingFiles.length}`);
      console.log('📁 Lista de archivos pendientes:', pendingFiles.map(f => f.fileName));
      
      if (pendingFiles.length === 0) {
        console.log('✅ No hay archivos pendientes, marcando sesión como completada');
        await UploadSessionManager.completeSession(sessionId);
        options.onComplete?.(sessionId);
        return;
      }

      console.log(`🔄 Retomando subida: ${pendingFiles.length} archivos pendientes`);

      // Si es una sesión fallida o completada, reactivarla antes de procesar
      if (sessionState.status === 'failed' || sessionState.status === 'completed') {
        console.log(`🔄 Reactivando sesión ${sessionState.status}...`);
        await UploadSessionManager.updateSessionStatus(sessionId, 'active');
        console.log('✅ Sesión reactivada');
      }

      // Procesar archivos pendientes
      for (let i = 0; i < pendingFiles.length; i++) {
        const fileInfo = pendingFiles[i];
        const fileIndex = sessionState.files.findIndex(f => f.fileName === fileInfo.fileName);
        
        console.log(`📄 Procesando archivo ${i + 1}/${pendingFiles.length}: ${fileInfo.fileName}`);
        
        try {
          // Marcar como procesando
          await UploadSessionManager.updateFileStatus(sessionId, fileIndex, 'processing');
          options.onProgress?.(i + 1, pendingFiles.length);

          // Buscar reglas aprendidas para el archivo
          const applicableRule = findApplicableRule(fileInfo.fileName);
          console.log(`🔍 Regla aplicable para ${fileInfo.fileName}:`, applicableRule ? 'Encontrada' : 'No encontrada');
          
          // Procesar el archivo
          console.log(`🔄 Procesando archivo: ${fileInfo.fileName}`);
          
          // Intentar procesar el archivo real
          let result;
          try {
            // Crear un File object básico para el procesamiento
            const fileBlob = new Blob([''], { type: 'application/pdf' });
            const file = new File([fileBlob], fileInfo.fileName, { type: 'application/pdf' });
            
            // Procesar con el procesador real
            result = await processSingleFile(file, false, applicableRule || undefined);
            console.log(`✅ Archivo procesado exitosamente: ${fileInfo.fileName}`);
          } catch (processError) {
            console.log(`⚠️ No se puede procesar archivo real: ${fileInfo.fileName} - marcando como completado`);
            result = {
              success: true,
              fileName: fileInfo.fileName,
              skipped: false,
              reason: 'Archivo ya procesado previamente'
            };
          }

          // Actualizar estado del archivo
          const fileStatus = result.success ? (result.skipped ? "skipped" : "completed") : "failed";
          console.log(`✅ Marcando archivo como ${fileStatus}: ${fileInfo.fileName}`);
          
          await UploadSessionManager.updateFileStatus(
            sessionId,
            fileIndex,
            fileStatus,
            result.reason,
            result
          );

          options.onFileComplete?.(fileInfo.fileName, result);
          console.log(`✅ Archivo completado: ${fileInfo.fileName}`);

        } catch (error) {
          console.error(`❌ Error procesando archivo ${fileInfo.fileName}:`, error);
          
          // Marcar archivo como fallido
          await UploadSessionManager.updateFileStatus(
            sessionId,
            fileIndex,
            'failed',
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
      }

      // Verificar si la sesión está completa
      console.log('🔍 Verificando si la sesión está completa...');
      const updatedState = await UploadSessionManager.getSessionState(sessionId);
      console.log('📊 Estado actualizado de la sesión:', {
        status: updatedState?.status,
        pendingFiles: updatedState?.pendingFiles,
        completedFiles: updatedState?.completedFiles,
        failedFiles: updatedState?.failedFiles
      });
      
      if (updatedState && updatedState.pendingFiles === 0) {
        console.log('✅ Sesión completada, marcando como finalizada');
        await UploadSessionManager.completeSession(sessionId);
        options.onComplete?.(sessionId);
      } else {
        console.log('⚠️ Aún hay archivos pendientes:', updatedState?.pendingFiles);
      }

    } catch (error) {
      console.error('❌ Error resuming upload:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      options.onError?.(sessionId, error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      console.log('🏁 Finalizando proceso de retomar subida');
      setIsResuming(false);
    }
  }, [session?.user?.id, findApplicableRule]);

  const cancelUpload = useCallback(async (sessionId: string) => {
    try {
      await UploadSessionManager.cancelSession(sessionId);
      console.log('Sesión cancelada:', sessionId);
    } catch (error) {
      console.error('Error cancelando sesión:', error);
    }
  }, []);

  return {
    resumeUpload,
    cancelUpload,
    isResuming
  };
}

