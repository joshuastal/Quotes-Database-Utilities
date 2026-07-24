import pickle

from google.cloud import firestore
from google.oauth2 import service_account

QUOTES_FILE = "quotes.pk"


class Quote:
    author: str
    quote: str
    tags: list[str]

    def __init__(self, Author: str, Quote: str, tags: list[str] | None = None):
        self.author = Author
        self.quote = Quote
        self.tags = tags if tags is not None else []


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

        try:  # ping firestore
            self.client.collection("Quotes").limit(1).get(  # pyright: ignore
                timeout=5,
                retry=None,
            )
        except Exception as e:
            raise e

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

        with open(QUOTES_FILE, 'wb') as f:
            pickle.dump((self._documents, self._document_references), f)

    def load_collection(self) -> tuple[list[Quote], list[str]]:
        self.fetch_collection()

        with open(QUOTES_FILE, 'rb') as f:
            self._documents, self._document_references = pickle.load(f)
        return self._documents, self._document_references

    def summarize_collection(self):
        for quote in self._documents:
            print(
                f"""
            Author: {quote.author}
            Quote: {quote.quote}
            Tags: {quote.tags}
            """)

        print(self._document_references[0:10])

        print(f"\nFound {len(self._documents)} quotes.")


def main():
    try:
        db = FirestoreClient()
    except Exception as e:
        raise e

    collection, references = db.load_collection()

    # get actual document references for firestore operations because they cannot be stored in the .pk file
    # for some reason
    collection_references = [db.client.document(path) for path in references]
    db.summarize_collection()


if __name__ == "__main__":
    main()
