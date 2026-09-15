export class Quote {
    static author = "";
    static quote = "";
    static tags = [];
    static createdAt = "";
    static updatedAt = "";

    constructor(author, quote, tags, createdAt, updatedAt) {
        this.author = author;
        this.quote = quote;
        this.tags = tags;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    get createdAtDate() {
        return this.createdAt;
    }

    get updatedAtDate() {
        return this.updatedAt;
    }

    tagsToString() {
        return this.tags.join(', ');
    }
}