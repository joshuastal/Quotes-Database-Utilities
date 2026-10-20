import {MAX_TAGS} from "../quote-utilities/tags.js";
import {
    addExemption,
    deleteQuote,
    removeExemption,
    updateQuote
} from "../quote-utilities/quote-service.js";
import {
    createDuplicateCard,
    createElement,
    createExemptRow,
    formatSimilarity
} from "./duplicate-card.js";
import {removeQuotesFromTable, renderQuotesTable} from "./quote-table.js";
import {showToast} from "./toast.js";

// Matches DUPLICATE_THRESHOLD in quote-utilities/duplicate-finder.js (main process).
const THRESHOLD_PERCENT = 85;

// Same key format as quote-utilities/exemption-store.js.
function exemptionKey(idA, idB) {
    return [idA, idB].sort().join("|");
}

function getTags(quote) {
    return Array.isArray(quote.tags) ? quote.tags : [];
}

function mergeTags(keptTags, otherTags) {
    const merged = [...keptTags];

    for (const tag of otherTags) {
        if (merged.length < MAX_TAGS && !merged.includes(tag)) {
            merged.push(tag);
        }
    }

    return merged;
}

export function initDuplicateDialog() {
    const dialog = document.createElement("dialog");
    const header = createElement("div", "dup-header");
    const heading = createElement("div", "dup-heading");
    const title = createElement("h2", "dup-title");
    const subtitle = createElement("p", "dup-subtitle");
    const headerActions = createElement("div", "dup-header-actions");
    const nav = createElement("nav", "pagination dup-nav");
    const prevButton = createElement("button", "", "‹");
    const nextButton = createElement("button", "", "›");
    const exemptedButton = createElement("button", "dup-text-button");
    const closeButton = createElement("button", "dup-close", "✕");
    const body = createElement("div", "dup-body");
    const footer = createElement("div", "dup-footer");

    dialog.id = "duplicate-dialog";
    title.id = "duplicate-dialog-title";
    dialog.setAttribute("aria-labelledby", title.id);
    nav.setAttribute("aria-label", "Duplicate pairs");
    prevButton.setAttribute("aria-label", "Previous pair");
    nextButton.setAttribute("aria-label", "Next pair");
    closeButton.setAttribute("aria-label", "Close");
    nav.append(prevButton, nextButton);
    heading.append(title, subtitle);
    headerActions.append(nav, exemptedButton, closeButton);
    header.append(heading, headerActions);
    dialog.append(header, body, footer);
    document.body.appendChild(dialog);

    let state = null;
    let restoreFocusTo = null;

    function getQueue() {
        return state.pairs.filter((pair) => state.quotesById.has(pair.idA)
            && state.quotesById.has(pair.idB)
            && !state.exemptions.has(exemptionKey(pair.idA, pair.idB)));
    }

    // Orphaned exemptions (a quote was deleted later) are ignored, not cleaned up.
    function getExemptedKeys() {
        return [...state.exemptions].filter((key) => key.split("|")
            .every((id) => state.quotesById.has(id)));
    }

    function renderEmpty(heading, detail) {
        const empty = createElement("div", "dup-empty");
        const done = createElement("button", "", "Close");

        done.addEventListener("click", () => dialog.close());
        empty.append(createElement("strong", "", heading), createElement("p", "dup-muted", detail), done);
        body.replaceChildren(empty);
    }

    function renderPair() {
        const queue = getQueue();
        const pair = queue[state.index];
        const threshold = `${THRESHOLD_PERCENT}% similarity threshold`;

        title.textContent = "Possible duplicates";
        nav.hidden = queue.length === 0;
        prevButton.disabled = state.index === 0;
        nextButton.disabled = state.index >= queue.length - 1;

        if (!pair) {
            subtitle.textContent = threshold;

            if (state.resolved === 0 && queue.length === 0) {
                renderEmpty("✓ No duplicates found",
                    `Compared ${state.quoteCount} quotes at ${THRESHOLD_PERCENT}% similarity.`);
            } else {
                renderEmpty("All duplicates reviewed.", queue.length === 0 ? ""
                    : `${queue.length} skipped pair${queue.length === 1 ? "" : "s"} will show again on the next scan.`);
            }

            return;
        }

        const quoteA = state.quotesById.get(pair.idA);
        const quoteB = state.quotesById.get(pair.idB);
        const mergedA = mergeTags(getTags(quoteA), getTags(quoteB));
        const mergedB = mergeTags(getTags(quoteB), getTags(quoteA));
        const canMergeA = mergedA.length !== getTags(quoteA).length;
        const canMergeB = mergedB.length !== getTags(quoteB).length;
        const cards = createElement("div", "dup-cards");

        function card(quote, other, side, merged, canMerge) {
            const mergedTags = state.merge && canMerge ? merged : null;

            return createDuplicateCard({
                quote,
                side,
                opcodes: pair.opcodes,
                mergePreview: mergedTags,
                actionLabel: "Keep this one",
                onAction: () => void keep(quote, other, mergedTags),
            });
        }

        subtitle.textContent = `Pair ${state.index + 1} of ${queue.length} · ${threshold}`;
        cards.append(card(quoteA, quoteB, "a", mergedA, canMergeA), card(quoteB, quoteA, "b", mergedB, canMergeB));
        body.replaceChildren(createElement("span", "dup-similarity", formatSimilarity(pair.similarity)), cards);

        const start = createElement("div", "dup-footer-start");
        const actions = createElement("div", "dup-footer-actions");
        const notDuplicateButton = createElement("button", "tag-popover-cancel", "Not a duplicate");
        const skipButton = createElement("button", "tag-popover-cancel", "Skip");

        if (canMergeA || canMergeB) {
            const label = createElement("label", "dup-merge");
            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.checked = state.merge;
            checkbox.addEventListener("change", () => {
                state.merge = checkbox.checked;
                render(".dup-merge input");
            });
            label.append(checkbox, document.createTextNode("Merge tags into the kept quote"));
            start.append(label);
        }

        notDuplicateButton.addEventListener("click", () => void markNotDuplicate(pair));
        skipButton.addEventListener("click", () => {
            state.index += 1;
            render();
        });
        actions.append(notDuplicateButton, skipButton);
        footer.append(start, actions);
    }

    function renderExempted() {
        const keys = getExemptedKeys();
        const back = createElement("button", "dup-text-button", "← Back");
        const list = createElement("div", "dup-exempt-list");

        title.textContent = "Exempted pairs";
        subtitle.textContent = `${keys.length} marked as not a duplicate`;
        nav.hidden = true;
        back.addEventListener("click", () => {
            state.panel = "pairs";
            render();
        });

        for (const key of keys) {
            const quotes = key.split("|").map((id) => state.quotesById.get(id));

            list.append(createExemptRow(quotes, () => void runAction(async () => {
                try {
                    state.exemptions = new Set(await removeExemption(key));
                    showToast("success", "Exemption removed.");
                } catch (error) {
                    console.error("Error removing exemption:", error);
                    showToast("error", "Exemption could not be removed. Try again.");
                }
            })));
        }

        if (keys.length === 0) {
            list.append(createElement("p", "dup-muted", "No exempted pairs."));
        }

        body.replaceChildren(back, list);
    }

    function renderConfirm() {
        const [best, ...rest] = state.matches;
        const cards = createElement("div", "dup-cards");
        const actions = createElement("div", "dup-footer-actions");
        const cancelButton = createElement("button", "tag-popover-cancel", "Cancel");
        const addButton = createElement("button", "", "Add anyway");

        title.textContent = "This quote may already exist";
        subtitle.textContent = `${THRESHOLD_PERCENT}% similarity threshold`;
        cards.append(
            createDuplicateCard({quote: best.quote, opcodes: best.opcodes, side: "a", label: "Existing"}),
            createDuplicateCard({quote: state.newQuote, opcodes: best.opcodes, side: "b", label: "New quote"})
        );
        body.replaceChildren(createElement("span", "dup-similarity", formatSimilarity(best.similarity)), cards);

        if (rest.length > 0) {
            body.append(createElement("p", "dup-muted", `+${rest.length} more similar`));
        }

        cancelButton.addEventListener("click", () => dialog.close());
        addButton.addEventListener("click", () => {
            state.result = true;
            dialog.close();
        });
        actions.append(cancelButton, addButton);
        footer.append(createElement("div", "dup-footer-start"), actions);
    }

    function render(focusSelector) {
        const isReview = state.mode === "review";

        footer.replaceChildren();
        exemptedButton.disabled = false;
        closeButton.disabled = false;
        nav.hidden = !isReview;
        exemptedButton.hidden = !isReview || state.panel === "exempted";

        if (!isReview) {
            renderConfirm();
        } else {
            exemptedButton.textContent = `Exempted (${getExemptedKeys().length})`;
            (state.panel === "exempted" ? renderExempted : renderPair)();
        }

        footer.hidden = footer.childElementCount === 0;
        ((focusSelector && dialog.querySelector(focusSelector))
            || body.querySelector("button")
            || footer.querySelector("button")
            || closeButton).focus();
    }

    async function runAction(action) {
        if (state.busy) {
            return;
        }

        state.busy = true;
        dialog.setAttribute("aria-busy", "true");
        dialog.querySelectorAll("button, input").forEach((control) => {
            control.disabled = true;
        });

        try {
            await action();
        } finally {
            state.busy = false;
            dialog.setAttribute("aria-busy", "false");
            render();
        }
    }

    async function keep(kept, other, mergedTags) {
        if (state.busy || !window.confirm("Delete the other quote? This cannot be undone.")) {
            return;
        }

        await runAction(async () => {
            if (mergedTags) {
                try {
                    const result = await updateQuote(kept.id, "tags", mergedTags);
                    kept.tags = Array.isArray(result?.value) ? [...result.value] : mergedTags;
                    renderQuotesTable();
                } catch (error) {
                    console.error("Error merging tags:", error);
                    showToast("error", "Tags could not be merged. Nothing was deleted.");
                    return;
                }
            }

            try {
                await deleteQuote(other);
            } catch (error) {
                console.error("Error deleting duplicate:", error);
                showToast("error", "Quote could not be deleted. Try again.");
                return;
            }

            state.quotesById.delete(other.id);
            state.resolved += 1;
            removeQuotesFromTable([other.id]);
            showToast("success", mergedTags ? "Tags merged and duplicate deleted." : "Duplicate deleted.");
        });
    }

    async function markNotDuplicate(pair) {
        await runAction(async () => {
            try {
                state.exemptions = new Set(await addExemption(pair.idA, pair.idB));
                state.resolved += 1;
                showToast("success", "Marked as not a duplicate.");
            } catch (error) {
                console.error("Error saving exemption:", error);
                showToast("error", "Exemption could not be saved. Try again.");
            }
        });
    }

    function move(offset) {
        const nextIndex = state.index + offset;

        if (nextIndex >= 0 && nextIndex < getQueue().length) {
            state.index = nextIndex;
            render();
        }
    }

    prevButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    closeButton.addEventListener("click", () => dialog.close());
    exemptedButton.addEventListener("click", () => {
        state.panel = "exempted";
        render();
    });
    dialog.addEventListener("keydown", (event) => {
        const isPairPanel = state?.mode === "review" && state.panel === "pairs" && !state.busy;

        if (isPairPanel && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
        }
    });
    dialog.addEventListener("cancel", (event) => {
        if (state?.busy) {
            event.preventDefault();
        }
    });
    dialog.addEventListener("close", () => {
        const finished = state;

        state = null;
        body.replaceChildren();
        footer.replaceChildren();
        finished?.resolve?.(finished.result);
        restoreFocusTo?.focus?.();
    });

    function open(nextState) {
        state = {busy: false, ...nextState};
        restoreFocusTo = document.activeElement;
        dialog.showModal();
        render();
    }

    function review(pairs, quotes, exemptions) {
        open({
            mode: "review",
            pairs,
            quotesById: new Map(quotes.map((quote) => [quote.id, quote])),
            quoteCount: quotes.length,
            exemptions: new Set(exemptions),
            index: 0,
            panel: "pairs",
            merge: false,
            resolved: 0,
        });
    }

    function confirmNew(newQuote, matches) {
        return new Promise((resolve) => {
            open({mode: "confirm", newQuote, matches, resolve, result: false});
        });
    }

    return {review, confirmNew};
}
