import {
    AVAILABLE_TAGS,
    MAX_TAGS,
    matchesTagSearch,
    sortTagsForSearch
} from "../quote-utilities/tags.js";
import {updateQuote} from "../quote-utilities/quote-service.js";

const VIEWPORT_MARGIN = 8;
const CELL_GAP = 4;

function areTagsEqual(firstTags, secondTags) {
    return firstTags.length === secondTags.length
        && firstTags.every((tag, index) => tag === secondTags[index]);
}

function areValidTags(tags) {
    return tags.length >= 1
        && tags.length <= MAX_TAGS
        && new Set(tags).size === tags.length
        && tags.every((tag) => AVAILABLE_TAGS.includes(tag));
}

function getTagsText(quote) {
    return Array.isArray(quote.tags) ? quote.tags.join(", ") : quote.tags ?? "";
}

export function initTagPopover() {
    const popover = document.createElement("div");
    const heading = document.createElement("h2");
    const count = document.createElement("span");
    const search = document.createElement("input");
    const optionList = document.createElement("div");
    const message = document.createElement("p");
    const actions = document.createElement("div");
    const cancelButton = document.createElement("button");
    const saveButton = document.createElement("button");

    popover.id = "tag-popover";
    popover.setAttribute("popover", "auto");
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-labelledby", "tag-popover-heading");
    popover.setAttribute("aria-describedby", "tag-popover-message");

    heading.id = "tag-popover-heading";
    heading.className = "tag-popover-heading";
    heading.textContent = "Edit tags";

    count.className = "tag-popover-count";
    count.setAttribute("aria-live", "polite");

    search.type = "search";
    search.id = "tag-popover-search";
    search.className = "tag-popover-search";
    search.placeholder = "Search tags...";
    search.setAttribute("aria-label", "Search tags");
    search.autocomplete = "off";

    optionList.id = "tag-popover-option-list";
    optionList.className = "tag-popover-option-list";
    optionList.setAttribute("role", "group");
    optionList.setAttribute("aria-label", "Available tags");

    message.id = "tag-popover-message";
    message.className = "tag-popover-message";
    message.setAttribute("role", "alert");
    message.hidden = true;

    actions.className = "tag-popover-actions";
    cancelButton.type = "button";
    cancelButton.className = "tag-popover-cancel";
    cancelButton.textContent = "Cancel";
    saveButton.type = "button";
    saveButton.className = "tag-popover-save";
    saveButton.textContent = "Save";
    actions.append(cancelButton, saveButton);

    popover.append(heading, count, search, optionList, message, actions);
    document.body.appendChild(popover);

    let active = null;

    function renderOptions() {
        if (!active) {
            return;
        }

        const searchText = search.value;
        const selectedTags = active.stagedTags;
        const focusedTag = document.activeElement?.matches?.(".tag-popover-option input")
            ? document.activeElement.dataset.tag
            : "";
        const uncheckedTags = sortTagsForSearch(
            AVAILABLE_TAGS.filter((tag) => !selectedTags.includes(tag) && matchesTagSearch(tag, searchText)),
            searchText
        );

        optionList.replaceChildren();

        for (const tag of [...selectedTags, ...uncheckedTags]) {
            const option = document.createElement("label");
            const checkbox = document.createElement("input");
            const label = document.createElement("span");
            const isChecked = selectedTags.includes(tag);

            option.className = "tag-popover-option";
            checkbox.type = "checkbox";
            checkbox.dataset.tag = tag;
            checkbox.checked = isChecked;
            checkbox.disabled = active.saving || (!isChecked && selectedTags.length >= MAX_TAGS);
            option.classList.toggle("is-disabled", checkbox.disabled && !isChecked);
            label.textContent = tag;

            checkbox.addEventListener("change", () => {
                if (!active || active.saving) {
                    return;
                }

                if (checkbox.checked && active.stagedTags.length < MAX_TAGS) {
                    active.stagedTags.push(tag);
                } else if (!checkbox.checked) {
                    active.stagedTags = active.stagedTags.filter((selectedTag) => selectedTag !== tag);
                }

                active.error = "";
                render();
            });

            option.append(checkbox, label);
            optionList.appendChild(option);
        }

        if (focusedTag) {
            [...optionList.querySelectorAll("input")]
                .find((checkbox) => checkbox.dataset.tag === focusedTag)
                ?.focus();
        }

        if (uncheckedTags.length === 0 && searchText.trim()) {
            const emptyState = document.createElement("div");
            emptyState.className = "tag-popover-empty";
            emptyState.textContent = "No matching tags";
            optionList.appendChild(emptyState);
        }
    }

    function render() {
        if (!active) {
            return;
        }

        const hasValidSelection = areValidTags(active.stagedTags);
        const hasChanges = !areTagsEqual(active.stagedTags, active.originalTags);

        count.textContent = `${active.stagedTags.length} of ${MAX_TAGS} selected`;
        saveButton.disabled = active.saving || !hasValidSelection || !hasChanges;
        cancelButton.disabled = active.saving;
        search.disabled = active.saving;
        popover.setAttribute("aria-busy", String(active.saving));

        if (active.error) {
            message.textContent = active.error;
            message.hidden = false;
        } else if (active.stagedTags.length === 0) {
            message.textContent = "Select at least one tag to save.";
            message.hidden = false;
        } else {
            message.hidden = true;
        }

        renderOptions();
    }

    let ignoreNextClose = false;
    let viewportListenersAttached = false;

    function handleViewportScroll(event) {
        if (!popover.contains(event.target)) {
            close();
        }
    }

    function positionPopover() {
        if (!active || !popover.matches(":popover-open") || !active.cell.isConnected) {
            return;
        }

        const cellRect = active.cell.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const maxLeft = Math.max(
            VIEWPORT_MARGIN,
            window.innerWidth - popoverRect.width - VIEWPORT_MARGIN
        );
        const maxTop = Math.max(
            VIEWPORT_MARGIN,
            window.innerHeight - popoverRect.height - VIEWPORT_MARGIN
        );
        let left = Math.min(Math.max(cellRect.left, VIEWPORT_MARGIN), maxLeft);
        let top = cellRect.bottom + CELL_GAP;

        if (top + popoverRect.height > window.innerHeight - VIEWPORT_MARGIN) {
            top = cellRect.top - popoverRect.height - CELL_GAP;
        }

        left = Math.round(left);
        top = Math.round(Math.min(Math.max(top, VIEWPORT_MARGIN), maxTop));
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }

    function stopViewportListeners() {
        if (!viewportListenersAttached) {
            return;
        }

        window.removeEventListener("resize", close);
        document.removeEventListener("scroll", handleViewportScroll, true);
        viewportListenersAttached = false;
    }

    function startViewportListeners() {
        if (viewportListenersAttached) {
            return;
        }

        window.addEventListener("resize", close);
        document.addEventListener("scroll", handleViewportScroll, true);
        viewportListenersAttached = true;
    }

    function close({restoreFocus = false} = {}) {
        const cell = active?.cell;

        active = null;
        stopViewportListeners();

        if (cell?.isConnected) {
            cell.setAttribute("aria-expanded", "false");
        }

        if (popover.matches(":popover-open")) {
            ignoreNextClose = true;
            popover.hidePopover();
        }

        if (restoreFocus && cell?.isConnected) {
            cell.focus();
        }
    }

    async function save() {
        const session = active;

        if (!session || session.saving || !areValidTags(session.stagedTags)
            || areTagsEqual(session.stagedTags, session.originalTags)) {
            return;
        }

        const tags = [...session.stagedTags];
        session.saving = true;
        session.error = "";
        render();

        try {
            const result = await updateQuote(session.quote.id, "tags", tags);
            const savedTags = Array.isArray(result?.value) ? [...result.value] : tags;

            session.quote.tags = savedTags;

            if (session.cell.isConnected) {
                session.cell.querySelector(".table-cell-text")?.replaceChildren(
                    document.createTextNode(getTagsText(session.quote))
                );
            }

            if (active === session) {
                session.saving = false;
                close({restoreFocus: true});
            }
        } catch (error) {
            console.error("Error updating tags:", error);

            if (active === session) {
                session.saving = false;
                session.error = "Unable to save tags. Please try again.";
                render();
            }
        }
    }

    search.addEventListener("input", renderOptions);
    cancelButton.addEventListener("click", () => close({restoreFocus: true}));
    saveButton.addEventListener("click", () => void save());
    popover.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close({restoreFocus: true});
        }
    });
    popover.addEventListener("toggle", (event) => {
        if (event.newState !== "closed") {
            return;
        }

        if (ignoreNextClose) {
            ignoreNextClose = false;
            return;
        }

        if (active?.saving) {
            requestAnimationFrame(() => {
                if (!active || popover.matches(":popover-open")) {
                    return;
                }

                popover.showPopover();
                positionPopover();
                search.focus();
            });
            return;
        }

        const cell = active?.cell;
        active = null;
        stopViewportListeners();

        if (cell?.isConnected) {
            cell.setAttribute("aria-expanded", "false");
        }
    });

    function open(cell, quote) {
        if (!cell || !quote || active?.cell === cell) {
            return;
        }

        close();
        active = {
            cell,
            quote,
            originalTags: Array.isArray(quote.tags) ? [...quote.tags] : [],
            stagedTags: Array.isArray(quote.tags) ? [...quote.tags] : [],
            error: "",
            saving: false
        };
        cell.setAttribute("aria-expanded", "true");
        search.value = "";
        render();
        popover.showPopover();
        positionPopover();
        startViewportListeners();
        search.focus();
        requestAnimationFrame(positionPopover);
    }

    return {open, close};
}
