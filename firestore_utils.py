from google.cloud import firestore
from google.oauth2 import service_account


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
        self._db = firestore.Client(
            project=service_account.Credentials.from_service_account_file(  # pyright: ignore
                "Quotes_App_Utilities/test-6aa80-firebase-adminsdk-troo8-435926642e.json"
            ).project_id,
            credentials=service_account.Credentials.from_service_account_file(  # pyright: ignore
                "Quotes_App_Utilities/test-6aa80-firebase-adminsdk-troo8-435926642e.json"
            ),
        )

        self._documents: list[Quote] = []
        self._document_references: list[str] = []

    def get_collection(self) -> tuple[list[Quote], list[str]]:

        for document in self._db.collection("Quotes").stream():
            data = document.to_dict()

            # Quote(**data) takes a dictionary and passes the key-value pairs to the Quote constructor as named arguments
            # Author: value
            # Quote: value
            # tags: value
            self._documents.append(Quote(**data))  # pyright: ignore
            self._document_references.append(document.reference)  # pyright: ignore

            if data is None:
                raise ValueError("Document data is None")

        if len(self._documents) == 0 or len(self._document_references) == 0:
            raise ValueError("No documents found")

        if len(self._documents) != len(self._document_references):
            raise ValueError("Mismatch between documents and document references")

        return self._documents, self._document_references

    def summarize_collection(
        self, collection: list[Quote], collection_references: list[str]
    ):
        for quote in collection:
            print(f"""
            Author: {quote.author}
            Quote: {quote.quote}
            Tags: {quote.tags}
            """)

        print(collection_references[0:10])

        print(f"\nFound {len(collection)} quotes.")


def main():
    db = FirestoreClient()
    collection, collection_references = db.get_collection()
    db.summarize_collection(collection, collection_references)


if __name__ == "__main__":
    main()
