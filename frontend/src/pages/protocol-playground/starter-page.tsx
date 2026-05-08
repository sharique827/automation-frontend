import { useContext, useEffect, useState } from "react";
import { createInitialMockConfig } from "@ondc/automation-mock-runner";
import axios from "axios";

import { PlaygroundContext } from "@pages/protocol-playground/context/playground-context";
import PlaygroundPage from "@pages/protocol-playground/playground-page";
import { GitHubImportModal } from "@pages/protocol-playground/ui/github-import-modal";
import { SavedConfigsModal } from "@pages/protocol-playground/ui/saved-configs-modal";
import UtilityToolsBar from "@pages/protocol-playground/ui/utility-tools-bar";

interface UsecaseItem {
    key: string;
}

interface VersionItem {
    key: string;
    usecase?: UsecaseItem[];
}

interface DomainItem {
    key: string;
    version?: VersionItem[];
}

interface DynamicList {
    domain: DomainItem[];
    version: VersionItem[];
    usecase: UsecaseItem[];
}

const StarterPage = () => {
    const { config, setCurrentConfig } = useContext(PlaygroundContext);
    const [domain, setDomain] = useState("");
    const [version, setVersion] = useState("");
    const [flowId, setFlowId] = useState("");
    const [description, setDescription] = useState("");
    const [useCaseId, setUseCaseId] = useState("");
    const [showSavedConfigs, setShowSavedConfigs] = useState(false);
    const [showGitHubImport, setShowGitHubImport] = useState(false);
    const [dynamicList, setDynamicList] = useState<DynamicList>({
        domain: [],
        version: [],
        usecase: [],
    });

    const fetchFormData = async () => {
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/config/senarioFormData`
            );
            setDynamicList((prev) => {
                return {
                    ...prev,
                    domain: response.data.domain || [],
                    version: response.data.version || [],
                };
            });
        } catch (e) {
            console.error("error while fetching form field data", e);
        }
    };

    useEffect(() => {
        fetchFormData();
    }, []);

    if (config) {
        return <PlaygroundPage />;
    }

    function SetConfig(domain: string, version: string, flowId: string) {
        if (domain && version && flowId) {
            const initial = createInitialMockConfig(domain, version, flowId);
            if (description.trim()) initial.meta.description = description.trim();
            if (useCaseId.trim()) initial.meta.use_case_id = useCaseId.trim();
            setCurrentConfig(initial);
        }
    }

    return (
        <div className="min-h-screen h-full bg-gradient-to-b from-white via-sky-50/30 to-white flex flex-col items-center justify-center px-8 py-16">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-100/40 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
            </div>

            {/* Main container */}
            <div className="relative z-10 w-full max-w-lg">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl mb-4 shadow-lg shadow-sky-500/20">
                        <svg
                            className="w-7 h-7 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        ONDC Protocol Playground
                    </h1>
                    <p className="text-gray-600 text-sm">Configure and test your protocol flows</p>
                </div>
                <UtilityToolsBar />

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mt-2">
                    {/* Card header */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">
                            Initialize Flow
                        </h2>
                        <p className="text-sm text-gray-500">
                            Enter your configuration details to begin
                        </p>
                    </div>

                    {/* Quick-load buttons */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => setShowSavedConfigs(true)}
                            className="flex-1 px-4 py-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                                />
                            </svg>
                            Load Saved
                        </button>
                        <button
                            onClick={() => setShowGitHubImport(true)}
                            className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.216.69.825.573C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Import from GitHub
                        </button>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-5">
                        {/* Domain */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Domain
                            </label>
                            {dynamicList.domain?.length > 0 ? (
                                <select
                                    value={domain}
                                    onChange={(e) => {
                                        setDomain(e.target.value);
                                        const selectedDomainData = dynamicList.domain.find(
                                            (item: DomainItem) => item.key === e.target.value
                                        );
                                        if (selectedDomainData) {
                                            setDynamicList((prev) => ({
                                                ...prev,
                                                version: selectedDomainData.version || [],
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 text-sm"
                                >
                                    <option value="">Select a domain...</option>
                                    {dynamicList.domain.map((item: DomainItem) => (
                                        <option key={item.key} value={item.key}>
                                            {item.key}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="e.g., mobility, logistics, retail"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                                />
                            )}
                        </div>

                        {/* Version */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Version
                            </label>
                            {dynamicList.version?.length > 0 ? (
                                <select
                                    value={version}
                                    onChange={(e) => {
                                        setVersion(e.target.value);
                                        const selectedVersionData = dynamicList.version.find(
                                            (item: VersionItem) => item.key === e.target.value
                                        );
                                        if (selectedVersionData) {
                                            setDynamicList((prev) => ({
                                                ...prev,
                                                usecase: selectedVersionData.usecase || [],
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 text-sm"
                                >
                                    <option value="">Select a version...</option>
                                    {dynamicList.version.map((item: VersionItem) => (
                                        <option key={item.key} value={item.key}>
                                            {item.key}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    placeholder="e.g., 2.0.1, 1.5.3"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                                />
                            )}
                        </div>

                        {/* Flow ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Flow ID
                            </label>
                            <input
                                type="text"
                                value={flowId}
                                onChange={(e) => setFlowId(e.target.value)}
                                placeholder="Enter unique flow identifier"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                            />
                        </div>

                        {/* Optional details */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
                                Optional Details
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Use Case ID
                                    </label>
                                    <input
                                        type="text"
                                        value={useCaseId}
                                        onChange={(e) => setUseCaseId(e.target.value)}
                                        placeholder="e.g. UCS-001"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What does this flow test?"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            onClick={() => SetConfig(domain, version, flowId)}
                            disabled={!domain || !version || !flowId}
                            className="w-full mt-6 px-6 py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30 disabled:shadow-none"
                        >
                            Continue to Playground
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Saved Configs Modal */}
            <SavedConfigsModal
                isOpen={showSavedConfigs}
                onClose={() => setShowSavedConfigs(false)}
                onConfigSelected={(domain, version, flowId) => {
                    setDomain(domain);
                    setVersion(version);
                    setFlowId(flowId);
                }}
            />

            {/* GitHub Import Modal */}
            <GitHubImportModal
                isOpen={showGitHubImport}
                onClose={() => setShowGitHubImport(false)}
                onImport={(config) => setCurrentConfig(config)}
            />
        </div>
    );
};

export default StarterPage;
