import { matchPath, useLocation } from "react-router-dom";
import { ROUTES } from "@constants/routes";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";

function formatDocSlug(slug: string): string {
    return slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Page title for the collapsed-nav toolbar (empty on use-case flow pages — they use breadcrumbs). */
export function useDeveloperGuidePageTitle(): string {
    const { docs } = useDeveloperGuideShell();
    const { pathname } = useLocation();

    if (matchPath({ path: "/developer-guide/:domain/:version/:useCase", end: true }, pathname)) {
        return "";
    }

    const docMatch = matchPath({ path: "/developer-guide/docs/:slug", end: true }, pathname);
    if (docMatch?.params.slug) {
        const slug = docMatch.params.slug;
        const doc = docs.find((d) => d.slug === slug);
        return doc?.label ?? formatDocSlug(slug);
    }

    const pathTitles: { path: string; title: string }[] = [
        { path: ROUTES.DEVELOPER_GUIDE_GETTING_STARTED, title: "Getting Started" },
        { path: ROUTES.DEVELOPER_GUIDE_GENERAL, title: "General Documentation" },
        { path: ROUTES.DEVELOPER_GUIDE_DOMAINS, title: "API Reference by Domain" },
        { path: ROUTES.DEVELOPER_GUIDE_AUTH_TOOLS, title: "Auth Tools" },
        { path: ROUTES.DEVELOPER_GUIDE, title: "Introduction" },
    ];

    for (const { path, title } of pathTitles) {
        if (matchPath({ path, end: true }, pathname)) return title;
    }

    return "Developer Guide";
}
