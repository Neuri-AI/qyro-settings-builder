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

export function calculateEstimatedSize(
  framework: FrameworkType,
  excludeModules: string[],
  upxEnabled: boolean = false,
  upxLevel: number = 9,
  stripBinaries: boolean = false
): EstimatedSizeBreakdown {
  const isQt = framework.startsWith('PySide') || framework.startsWith('PyQt');
  const isKivy = framework === 'Kivy';
  const isTkinter = framework === 'Tkinter';

  // Base raw unoptimized size (blind bundle containing entire runtime, chromium & 3D toolkits)
  const baseSize = isQt ? 1079.78 : isKivy ? 345.50 : 48.20;
  const minCorePayload = isQt ? 185.0 : isKivy ? 42.0 : 12.0;

  const catalog = FRAMEWORK_EXCLUSION_CATALOG[framework] || [];
  const catalogMap = new Map(catalog.map((item) => [item.id, item.approxSavingsMB]));

  let totalSavings = 0;
  for (const mod of excludeModules) {
    if (catalogMap.has(mod)) {
      totalSavings += catalogMap.get(mod)!;
    } else {
      // Default estimation for custom user-added excluded modules
      totalSavings += 18.0;
    }
  }

  // Cap maximum exclusions so core runtime is preserved
  const effectiveSavings = Math.min(totalSavings, Math.max(0, baseSize - minCorePayload));
  let sizeWithExclusions = baseSize - effectiveSavings;

  if (stripBinaries && effectiveSavings > 0) {
    sizeWithExclusions = Math.max(minCorePayload, sizeWithExclusions * 0.90);
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
      id: 'PyQt6.QtMultimedia',
      name: 'PyQt6.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Soporte multimedia y streaming de audio/vídeo.',
      approxSavingsMB: 50,
    },
    {
      id: 'PyQt6.QtSensors',
      name: 'PyQt6.QtSensors & Positioning',
      category: 'Sensors & Hardware',
      description: 'Sensores de hardware y localización geográfica.',
      approxSavingsMB: 20,
    },
    {
      id: 'PyQt6.QtBluetooth',
      name: 'PyQt6.QtBluetooth & QtNfc',
      category: 'Sensors & Hardware',
      description: 'Conectividad inalámbrica Bluetooth y NFC.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt6.QtCharts',
      name: 'PyQt6.QtCharts',
      category: 'Scientific & Extra',
      description: 'Librerías de gráficos cartesianos y polares.',
      approxSavingsMB: 25,
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
      id: 'PySide2.Qt3DCore',
      name: 'PySide2.Qt3DCore & Qt3DRender',
      category: '3D & OpenGL',
      description: 'Módulo 3D de Qt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PySide2.QtSensors',
      name: 'PySide2.QtSensors & QtLocation',
      category: 'Sensors & Hardware',
      description: 'Sensores y posicionamiento Qt5.',
      approxSavingsMB: 25,
    },
    {
      id: 'PySide2.QtMultimedia',
      name: 'PySide2.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Audio y vídeo Qt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PySide2.QtDesigner',
      name: 'PySide2.QtDesigner',
      category: 'Toolkits & Test',
      description: 'Plugins de diseño Qt Designer 5.',
      approxSavingsMB: 30,
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
      id: 'PyQt5.Qt3DCore',
      name: 'PyQt5.Qt3DCore',
      category: '3D & OpenGL',
      description: 'Módulo 3D de PyQt5.',
      approxSavingsMB: 40,
    },
    {
      id: 'PyQt5.QtSensors',
      name: 'PyQt5.QtSensors & QtLocation',
      category: 'Sensors & Hardware',
      description: 'Sensores y geolocalización PyQt5.',
      approxSavingsMB: 25,
    },
    {
      id: 'PyQt5.QtMultimedia',
      name: 'PyQt5.QtMultimedia',
      category: 'Media & Spatial Audio',
      description: 'Audio y vídeo PyQt5.',
      approxSavingsMB: 40,
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
  
  return excludes.filter((mod) => {
    const lower = mod.toLowerCase();
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
          return ['vcruntime140.dll', 'python3*.dll', 'PyQt5.QtCore.pyd'];
        case 'PySide2':
          return ['vcruntime140.dll', 'python3*.dll', 'PySide2.QtCore.pyd'];
        case 'PyQt6':
          return ['vcruntime140.dll', 'python3*.dll', 'PyQt6.QtCore.pyd'];
        case 'PySide6':
        default:
          return ['vcruntime140.dll', 'python3*.dll', 'PySide6.QtCore.pyd'];
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
  switch (fw) {
    case 'PySide6':
      return [
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebEngineQuick',
        'PySide6.QtPdf',
        'PySide6.QtPdfWidgets',
        'PySide6.Qt3DCore',
        'PySide6.QtQuick3D',
        'PySide6.Qt3DAnimation',
        'PySide6.QtSensors',
        'PySide6.QtPositioning',
        'PySide6.QtBluetooth',
        'PySide6.QtNfc',
        'PySide6.QtDesigner',
        'PySide6.QtSpatialAudio',
        'PySide6.QtMultimedia',
        'PySide6.QtCharts',
        'PySide6.QtVirtualKeyboard',
        'tkinter',
        'unittest',
        'test',
        'pydoc',
      ];
    case 'PyQt6':
      return [
        'PyQt6.QtWebEngineCore',
        'PyQt6.QtWebEngineWidgets',
        'PyQt6.QtWebEngineQuick',
        'PyQt6.QtPdf',
        'PyQt6.Qt3DCore',
        'PyQt6.QtQuick3D',
        'PyQt6.QtSensors',
        'PyQt6.QtPositioning',
        'PyQt6.QtBluetooth',
        'PyQt6.QtNfc',
        'PyQt6.QtDesigner',
        'PyQt6.QtSpatialAudio',
        'PyQt6.QtMultimedia',
        'PyQt6.QtCharts',
        'tkinter',
        'unittest',
        'test',
        'pydoc',
      ];
    case 'PySide2':
      return [
        'PySide2.QtWebEngineCore',
        'PySide2.QtWebEngineWidgets',
        'PySide2.Qt3DCore',
        'PySide2.QtSensors',
        'PySide2.QtPositioning',
        'PySide2.QtLocation',
        'PySide2.QtBluetooth',
        'PySide2.QtDesigner',
        'PySide2.QtMultimedia',
        'tkinter',
        'unittest',
        'test',
        'pydoc',
      ];
    case 'PyQt5':
      return [
        'PyQt5.QtWebEngineCore',
        'PyQt5.QtWebEngineWidgets',
        'PyQt5.Qt3DCore',
        'PyQt5.QtSensors',
        'PyQt5.QtPositioning',
        'PyQt5.QtLocation',
        'PyQt5.QtBluetooth',
        'PyQt5.QtDesigner',
        'PyQt5.QtMultimedia',
        'tkinter',
        'unittest',
        'test',
        'pydoc',
      ];
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
