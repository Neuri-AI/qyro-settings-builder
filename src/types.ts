export type TargetPlatform = 'windows' | 'linux' | 'macos';
export type BundleMode = 'onedir' | 'onefile';
export type UACLevel = 'asInvoker' | 'requireAdministrator' | 'highestAvailable';
export type BytecodeOptLevel = 0 | 1 | 2;
export type FrameworkType = 'Kivy' | 'PySide6' | 'PyQt6' | 'PySide2' | 'PyQt5' | 'Tkinter';

export interface UACConfig {
  level: UACLevel;
  uiAccess: boolean;
}

export interface DebugConfig {
  enabled: boolean;
  consoleWindow: boolean;
  unstripped?: boolean;
  verboseImports?: boolean;
  bootloaderDebug?: boolean;
}

export interface OptimizationConfig {
  upxEnabled: boolean;
  upxLevel: number; // 1-9
  upxDir?: string | boolean | null; // Custom UPX binary directory path
  upxExcludes: string[];
  excludeBinaries?: string[]; // dlls, .so, .dylib, .pyd to purge
  excludePlugins?: string[]; // Qt plugins to purge (generic, tls, styles, etc.)
  bytecodeOpt: BytecodeOptLevel;
  stripBinaries: boolean;
  excludeModules: string[];
  cleanBuild: boolean;
}

export interface KivyConfig {
  depsMode: 'minimal' | 'all';
  includeSdl2: boolean;
  includeGlew: boolean;
  includeGstreamer: boolean;
  includeAngle: boolean;
  kvFilesAutoCollect: boolean;
  customKvPaths: string[];
}

export interface QyroAddon {
  id: string;
  name: string;
  category: 'UI & Design' | 'Hardware & OS' | 'Networking' | 'Media' | 'Database' | 'Utilities';
  description: string;
  package: string;
  frameworkCompat: FrameworkType[];
  hookDetails: {
    hiddenImports: string[];
    dataIncludes?: string[];
    notes?: string;
  };
}

export interface FreezeManifest {
  appName: string;
  author: string;
  version: string;
  entryPoint: string;
  targetPlatform: TargetPlatform;
  bundleMode: BundleMode;
  framework: FrameworkType;
  uac: UACConfig;
  debug: DebugConfig;
  optimization: OptimizationConfig;
  kivy?: KivyConfig;
  addons: string[];
  extraHooksDir?: string;
  hiddenImports: string[];
  resourcesDir: string;
  extraPyInstallerArgs: string[];
  paths: string[];
  collectAll: string[];
}

export interface BuildLogEntry {
  id: string;
  timestamp: string;
  stage: 'init' | 'manifest' | 'hooks' | 'spec' | 'pyinstaller' | 'optimize' | 'verify' | 'complete' | 'error';
  level: 'info' | 'warn' | 'debug' | 'success' | 'cmd';
  message: string;
  details?: string;
}

export interface BuildMetric {
  rawBundleSizeMB: number;
  optimizedSizeMB: number;
  buildTimeSec: number;
  filesBundled: number;
  uacInjected: boolean;
  debugSymbolsPresent: boolean;
  frameworkDetected?: FrameworkType;
}

export interface PythonCodeFile {
  path: string;
  layer: 'Domain' | 'Application' | 'Adapters' | 'Presentation (CLI)' | 'Tests' | 'Config';
  description: string;
  code: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  manifest: FreezeManifest;
}
