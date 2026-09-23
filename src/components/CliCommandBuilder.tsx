import React, { useState } from 'react';
import { Terminal, Copy, Check, Sparkles } from 'lucide-react';
import { FreezeManifest } from '../types';

interface CliCommandBuilderProps {
  manifest: FreezeManifest;
}

export const CliCommandBuilder: React.FC<CliCommandBuilderProps> = ({ manifest }) => {
  const [copied, setCopied] = useState(false);

  // Construct CLI flags based on current manifest state
  const flags: string[] = [];

  if (manifest.bundleMode === 'onefile') {
    flags.push('--onefile');
  }

  if (manifest.debug.enabled) {
    flags.push('--debug');
  }

  if (manifest.debug.consoleWindow) {
    flags.push('--console');
  }

  if (manifest.targetPlatform === 'windows' && manifest.uac.level === 'requireAdministrator') {
    flags.push('--uac-admin');
  }

  if (manifest.targetPlatform === 'windows' && manifest.uac.uiAccess) {
    flags.push('--uac-uiaccess');
  }

  if (!manifest.optimization.upxEnabled) {
    flags.push('--no-upx');
  }

  if (manifest.optimization.cleanBuild) {
    flags.push('--clean');
  }

  if (manifest.targetPlatform !== 'windows') {
    flags.push(`--target ${manifest.targetPlatform}`);
  }

  const fullCommand = `qyro freeze ${flags.join(' ')}`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 text-white shadow-md space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-zinc-200">
            Command
          </span>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-mono">
            Qyro CLI v1.0.0
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Command'}</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 font-mono text-xs text-amber-300 overflow-x-auto select-all">
        <code>$ {fullCommand}</code>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 pt-1">
        <span className="text-zinc-500 font-semibold">Active Flags:</span>
        {flags.length === 0 ? (
          <span className="text-zinc-500">None (using defaults from settings/{manifest.targetPlatform}.json)</span>
        ) : (
          flags.map((flag, idx) => (
            <span key={idx} className="bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-300 font-mono border border-zinc-700">
              {flag}
            </span>
          ))
        )}
      </div>
    </div>
  );
};
