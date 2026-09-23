import React from "react";
import { Layers, Sliders, Code, Play } from "lucide-react";
import { PRESETS } from "../data/presets";
import { FreezeManifest } from "../types";

interface HeaderProps {
  activeTab: "manifest" | "simulator" | "code" | "architecture";
  setActiveTab: (
    tab: "manifest" | "simulator" | "code" | "architecture",
  ) => void;
  manifest: FreezeManifest;
  onApplyPreset: (presetId: string) => void;
  onTriggerBuild: () => void;
  isBuilding: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  manifest,
  onApplyPreset,
  onTriggerBuild,
  isBuilding,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <svg
                className="w-5 h-5"
                width="276"
                height="286"
                viewBox="0 0 276 286"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="196.258"
                  cy="29.5017"
                  r="29"
                  transform="rotate(179 196.258 29.5017)"
                  fill="white"
                />
                <rect
                  x="175.911"
                  y="93.252"
                  width="18.5298"
                  height="42.4224"
                  transform="rotate(-154 175.911 93.252)"
                  fill="white"
                />
                <circle cx="85.7908" cy="256.98" r="29" fill="white" />
                <rect
                  x="104.638"
                  y="198"
                  width="19.1273"
                  height="36.1507"
                  transform="rotate(26 104.638 198)"
                  fill="white"
                />
                <circle
                  cx="246.791"
                  cy="203"
                  r="29"
                  transform="rotate(-90 246.791 203)"
                  fill="white"
                />
                <rect
                  x="188.791"
                  y="187.191"
                  width="19.1273"
                  height="36.1507"
                  transform="rotate(-64 188.791 187.191)"
                  fill="white"
                />
                <circle
                  cx="30.4778"
                  cy="95.4782"
                  r="29"
                  transform="rotate(93 30.4778 95.4782)"
                  fill="white"
                />
                <rect
                  x="87.571"
                  y="114.3"
                  width="19.1273"
                  height="36.1507"
                  transform="rotate(119 87.571 114.3)"
                  fill="white"
                />
                <path
                  d="M204.791 144C204.791 179.899 175.689 209 139.791 209C103.892 209 74.7908 179.899 74.7908 144C74.7908 108.101 103.892 79 139.791 79C175.689 79 204.791 108.101 204.791 144ZM109.232 144C109.232 160.877 122.914 174.559 139.791 174.559C156.668 174.559 170.35 160.877 170.35 144C170.35 127.123 156.668 113.441 139.791 113.441C122.914 113.441 109.232 127.123 109.232 144Z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-zinc-900">
                  QYRO
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md">
                  Settings Generator
                </span>
              </div>
              <p className="text-xs text-zinc-500 hidden sm:block">
                The official QYRO settings generator for Python GUI frameworks.
              </p>
            </div>
          </div>

          {/* Quick Presets: Kivy, Qt, Tkinter & Build Trigger */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-1.5">
              <span className="text-xs text-zinc-400 font-medium mr-1">
                Presets:
              </span>
              {PRESETS.map((preset) => {
                const isActive =
                  (preset.id === "kivy-app" && manifest.framework === "Kivy") ||
                  (preset.id === "qt-app" &&
                    (manifest.framework.startsWith("PySide") ||
                      manifest.framework.startsWith("PyQt"))) ||
                  (preset.id === "tkinter-app" &&
                    manifest.framework === "Tkinter");

                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset.id)}
                    className={`px-2.5 py-1 text-xs border rounded-lg font-semibold transition-all ${
                      isActive
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-900"
                    }`}
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
