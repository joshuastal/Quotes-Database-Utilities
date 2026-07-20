import json
import os
from difflib import SequenceMatcher  # to find similar strings

from progress_bar import ProgressBar

QUOTES_FILE = "quotes_app_quotes_2026-05-29_08-27-19.json"
THRESHOLD = 0.85  # 0.85 means 85% similar




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
