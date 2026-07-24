class Quote:
    author: str
    quote: str
    tags: list[str]

    def __init__(self, Author: str, Quote: str, tags: list[str] | None = None):
        self.author = Author
        self.quote = Quote
        self.tags = tags if tags is not None else []
