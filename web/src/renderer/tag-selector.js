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

    renderSelectedTags();

    return {
        getSelectedTags: () => [...selectedTags],
        hasSelection: () => selectedTags.size > 0
    };
}
