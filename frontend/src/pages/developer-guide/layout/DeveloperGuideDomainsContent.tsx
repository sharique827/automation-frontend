import { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCode, FiLayers, FiSearch } from "react-icons/fi";
import { getDeveloperGuideUseCasePath } from "@constants/routes";
import type { BuildEntry } from "../types";
import { groupBuildsByFamily } from "../domainGrouping";
import { isDomainEnabled } from "../utils";
import { useDeveloperGuideShell } from "./DeveloperGuideShellContext";
import DomainCardsSection from "../landing/DomainCardsSection";

const DeveloperGuideDomainsContent: FC = () => {
    const navigate = useNavigate();
    const { builds, loadError, collapseNavSidebar } = useDeveloperGuideShell();
    const [domainSearch, setDomainSearch] = useState("");

    const isUseCaseEnabled = (dom: BuildEntry, _usecaseLabel: string) => isDomainEnabled(dom);

    const handleUseCaseClick = (dom: BuildEntry, versionKey: string, usecaseLabel: string) => {
        if (!isUseCaseEnabled(dom, usecaseLabel)) return;
        collapseNavSidebar();
        navigate(getDeveloperGuideUseCasePath(dom.key, versionKey, usecaseLabel));
    };

    const domainFamilies = useMemo(() => groupBuildsByFamily(builds), [builds]);

    const filteredFamilies = useMemo(() => {
        const q = domainSearch.trim().toLowerCase();
        if (!q) return domainFamilies;

        return domainFamilies
            .map((family) => ({
                ...family,
                domains: family.domains.filter(
                    (dom) =>
                        family.label.toLowerCase().includes(q) ||
                        family.familyKey.toLowerCase().includes(q) ||
                        dom.key.toLowerCase().includes(q)
                ),
            }))
            .filter((family) => family.domains.length > 0);
    }, [domainFamilies, domainSearch]);

    return (
        <div className="min-h-full">
            <header className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50">
                <div className="px-6 md:px-10 py-10 md:py-12 max-w-3xl mt-[18px]">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 border border-sky-200">
                        <FiCode size={11} aria-hidden />
                        API reference
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        Explore by <span className="text-sky-500">domain</span>
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-2xl p-0 mb-0">
                        Browse protocol specifications and use-case flows grouped by domain family.
                        Expand a domain and select a use case to open its flow documentation.
                    </p>
                </div>
            </header>

            <div className="px-6 md:px-10 py-10 md:py-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center flex-shrink-0">
                            <FiLayers size={15} className="text-sky-600" aria-hidden />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-900 leading-none mb-2">
                                All domains
                            </p>
                            <p className="text-xs text-slate-500 mb-0">
                                Related domains are grouped (e.g. FIS12, FIS13 under FIS)
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <FiSearch
                            size={14}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="search"
                            placeholder="Search domains..."
                            value={domainSearch}
                            onChange={(e) => setDomainSearch(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 placeholder-slate-400 text-slate-800 shadow-sm"
                        />
                    </div>
                </div>

                <DomainCardsSection
                    domainFamilies={filteredFamilies}
                    error={loadError}
                    isDomainEnabled={isDomainEnabled}
                    isUseCaseEnabled={isUseCaseEnabled}
                    onUseCaseClick={handleUseCaseClick}
                />
            </div>
        </div>
    );
};

export default DeveloperGuideDomainsContent;
