import json
import re
import sqlite3
from pathlib import Path

from app.domain.inference import JsonSchema


class MethodologyIndex:
    def __init__(self, database: Path, corpus: Path) -> None:
        self.database = database
        records = json.loads(corpus.read_text()) if corpus.is_file() else []
        with sqlite3.connect(database) as con:
            con.execute(
                "create virtual table if not exists methodology using fts5(id UNINDEXED, "
                "title, keywords, text, metadata UNINDEXED)"
            )
            con.execute("delete from methodology")
            for row in records:
                con.execute(
                    "insert into methodology values (?,?,?,?,?)",
                    (row["id"], row["title"], row["keywords"], row["text"], json.dumps(row)),
                )

    def search(self, query: str) -> JsonSchema:
        tokens = re.findall(r"\w+", query, flags=re.UNICODE)[:20]
        if not tokens:
            return {"available": True, "matches": []}
        expression = " OR ".join(
            '"' + (token[:-2] if len(token) >= 6 else token) + '"*' for token in tokens
        )
        with sqlite3.connect(self.database) as con:
            rows = con.execute(
                "select metadata from methodology where methodology match ? order by rank limit 5",
                (expression,),
            ).fetchall()
        return {
            "available": True,
            "matches": [json.loads(row[0]) for row in rows],
            "limits": "Methodology supports hypotheses; it does not establish local causation.",
        }
