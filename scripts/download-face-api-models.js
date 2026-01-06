// scripts/download-face-api-models.js
// Script para descargar los modelos de face-api.js necesarios

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MODELS_DIR = path.join(process.cwd(), 'public', 'models');

// Modelos necesarios para reconocimiento facial
const MODELS = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

// Crear directorio si no existe
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log('✅ Directorio creado:', MODELS_DIR);
}

/**
 * Descarga un archivo desde una URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Seguir redirecciones
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Error descargando ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

/**
 * Descarga todos los modelos
 */
async function downloadModels() {
  console.log('📥 Descargando modelos de face-api.js...\n');

  for (const model of MODELS) {
    const url = `${MODEL_URL}/${model}`;
    const filepath = path.join(MODELS_DIR, model);
    
    // Verificar si el archivo ya existe
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${model} ya existe, omitiendo...`);
      continue;
    }

    try {
      console.log(`⬇️  Descargando ${model}...`);
      await downloadFile(url, filepath);
      console.log(`✅ ${model} descargado exitosamente\n`);
    } catch (error) {
      console.error(`❌ Error descargando ${model}:`, error.message);
      process.exit(1);
    }
  }

  console.log('✅ Todos los modelos descargados exitosamente');
  console.log(`📁 Modelos guardados en: ${MODELS_DIR}`);
}

// Ejecutar descarga
downloadModels().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

