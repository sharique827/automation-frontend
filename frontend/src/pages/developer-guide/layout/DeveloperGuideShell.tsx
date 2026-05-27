import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { FiChevronLeft, FiSearch } from "react-icons/fi";
import DeveloperGuideCollapsedNavBar from "./DeveloperGuideCollapsedNavBar";
import { useDeveloperGuidePageTitle } from "./useDeveloperGuidePageTitle";
import { fetchBuilds } from "@services/developerGuideSpecApi";
import { fetchDocContent, fetchDocList } from "@services/developerDocsApi";
import type { BuildEntry, DocMeta } from "../types";
import { isDomainEnabled } from "../utils";
import Loader from "@components/ui/mini-components/loader";
import { buildNavTree } from "./buildNavTree";
import { DOCS_WITH_SIDEBAR_SECTIONS } from "./docsWithSidebarSections";
import { filterNavTree } from "./filterNavTree";
import DeveloperGuideSidebar from "./DeveloperGuideSidebar";
import { DeveloperGuideShellContext } from "./DeveloperGuideShellContext";

const DeveloperGuideShellMain: FC = () => {
    const pageTitle = useDeveloperGuidePageTitle();

    return (
        <main className="flex-1 min-w-0 overflow-y-auto lg:h-[calc(100vh-84px)]">
            {pageTitle ? <DeveloperGuideCollapsedNavBar title={pageTitle} /> : null}
            <Outlet />
        </main>
    );
};

const DeveloperGuideShell: FC = () => {
    const [builds, setBuilds] = useState<BuildEntry[]>([]);
    const [docs, setDocs] = useState<DocMeta[]>([]);
    const [docMarkdownBySlug, setDocMarkdownBySlug] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [navSidebarOpen, setNavSidebarOpen] = useState(true);

    const toggleNavSidebar = useCallback(() => {
        setNavSidebarOpen((prev) => !prev);
    }, []);

    const openNavSidebar = useCallback(() => {
        setNavSidebarOpen(true);
    }, []);

    const collapseNavSidebar = useCallback(() => {
        setNavSidebarOpen(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [buildsData, docsData] = await Promise.all([
                    fetchBuilds(),
                    fetchDocList().catch(() => [] as DocMeta[]),
                ]);

                const sidebarDocSlugs = docsData
                    .map((d) => d.slug)
                    .filter((slug) => DOCS_WITH_SIDEBAR_SECTIONS.has(slug));

                const sidebarDocContents = await Promise.all(
                    sidebarDocSlugs.map((slug) =>
                        fetchDocContent(slug)
                            .then((content) => [slug, content] as const)
                            .catch(() => null)
                    )
                );

                if (!cancelled) {
                    setBuilds(buildsData);
                    setDocs(docsData);
                    setDocMarkdownBySlug(
                        Object.fromEntries(
                            sidebarDocContents.filter(
                                (entry): entry is readonly [string, string] => entry !== null
                            )
                        )
                    );
                }
            } catch {
                if (!cancelled) {
                    setLoadError("Unable to load navigation. Please try again later.");
                    setBuilds([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const isUseCaseEnabled = (dom: BuildEntry, _usecaseLabel: string) => isDomainEnabled(dom);

    const navTree = useMemo(
        () => buildNavTree(builds, docs, isUseCaseEnabled, docMarkdownBySlug),
        [builds, docs, docMarkdownBySlug]
    );

    const filteredNavTree = useMemo(
        () => filterNavTree(navTree, searchQuery),
        [navTree, searchQuery]
    );

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-84px)] flex items-center justify-center bg-white">
                <Loader />
            </div>
        );
    }

    return (
        <DeveloperGuideShellContext.Provider
            value={{
                inShell: true,
                loadError,
                docs,
                builds,
                navSidebarOpen,
                toggleNavSidebar,
                openNavSidebar,
                collapseNavSidebar,
            }}
        >
            <div className="min-h-[calc(100vh-84px)] bg-white">
                <div className="flex flex-col lg:flex-row">
                    <aside
                        className={`shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60 flex flex-col lg:sticky lg:top-0 lg:h-[calc(100vh-84px)] transition-[width] duration-300 ease-in-out overflow-hidden ${
                            navSidebarOpen
                                ? "w-full lg:w-72 xl:w-80"
                                : "hidden lg:block lg:w-0 lg:border-r-0"
                        }`}
                    >
                        <div className="px-5 pt-6 pb-5 border-b border-slate-200 bg-white/95 backdrop-blur-sm min-w-[18rem] xl:min-w-[20rem]">
                            <div className="flex items-start justify-between gap-2 pt-4">
                                <div className="min-w-0">
                                    <h1 className="text-base font-semibold tracking-tight text-slate-900">
                                        Developer Guide
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        ONDC integration reference
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleNavSidebar}
                                    className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                    aria-label="Collapse navigation"
                                    title="Collapse navigation"
                                >
                                    <FiChevronLeft size={16} />
                                </button>
                            </div>
                            <div className="relative mt-4">
                                <FiSearch
                                    size={14}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="search"
                                    placeholder="Filter navigation..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 placeholder-slate-400 text-slate-800 shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-2 pb-8 min-w-[18rem] xl:min-w-[20rem]">
                            {loadError ? (
                                <p className="px-2 py-4 text-sm text-red-600">{loadError}</p>
                            ) : (
                                <DeveloperGuideSidebar
                                    nodes={filteredNavTree}
                                    searchQuery={searchQuery}
                                />
                            )}
                        </div>
                    </aside>

                    <div className="relative flex flex-1 min-w-0">
                        <DeveloperGuideShellMain />
                    </div>
                </div>
            </div>
        </DeveloperGuideShellContext.Provider>
    );
};

export default DeveloperGuideShell;
