import { FC } from "react";
import GithubMarkdown from "@components/GithubMarkdown";
import TableOfContents from "@components/TableOfContents";

// Offset: fixed site header (84px) + some breathing room
const TOC_TOP = 100;

interface MdFileRenderProps {
    title: string;
    description?: string;
    mdData: string;
    showTableOfContents?: boolean;
    /** Hide the in-card title block (e.g. when the shell toolbar already shows the title). */
    hideTitleBlock?: boolean;
}

const MdFileRender: FC<MdFileRenderProps> = ({
    title,
    description,
    mdData,
    showTableOfContents = true,
    hideTitleBlock = false,
}) => {
    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {!hideTitleBlock && (
                <div className="px-6 md:px-8 pt-6 pb-4 border-b border-slate-100 bg-slate-50">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                    {description && <p className="mt-2 text-slate-600 text-sm">{description}</p>}
                </div>
            )}
            <div className="flex gap-0">
                {showTableOfContents && (
                    <div className="hidden lg:block w-56 flex-shrink-0 border-r border-slate-100 px-3 py-5">
                        <TableOfContents
                            content={mdData}
                            className="sticky"
                            style={{ top: TOC_TOP }}
                        />
                    </div>
                )}
                {/* Content */}
                <div className="flex-1 min-w-0 px-6 md:px-8 py-6">
                    <GithubMarkdown content={mdData} />
                </div>
            </div>
        </section>
    );
};

export default MdFileRender;
