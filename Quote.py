from dataclasses import dataclass


@dataclass
class Quote:
    author: str
    quote: str
    tags: list[str]
    created_at: str
    updated_at: str

    def __init__(self, author: str, quote: str, created_at: str, updated_at: str, tags: list[str] | None = None):
        self.author = author
        self.quote = quote
        self.tags = tags if tags is not None else []
        self.created_at = created_at
        self.updated_at = updated_at
