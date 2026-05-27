import { FC, useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { BuildEntry } from "../types";
import type { DomainFamilyGroup } from "../domainGrouping";
import { getDomainFamilyLabel, getDomainShortLabel, groupBuildsByFamily } from "../domainGrouping";

export interface DomainCardsSectionProps {
    domains?: BuildEntry[];
    domainFamilies?: DomainFamilyGroup[];
    error: string | null;
    isDomainEnabled: (dom: BuildEntry) => boolean;
    isUseCaseEnabled: (dom: BuildEntry, usecaseLabel: string) => boolean;
    onUseCaseClick: (dom: BuildEntry, versionKey: string, usecaseLabel: string) => void;
}

interface UseCaseEntry {
    dom: BuildEntry;
    verKey: string;
    label: string;
    domainLabel: string;
}

function collectUseCases(
    family: DomainFamilyGroup,
    isUseCaseEnabled: (dom: BuildEntry, usecaseLabel: string) => boolean
): UseCaseEntry[] {
    return family.domains
        .flatMap((dom) =>
            (dom.version ?? []).flatMap((ver) =>
                (ver.usecase ?? []).map((label) => ({
                    dom,
                    verKey: ver.key,
                    label,
                    domainLabel: getDomainShortLabel(dom.key),
                }))
            )
        )
        .sort((a, b) => {
            const aEn = isUseCaseEnabled(a.dom, a.label);
            const bEn = isUseCaseEnabled(b.dom, b.label);
            if (aEn !== bEn) return aEn ? -1 : 1;
            return a.label.localeCompare(b.label);
        });
}

const DomainFamilyAccordion: FC<{
    family: DomainFamilyGroup;
    familyIndex: number;
    isDomainEnabled: (dom: BuildEntry) => boolean;
    isUseCaseEnabled: (dom: BuildEntry, usecaseLabel: string) => boolean;
    onUseCaseClick: (dom: BuildEntry, versionKey: string, usecaseLabel: string) => void;
}> = ({ family, familyIndex, isDomainEnabled, isUseCaseEnabled, onUseCaseClick }) => {
    const panelId = useId();
    const [open, setOpen] = useState(false);
    const enabled = family.domains.some(isDomainEnabled);
    const familyTitle = getDomainFamilyLabel(family.familyKey);
    const domainLabels = family.domains.map((d) => getDomainShortLabel(d.key));
    const useCases = collectUseCases(family, isUseCaseEnabled);
    const showDomainBadge = family.domains.length > 1;

    return (
        <section
            className={`bg-white rounded-2xl border overflow-hidden transition-shadow duration-200 ${
                enabled
                    ? "border-sky-200 shadow-sm hover:shadow-md hover:shadow-sky-100/50"
                    : "border-slate-200 opacity-60"
            }`}
            style={{
                animationName: "fadeSlideUp",
                animationDuration: "0.35s",
                animationTimingFunction: "ease-out",
                animationFillMode: "both",
                animationDelay: `${familyIndex * 40}ms`,
            }}
        >
            <button
                type="button"
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                    enabled ? "hover:bg-sky-50/60" : "hover:bg-slate-50"
                }`}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
            >
                <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        enabled
                            ? "bg-sky-100 text-sky-600 border border-sky-200"
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        aria-hidden
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                        />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <h3
                        className={`font-bold text-sm leading-snug ${
                            enabled ? "text-slate-900" : "text-slate-500"
                        }`}
                    >
                        {familyTitle}
                    </h3>
                    <p
                        className={`text-xs mt-0.5 font-medium truncate ${
                            enabled ? "text-sky-600" : "text-slate-400"
                        }`}
                        title={domainLabels.join(", ")}
                    >
                        {domainLabels.length > 1
                            ? domainLabels.join(" · ")
                            : (domainLabels[0] ?? family.label)}
                        {" · "}
                        {useCases.length} use case{useCases.length !== 1 ? "s" : ""}
                    </p>
                </div>

                <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        enabled
                            ? "bg-sky-50 border-sky-200 text-sky-600"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                    }`}
                >
                    <FiChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        aria-hidden
                    />
                </span>
            </button>

            <div
                id={panelId}
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
                aria-hidden={!open}
            >
                <div className="overflow-hidden border-t border-sky-100">
                    <div
                        className={`px-5 py-4 flex flex-wrap gap-2 transition-opacity duration-150 ${
                            open ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        {useCases.map(({ dom, verKey, label, domainLabel }) => {
                            const clickable = isUseCaseEnabled(dom, label);
                            return (
                                <button
                                    key={`${dom.key}-${verKey}-${label}`}
                                    type="button"
                                    disabled={!clickable}
                                    onClick={() => clickable && onUseCaseClick(dom, verKey, label)}
                                    className={`group/chip relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors duration-150 ${
                                        clickable
                                            ? "bg-white text-sky-700 border-sky-200 hover:bg-sky-50 hover:border-sky-300 hover:shadow-sm cursor-pointer shadow-sm pr-7"
                                            : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                                    }`}
                                >
                                    {label}
                                    {showDomainBadge && (
                                        <span
                                            className={`font-mono text-[10px] px-1 py-0.5 rounded ${
                                                clickable
                                                    ? "bg-sky-50 text-sky-500"
                                                    : "bg-slate-100 text-slate-300"
                                            }`}
                                        >
                                            {domainLabel}
                                        </span>
                                    )}
                                    <span
                                        className={`font-mono text-[11px] ${
                                            clickable ? "text-sky-400" : "text-slate-300"
                                        }`}
                                    >
                                        v{verKey}
                                    </span>
                                    {clickable && (
                                        <svg
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-sky-400 opacity-0 -translate-x-1 group-hover/chip:opacity-100 group-hover/chip:translate-x-0 transition-all duration-150"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2.5}
                                            aria-hidden
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                            />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

const DomainCardsSection: FC<DomainCardsSectionProps> = ({
    domains,
    domainFamilies: domainFamiliesProp,
    error,
    isDomainEnabled,
    isUseCaseEnabled,
    onUseCaseClick,
}) => {
    const domainFamilies = domainFamiliesProp ?? (domains ? groupBuildsByFamily(domains) : []);

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="flex-shrink-0"
                    aria-hidden
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                {error}
            </div>
        );
    }

    if (domainFamilies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <svg
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        className="text-sky-400"
                        aria-hidden
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <p className="text-slate-600 font-semibold text-sm">No domains found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your search term</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {domainFamilies.map((family, familyIndex) => (
                <DomainFamilyAccordion
                    key={`${family.familyKey}-${familyIndex}`}
                    family={family}
                    familyIndex={familyIndex}
                    isDomainEnabled={isDomainEnabled}
                    isUseCaseEnabled={isUseCaseEnabled}
                    onUseCaseClick={onUseCaseClick}
                />
            ))}

            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default DomainCardsSection;
