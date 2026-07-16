import argparse

from google.cloud import firestore
from google.oauth2 import service_account

CREDENTIALS = service_account.Credentials.from_service_account_file(
    "/Users/joshua/Coding Stuff/Quotes App Utilities/test-6aa80-firebase-adminsdk-troo8-435926642e.json"
)

COLLECTION_NAME = "Quotes"
BATCH_SIZE = 500


def initialize_firestore():
    return firestore.Client(
        project=CREDENTIALS.project_id,
        credentials=CREDENTIALS,
    )


def write_batch(db, doc_refs, data_to_write):
    updated_count = 0

    # range(start, stop, step)
    # begin at 0, stop before the total document count
    # increase start by BATCH_SIZE after each iteration of outer loop
    for start in range(0, len(doc_refs), BATCH_SIZE):
        batch = db.batch()

        # Get the next documents after the previous 500
        # start = 0      → [0:500]
        # start = 500    → [500:1000]
        # start = 1000   → [1000:1500]
        batch_references = doc_refs[start : start + BATCH_SIZE]

        for reference in batch_references:
            batch.update(reference, data_to_write)

        batch.commit()
        updated_count += len(batch_references)
        print(f"Updated {updated_count} documents so far.")

    print("Finished")


def get_collection_docs(db: firestore.Client, collection_name: str):
    documents_to_update = []
    document_references = []

    for document in db.collection(COLLECTION_NAME).stream():
        # data is for comparison operations or otherwise
        data = document.to_dict() or {}

        documents_to_update.append(data)
        document_references.append(document.reference)

    print(documents_to_update)
    print(f"Found {len(documents_to_update)} documents to update.")

    return documents_to_update, document_references


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply", action="store_true", help="Actually update Firestore."
    )

    args = parser.parse_args()

    db = initialize_firestore()

    # docs_to_update, ...
    _, document_references = get_collection_docs(db, COLLECTION_NAME)

    if not args.apply:
        print("Dry run only. Run again with --apply to update Firestore.")
        return

    write_batch(db, document_references, {"tags": []})


if __name__ == "__main__":
    main()
