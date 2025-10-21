'use client';

import React, { useState } from 'react';
import DropdownStyleSelector from '../../components/DropdownStyleSelector';
import MatrixDropdown from '../../components/ui/matrix-dropdown';
import CyberDropdown from '../../components/ui/cyber-dropdown';
import HolographicDropdown from '../../components/ui/holographic-dropdown';

const DropdownDemoPage = () => {
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [category, setCategory] = useState('ui');

  const priorityOptions = [
    { value: 'high', label: 'ALTA', icon: '🔥' },
    { value: 'medium', label: 'MEDIA', icon: '⚡' },
    { value: 'low', label: 'BAJA', icon: '💧' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'PENDIENTE', icon: '⏳' },
    { value: 'in-progress', label: 'ACTIVA', icon: '🚀' },
    { value: 'completed', label: 'FINALIZADA', icon: '✅' }
  ];

  const categoryOptions = [
    { value: 'ui', label: 'UI/UX', icon: '🎨' },
    { value: 'backend', label: 'BACKEND', icon: '⚙️' },
    { value: 'frontend', label: 'FRONTEND', icon: '💻' },
    { value: 'database', label: 'DATABASE', icon: '🗄️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Dropdown Styles Demo
          </h1>
          <p className="text-xl text-gray-300">
            Prueba las 3 propuestas de diseño moderno, tech y matrix
          </p>
        </div>

        {/* Style Selector */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Selector de Estilo</h2>
          <DropdownStyleSelector
            value={priority}
            options={priorityOptions}
            onChange={setPriority}
            style="matrix"
          />
        </div>

        {/* Individual Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Matrix Style */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              🔮 Matrix Style
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prioridad</label>
                <MatrixDropdown
                  value={priority}
                  options={priorityOptions}
                  onChange={setPriority}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                <MatrixDropdown
                  value={status}
                  options={statusOptions}
                  onChange={setStatus}
                />
              </div>
            </div>
          </div>

          {/* Cyber Style */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              ⚡ Cyber Style
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prioridad</label>
                <CyberDropdown
                  value={priority}
                  options={priorityOptions}
                  onChange={setPriority}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                <CyberDropdown
                  value={status}
                  options={statusOptions}
                  onChange={setStatus}
                />
              </div>
            </div>
          </div>

          {/* Holographic Style */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              ✨ Holographic Style
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prioridad</label>
                <HolographicDropdown
                  value={priority}
                  options={priorityOptions}
                  onChange={setPriority}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                <HolographicDropdown
                  value={status}
                  options={statusOptions}
                  onChange={setStatus}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Values */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Valores Actuales</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <span className="text-sm text-gray-300">Prioridad:</span>
              <span className="ml-2 text-white font-semibold">{priority}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <span className="text-sm text-gray-300">Estado:</span>
              <span className="ml-2 text-white font-semibold">{status}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <span className="text-sm text-gray-300">Categoría:</span>
              <span className="ml-2 text-white font-semibold">{category}</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Características</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-pink-400 mb-2">🔮 Matrix</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Efecto glitch al cambiar</li>
                <li>• Colores verde matrix</li>
                <li>• Animaciones suaves</li>
                <li>• Hover con tooltip</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-cyan-400 mb-2">⚡ Cyber</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Efectos de pulso</li>
                <li>• Colores cyan/blue</li>
                <li>• Glow effects</li>
                <li>• Animaciones rápidas</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-400 mb-2">✨ Holographic</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Efectos holográficos</li>
                <li>• Colores rainbow</li>
                <li>• Glass morphism</li>
                <li>• Animaciones elegantes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropdownDemoPage;
