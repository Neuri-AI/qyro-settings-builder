import React, { useState } from 'react';
import { Header } from './components/Header';
import { ManifestConfigurator } from './components/ManifestConfigurator';
import { CliCommandBuilder } from './components/CliCommandBuilder';
import { PRESETS } from './data/presets';
import { FreezeManifest } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'manifest' | 'simulator' | 'code' | 'architecture'>('manifest');
  const [manifest, setManifest] = useState<FreezeManifest>(PRESETS[0].manifest);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setManifest(preset.manifest);
    }
  };

  const handleTriggerBuild = () => {
    setActiveTab('simulator');
    setIsBuilding(true);
    setTimeout(() => {
      setIsBuilding(false);
    }, 4000);
  };

  const handleResetBuild = () => {
    setIsBuilding(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        manifest={manifest}
        onApplyPreset={handleApplyPreset}
        onTriggerBuild={handleTriggerBuild}
        isBuilding={isBuilding}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dynamic CLI Command preview on top of manifest and simulator tabs */}
        {(activeTab === 'manifest' || activeTab === 'simulator') && (
          <CliCommandBuilder manifest={manifest} />
        )}

        {/* Tab Views */}
        {activeTab === 'manifest' && (
          <ManifestConfigurator
            manifest={manifest}
            onChange={setManifest}
            onRunBuild={handleTriggerBuild}
            isBuilding={isBuilding}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-800">Qyro settings generator</span>
            <span>&bull;</span>
          </div>
          <div>
            &copy; Neuri AI 2022 - {new Date().getFullYear()}.
            {' '}
            This project is licensed under the MIT License.
          </div>
        </div>
      </footer>
    </div>
  );
}
