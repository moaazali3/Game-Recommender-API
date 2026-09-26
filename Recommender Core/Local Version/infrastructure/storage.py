"""Local filesystem generation storage with manifest-last publication."""
from __future__ import annotations

import json
import os
import re
import shutil
from pathlib import Path

from ml.model import FILES, _GEN, validate_generation


class ActiveGenerationUnavailable(RuntimeError):
    """The active pointer or referenced generation is unavailable."""


class LocalStorage:
    def __init__(self, storage_dir: str | Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents = True, exist_ok = True)

    @staticmethod
    def _safe_generation(generation: str) -> str:
        if not isinstance(generation, str) or not _GEN.fullmatch(generation):
            raise ValueError("Unsafe generation name")
        return generation

    @property
    def manifest_path(self) -> Path:
        return self.storage_dir / "active_manifest.json"

    def active_generation(self) -> str:
        if not self.manifest_path.is_file():
            raise ActiveGenerationUnavailable("Active manifest is unavailable")
        try:
            data = json.loads(self.manifest_path.read_text(encoding = "utf-8"))
            generation = self._safe_generation(data.get("generation"))
            validate_generation(self.storage_dir / generation)
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise ActiveGenerationUnavailable("Active generation is unavailable") from exc
        return generation

    def publish(self, local_generation: str | Path, generation: str) -> None:
        generation = self._safe_generation(generation)
        local_generation = Path(local_generation)
        validate_generation(local_generation)
        destination = self.storage_dir / generation
        temporary = self.storage_dir / f".{generation}.publish"
        previous = self.manifest_path.read_bytes() if self.manifest_path.is_file() else None
        try:
            if local_generation.resolve() != destination.resolve():
                if temporary.exists():
                    shutil.rmtree(temporary)
                shutil.copytree(local_generation, temporary)
                validate_generation(temporary)
                os.replace(temporary, destination)
            else:
                validate_generation(destination)

            manifest_temporary = self.storage_dir / ".active_manifest.json.tmp"
            manifest_temporary.write_text(
                json.dumps({"version": 1, "generation": generation}),
                encoding = "utf-8",
            )
            os.replace(manifest_temporary, self.manifest_path)
            if self.active_generation() != generation:
                raise RuntimeError("Manifest verification failed")
        except Exception:
            if temporary.exists():
                shutil.rmtree(temporary)
            if previous is None:
                self.manifest_path.unlink(missing_ok = True)
            else:
                self.manifest_path.write_bytes(previous)
            if destination.exists():
                try:
                    previous_generation = json.loads(previous.decode("utf-8"))["generation"] if previous is not None else None
                    if previous_generation != generation:
                        shutil.rmtree(destination)
                except (ValueError, KeyError):
                    if previous is None:
                        shutil.rmtree(destination)
            manifest_temporary = self.storage_dir / ".active_manifest.json.tmp"
            manifest_temporary.unlink(missing_ok = True)
            raise

    def cleanup(self, active: str, keep: int = 5) -> None:
        active = self._safe_generation(active)
        keep = max(0, int(keep))
        complete = []
        for path in self.storage_dir.iterdir():
            if not path.is_dir() or not _GEN.fullmatch(path.name):
                continue
            try:
                validate_generation(path)
            except (OSError, ValueError, TypeError):
                continue
            complete.append(path.name)
        retained = set(sorted(complete, reverse = True)[:keep]) | {active}
        for generation in complete:
            if generation not in retained:
                shutil.rmtree(self.storage_dir / generation)
