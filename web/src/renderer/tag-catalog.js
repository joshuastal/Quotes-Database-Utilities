import {AVAILABLE_TAGS, normalizeTag} from "../quote-utilities/tags.js";
import {addTag, listTags, removeTag} from "../quote-utilities/quote-service.js";
import {showToast} from "./toast.js";

// AVAILABLE_TAGS is shared by every importer, so replace its contents in place.
function replaceCatalog(tags) {
    AVAILABLE_TAGS.splice(0, AVAILABLE_TAGS.length, ...tags);
}

export async function loadTagCatalog() {
    try {
        replaceCatalog(await listTags());
    } catch (error) {
        console.error("Error loading tag list:", error);
    }
}

export function getCreatableTag(searchText) {
    const name = normalizeTag(searchText);
    return name && !AVAILABLE_TAGS.includes(name) ? name : "";
}

export async function createTag(name) {
    try {
        replaceCatalog(await addTag(name));
        return name;
    } catch (error) {
        console.error("Error adding tag:", error);
        showToast("error", "Tag could not be added.");
        return "";
    }
}

export async function removeCatalogTag(tag) {
    if (!window.confirm(`Remove "${tag}" from the tag list? Quotes that already have it will keep it.`)) {
        return false;
    }

    try {
        replaceCatalog(await removeTag(tag));
        showToast("success", `Removed "${tag}" from the tag list.`);
        return true;
    } catch (error) {
        console.error("Error removing tag:", error);
        showToast("error", "Tag could not be removed.");
        return false;
    }
}

export function createRemoveButton(tag) {
    const button = document.createElement("button");
    const icon = document.createElement("span");

    button.type = "button";
    button.className = "tag-pill-remove tag-option-remove";
    button.dataset.tag = tag;
    button.setAttribute("aria-label", `Remove ${tag} from the tag list`);
    icon.className = "tag-pill-remove-icon";
    icon.textContent = "×";
    button.appendChild(icon);
    return button;
}

export function createCreateRowContent(name) {
    const prefix = document.createElement("span");

    prefix.className = "tag-create-prefix";
    prefix.textContent = "+ Create ";
    return [prefix, document.createTextNode(`"${name}"`)];
}
