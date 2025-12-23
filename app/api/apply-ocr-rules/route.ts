import { NextRequest, NextResponse } from 'next/server';
import { applyOCRRulesToReceipt } from '@/lib/apply-ocr-rules';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { empresa, archivo, reciboKey, debugOnly } = await req.json();
    
    if (!empresa || !archivo || !reciboKey) {
      return NextResponse.json({ 
        error: 'empresa, archivo y reciboKey son requeridos' 
      }, { status: 400 });
    }

    const result = await applyOCRRulesToReceipt(empresa, archivo, reciboKey);
    
    // result puede ser { extractedValues, debugInfo } o solo extractedValues
    const extractedValues = result.extractedValues || result;
    const debugInfo = result.debugInfo || null;
    
    // Si es solo debug, retornar solo la información de debug
    if (debugOnly) {
      return NextResponse.json({
        success: true,
        debugInfo,
        message: 'Información de debug OCR obtenida'
      });
    }
    
    return NextResponse.json({
      success: true,
      extractedValues,
      debugInfo, // Incluir información de depuración
      message: `Reglas OCR aplicadas. ${Object.keys(extractedValues).length} campos extraídos.`
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ OCR API Error: ${errorMsg}`);
    return NextResponse.json({ 
      error: 'Error aplicando reglas OCR',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


