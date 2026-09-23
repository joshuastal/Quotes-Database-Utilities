import {deleteQuote, updateQuote} from "../quote-utilities/quote-service.js";
import {initTagPopover} from "./tag-popover.js";
import {showToast} from "./toast.js";

const TABLE_PAGE_SIZE = 10;
const rows = document.getElementById("rows");
const pagination = document.getElementById("pagination");
const quoteSearch = document.getElementById("quote-search");
const sortButton = document.getElementById("quote-sort-button");
const sortPopover = document.getElementById("quote-sort-popover");
const sortFields = document.getElementById("quote-sort-fields");
const sortOptions = document.getElementById("quote-sort-options");
const sortFieldLabel = document.getElementById("quote-sort-field-label");
const sortFieldButtons = [...document.querySelectorAll(".quote-sort-field")];
const sortOptionButtons = [...document.querySelectorAll(".quote-sort-option")];
const sortBackButton = document.getElementById("quote-sort-back");
const clearSortButton = document.getElementById("clear-quote-sort");
const deleteButton = document.getElementById("delete-quote-button");
const tagPopover = initTagPopover();

let quotes = [];
let currentPage = 1;
let isDeleting = false;
let activeSort = null;
let selectedSortField = null;
const selectedQuoteIds = new Set();

const SORT_FIELDS = {
    author: {label: "Author", ascending: "A–Z", descending: "Z–A"},
    quote: {label: "Quote", ascending: "A–Z", descending: "Z–A"},
    createdAt: {label: "Created At", ascending: "Oldest", descending: "Newest"},
};
const textCollator = new Intl.Collator(undefined, {sensitivity: "base"});

function hasDocumentId(quote) {
    return typeof quote.id === "string" && quote.id.trim() !== "";
}

function normalizeSearchText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function getFilteredQuotes() {
    const query = normalizeSearchText(quoteSearch.value);

    if (!query) {
        return quotes;
    }

    return quotes.filter((quote) => normalizeSearchText(quote.author).includes(query)
        || normalizeSearchText(quote.quote).includes(query));
}

function getSortedQuotes(filteredQuotes) {
    if (!activeSort) {
        return filteredQuotes;
    }

    const {field, direction} = activeSort;

    return [...filteredQuotes].sort((first, second) => {
        const firstValue = field === "createdAt"
            ? Date.parse(first[field])
            : String(first[field] ?? "").trim();
        const secondValue = field === "createdAt"
            ? Date.parse(second[field])
            : String(second[field] ?? "").trim();
        const firstMissing = field === "createdAt" ? Number.isNaN(firstValue) : !firstValue;
        const secondMissing = field === "createdAt" ? Number.isNaN(secondValue) : !secondValue;

        if (firstMissing || secondMissing) {
            return firstMissing === secondMissing ? 0 : firstMissing ? 1 : -1;
        }

        const comparison = field === "createdAt"
            ? firstValue - secondValue
            : textCollator.compare(firstValue, secondValue);

        return direction === "ascending" ? comparison : -comparison;
    });
}

function getTotalPages(filteredQuotes = getFilteredQuotes()) {
    return Math.max(1, Math.ceil(filteredQuotes.length / TABLE_PAGE_SIZE));
}

function updateDeleteButton() {
    deleteButton.disabled = isDeleting || selectedQuoteIds.size === 0;
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
            const result = await updateQuote(quote.id, field, normalizedValue);
            const savedValue = result?.value ?? normalizedValue;

            quote[field] = savedValue;
            finish(savedValue);
            renderQuotesTable();
            showToast("success", `${field === "author" ? "Author" : "Quote"} updated.`);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            quote[field] = originalValue;
            finish(originalValue);
            showToast(
                "error",
                `${field === "author" ? "Author" : "Quote"} update failed. Changes were not saved.`
            );
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

function getTagsText(quote) {
    return Array.isArray(quote.tags) ? quote.tags.join(", ") : quote.tags ?? "";
}

function createTagsCell(quote) {
    const cell = document.createElement("td");
    const text = document.createElement("span");

    cell.className = "editable-tags-cell";
    cell.tabIndex = 0;
    cell.title = "Double-click or press Enter to edit tags";
    cell.setAttribute("aria-haspopup", "dialog");
    cell.setAttribute("aria-expanded", "false");
    text.className = "table-cell-text";
    text.textContent = getTagsText(quote);
    cell.appendChild(text);

    function openEditor() {
        if (!hasDocumentId(quote)) {
            window.alert("This quote cannot be edited because it has no Firestore ID.");
            return;
        }

        tagPopover.open(cell, quote);
    }

    cell.addEventListener("dblclick", openEditor);
    cell.addEventListener("keydown", (event) => {
        if (event.target !== cell) {
            return;
        }

        if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            openEditor();
        }
    });

    return cell;
}

function addQuoteToTable(quote) {
    const row = document.createElement("tr");

    row.classList.toggle("is-selected", selectedQuoteIds.has(quote.id));
    row.appendChild(createAuthorCell(quote, row));
    row.appendChild(createEditableCell(quote, "quote"));
    row.appendChild(createTagsCell(quote));

    const createdAtCell = document.createElement("td");
    createdAtCell.textContent = quote.createdAt ?? "";
    row.appendChild(createdAtCell);

    rows.appendChild(row);
}

function addEmptySearchRow() {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    row.className = "empty-search-row";
    cell.colSpan = 4;
    cell.textContent = "No quotes match your search";
    row.appendChild(cell);
    rows.appendChild(row);
}

function renderPagination(filteredQuotes) {
    const totalPages = getTotalPages(filteredQuotes);

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
    tagPopover.close();
    quotes = nextQuotes;
    const filteredQuotes = getSortedQuotes(getFilteredQuotes());

    currentPage = Math.max(1, Math.min(page, getTotalPages(filteredQuotes)));
    rows.replaceChildren();

    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const pageQuotes = filteredQuotes.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    if (filteredQuotes.length === 0 && normalizeSearchText(quoteSearch.value)) {
        addEmptySearchRow();
    } else {
        pageQuotes.forEach((quote) => addQuoteToTable(quote));
    }

    renderPagination(filteredQuotes);
    updateDeleteButton();
}

export function closeTagPopover() {
    tagPopover.close();
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
            showToast("error", `${deletedIds.size} deleted; ${failedCount} could not be deleted.`);
        } else {
            showToast(
                "success",
                `${deletedIds.size} quote${deletedIds.size === 1 ? "" : "s"} deleted.`
            );
        }
    } finally {
        isDeleting = false;
        updateDeleteButton();
    }
}

deleteButton.addEventListener("click", () => {
    void deleteSelectedQuotes();
});

quoteSearch.addEventListener("input", () => {
    currentPage = 1;
    renderQuotesTable();
});

function updateSortControl() {
    const option = activeSort ? SORT_FIELDS[activeSort.field][activeSort.direction] : "";
    const description = activeSort ? `${SORT_FIELDS[activeSort.field].label}, ${option}` : "";

    sortButton.classList.toggle("is-active", Boolean(activeSort));
    sortButton.setAttribute("aria-label", description ? `Sort quotes: ${description}` : "Sort quotes");
    sortButton.title = description ? `Sort quotes: ${description}` : "Sort quotes";
    clearSortButton.hidden = !activeSort;
}

function showSortFields({focus = false} = {}) {
    selectedSortField = null;
    sortOptions.hidden = true;
    sortFields.hidden = false;
    positionSortPopover();

    if (focus) {
        sortFieldButtons[0].focus();
    }
}

function showSortOptions(field) {
    const config = SORT_FIELDS[field];
    const directions = field === "createdAt"
        ? ["descending", "ascending"]
        : ["ascending", "descending"];

    selectedSortField = field;
    sortFieldLabel.textContent = config.label;
    sortOptionButtons.forEach((button, index) => {
        button.dataset.sortDirection = directions[index];
        button.textContent = config[button.dataset.sortDirection];
        button.setAttribute(
            "aria-pressed",
            String(activeSort?.field === field && activeSort.direction === button.dataset.sortDirection)
        );
    });
    sortFields.hidden = true;
    sortOptions.hidden = false;
    positionSortPopover();
    sortOptionButtons[0].focus();
}

function positionSortPopover() {
    if (!sortPopover.matches(":popover-open")) {
        return;
    }

    const margin = 8;
    const gap = 4;
    const buttonRect = sortButton.getBoundingClientRect();
    const popoverRect = sortPopover.getBoundingClientRect();
    const left = Math.min(
        Math.max(buttonRect.right - popoverRect.width, margin),
        window.innerWidth - popoverRect.width - margin
    );
    const top = buttonRect.top - popoverRect.height - gap;

    sortPopover.style.left = `${Math.round(left)}px`;
    sortPopover.style.top = `${Math.round(Math.max(top, margin))}px`;
}

sortFieldButtons.forEach((button) => {
    button.addEventListener("click", () => showSortOptions(button.dataset.sortField));
});

sortOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeSort = {field: selectedSortField, direction: button.dataset.sortDirection};
        currentPage = 1;
        updateSortControl();
        renderQuotesTable();
        sortPopover.hidePopover();
    });
});

sortBackButton.addEventListener("click", () => showSortFields({focus: true}));
clearSortButton.addEventListener("click", () => {
    activeSort = null;
    currentPage = 1;
    updateSortControl();
    renderQuotesTable();
    sortPopover.hidePopover();
});

sortPopover.addEventListener("toggle", (event) => {
    const isOpen = event.newState === "open";

    sortButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
        showSortFields();
        sortFieldButtons[0].focus();
    } else if (sortPopover.contains(document.activeElement)) {
        sortButton.focus({preventScroll: true});
    }
});

window.addEventListener("resize", () => {
    if (sortPopover.matches(":popover-open")) {
        sortPopover.hidePopover();
    }
});

updateSortControl();
updateDeleteButton();
