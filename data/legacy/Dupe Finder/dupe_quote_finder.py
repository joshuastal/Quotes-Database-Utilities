import pickle
from difflib import SequenceMatcher  # to find similar strings
from pathlib import Path

from data.legacy.progress_bar import ProgressBar
from data.legacy.Quote import Quote

QUOTES_FILE = Path(__file__).resolve().parent.parent / "quotes.pk"
THRESHOLD = 0.85  # 0.85 means 85% similar


def find_duplicates(data: list[Quote]):
    dupe_count = 0
    progress_bar = ProgressBar(len(data))

    # Iterate through the list with an index to track position
    for i, item in enumerate(data):
        progress_bar.update_progress(i + 1)
        # Compare against only the remaining items in the list (data[i+1:])
        # This prevents comparing an item to itself or re-comparing pairs
        for candidate in data[i + 1:]:
            # Calculate the similarity ratio
            similarity = SequenceMatcher(
                None, item.quote, candidate.quote
            ).ratio()

            if similarity > THRESHOLD:
                dupe_count += 1
                progress_bar.print(f"Similarity: {similarity:.2f}")
                progress_bar.print(f"Quote A: {item.quote}")
                progress_bar.print(f"Quote B: {candidate.quote}")
                progress_bar.print("-" * 20)

    return dupe_count


def main():
    try:
        with open(QUOTES_FILE, "rb") as f:
            data, _ = pickle.load(f)  # list
        if data:
            duplicate_num = find_duplicates(data)
            print(f"Duplicate count: {duplicate_num}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
