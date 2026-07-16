import json
import os
from difflib import SequenceMatcher  # to find similar strings

QUOTES_FILE = "quotes_app_quotes_2026-05-29_08-27-19.json"
THRESHOLD = 0.85  # 0.85 means 85% similar


def _get_terminal_size():
    try:
        return os.get_terminal_size().columns
    except Exception:
        return 100


class ProgressBar:
    def __init__(self, total, prefix="", suffix="", decimals=1, fill="█"):
        self.total = total
        self.progress = 0
        self.prefix = prefix
        self.suffix = suffix
        self.decimals = decimals
        self.fill = fill
        self._total_length = _get_terminal_size()

    def _get_progress_bar_to_print(self, bar, percent):
        return f"{self.prefix}({self.progress} / {self.total}) |{bar}| {percent}% {self.suffix}"

    def _get_length(self):
        len_to_print = len(self._get_progress_bar_to_print("", "")) + 4 + self.decimals
        return _get_terminal_size() - len_to_print - 1

    def _print_progress_bar(self):
        percent = ("{0:." + str(self.decimals) + "f}").format(
            100 * (self.progress / float(self.total))
        )
        filled_length = int(self._get_length() * self.progress // self.total)
        bar = self.fill * filled_length + "-" * (self._get_length() - filled_length)
        print("\r", self._get_progress_bar_to_print(bar, percent), end="")
        # Print New Line on Complete
        if self.progress == self.total:
            print()

    def print(self, *args):
        args_len = 0
        for a in [*args]:
            args_len += len(str(a)) + 1
        print("\r", *args, " " * (self._total_length - args_len - 1))
        self._print_progress_bar()

    def update_progress(self, progress):
        self.progress = progress
        self._print_progress_bar()


def extract_data(data):
    return [
        {
            "Author": entry["Author"],
            "Quote": entry["Quote"],
        }  # dictionary object with Author and Quote keys
        for entry in data  # look at each item in the data
        if "Author" in entry
        and "Quote" in entry  # get only entries with Author and Quote
    ]  # return a list of dictionary objects

    """
    this code looks complicated only because it is on multiple lines
    if it was on one line it would look like this:

    extracted_data = [{"Author": entry["Author"], "Quote": entry["Quote"]} for entry in data if "Author" in entry and "Quote" in entry]
    """


def find_duplicates(data):

    dupe_count = 0
    progress_bar = ProgressBar(len(data))

    # Iterate through the list with an index to track position
    for i, item in enumerate(data):
        progress_bar.update_progress(i + 1)
        # Compare against only the remaining items in the list (data[i+1:])
        # This prevents comparing an item to itself or re-comparing pairs
        for candidate in data[i + 1 :]:
            # Calculate the similarity ratio
            similarity = SequenceMatcher(
                None, item["Quote"], candidate["Quote"]
            ).ratio()

            if similarity > THRESHOLD:
                dupe_count += 1
                progress_bar.print(f"Similarity: {similarity:.2f}")
                progress_bar.print(f"Quote A: {item['Quote']}")
                progress_bar.print(f"Quote B: {candidate['Quote']}")
                progress_bar.print("-" * 20)

    return dupe_count


try:
    with open(QUOTES_FILE, "r") as f:
        data = json.load(f)  # list
    # print(json.dumps(data, indent=2))
    if data:
        extracted_data = extract_data(data)

        duplicate_num = find_duplicates(extracted_data)
        print(f"Duplicate count: {duplicate_num}")
except Exception as e:
    print(f"Error: {e}")
