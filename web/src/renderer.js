import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {addQuote, getQuotes, sendQuotesToJSON} from "./quote-utilities/quote-service.js";

let QUOTES = [];
const TABLE_PAGE_SIZE = 10;
let currentPage = 1;

const quoteForm = document.getElementById('quote-form');
quoteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let author = document.getElementById('author').value;
    if (!author) {
        author = "Unknown";
    }
    const quoteText = document.getElementById('quote').value;
    const tags = document.getElementById('tags').value;

    let timestamp = new Date().toISOString();
    const quote = new Quote(author, quoteText, tags, timestamp, timestamp);

    addQuote(quote);
    QUOTES.unshift(quote);
    currentPage = 1;
    renderQuotesTable();
});

const submitButton = quoteForm.querySelector('input[type="submit"]');

function updateSubmitButton() {
    // Checks the entire form
    // Returns false when validity is not met,
    // Therefore, set disabled to true if not valid
    submitButton.disabled = !quoteForm.checkValidity();
}

quoteForm.addEventListener('input', updateSubmitButton);
updateSubmitButton();

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

    document.getElementById("rows").appendChild(row);
}

function renderPagination() {
    const pagination = document.getElementById("pagination");
    const totalPages = Math.ceil(QUOTES.length / TABLE_PAGE_SIZE);

    pagination.replaceChildren();

    if (totalPages <= 1) {
        return;
    }

    function addButton(label, page, disabled = false, current = false) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.disabled = disabled;

        if (current) {
            button.setAttribute("aria-current", "page");
        }

        button.addEventListener("click", () => {
            currentPage = page;
            renderQuotesTable();
        });

        pagination.appendChild(button);
    }

    addButton("‹", currentPage - 1, currentPage === 1);

    const pages = [];

    for (let page = 1; page <= totalPages; page++) {
        const nearBeginning = page <= 3;
        const nearEnd = page > totalPages - 2;
        const nearCurrent = Math.abs(page - currentPage) <= 1;

        if (nearBeginning || nearEnd || nearCurrent) {
            pages.push(page);
        } else if (pages[pages.length - 1] !== "…") {
            pages.push("…");
        }
    }

    pages.forEach((page) => {
        if (page === "…") {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "…";
            pagination.appendChild(ellipsis);
        } else {
            addButton(page, page, false, page === currentPage);
        }
    });

    addButton("›", currentPage + 1, currentPage === totalPages);
}

function renderQuotesTable() {
    const rows = document.getElementById("rows");
    rows.replaceChildren();

    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const pageQuotes = QUOTES.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    pageQuotes.forEach(quote => addQuoteToTable(quote));
    renderPagination();
}

async function loadQuotes() {
    try {
        QUOTES = await getQuotes();
        currentPage = 1;
        console.log(QUOTES);
        renderQuotesTable();
    } finally {
        document.getElementById("loading-row")?.remove();
        document.getElementById("quotes-table").removeAttribute("aria-busy");
    }

}


loadQuotes();