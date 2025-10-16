// lib/user-management.ts
import { db, User, Empresa, Invitation, UserActivity, generateUserId, generateEmpresaId, generateInvitationToken, ROLE_PERMISSIONS } from './db';

// Gestión de usuarios
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'permissions'>): Promise<User> {
  const user: User = {
    id: generateUserId(),
    ...userData,
    permissions: ROLE_PERMISSIONS[userData.role],
    createdAt: Date.now()
  };
  
  await db.users.add(user);
  await logUserActivity(user.id, 'user:create', 'user', user.id, { action: 'user_created' });
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  return await db.users.get(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return await db.users.where('email').equals(email).first();
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  await db.users.update(id, { ...updates, fechaModificacion: Date.now() });
  await logUserActivity(id, 'user:update', 'user', id, { updates });
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
  await logUserActivity(id, 'user:delete', 'user', id, { action: 'user_deleted' });
}

export async function getUsersByEmpresa(empresaId: string): Promise<User[]> {
  return await db.users.where('empresaId').equals(empresaId).toArray();
}

export async function updateUserLastLogin(id: string): Promise<void> {
  await db.users.update(id, { lastLogin: Date.now() });
}

// Gestión de empresas
export async function createEmpresa(empresaData: Omit<Empresa, 'id' | 'createdAt'>): Promise<Empresa> {
  const empresa: Empresa = {
    id: generateEmpresaId(),
    ...empresaData,
    createdAt: Date.now()
  };
  
  await db.empresas.add(empresa);
  await logUserActivity(empresaData.adminUserId, 'empresa:create', 'empresa', empresa.id, { action: 'empresa_created' });
  return empresa;
}

export async function getEmpresaById(id: string): Promise<Empresa | undefined> {
  return await db.empresas.get(id);
}

export async function getAllEmpresas(): Promise<Empresa[]> {
  return await db.empresas.where('isActive').equals(true).toArray();
}

export async function updateEmpresa(id: string, updates: Partial<Empresa>): Promise<void> {
  await db.empresas.update(id, updates);
  await logUserActivity(updates.adminUserId || '', 'empresa:update', 'empresa', id, { updates });
}

// Gestión de invitaciones
export async function createInvitation(invitationData: Omit<Invitation, 'id' | 'token' | 'createdAt' | 'isUsed'>): Promise<Invitation> {
  const invitation: Invitation = {
    id: generateInvitationToken(),
    token: generateInvitationToken(),
    ...invitationData,
    isUsed: false,
    createdAt: Date.now()
  };
  
  await db.invitations.add(invitation);
  await logUserActivity(invitationData.createdBy, 'invitation:create', 'invitation', invitation.id, { email: invitationData.email });
  return invitation;
}

export async function getInvitationByToken(token: string): Promise<Invitation | undefined> {
  return await db.invitations.where('token').equals(token).first();
}

export async function markInvitationAsUsed(token: string): Promise<void> {
  await db.invitations.where('token').equals(token).modify({ isUsed: true });
}

export async function getPendingInvitations(empresaId: string): Promise<Invitation[]> {
  return await db.invitations.where(['empresaId', 'isUsed']).equals([empresaId, false]).toArray();
}

// Auditoría
export async function logUserActivity(
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
  
  await db.userActivities.add(activity);
}

export async function getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
  return await db.userActivities
    .where('userId')
    .equals(userId)
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getRecentActivities(limit: number = 100): Promise<UserActivity[]> {
  return await db.userActivities
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

// Validaciones de permisos
export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function canAccessEmpresa(user: User, empresaId: string): boolean {
  if (user.role === 'SUPERADMIN') return true;
  return user.empresaId === empresaId;
}

export function canManageUsers(user: User): boolean {
  return hasPermission(user, 'usuarios:create') || hasPermission(user, 'usuarios:edit');
}

export function canManageDescuentos(user: User): boolean {
  return hasPermission(user, 'descuentos:create') || hasPermission(user, 'descuentos:edit');
}
