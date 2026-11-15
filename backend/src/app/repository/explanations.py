import json
from pathlib import Path

from app.domain.errors import DataUnavailable
from app.domain.inference import JsonSchema


class FileExplanations:
    def __init__(self, path: Path) -> None:
        self._path = path

    def card(self, pipe_id: int, segment_id: int) -> JsonSchema:
        try:
            found = None
            with self._path.open(encoding="utf-8") as handle:
                for line in handle:
                    row = json.loads(line)
                    if row.get("id") == pipe_id and row.get("segment_id") == segment_id:
                        if found is not None:
                            raise ValueError("duplicate explanation")
                        found = row
            if found is None:
                raise ValueError("missing explanation")
            if not isinstance(found, dict):
                raise TypeError("invalid explanation")
            return found
        except (OSError, ValueError, TypeError, AttributeError) as exc:
            raise DataUnavailable(("explanation artifact unavailable",)) from exc
