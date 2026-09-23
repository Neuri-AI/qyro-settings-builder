import { PythonCodeFile } from '../types';

export const CODE_TEMPLATES: PythonCodeFile[] = [
  {
    path: 'qyro/domain/project.py',
    layer: 'Domain',
    description: 'Entidades núcleo del proyecto Qyro: Binding enum, ProjectConfig, AddonModule, TargetPlatform y conversión a settings/base.json.',
    code: `"""
Core project entities: the Qt/Kivy/Tkinter binding, the project configuration and the spec
for a generated component.

All the small rules that used to be inlined in \`init()\` and \`create()\` live
here now — default bundle id, default base widget per binding, CamelCase
conversion — which means they're unit-testable without a terminal.
"""
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, List
import re
from qyro.domain.errors import InvalidComponentTypeError, InvalidBindingError
from qyro.domain.version import Version


def to_camel_case(name: str) -> str:
    """Convert snake_case / kebab-case / spaced names to CamelCase."""
    parts = name.strip().replace("-", " ").replace("_", " ").split()
    return "".join(word[:1].upper() + word[1:] for word in parts)


class AddonModule(str, Enum):
    HOTRL = "hotrl"
    PYDUX = "pydux"
    SENTRY = "sentry-sdk"
    REQUESTS = "requests"


class TargetPlatform(str, Enum):
    IPHONE = "iPhone"
    ANDROID = "Android"
    X86_64 = "x86_64"
    APPLE_SILICON = "Apple Silicon"


class Binding(str, Enum):
    PYQT5 = "PyQt5"
    PYQT6 = "PyQt6"
    PYSIDE2 = "PySide2"
    PYSIDE6 = "PySide6"
    KIVY = "Kivy"
    TKINTER = "Tkinter"

    @property
    def import_name(self) -> str:
        """Return the actual module name expected by importlib."""
        mapping = {
            Binding.KIVY: "kivy",
            Binding.TKINTER: "tkinter",
        }
        return mapping.get(self, self.value)

    @classmethod
    def values(cls) -> tuple:
        return tuple(b.value for b in cls)

    @classmethod
    def parse(cls, value: str) -> "Binding":
        for binding in cls:
            if binding.value.lower() == str(value).strip().lower():
                return binding
        raise InvalidBindingError(str(value), cls.values())

    @property
    def is_pyside(self) -> bool:
        return self in (Binding.PYSIDE2, Binding.PYSIDE6)

    @property
    def default_base_widget(self) -> str:
        if self.is_pyside:
            return "QWidget"
        if self == Binding.KIVY:
            return "Widget"
        if self == Binding.TKINTER:
            return "Frame"
        return "QtWidget"

    def supports(self, platform: TargetPlatform) -> bool:
        if platform in (
            TargetPlatform.IPHONE,
            TargetPlatform.ANDROID,
        ):
            return self in (
                Binding.KIVY,
                Binding.PYSIDE6,
            )

        if platform == TargetPlatform.X86_64:
            return True

        if platform == TargetPlatform.APPLE_SILICON:
            return self in (
                Binding.PYSIDE6,
                Binding.KIVY,
                Binding.PYQT6,
                Binding.TKINTER
            )

        return False

    @property
    def dependency_spec(self) -> str:
        if self == Binding.PYQT5 and sys.platform.startswith("win"):
            return 'PyQt5", "PyQt5-Qt5<=5.15.2; sys_platform == \\'win32\\''

        if self == Binding.PYSIDE2:
            return 'PySide2>=5.15.2; python_version < "3.11"'

        return self.value


@dataclass
class ProjectConfig:
    """Everything \`qyro init\` needs to scaffold a project."""

    app_name: str
    version: Version
    author: str
    binding: Binding
    mac_bundle_identifier: Optional[str] = None
    addons: list[AddonModule] = field(default_factory=list)
    target_platform: TargetPlatform = TargetPlatform.X86_64

    DEFAULT_HIDDEN_IMPORTS = ("__future__",)

    @staticmethod
    def suggest_bundle_identifier(app_name: str, author: str) -> str:
        author_part = (author.lower().split() or ["unknown"])[0]
        app_part = "".join(app_name.lower().split())
        return f"com.{author_part}.{app_part}"

    def as_base_settings(self) -> Dict[str, object]:
        """The keys written into <project_location>/settings/base.json."""
        return {
            "app_name": self.app_name,
            "author": self.author,
            "version": str(self.version),
            "binding": self.binding.value,
            "hidden_imports": list(self.DEFAULT_HIDDEN_IMPORTS),
        }
`,
  },
  {
    path: 'qyro/adapters/freeze/framework_hooks.py',
    layer: 'Adapters',
    description: 'Hook resolver que aprovecha Binding y AddonModule de domain/project.py para resolver imports ocultos y assets.',
    code: `"""
qyro.adapters.freeze.framework_hooks
Framework-specific resolution hooks for Qyro's Freeze system.
Handles PyQt5, PyQt6, PySide2, PySide6, Kivy, Tkinter hidden imports and resource data,
integrating with Qyro's domain Binding and Project entities.
"""

from pathlib import Path
from typing import List, Optional

from qyro.application.ports import FrameworkHookResolverPort
from qyro.domain.build import FreezeManifest
from qyro.domain.project import Binding, AddonModule
from qyro.domain.errors import InvalidBindingError


class FrameworkHookResolver(FrameworkHookResolverPort):
    """
    Intelligently inspects project files and domain Binding to resolve:
    - PyInstaller hidden imports
    - Collect data / resource paths
    - Binary dependencies (SDL2, GLEW, etc. for Kivy)
    - Plugin directories for Qt family
    - Common project settings and assets
    """

    def resolve_args(
        self,
        project_root: Path,
        manifest: FreezeManifest,
    ) -> List[str]:
        args: List[str] = []

        # Parse binding through domain entity
        try:
            binding = Binding.parse(manifest.binding)
        except (InvalidBindingError, ValueError):
            binding = None

        if binding == Binding.PYSIDE6:
            args.extend(self._resolve_pyside6(project_root, manifest))
        elif binding == Binding.PYQT6:
            args.extend(self._resolve_pyqt6(project_root, manifest))
        elif binding == Binding.PYQT5:
            args.extend(self._resolve_pyqt5(project_root, manifest))
        elif binding == Binding.PYSIDE2:
            args.extend(self._resolve_pyside2(project_root, manifest))
        elif binding == Binding.KIVY:
            args.extend(self._resolve_kivy(project_root, manifest))
        elif binding == Binding.TKINTER:
            args.extend(self._resolve_tkinter(project_root, manifest))

        # Automatically exclude competing framework runtimes
        args.extend(self._resolve_competing_framework_exclusions(binding, manifest))

        # Resolve add-on dependencies (e.g. requests, plyer, kivymd)
        args.extend(self._resolve_addons(manifest))

        # Common Qyro project structure assets (resources/ and settings/)
        args.extend(self._resolve_project_assets(project_root, manifest))

        return args

    def _resolve_pyside6(self, project_root: Path, manifest: FreezeManifest) -> List[str]:
        return [
            "--hidden-import", "PySide6",
            "--hidden-import", "PySide6.QtCore",
            "--hidden-import", "PySide6.QtGui",
            "--hidden-import", "PySide6.QtWidgets",
            "--collect-data", "PySide6",
            "--exclude-module", "PySide6.scripts",
        ]

    def _resolve_competing_framework_exclusions(self, binding: Binding, manifest: FreezeManifest) -> List[str]:
        exclusions = []
        user_excludes = {m.lower() for m in manifest.optimization.exclude_modules}
        if binding and binding.is_pyside:
            for mod in ["kivy", "kivy_install", "tkinter"]:
                if mod not in user_excludes:
                    exclusions.extend(["--exclude-module", mod])
        return exclusions

    def _resolve_project_assets(self, project_root: Path, manifest: FreezeManifest) -> List[str]:
        args: List[str] = []
        sep = ";" if manifest.target_platform == "windows" else ":"

        # 1. Include project resources folder (recursively bundled with --add-data)
        resources_dir = (project_root / (manifest.resources_dir or "resources")).resolve()
        if resources_dir.exists() and resources_dir.is_dir():
            dest_res = (manifest.resources_dir or "resources").replace("\\\\", "/")
            args.extend(["--add-data", f"{str(resources_dir)}{sep}{dest_res}"])

        # 2. Include settings folder
        settings_dir = (project_root / "settings").resolve()
        if settings_dir.exists() and settings_dir.is_dir():
            args.extend(["--add-data", f"{str(settings_dir)}{sep}settings"])

        # 3. Robust platform icon auto-resolution by convention
        platform = manifest.target_platform.lower()
        if platform == "windows":
            # Search candidates in resources/base/icons/ (case-insensitive & fallback)
            win_icon_candidates = [
                project_root / "resources" / "base" / "icons" / "Icon.ico",
                project_root / "resources" / "base" / "icons" / "icon.ico",
                project_root / "resources" / "windows" / "icons" / "Icon.ico",
                project_root / "resources" / "windows" / "icons" / "icon.ico",
                project_root / "resources" / "icons" / "Icon.ico",
            ]
            win_ico = next((p.resolve() for p in win_icon_candidates if p.exists()), None)
            if win_ico:
                args.extend(["--icon", str(win_ico)])
            else:
                # Fallback: check any .ico in resources/
                found_icos = list(project_root.glob("resources/**/*.ico"))
                if found_icos:
                    args.extend(["--icon", str(found_icos[0].resolve())])

        elif platform in ("macos", "mac"):
            # macOS PyInstaller requires an .icns file.
            mac_icon_candidates = [
                project_root / "resources" / "mac" / "icons" / "AppIcon.icns",
                project_root / "resources" / "mac" / "icons" / "icon.icns",
                project_root / "resources" / "base" / "icons" / "AppIcon.icns",
            ]
            mac_icns = next((p.resolve() for p in mac_icon_candidates if p.exists()), None)
            if mac_icns:
                args.extend(["--icon", str(mac_icns)])
            else:
                # If only PNGs exist (e.g. 1024.png, 512.png), auto-generate or use largest PNG for bundle
                mac_png_candidates = [
                    project_root / "resources" / "mac" / "icons" / "1024.png",
                    project_root / "resources" / "mac" / "icons" / "512.png",
                ]
                largest_png = next((p.resolve() for p in mac_png_candidates if p.exists()), None)
                if largest_png:
                    # In macOS builds, Qyro compiles iconset to AppIcon.icns or bundles via --add-data
                    args.extend(["--add-data", f"{str(largest_png)}{sep}resources/mac/icons"])

        elif platform == "linux":
            linux_candidates = [
                project_root / "resources" / "linux" / "icons" / "512.png",
                project_root / "resources" / "linux" / "icons" / "1024.png",
                project_root / "resources" / "linux" / "icons" / "256.png",
                project_root / "resources" / "base" / "icons" / "64.png",
            ]
            linux_icon = next((p.resolve() for p in linux_candidates if p.exists()), None)
            if linux_icon:
                args.extend(["--icon", str(linux_icon)])

        # 4. Inject runtime hook so Qyro apps seamlessly access resources via sys._MEIPASS
        rth_path = project_root / "hooks" / "rth_qyro_resources.py"
        if rth_path.exists():
            args.extend(["--runtime-hook", str(rth_path.resolve())])

        return args

    def _resolve_kivy(self, project_root: Path, manifest: FreezeManifest) -> List[str]:
        args = [
            "--hidden-import", "kivy",
            "--hidden-import", "kivy.core.window.window_sdl2",
            "--hidden-import", "kivy.core.text.text_sdl2",
            "--hidden-import", "kivy.core.image.img_sdl2",
            "--hidden-import", "kivy.core.clipboard.clipboard_sdl2",
            "--hidden-import", "kivy.graphics.cgl_backend.cgl_glew",
            "--collect-submodules", "kivy",
            "--collect-data", "kivy",
        ]

        # Scan and bundle .kv files (Kivy declarative layout files)
        kv_patterns = ["*.kv", "views/**/*.kv", "components/**/*.kv"]
        sep = ";" if manifest.target_platform == "windows" else ":"

        collected_kv: set[str] = set()
        for pat in kv_patterns:
            for p in project_root.glob(pat):
                if p.is_file():
                    rel = p.relative_to(project_root)
                    parent_rel = rel.parent
                    dest = "." if str(parent_rel) == "." else str(parent_rel).replace("\\\\", "/")
                    src = str(rel).replace("\\\\", "/")
                    collected_kv.add(f"{src}{sep}{dest}")

        for item in sorted(collected_kv):
            args.extend(["--add-data", item])

        return args
`,
  },
  {
    path: 'qyro/domain/build.py',
    layer: 'Domain',
    description: 'Modelos de dominio puro para Freezing: FreezeManifest enriquecido con Binding enum, AddonModule y ProjectConfig de domain/project.py.',
    code: `"""
Domain models for Qyro Build / Freeze System with Clean Architecture.
Integrates with qyro.domain.project entities (Binding, AddonModule, ProjectConfig).
Pure business rules supporting Kivy, PySide6, PyQt6, and Tkinter.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Dict, Any, Union

from qyro.domain.project import Binding, AddonModule, ProjectConfig
from qyro.domain.errors import InvalidBindingError


class BundleMode(str, Enum):
    ONEDIR = "onedir"
    ONEFILE = "onefile"

    @classmethod
    def parse(cls, value: str) -> "BundleMode":
        val = str(value).strip().lower()
        if val in ("onefile", "bundle", "single"):
            return cls.ONEFILE
        return cls.ONEDIR


class UACLevel(str, Enum):
    AS_INVOKER = "asInvoker"
    HIGHEST_AVAILABLE = "highestAvailable"
    REQUIRE_ADMINISTRATOR = "requireAdministrator"


@dataclass(frozen=True)
class UACConfig:
    level: UACLevel = UACLevel.AS_INVOKER
    ui_access: bool = False

    @property
    def requires_admin(self) -> bool:
        return self.level == UACLevel.REQUIRE_ADMINISTRATOR


@dataclass(frozen=True)
class DebugConfig:
    enabled: bool = False
    console_window: bool = False
    unstripped: bool = False
    verbose_imports: bool = False
    bootloader_debug: bool = False


@dataclass(frozen=True)
class OptimizationConfig:
    upx_enabled: bool = True
    upx_level: int = 9  # 1 to 9
    upx_excludes: List[str] = field(default_factory=lambda: [
        "libpython3*.so*", "libQt6Core.so*", "QtCore.abi3.so",  # Linux ELF
        "vcruntime140.dll", "python3*.dll", "PySide6.QtCore.pyd", "sdl2.dll"  # Windows PE
    ])
    bytecode_opt: int = 1  # 0: None, 1: -O, 2: -OO
    strip_binaries: bool = True
    exclude_modules: List[str] = field(default_factory=lambda: [
        "tkinter", "unittest", "test", "pydoc", "distutils"
    ])
    clean_build: bool = True


@dataclass(frozen=True)
class FreezeManifest:
    app_name: str
    author: str = "Developer"
    version: str = "1.0.0"
    entry_point: str = "main.py"
    target_platform: str = "windows"
    bundle_mode: BundleMode = BundleMode.ONEDIR
    binding: Union[Binding, str] = "kivy"
    uac: UACConfig = field(default_factory=UACConfig)
    debug: DebugConfig = field(default_factory=DebugConfig)
    optimization: OptimizationConfig = field(default_factory=OptimizationConfig)
    addons: List[Union[AddonModule, str]] = field(default_factory=list)
    hidden_imports: List[str] = field(default_factory=lambda: list(ProjectConfig.DEFAULT_HIDDEN_IMPORTS))
    resources_dir: Optional[str] = "resources"
    extra_pyinstaller_args: List[str] = field(default_factory=list)

    @property
    def binding_enum(self) -> Binding:
        """Returns strongly-typed Binding enum."""
        if isinstance(self.binding, Binding):
            return self.binding
        try:
            return Binding.parse(str(self.binding))
        except (InvalidBindingError, ValueError):
            return Binding.KIVY

    @property
    def is_pyside(self) -> bool:
        return self.binding_enum.is_pyside

    @property
    def is_kivy(self) -> bool:
        return self.binding_enum == Binding.KIVY

    @property
    def is_tkinter(self) -> bool:
        return self.binding_enum == Binding.TKINTER

    def has_addon(self, addon: Union[AddonModule, str]) -> bool:
        target = addon.value if isinstance(addon, AddonModule) else str(addon).lower()
        return any(
            (a.value if isinstance(a, AddonModule) else str(a)).lower() == target
            for a in self.addons
        )

    def suggest_bundle_id(self) -> str:
        return ProjectConfig.suggest_bundle_identifier(self.app_name, self.author)
`,
  },
  {
    path: 'qyro/application/use_cases/freeze.py',
    layer: 'Application',
    description: 'Caso de uso FreezeUseCase: orquesta guards, carga jerárquica de settings/ y ejecución de PyInstaller.',
    code: `"""
Freeze / Build Application Use Case.
Orchestrates project validation, settings hierarchy merging, framework packaging hooks resolution, and binary optimization.
"""

import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any

from qyro.domain.build import FreezeManifest, BuildArtifact
from qyro.application.ports import (
    ManifestRepositoryPort,
    FreezerPort,
    BinaryOptimizerPort,
    FrameworkHookResolverPort,
    ConsoleUIPort,
)
from qyro.application.guards import ensure_valid_qyro_project


class FreezeUseCase:
    """Coordinates the end-to-end application freezing lifecycle."""

    def __init__(
        self,
        manifest_repo: ManifestRepositoryPort,
        freezer: FreezerPort,
        optimizer: BinaryOptimizerPort,
        hook_resolver: FrameworkHookResolverPort,
        ui: ConsoleUIPort,
    ):
        self._manifest_repo = manifest_repo
        self._freezer = freezer
        self._optimizer = optimizer
        self._hook_resolver = hook_resolver
        self._ui = ui

    def execute(self, project_root: Path, overrides: Optional[Dict[str, Any]] = None) -> BuildArtifact:
        self._ui.info("Verificando estructura de proyecto Qyro...")
        ensure_valid_qyro_project(project_root)

        # 1. Load settings/base.json merged with settings/<platform>.json and CLI overrides
        manifest = self._manifest_repo.load_manifest(project_root, overrides or {})
        
        # 2. Resolve framework & addon packaging hooks
        hook_args = self._hook_resolver.resolve_args(project_root, manifest)
        
        # 3. Freeze with PyInstaller
        raw_artifact = self._freezer.freeze(project_root, manifest, extra_args=hook_args)
        
        # 4. Optimize binary
        final_artifact = self._optimizer.optimize(raw_artifact, manifest.optimization)
        
        self._ui.success(f"Compilación exitosa: {final_artifact.executable_path}")
        return final_artifact
`,
  },
  {
    path: 'qyro/adapters/persistence/storage.py',
    layer: 'Adapters',
    description: 'Adaptador de persistencia jerárquica: lee settings/base.json y sobreescribe con settings/{platform}.json.',
    code: `"""
JsonManifestRepository: Hierarchical settings storage adapter for Qyro.
Loads settings/base.json -> settings/<platform>.json -> CLI overrides.
"""

import json
from pathlib import Path
from typing import Dict, Any

from qyro.application.ports import ManifestRepositoryPort
from qyro.domain.build import FreezeManifest, UACConfig, DebugConfig, OptimizationConfig, BundleMode, UACLevel


class JsonManifestRepository(ManifestRepositoryPort):
    """Loads and serializes hierarchical project configuration files."""

    def load_manifest(self, project_root: Path, overrides: Dict[str, Any]) -> FreezeManifest:
        settings_dir = project_root / "settings"
        
        # 1. Base configuration (settings/base.json)
        base_data = {}
        base_file = settings_dir / "base.json"
        if base_file.exists():
            with open(base_file, "r", encoding="utf-8") as f:
                base_data = json.load(f)

        # 2. Platform-specific configuration (settings/windows.json, linux.json, etc.)
        target_platform = overrides.get("target_platform", "windows")
        platform_data = {}
        platform_file = settings_dir / f"{target_platform}.json"
        if platform_file.exists():
            with open(platform_file, "r", encoding="utf-8") as f:
                platform_data = json.load(f)

        # Merge base + platform + overrides
        merged = {**base_data, **platform_data, **overrides}

        debug_raw = merged.get("debug", {})
        debug = DebugConfig(
            enabled=debug_raw.get("enabled", False),
            console_window=debug_raw.get("console", debug_raw.get("console_window", False)),
        )

        opt_raw = merged.get("optimization", {})
        optimization = OptimizationConfig(
            strip_binaries=opt_raw.get("strip_binaries", True),
            clean_build=opt_raw.get("clean_build", True),
            upx_enabled=opt_raw.get("upx_enabled", True),
            upx_level=opt_raw.get("upx_level", 9),
            upx_excludes=opt_raw.get("upx_excludes", []),
            bytecode_opt=opt_raw.get("bytecode_opt", 1),
            exclude_modules=opt_raw.get("exclude_modules", []),
        )

        return FreezeManifest(
            app_name=merged.get("app_name", "QyroApp"),
            author=merged.get("author", "Developer"),
            version=merged.get("version", "1.0.0"),
            entry_point=merged.get("entry_point", "main.py"),
            target_platform=target_platform,
            bundle_mode=BundleMode(merged.get("bundle_mode", "onedir")),
            binding=merged.get("binding", "kivy"),
            addons=merged.get("addons", []),
            hidden_imports=merged.get("hidden_imports", ["__future__"]),
            debug=debug,
            optimization=optimization,
        )
`,
  },
];
