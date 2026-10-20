export function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    element.className = className;
    element.textContent = text;

    if (tag === "button") {
        element.type = "button";
    }

    return element;
}

export function formatSimilarity(similarity) {
    return `${Number((Math.floor(similarity * 1000) / 10).toFixed(1))}% similar`;
}

function snippet(text) {
    const value = String(text ?? "");
    return value.length > 90 ? `${value.slice(0, 90)}…` : value;
}

function getTags(quote) {
    return Array.isArray(quote.tags) ? quote.tags : [];
}

// Opcodes are [tag, i1, i2, j1, j2] from SequenceMatcher(a, b); side "a"
// reads the i-range and side "b" reads the j-range.
function appendDiffText(element, text, opcodes, side) {
    if (!opcodes) {
        element.textContent = text;
        return;
    }

    for (const [tag, i1, i2, j1, j2] of opcodes) {
        const segment = side === "a" ? text.slice(i1, i2) : text.slice(j1, j2);

        if (!segment) {
            continue;
        }

        if (tag === "equal") {
            element.append(document.createTextNode(segment));
        } else {
            const mark = document.createElement("mark");
            mark.className = "dup-diff";
            mark.textContent = segment;
            element.append(mark);
        }
    }
}

export function createDuplicateCard({quote, opcodes, side, label, mergePreview, actionLabel, onAction}) {
    const card = document.createElement("article");
    const author = document.createElement("div");
    const text = document.createElement("p");
    const tags = document.createElement("div");
    const date = document.createElement("div");

    card.className = "dup-card";

    if (label) {
        const labelElement = document.createElement("div");
        labelElement.className = "dup-card-label";
        labelElement.textContent = label;
        card.append(labelElement);
    }

    author.className = "dup-card-author";
    author.textContent = quote.author || "Unknown";
    text.className = "dup-card-text";
    appendDiffText(text, String(quote.quote ?? ""), opcodes, side);
    tags.className = "dup-card-tags";
    tags.append(...getTags(quote).map((tag) => {
        const pill = document.createElement("span");
        pill.className = "dup-tag";
        pill.textContent = tag;
        return pill;
    }));
    date.className = "dup-card-date";
    date.textContent = quote.createdAt ? `Created ${quote.createdAt}` : "";
    card.append(author, text, tags, date);

    if (mergePreview) {
        const preview = document.createElement("div");
        preview.className = "dup-card-merge";
        preview.textContent = `Tags after merge: ${mergePreview.join(", ")}`;
        card.append(preview);
    }

    if (actionLabel) {
        const footer = document.createElement("div");
        const button = document.createElement("button");

        footer.className = "dup-card-footer";
        button.type = "button";
        button.className = "dup-action";
        button.textContent = actionLabel;
        button.addEventListener("click", onAction);
        footer.append(button);
        card.append(footer);
    }

    return card;
}

export function createExemptRow(quotes, onRemove) {
    const row = createElement("div", "dup-exempt-row");
    const text = createElement("div", "dup-exempt-text");
    const remove = createElement("button", "tag-popover-cancel", "Remove exemption");

    for (const quote of quotes) {
        const line = createElement("div", "dup-exempt-quote");
        line.append(createElement("strong", "", quote.author || "Unknown"),
            document.createTextNode(` — ${snippet(quote.quote)}`));
        text.append(line);
    }

    remove.addEventListener("click", onRemove);
    row.append(text, remove);
    return row;
}
