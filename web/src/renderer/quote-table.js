const TABLE_PAGE_SIZE = 10;
const rows = document.getElementById("rows");
const pagination = document.getElementById("pagination");

let quotes = [];
let currentPage = 1;

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

    rows.appendChild(row);
}

function renderPagination() {
    const totalPages = Math.ceil(quotes.length / TABLE_PAGE_SIZE);

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

export function renderQuotesTable(nextQuotes = quotes, page = currentPage) {
    quotes = nextQuotes;
    currentPage = page;
    rows.replaceChildren();

    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const pageQuotes = quotes.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    pageQuotes.forEach((quote) => addQuoteToTable(quote));
    renderPagination();
}
