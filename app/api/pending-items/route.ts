import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'pending-items.json');

function readItems() {
  try {
    const data = readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading items file:', error);
    return [];
  }
}

function writeItems(items: any[]) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing items file:', error);
    return false;
  }
}

export async function GET() {
  try {
    const items = readItems();
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Error obteniendo items pendientes:', error);
    return NextResponse.json({ success: false, error: 'Error obteniendo items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const item = await request.json();
    
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      expanded: false
    };
    
    const items = readItems();
    items.push(newItem);
    writeItems(items);
    
    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error creando item pendiente:', error);
    return NextResponse.json({ success: false, error: 'Error creando item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    
    const items = readItems();
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Item no encontrado' }, { status: 404 });
    }
    
    items[index] = { ...items[index], ...updates };
    writeItems(items);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando item pendiente:', error);
    return NextResponse.json({ success: false, error: 'Error actualizando item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    const items = readItems();
    const filteredItems = items.filter(item => item.id !== id);
    
    if (items.length === filteredItems.length) {
      return NextResponse.json({ success: false, error: 'Item no encontrado' }, { status: 404 });
    }
    
    writeItems(filteredItems);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando item pendiente:', error);
    return NextResponse.json({ success: false, error: 'Error eliminando item' }, { status: 500 });
  }
}
