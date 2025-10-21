// lib/upload-session-manager.ts
import { db, type UploadSessionDB, type UploadFileDB } from './db';

export interface UploadSessionState {
  sessionId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  pendingFiles: number;
  currentFileIndex: number;
  files: UploadFileDB[];
  status: 'active' | 'completed' | 'failed' | 'cancelled';
}

export class UploadSessionManager {
  /**
   * Crea una nueva sesión de subida
   */
  static async createSession(
    userId: string, 
    fileNames: string[]
  ): Promise<UploadSessionDB> {
    console.log('🔧 UploadSessionManager.createSession - Iniciando...');
    console.log('🔧 UserId:', userId);
    console.log('🔧 FileNames:', fileNames.length);
    
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const files: UploadFileDB[] = fileNames.map(fileName => ({
      fileName,
      status: 'pending'
    }));
    
    const session: UploadSessionDB = {
      sessionId,
      userId,
      status: 'active',
      totalFiles: fileNames.length,
      completedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      pendingFiles: fileNames.length,
      currentFileIndex: 0,
      files,
      startedAt: now,
      lastUpdatedAt: now
    };
    
    console.log('🔧 Session object created:', {
      sessionId: session.sessionId,
      userId: session.userId,
      totalFiles: session.totalFiles,
      status: session.status
    });
    
    try {
      console.log('🔧 Attempting to save to database...');
      console.log('🔧 Database object:', db);
      console.log('🔧 UploadSessions table:', db.uploadSessions);
      
      // Verificar que la tabla existe
      const tableExists = await db.uploadSessions.count();
      console.log('🔧 Table count before save:', tableExists);
      
      const result = await db.uploadSessions.add(session);
      console.log('✅ Session saved to database with ID:', result);
      
      // Verificar que se guardó correctamente
      const savedSession = await db.uploadSessions.get(result);
      console.log('🔍 Verification - saved session:', savedSession ? 'FOUND' : 'NOT FOUND');
      
      if (savedSession) {
        console.log('🔍 Saved session details:', {
          id: savedSession.id,
          sessionId: savedSession.sessionId,
          userId: savedSession.userId,
          status: savedSession.status,
          totalFiles: savedSession.totalFiles
        });
      }
      
      // Verificar el conteo después de guardar
      const countAfter = await db.uploadSessions.count();
      console.log('🔧 Table count after save:', countAfter);
      
      return session;
    } catch (error) {
      console.error('❌ Error saving session to database:', error);
      console.error('❌ Error details:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene una sesión de subida por ID
   */
  static async getSession(sessionId: string): Promise<UploadSessionDB | null> {
    try {
      return await db.uploadSessions
        .where('sessionId')
        .equals(sessionId)
        .first() || null;
    } catch (error) {
      console.error('Error getting upload session:', error);
      return null;
    }
  }
  
  /**
   * Obtiene sesiones activas de un usuario
   */
  static async getActiveSessions(userId: string): Promise<UploadSessionDB[]> {
    try {
      console.log('🔍 Buscando sesiones activas para usuario:', userId);
      
      // Primero, obtener todas las sesiones del usuario
      const allUserSessions = await db.uploadSessions
        .where('userId')
        .equals(userId)
        .toArray();
      
      console.log('📊 Todas las sesiones del usuario:', allUserSessions.length);
      console.log('📊 Detalles de sesiones:', allUserSessions.map(s => ({
        sessionId: s.sessionId,
        status: s.status,
        totalFiles: s.totalFiles,
        pendingFiles: s.pendingFiles,
        completedFiles: s.completedFiles,
        failedFiles: s.failedFiles,
        startedAt: new Date(s.startedAt).toLocaleString()
      })));
      
      // Filtrar sesiones activas o con archivos pendientes
      const activeSessions = allUserSessions.filter(s => 
        s.status === 'active' || 
        s.status === 'failed' || 
        (s.pendingFiles && s.pendingFiles > 0)
      );
      console.log('✅ Sesiones activas encontradas:', activeSessions.length);
      console.log('📊 Sesiones filtradas:', activeSessions.map(s => ({
        sessionId: s.sessionId,
        status: s.status,
        pendingFiles: s.pendingFiles
      })));
      
      return activeSessions;
    } catch (error) {
      console.error('❌ Error getting active sessions:', error);
      return [];
    }
  }
  
  /**
   * Actualiza el estado de un archivo en la sesión
   */
  static async updateFileStatus(
    sessionId: string,
    fileIndex: number,
    status: UploadFileDB['status'],
    errorMessage?: string,
    processingResult?: any
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      // Actualizar el archivo específico
      session.files[fileIndex] = {
        ...session.files[fileIndex],
        status,
        errorMessage,
        processingResult,
        startedAt: status === 'processing' ? Date.now() : session.files[fileIndex].startedAt,
        completedAt: (status === 'completed' || status === 'failed' || status === 'skipped') ? Date.now() : undefined
      };
      
      // Recalcular métricas
      const completedFiles = session.files.filter(f => f.status === 'completed').length;
      const failedFiles = session.files.filter(f => f.status === 'failed').length;
      const skippedFiles = session.files.filter(f => f.status === 'skipped').length;
      const pendingFiles = session.files.filter(f => f.status === 'pending').length;
      
      // Actualizar sesión
      await db.uploadSessions.update(session.id!, {
        files: session.files,
        completedFiles,
        failedFiles,
        skippedFiles,
        pendingFiles,
        currentFileIndex: fileIndex + 1,
        lastUpdatedAt: Date.now(),
        status: pendingFiles === 0 ? 'completed' : 'active'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating file status:', error);
      return false;
    }
  }
  
  /**
   * Marca una sesión como completada
   */
  static async completeSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      await db.uploadSessions.update(session.id!, {
        status: 'completed',
        completedAt: Date.now(),
        lastUpdatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error completing session:', error);
      return false;
    }
  }
  
  /**
   * Marca una sesión como fallida
   */
  static async failSession(sessionId: string, errorMessage: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      await db.uploadSessions.update(session.id!, {
        status: 'failed',
        errorMessage,
        lastUpdatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error failing session:', error);
      return false;
    }
  }
  
  /**
   * Cancela una sesión
   */
  static async cancelSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      await db.uploadSessions.update(session.id!, {
        status: 'cancelled',
        lastUpdatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling session:', error);
      return false;
    }
  }
  
  /**
   * Actualiza el status de una sesión
   */
  static async updateSessionStatus(sessionId: string, status: 'active' | 'completed' | 'failed' | 'cancelled', errorMessage?: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      await db.uploadSessions.update(session.id!, {
        status,
        errorMessage,
        lastUpdatedAt: Date.now(),
        ...(status === 'completed' && { completedAt: Date.now() })
      });
      
      console.log(`✅ Sesión ${sessionId} actualizada a status: ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating session status:', error);
      return false;
    }
  }

  /**
   * Elimina sesiones antiguas (más de 7 días)
   */
  static async cleanupOldSessions(): Promise<number> {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const oldSessions = await db.uploadSessions
        .where('startedAt')
        .below(sevenDaysAgo)
        .toArray();
      
      const idsToDelete = oldSessions.map(s => s.id!);
      await db.uploadSessions.bulkDelete(idsToDelete);
      
      return idsToDelete.length;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }
  
  /**
   * Obtiene el estado actual de una sesión
   */
  static async getSessionState(sessionId: string): Promise<UploadSessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return null;
      
      return {
        sessionId: session.sessionId,
        totalFiles: session.totalFiles,
        completedFiles: session.completedFiles,
        failedFiles: session.failedFiles,
        skippedFiles: session.skippedFiles,
        pendingFiles: session.pendingFiles,
        currentFileIndex: session.currentFileIndex,
        files: session.files,
        status: session.status
      };
    } catch (error) {
      console.error('Error getting session state:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las sesiones de la base de datos (para debug)
   */
  static async getAllSessions(): Promise<UploadSessionDB[]> {
    try {
      console.log('🔍 Obteniendo todas las sesiones de la base de datos...');
      console.log('🔍 Database object:', db);
      console.log('🔍 UploadSessions table:', db.uploadSessions);
      
      const allSessions = await db.uploadSessions.toArray();
      console.log('📊 Total de sesiones en la base de datos:', allSessions.length);
      console.log('📊 Detalles de todas las sesiones:', allSessions.map(s => ({
        id: s.id,
        sessionId: s.sessionId,
        userId: s.userId,
        status: s.status,
        totalFiles: s.totalFiles,
        pendingFiles: s.pendingFiles,
        startedAt: new Date(s.startedAt).toLocaleString()
      })));
      
      // Verificar si la tabla existe
      const tableExists = await db.uploadSessions.count();
      console.log('🔍 Table count:', tableExists);
      
      return allSessions;
    } catch (error) {
      console.error('❌ Error getting all sessions:', error);
      console.error('❌ Error details:', error);
      return [];
    }
  }
}

