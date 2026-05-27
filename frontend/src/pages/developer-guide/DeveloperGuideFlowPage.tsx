import { FC, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    FiArrowLeft,
    FiChevronRight,
    FiChevronLeft,
    FiList,
    FiAlertTriangle,
    FiZap,
    FiFileText,
    FiClock,
} from "react-icons/fi";
import FlowsAccordion from "./FlowsAccordion";
import FlowInformation from "./FlowInformation";
import Loader from "@components/ui/mini-components/loader";
import { fetchBuilds, fetchSpec, fetchDocs, fetchChangelog } from "@services/developerGuideSpecApi";
import { getActionId, getUsecaseLabelFromBuilds } from "./utils";
import { ROUTES } from "@constants/routes";
import { SegmentedTabs } from "@components/ui/SegmentedTabs";
import DocsViewer from "./DocsViewer";
import ErrorCodesTable from "./ErrorCodesTable";
import SupportedActionsView from "./SupportedActionsView";
import ChangelogView from "./ChangelogView";
import type { OpenAPISpecification, FlowEntry, BuildEntry, ChangelogEntry } from "./types";
import { useDeveloperGuideShell } from "./layout/DeveloperGuideShellContext";
import DeveloperGuideNavBackButton from "./layout/DeveloperGuideNavBackButton";

type TopLevelView = "flows" | "error-codes" | "supported-actions" | "docs" | "changelog";

const TOP_LEVEL_VIEWS: TopLevelView[] = [
    "flows",
    "error-codes",
    "supported-actions",
    "docs",
    "changelog",
];

function parseActiveView(searchParams: URLSearchParams): TopLevelView {
    const viewParam = searchParams.get("view");
    if (viewParam && TOP_LEVEL_VIEWS.includes(viewParam as TopLevelView)) {
        return viewParam as TopLevelView;
    }
    return "docs";
}

const DeveloperGuideFlowPage: FC = () => {
    const {
        domain: domainParam,
        version: versionParam,
        useCase: useCaseSlug,
    } = useParams<{
        domain: string;
        version: string;
        useCase: string;
    }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { inShell } = useDeveloperGuideShell();

    const activeView = useMemo(() => parseActiveView(searchParams), [searchParams]);

    const [selectedFlow, setSelectedFlow] = useState<string>("");
    const [selectedFlowAction, setSelectedFlowAction] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [builds, setBuilds] = useState<BuildEntry[]>([]);
    const [specData, setSpecData] = useState<OpenAPISpecification | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [lazyChangelog, setLazyChangelog] = useState<ChangelogEntry[] | null>(null);
    const [changelogLoading, setChangelogLoading] = useState(false);

    const changelogFetched = useRef(false);
    const didInitialSync = useRef(false);
    const prevRouteKeyRef = useRef<string | null>(null);

    const domainKey = domainParam != null ? decodeURIComponent(domainParam) : "";
    const versionKey = versionParam != null ? decodeURIComponent(versionParam) : "";
    const slug = useCaseSlug ? decodeURIComponent(useCaseSlug) : "";
    const routeKey = `${domainKey}|${versionKey}|${slug}`;

    const apiUsecase = useMemo(
        () => getUsecaseLabelFromBuilds(builds, domainKey, versionKey, slug) ?? slug,
        [builds, domainKey, versionKey, slug]
    );

    const flows: FlowEntry[] = useMemo(() => specData?.["x-flows"] ?? [], [specData]);
    const errorCodes = specData?.["x-errorcodes"];
    const supportedActions = specData?.["x-supported-actions"];
    const hasErrorCodes = !!errorCodes?.code?.length;
    const hasSupportedActions =
        !!supportedActions && Object.keys(supportedActions.supportedActions ?? {}).length > 0;

    // Reset tab + flow state only when domain / version / use case route changes
    useEffect(() => {
        if (prevRouteKeyRef.current === routeKey) return;
        prevRouteKeyRef.current = routeKey;

        setSelectedFlow("");
        setSelectedFlowAction("");
        setLazyChangelog(null);
        setSpecData(null);
        changelogFetched.current = false;
        didInitialSync.current = false;

        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("view", "docs");
                next.delete("flow");
                next.delete("action");
                return next;
            },
            { replace: true }
        );
    }, [routeKey, setSearchParams]);

    // Load builds then spec (resolve API usecase label from builds for correct flows/meta)
    useEffect(() => {
        if (!domainKey || !versionKey) return;

        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setNotFound(false);
            try {
                const buildsData = await fetchBuilds();
                if (cancelled) return;

                const resolvedUsecase =
                    getUsecaseLabelFromBuilds(buildsData, domainKey, versionKey, slug) ?? slug;

                const spec = await fetchSpec(domainKey, versionKey, {
                    include: ["meta", "flows", "attributes", "validations", "docs"],
                    usecase: resolvedUsecase || undefined,
                });

                if (cancelled) return;
                setBuilds(buildsData);
                setSpecData(spec);
            } catch {
                if (!cancelled) {
                    setBuilds([]);
                    setSpecData(null);
                    setNotFound(true);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [domainKey, versionKey, slug]);

    // Fallback: fetch docs separately if not included in spec payload
    useEffect(() => {
        if (isLoading || !domainKey || !versionKey || !specData) return;

        const existing = specData["x-docs"];
        if (existing && Object.keys(existing).length > 0) return;

        let cancelled = false;
        fetchDocs(domainKey, versionKey, { usecase: apiUsecase || undefined })
            .then((docs) => {
                if (cancelled || Object.keys(docs).length === 0) return;
                setSpecData((prev) => (prev ? { ...prev, "x-docs": docs } : prev));
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [isLoading, specData, domainKey, versionKey, apiUsecase]);

    // Lazy load Changelog
    const loadChangelogIfNeeded = useCallback(() => {
        if (changelogFetched.current || !domainKey || !versionKey) return;
        changelogFetched.current = true;
        setChangelogLoading(true);
        fetchChangelog(domainKey, versionKey)
            .then((result) => setLazyChangelog(result))
            .catch(() => setLazyChangelog(null))
            .finally(() => setChangelogLoading(false));
    }, [domainKey, versionKey]);

    useEffect(() => {
        if (activeView === "changelog") loadChangelogIfNeeded();
    }, [activeView, loadChangelogIfNeeded]);

    // Sync flow/action selection when Flows tab is active
    useEffect(() => {
        if (activeView !== "flows" || isLoading || !specData || flows.length === 0) return;

        const urlFlowId = searchParams.get("flow");
        const matchingFlow =
            (urlFlowId ? flows.find((f) => f.flowId === urlFlowId) : null) ??
            flows.find((f) => f.usecase === apiUsecase || f.usecase === slug) ??
            flows[0];
        if (!matchingFlow) return;

        const flowId = matchingFlow.flowId;
        const urlAction = searchParams.get("action");
        const steps = matchingFlow.config?.steps ?? [];
        const urlStep = urlAction ? steps.find((s) => getActionId(s) === urlAction) : undefined;
        const targetStep = urlStep ?? steps[0];
        const resolvedAction = targetStep ? getActionId(targetStep) : "";

        setSelectedFlow(flowId);
        setSelectedFlowAction(resolvedAction || "");

        setSearchParams(
            (prev) => {
                const currentFlow = prev.get("flow");
                const currentAction = prev.get("action") ?? "";
                if (currentFlow === flowId && currentAction === (resolvedAction || "")) {
                    return prev;
                }
                const next = new URLSearchParams(prev);
                next.set("flow", flowId);
                if (resolvedAction) next.set("action", resolvedAction);
                else next.delete("action");
                return next;
            },
            { replace: true }
        );

        didInitialSync.current = true;
        // searchParams read once per sync; omit from deps to avoid update loops
    }, [activeView, isLoading, specData, flows, slug, apiUsecase, setSearchParams]);

    useEffect(() => {
        if (activeView !== "flows" || !didInitialSync.current || !selectedFlow) return;
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("flow", selectedFlow);
                if (selectedFlowAction) next.set("action", selectedFlowAction);
                else next.delete("action");
                return next;
            },
            { replace: true }
        );
    }, [activeView, selectedFlow, selectedFlowAction, setSearchParams]);

    const handleBack = () => {
        navigate(ROUTES.DEVELOPER_GUIDE);
    };

    const handleViewChange = (view: TopLevelView) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("view", view);
                return next;
            },
            { replace: true }
        );
    };

    const usecaseLabel = useMemo(() => {
        if (!builds.length) return null;
        return getUsecaseLabelFromBuilds(builds, domainKey, versionKey, slug);
    }, [builds, domainKey, versionKey, slug]);

    if (isLoading) {
        return (
            <div
                className={`flex items-center justify-center bg-white ${
                    inShell ? "min-h-[40vh]" : "min-h-screen"
                }`}
            >
                <Loader />
            </div>
        );
    }

    if (notFound || !domainKey || !versionKey || !slug) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-white px-6 ${
                    inShell ? "min-h-[40vh]" : "min-h-screen"
                }`}
            >
                <p className="text-gray-600 mb-4">Use case not found for this domain/version.</p>
                <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 text-sm font-medium"
                >
                    Back to Developer Guide
                </button>
            </div>
        );
    }

    const docs = specData?.["x-docs"];
    const isDocsEmpty = !docs || Object.keys(docs).length === 0;

    return (
        <div
            className={`relative bg-white flex flex-col ${
                inShell ? "min-h-0" : "min-h-screen top-4"
            }`}
        >
            <header
                className={`z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm py-4 ${
                    inShell ? "sticky top-0" : "sticky top-0"
                }`}
            >
                <div className="px-4 md:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-4 mt-6">
                    <nav className="flex items-center gap-1.5 text-sm min-w-0 justify-self-start">
                        {inShell && <DeveloperGuideNavBackButton />}
                        {!inShell && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex items-center gap-1.5 text-gray-500 hover:text-sky-600 transition-colors duration-150 group flex-shrink-0"
                            >
                                <FiArrowLeft
                                    size={15}
                                    className="group-hover:-translate-x-0.5 transition-transform duration-150"
                                />
                                <span className="font-semibold text-gray-800 truncate">
                                    Developer Guide
                                </span>
                            </button>
                        )}
                        {(inShell || usecaseLabel) && (
                            <>
                                {!inShell && usecaseLabel && (
                                    <FiChevronRight size={15} className="flex-shrink-0" />
                                )}
                                <span className="font-semibold text-gray-800 truncate">
                                    {domainKey}
                                </span>
                                {versionKey && (
                                    <>
                                        <FiChevronRight
                                            size={15}
                                            className="flex-shrink-0 hidden sm:block"
                                        />
                                        <span className="font-semibold text-gray-800 truncate">
                                            v{versionKey}
                                        </span>
                                    </>
                                )}
                                {usecaseLabel && (
                                    <>
                                        <FiChevronRight
                                            size={15}
                                            className="flex-shrink-0 hidden sm:block"
                                        />
                                        <span className="font-semibold text-gray-800 truncate">
                                            {usecaseLabel}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </nav>
                    <div className="justify-self-center relative z-10">
                        <SegmentedTabs<TopLevelView>
                            active={activeView}
                            onChange={handleViewChange}
                            tabs={[
                                { id: "docs", label: "Docs", icon: FiFileText, visible: true },
                                { id: "flows", label: "Flows", icon: FiList, visible: true },
                                {
                                    id: "error-codes",
                                    label: "Error Codes",
                                    icon: FiAlertTriangle,
                                    visible: hasErrorCodes,
                                },
                                {
                                    id: "supported-actions",
                                    label: "Actions",
                                    icon: FiZap,
                                    visible: hasSupportedActions,
                                },
                                {
                                    id: "changelog",
                                    label: "Changelog",
                                    icon: FiClock,
                                    visible: true,
                                },
                            ]}
                        />
                    </div>
                    <div aria-hidden="true" />
                </div>
            </header>

            <div className="flex-grow flex items-start gap-0 relative">
                {activeView === "flows" ? (
                    <>
                        <div
                            className={`sticky top-24 self-start flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
                                sidebarOpen ? "w-[380px]" : "w-0"
                            }`}
                        >
                            <aside className="w-[380px] h-[calc(100vh-6rem)] border-r border-slate-200 bg-white overflow-y-auto rounded-none shadow-[2px_0_10px_0_rgba(0,0,0,0.02)]">
                                <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Flows</h2>
                                    <p className="text-gray-600 text-sm">
                                        Explore the configured protocol flows
                                    </p>
                                </div>
                                <div className="p-5 pt-3">
                                    <FlowsAccordion
                                        flows={flows}
                                        selectedFlow={selectedFlow}
                                        selectedFlowAction={selectedFlowAction}
                                        setSelectedFlow={setSelectedFlow}
                                        setSelectedFlowAction={setSelectedFlowAction}
                                    />
                                </div>
                            </aside>
                        </div>

                        <div className="sticky top-[10rem] self-start flex-shrink-0 flex items-start pt-4 z-10">
                            <button
                                onClick={() => setSidebarOpen((prev) => !prev)}
                                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                                className={`group flex items-center justify-center h-12 transition-all duration-200 active:scale-95 ${
                                    sidebarOpen
                                        ? "w-5 -ml-px rounded-r-lg border-l-0 bg-white border border-gray-200 shadow-sm hover:bg-sky-50 hover:border-sky-300"
                                        : "w-8 rounded-lg bg-sky-500 border border-sky-600 shadow-[0_4px_12px_-2px_rgba(2,132,199,0.5)] hover:bg-sky-600 hover:-translate-y-0.5"
                                }`}
                            >
                                <FiChevronLeft
                                    size={10}
                                    className={`transition-transform duration-300 ${
                                        sidebarOpen
                                            ? "text-gray-400 group-hover:text-sky-500"
                                            : "text-white rotate-180"
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex-1 min-w-0 px-4">
                            {specData && flows.length > 0 ? (
                                <FlowInformation
                                    data={specData}
                                    flows={flows}
                                    selectedFlow={selectedFlow}
                                    selectedFlowAction={selectedFlowAction}
                                    domain={domainKey}
                                    version={versionKey}
                                />
                            ) : (
                                <div className="w-full flex items-center justify-center min-h-[50vh]">
                                    <p className="text-slate-500 font-medium">
                                        No flows available for this use case.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 min-w-0 p-8 max-w-9xl mx-auto w-full">
                        {activeView === "error-codes" &&
                            (hasErrorCodes && errorCodes ? (
                                <ErrorCodesTable errorCodes={errorCodes} />
                            ) : (
                                <p className="text-slate-500 text-center py-12">
                                    No error codes available.
                                </p>
                            ))}
                        {activeView === "supported-actions" &&
                            (hasSupportedActions && supportedActions ? (
                                <SupportedActionsView supportedActions={supportedActions} />
                            ) : (
                                <p className="text-slate-500 text-center py-12">
                                    No actions available.
                                </p>
                            ))}
                        {activeView === "docs" &&
                            (isDocsEmpty ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center">
                                    <p className="text-sm text-slate-400">
                                        No documentation available.
                                    </p>
                                </div>
                            ) : (
                                <DocsViewer docs={docs} />
                            ))}
                        {activeView === "changelog" &&
                            (changelogLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader />
                                </div>
                            ) : (
                                <ChangelogView changelogs={lazyChangelog || []} />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeveloperGuideFlowPage;
