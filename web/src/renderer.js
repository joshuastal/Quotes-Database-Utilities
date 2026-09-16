import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {addQuote, getQuotes, sendQuotesToJSON} from "./quote-utilities/quote-service.js";

let QUOTES = [];

const quoteForm = document.getElementById('quote-form');
const quoteToAdd = document.getElementById('quote-to-add');
quoteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const author = document.getElementById('author').value;
    const quoteText = document.getElementById('quote').value;
    const tags = document.getElementById('tags').value;

    const quote = new Quote(author, quoteText, tags);

    addQuote(quote);

    quoteToAdd.textContent = `Quote submitted: ${author} ${quoteText} ${tags}`;
});

const exportButton = document.getElementById("export-to-json-button");
exportButton.addEventListener("click", async () => {
    await sendQuotesToJSON(QUOTES);
});

function addQuoteToTable(quote) {
    const row = document.createElement("tr");
    const tags = Array.isArray(quote.tags)
        ? quote.tags.join(', ')
        : quote.tags ?? '';

    const values = [
        quote.author,
        quote.quote,
        tags,
        quote.createdAt
    ];

    for (const value of values) {
        const cell = document.createElement("td");

        cell.textContent = value ?? "";
        row.appendChild(cell);
    }

    document.getElementById("rows").prepend(row);
}

const testButton = document.getElementById("test-quote-button");
testButton.addEventListener("click", () => {
    const testQuote = new Quote("test1", "test2", ["test3"]);
    addQuoteToTable(testQuote);
});


async function loadQuotes() {
    QUOTES = await getQuotes();
    QUOTES.forEach(quote => addQuoteToTable(quote));
}


loadQuotes();