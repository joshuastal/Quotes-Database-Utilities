import {
    AVAILABLE_TAGS,
    MAX_TAGS,
    matchesTagSearch,
    sortTagsForSearch
} from "../quote-utilities/tags.js";

export function initTagSelector({onChange = () => {}} = {}) {
    const tagsField = document.querySelector(".tags-field");
    const tagsBox = document.getElementById("tags-box");
    const selectedTagsElement = document.getElementById("selected-tags");
    const tagSearch = document.getElementById("tag-search");
    const tagOptions = document.getElementById("tag-options");
    const tagFilter = document.getElementById("tag-filter");
    const tagOptionList = document.getElementById("tag-option-list");
    const tagsInput = document.getElementById("tags");
    const selectedTags = new Set();
    let suppressTagSearchFocus = false;

    function getTagOptions() {
        return [...tagOptionList.querySelectorAll(".tag-option")];
    }

    function renderTagOptions() {
        const searchText = tagFilter.value.trim().toLowerCase();
        const matchingTags = sortTagsForSearch(AVAILABLE_TAGS.filter((tag) => {
            return selectedTags.size < MAX_TAGS && !selectedTags.has(tag) && matchesTagSearch(tag, searchText);
        }), searchText);

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
        tagsField.classList.toggle("is-invalid", selectedTags.size === 0);
        renderTagOptions();
        onChange(selectedTags.size > 0);
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

    function focusTagOption(option, direction) {
        option.focus({preventScroll: true});

        const listRect = tagOptionList.getBoundingClientRect();
        const optionRect = option.getBoundingClientRect();

        if (optionRect.top < listRect.top) {
            tagOptionList.scrollTop = direction > 0
                ? 0
                : tagOptionList.scrollTop + optionRect.top - listRect.top;
        } else if (optionRect.bottom > listRect.bottom) {
            tagOptionList.scrollTop = direction < 0
                ? tagOptionList.scrollHeight - tagOptionList.clientHeight
                : tagOptionList.scrollTop + optionRect.bottom - listRect.bottom;
        }
    }

    function moveTagOption(event, option, direction) {
        const options = getTagOptions();

        if (options.length === 0) {
            return;
        }

        const currentIndex = options.indexOf(option);
        const nextIndex = currentIndex === -1
            ? direction > 0 ? 0 : options.length - 1
            : (currentIndex + direction + options.length) % options.length;

        event.preventDefault();
        focusTagOption(options[nextIndex], direction);
    }

    tagSearch.addEventListener("focus", () => {
        if (suppressTagSearchFocus) {
            suppressTagSearchFocus = false;
            return;
        }

        if (selectedTags.size >= MAX_TAGS) {
            return;
        }

        showTagOptions();
        tagFilter.focus();
    });

    tagSearch.addEventListener("pointerdown", () => {
        suppressTagSearchFocus = true;
    });

    tagsBox.addEventListener("click", (event) => {
        event.stopPropagation();
        suppressTagSearchFocus = false;

        if (selectedTags.size >= MAX_TAGS) {
            hideTagOptions();
            return;
        }

        if (tagOptions.hidden) {
            showTagOptions();
            tagFilter.focus();
        } else {
            hideTagOptions();
        }
    });

    tagFilter.addEventListener("input", showTagOptions);

    tagFilter.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            moveTagOption(event, null, event.key === "ArrowDown" ? 1 : -1);
        }
    });

    tagOptionList.addEventListener("keydown", (event) => {
        const option = event.target.closest(".tag-option");

        if (!option || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
            return;
        }

        moveTagOption(event, option, event.key === "ArrowDown" ? 1 : -1);
    });

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
        if (!tagOptions.contains(event.target)) {
            hideTagOptions();
        }
    });

    renderSelectedTags();

    function reset() {
        selectedTags.clear();
        tagFilter.value = "";
        tagSearch.value = "";
        renderSelectedTags();
        hideTagOptions();
    }

    return {
        getSelectedTags: () => [...selectedTags],
        hasSelection: () => selectedTags.size > 0,
        reset
    };
}
