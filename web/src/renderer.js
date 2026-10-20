import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {
    addQuote,
    findSimilarQuotes,
    getDuplicates,
    getQuotes,
    listExemptions,
    sendQuotesToJSON
} from "./quote-utilities/quote-service.js";
import {initTagSelector} from "./renderer/tag-selector.js";
import {loadTagCatalog} from "./renderer/tag-catalog.js";
import {closeTagPopover, renderQuotesTable, resetQuoteSelection} from "./renderer/quote-table.js";
import {startAuthGate} from "./renderer/auth-gate.js";
import {showToast} from "./renderer/toast.js";
import {initDuplicateDialog} from "./renderer/duplicate-dialog.js";

let QUOTES = [];
const quoteForm = document.getElementById("quote-form");
const submitButton = quoteForm.querySelector('input[type="submit"]');
let isSavingQuote = false;

function updateSubmitButton(tagsAreValid = tagSelector.hasSelection()) {
    // returns false if form is invalid, hence take the opposite to set disabled to True
    submitButton.disabled = isSavingQuote || !quoteForm.checkValidity() || !tagsAreValid;
}

const tagSelector = initTagSelector({onChange: updateSubmitButton});
void loadTagCatalog();
const duplicateDialog = initDuplicateDialog();

function getQuotesWithIds() {
    return QUOTES.filter((quote) => typeof quote.id === "string" && quote.id);
}

async function confirmIfDuplicate(quote) {
    let matches = [];

    try {
        matches = await findSimilarQuotes(quote.quote, getQuotesWithIds());
    } catch (error) {
        console.error("Error checking for similar quotes:", error);
    }

    const quotesById = new Map(QUOTES.map((existing) => [existing.id, existing]));
    const liveMatches = matches
        .map((match) => ({...match, quote: quotesById.get(match.id)}))
        .filter((match) => match.quote);

    return liveMatches.length === 0 || duplicateDialog.confirmNew(quote, liveMatches);
}

quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSavingQuote) {
        return;
    }

    if (!quoteForm.checkValidity() || !tagSelector.hasSelection()) {
        quoteForm.reportValidity();
        updateSubmitButton();
        return;
    }

    let author = document.getElementById("author").value;
    if (!author) {
        author = "Unknown";
    }

    const quoteText = document.getElementById("quote").value;
    const tags = tagSelector.getSelectedTags();
    const timestamp = new Date().toISOString();
    const quote = new Quote("", author, quoteText, tags, timestamp, timestamp);

    isSavingQuote = true;

    try {
        if (!(await confirmIfDuplicate(quote))) {
            return;
        }

        updateSubmitButton();
        const savedQuote = await addQuote(quote);
        quoteForm.reset();
        tagSelector.reset();
        QUOTES.unshift(savedQuote);
        renderQuotesTable(QUOTES, 1);
        showToast("success", "Quote added.");
    } catch (error) {
        console.error("Error adding quote:", error);
        showToast("error", "Quote could not be added. Try again.");
    } finally {
        isSavingQuote = false;
        updateSubmitButton();
    }
});

// watch for the input event and call updateSubmitButton() on each input event
quoteForm.addEventListener("input", () => updateSubmitButton());

const exportButton = document.getElementById("export-to-json-button");
exportButton.addEventListener("click", async () => {
    await sendQuotesToJSON(QUOTES);
});

const findDuplicatesButton = document.getElementById("find-duplicates-button");
const findDuplicatesLabel = findDuplicatesButton.textContent.trim();
findDuplicatesButton.addEventListener("click", async () => {
    const spinner = document.createElement("span");
    spinner.className = "loading-spinner";
    spinner.setAttribute("aria-hidden", "true");
    findDuplicatesButton.disabled = true;
    findDuplicatesButton.replaceChildren(spinner, "Scanning…");

    let scan;
    try {
        const quotes = getQuotesWithIds();
        const [pairs, exemptions] = await Promise.all([getDuplicates(quotes), listExemptions()]);
        scan = {pairs, quotes, exemptions};
    } catch (error) {
        console.error("Error finding duplicates:", error);
        showToast("error", "Duplicate scan failed. Try again.");
    }

    findDuplicatesButton.textContent = findDuplicatesLabel;
    findDuplicatesButton.disabled = false;
    findDuplicatesButton.focus();

    if (scan) {
        duplicateDialog.review(scan.pairs, scan.quotes, scan.exemptions);
    }
});

function finishQuoteLoading() {
    document.getElementById("loading-row")?.remove();
    document.getElementById("quotes-table").removeAttribute("aria-busy");
}

function renderLoadedQuotes(loadedQuotes) {
    closeTagPopover();
    QUOTES = loadedQuotes;
    resetQuoteSelection();
    renderQuotesTable(QUOTES, 1);
    finishQuoteLoading();
    findDuplicatesButton.disabled = false;
}

async function loadQuotes() {
    closeTagPopover();

    try {
        renderLoadedQuotes(await getQuotes());
    } catch (error) {
        console.error("Error loading quotes:", error);
    } finally {
        finishQuoteLoading();
    }

}

const refreshQuotes = document.getElementById("refresh-quotes");
refreshQuotes.addEventListener("click", loadQuotes);

startAuthGate({onAuthorized: renderLoadedQuotes});
