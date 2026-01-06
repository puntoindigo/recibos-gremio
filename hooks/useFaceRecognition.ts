// hooks/useFaceRecognition.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// face-api.js se carga desde CDN para evitar incluirlo en el bundle
let faceapiPromise: Promise<any> | null = null;

const loadFaceApi = async () => {
  if (typeof window === 'undefined') {
    throw new Error('face-api.js solo puede usarse en el cliente');
  }
  
  if (!faceapiPromise) {
    // Cargar face-api.js desde CDN usando dynamic import con script tag
    faceapiPromise = new Promise((resolve, reject) => {
      // Verificar si ya está cargado (puede estar como faceapi o faceApi)
      const existingFaceApi = (window as any).faceapi || (window as any).faceApi;
      if (existingFaceApi) {
        resolve(existingFaceApi);
        return;
      }

      // Crear script tag para cargar desde CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;
      
      // Esperar a que se cargue y verificar diferentes formas de exposición
      script.onload = () => {
        // face-api.js puede exponerse de diferentes formas
        const faceApi = (window as any).faceapi || 
                       (window as any).faceApi || 
                       (window as any).face_api;
        
        if (faceApi) {
          resolve(faceApi);
        } else {
          // Si no está disponible globalmente, intentar import dinámico como fallback
          import('face-api.js').then(resolve).catch(() => {
            reject(new Error('face-api.js no se cargó correctamente desde CDN'));
          });
        }
      };
      
      script.onerror = () => {
        reject(new Error('Error cargando face-api.js desde CDN. Verifica tu conexión a internet.'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  return faceapiPromise;
};

export interface FaceRecognitionState {
  isModelLoaded: boolean;
  isDetecting: boolean;
  error: string | null;
  descriptor: Float32Array | null;
}

export interface UseFaceRecognitionReturn {
  state: FaceRecognitionState;
  loadModels: () => Promise<void>;
  detectFace: (videoElement: HTMLVideoElement) => Promise<Float32Array | null>;
  stopDetection: () => void;
}

/**
 * Hook personalizado para manejar reconocimiento facial con face-api.js
 * 
 * Este hook encapsula toda la lógica de face-api.js y mantiene el estado
 * del modelo cargado y las detecciones en curso.
 */
export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [state, setState] = useState<FaceRecognitionState>({
    isModelLoaded: false,
    isDetecting: false,
    error: null,
    descriptor: null
  });

  const modelsLoadedRef = useRef(false);

  /**
   * Carga los modelos de face-api.js desde la carpeta public
   */
  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) {
      setState(prev => ({ ...prev, isModelLoaded: true }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Cargar face-api.js dinámicamente solo en el cliente
      const faceapi = await loadFaceApi();

      // Cargar los modelos necesarios desde CDN
      // Usamos unpkg CDN que tiene los modelos de face-api.js
      const MODEL_URL = 'https://unpkg.com/face-api.js@0.22.2/weights';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      modelsLoadedRef.current = true;
      setState(prev => ({
        ...prev,
        isModelLoaded: true,
        error: null
      }));
    } catch (error) {
      console.error('Error cargando modelos de face-api:', error);
      setState(prev => ({
        ...prev,
        isModelLoaded: false,
        error: error instanceof Error ? error.message : 'Error desconocido al cargar modelos'
      }));
    }
  }, []);

  /**
   * Detecta un rostro en el video y extrae su descriptor
   */
  const detectFace = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<Float32Array | null> => {
    if (!state.isModelLoaded) {
      throw new Error('Los modelos no están cargados. Llama a loadModels() primero.');
    }

    try {
      setState(prev => ({ ...prev, isDetecting: true, error: null }));

      // Cargar face-api.js dinámicamente
      const faceapi = await loadFaceApi();

      // Detectar el rostro con el detector más rápido
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setState(prev => ({
          ...prev,
          isDetecting: false,
          descriptor: null,
          error: 'No se detectó ningún rostro en la imagen'
        }));
        return null;
      }

      const descriptor = detection.descriptor;
      setState(prev => ({
        ...prev,
        isDetecting: false,
        descriptor,
        error: null
      }));

      return descriptor;
    } catch (error) {
      console.error('Error detectando rostro:', error);
      setState(prev => ({
        ...prev,
        isDetecting: false,
        descriptor: null,
        error: error instanceof Error ? error.message : 'Error desconocido al detectar rostro'
      }));
      return null;
    }
  }, [state.isModelLoaded]);

  /**
   * Detiene la detección en curso
   */
  const stopDetection = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDetecting: false
    }));
  }, []);

  return {
    state,
    loadModels,
    detectFace,
    stopDetection
  };
}

