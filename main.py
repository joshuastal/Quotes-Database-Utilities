import argparse
import os
import pickle

os.environ.setdefault("GRPC_VERBOSITY", "ERROR")
import time

import firestore_utils as util
from tag_generator import tags_generator as tgs_gen
from tag_generator.output_colors import DiffColors

TAG_SCHEMA_FILE = "tag_schema.pk"


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
    tag_schema1, tag_schema2 = tg.generate_tags_multithreaded(tg.client, collection, 2)

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
        print(DiffColors.FAIL + "Tag schemas are different" + DiffColors.ENDC)
        tg.print_differences(tag_schema1, tag_schema2)

    print(f"Time taken: {end_time - start_time:.0f} seconds")

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
