import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {addQuote, getQuotes, sendQuotesToJSON} from "./quote-utilities/quote-service.js";
import {initTagSelector} from "./renderer/tag-selector.js";
import {closeTagPopover, renderQuotesTable, resetQuoteSelection} from "./renderer/quote-table.js";
import {startAuthGate} from "./renderer/auth-gate.js";
import {showToast} from "./renderer/toast.js";

let QUOTES = [];
const quoteForm = document.getElementById("quote-form");
const submitButton = quoteForm.querySelector('input[type="submit"]');
let isSavingQuote = false;

function updateSubmitButton(tagsAreValid = tagSelector.hasSelection()) {
    // returns false if form is invalid, hence take the opposite to set disabled to True
    submitButton.disabled = isSavingQuote || !quoteForm.checkValidity() || !tagsAreValid;
}

const tagSelector = initTagSelector({onChange: updateSubmitButton});

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
    updateSubmitButton();

    try {
        const savedQuote = await addQuote(quote);
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
