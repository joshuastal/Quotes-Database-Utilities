import {deleteQuote, updateQuote} from "../quote-utilities/quote-service.js";

const TABLE_PAGE_SIZE = 10;
const rows = document.getElementById("rows");
const pagination = document.getElementById("pagination");
const deleteButton = document.getElementById("delete-quote-button");

let quotes = [];
let currentPage = 1;
let isDeleting = false;
const selectedQuoteIds = new Set();

function hasDocumentId(quote) {
    return typeof quote.id === "string" && quote.id.trim() !== "";
}

function getTotalPages() {
    return Math.max(1, Math.ceil(quotes.length / TABLE_PAGE_SIZE));
}

function updateDeleteButton() {
    const selectedCount = selectedQuoteIds.size;

    deleteButton.textContent = selectedCount
        ? `Delete Selected (${selectedCount})`
        : "Delete Selected";
    deleteButton.disabled = isDeleting || selectedCount === 0;
}

function isSelectionCheckbox(target) {
    return Boolean(target?.closest?.(".quote-selection-checkbox"));
}

function startInlineEdit(cell, quote, field) {
    if (cell.querySelector(".inline-editor")) {
        return;
    }

    if (!hasDocumentId(quote)) {
        window.alert("This quote cannot be edited because it has no Firestore ID.");
        return;
    }

    const display = cell.querySelector(".table-cell-text");

    if (!display) {
        return;
    }

    const originalValue = String(quote[field] ?? "");
    const input = document.createElement("input");
    let settled = false;
    let saving = false;

    input.type = "text";
    input.className = "inline-editor";
    input.value = originalValue;
    input.setAttribute("aria-label", `Edit ${field === "author" ? "author" : "quote"}`);

    if (field === "quote") {
        input.maxLength = 547;
    }

    function finish(value) {
        if (settled) {
            return;
        }

        settled = true;
        display.textContent = value;
        input.replaceWith(display);
        cell.classList.remove("is-editing");
    }

    function cancel() {
        finish(originalValue);
    }

    async function save() {
        if (settled || saving) {
            return;
        }

        const enteredValue = input.value;
        const normalizedValue = field === "author"
            ? (enteredValue.trim() ? enteredValue : "Unknown")
            : enteredValue;

        if (field === "quote" && !enteredValue.trim()) {
            window.alert("Quote cannot be empty.");
            input.focus();
            return;
        }

        if (field === "quote" && enteredValue.length > 547) {
            window.alert("Quote cannot be longer than 547 characters.");
            input.focus();
            return;
        }

        if (normalizedValue === originalValue) {
            finish(originalValue);
            return;
        }

        saving = true;
        input.disabled = true;

        try {
            await updateQuote(quote.id, field, normalizedValue);
            quote[field] = normalizedValue;
            finish(normalizedValue);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            finish(originalValue);
            window.alert("Unable to save the quote change. Please try again.");
        }
    }

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            void save();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
        }
    });

    input.addEventListener("blur", () => {
        void save();
    });

    display.replaceWith(input);
    cell.classList.add("is-editing");
    input.focus();
    input.select();
}

function addInlineEditListeners(cell, quote, field) {
    cell.addEventListener("dblclick", (event) => {
        if (!isSelectionCheckbox(event.target)) {
            startInlineEdit(cell, quote, field);
        }
    });

    cell.addEventListener("keydown", (event) => {
        if (event.target !== cell || isSelectionCheckbox(event.target)) {
            return;
        }

        if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            startInlineEdit(cell, quote, field);
        }
    });
}

function createEditableCell(quote, field) {
    const cell = document.createElement("td");
    const text = document.createElement("span");

    cell.className = "editable-quote-cell";
    cell.tabIndex = 0;
    cell.title = "Double-click or press Enter to edit";
    cell.dataset.field = field;
    text.className = "table-cell-text";
    text.textContent = quote[field] ?? "";
    cell.appendChild(text);
    addInlineEditListeners(cell, quote, field);

    return cell;
}

function createAuthorCell(quote, row) {
    const cell = createEditableCell(quote, "author");
    const text = cell.querySelector(".table-cell-text");
    const wrapper = document.createElement("div");
    const checkbox = document.createElement("input");

    wrapper.className = "author-cell-content";
    checkbox.type = "checkbox";
    checkbox.className = "quote-selection-checkbox";
    checkbox.dataset.quoteId = quote.id ?? "";
    checkbox.checked = selectedQuoteIds.has(quote.id);
    checkbox.setAttribute("aria-label", `Select quote by ${quote.author || "Unknown"}`);

    if (hasDocumentId(quote)) {
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectedQuoteIds.add(quote.id);
            } else {
                selectedQuoteIds.delete(quote.id);
            }

            row.classList.toggle("is-selected", checkbox.checked);
            updateDeleteButton();
        });
    } else {
        checkbox.disabled = true;
    }

    wrapper.append(checkbox, text);
    cell.appendChild(wrapper);
    return cell;
}

function addQuoteToTable(quote) {
    const row = document.createElement("tr");
    const tags = Array.isArray(quote.tags)
        ? quote.tags.join(', ')
        : quote.tags ?? '';

    row.classList.toggle("is-selected", selectedQuoteIds.has(quote.id));
    row.appendChild(createAuthorCell(quote, row));
    row.appendChild(createEditableCell(quote, "quote"));

    for (const value of [tags, quote.createdAt]) {
        const cell = document.createElement("td");
        cell.textContent = value ?? "";
        row.appendChild(cell);
    }

    rows.appendChild(row);
}

function renderPagination() {
    const totalPages = getTotalPages();

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
    currentPage = Math.max(1, Math.min(page, getTotalPages()));
    rows.replaceChildren();

    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const pageQuotes = quotes.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    pageQuotes.forEach((quote) => addQuoteToTable(quote));
    renderPagination();
    updateDeleteButton();
}

export function resetQuoteSelection() {
    selectedQuoteIds.clear();
    rows.querySelectorAll(".quote-selection-checkbox").forEach((checkbox) => {
        checkbox.checked = false;
    });
    rows.querySelectorAll("tr.is-selected").forEach((row) => {
        row.classList.remove("is-selected");
    });
    updateDeleteButton();
}

async function deleteSelectedQuotes() {
    if (isDeleting || selectedQuoteIds.size === 0) {
        return;
    }

    const selectedQuotes = [];

    for (const id of selectedQuoteIds) {
        const quote = quotes.find((candidate) => candidate.id === id);

        if (quote) {
            selectedQuotes.push(quote);
        } else {
            selectedQuoteIds.delete(id);
        }
    }

    updateDeleteButton();

    if (selectedQuotes.length === 0 || !window.confirm(
        `Delete ${selectedQuotes.length} selected quote${selectedQuotes.length === 1 ? "" : "s"}? This cannot be undone.`
    )) {
        return;
    }

    isDeleting = true;
    updateDeleteButton();

    try {
        const results = await Promise.allSettled(
            selectedQuotes.map((quote) => Promise.resolve().then(() => deleteQuote(quote)))
        );
        const deletedIds = new Set();
        let failedCount = 0;

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                deletedIds.add(selectedQuotes[index].id);
            } else {
                failedCount += 1;
            }
        });

        for (let index = quotes.length - 1; index >= 0; index -= 1) {
            if (deletedIds.has(quotes[index].id)) {
                quotes.splice(index, 1);
            }
        }

        deletedIds.forEach((id) => selectedQuoteIds.delete(id));
        renderQuotesTable(quotes, currentPage);

        if (failedCount > 0) {
            window.alert(`${failedCount} selected quote${failedCount === 1 ? "" : "s"} could not be deleted.`);
        }
    } finally {
        isDeleting = false;
        updateDeleteButton();
    }
}

deleteButton.addEventListener("click", () => {
    void deleteSelectedQuotes();
});

updateDeleteButton();
