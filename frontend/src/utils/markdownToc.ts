export interface MarkdownTocEntry {
    level: 2 | 3;
    text: string;
    id: string;
}

/** Removes leading ordered-list style prefixes (e.g. "1. ", "1.1 ", "2.3.1 "). */
export function stripHeadingNumberPrefix(text: string): string {
    return text.replace(/^\d+(?:\.\d+)*\.?\s*/, "").trim();
}

export interface NestedMarkdownTocSection {
    section: MarkdownTocEntry;
    subsections: MarkdownTocEntry[];
}

/** Groups h3 headings under their preceding h2 section. */
export function extractNestedMarkdownToc(markdown: string): NestedMarkdownTocSection[] {
    const flat = extractMarkdownToc(markdown).filter(
        (entry) => entry.text.toLowerCase() !== "table of contents"
    );

    const nested: NestedMarkdownTocSection[] = [];
    let current: NestedMarkdownTocSection | null = null;

    for (const entry of flat) {
        if (entry.level === 2) {
            current = { section: entry, subsections: [] };
            nested.push(current);
            continue;
        }
        if (current) {
            current.subsections.push(entry);
        } else {
            nested.push({ section: entry, subsections: [] });
        }
    }

    return nested;
}

export function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

const TABLE_OF_CONTENTS_HEADING = /^##\s+table of contents\s*$/i;

/** Removes the in-document "## Table of Contents" block (through the next h2). */
export function stripMarkdownTableOfContents(markdown: string): string {
    const lines = markdown.split("\n");
    const startIdx = lines.findIndex((line) => TABLE_OF_CONTENTS_HEADING.test(line.trim()));
    if (startIdx === -1) return markdown;

    let endIdx = startIdx + 1;
    while (endIdx < lines.length) {
        const trimmed = lines[endIdx].trim();
        if (/^##\s+/.test(trimmed) && !TABLE_OF_CONTENTS_HEADING.test(trimmed)) break;
        endIdx++;
    }

    const result = [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
    while (
        startIdx < result.length &&
        (result[startIdx].trim() === "" || result[startIdx].trim() === "---")
    ) {
        result.splice(startIdx, 1);
    }

    return result.join("\n");
}

export function extractMarkdownToc(markdown: string): MarkdownTocEntry[] {
    const toc: MarkdownTocEntry[] = [];
    for (const line of markdown.split("\n")) {
        const h2 = /^## (.+)/.exec(line);
        const h3 = /^### (.+)/.exec(line);
        if (h2) toc.push({ level: 2, text: h2[1].trim(), id: slugifyHeading(h2[1].trim()) });
        else if (h3) toc.push({ level: 3, text: h3[1].trim(), id: slugifyHeading(h3[1].trim()) });
    }
    return toc;
}
