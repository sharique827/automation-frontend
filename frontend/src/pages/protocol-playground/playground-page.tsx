import { useContext, useEffect, useRef, useState } from "react";

import { PlaygroundContext } from "@pages/protocol-playground/context/playground-context";
import Popup from "@components/ui/pop-up/pop-up";
import { PlaygroundRightTabType } from "@pages/protocol-playground/types";
import { LeftSideView } from "@pages/protocol-playground/ui/LeftSideView";
import { RightSideView } from "@pages/protocol-playground/ui/RightSideView";
import { useConfigOperations } from "@pages/protocol-playground/hooks/use-config";
import { PlaygroundHeader } from "@pages/protocol-playground/ui/playground-upper/playground-header";
import { useModalHandlers } from "@pages/protocol-playground/hooks/use-modal";
import { usePlaygroundActions } from "@pages/protocol-playground/hooks/use-playground-actions";
import FullPageLoader from "@components/ui/mini-components/fullpage-loader";
import { ActionTimeline } from "@pages/protocol-playground/ui/playground-upper/merged-sequcence";
import ViewOnlyPlaygroundPage from "@pages/protocol-playground/view-only-page";
import MockRunner, { MockPlaygroundConfigType } from "@ondc/automation-mock-runner";
import { toast } from "react-toastify";
import { RawConfigEditorModal } from "@pages/protocol-playground/ui/raw-config-editor-modal";
import { PlaygroundHelpModal } from "@pages/protocol-playground/ui/playground-help-modal";
import { FlowInfoModal } from "@pages/protocol-playground/ui/flow-info-modal";
import { ExportReviewModal } from "@pages/protocol-playground/ui/export-review-modal";
import { GitHubImportModal } from "@pages/protocol-playground/ui/github-import-modal";
import { AIProvider } from "@pages/protocol-playground/ai/context/ai-provider";

const PlaygroundPage = () => {
    const playgroundContext = useContext(PlaygroundContext);

    const { activeApi, setActiveApi } = playgroundContext;

    const {
        exportConfig,
        importConfig,
        clearConfig,
        runConfig,
        runCurrentConfig,
        createFlowSession,
        runAllStepsForExport,
        finalizeExportForDeployment,
    } = useConfigOperations();

    const handleBack = () => {
        playgroundContext.setCurrentConfig(undefined);
    };
    const { addAction, deleteAction, updateAction } = usePlaygroundActions();
    const { popupOpen, openModal, closeModal, popupContent } = playgroundContext.useModal;
    const modalHandlers = useModalHandlers({
        activeApi,
        setActiveApi,
        openModal,
        closeModal,
        addAction,
        deleteAction,
        updateAction,
        clearConfig,
        config: playgroundContext.config,
    });

    const handleImportFromGitHub = () => {
        if (!playgroundContext.config) {
            setIsGitHubImportOpen(true);
            return;
        }
        const { domain, version, flowId } = playgroundContext.config.meta;
        openModal(
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                    Replace Current Flow?
                </h3>
                <p className="text-sm text-gray-500 mb-1">You already have a flow loaded:</p>
                <p className="text-sm font-mono text-sky-700 mb-1">{flowId}</p>
                <p className="text-xs text-gray-400 mb-4">
                    {domain} &middot; v{version}
                </p>
                <p className="text-sm text-gray-600 mb-5">
                    Importing from GitHub will replace it. Any unsaved changes will be lost.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            closeModal();
                            setIsGitHubImportOpen(true);
                        }}
                        className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    const [activeRightTab, setActiveRightTab] = useState<PlaygroundRightTabType>("session");
    const [isRawEditorOpen, setIsRawEditorOpen] = useState(false);
    const [rawConfigValue, setRawConfigValue] = useState("");
    const [rawConfigError, setRawConfigError] = useState<string | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isFlowInfoOpen, setIsFlowInfoOpen] = useState(false);
    const [isGitHubImportOpen, setIsGitHubImportOpen] = useState(false);
    const [exportReviewConfig, setExportReviewConfig] = useState<MockPlaygroundConfigType | null>(
        null
    );
    const [isExportDownloading, setIsExportDownloading] = useState(false);

    const isWideRight = activeRightTab === "transaction";
    const leftPanelWidth = isWideRight ? "w-[30%]" : "w-1/2";
    const rightPanelWidth = isWideRight ? "w-[70%]" : "w-1/2";

    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const [devMode, setDevMode] = useState<boolean>(true);
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const devMode: string | null = urlParams.get("devMode");

        if (devMode && devMode === "false") {
            setDevMode(false);
        }
    }, []);

    const openRawEditor = () => {
        if (!playgroundContext.config) {
            toast.error("No configuration available to edit");
            return;
        }
        setRawConfigValue(JSON.stringify(playgroundContext.config, null, 2));
        setRawConfigError(null);
        setIsRawEditorOpen(true);
    };

    const closeRawEditor = () => {
        setIsRawEditorOpen(false);
        setRawConfigError(null);
    };

    const handleSaveRawConfig = () => {
        try {
            const parsedConfig = JSON.parse(rawConfigValue) as MockPlaygroundConfigType;
            const validConfig = new MockRunner(parsedConfig).validateConfig();
            if (!validConfig.success) {
                const validationError = `Invalid configuration: ${validConfig.errors?.join(", ")}`;
                setRawConfigError(validationError);
                toast.error(validationError);
                return;
            }
            playgroundContext.setCurrentConfig(parsedConfig);
            setIsRawEditorOpen(false);
            setRawConfigError(null);
            toast.success("Raw configuration updated successfully");
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Invalid JSON in raw editor";
            setRawConfigError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const handleExportForDeployment = async () => {
        const snapshot = await runAllStepsForExport();
        if (snapshot) setExportReviewConfig(snapshot);
    };

    const handleExportConfirm = async (overrides: Record<string, string>) => {
        if (!exportReviewConfig) return;
        setIsExportDownloading(true);
        try {
            await finalizeExportForDeployment(exportReviewConfig, overrides);
        } finally {
            setIsExportDownloading(false);
            setExportReviewConfig(null);
        }
    };

    const handleExportCancel = () => {
        setExportReviewConfig(null);
        toast.info("Export cancelled. Steps remain executed.");
    };

    if (!devMode) {
        return (
            <div>
                <ViewOnlyPlaygroundPage />;
                <Popup isOpen={popupOpen} onClose={closeModal}>
                    {popupContent}
                </Popup>
                {playgroundContext.loading && <FullPageLoader />}
            </div>
        );
    }

    return (
        <AIProvider>
            <div ref={containerRef} className="w-full h-screen min-h-screen flex flex-col bg-white">
                <div>
                    <PlaygroundHeader
                        domain={playgroundContext.config?.meta.domain || "N/A"}
                        version={playgroundContext.config?.meta.version || "N/A"}
                        flowId={playgroundContext.config?.meta.flowId || "N/A"}
                        onExport={exportConfig}
                        onImport={importConfig}
                        onImportFromGitHub={handleImportFromGitHub}
                        onClear={modalHandlers.showDeleteConfirmation}
                        onRun={async () => {
                            await runConfig();
                        }}
                        onCreateFlowSession={createFlowSession}
                        onExportForDeployment={handleExportForDeployment}
                        onRunCurrent={async () => {
                            await runCurrentConfig();
                        }}
                        onBack={handleBack}
                        onHelp={() => setIsHelpOpen(true)}
                        onEditMeta={() => setIsFlowInfoOpen(true)}
                        onEditRaw={openRawEditor}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={toggleFullscreen}
                    />
                    <ActionTimeline
                        steps={playgroundContext.config?.steps || []}
                        transactionHistory={playgroundContext.config?.transaction_history || []}
                        activeApi={activeApi}
                        onApiSelect={setActiveApi}
                        onAddAction={modalHandlers.showAddAction}
                        onEditAction={modalHandlers.showEditAction}
                        onDeleteAction={modalHandlers.deleteAction}
                        onAddBefore={modalHandlers.addActionBefore}
                        onAddAfter={modalHandlers.addActionAfter}
                    />
                </div>
                <div
                    className={`flex gap-4 mt-1 ${isFullscreen ? "flex-1 overflow-hidden" : "h-full max-h-[82vh]"}`}
                >
                    <LeftSideView width={leftPanelWidth} activeApi={activeApi} />
                    <RightSideView
                        width={rightPanelWidth}
                        activeRightTab={activeRightTab}
                        setActiveRightTab={setActiveRightTab}
                        activeApi={activeApi}
                    />
                </div>
                <RawConfigEditorModal
                    isOpen={isRawEditorOpen}
                    value={rawConfigValue}
                    error={rawConfigError}
                    onChange={(value) => {
                        setRawConfigValue(value);
                        if (rawConfigError) setRawConfigError(null);
                    }}
                    onSave={handleSaveRawConfig}
                    onClose={closeRawEditor}
                />
                <Popup isOpen={popupOpen} onClose={closeModal}>
                    {popupContent}
                </Popup>
                {playgroundContext.loading && <FullPageLoader />}
                <PlaygroundHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
                {playgroundContext.config && (
                    <FlowInfoModal
                        isOpen={isFlowInfoOpen}
                        meta={playgroundContext.config.meta}
                        onSave={playgroundContext.updateConfigMeta}
                        onClose={() => setIsFlowInfoOpen(false)}
                    />
                )}
                <ExportReviewModal
                    config={exportReviewConfig}
                    onConfirm={handleExportConfirm}
                    onCancel={handleExportCancel}
                    isDownloading={isExportDownloading}
                />
                <GitHubImportModal
                    isOpen={isGitHubImportOpen}
                    defaultDomain={playgroundContext.config?.meta.domain}
                    onClose={() => setIsGitHubImportOpen(false)}
                    onImport={(config) => {
                        playgroundContext.setCurrentConfig(config);
                        toast.success("Flow imported from GitHub successfully");
                    }}
                />
            </div>
        </AIProvider>
    );
};

export default PlaygroundPage;
