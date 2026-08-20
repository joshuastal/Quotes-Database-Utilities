import pickle

from Quote import Quote

QUOTES_FILE = "quotes.pk"
quotes: list[Quote]
references: list[str]

with open(QUOTES_FILE, "rb") as f:
    quotes, references = pickle.load(f)


def find_longest_quote(quotes: list[Quote]) -> Quote:
    return max(quotes, key=lambda quote: len(quote.quote))


def find_shortest_quote(quotes: list[Quote]) -> Quote:
    return sorted(quotes, key=lambda quote: len(quote.quote))[-1]


def find_longest_quotes(quotes: list[Quote], limit: int) -> list[Quote]:
    return sorted(quotes, key=lambda quote: len(quote.quote), reverse=True)[:limit]


def main():
    print(f"Longest Quote: {find_longest_quote(quotes).quote}\n")
    print(f"Longest 10 Quotes:")
    for quote in find_longest_quotes(quotes, 10):
        print(f"{quote.quote}\n")
    print(f"Shortest Quote: {find_shortest_quote(quotes).quote}\n")


if __name__ == "__main__":
    main()
