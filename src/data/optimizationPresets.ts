import { FrameworkType } from '../types';

export interface ExclusionModuleItem {
  id: string;
  name: string;
  category: 'WebEngine & Chromium' | '3D & OpenGL' | 'Media & Spatial Audio' | 'Sensors & Hardware' | 'Toolkits & Test' | 'Scientific & Extra';
  description: string;
  approxSavingsMB: number;
}

export interface EstimatedSizeBreakdown {
  unoptimizedSizeMB: number;
  savedMB: number;
  percentageSaved: number;
  sizeWithExclusionsMB: number;
  sizeWithUpxMB: number;
  excludedCount: number;
  totalCatalogCount: number;
}

const LEGACY_QT_BASE_SIZE_MB = 1079.78;

// Calibrated baselines. PySide6 uses a measured no-optimization build (Windows): 404.73 MB.
const BASE_SIZE_BY_FRAMEWORK: Record<FrameworkType, number> = {
  PySide6: 404.73,
  PyQt6: 392.0,
  PySide2: 328.0,
  PyQt5: 318.0,
  Kivy: 345.5,
  Tkinter: 48.2,
};

const MIN_CORE_PAYLOAD_BY_FRAMEWORK: Record<FrameworkType, number> = {
  // Calibrated from measured max optimization builds in Windows:
  // - PySide6: full Qt exclusions + UPX level 9 => ~50.72 MB final.
  //   With the current UPX model at level 9 (~0.325 ratio), this implies
  //   a pre-UPX core payload around 156.06 MB.
  // - PyQt6: measured final size with maximum optimizations on Windows is
  //   42.9 MB, which implies a pre-UPX core payload of ~132.0 MB.
  PySide6: 156.06,
  PyQt6: 132.0,
  PySide2: 96.0,
  PyQt5: 92.0,
  Kivy: 42.0,
  Tkinter: 12.0,
};

export const QT_DEFAULT_WINDOWS_EXCLUDE_BINARIES = [
  'opengl32sw.dll',
  'qdirect2d.dll',
  'qoffscreen.dll',
  'qminimal.dll',
];

export const PYQT5_DEFAULT_WINDOWS_EXCLUDE_BINARIES = [
  'd3dcompiler_47.dll',
  'libEGL.dll',
  'libGLESv2.dll',
  'Qt5WebSockets.dll',
  'qminimal.dll',
  'qwebgl.dll',
  'qoffscreen.dll',
];

export const QT_DEFAULT_MACOS_EXCLUDE_BINARIES = [
  'libqminimal.dylib',
  'libqoffscreen.dylib',
  'QtDBus.abi3.so',
];

export const QT_DEFAULT_WINDOWS_LINUX_EXCLUDE_PLUGINS = [
  'generic',
  'networkinformation',
  'tls',
  'styles',
  'platforminputcontexts',
  'iconengines',
  'imageformats',
];

export const PYQT5_DEFAULT_WINDOWS_EXCLUDE_PLUGINS = [
  'platformthemes',
  'iconengines',
  'imageformats',
];

export const QT_DEFAULT_MACOS_EXCLUDE_PLUGINS = [
  'iconengines',
  'imageformats',
  'platforminputcontexts',
  'styles',
];

export const getDefaultExcludeBinariesForFramework = (
  platform: string,
  framework: FrameworkType
): string[] => {
  const p = platform.toLowerCase();
  const isQt = framework.startsWith('PySide') || framework.startsWith('PyQt');

  if (p === 'windows' && isQt) {
    if (framework === 'PyQt5') {
      return PYQT5_DEFAULT_WINDOWS_EXCLUDE_BINARIES;
    }
    return QT_DEFAULT_WINDOWS_EXCLUDE_BINARIES;
  }
  if (p === 'macos' && isQt) {
    return QT_DEFAULT_MACOS_EXCLUDE_BINARIES;
  }
  return [];
};

export const getDefaultExcludePluginsForFramework = (
  platform: string,
  framework: FrameworkType
): string[] => {
  const p = platform.toLowerCase();
  const isQt = framework.startsWith('PySide') || framework.startsWith('PyQt');
  if (!isQt) {
    return [];
  }

  if (p === 'macos') {
    return QT_DEFAULT_MACOS_EXCLUDE_PLUGINS;
  }

  if (p === 'windows' && framework === 'PyQt5') {
    return PYQT5_DEFAULT_WINDOWS_EXCLUDE_PLUGINS;
  }

  return QT_DEFAULT_WINDOWS_LINUX_EXCLUDE_PLUGINS;
};

export function calculateEstimatedSize(
  framework: FrameworkType,
  excludeModules: string[],
  upxEnabled: boolean = false,
  upxLevel: number = 9,
  stripBinaries: boolean = false
): EstimatedSizeBreakdown {
  const isQt = framework.startsWith('PySide') || framework.startsWith('PyQt');

  // Base raw unoptimized size and minimal runtime payload by framework.
  const baseSize = BASE_SIZE_BY_FRAMEWORK[framework];
  const minCorePayload = MIN_CORE_PAYLOAD_BY_FRAMEWORK[framework];
  const qtSavingsScale = isQt ? baseSize / LEGACY_QT_BASE_SIZE_MB : 1;

  const catalog = FRAMEWORK_EXCLUSION_CATALOG[framework] || [];
  const catalogMap = new Map(catalog.map((item) => [item.id, item.approxSavingsMB]));

  let totalSavings = 0;
  for (const mod of excludeModules) {
    if (catalogMap.has(mod)) {
      totalSavings += catalogMap.get(mod)! * qtSavingsScale;
    } else {
      // Default estimation for custom user-added excluded modules
      totalSavings += 18.0 * qtSavingsScale;
    }
  }

  // Cap maximum exclusions so core runtime is preserved
  const effectiveSavings = Math.min(totalSavings, Math.max(0, baseSize - minCorePayload));
  let sizeWithExclusions = baseSize - effectiveSavings;

  if (stripBinaries && effectiveSavings > 0) {
    sizeWithExclusions = Math.max(minCorePayload, sizeWithExclusions * 0.94);
  }

  // UPX compression impact
  // Level 1: ~48% reduction, Level 9: ~68% reduction
  const upxRatio = Math.max(0.28, 0.55 - (Math.min(Math.max(upxLevel, 1), 9) * 0.025));
  const sizeWithUpx = upxEnabled ? sizeWithExclusions * upxRatio : sizeWithExclusions;

  const finalSavedMB = baseSize - sizeWithExclusions;
  const percentage = (finalSavedMB / baseSize) * 100;

  return {
    unoptimizedSizeMB: Number(baseSize.toFixed(2)),
    savedMB: Number(finalSavedMB.toFixed(2)),
    percentageSaved: Number(percentage.toFixed(1)),
    sizeWithExclusionsMB: Number(sizeWithExclusions.toFixed(2)),
    sizeWithUpxMB: Number(sizeWithUpx.toFixed(2)),
    excludedCount: excludeModules.length,
    totalCatalogCount: catalog.length,
  };
}

export const FRAMEWORK_EXCLUSION_CATALOG: Record<FrameworkType, ExclusionModuleItem[]> = {
  PySide6: [
    {
      id: 'PySide6.QtWebEngineCore',
      name: 'QtWebEngineCore (Chromium)',
      category: 'WebEngine & Chromium',
      description: 'Motor Chromium embebido completo y runtime Blink.',
      approxSavingsMB: 230,
    },
    {
      id: 'PySide6.QtWebEngineWidgets',
      name: 'QtWebEngineWidgets',
      category: 'WebEngine & Chromium',
      description: 'Widgets de navegación web Chromium.',
      approxSavingsMB: 25,
    },
    {
      id: 'PySide6.QtWebEngineQuick',
      name: 'QtWebEngineQuick',
      category: 'WebEngine & Chromium',
      description: 'Integración QML para motor Chromium.',
      approxSavingsMB: 20,
    },
    {
      id: 'PySide6.Qt3DCore',
      name: 'Qt3DCore & Qt3DRender',
      category: '3D & OpenGL',
      description: 'Motor de graficación y renderizado 3D de escena.',
      approxSavingsMB: 45,
    },
    {
      id: 'PySide6.QtQuick3D',
      name: 'QtQuick3D & Partículas 3D',
      category: '3D & OpenGL',
      description: 'Efectos espaciales, partículas y assets 3D para QML.',
      approxSavingsMB: 95,
    },
    {
      id: 'PySide6.Qt3DAnimation',
      name: 'Qt3DAnimation & Extras',
      category: '3D & OpenGL',
      description: 'Sistemas de esqueletos, cinemática y animación 3D.',
      approxSavingsMB: 30,
    },
    {
      id: 'PySide6.QtPdf',
      name: 'QtPdf & QtPdfWidgets',
      category: 'WebEngine & Chromium',
      description: 'Visor y renderizador de documentos PDF PDFium.',
      approxSavingsMB: 35,
    },
    {
      id: 'PySide6.QtMultimedia',
      name: 'QtMultimedia & Widgets',
      category: 'Media & Spatial Audio',
      description: 'Codecs FFmpeg y reproducción de vídeo/audio.',
      approxSavingsMB: 50,
    },
    {
      id: 'PySide6.QtSpatialAudio',
      name: 'QtSpatialAudio',
      category: 'Media & Spatial Audio',
      description: 'Procesamiento de audio espacial 3D y resonancia acústica.',
      approxSavingsMB: 15,
    },
    {
      id: 'PySide6.QtSensors',
      name: 'QtSensors & QtPositioning',
      category: 'Sensors & Hardware',
      description: 'Giroscopio, acelerómetros y geolocalización GPS.',
      approxSavingsMB: 20,
    },
    {
      id: 'PySide6.QtBluetooth',
      name: 'QtBluetooth & QtNfc',
      category: 'Sensors & Hardware',
      description: 'Pila Bluetooth Low Energy y comunicación Near Field.',
      approxSavingsMB: 25,
    },
    {
      id: 'PySide6.QtCharts',
      name: 'QtCharts & QtGraphs',
      category: 'Scientific & Extra',
      description: 'Gráficos interactivos 2D/3D y visualizaciones.',
      approxSavingsMB: 30,
    },
    {
      id: 'PySide6.QtDesigner',
      name: 'QtDesigner & UiTools',
      category: 'Toolkits & Test',
      description: 'Componentes de diseño visual del Qt Designer.',
      approxSavingsMB: 35,
    },
    {
      id: 'PySide6.QtVirtualKeyboard',
      name: 'QtVirtualKeyboard',
      category: 'Toolkits & Test',
      description: 'Teclado virtual táctil multilingüe.',
      approxSavingsMB: 25,
    },
    {
      id: 'PySide6.QtQml',
      name: 'QtQml',
      category: '3D & OpenGL',
      description: 'Runtime base de QML y bindings declarativos.',
      approxSavingsMB: 18,
    },
    {
      id: 'PySide6.QtQuick',
      name: 'QtQuick',
      category: '3D & OpenGL',
      description: 'Motor de UI declarativa para escenas QML.',
      approxSavingsMB: 26,
    },
    {
      id: 'PySide6.QtQuickWidgets',
      name: 'QtQuickWidgets',
      category: '3D & OpenGL',
      description: 'Integración de QtQuick dentro de widgets tradicionales.',
      approxSavingsMB: 12,
    },
    {
      id: 'PySide6.QtOpenGL',
      name: 'QtOpenGL',
      category: '3D & OpenGL',
      description: 'Capas de abstracción para render OpenGL.',
      approxSavingsMB: 16,
    },
    {
      id: 'PySide6.QtOpenGLWidgets',
      name: 'QtOpenGLWidgets',
      category: '3D & OpenGL',
      description: 'Widgets OpenGL para renderizado acelerado en Qt.',
      approxSavingsMB: 8,
    },
    {
      id: 'PySide6.QtSvg',
      name: 'QtSvg',
      category: 'Scientific & Extra',
      description: 'Render de SVG vectoriales.',
      approxSavingsMB: 10,
    },
    {
      id: 'PySide6.QtNetwork',
      name: 'QtNetwork',
      category: 'Sensors & Hardware',
      description: 'Sockets, SSL y APIs de red de Qt.',
      approxSavingsMB: 14,
    },
    {
      id: 'tkinter',
      name: 'Tkinter (_tkinter)',
      category: 'Toolkits & Test',
      description: 'Librerías Tcl/Tk de la biblioteca estándar de Python.',
      approxSavingsMB: 40,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos internos de testing de Python (test, pydoc).',
      approxSavingsMB: 15,
    },
  ],

  PyQt6: [
    {
      id: 'PyQt6.QtWebEngineCore',
      name: 'PyQt6.QtWebEngineCore (Chromium)',
      category: 'WebEngine & Chromium',
      description: 'Motor Chromium embebido completo en PyQt6.',
      approxSavingsMB: 230,
    },
    {
      id: 'PyQt6.QtWebEngineWidgets',
      name: 'PyQt6.QtWebEngineWidgets',
      category: 'WebEngine & Chromium',
      description: 'Widgets de navegación web Chromium.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt6.QtWebEngineQuick',
      name: 'PyQt6.QtWebEngineQuick',
      category: 'WebEngine & Chromium',
      description: 'Integración QML de WebEngine en PyQt6.',
      approxSavingsMB: 20,
    },
    {
      id: 'PyQt6.Qt3DCore',
      name: 'PyQt6.Qt3DCore & Qt3DRender',
      category: '3D & OpenGL',
      description: 'Renderizador y grafo de escena 3D en PyQt6.',
      approxSavingsMB: 45,
    },
    {
      id: 'PyQt6.QtQuick3D',
      name: 'PyQt6.QtQuick3D',
      category: '3D & OpenGL',
      description: 'Librerías de 3D acelerado para QtQuick.',
      approxSavingsMB: 90,
    },
    {
      id: 'PyQt6.QtPdf',
      name: 'PyQt6.QtPdf & Widgets',
      category: 'WebEngine & Chromium',
      description: 'Módulo de renderizado PDF embebido.',
      approxSavingsMB: 35,
    },
    {
      id: 'PyQt6.QtPdfWidgets',
      name: 'PyQt6.QtPdfWidgets',
      category: 'WebEngine & Chromium',
      description: 'Widgets específicos para visualizar PDF.',
      approxSavingsMB: 10,
    },
    {
      id: 'PyQt6.Qt3DAnimation',
      name: 'PyQt6.Qt3DAnimation',
      category: '3D & OpenGL',
      description: 'Sistemas de animación 3D.',
      approxSavingsMB: 24,
    },
    {
      id: 'PyQt6.QtMultimedia',
      name: 'PyQt6.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Soporte multimedia y streaming de audio/vídeo.',
      approxSavingsMB: 50,
    },
    {
      id: 'PyQt6.QtSpatialAudio',
      name: 'PyQt6.QtSpatialAudio',
      category: 'Media & Spatial Audio',
      description: 'Audio espacial y posicionamiento acústico.',
      approxSavingsMB: 15,
    },
    {
      id: 'PyQt6.QtSensors',
      name: 'PyQt6.QtSensors & Positioning',
      category: 'Sensors & Hardware',
      description: 'Sensores de hardware y localización geográfica.',
      approxSavingsMB: 20,
    },
    {
      id: 'PyQt6.QtPositioning',
      name: 'PyQt6.QtPositioning',
      category: 'Sensors & Hardware',
      description: 'APIs de geolocalización y GNSS.',
      approxSavingsMB: 12,
    },
    {
      id: 'PyQt6.QtBluetooth',
      name: 'PyQt6.QtBluetooth & QtNfc',
      category: 'Sensors & Hardware',
      description: 'Conectividad inalámbrica Bluetooth y NFC.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt6.QtNfc',
      name: 'PyQt6.QtNfc',
      category: 'Sensors & Hardware',
      description: 'Comunicaciones NFC.',
      approxSavingsMB: 8,
    },
    {
      id: 'PyQt6.QtDesigner',
      name: 'PyQt6.QtDesigner',
      category: 'Toolkits & Test',
      description: 'Módulos de diseño visual y utilidades Qt Designer.',
      approxSavingsMB: 32,
    },
    {
      id: 'PyQt6.QtCharts',
      name: 'PyQt6.QtCharts',
      category: 'Scientific & Extra',
      description: 'Librerías de gráficos cartesianos y polares.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt6.QtVirtualKeyboard',
      name: 'PyQt6.QtVirtualKeyboard',
      category: 'Toolkits & Test',
      description: 'Teclado virtual táctil.',
      approxSavingsMB: 24,
    },
    {
      id: 'PyQt6.QtQml',
      name: 'PyQt6.QtQml',
      category: '3D & OpenGL',
      description: 'Runtime base QML declarativo.',
      approxSavingsMB: 18,
    },
    {
      id: 'PyQt6.QtQuick',
      name: 'PyQt6.QtQuick',
      category: '3D & OpenGL',
      description: 'Motor QtQuick para interfaces QML.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt6.QtQuickWidgets',
      name: 'PyQt6.QtQuickWidgets',
      category: '3D & OpenGL',
      description: 'Puente entre QtQuick y widgets clásicos.',
      approxSavingsMB: 12,
    },
    {
      id: 'PyQt6.QtOpenGL',
      name: 'PyQt6.QtOpenGL',
      category: '3D & OpenGL',
      description: 'Soporte OpenGL para rendering acelerado.',
      approxSavingsMB: 15,
    },
    {
      id: 'PyQt6.QtOpenGLWidgets',
      name: 'PyQt6.QtOpenGLWidgets',
      category: '3D & OpenGL',
      description: 'Widgets OpenGL dentro de UIs Qt.',
      approxSavingsMB: 8,
    },
    {
      id: 'PyQt6.QtSvg',
      name: 'PyQt6.QtSvg',
      category: 'Scientific & Extra',
      description: 'Render de gráficos vectoriales SVG.',
      approxSavingsMB: 10,
    },
    {
      id: 'PyQt6.QtNetwork',
      name: 'PyQt6.QtNetwork',
      category: 'Sensors & Hardware',
      description: 'Pila de red (sockets, TLS, HTTP) de Qt.',
      approxSavingsMB: 14,
    },
    {
      id: 'tkinter',
      name: 'Tkinter (_tkinter)',
      category: 'Toolkits & Test',
      description: 'Librerías Tcl/Tk estándar innecesarias en PyQt6.',
      approxSavingsMB: 40,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos de test de la biblioteca estándar.',
      approxSavingsMB: 15,
    },
  ],

  PySide2: [
    {
      id: 'PySide2.QtWebEngineCore',
      name: 'PySide2.QtWebEngineCore',
      category: 'WebEngine & Chromium',
      description: 'Motor Chromium de Qt5.',
      approxSavingsMB: 190,
    },
    {
      id: 'PySide2.QtWebEngineWidgets',
      name: 'PySide2.QtWebEngineWidgets',
      category: 'WebEngine & Chromium',
      description: 'Widgets de navegación web de Qt5.',
      approxSavingsMB: 22,
    },
    {
      id: 'PySide2.QtWebEngineQuick',
      name: 'PySide2.QtWebEngineQuick',
      category: 'WebEngine & Chromium',
      description: 'Integración QML de WebEngine en Qt5.',
      approxSavingsMB: 18,
    },
    {
      id: 'PySide2.Qt3DCore',
      name: 'PySide2.Qt3DCore & Qt3DRender',
      category: '3D & OpenGL',
      description: 'Módulo 3D de Qt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PySide2.Qt3DAnimation',
      name: 'PySide2.Qt3DAnimation',
      category: '3D & OpenGL',
      description: 'Animación 3D para Qt5.',
      approxSavingsMB: 22,
    },
    {
      id: 'PySide2.QtQuick3D',
      name: 'PySide2.QtQuick3D',
      category: '3D & OpenGL',
      description: 'Extensiones 3D de QtQuick para Qt5.',
      approxSavingsMB: 60,
    },
    {
      id: 'PySide2.QtSensors',
      name: 'PySide2.QtSensors & QtLocation',
      category: 'Sensors & Hardware',
      description: 'Sensores y posicionamiento Qt5.',
      approxSavingsMB: 25,
    },
    {
      id: 'PySide2.QtPositioning',
      name: 'PySide2.QtPositioning',
      category: 'Sensors & Hardware',
      description: 'Servicios de posicionamiento y geolocalización.',
      approxSavingsMB: 12,
    },
    {
      id: 'PySide2.QtLocation',
      name: 'PySide2.QtLocation',
      category: 'Sensors & Hardware',
      description: 'Mapas y localización para Qt5.',
      approxSavingsMB: 16,
    },
    {
      id: 'PySide2.QtBluetooth',
      name: 'PySide2.QtBluetooth',
      category: 'Sensors & Hardware',
      description: 'Conectividad Bluetooth en Qt5.',
      approxSavingsMB: 15,
    },
    {
      id: 'PySide2.QtNfc',
      name: 'PySide2.QtNfc',
      category: 'Sensors & Hardware',
      description: 'Comunicaciones NFC.',
      approxSavingsMB: 7,
    },
    {
      id: 'PySide2.QtMultimedia',
      name: 'PySide2.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Audio y vídeo Qt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PySide2.QtCharts',
      name: 'PySide2.QtCharts',
      category: 'Scientific & Extra',
      description: 'Módulos de gráficos científicos y business charts.',
      approxSavingsMB: 22,
    },
    {
      id: 'PySide2.QtDesigner',
      name: 'PySide2.QtDesigner',
      category: 'Toolkits & Test',
      description: 'Plugins de diseño Qt Designer 5.',
      approxSavingsMB: 30,
    },
    {
      id: 'PySide2.QtQml',
      name: 'PySide2.QtQml',
      category: '3D & OpenGL',
      description: 'Runtime declarativo de QML en Qt5.',
      approxSavingsMB: 16,
    },
    {
      id: 'PySide2.QtQuick',
      name: 'PySide2.QtQuick',
      category: '3D & OpenGL',
      description: 'Motor QtQuick para interfaces declarativas.',
      approxSavingsMB: 20,
    },
    {
      id: 'PySide2.QtQuickWidgets',
      name: 'PySide2.QtQuickWidgets',
      category: '3D & OpenGL',
      description: 'Integración de QtQuick en widgets.',
      approxSavingsMB: 10,
    },
    {
      id: 'PySide2.QtOpenGL',
      name: 'PySide2.QtOpenGL',
      category: '3D & OpenGL',
      description: 'Abstracción OpenGL en Qt5.',
      approxSavingsMB: 12,
    },
    {
      id: 'PySide2.QtSvg',
      name: 'PySide2.QtSvg',
      category: 'Scientific & Extra',
      description: 'Render de SVG vectoriales.',
      approxSavingsMB: 8,
    },
    {
      id: 'PySide2.QtNetwork',
      name: 'PySide2.QtNetwork',
      category: 'Sensors & Hardware',
      description: 'Pila de networking y TLS de Qt5.',
      approxSavingsMB: 12,
    },
    {
      id: 'tkinter',
      name: 'Tkinter (_tkinter)',
      category: 'Toolkits & Test',
      description: 'Librería Tcl/Tk estándar.',
      approxSavingsMB: 40,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos internos de testing.',
      approxSavingsMB: 15,
    },
  ],

  PyQt5: [
    {
      id: 'PyQt5.QtWebEngineCore',
      name: 'PyQt5.QtWebEngineCore',
      category: 'WebEngine & Chromium',
      description: 'Motor Chromium de PyQt5.',
      approxSavingsMB: 190,
    },
    {
      id: 'PyQt5.QtWebEngineWidgets',
      name: 'PyQt5.QtWebEngineWidgets',
      category: 'WebEngine & Chromium',
      description: 'Widgets de navegación web de PyQt5.',
      approxSavingsMB: 22,
    },
    {
      id: 'PyQt5.QtWebEngineQuick',
      name: 'PyQt5.QtWebEngineQuick',
      category: 'WebEngine & Chromium',
      description: 'Integración QML de WebEngine en PyQt5.',
      approxSavingsMB: 18,
    },
    {
      id: 'PyQt5.Qt3DCore',
      name: 'PyQt5.Qt3DCore',
      category: '3D & OpenGL',
      description: 'Módulo 3D de PyQt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PyQt5.Qt3DAnimation',
      name: 'PyQt5.Qt3DAnimation',
      category: '3D & OpenGL',
      description: 'Módulos de animación 3D.',
      approxSavingsMB: 22,
    },
    {
      id: 'PyQt5.QtQuick3D',
      name: 'PyQt5.QtQuick3D',
      category: '3D & OpenGL',
      description: 'Extensiones 3D de QtQuick.',
      approxSavingsMB: 60,
    },
    {
      id: 'PyQt5.QtSensors',
      name: 'PyQt5.QtSensors & QtLocation',
      category: 'Sensors & Hardware',
      description: 'Sensores y geolocalización PyQt5.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt5.QtPositioning',
      name: 'PyQt5.QtPositioning',
      category: 'Sensors & Hardware',
      description: 'Servicios de positioning y geolocalización.',
      approxSavingsMB: 12,
    },
    {
      id: 'PyQt5.QtLocation',
      name: 'PyQt5.QtLocation',
      category: 'Sensors & Hardware',
      description: 'Módulos de mapas y localización.',
      approxSavingsMB: 16,
    },
    {
      id: 'PyQt5.QtBluetooth',
      name: 'PyQt5.QtBluetooth',
      category: 'Sensors & Hardware',
      description: 'Conectividad Bluetooth.',
      approxSavingsMB: 15,
    },
    {
      id: 'PyQt5.QtNfc',
      name: 'PyQt5.QtNfc',
      category: 'Sensors & Hardware',
      description: 'Comunicaciones NFC.',
      approxSavingsMB: 7,
    },
    {
      id: 'PyQt5.QtDesigner',
      name: 'PyQt5.QtDesigner',
      category: 'Toolkits & Test',
      description: 'Herramientas Qt Designer para UI visual.',
      approxSavingsMB: 30,
    },
    {
      id: 'PyQt5.QtMultimedia',
      name: 'PyQt5.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Audio y vídeo PyQt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PyQt5.QtCharts',
      name: 'PyQt5.QtCharts',
      category: 'Scientific & Extra',
      description: 'Componentes de charting 2D/3D.',
      approxSavingsMB: 22,
    },
    {
      id: 'PyQt5.QtQml',
      name: 'PyQt5.QtQml',
      category: '3D & OpenGL',
      description: 'Runtime QML declarativo.',
      approxSavingsMB: 16,
    },
    {
      id: 'PyQt5.QtQuick',
      name: 'PyQt5.QtQuick',
      category: '3D & OpenGL',
      description: 'Motor QtQuick para interfaces.',
      approxSavingsMB: 20,
    },
    {
      id: 'PyQt5.QtQuickWidgets',
      name: 'PyQt5.QtQuickWidgets',
      category: '3D & OpenGL',
      description: 'Bridge de QtQuick con widgets.',
      approxSavingsMB: 10,
    },
    {
      id: 'PyQt5.QtOpenGL',
      name: 'PyQt5.QtOpenGL',
      category: '3D & OpenGL',
      description: 'API OpenGL para render acelerado.',
      approxSavingsMB: 12,
    },
    {
      id: 'PyQt5.QtSvg',
      name: 'PyQt5.QtSvg',
      category: 'Scientific & Extra',
      description: 'Renderizado SVG.',
      approxSavingsMB: 8,
    },
    {
      id: 'PyQt5.QtNetwork',
      name: 'PyQt5.QtNetwork',
      category: 'Sensors & Hardware',
      description: 'Pila de red y TLS.',
      approxSavingsMB: 12,
    },
    {
      id: 'tkinter',
      name: 'Tkinter (_tkinter)',
      category: 'Toolkits & Test',
      description: 'Librería Tcl/Tk estándar.',
      approxSavingsMB: 40,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos internos de testing.',
      approxSavingsMB: 15,
    },
  ],

  Kivy: [
    {
      id: 'tkinter',
      name: 'Tkinter (_tkinter)',
      category: 'Toolkits & Test',
      description: 'Librerías Tcl/Tk no requeridas en Kivy (OpenGL).',
      approxSavingsMB: 40,
    },
    {
      id: 'PySide6',
      name: 'PySide6 / PyQt (Qt Runtimes)',
      category: 'Toolkits & Test',
      description: 'Evita colisiones e inclusiones accidentales de librerías Qt.',
      approxSavingsMB: 120,
    },
    {
      id: 'kivy.tests',
      name: 'Kivy Tests & Benchmark Tools',
      category: 'Toolkits & Test',
      description: 'Suites de test internos y herramientas de benchmark de Kivy.',
      approxSavingsMB: 20,
    },
    {
      id: 'matplotlib',
      name: 'Matplotlib & Scipy',
      category: 'Scientific & Extra',
      description: 'Librerías pesadas de cálculo científico y ploteo.',
      approxSavingsMB: 65,
    },
    {
      id: 'PIL.ImageQt',
      name: 'Pillow Qt Backend (ImageQt)',
      category: 'Scientific & Extra',
      description: 'Backend Qt innecesario en renders Kivy.',
      approxSavingsMB: 10,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos internos de testing.',
      approxSavingsMB: 15,
    },
  ],

  Tkinter: [
    {
      id: 'PySide6',
      name: 'PySide6 Runtime',
      category: 'Toolkits & Test',
      description: 'Evita empaquetar librerías Qt6 en apps de Tkinter.',
      approxSavingsMB: 250,
    },
    {
      id: 'PyQt6',
      name: 'PyQt6 Runtime',
      category: 'Toolkits & Test',
      description: 'Evita empaquetar PyQt6 en apps de Tkinter.',
      approxSavingsMB: 200,
    },
    {
      id: 'kivy',
      name: 'Kivy Engine',
      category: 'Toolkits & Test',
      description: 'Evita empaquetar dependencias OpenGL/SDL2 de Kivy.',
      approxSavingsMB: 80,
    },
    {
      id: 'unittest',
      name: 'Unittest & Test suites',
      category: 'Toolkits & Test',
      description: 'Módulos internos de testing.',
      approxSavingsMB: 15,
    },
  ],
};

export const sanitizeExcludesForFramework = (fw: FrameworkType, excludes: string[]): string[] => {
  // Unrelated framework module prefixes to automatically purge when building a specific framework
  const isQt = fw.startsWith('PySide') || fw.startsWith('PyQt');
  const protectedCoreByFramework: Record<FrameworkType, string[]> = {
    PySide6: ['pyside6.qtcore', 'pyside6.qtgui', 'pyside6.qtwidgets', 'shiboken6', 'shibokensupport'],
    PyQt6: ['pyqt6.qtcore', 'pyqt6.qtgui', 'pyqt6.qtwidgets'],
    PySide2: ['pyside2.qtcore', 'pyside2.qtgui', 'pyside2.qtwidgets', 'shiboken2', 'shibokensupport'],
    PyQt5: ['pyqt5.qtcore', 'pyqt5.qtgui', 'pyqt5.qtwidgets'],
    Kivy: [],
    Tkinter: [],
  };
  const protectedCore = new Set(
    (protectedCoreByFramework[fw] || []).map((mod) => mod.toLowerCase()),
  );
  
  return excludes.filter((mod) => {
    const lower = mod.toLowerCase();

    // Never allow excluding framework core runtime modules required to bootstrap bindings.
    if (protectedCore.has(lower)) {
      return false;
    }

    // If we're building PySide or PyQt, we don't need 'kivy' or 'kivy_install' in exclude_modules
    if (isQt && (lower === 'kivy' || lower === 'kivy_install' || lower.startsWith('kivy.'))) {
      return false;
    }
    // If we're building Kivy, we don't need 'pyside6' or 'pyqt6' in exclude_modules
    if (fw === 'Kivy' && (lower.startsWith('pyside') || lower.startsWith('pyqt'))) {
      return false;
    }
    return true;
  });
};

export const getUpxExcludesForPlatform = (
  platform: string,
  framework: FrameworkType,
  currentExcludes?: string[]
): string[] => {
  const p = platform.toLowerCase();

  const getDefaultsForPlatformAndFramework = (): string[] => {
    if (p === 'linux') {
      switch (framework) {
        case 'Kivy':
          return ['libpython3*.so*', 'libSDL2-2.0.so*', 'libGLEW.so*'];
        case 'Tkinter':
          return ['libpython3*.so*', 'libtcl*.so*', 'libtk*.so*'];
        case 'PyQt5':
          return ['libpython3*.so*', 'libQt5Core.so*', 'QtCore.abi3.so'];
        case 'PySide2':
          return ['libpython3*.so*', 'libQt5Core.so*', 'PySide2.QtCore.so'];
        case 'PyQt6':
          return ['libpython3*.so*', 'libQt6Core.so*', 'QtCore.abi3.so'];
        case 'PySide6':
        default:
          return ['libpython3*.so*', 'libQt6Core.so*', 'QtCore.abi3.so'];
      }
    } else if (p === 'windows') {
      switch (framework) {
        case 'Kivy':
          return ['sdl2.dll', 'glew32.dll', 'kivy*.pyd', 'python3*.dll'];
        case 'Tkinter':
          return ['python3*.dll', 'tcl86t.dll', 'tk86t.dll'];
        case 'PyQt5':
          return [
            'Qt5Core.dll',
            'Qt5DBus.dll',
            'Qt5Gui.dll',
            'Qt5Widgets.dll',
            'qwindows.dll',
          ];
        case 'PySide2':
          return ['vcruntime140.dll', 'python3*.dll', 'PySide2.QtCore.pyd'];
        case 'PyQt6':
          return ['vcruntime140.dll', 'python3*.dll', 'PyQt6.QtCore.pyd', 'MSVCP140.dll', 'Qt6Core.dll'];
        case 'PySide6':
        default:
          return ['vcruntime140.dll', 'python3*.dll', 'PySide6.QtCore.pyd', 'MSVCP140.dll', 'Qt6Core.dll'];
      }
    }
    return [];
  };

  const defaultExcludes = getDefaultsForPlatformAndFramework();

  if (!currentExcludes || currentExcludes.length === 0) {
    return defaultExcludes;
  }

  // Filter currentExcludes according to platform and framework
  const cleaned = currentExcludes.filter((item) => {
    const lower = item.toLowerCase();
    if (p === 'linux') {
      if (lower.endsWith('.dll') || lower.endsWith('.pyd')) return false;
      // If framework is Qt5 (PyQt5/PySide2), filter out Qt6 specific libraries and vice versa
      if ((framework === 'PyQt5' || framework === 'PySide2') && lower.includes('qt6')) return false;
      if ((framework === 'PyQt6' || framework === 'PySide6') && lower.includes('qt5')) return false;
    } else if (p === 'windows') {
      if (lower.endsWith('.so') || lower.includes('.so.') || lower.endsWith('.dylib')) return false;
      if ((framework === 'PyQt5' || framework === 'PySide2') && (lower.includes('pyside6') || lower.includes('pyqt6'))) return false;
      if ((framework === 'PyQt6' || framework === 'PySide6') && (lower.includes('pyside2') || lower.includes('pyqt5'))) return false;
    }
    return true;
  });

  return cleaned.length > 0 ? cleaned : defaultExcludes;
};

export const getRecommendedExcludesForFramework = (fw: FrameworkType): string[] => {
  const unique = (items: string[]): string[] => Array.from(new Set(items));
  const catalogIds = (FRAMEWORK_EXCLUSION_CATALOG[fw] || []).map((item) => item.id);

  switch (fw) {
    case 'PySide6':
      return unique([...catalogIds, 'test', 'pydoc']);
    case 'PyQt6':
      return unique([...catalogIds, 'test', 'pydoc']);
    case 'PySide2':
      return unique([...catalogIds, 'test', 'pydoc']);
    case 'PyQt5':
      return unique([...catalogIds, 'test', 'pydoc']);
    case 'Kivy':
      return [
        'tkinter',
        '_tkinter',
        'PySide6',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'kivy.tests',
        'matplotlib',
        'scipy',
        'unittest',
        'test',
        'pydoc',
      ];
    case 'Tkinter':
      return [
        'PySide6',
        'PySide2',
        'PyQt6',
        'PyQt5',
        'kivy',
        'unittest',
        'test',
        'pydoc',
      ];
  }
};
