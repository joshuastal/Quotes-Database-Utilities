import argparse
import json
import os
import pickle

from dotenv import load_dotenv

from Quote import Quote
from tag_generator.tag_data import TagSchema

os.environ.setdefault("GRPC_VERBOSITY", "ERROR")
import time

import firestore_utils as util
from tag_generator import tags_generator as tgs_gen
from tag_generator.output_colors import DiffColors

TAG_SCHEMA_FILE = "tag_schema.pk"
load_dotenv()
TEST_QUOTES: list[Quote] = [
    Quote(Author="", Quote=quote) for quote in json.loads(os.getenv("QUOTES", "[]"))
]


def check_quotes(collection: list[Quote], tag_schema1: list[TagSchema], tag_schema2: list[TagSchema]):
    flag = True
    while flag:
        print("Would you like to check a quote? (y/N): ", end="")
        if input().lower() == "y":
            print("Enter quote index: ", end="")
            index = int(input())
            print(f"{collection[index].quote}\n")
            tgs_gen.TagGenerator().print_differences_by_index(tag_schema1[index], tag_schema2[index])
        else:
            flag = False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply", action="store_true", help="Actually update Firestore."
    )

    args = parser.parse_args()

    try:
        db = util.FirestoreClient()
    except Exception as e:
        print("Unable to connect to Firestore...")
        raise e

    collection, references = db.load_collection()

    # have to compute references separately since they cannot be pickled
    collection_references = [db.client.document(path) for path in references]

    start_time = time.time()

    tg = tgs_gen.TagGenerator()
    tag_schema1, tag_schema2 = tg.generate_tags_multithreaded(tg.client, collection, 2, 8)

    end_time = time.time()

    tg.print_tag_schema(tag_schema1)

    if all(  # all(...) returns True when every value inside it is True
            # each schema is a list of tags
            # check each tag in each sorted list and compare the item in the
            # same index in the other list
            sorted(tag.value for tag in schema1.tags)
            == sorted(tag.value for tag in schema2.tags)
            for schema1, schema2 in zip(tag_schema1, tag_schema2, strict=True)
    ):
        print(DiffColors.GREEN + "Tag schemas are identical" + DiffColors.ENDC)
    else:
        print("\n" + DiffColors.FAIL + "Tag schemas are different" + DiffColors.ENDC)
        tg.print_differences(tag_schema1, tag_schema2)

    elapsed_seconds = round(end_time - start_time)
    minutes, seconds = divmod(elapsed_seconds, 60)

    print(f"\nTime taken: {minutes} minutes, {seconds} seconds\n")

    check_quotes(collection, tag_schema1, tag_schema2)

    print("Keep tag schema? (y/N): ", end="")
    if input().lower() == "y":
        print("Which schema? (1/2): ", end="")
        schema_num = int(input())
        tag_schema = tag_schema1 if schema_num == 1 else tag_schema2
        with open(TAG_SCHEMA_FILE, "wb") as f:
            pickle.dump(tag_schema, f)

    if not args.apply:
        print("Dry run only. Run again with --apply to update Firestore.")
        return

    print("Write quotes to firestore (PERMANENT—NO UNDO)? (y/N)")
    if input("> ").lower() == "n":
        return
    else:
        return


if __name__ == "__main__":
    main()
