export const MAX_TAGS = 3;

export const AVAILABLE_TAGS = [
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

export function matchesTagSearch(tag, searchText) {
    const normalizedTag = tag.toLowerCase();
    let tagIndex = 0;

    for (const character of String(searchText ?? "").trim().toLowerCase()) {
        tagIndex = normalizedTag.indexOf(character, tagIndex);

        if (tagIndex === -1) {
            return false;
        }

        tagIndex += 1;
    }

    return true;
}

export function sortTagsForSearch(tags, searchText) {
    const normalizedSearch = String(searchText ?? "").trim().toLowerCase();

    if (!normalizedSearch) {
        return [...tags];
    }

    return [...tags].sort((firstTag, secondTag) => {
        const firstIsSubstring = firstTag.toLowerCase().includes(normalizedSearch);
        const secondIsSubstring = secondTag.toLowerCase().includes(normalizedSearch);

        if (firstIsSubstring !== secondIsSubstring) {
            return firstIsSubstring ? -1 : 1;
        }

        return firstTag.localeCompare(secondTag);
    });
}
