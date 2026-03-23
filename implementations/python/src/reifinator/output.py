"""Output abstractions for creating directories and files."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Content:
    """Wraps generated string content and its encoding."""

    content: str
    encoding: str = "utf-8"


class OutputDirectory:
    """Represents a directory in the output tree."""

    def __init__(self, path: Path):
        self.path = path

    def create_dir(self, name: str) -> OutputDirectory:
        dir_path = self.path / name
        dir_path.mkdir(parents=True, exist_ok=True)
        return OutputDirectory(dir_path)

    def write_file(self, name: str, content: Content) -> Path:
        file_path = self.path / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content.content, encoding=content.encoding)
        return file_path

    def copy_file(self, name: str, source: Path) -> Path:
        file_path = self.path / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, file_path)
        return file_path
