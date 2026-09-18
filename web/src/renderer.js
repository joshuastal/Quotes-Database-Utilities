import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {addQuote, getQuotes, sendQuotesToJSON} from "./quote-utilities/quote-service.js";

let QUOTES = [];
const TABLE_PAGE_SIZE = 10;
let currentPage = 1;
const quoteForm = document.getElementById("quote-form");
const submitButton = quoteForm.querySelector('input[type="submit"]');
const MAX_TAGS = 3;

/* BEGIN TAG SELECTOR SETTINGS */
const availableTags = [
    "courage",
    "goodness",
    "illness",
    "diligence",
    "loneliness",
    "virtues",
    "laziness",
    "almsgiving",
    "family",
    "patience",
    "hospitality",
    "idleness",
    "death",
    "temptation",
    "gluttony",
    "parenting",
    "lust",
    "repentance",
    "persecution",
    "doubt",
    "suffering",
    "rest",
    "church_attendance",
    "burnout",
    "compassion",
    "communion",
    "discernment",
    "despair",
    "salvation",
    "forgiveness",
    "contentment",
    "faith",
    "distraction",
    "community",
    "truthfulness",
    "greed",
    "love",
    "dryness",
    "worship",
    "perseverance",
    "responsibility",
    "listening",
    "fear",
    "pride",
    "obedience",
    "self_control",
    "injustice",
    "encouragement",
    "sacrifice",
    "failure",
    "judgement",
    "gossip",
    "fasting",
    "anger",
    "silence",
    "providence",
    "wisdom",
    "peace",
    "shame",
    "stewardship",
    "solitude",
    "work",
    "long-suffering",
    "friendship",
    "service",
    "prayer",
    "grace",
    "gratitude",
    "hope",
    "marriage",
    "trust",
    "theosis",
    "integrity",
    "mercy",
    "children",
    "confession",
    "envy",
    "joy",
    "simplicity",
    "humility",
    "watchfulness",
    "reading"
];

const selectedTags = new Set();
const tagsField = document.querySelector(".tags-field");
const tagsBox = document.getElementById("tags-box");
const selectedTagsElement = document.getElementById("selected-tags");
const tagSearch = document.getElementById("tag-search");
const tagOptions = document.getElementById("tag-options");
const tagFilter = document.getElementById("tag-filter");
const tagOptionList = document.getElementById("tag-option-list");
const tagsInput = document.getElementById("tags");

function fuzzyMatches(tag, searchText) {
    let tagIndex = 0;

    for (const character of searchText) {
        tagIndex = tag.indexOf(character, tagIndex);

        if (tagIndex === -1) {
            return false;
        }

        tagIndex += 1;
    }

    return true;
}

function renderTagOptions() {
    const searchText = tagFilter.value.trim().toLowerCase();
    const matchingTags = availableTags.filter((tag) => {
        return selectedTags.size < MAX_TAGS && !selectedTags.has(tag) && fuzzyMatches(tag, searchText);
    });

    if (searchText) {
        matchingTags.sort((firstTag, secondTag) => {
            const firstIsSubstring = firstTag.includes(searchText);
            const secondIsSubstring = secondTag.includes(searchText);

            if (firstIsSubstring !== secondIsSubstring) {
                return firstIsSubstring ? -1 : 1;
            }

            return firstTag.localeCompare(secondTag);
        });
    }

    tagOptionList.replaceChildren();

    for (const tag of matchingTags) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "tag-option";
        option.dataset.tag = tag;
        option.textContent = tag;
        tagOptionList.appendChild(option);
    }

    if (matchingTags.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "tag-empty";
        emptyState.textContent = "No matching tags";
        tagOptionList.appendChild(emptyState);
    }
}

function updateSubmitButton() {
    const tagsAreValid = selectedTags.size > 0;

    tagsField.classList.toggle("is-invalid", !tagsAreValid);
    submitButton.disabled = !quoteForm.checkValidity() || !tagsAreValid;
}

function renderSelectedTags() {
    selectedTagsElement.replaceChildren();

    for (const tag of selectedTags) {
        const pill = document.createElement("span");
        pill.className = "tag-pill";

        const pillText = document.createElement("span");
        pillText.textContent = tag;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "tag-pill-remove";
        removeButton.setAttribute("aria-label", `Remove ${tag} tag`);

        const removeIcon = document.createElement("span");
        removeIcon.className = "tag-pill-remove-icon";
        removeIcon.textContent = "×";

        removeButton.addEventListener("click", (event) => {
            event.stopPropagation();

            selectedTags.delete(tag);
            renderSelectedTags();
            hideTagOptions();
        });

        removeButton.appendChild(removeIcon);
        pill.append(pillText, removeButton);
        selectedTagsElement.appendChild(pill);
    }

    tagSearch.hidden = selectedTags.size > 0;
    tagsInput.value = [...selectedTags].join(", ");
    renderTagOptions();
    updateSubmitButton();
}

function showTagOptions() {
    if (selectedTags.size >= MAX_TAGS) {
        hideTagOptions();
        return;
    }

    tagSearch.setAttribute("aria-expanded", "true");
    tagOptions.hidden = false;
    renderTagOptions();
}

function hideTagOptions() {
    tagOptions.hidden = true;
    tagSearch.setAttribute("aria-expanded", "false");
}

tagSearch.addEventListener("focus", () => {
    if (selectedTags.size >= MAX_TAGS) {
        return;
    }

    showTagOptions();
    tagFilter.focus();
});

tagsBox.addEventListener("click", () => {
    if (selectedTags.size >= MAX_TAGS) {
        return;
    }

    showTagOptions();
    tagFilter.focus();
});

tagFilter.addEventListener("input", showTagOptions);

tagOptions.addEventListener("click", (event) => {
    event.stopPropagation();

    const option = event.target.closest(".tag-option");

    if (!option || selectedTags.size >= MAX_TAGS) {
        return;
    }

    selectedTags.add(option.dataset.tag);
    tagFilter.value = "";
    renderSelectedTags();

    if (selectedTags.size < MAX_TAGS) {
        showTagOptions();
        tagFilter.focus();
    } else {
        hideTagOptions();
    }
});

document.addEventListener("click", (event) => {
    if (!tagsField.contains(event.target)) {
        hideTagOptions();
    }
});

/* END TAG SELECTOR SETTINGS */

quoteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!quoteForm.checkValidity() || selectedTags.size === 0) {
        quoteForm.reportValidity();
        updateSubmitButton();
        return;
    }

    let author = document.getElementById("author").value;
    if (!author) {
        author = "Unknown";
    }

    const quoteText = document.getElementById("quote").value;
    const tags = [...selectedTags];
    const timestamp = new Date().toISOString();
    const quote = new Quote(author, quoteText, tags, timestamp, timestamp);

    addQuote(quote);
    QUOTES.unshift(quote);
    currentPage = 1;
    renderQuotesTable();
});

quoteForm.addEventListener('input', updateSubmitButton);
renderSelectedTags();
tagSearch.focus();

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
