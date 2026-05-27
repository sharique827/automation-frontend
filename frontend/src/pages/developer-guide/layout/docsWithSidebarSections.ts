/** Doc slugs whose section headings appear in the shell sidebar instead of an in-page TOC. */
export const DOCS_WITH_SIDEBAR_SECTIONS = new Set([
    "about-ondc",
    "network-observability",
    "ondc-FAQs",
    "registry-gateway",
]);

export function docUsesSidebarSections(slug: string | undefined): boolean {
    return slug !== undefined && DOCS_WITH_SIDEBAR_SECTIONS.has(slug);
}
