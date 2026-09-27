"""Hugging Face Hub artifact storage with local caching and safe publication."""
from __future__ import annotations
import json
import re
import shutil
from pathlib import Path
try:
    from huggingface_hub.errors import EntryNotFoundError, RemoteEntryNotFoundError, LocalEntryNotFoundError
except ImportError:  # Older hub versions expose a smaller error set.
    try:
        from huggingface_hub.errors import EntryNotFoundError
    except ImportError:
        EntryNotFoundError = type("EntryNotFoundError", (Exception,), {})
    RemoteEntryNotFoundError = EntryNotFoundError
    LocalEntryNotFoundError = EntryNotFoundError
from ml.model import FILES, validate_generation, _GEN


class ActiveGenerationUnavailable(RuntimeError):
    """The active pointer or its referenced generation is not available."""


class HubStorage:
    def __init__(self, repo_id: str, token: str | None = None, repo_type: str = "model", cache_dir: str | Path = ".model-cache", api = None):
        from huggingface_hub import HfApi
        self.repo_id = repo_id
        self.token = token
        self.repo_type = repo_type
        self.cache_dir = Path(cache_dir)
        self.api = api or HfApi(token = token)
        self.cache_dir.mkdir(parents = True, exist_ok = True)

    @staticmethod
    def _safe_generation(generation: str) -> str:
        if not isinstance(generation, str) or not _GEN.fullmatch(generation):
            raise ValueError("Unsafe generation name")
        return generation

    def _download(self, path: str, destination: Path) -> None:
        destination.mkdir(parents = True, exist_ok = True)
        target = destination / path
        target.parent.mkdir(parents = True, exist_ok = True)
        from huggingface_hub import hf_hub_download
        try:
            downloaded = hf_hub_download(self.repo_id, path, repo_type = self.repo_type, token = self.token, local_dir = str(destination))
        except FileNotFoundError as exc:
            raise ActiveGenerationUnavailable(f"Active model artifact is unavailable: {path}") from exc
        except (EntryNotFoundError, RemoteEntryNotFoundError, LocalEntryNotFoundError) as exc:
            raise ActiveGenerationUnavailable(f"Active model artifact is unavailable: {path}") from exc
        except Exception as exc:
            # Keep compatibility with hub releases that do not export all
            # exception classes, while never hiding corruption/JSON errors.
            if exc.__class__.__name__ in {"EntryNotFoundError", "RemoteEntryNotFoundError", "LocalEntryNotFoundError"}:
                raise ActiveGenerationUnavailable(f"Active model artifact is unavailable: {path}") from exc
            raise
        source = Path(downloaded)
        if source != target:
            shutil.copy2(source, target)
        if not target.is_file():
            raise ActiveGenerationUnavailable(f"Active model artifact is unavailable: {path}")

    def active_generation(self) -> str:
        self._download("active_manifest.json", self.cache_dir)
        manifest = self.cache_dir / "active_manifest.json"
        data = json.loads(manifest.read_text(encoding = "utf-8"))
        generation = self._safe_generation(data.get("generation"))
        local = self.cache_dir / generation
        for file in FILES:
            self._download(f"{generation}/{file}", self.cache_dir)
        validate_generation(local)
        return generation

    def publish(self, local_generation: Path, generation: str) -> None:
        generation = self._safe_generation(generation)
        local_generation = Path(local_generation)
        validate_generation(local_generation)
        self.cache_dir.mkdir(parents = True, exist_ok = True)
        old_manifest = self.cache_dir / "active_manifest.json"
        old_bytes = old_manifest.read_bytes() if old_manifest.is_file() else None
        manifest_file = self._manifest_file(generation)
        try:
            for file in FILES:
                self.api.upload_file(path_or_fileobj = str(local_generation / file), path_in_repo = f"{generation}/{file}", repo_id = self.repo_id, repo_type = self.repo_type, token = self.token)
            remote_generation = self.cache_dir / generation
            for file in FILES:
                self._download(f"{generation}/{file}", self.cache_dir)
            validate_generation(remote_generation)
            self.api.upload_file(path_or_fileobj = str(manifest_file), path_in_repo = "active_manifest.json", repo_id = self.repo_id, repo_type = self.repo_type, token = self.token)
            self._download("active_manifest.json", self.cache_dir)
            verified = json.loads(old_manifest.read_text(encoding = "utf-8"))
            if verified.get("generation") != generation:
                raise RuntimeError("Manifest verification failed")
        except Exception:
            if old_bytes is None:
                old_manifest.unlink(missing_ok = True)
            else:
                old_manifest.write_bytes(old_bytes)
            raise

    def _manifest_file(self, generation: str) -> Path:
        generation = self._safe_generation(generation)
        path = self.cache_dir / ".active_manifest.json"
        path.write_text(json.dumps({"version": 1, "generation": generation}), encoding = "utf-8")
        return path

    def cleanup(self, active: str, keep: int = 5) -> None:
        active = self._safe_generation(active)
        keep = max(0, int(keep))
        files = self.api.list_repo_files(repo_id = self.repo_id, repo_type = self.repo_type, token = self.token)
        grouped = {}
        for path in files:
            parts = path.split("/", 1)
            if len(parts) == 2 and _GEN.fullmatch(parts[0]):
                grouped.setdefault(parts[0], set()).add(parts[1])
        complete = sorted((name for name, paths in grouped.items() if set(FILES).issubset(paths)), reverse = True)
        retained = set(complete[:keep]) | {active}
        for generation in sorted(grouped):
            if generation not in retained:
                self.api.delete_folder(repo_id = self.repo_id, folder_path = generation, repo_type = self.repo_type, token = self.token)
