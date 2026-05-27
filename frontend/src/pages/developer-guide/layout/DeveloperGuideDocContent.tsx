import { FC, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchDocContent } from "@services/developerDocsApi";
import GithubMarkdown from "@components/GithubMarkdown";
import TableOfContents from "@components/TableOfContents";
import { stripMarkdownTableOfContents } from "@utils/markdownToc";
import { docUsesSidebarSections } from "./docsWithSidebarSections";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";

const TOC_TOP = 100;

const DeveloperGuideDocContent: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { hash } = useLocation();
    const { navSidebarOpen } = useDeveloperGuideShell();
    const usesSidebarSections = docUsesSidebarSections(slug);
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        setIsLoading(true);
        setError(null);
        fetchDocContent(slug)
            .then((text) => {
                setContent(text);
                setIsLoading(false);
            })
            .catch(() => {
                setError("Failed to load documentation. Please try again.");
                setIsLoading(false);
            });
    }, [slug]);

    useEffect(() => {
        if (!usesSidebarSections || !hash) return;
        const id = hash.slice(1);
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [hash, usesSidebarSections]);

    const title = useMemo(() => {
        if (!slug) return "";
        return slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }, [slug]);

    const displayContent = useMemo(
        () => (usesSidebarSections ? stripMarkdownTableOfContents(content) : content),
        [content, usesSidebarSections]
    );

    if (isLoading) {
        return (
            <div className="px-6 md:px-10 py-10">
                <div className="max-w-3xl space-y-4 animate-pulse">
                    <div className="h-8 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-5/6" />
                    <div className="h-32 bg-slate-100 rounded w-full mt-4" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-6 md:px-10 py-16 text-center">
                <p className="text-slate-500 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 md:py-8">
            {!navSidebarOpen ? null : (
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                </div>
            )}
            <div className="flex gap-6 items-start">
                {!usesSidebarSections && (
                    <TableOfContents
                        content={content}
                        className="hidden xl:block w-56 flex-shrink-0 self-start sticky overflow-y-auto"
                        style={{
                            top: TOC_TOP,
                            maxHeight: `calc(100vh - ${TOC_TOP}px)`,
                        }}
                    />
                )}
                <div className="flex-1 min-w-0 prose prose-slate max-w-none">
                    <GithubMarkdown content={displayContent} />
                </div>
            </div>
        </div>
    );
};

export default DeveloperGuideDocContent;
