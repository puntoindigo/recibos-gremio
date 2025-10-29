// app/api/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 Logout endpoint llamado');
    
    // Crear respuesta de logout
    const response = NextResponse.json({ 
      success: true, 
      message: 'Sesión cerrada exitosamente' 
    });
    
    // Limpiar cookies de sesión
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    
    console.log('✅ Logout exitoso');
    
    return response;
    
  } catch (error) {
    console.error('❌ Error en logout:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error cerrando sesión' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔓 Logout GET endpoint llamado');
    
    // Crear respuesta de logout
    const response = NextResponse.redirect(new URL('/auth/signin', request.url));
    
    // Limpiar cookies de sesión
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    
    console.log('✅ Logout exitoso - redirigiendo a login');
    
    return response;
    
  } catch (error) {
    console.error('❌ Error en logout:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

