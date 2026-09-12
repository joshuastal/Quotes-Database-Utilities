export class Quote {
    static id = "";
    static author = "";
    static quote = "";
    static tags = [];

    constructor(id, author, quote, tags, createdAt, updatedAt) {
        this.id = id
        this.author = author;
        this.quote = quote;
        this.tags = tags;
    }

    get uuid() {
        return this.id;
    }

    get authorName() {
        return this.author;
    }

    get quoteText() {
        return this.quote;
    }

    get quoteTags() {
        return this.tags;
    }
}