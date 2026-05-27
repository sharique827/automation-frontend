import { ROUTES, getDeveloperGuideDocPath, getDeveloperGuideUseCasePath } from "@constants/routes";
import {
    extractNestedMarkdownToc,
    extractMarkdownToc,
    stripHeadingNumberPrefix,
} from "@utils/markdownToc";
import type { BuildEntry, DocMeta } from "../types";
import { groupBuildsByFamily, getDomainFamilyLabel, getDomainShortLabel } from "../domainGrouping";
import { isDomainEnabled } from "../utils";
import gettingStartedContent from "../landing/getting-started.md?raw";
import type { NavNode } from "./navTypes";
import { DOCS_WITH_SIDEBAR_SECTIONS } from "./docsWithSidebarSections";

function useCaseNavLink(
    node: Extract<NavNode, { type: "link" }>
): Extract<NavNode, { type: "link" }> {
    if (node.disabled) return node;
    return { ...node, showArrow: true, collapseOnNavigate: true };
}

function buildDocNavWithSections(doc: DocMeta, markdown: string): NavNode {
    const basePath = getDeveloperGuideDocPath(doc.slug);
    const sectionNodes: NavNode[] = extractNestedMarkdownToc(markdown).map(
        ({ section, subsections }) => {
            const label = stripHeadingNumberPrefix(section.text);
            const sectionPath = `${basePath}#${section.id}`;

            if (subsections.length === 0) {
                return {
                    id: `doc-${doc.slug}-${section.id}`,
                    label,
                    type: "link" as const,
                    path: sectionPath,
                    searchText: section.text,
                };
            }

            return {
                id: `doc-${doc.slug}-${section.id}`,
                label,
                type: "group" as const,
                path: sectionPath,
                defaultOpen: true,
                searchText: section.text,
                children: subsections.map((subsection) => ({
                    id: `doc-${doc.slug}-${subsection.id}`,
                    label: stripHeadingNumberPrefix(subsection.text),
                    type: "link" as const,
                    path: `${basePath}#${subsection.id}`,
                    searchText: subsection.text,
                })),
            };
        }
    );

    return {
        id: `doc-${doc.slug}`,
        label: doc.label,
        type: "group",
        path: basePath,
        defaultOpen: true,
        searchText: `${doc.label} ${doc.shortDescription} ${doc.slug}`,
        children: sectionNodes,
    };
}

function buildGettingStartedNav(): NavNode {
    const sectionLinks: NavNode[] = extractMarkdownToc(gettingStartedContent)
        .filter((entry) => entry.level === 2)
        .map((entry) => ({
            id: `getting-started-${entry.id}`,
            label: stripHeadingNumberPrefix(entry.text),
            type: "link" as const,
            path: `${ROUTES.DEVELOPER_GUIDE_GETTING_STARTED}#${entry.id}`,
            searchText: entry.text,
        }));

    return {
        id: "getting-started",
        label: "Getting Started",
        type: "group",
        defaultOpen: true,
        children: sectionLinks,
    };
}

export function buildNavTree(
    builds: BuildEntry[],
    docs: DocMeta[],
    isUseCaseEnabled: (dom: BuildEntry, usecaseLabel: string) => boolean,
    docMarkdownBySlug?: Record<string, string>
): NavNode[] {
    const sortedDomains = [...builds].sort((a, b) => {
        const aEnabled = isDomainEnabled(a);
        const bEnabled = isDomainEnabled(b);
        if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
        return a.key.localeCompare(b.key);
    });

    function buildUseCaseNodes(dom: BuildEntry): NavNode[] {
        return (dom.version ?? [])
            .flatMap((ver) =>
                (ver.usecase ?? []).map((label) => ({
                    verKey: ver.key,
                    label,
                }))
            )
            .sort((a, b) => {
                const aEn = isUseCaseEnabled(dom, a.label);
                const bEn = isUseCaseEnabled(dom, b.label);
                if (aEn !== bEn) return aEn ? -1 : 1;
                return a.label.localeCompare(b.label) || a.verKey.localeCompare(b.verKey);
            })
            .map(({ verKey, label }) => {
                const clickable = isUseCaseEnabled(dom, label);
                return useCaseNavLink({
                    id: `usecase-${dom.key}-${verKey}-${label}`,
                    label,
                    suffix: `v${verKey}`,
                    type: "link" as const,
                    path: getDeveloperGuideUseCasePath(dom.key, verKey, label),
                    disabled: !clickable,
                    searchText: `${dom.key} ${label} v${verKey}`,
                });
            });
    }

    function buildDomainGroupNode(dom: BuildEntry): NavNode {
        const enabled = isDomainEnabled(dom);
        return {
            id: `domain-${dom.key}`,
            label: getDomainShortLabel(dom.key),
            type: "group" as const,
            defaultOpen: enabled,
            searchText: dom.key,
            children: buildUseCaseNodes(dom),
        };
    }

    const domainFamilies = groupBuildsByFamily(sortedDomains);
    const domainChildren: NavNode[] = domainFamilies.map((family) => {
        const familyEnabled = family.domains.some(isDomainEnabled);
        const familyTitle = getDomainFamilyLabel(family.familyKey);

        if (family.domains.length === 1) {
            const dom = family.domains[0];
            return {
                id: `family-${family.familyKey}`,
                label: familyTitle,
                type: "group" as const,
                defaultOpen: familyEnabled,
                searchText: `${familyTitle} ${family.familyKey} ${dom.key}`,
                children: buildUseCaseNodes(dom),
            };
        }

        return {
            id: `family-${family.familyKey}`,
            label: familyTitle,
            type: "group" as const,
            defaultOpen: familyEnabled,
            searchText: `${familyTitle} ${family.familyKey} ${family.domains.map((d) => d.key).join(" ")}`,
            children: family.domains.map(buildDomainGroupNode),
        };
    });

    const tree: NavNode[] = [
        {
            id: "overview",
            label: "Introduction",
            type: "link",
            path: ROUTES.DEVELOPER_GUIDE,
            searchText: "introduction overview developer guide",
        },
        buildGettingStartedNav(),
        {
            id: "general-docs",
            label: "General Documentation",
            type: "group",
            path: ROUTES.DEVELOPER_GUIDE_GENERAL,
            defaultOpen: true,
            searchText: "general documentation auth tools guides reference",
            children: [
                {
                    id: "auth-tools",
                    label: "Auth Tools",
                    type: "link",
                    path: ROUTES.DEVELOPER_GUIDE_AUTH_TOOLS,
                    searchText: "auth authorization header blake ed25519",
                },
                ...docs.map((doc) => {
                    const markdown = docMarkdownBySlug?.[doc.slug];
                    if (DOCS_WITH_SIDEBAR_SECTIONS.has(doc.slug) && markdown) {
                        return buildDocNavWithSections(doc, markdown);
                    }
                    return {
                        id: `doc-${doc.slug}`,
                        label: doc.label,
                        type: "link" as const,
                        path: getDeveloperGuideDocPath(doc.slug),
                        searchText: `${doc.label} ${doc.shortDescription} ${doc.slug}`,
                    };
                }),
            ],
        },
    ];

    if (domainChildren.length > 0) {
        tree.push({
            id: "domains",
            label: "API Reference by Domain",
            type: "group",
            path: ROUTES.DEVELOPER_GUIDE_DOMAINS,
            defaultOpen: true,
            searchText: "api reference domain use case flows specifications",
            children: domainChildren,
        });
    }

    return tree;
}
