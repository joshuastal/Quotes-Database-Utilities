import argparse
import pickle

from google.cloud import firestore
from google.cloud.firestore_v1.document import DocumentReference
from google.oauth2 import service_account

from Quote import Quote

QUOTES_FILE = "quotes.pk"


class FirestoreClient:
    def __init__(self):
        self.client = firestore.Client(
            project=service_account.Credentials.from_service_account_file(  # pyright: ignore
                "test-6aa80-firebase-adminsdk-troo8-435926642e.json"
            ).project_id,
            credentials=service_account.Credentials.from_service_account_file(  # pyright: ignore
                "test-6aa80-firebase-adminsdk-troo8-435926642e.json"
            ),
        )

        # ping firestore
        self.client.collection("Quotes").limit(1).get(  # pyright: ignore
            timeout=5,
            retry=None,
        )

        self.query_firestore = False
        self._documents: list[Quote] = []
        self._document_references: list[str] = []

    def fetch_collection(self):

        for document in self.client.collection("Quotes").stream():
            data = document.to_dict()

            if data is None:
                raise ValueError("Document data is None")

            # Quote(**data) takes a dictionary and passes the key-value pairs to the Quote constructor as named arguments
            # Author: value
            # Quote: value
            # tags: value
            self._documents.append(Quote(**data))  # pyright: ignore
            self._document_references.append(document.reference.path)  # pyright: ignore

        if len(self._documents) == 0 or len(self._document_references) == 0:
            raise ValueError("No documents found")

        if len(self._documents) != len(self._document_references):
            raise ValueError("Mismatch between documents and document references")

        with open(QUOTES_FILE, "wb") as f:
            pickle.dump((self._documents, self._document_references), f)

    def load_collection(self) -> tuple[list[Quote], list[str]]:
        if self.query_firestore:
            print("Fetching collection from Firestore...")
            self.fetch_collection()
        else:
            print("Loading quotes from file without Firestore...\n")

        with open(QUOTES_FILE, "rb") as f:
            self._documents, self._document_references = pickle.load(f)
        return self._documents, self._document_references

    def write_batch(
        self, doc_refs: list[DocumentReference], data_to_write: dict[str, object]
    ):
        updated_count = 0
        BATCH_SIZE = 500

        # range(start, stop, step)
        # begin at 0, stop before the total document count
        # increase start by BATCH_SIZE after each iteration of outer loop
        for start in range(0, len(doc_refs), BATCH_SIZE):
            batch = self.client.batch()

            # Get the next documents after the previous 500
            # start = 0      → [0:500]
            # start = 500    → [500:1000]
            # start = 1000   → [1000:1500]
            batch_references = doc_refs[start : start + BATCH_SIZE]

            for reference in batch_references:
                batch.update(reference, data_to_write)

            batch.commit()  # pyright: ignore
            updated_count += len(batch_references)
            print(f"Updated {updated_count} documents so far.")

        print("Finished")

    def summarize_collection(self):
        for quote in self._documents:
            print(
                f"""
            Author: {quote.author}
            Quote: {quote.quote}
            Tags: {quote.tags}
            """
            )

        print(self._document_references[0:10])

        print(f"\nFound {len(self._documents)} quotes.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply", action="store_true", help="Actually update Firestore."
    )

    args = parser.parse_args()

    try:
        db = FirestoreClient()
    except Exception as e:
        print("Unable to connect to Firestore...")
        raise e

    print("Should Firestore be queried?\n1: Yes\n2: No")
    choice = input("> ")
    if choice == "2":
        db.query_firestore = False

    collection, references = db.load_collection()

    # get actual document references for firestore operations because they cannot be stored in the .pk file
    # for some reason
    collection_references = [db.client.document(path) for path in references]
    db.summarize_collection()

    print("Write quotes to databse? \n1: Yes\n2: No")
    choice = input("> ")
    if choice == "2":
        return

    if not args.apply:
        print("Dry run only. Run again with --apply to update Firestore.")
        return


if __name__ == "__main__":
    main()
