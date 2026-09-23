import React, { useState } from "react";
import {
  ShieldAlert,
  Terminal,
  Zap,
  Package,
  Folder,
  Layers,
  Copy,
  Check,
  Download,
  Info,
  SlidersHorizontal,
  Monitor,
  Sparkles,
  FolderTree,
  User,
  Boxes,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import {
  FreezeManifest,
  UACLevel,
  TargetPlatform,
  FrameworkType,
  BytecodeOptLevel,
  KivyConfig,
  QyroAddon,
} from "../types";
import { AVAILABLE_ADDONS } from "../data/addons";
import {
  FRAMEWORK_EXCLUSION_CATALOG,
  getRecommendedExcludesForFramework,
  sanitizeExcludesForFramework,
  getUpxExcludesForPlatform,
  calculateEstimatedSize,
} from "../data/optimizationPresets";

interface ManifestConfiguratorProps {
  manifest: FreezeManifest;
  onChange: (updated: FreezeManifest) => void;
  onRunBuild: () => void;
  isBuilding: boolean;
}

export const ManifestConfigurator: React.FC<ManifestConfiguratorProps> = ({
  manifest,
  onChange,
  onRunBuild,
  isBuilding,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "project" | "bundle" | "kivy" | "uac" | "debug" | "optimization"
  >("project");
  const [activeJsonFile, setActiveJsonFile] = useState<
    "base" | "windows" | "linux" | "macos" | "release" | "merged"
  >("base");
  const [customAddonInput, setCustomAddonInput] = useState<string>("");
  const [selectedAddonCategory, setSelectedAddonCategory] =
    useState<string>("all");
  const [customExcludeInput, setCustomExcludeInput] = useState<string>("");
  const [selectedExclusionCategory, setSelectedExclusionCategory] =
    useState<string>("all");

  const defaultKivyConfig: KivyConfig = {
    depsMode: "minimal",
    includeSdl2: true,
    includeGlew: true,
    includeGstreamer: false,
    includeAngle: false,
    kvFilesAutoCollect: true,
    customKvPaths: ["views/*.kv", "components/*.kv"],
  };

  // Real-time dynamic size estimation calculation
  const estimatedSize = calculateEstimatedSize(
    manifest.framework,
    manifest.optimization.excludeModules,
    manifest.optimization.upxEnabled,
    manifest.optimization.upxLevel,
    manifest.optimization.stripBinaries,
  );

  // Sanitize current excludes to remove unneeded cross-framework entries (e.g. 'kivy' in PySide6)
  const sanitizedExcludes = sanitizeExcludesForFramework(
    manifest.framework,
    manifest.optimization.excludeModules,
  );

  // 1. Generate settings/base.json (Pure cross-platform project metadata)
  const baseJsonObj = {
    app_name: manifest.appName,
    author: manifest.author || "John Doe",
    entry_point: manifest.entryPoint,
    addons: manifest.addons || [],
    version: manifest.version,
    binding: manifest.framework.toLowerCase(),
    hidden_imports: manifest.hiddenImports,
  };

  // 2. Generate settings/windows.json
  const windowsJsonObj: any = {
    bundle_mode: manifest.bundleMode,
    uac: {
      level: manifest.uac.level,
      ui_access: manifest.uac.uiAccess,
    },
    debug: {
      enabled: manifest.debug.enabled,
      console_window: manifest.debug.consoleWindow,
    },
    optimization: {
      strip_binaries: manifest.optimization.stripBinaries,
      clean_build: manifest.optimization.cleanBuild,
      upx_enabled: manifest.optimization.upxEnabled,
      upx_dir:
        manifest.optimization.upxDir !== undefined
          ? manifest.optimization.upxDir
          : false,
      upx_level: manifest.optimization.upxLevel,
      upx_excludes: getUpxExcludesForPlatform(
        "windows",
        manifest.framework,
        manifest.optimization.upxExcludes,
      ),
      exclude_binaries:
        manifest.optimization.excludeBinaries ||
        (manifest.framework === "PySide6" ? ["opengl32sw.dll"] : []),
      exclude_plugins:
        manifest.optimization.excludePlugins ||
        (manifest.framework === "PySide6"
          ? [
              "generic",
              "networkinformation",
              "tls",
              "styles",
              "platforminputcontexts",
              "iconengines",
              "imageformats",
            ]
          : []),
      bytecode_opt: manifest.optimization.bytecodeOpt,
      exclude_modules: sanitizedExcludes,
    },
  };

  if (manifest.framework === "Kivy" && manifest.kivy) {
    windowsJsonObj.kivy = {
      deps_mode: manifest.kivy.depsMode,
      include_sdl2: manifest.kivy.includeSdl2,
      include_glew: manifest.kivy.includeGlew,
      include_gstreamer: manifest.kivy.includeGstreamer,
      kv_files_auto_collect: manifest.kivy.kvFilesAutoCollect,
    };
  }

  // 3. Generate settings/linux.json (standard Qyro profile)
  const linuxJsonObj = {
    categories: "Utility;",
    description: "",
    author_email: "",
    url: "",
    bundle_mode: manifest.bundleMode,
    debug: {
      enabled: manifest.debug.enabled,
      console: manifest.debug.consoleWindow,
    },
    optimization: {
      strip_binaries: manifest.optimization.stripBinaries,
      clean_build: manifest.optimization.cleanBuild,
      upx_enabled: manifest.optimization.upxEnabled,
      upx_dir:
        manifest.optimization.upxDir !== undefined
          ? manifest.optimization.upxDir
          : false,
      upx_level: manifest.optimization.upxLevel,
      upx_excludes: getUpxExcludesForPlatform(
        "linux",
        manifest.framework,
        manifest.optimization.upxExcludes,
      ),
      exclude_binaries: manifest.optimization.excludeBinaries || [],
      exclude_plugins:
        manifest.optimization.excludePlugins ||
        (manifest.framework.startsWith("PySide") ||
        manifest.framework.startsWith("PyQt")
          ? [
              "generic",
              "networkinformation",
              "tls",
              "styles",
              "platforminputcontexts",
              "iconengines",
              "imageformats",
            ]
          : []),
      bytecode_opt: manifest.optimization.bytecodeOpt,
      exclude_modules: sanitizedExcludes,
    },
  };

  // 4. Generate settings/mac.json (standard Qyro profile)
  const macosJsonObj = {
    bundle_mode: manifest.bundleMode,
    mac_bundle_identifier: `com.${(manifest.author || "john").toLowerCase().replace(/\s+/g, "")}.${manifest.appName.toLowerCase().replace(/\s+/g, "")}`,
    debug: {
      enabled: manifest.debug.enabled,
      console: manifest.debug.consoleWindow,
    },
    optimization: {
      strip_binaries: manifest.optimization.stripBinaries,
      clean_build: manifest.optimization.cleanBuild,
      upx_enabled: false,
      exclude_binaries: manifest.optimization.excludeBinaries || [],
      exclude_plugins:
        manifest.optimization.excludePlugins ||
        (manifest.framework.startsWith("PySide") ||
        manifest.framework.startsWith("PyQt")
          ? [
              "generic",
              "networkinformation",
              "tls",
              "styles",
              "platforminputcontexts",
              "iconengines",
              "imageformats",
            ]
          : []),
      bytecode_opt: manifest.optimization.bytecodeOpt,
      exclude_modules: sanitizedExcludes,
    },
  };

  // 5. Generate settings/release.json (standard Qyro profile)
  const releaseJsonObj = {
    release: false,
    environment: "development",
  };

  let currentJsonString = "";
  let currentFilePath = "";

  switch (activeJsonFile) {
    case "base":
      currentJsonString = JSON.stringify(baseJsonObj, null, 4);
      currentFilePath = "settings/base.json";
      break;
    case "windows":
      currentJsonString = JSON.stringify(windowsJsonObj, null, 4);
      currentFilePath = "settings/windows.json";
      break;
    case "linux":
      currentJsonString = JSON.stringify(linuxJsonObj, null, 4);
      currentFilePath = "settings/linux.json";
      break;
    case "macos":
      currentJsonString = JSON.stringify(macosJsonObj, null, 4);
      currentFilePath = "settings/mac.json";
      break;
    case "release":
      currentJsonString = JSON.stringify(releaseJsonObj, null, 4);
      currentFilePath = "settings/release.json";
      break;
    case "merged":
    default:
      currentJsonString = JSON.stringify(manifest, null, 4);
      currentFilePath = `Domain: FreezeManifest (Merged for ${manifest.targetPlatform})`;
      break;
  }

  const handlePlatformChange = (platform: TargetPlatform) => {
    const updatedUpxExcludes = getUpxExcludesForPlatform(
      platform,
      manifest.framework,
      manifest.optimization.upxExcludes,
    );
    onChange({
      ...manifest,
      targetPlatform: platform,
      optimization: {
        ...manifest.optimization,
        upxExcludes: updatedUpxExcludes,
      },
    });
    // If switching away from windows while on UAC tab, fallback to bundle tab
    if (platform !== "windows" && activeSection === "uac") {
      setActiveSection("bundle");
    }
    // Auto-switch right JSON panel to match the chosen platform
    setActiveJsonFile(platform);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(currentJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const filename =
      activeJsonFile === "merged" ? "manifest.json" : `${activeJsonFile}.json`;
    const blob = new Blob([currentJsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFrameworkChange = (fw: FrameworkType) => {
    const rawRecommended = getRecommendedExcludesForFramework(fw);
    const sanitizedRecommended = sanitizeExcludesForFramework(
      fw,
      rawRecommended,
    );
    const updatedUpxExcludes = getUpxExcludesForPlatform(
      manifest.targetPlatform,
      fw,
    );
    let updatedHidden = [...manifest.hiddenImports];
    let updatedKivy = manifest.kivy || defaultKivyConfig;

    if (fw === "Kivy") {
      updatedHidden = [
        "__future__",
        "kivy.core.window.window_sdl2",
        "kivy.core.text.text_sdl2",
        "kivy.core.image.img_sdl2",
        "kivy.graphics.cgl",
      ];
    } else if (fw === "PySide6") {
      updatedHidden = [
        "__future__",
        "PySide6.QtCore",
        "PySide6.QtGui",
        "PySide6.QtWidgets",
      ];
    } else if (fw === "PyQt6") {
      updatedHidden = [
        "__future__",
        "PyQt6.QtCore",
        "PyQt6.QtGui",
        "PyQt6.QtWidgets",
      ];
    } else if (fw === "PySide2") {
      updatedHidden = [
        "__future__",
        "PySide2.QtCore",
        "PySide2.QtGui",
        "PySide2.QtWidgets",
      ];
    } else if (fw === "PyQt5") {
      updatedHidden = [
        "__future__",
        "PyQt5.QtCore",
        "PyQt5.QtGui",
        "PyQt5.QtWidgets",
      ];
    } else if (fw === "Tkinter") {
      updatedHidden = [
        "__future__",
        "tkinter",
        "tkinter.ttk",
        "tkinter.messagebox",
        "tkinter.filedialog",
      ];
    } else {
      updatedHidden = ["__future__"];
    }

    onChange({
      ...manifest,
      framework: fw,
      kivy: fw === "Kivy" ? updatedKivy : manifest.kivy,
      optimization: {
        ...manifest.optimization,
        excludeModules: sanitizedRecommended,
        upxExcludes: updatedUpxExcludes,
      },
      hiddenImports: updatedHidden,
    });
  };

  const handleToggleModuleExclusion = (moduleId: string) => {
    const isExcluded = manifest.optimization.excludeModules.includes(moduleId);
    const newExcludes = isExcluded
      ? manifest.optimization.excludeModules.filter((m) => m !== moduleId)
      : [...manifest.optimization.excludeModules, moduleId];

    onChange({
      ...manifest,
      optimization: {
        ...manifest.optimization,
        excludeModules: newExcludes,
      },
    });
  };

  const handleApplyRecommendedExcludes = () => {
    const recommended = getRecommendedExcludesForFramework(manifest.framework);
    onChange({
      ...manifest,
      optimization: {
        ...manifest.optimization,
        excludeModules: recommended,
      },
    });
  };

  const handleSelectAllExcludes = () => {
    const catalog = FRAMEWORK_EXCLUSION_CATALOG[manifest.framework] || [];
    const allIds = Array.from(
      new Set([
        ...manifest.optimization.excludeModules,
        ...catalog.map((c) => c.id),
      ]),
    );
    onChange({
      ...manifest,
      optimization: {
        ...manifest.optimization,
        excludeModules: allIds,
      },
    });
  };

  const handleClearExcludes = () => {
    onChange({
      ...manifest,
      optimization: {
        ...manifest.optimization,
        excludeModules: ["unittest", "test", "pydoc"],
      },
    });
  };

  const handleAddCustomExclude = () => {
    if (!customExcludeInput.trim()) return;
    const cleanName = customExcludeInput.trim();
    if (!manifest.optimization.excludeModules.includes(cleanName)) {
      onChange({
        ...manifest,
        optimization: {
          ...manifest.optimization,
          excludeModules: [...manifest.optimization.excludeModules, cleanName],
        },
      });
    }
    setCustomExcludeInput("");
  };

  const handleRemoveCustomExclude = (modName: string) => {
    onChange({
      ...manifest,
      optimization: {
        ...manifest.optimization,
        excludeModules: manifest.optimization.excludeModules.filter(
          (m) => m !== modName,
        ),
      },
    });
  };

  const handleToggleAddon = (addon: QyroAddon) => {
    const isCurrentlyActive =
      (manifest.addons || []).includes(addon.id) ||
      (manifest.addons || []).includes(addon.package);
    let newAddons: string[];
    let newHiddenImports = [...manifest.hiddenImports];

    if (isCurrentlyActive) {
      newAddons = (manifest.addons || []).filter(
        (a) => a !== addon.id && a !== addon.package,
      );
      const toRemove = new Set(addon.hookDetails.hiddenImports);
      newHiddenImports = newHiddenImports.filter(
        (h) => !toRemove.has(h) || h === "__future__",
      );
    } else {
      newAddons = [...(manifest.addons || []), addon.id];
      addon.hookDetails.hiddenImports.forEach((imp) => {
        if (!newHiddenImports.includes(imp)) {
          newHiddenImports.push(imp);
        }
      });
    }

    onChange({
      ...manifest,
      addons: newAddons,
      hiddenImports: newHiddenImports,
    });
  };

  const handleAddCustomAddon = () => {
    if (!customAddonInput.trim()) return;
    const cleanName = customAddonInput.trim().toLowerCase();
    if (!(manifest.addons || []).includes(cleanName)) {
      onChange({
        ...manifest,
        addons: [...(manifest.addons || []), cleanName],
        hiddenImports: manifest.hiddenImports.includes(cleanName)
          ? manifest.hiddenImports
          : [...manifest.hiddenImports, cleanName],
      });
    }
    setCustomAddonInput("");
  };

  const handleRemoveAddon = (addonName: string) => {
    const matchedAddon = AVAILABLE_ADDONS.find(
      (a) => a.id === addonName || a.package === addonName,
    );
    let newHiddenImports = [...manifest.hiddenImports];
    if (matchedAddon) {
      const toRemove = new Set(matchedAddon.hookDetails.hiddenImports);
      newHiddenImports = newHiddenImports.filter(
        (h) => !toRemove.has(h) || h === "__future__",
      );
    }
    onChange({
      ...manifest,
      addons: (manifest.addons || []).filter((a) => a !== addonName),
      hiddenImports: newHiddenImports,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl p-6 text-white border border-zinc-700 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center space-x-2">
              <span>Project & Freeze Configuration</span>
              {manifest.framework === "Kivy" && (
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md font-mono">
                  Selected Framework: &quot;kivy&quot;
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl">
              The Qyro CLI reads{" "}
              <code className="text-emerald-300">settings/base.json</code>{" "}
              looking for author, addons, binding, entry point and applies build
              overrides from{" "}
              <code className="text-amber-300">
                settings/{manifest.targetPlatform}.json
              </code>{" "}
              (
              {
                // if platform is windows, mention UAC
                manifest.targetPlatform === "windows" && "UAC, "
              }
              OneFile, UPX, Kivy/Qt dependencies).
            </p>
          </div>
        </div>

        {/* Quick Highlights Pills */}
        <div className="mt-5 pt-4 border-t border-zinc-700/60 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-700/50">
            <span className="text-zinc-400 block">GUI Framework:</span>
            <span className="font-semibold text-emerald-300">
              {manifest.framework}
            </span>
          </div>
          <div className="bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-700/50">
            <span className="text-zinc-400 block">Bundle Mode:</span>
            <span className="font-semibold text-amber-300 uppercase">
              {manifest.bundleMode}
            </span>
          </div>
          <div className="bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-700/50">
            <span className="text-zinc-400 block">UAC Level:</span>
            <span
              className={`font-semibold ${manifest.uac.level === "requireAdministrator" ? "text-amber-400" : "text-emerald-400"}`}
            >
              {manifest.uac.level}
            </span>
          </div>
          <div className="bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-700/50">
            <span className="text-zinc-400 block">Debug:</span>
            <span
              className={`font-semibold ${manifest.debug.enabled ? "text-rose-400" : "text-emerald-400"}`}
            >
              {manifest.debug.enabled ? "DEBUG ON" : "PRODUCTION"}
            </span>
          </div>
          <div className="bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-700/50">
            <span className="text-zinc-400 block">UPX Compression:</span>
            <span
              className={`font-semibold ${manifest.optimization.upxEnabled ? "text-amber-300" : "text-zinc-400"}`}
            >
              {manifest.optimization.upxEnabled
                ? `Level -${manifest.optimization.upxLevel}`
                : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Controls (Left) vs JSON Manifest Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Settings */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Pill Buttons */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
            <button
              onClick={() => setActiveSection("project")}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeSection === "project"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Base Project (base.json)</span>
            </button>

            <button
              onClick={() => setActiveSection("bundle")}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeSection === "bundle"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Platform ({manifest.targetPlatform})</span>
            </button>

            {manifest.framework === "Kivy" && (
              <button
                type="button"
                onClick={() => setActiveSection("kivy")}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeSection === "kivy"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Kivy Engine</span>
              </button>
            )}

            {manifest.targetPlatform === "windows" && (
              <button
                type="button"
                onClick={() => setActiveSection("uac")}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeSection === "uac"
                    ? "bg-white text-zinc-900 shadow-xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Windows UAC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection("debug")}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeSection === "debug"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-rose-600" />
              <span>3. Debugging</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("optimization")}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeSection === "optimization"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>4. Optimization</span>
            </button>
          </div>

          {/* Section: Base Project Settings (settings/base.json) */}
          {activeSection === "project" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>
                      Base Project Metadata (
                      <code className="text-emerald-700">
                        settings/base.json
                      </code>
                      )
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-sm font-mono">
                    Qyro Template
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Cross-platform project information shared across all platforms
                  and commands (init, start, freeze).
                </p>
              </div>

              {/* GUI Binding Selection */}
              <div>
                <label className="block font-semibold text-zinc-700 text-xs mb-1.5">
                  Framework Binding (
                  <code className="text-amber-600 font-mono">
                    &quot;binding&quot;: &quot;
                    {manifest.framework.toLowerCase()}&quot;
                  </code>
                  )
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      "Kivy",
                      "PySide6",
                      "PyQt6",
                      "PySide2",
                      "PyQt5",
                      "Tkinter",
                    ] as FrameworkType[]
                  ).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => handleFrameworkChange(fw)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        manifest.framework === fw
                          ? fw === "Kivy"
                            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                            : "bg-zinc-900 border-zinc-900 text-white font-bold"
                          : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs"
                      }`}
                    >
                      <span className="block text-xs font-bold">{fw}</span>
                      <span className="text-[10px] opacity-70 block mt-0.5">
                        {fw === "Kivy"
                          ? "OpenGL / .kv"
                          : fw.startsWith("Py")
                            ? "Qt Family"
                            : "Standard Tkinter"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    App Name (<code className="text-zinc-500">app_name</code>)
                  </label>
                  <input
                    type="text"
                    value={manifest.appName}
                    onChange={(e) =>
                      onChange({ ...manifest, appName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Author (<code className="text-zinc-500">author</code>)
                  </label>
                  <input
                    type="text"
                    value={manifest.author}
                    onChange={(e) =>
                      onChange({ ...manifest, author: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Entry Point (
                    <code className="text-zinc-500">entry_point</code>)
                  </label>
                  <input
                    type="text"
                    value={manifest.entryPoint}
                    onChange={(e) =>
                      onChange({ ...manifest, entryPoint: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Version (<code className="text-zinc-500">version</code>)
                  </label>
                  <input
                    type="text"
                    value={manifest.version}
                    onChange={(e) =>
                      onChange({ ...manifest, version: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Addons Section & Qyro Init Integration */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block font-bold text-zinc-900 text-xs flex items-center space-x-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600" />
                      <span>
                        Project Addons (Optional) (
                        <code className="text-emerald-700">
                          settings/base.json
                        </code>{" "}
                        &rarr; <code className="text-zinc-600">addons</code>)
                      </span>
                    </label>
                    <p className="text-[11px] text-zinc-500 mt-0.5 w-[500px]">
                      These are the dependencies selected during{" "}
                      <code className="text-amber-700 font-mono">qyro init</code>{" "}
                      or during development. The build system automatically
                      resolves its packaging hooks and hidden imports.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-auto">
                    {manifest.addons?.length || 0} enabled
                  </span>
                </div>

                {/* Active Addons Tags */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-700">
                      Project Addons declared in base.json:
                    </span>
                    {manifest.addons && manifest.addons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...manifest, addons: [] })}
                        className="text-[10px] text-zinc-400 hover:text-rose-600 underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                    {manifest.addons && manifest.addons.length > 0 ? (
                      manifest.addons.map((addonName, idx) => {
                        const matched = AVAILABLE_ADDONS.find(
                          (a) => a.id === addonName || a.package === addonName,
                        );
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-semibold text-emerald-950 shadow-2xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{matched ? matched.name : addonName}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddon(addonName)}
                              className="text-zinc-400 hover:text-rose-600 ml-1 p-0.5 rounded hover:bg-zinc-100"
                              title="Remover addon"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic">
                        No addons selected in settings/base.json. Select from
                        the catalog below or add a custom one.
                      </span>
                    )}
                  </div>

                  {/* Quick Custom Addon Input */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-zinc-200/70">
                    <input
                      type="text"
                      placeholder="Add custom pip package (e.g., httpx, numpy)..."
                      value={customAddonInput}
                      onChange={(e) => setCustomAddonInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomAddon();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAddon}
                      disabled={!customAddonInput.trim()}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium rounded-lg flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Available Addons Catalog */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Qyro Addons Catalog (
                        <code className="text-zinc-500 text-[10px]">
                          qyro init
                        </code>
                        )
                      </span>
                    </span>
                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "all",
                        "UI & Design",
                        "Hardware & OS",
                        "Networking",
                        "Media",
                        "Database",
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedAddonCategory(cat)}
                          className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                            selectedAddonCategory === cat
                              ? "bg-zinc-800 text-white font-semibold"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {cat === "all" ? "All" : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {AVAILABLE_ADDONS.filter(
                      (addon) =>
                        selectedAddonCategory === "all" ||
                        addon.category === selectedAddonCategory,
                    ).map((addon) => {
                      const isActive =
                        (manifest.addons || []).includes(addon.id) ||
                        (manifest.addons || []).includes(addon.package);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => handleToggleAddon(addon)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none space-y-1.5 ${
                            isActive
                              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20"
                              : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {isActive ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                              )}
                              <span className="font-bold text-xs text-zinc-900">
                                {addon.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              {addon.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                            {addon.description}
                          </p>
                          <div className="pt-1 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-zinc-500">
                              pip:{" "}
                              <code className="text-zinc-700">
                                {addon.package}
                              </code>
                            </span>
                            {addon.hookDetails.dataIncludes ? (
                              <span className="text-emerald-700 font-semibold">
                                +Assets Auto-Hook
                              </span>
                            ) : (
                              <span className="text-amber-700">
                                +{addon.hookDetails.hiddenImports.length} Hidden
                                Imports
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Platform Bundle Settings (settings/{platform}.json) */}
          {activeSection === "bundle" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>
                      Platform-Specific Configuration (
                      <code className="text-amber-700">
                        settings/{manifest.targetPlatform}.json
                      </code>
                      )
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-sm font-mono uppercase">
                    {manifest.targetPlatform}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Overrides for building on the target operating system.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-zinc-700">
                        Target Platform
                      </label>
                      <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded-sm">
                        settings/
                        {manifest.targetPlatform === "macos"
                          ? "mac.json"
                          : `${manifest.targetPlatform}.json`}
                      </span>
                    </div>
                    <select
                      value={manifest.targetPlatform}
                      onChange={(e) =>
                        handlePlatformChange(e.target.value as TargetPlatform)
                      }
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
                    >
                      <option value="windows">
                        Windows (settings/windows.json)
                      </option>
                      <option value="linux">Linux (settings/linux.json)</option>
                      <option value="macos">macOS (settings/mac.json)</option>
                    </select>
                  </div>
                </div>

                {/* Platform Icon Resources Inspector */}
                <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-300 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400 font-sans font-semibold flex items-center space-x-1.5">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Resources Detected by the CLI for{" "}
                        {manifest.targetPlatform === "windows"
                          ? "Windows"
                          : manifest.targetPlatform === "linux"
                            ? "Linux"
                            : "macOS"}
                        :
                      </span>
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-sm">
                      resources/
                      {manifest.targetPlatform === "windows"
                        ? "base/icons/"
                        : manifest.targetPlatform === "linux"
                          ? "linux/icons/"
                          : "mac/icons/"}
                    </span>
                  </div>

                  {manifest.targetPlatform === "windows" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-emerald-300 font-bold">
                          Icon.ico
                        </span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; .exe Binary
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-zinc-200">
                          16, 24, 32, 64.png
                        </span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; Taskbar / App
                        </span>
                      </div>
                    </div>
                  )}

                  {manifest.targetPlatform === "linux" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-amber-300 font-bold">
                          128, 256, 512, 1024.png
                        </span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; .desktop launcher
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-zinc-200">
                          Deb / AppImage icon
                        </span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; Native package
                        </span>
                      </div>
                    </div>
                  )}

                  {manifest.targetPlatform === "macos" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-amber-300 font-bold">
                          128, 256, 512, 1024.png
                        </span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; Retina ICNS
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-zinc-200">AppIcon.icns</span>
                        <span className="text-zinc-500 text-[10px] font-sans">
                          &rarr; .app bundle
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bundle Mode Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 text-xs mb-2">
                  Binary Distribution Format (
                  <code className="text-amber-600">bundle_mode</code>)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() =>
                      onChange({ ...manifest, bundleMode: "onedir" })
                    }
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                      manifest.bundleMode === "onedir"
                        ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                        : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">
                        OneDir (Directory with DLLs)
                      </span>
                      {manifest.bundleMode === "onedir" && (
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Directory containing the binary and dynamic libraries.
                      Instant startup for Kivy / PySide without temporary
                      extraction.
                    </p>
                  </div>

                  <div
                    onClick={() =>
                      onChange({ ...manifest, bundleMode: "onefile" })
                    }
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                      manifest.bundleMode === "onefile"
                        ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                        : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">
                        OneFile (Single Executable)
                      </span>
                      {manifest.bundleMode === "onefile" && (
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      A single self-extracting file ready for distribution. It
                      automatically extracts to a temporary directory on
                      startup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Dedicated Kivy Engine Settings */}
          {activeSection === "kivy" && (
            <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-emerald-600" />
                    <span>Advanced Kivy Engine Configuration</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 rounded-sm">
                    Kivy Packaging Hooks
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Declared in{" "}
                  <code className="text-emerald-700">
                    settings/{manifest.targetPlatform}.json
                  </code>{" "}
                  under the{" "}
                  <code className="text-emerald-800 font-bold">
                    &quot;kivy&quot;
                  </code>{" "}
                  key.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* KV files auto collection */}
                <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      Automatic *.kv File Collection (kvlang)
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Recursively scans{" "}
                      <code className="text-emerald-900 font-bold">views/</code>{" "}
                      and{" "}
                      <code className="text-emerald-900 font-bold">
                        components/
                      </code>{" "}
                      to package all{" "}
                      <code className="text-emerald-900">.kv</code> views and
                      stylesheets into the binary.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.kivy?.kvFilesAutoCollect ?? true}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        kivy: {
                          ...(manifest.kivy || defaultKivyConfig),
                          kvFilesAutoCollect: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-emerald-600 rounded-sm border-zinc-300 focus:ring-emerald-500"
                  />
                </div>

                {/* Kivy dependencies DLLs */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2.5">
                  <span className="font-bold text-zinc-800 block">
                    Native Binary Dependencies (kivy_deps):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manifest.kivy?.includeSdl2 ?? true}
                        onChange={(e) =>
                          onChange({
                            ...manifest,
                            kivy: {
                              ...(manifest.kivy || defaultKivyConfig),
                              includeSdl2: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-emerald-600 rounded-sm"
                      />
                      <div>
                        <span className="font-bold text-zinc-800 block">
                          SDL2 (Window/Input)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          kivy_deps.sdl2
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manifest.kivy?.includeGlew ?? true}
                        onChange={(e) =>
                          onChange({
                            ...manifest,
                            kivy: {
                              ...(manifest.kivy || defaultKivyConfig),
                              includeGlew: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-emerald-600 rounded-sm"
                      />
                      <div>
                        <span className="font-bold text-zinc-800 block">
                          GLEW (OpenGL)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          kivy_deps.glew
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manifest.kivy?.includeGstreamer ?? false}
                        onChange={(e) =>
                          onChange({
                            ...manifest,
                            kivy: {
                              ...(manifest.kivy || defaultKivyConfig),
                              includeGstreamer: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-emerald-600 rounded-sm"
                      />
                      <div>
                        <span className="font-bold text-zinc-800 block">
                          GStreamer (Media)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Video / Audio
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Kivy Hooks mode */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <span className="font-bold text-zinc-800 block">
                      Hooks Mode (
                      <code className="text-amber-700">deps_mode</code>)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Uses{" "}
                      <code className="text-zinc-700 font-bold">
                        get_deps_minimal()
                      </code>{" "}
                      to reduce size or{" "}
                      <code className="text-zinc-700 font-bold">
                        get_deps_all()
                      </code>{" "}
                      for full compatibility.
                    </span>
                  </div>
                  <select
                    value={manifest.kivy?.depsMode || "minimal"}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        kivy: {
                          ...(manifest.kivy || defaultKivyConfig),
                          depsMode: e.target.value as "minimal" | "all",
                        },
                      })
                    }
                    className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="minimal">Minimal (Recommended)</option>
                    <option value="all">All (Complete)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section: Windows UAC Elevation (Windows-only) */}
          {activeSection === "uac" && manifest.targetPlatform === "windows" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Windows User Account Control (UAC)</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 rounded-sm font-mono">
                    settings/windows.json
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Automatically injects the Windows administrative privilege
                  directive into the executable's PE header.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block font-semibold text-zinc-700 text-xs">
                  Requested Execution Level (
                  <code className="text-amber-600">uac.level</code>)
                </label>

                <div className="space-y-2">
                  {[
                    {
                      id: "asInvoker",
                      title: "asInvoker (Standard)",
                      desc: "Runs the app with the same permissions as the current user. Does not request an elevation prompt.",
                      badge: "Recommended for user applications",
                    },
                    {
                      id: "requireAdministrator",
                      title: "requireAdministrator (Administrator)",
                      desc: "Displays the UAC prompt in Windows when opening the .exe. Requires administrator privileges.",
                      badge: "For system tools or installers",
                    },
                    {
                      id: "highestAvailable",
                      title: "highestAvailable (Highest Available)",
                      desc: "Elevates to Administrator if the user belongs to the Administrators group, or runs with standard privileges.",
                      badge: "Dynamic mode",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        onChange({
                          ...manifest,
                          uac: { ...manifest.uac, level: item.id as UACLevel },
                        })
                      }
                      className={`cursor-pointer p-3 rounded-xl border transition-all ${
                        manifest.uac.level === item.id
                          ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20"
                          : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="uac_level"
                            checked={manifest.uac.level === item.id}
                            onChange={() => {}}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-bold text-zinc-900">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 ml-5 mt-1">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* uiAccess toggle */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-800">
                      Enable <code className="text-amber-700">uiAccess</code>
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Allows bypassing the Windows User Interface Privilege
                      Isolation (UIPI). Requires a valid code-signing
                      certificate.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.uac.uiAccess}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        uac: { ...manifest.uac, uiAccess: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded-sm border-zinc-300 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Debugging */}

          {activeSection === "debug" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-rose-600" />
                  <span>Debugging and Execution Tracing Options</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Diagnose silent import failures or freezes during executable
                  startup.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Master debug switch */}
                <div className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                  <div>
                    <span className="font-bold text-rose-950 block">
                      General Debug Mode (--debug)
                    </span>
                    <span className="text-[11px] text-rose-700">
                      Generates unstripped binaries and disables aggressive UPX
                      compression to facilitate breakpoints.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.debug.enabled}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        debug: {
                          ...manifest.debug,
                          enabled: e.target.checked,
                          consoleWindow: e.target.checked
                            ? true
                            : manifest.debug.consoleWindow,
                        },
                      })
                    }
                    className="w-5 h-5 text-rose-600 rounded-sm border-zinc-300 focus:ring-rose-500"
                  />
                </div>

                {/* Console Window */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <span className="font-bold text-zinc-800 block">
                      Show Terminal Console Window
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Keeps the console visible (
                      <code className="text-amber-700">--console</code>)
                      alongside the GUI to display{" "}
                      <code className="text-zinc-700">stdout/stderr</code> and
                      Python exceptions.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.debug.consoleWindow}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        debug: {
                          ...manifest.debug,
                          consoleWindow: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded-sm border-zinc-300 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Optimization */}

          {activeSection === "optimization" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5 shadow-xs">
              <div className="border-b border-zinc-100 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>
                        Optimization, Framework Exclusions &amp; Compression
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Declarative exclusion configuration in{" "}
                      <code className="text-emerald-700">
                        settings/base.json
                      </code>{" "}
                      and{" "}
                      <code className="text-amber-700">
                        settings/{manifest.targetPlatform}.json
                      </code>
                      .
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-zinc-500 font-medium">
                      Active framework:
                    </span>
                    <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-mono">
                      {manifest.framework}
                    </span>
                  </div>
                </div>
              </div>

              {/* Architecture Explanation Banner for Framework Isolation & JSON Hierarchy */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-indigo-950">
                    Qyro Architecture: Intelligent Isolation & Platform-Specific
                    Configuration
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-indigo-900 pt-1">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 space-y-1">
                    <span className="font-bold text-indigo-950 flex items-center space-x-1">
                      <span>• Automatic Framework Isolation:</span>
                    </span>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      By defining{" "}
                      <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">
                        binding: "{manifest.framework.toLowerCase()}"
                      </code>
                      , Qyro and PyInstaller only package the modules imported
                      by your project.{" "}
                      <strong>
                        You do not need to manually list{" "}
                        <code className="text-rose-600 font-mono">kivy</code> or{" "}
                        <code className="text-rose-600 font-mono">
                          kivy_install
                        </code>{" "}
                        in PySide6 exclusions
                      </strong>{" "}
                      because Qyro's resolver excludes unused runtimes.
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 space-y-1">
                    <span className="font-bold text-indigo-950 flex items-center space-x-1">
                      <span>• JSON File Hierarchy:</span>
                    </span>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      <code className="text-indigo-700 font-mono">
                        settings/base.json
                      </code>{" "}
                      defines the project core (
                      <code className="text-zinc-700 font-mono">app_name</code>,{" "}
                      <code className="text-zinc-700 font-mono">binding</code>,{" "}
                      <code className="text-zinc-700 font-mono">version</code>).
                      <code className="text-indigo-700 font-mono">
                        optimization
                      </code>{" "}
                      options are configured independently for each target
                      platform in{" "}
                      <code className="text-indigo-700 font-mono">
                        settings/windows.json
                      </code>
                      ,{" "}
                      <code className="text-indigo-700 font-mono">
                        settings/mac.json
                      </code>{" "}
                      and{" "}
                      <code className="text-indigo-700 font-mono">
                        settings/linux.json
                      </code>
                      .
                    </p>
                  </div>
                </div>
              </div>

              {/* Framework Selector Bar inside Optimization tab */}
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-700 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Change Framework Binding to test exclusion rules:
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(
                    [
                      "PySide6",
                      "PyQt6",
                      "PySide2",
                      "PyQt5",
                      "Kivy",
                      "Tkinter",
                    ] as FrameworkType[]
                  ).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => handleFrameworkChange(fw)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center transition-all ${
                        manifest.framework === fw
                          ? "bg-zinc-900 text-white font-bold shadow-xs"
                          : "bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Size Estimation & Impact Overview */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl p-4 text-white border border-zinc-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      Final Binary Size Reduction Impact ({manifest.framework})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                      {estimatedSize.excludedCount} modules excluded
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                      -{estimatedSize.percentageSaved}% savings
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-zinc-800/70 p-3 rounded-lg border border-zinc-700/60">
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Unoptimized (Blind Bundle)
                    </span>
                    <span className="text-lg font-bold text-rose-400 font-mono">
                      ~{estimatedSize.unoptimizedSizeMB} MB
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Full runtime + unfiltered toolkits
                    </span>
                  </div>

                  <div className="bg-zinc-800/70 p-3 rounded-lg border border-emerald-500/40 relative">
                    <span className="text-[11px] text-emerald-400 font-medium block mb-1">
                      With Declared Exclusions
                    </span>
                    <span className="text-lg font-bold text-emerald-300 font-mono">
                      ~{estimatedSize.sizeWithExclusionsMB} MB
                    </span>
                    <span className="text-[10px] text-emerald-400/90 font-medium block mt-0.5">
                      Direct savings: -{estimatedSize.savedMB} MB (-
                      {estimatedSize.percentageSaved}%)
                    </span>
                  </div>

                  <div className="bg-zinc-800/70 p-3 rounded-lg border border-amber-500/40">
                    <span className="text-[11px] text-amber-400 font-medium block mb-1">
                      With UPX Compression
                    </span>
                    <span className="text-lg font-bold text-amber-300 font-mono">
                      {manifest.optimization.upxEnabled
                        ? `~${estimatedSize.sizeWithUpxMB} MB`
                        : "UPX Disabled"}
                    </span>
                    <span className="text-[10px] text-amber-400/80 block mt-0.5">
                      {manifest.optimization.upxEnabled
                        ? `Compression Level ${manifest.optimization.upxLevel || 9} active`
                        : "Enable UPX to compress binaries"}
                    </span>
                  </div>
                </div>

                {/* Progress bar of excluded catalog */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Modules excluded from the framework catalog:</span>
                    <span className="font-mono text-zinc-300">
                      {estimatedSize.excludedCount} /{" "}
                      {Math.max(
                        estimatedSize.totalCatalogCount,
                        estimatedSize.excludedCount,
                      )}{" "}
                      (
                      {Math.min(
                        100,
                        Math.round(
                          (estimatedSize.excludedCount /
                            Math.max(1, estimatedSize.totalCatalogCount)) *
                            100,
                        ),
                      )}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((estimatedSize.excludedCount / Math.max(1, estimatedSize.totalCatalogCount)) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Presets & Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyRecommendedExcludes}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Recommended Preset ({manifest.framework})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllExcludes}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold border border-zinc-300 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Maximum Exclusion (Minimum Size)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearExcludes}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium border border-zinc-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <span className="text-xs text-zinc-500 font-mono">
                  {manifest.optimization.excludeModules.length} selected
                </span>
              </div>

              {/* Exclusion Catalog: Category Filter Tabs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      Modules and Components to Exclude (
                      <code className="text-amber-700 font-mono">
                        optimization.exclude_modules
                      </code>
                      ):
                    </span>
                  </label>
                </div>

                {/* AST & Forced Exclusions Explanation Note */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-950 font-bold">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Why does Qyro provide the{" "}
                      <code className="font-mono bg-amber-100/90 px-1 py-0.5 rounded text-amber-950 text-[11px]">
                        exclude_modules
                      </code>{" "}
                      option?
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>• Automatic Code Tree Filtering (AST):</strong> By
                    default, PyInstaller analyzes your app's source code. If
                    your project does not include{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      import
                    </code>{" "}
                    statements for modules such as QtWebEngine, Qt3D, or QtPdf,
                    PyInstaller will automatically exclude them from the
                    executable.
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>• Third-Party Imports and False Positives:</strong>{" "}
                    Sometimes certain secondary libraries (for example{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      scipy
                    </code>
                    ,{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      matplotlib
                    </code>{" "}
                    or{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      pandas
                    </code>
                    ) automatically import large modules you do not depend on
                    (such as{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      unittest
                    </code>
                    ,{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      tkinter
                    </code>{" "}
                    or Qt subcomponents), or PyInstaller detects import "false
                    positives."
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>• Full and Guaranteed Control:</strong> The{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      exclude_modules
                    </code>{" "}
                    block gives you full control to force the exclusion (via{" "}
                    <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">
                      --exclude-module
                    </code>
                    ) of any unwanted package, even if a third-party library
                    attempts to import it indirectly.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200 text-[11px]">
                  {[
                    "all",
                    "WebEngine & Chromium",
                    "3D & OpenGL",
                    "Media & Spatial Audio",
                    "Sensors & Hardware",
                    "Toolkits & Test",
                    "Scientific & Extra",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedExclusionCategory(cat)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        selectedExclusionCategory === cat
                          ? "bg-white text-zinc-900 shadow-2xs font-bold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {cat === "all" ? "All Modules" : cat}
                    </button>
                  ))}
                </div>

                {/* Module Catalog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto p-1 bg-zinc-50 rounded-xl border border-zinc-200">
                  {(FRAMEWORK_EXCLUSION_CATALOG[manifest.framework] || [])
                    .filter((item) =>
                      selectedExclusionCategory === "all"
                        ? true
                        : item.category === selectedExclusionCategory,
                    )
                    .map((item) => {
                      const isExcluded =
                        manifest.optimization.excludeModules.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleModuleExclusion(item.id)}
                          className={`cursor-pointer p-2.5 rounded-lg border transition-all text-xs ${
                            isExcluded
                              ? "bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400/30"
                              : "bg-white border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2">
                              <input
                                type="checkbox"
                                checked={isExcluded}
                                onChange={() => {}}
                                className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm border-zinc-300 focus:ring-emerald-500"
                              />
                              <div>
                                <div className="font-bold text-zinc-900 font-mono text-[11px] leading-tight">
                                  {item.id}
                                </div>
                                <div className="text-[10px] text-zinc-600 font-medium mt-0.5">
                                  {item.name}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm font-mono shrink-0 ${
                                isExcluded
                                  ? "bg-emerald-200 text-emerald-900"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              -{item.approxSavingsMB} MB
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 ml-6 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Custom Exclude Module Input */}
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 space-y-2">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Add custom module exclusion (e.g.{" "}
                  <code className="text-zinc-600 font-mono">pandas</code>,{" "}
                  <code className="text-zinc-600 font-mono">matplotlib</code>,{" "}
                  <code className="text-zinc-600 font-mono">sqlite3</code>):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customExcludeInput}
                    onChange={(e) => setCustomExcludeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomExclude();
                      }
                    }}
                    placeholder="Python module name..."
                    className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomExclude}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Custom excluded modules tags */}
                {manifest.optimization.excludeModules.filter(
                  (m) =>
                    !(
                      FRAMEWORK_EXCLUSION_CATALOG[manifest.framework] || []
                    ).some((c) => c.id === m),
                ).length > 0 && (
                  <div className="pt-2 border-t border-zinc-200 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Extra exclusions:
                    </span>
                    {manifest.optimization.excludeModules
                      .filter(
                        (m) =>
                          !(
                            FRAMEWORK_EXCLUSION_CATALOG[manifest.framework] ||
                            []
                          ).some((c) => c.id === m),
                      )
                      .map((mod) => (
                        <span
                          key={mod}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded-md text-[11px] font-mono"
                        >
                          <span>{mod}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomExclude(mod)}
                            className="text-zinc-500 hover:text-rose-600 ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Binary Optimization Flags (strip_binaries, clean_build, bytecode_opt) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                {/* Strip Binaries Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <span className="font-bold text-zinc-900 block">
                      Strip Symbols (
                      <code className="text-amber-700">strip_binaries</code>)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Runs{" "}
                      <code className="text-zinc-700 font-mono">strip</code> on
                      C/C++ binaries (.so/.dll) to remove debug tables and
                      reduce size by an additional 15-25%.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.optimization.stripBinaries}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        optimization: {
                          ...manifest.optimization,
                          stripBinaries: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-sm border-zinc-300 focus:ring-emerald-500"
                  />
                </div>

                {/* Clean Build Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <span className="font-bold text-zinc-900 block">
                      Clean Build (
                      <code className="text-amber-700">clean_build</code>)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Applies PyInstaller's{" "}
                      <code className="text-zinc-700 font-mono">--clean</code>{" "}
                      flag to purge the previous cache and corrupted builds.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.optimization.cleanBuild}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        optimization: {
                          ...manifest.optimization,
                          cleanBuild: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-sm border-zinc-300 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Bytecode Optimization Level */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 block">
                    Python Bytecode Optimization (
                    <code className="text-amber-700">bytecode_opt</code>)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-sm">
                    Level {manifest.optimization.bytecodeOpt}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      level: 0,
                      label: "0: No optimization",
                      desc: "Preserves docstrings and asserts",
                    },
                    {
                      level: 1,
                      label: "1: Optimized (-O)",
                      desc: "Removes assert statements (Recommended)",
                    },
                    {
                      level: 2,
                      label: "2: Maximum (-OO)",
                      desc: "Removes docstrings and asserts",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.level}
                      onClick={() =>
                        onChange({
                          ...manifest,
                          optimization: {
                            ...manifest.optimization,
                            bytecodeOpt: opt.level as BytecodeOptLevel,
                          },
                        })
                      }
                      className={`cursor-pointer p-2 rounded-lg border text-left transition-all ${
                        manifest.optimization.bytecodeOpt === opt.level
                          ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="font-bold text-zinc-800">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* UPX Master Switch and Settings */}
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      UPX Executable Compression
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Compresses executables using UPX with safe exclusion of
                      OpenGL drivers and critical DLLs.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={manifest.optimization.upxEnabled}
                    onChange={(e) =>
                      onChange({
                        ...manifest,
                        optimization: {
                          ...manifest.optimization,
                          upxEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-emerald-600 rounded-sm border-zinc-300 focus:ring-emerald-500"
                  />
                </div>

                {manifest.optimization.upxEnabled && (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold text-zinc-700">
                          UPX Compression Level (1: Fast - 9: Maximum)
                        </label>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-sm">
                          Level -{manifest.optimization.upxLevel}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="9"
                        value={manifest.optimization.upxLevel}
                        onChange={(e) =>
                          onChange({
                            ...manifest,
                            optimization: {
                              ...manifest.optimization,
                              upxLevel: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-zinc-700 block">
                          Binaries excluded from UPX (
                          <code className="text-amber-700 font-mono">
                            upx_excludes
                          </code>{" "}
                          for {manifest.targetPlatform}):
                        </label>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                          {manifest.targetPlatform === "linux"
                            ? "ELF Libraries (.so)"
                            : manifest.targetPlatform === "windows"
                              ? "PE Binaries (.dll / .pyd)"
                              : "macOS (No UPX)"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getUpxExcludesForPlatform(
                          manifest.targetPlatform,
                          manifest.framework,
                          manifest.optimization.upxExcludes,
                        ).map((bin) => (
                          <span
                            key={bin}
                            className="px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded-md font-mono text-[10px] border border-zinc-300"
                          >
                            {bin}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* UPX Custom Directory (upx_dir) */}
                    <div className="pt-2 border-t border-zinc-200">
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                        Custom UPX Directory (
                        <code className="text-amber-700 font-mono">upx_dir</code>
                        ):
                      </label>
                      <input
                        type="text"
                        value={
                          typeof manifest.optimization.upxDir === "string"
                            ? manifest.optimization.upxDir
                            : ""
                        }
                        onChange={(e) =>
                          onChange({
                            ...manifest,
                            optimization: {
                              ...manifest.optimization,
                              upxDir: e.target.value.trim()
                                ? e.target.value
                                : false,
                            },
                          })
                        }
                        placeholder="false (auto-detect in PATH/Conda or e.g. C:\Tools\upx)"
                        className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">
                        If set to <code>false</code> or left empty, Qyro
                        automatically searches for <code>upx.exe</code> in the
                        system PATH and virtual environment.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Post-Freeze Binary Purges: exclude_binaries & exclude_plugins */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 text-xs">
                <div className="border-b border-zinc-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-zinc-900 block">
                      Post-Build Binary and Plugin Purge
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Actively removes obsolete DLLs and heavy plugins collected
                    by PyInstaller that unnecessarily consume disk space and
                    RAM.
                  </p>
                </div>

                {/* Exclude Binaries (DLLs, .so, .pyd) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-zinc-700 block">
                      Binaries and DLLs to purge (
                      <code className="text-amber-700 font-mono">
                        exclude_binaries
                      </code>
                      ):
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      (dlls, .so, .dylib, .pyd)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(
                      manifest.optimization.excludeBinaries ||
                      (manifest.framework === "PySide6"
                        ? ["opengl32sw.dll"]
                        : [])
                    ).map((bin) => (
                      <span
                        key={bin}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-[11px] font-mono"
                      >
                        <span>{bin}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current =
                              manifest.optimization.excludeBinaries ||
                              (manifest.framework === "PySide6"
                                ? ["opengl32sw.dll"]
                                : []);
                            onChange({
                              ...manifest,
                              optimization: {
                                ...manifest.optimization,
                                excludeBinaries: current.filter(
                                  (b) => b !== bin,
                                ),
                              },
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="input_add_binary"
                      placeholder="e.g. opengl32sw.dll, libcrypto.so..."
                      className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (
                            e.target as HTMLInputElement
                          ).value.trim();
                          if (val) {
                            const current =
                              manifest.optimization.excludeBinaries || [];
                            if (!current.includes(val)) {
                              onChange({
                                ...manifest,
                                optimization: {
                                  ...manifest.optimization,
                                  excludeBinaries: [...current, val],
                                },
                              });
                            }
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          "input_add_binary",
                        ) as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const val = input.value.trim();
                          const current =
                            manifest.optimization.excludeBinaries || [];
                          if (!current.includes(val)) {
                            onChange({
                              ...manifest,
                              optimization: {
                                ...manifest.optimization,
                                excludeBinaries: [...current, val],
                              },
                            });
                          }
                          input.value = "";
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add DLL</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    <code>opengl32sw.dll</code> (~21 MB): Software OpenGL
                    fallback driver. Unnecessary if your hardware has native
                    graphics acceleration.
                  </span>
                </div>

                {/* Exclude Plugins (Qt Plugins) */}
                <div className="pt-2 border-t border-zinc-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-zinc-700 block">
                      Framework Plugins to purge (
                      <code className="text-amber-700 font-mono">
                        exclude_plugins
                      </code>
                      ):
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Direct savings in RAM and disk space
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(
                      manifest.optimization.excludePlugins || [
                        "generic",
                        "networkinformation",
                        "tls",
                        "styles",
                        "platforminputcontexts",
                        "iconengines",
                        "imageformats",
                      ]
                    ).map((plug) => (
                      <span
                        key={plug}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded-md text-[11px] font-mono border border-zinc-300"
                      >
                        <span>{plug}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = manifest.optimization
                              .excludePlugins || [
                              "generic",
                              "networkinformation",
                              "tls",
                              "styles",
                              "platforminputcontexts",
                              "iconengines",
                              "imageformats",
                            ];
                            onChange({
                              ...manifest,
                              optimization: {
                                ...manifest.optimization,
                                excludePlugins: current.filter(
                                  (p) => p !== plug,
                                ),
                              },
                            });
                          }}
                          className="text-zinc-500 hover:text-rose-600 font-bold ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="input_add_plugin"
                      placeholder="e.g. generic, tls, styles, networkinformation..."
                      className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (
                            e.target as HTMLInputElement
                          ).value.trim();
                          if (val) {
                            const current =
                              manifest.optimization.excludePlugins || [];
                            if (!current.includes(val)) {
                              onChange({
                                ...manifest,
                                optimization: {
                                  ...manifest.optimization,
                                  excludePlugins: [...current, val],
                                },
                              });
                            }
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          "input_add_plugin",
                        ) as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const val = input.value.trim();
                          const current =
                            manifest.optimization.excludePlugins || [];
                          if (!current.includes(val)) {
                            onChange({
                              ...manifest,
                              optimization: {
                                ...manifest.optimization,
                                excludePlugins: [...current, val],
                              },
                            });
                          }
                          input.value = "";
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Plugin</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-File JSON Manifest Switcher & Viewer */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-md overflow-hidden flex flex-col h-[590px]">
            {/* Multi-File Tab Bar */}
            <div className="bg-zinc-950 border-b border-zinc-800 px-3 pt-2 flex items-center justify-between">
              <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveJsonFile("base")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "base"
                      ? "bg-zinc-900 text-emerald-400 font-bold border-t-2 border-emerald-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>base.json</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJsonFile("windows")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "windows"
                      ? "bg-zinc-900 text-amber-400 font-bold border-t-2 border-amber-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>windows.json</span>
                  {manifest.targetPlatform === "windows" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJsonFile("linux")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "linux"
                      ? "bg-zinc-900 text-amber-400 font-bold border-t-2 border-amber-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>linux.json</span>
                  {manifest.targetPlatform === "linux" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJsonFile("macos")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "macos"
                      ? "bg-zinc-900 text-purple-400 font-bold border-t-2 border-purple-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>mac.json</span>
                  {manifest.targetPlatform === "macos" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJsonFile("release")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "release"
                      ? "bg-zinc-900 text-rose-400 font-bold border-t-2 border-rose-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>release.json</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveJsonFile("merged")}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-t-lg font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    activeJsonFile === "merged"
                      ? "bg-zinc-900 text-indigo-400 font-bold border-t-2 border-indigo-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Merged</span>
                </button>
              </div>

              <div className="flex items-center space-x-1 pb-1">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>

                <button
                  onClick={handleDownloadJson}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Current File Subheading */}
            <div className="px-4 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span className="text-zinc-300">{currentFilePath}</span>
              <span className="text-[10px] text-zinc-500">
                {activeJsonFile === "base"
                  ? "Project Template"
                  : activeJsonFile === "merged"
                    ? "Domain Entity (Merged)"
                    : "Environment / Platform Overrides"}
              </span>
            </div>

            {/* JSON Content Area */}
            <div className="flex-1 p-3 overflow-auto bg-zinc-900">
              <pre className="font-mono text-xs text-emerald-400 leading-relaxed selection:bg-amber-900">
                {currentJsonString}
              </pre>
            </div>

            {/* Bottom info footer */}
            <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Settings Output</span>
              </span>
              <span className="text-zinc-500 font-mono">UTF-8 JSON</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
