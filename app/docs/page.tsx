import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';

interface DocsPageProps {
  searchParams: { doc?: string };
}

const availableDocs = {
  'dashboard-plus': 'DASHBOARD_PLUS_BUTTONS.md',
  'estado-actual': 'ESTADO_ACTUAL.md',
  'desarrollo': 'DESARROLLO_2025-01-17.md',
  'caso-594': 'CASO_594_SUBIDAS_RESUELTO.md',
  'readme': 'README.md'
};

export default async function DocsPage({ searchParams }: DocsPageProps) {
  const resolvedSearchParams = await searchParams;
  const docType = resolvedSearchParams.doc || 'dashboard-plus';
  const fileName = availableDocs[docType as keyof typeof availableDocs];
  
  if (!fileName) {
    notFound();
  }

  let content = '';
  let title = '';

  try {
    const filePath = join(process.cwd(), 'public', fileName);
    content = readFileSync(filePath, 'utf-8');
    
    // Extract title from first line or filename
    const lines = content.split('\n');
    const firstLine = lines[0];
    if (firstLine.startsWith('# ')) {
      title = firstLine.substring(2);
    } else {
      title = fileName.replace('.md', '').replace(/_/g, ' ');
    }
  } catch (error) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(availableDocs).map(([key, file]) => (
                <a
                  key={key}
                  href={`/docs?doc=${key}`}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    docType === key
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {key.replace('-', ' ').toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {content}
            </pre>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Documentación generada automáticamente desde {fileName}
            </p>
            <div className="mt-2">
              <a 
                href="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Volver a la aplicación
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
