import './index.css';
import {Quote} from "./quote-utilities/quote.js";
import {addQuote, getQuotes, sendQuotesToJSON} from "./quote-utilities/quote-service.js";
import {initTagSelector} from "./renderer/tag-selector.js";
import {renderQuotesTable} from "./renderer/quote-table.js";

let QUOTES = [];
const quoteForm = document.getElementById("quote-form");
const submitButton = quoteForm.querySelector('input[type="submit"]');

function updateSubmitButton(tagsAreValid = tagSelector.hasSelection()) {
    // returns false if form is invalid, hence take the opposite to set disabled to True
    submitButton.disabled = !quoteForm.checkValidity() || !tagsAreValid;
}

const tagSelector = initTagSelector({onChange: updateSubmitButton});

quoteForm.addEventListener("submit", (event) => {
    event.preventDefault();

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

    addQuote(quote).catch(error => console.error("Error adding quote:", error));
    QUOTES.unshift(quote);
    renderQuotesTable(QUOTES, 1);
});

// watch for the input event and call updateSubmitButton() on each input event
quoteForm.addEventListener("input", () => updateSubmitButton());

const exportButton = document.getElementById("export-to-json-button");
exportButton.addEventListener("click", async () => {
    await sendQuotesToJSON(QUOTES);
});


async function loadQuotes() {
    try {
        QUOTES = await getQuotes();
        console.log(QUOTES);
        renderQuotesTable(QUOTES, 1);
    } finally {
        document.getElementById("loading-row")?.remove();
        document.getElementById("quotes-table").removeAttribute("aria-busy");
    }

}

const refreshQuotes = document.getElementById("refresh-quotes");
refreshQuotes.addEventListener("click", loadQuotes);

loadQuotes();
