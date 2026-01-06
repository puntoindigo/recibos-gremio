// lib/user-management.ts
// import { User, Empresa, Invitation, UserActivity, generateUserId, generateEmpresaId, generateInvitationToken, ROLE_PERMISSIONS } from './db'; // REMOVIDO - IndexedDB roto
import type { DataManager } from './data-manager';

// Definir tipos que se usan en user-management
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  empresa?: string;
  permissions: string[];
  createdAt: number;
  lastLogin?: number;
  isActive: boolean;
};

export type Empresa = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  createdAt: number;
  isActive: boolean;
};

export type Invitation = {
  id: string;
  token: string;
  email: string;
  empresa: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
  usedAt?: number;
  usedBy?: string;
};

export type UserActivity = {
  id: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
};

export const ROLE_PERMISSIONS = {
  SUPERADMIN: ['*'],
  ADMIN: ['recibos', 'controles', 'descuentos', 'reportes', 'usuarios:view', 'usuarios:create', 'usuarios:edit', 'usuarios:invite', 'empresas:view', 'empresas:create', 'empresas:edit'],
  USER: ['recibos:view', 'controles:view', 'descuentos:view', 'empresas:view']
};

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateEmpresaId(): string {
  return `empresa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateInvitationToken(): string {
  return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
}

// Gestión de usuarios
export async function createUser(dataManager: DataManager, userData: Omit<User, 'id' | 'createdAt' | 'permissions'>): Promise<User> {
  const user: User = {
    id: generateUserId(),
    ...userData,
    permissions: ROLE_PERMISSIONS[userData.role],
    createdAt: Date.now()
  };
  
  await dataManager.addUser(user);
  await logUserActivity(user.id, 'user:create', 'user', user.id, { action: 'user_created' });
  return user;
}

export async function getUserById(dataManager: DataManager, id: string): Promise<User | undefined> {
  const users = await dataManager.getUsers();
  return users.find(u => u.id === id);
}

export async function getUserByEmail(dataManager: DataManager, email: string): Promise<User | undefined> {
  const users = await dataManager.getUsers();
  return users.find(u => u.email === email);
}

export async function updateUser(dataManager: DataManager, id: string, updates: Partial<User>): Promise<void> {
  await dataManager.updateUser(id, { ...updates, fechaModificacion: Date.now() });
  await logUserActivity(id, 'user:update', 'user', id, { updates });
}

export async function deleteUser(dataManager: DataManager, id: string): Promise<void> {
  await dataManager.deleteUser(id);
  await logUserActivity(id, 'user:delete', 'user', id, { action: 'user_deleted' });
}

export async function getUsersByEmpresa(dataManager: DataManager, empresaId: string): Promise<User[]> {
  const users = await dataManager.getUsers();
  return users.filter(u => u.empresaId === empresaId);
}

export async function updateUserLastLogin(dataManager: DataManager, id: string): Promise<void> {
  await dataManager.updateUser(id, { lastLogin: Date.now() });
}

// Gestión de empresas
export async function createEmpresa(dataManager: DataManager, empresaData: Omit<Empresa, 'id' | 'createdAt'>): Promise<Empresa> {
  const empresa: Empresa = {
    id: generateEmpresaId(),
    ...empresaData,
    createdAt: Date.now()
  };
  
  await dataManager.addEmpresa(empresa);
  await logUserActivity(empresaData.adminUserId, 'empresa:create', 'empresa', empresa.id, { action: 'empresa_created' });
  return empresa;
}

export async function getEmpresaById(dataManager: DataManager, id: string): Promise<Empresa | undefined> {
  const empresas = await dataManager.getEmpresas();
  return empresas.find(e => e.id === id);
}

export async function getAllEmpresas(dataManager: DataManager): Promise<Empresa[]> {
  const empresas = await dataManager.getEmpresas();
  return empresas.filter(e => e.isActive);
}

export async function updateEmpresa(dataManager: DataManager, id: string, updates: Partial<Empresa>): Promise<void> {
  await dataManager.updateEmpresa(id, updates);
  await logUserActivity(updates.adminUserId || '', 'empresa:update', 'empresa', id, { updates });
}

// Gestión de invitaciones
export async function createInvitation(dataManager: DataManager, invitationData: Omit<Invitation, 'id' | 'token' | 'createdAt' | 'isUsed'>): Promise<Invitation> {
  const invitation: Invitation = {
    id: generateInvitationToken(),
    token: generateInvitationToken(),
    ...invitationData,
    isUsed: false,
    createdAt: Date.now()
  };
  
  await dataManager.addInvitation(invitation);
  await logUserActivity(invitationData.createdBy, 'invitation:create', 'invitation', invitation.id, { email: invitationData.email });
  return invitation;
}

export async function getInvitationByToken(dataManager: DataManager, token: string): Promise<Invitation | undefined> {
  const invitations = await dataManager.getInvitations();
  return invitations.find(i => i.token === token);
}

export async function markInvitationAsUsed(dataManager: DataManager, token: string): Promise<void> {
  const invitation = await getInvitationByToken(dataManager, token);
  if (invitation) {
    await dataManager.updateInvitation(invitation.id, { isUsed: true });
  }
}

export async function getPendingInvitations(dataManager: DataManager, empresaId: string): Promise<Invitation[]> {
  const invitations = await dataManager.getInvitations();
  return invitations.filter(i => i.empresaId === empresaId && !i.isUsed);
}

// Auditoría
export async function logUserActivity(
  dataManager: DataManager,
  userId: string, 
  action: string, 
  resource: string, 
  resourceId?: string, 
  details: Record<string, any> = {}
): Promise<void> {
  const activity: UserActivity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    action,
    resource,
    resourceId,
    details,
    timestamp: Date.now()
  };
  
  await dataManager.addUserActivity(activity);
}

export async function getUserActivities(dataManager: DataManager, userId: string, limit: number = 50): Promise<UserActivity[]> {
  const activities = await dataManager.getUserActivities();
  return activities
    .filter(a => a.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function getRecentActivities(dataManager: DataManager, limit: number = 100): Promise<UserActivity[]> {
  const activities = await dataManager.getUserActivities();
  return activities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// Validaciones de permisos
export function hasPermission(user: User, permission: string): boolean {
  // Si tiene permisos de SUPERADMIN (todos los permisos)
  if (user.permissions.includes('*')) return true;
  
  return user.permissions.includes(permission);
}

export function canAccessEmpresa(user: User, empresaId: string): boolean {
  if (user.role === 'SUPERADMIN') return true;
  return user.empresaId === empresaId;
}

export function canManageUsers(user: User): boolean {
  // Si tiene permisos de SUPERADMIN (todos los permisos)
  if (user.permissions.includes('*')) return true;
  
  // Si tiene permisos de empleados o usuarios
  return hasPermission(user, 'empleados') || 
         hasPermission(user, 'usuarios:create') || 
         hasPermission(user, 'usuarios:edit');
}

export function canManageDescuentos(user: User): boolean {
  // Si tiene permisos de SUPERADMIN (todos los permisos)
  if (user.permissions.includes('*')) return true;
  
  return hasPermission(user, 'descuentos:create') || hasPermission(user, 'descuentos:edit');
}

export function canManageEmpresas(user: User): boolean {
  // Si tiene permisos de SUPERADMIN (todos los permisos)
  if (user.permissions.includes('*')) return true;
  
  return hasPermission(user, 'empresas:create') || hasPermission(user, 'empresas:edit');
}
