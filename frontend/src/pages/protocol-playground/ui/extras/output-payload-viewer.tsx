import { useCallback, useContext, useEffect, useRef, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { toast } from "react-toastify";
import Markdown from "react-markdown";
import axios from "axios";
import MockRunner, {
    ExecutionResult,
    MockPlaygroundConfigType,
} from "@ondc/automation-mock-runner";
import { Editor } from "@monaco-editor/react";

import { fetchFormFieldData } from "@utils/request-utils";

import {
    IoCheckmarkCircle,
    IoCloseCircle,
    IoChevronDown,
    IoChevronUp,
    IoCodeSlash,
    IoShieldCheckmark,
    IoPlayCircle,
    IoAlertCircle,
    IoTerminal,
    IoDocumentText,
    IoClose,
    IoPencil,
    IoRefresh,
} from "react-icons/io5";

import { PlaygroundContext } from "@pages/protocol-playground/context/playground-context";
import {
    ActiveDomainConfig,
    Domain,
    DomainVersion,
    ParsedPayload,
} from "@pages/schema-validation/types";

/**
 * Type for ONDC protocol payload
 * Can be an empty string or a parsed payload object with context
 */
type ProtocolPayload = "" | ParsedPayload | Record<string, unknown>;

// ─── Validate Requirements Modal ──────────────────────────────────────────────

interface ValidateReqsModalProps {
    isOpen: boolean;
    onClose: () => void;
    actionId: string | undefined;
    config: MockPlaygroundConfigType | undefined;
    onResult: (result: { valid: boolean; code: number; description: string }) => void;
    setActiveTerminalData: React.Dispatch<React.SetStateAction<ExecutionResult[]>>;
}

function ValidateRequirementsModal({
    isOpen,
    onClose,
    actionId,
    config,
    onResult,
    setActiveTerminalData,
}: ValidateReqsModalProps) {
    const [sessionJson, setSessionJson] = useState("{}");
    const [loadingSession, setLoadingSession] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<{
        valid: boolean;
        code: number;
        description: string;
    } | null>(null);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const fetchSession = useCallback(async () => {
        if (!config) return;
        setLoadingSession(true);
        setResult(null);
        setJsonError(null);
        hasFetched.current = true;
        try {
            const runner = new MockRunner(config as MockPlaygroundConfigType);
            const steps = config.steps;
            const index = steps.findIndex((s) => s.action_id === actionId);
            const data = await runner.getSessionDataUpToStep(index >= 0 ? index : 0);
            setSessionJson(JSON.stringify(data, null, 2));
        } catch (e) {
            console.error("Error fetching session data", e);
            toast.error("Failed to fetch session data");
            setSessionJson("{}");
        } finally {
            setLoadingSession(false);
        }
    }, [config, actionId]);

    useEffect(() => {
        if (isOpen && !hasFetched.current) {
            fetchSession();
        }
        if (!isOpen) {
            hasFetched.current = false;
            setResult(null);
            setJsonError(null);
        }
    }, [isOpen, fetchSession]);

    const handleValidate = async () => {
        if (!config) {
            toast.error("No configuration found");
            return;
        }
        let parsedSession: Record<string, unknown>;
        try {
            parsedSession = JSON.parse(sessionJson);
        } catch {
            setJsonError("Invalid JSON — please fix the session data before running validation.");
            return;
        }
        setJsonError(null);
        setValidating(true);
        setResult(null);
        try {
            const runner = new MockRunner(config);
            runner.logger.setLogLevel(3);
            const execResult = await runner.runMeetRequirementsWithSession(
                actionId || "",
                parsedSession
            );
            setActiveTerminalData((s) => [...s, execResult]);
            setResult(execResult.result);
            onResult(execResult.result);
        } catch (e) {
            console.error("Error running meet requirements", e);
            toast.error("Validation failed — check console for details.");
        } finally {
            setValidating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="relative flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                style={{ width: "min(820px, 95vw)", maxHeight: "90vh" }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-sky-500">
                    <div className="flex items-center gap-3">
                        <IoPencil className="text-white text-xl" />
                        <div>
                            <h2 className="text-white font-bold text-base leading-tight">
                                Validate Requirements
                            </h2>
                            <p className="text-indigo-100 text-xs mt-0.5">
                                Edit the live session data below, then run validation against&nbsp;
                                <span className="font-mono bg-white/20 px-1 rounded">
                                    {actionId || "unknown"}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                hasFetched.current = false;
                                fetchSession();
                            }}
                            disabled={loadingSession}
                            title="Refresh session data"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition disabled:opacity-50"
                        >
                            <IoRefresh
                                className={`text-lg ${loadingSession ? "animate-spin" : ""}`}
                            />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                        >
                            <IoClose className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* Session Data Editor */}
                <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
                    <div className="px-4 pt-3 pb-1 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <IoCodeSlash className="text-sky-500 text-sm" />
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Live Session Data
                        </span>
                        {loadingSession && (
                            <span className="ml-auto flex items-center gap-1.5 text-xs text-sky-600">
                                <span className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin inline-block" />
                                Loading…
                            </span>
                        )}
                    </div>

                    <div style={{ flex: "1 1 320px", minHeight: "260px" }}>
                        <Editor
                            height="100%"
                            language="json"
                            theme="vs-dark"
                            value={sessionJson}
                            onChange={(v) => setSessionJson(v ?? "{}")}
                            options={{
                                fontSize: 13,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                formatOnPaste: true,
                                padding: { top: 12, bottom: 12 },
                                lineNumbers: "on",
                            }}
                        />
                    </div>

                    {/* JSON parse error */}
                    {jsonError && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-start gap-2">
                            <IoAlertCircle className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700">{jsonError}</p>
                        </div>
                    )}
                </div>

                {/* Result Banner */}
                {result && (
                    <div
                        className={`px-6 py-3 flex items-start gap-3 border-t ${
                            result.valid
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                        }`}
                    >
                        {result.valid ? (
                            <IoCheckmarkCircle className="text-green-500 text-2xl shrink-0 mt-0.5" />
                        ) : (
                            <IoCloseCircle className="text-red-500 text-2xl shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className={`text-sm font-semibold ${
                                        result.valid ? "text-green-700" : "text-red-700"
                                    }`}
                                >
                                    {result.valid ? "Requirements Met" : "Requirements Not Met"}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                                        result.code === 200
                                            ? "bg-green-100 text-green-800 border border-green-200"
                                            : "bg-red-100 text-red-800 border border-red-200"
                                    }`}
                                >
                                    {result.code}
                                </span>
                            </div>
                            <p
                                className={`text-xs mt-1 ${result.valid ? "text-green-600" : "text-red-600"}`}
                            >
                                {result.description}
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleValidate}
                        disabled={validating || loadingSession}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
                    >
                        {validating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Validating…
                            </>
                        ) : (
                            <>
                                <IoShieldCheckmark className="text-base" />
                                Run Validation
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OutputPayloadViewer({
    payload,
    actionId,
}: {
    payload: ProtocolPayload;
    actionId: string | undefined;
}) {
    const [activeDomain, setActiveDomain] = useState<ActiveDomainConfig>({});
    const [mdData, setMdData] = useState("");
    const [loading, setIsLoading] = useState(false);
    const [validationSuccess, setValidationSuccess] = useState<boolean | null>(null);

    // Section toggles
    const [showPayload, setShowPayload] = useState(true);
    const [showValidation, setShowValidation] = useState(true);
    const [showL2Results, setShowL2Results] = useState(true);

    // Validate Requirements modal
    const [reqsModalOpen, setReqsModalOpen] = useState(false);

    const playgroundContext = useContext(PlaygroundContext);
    const [l2Result, setL2Result] = useState<
        | {
              valid: boolean;
              code: number;
              description: string;
          }
        | undefined
    >(undefined);
    // Track which button produced the current l2Result
    const [l2ResultSource, setL2ResultSource] = useState<"l2" | "requirements">("l2");

    useEffect(() => {
        const getFormFields = async () => {
            const data = await fetchFormFieldData();
            setActiveDomain(data as ActiveDomainConfig);
        };
        getFormFields();
    }, []);

    const verifyRequestL0 = async () => {
        if (payload === "") {
            toast.warn("Add payload for the request");
            return;
        }

        // After empty string check, payload is ParsedPayload | Record<string, unknown>
        const parsedPayload = payload as ParsedPayload | Record<string, unknown>;

        try {
            if (Array.isArray(parsedPayload)) {
                toast.warn("Array of payloads not supported");
                return;
            }
        } catch (e) {
            console.error("error while parsing ", e);
            toast.error("Invalid payload");
            return;
        }

        // Type guard: check if payload has context property
        const payloadWithContext = parsedPayload as ParsedPayload;
        const action = payloadWithContext?.context?.action;

        if (!action) {
            toast.warn("action missing from context");

            return;
        }

        let isDomainActive = false;

        Object.entries(activeDomain).forEach((data: [string, Domain[]]) => {
            const [_key, domains] = data;

            domains.forEach((domain: Domain) => {
                if (domain.key === payloadWithContext?.context?.domain) {
                    domain.version.forEach((ver: DomainVersion) => {
                        if (
                            ver.key ===
                            (payloadWithContext?.context?.version ||
                                payloadWithContext?.context?.core_version)
                        ) {
                            isDomainActive = true;
                        }
                    });
                }
            });
        });

        if (!isDomainActive) {
            toast.warn(
                "Domain or version not yet active. To check the list of active domain visit home page."
            );
            return;
        }

        setMdData("");
        setValidationSuccess(null);
        setShowValidation(true);

        try {
            setIsLoading(true);
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/flow/validate/${action}`,
                parsedPayload
            );
            setMdData(response.data?.error?.message || "✓ Validation passed successfully");
            setValidationSuccess(response.data?.error ? false : true);
        } catch (e) {
            console.error(">>>>>", e);
            toast.error("Something went wrong");
            setValidationSuccess(false);
            setMdData("Validation failed due to server error");
        } finally {
            setIsLoading(false);
        }
    };

    const verifyRequestL2 = async () => {
        setIsLoading(true);
        try {
            const config = playgroundContext.config;
            if (!config) {
                toast.error("No configuration found");
                setIsLoading(false);
                return;
            }
            const runner = new MockRunner(config);
            runner.logger.setLogLevel(3);
            const l2Result = await runner.runValidatePayload(actionId || "", payload);
            playgroundContext.setActiveTerminalData((s) => [...s, l2Result]);
            setL2ResultSource("l2");
            setL2Result(l2Result.result);
        } catch (e) {
            console.error("error in l2", e);
        }
        setIsLoading(false);
    };

    const verifyRequestMeetReqs = () => {
        // Open the modal — session data is fetched inside the modal on open
        setReqsModalOpen(true);
    };

    if (!payload || !actionId) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center p-8">
                    <IoDocumentText className="text-gray-400 text-5xl mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No payload available</p>
                    <p className="text-gray-400 text-xs mt-1">
                        Execute a function to see the output
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Validate Requirements Modal */}
            <ValidateRequirementsModal
                isOpen={reqsModalOpen}
                onClose={() => setReqsModalOpen(false)}
                actionId={actionId}
                config={playgroundContext.config}
                setActiveTerminalData={playgroundContext.setActiveTerminalData}
                onResult={(res) => {
                    setL2ResultSource("requirements");
                    setL2Result(res);
                }}
            />
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-50 to-white border-b border-sky-100">
                <div className="flex items-center gap-2">
                    <IoTerminal className="text-sky-500 text-xl" />
                    <h3 className="text-base font-semibold text-gray-900">Output Payload</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={verifyRequestL0}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <IoShieldCheckmark className="text-base" />
                                <span>L1 Validation</span>
                            </>
                        )}
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
                        onClick={verifyRequestL2}
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <IoShieldCheckmark className="text-base" />
                                <span>L2 Validation</span>
                            </>
                        )}
                    </button>

                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
                        onClick={verifyRequestMeetReqs}
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <IoShieldCheckmark className="text-base" />
                                <span>Validate Requirements</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Payload Section */}
                <div className="border-b border-gray-200">
                    <button
                        onClick={() => setShowPayload(!showPayload)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                    >
                        <div className="flex items-center gap-2">
                            <IoCodeSlash className="text-sky-500 text-base" />
                            <span className="text-sm font-semibold text-gray-700">
                                Payload Data
                            </span>
                        </div>
                        {showPayload ? (
                            <IoChevronUp className="text-gray-400" />
                        ) : (
                            <IoChevronDown className="text-gray-400" />
                        )}
                    </button>
                    {showPayload && (
                        <div className="bg-white p-4">
                            <div className="rounded overflow-hidden">
                                <JsonView value={payload} collapsed={1} />
                            </div>
                        </div>
                    )}
                </div>

                {/* L1 Validation Results Section */}
                {mdData && (
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => setShowValidation(!showValidation)}
                            className={`w-full flex items-center justify-between p-3 transition text-left ${
                                validationSuccess === false
                                    ? "bg-red-50 hover:bg-red-100"
                                    : validationSuccess === true
                                      ? "bg-green-50 hover:bg-green-100"
                                      : "bg-yellow-50 hover:bg-yellow-100"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {validationSuccess === false ? (
                                    <IoCloseCircle className="text-red-500 text-base" />
                                ) : validationSuccess === true ? (
                                    <IoCheckmarkCircle className="text-green-500 text-base" />
                                ) : (
                                    <IoAlertCircle className="text-yellow-500 text-base" />
                                )}
                                <span
                                    className={`text-sm font-semibold ${
                                        validationSuccess === false
                                            ? "text-red-700"
                                            : validationSuccess === true
                                              ? "text-green-700"
                                              : "text-yellow-700"
                                    }`}
                                >
                                    L1 Validation Results
                                </span>
                                {validationSuccess !== null && (
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            validationSuccess
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {validationSuccess ? "Passed" : "Failed"}
                                    </span>
                                )}
                            </div>
                            {showValidation ? (
                                <IoChevronUp
                                    className={
                                        validationSuccess === false
                                            ? "text-red-400"
                                            : validationSuccess === true
                                              ? "text-green-400"
                                              : "text-yellow-400"
                                    }
                                />
                            ) : (
                                <IoChevronDown
                                    className={
                                        validationSuccess === false
                                            ? "text-red-400"
                                            : validationSuccess === true
                                              ? "text-green-400"
                                              : "text-yellow-400"
                                    }
                                />
                            )}
                        </button>
                        {showValidation && (
                            <div className="p-4 bg-white prose prose-sm max-w-none">
                                <Markdown
                                    components={{
                                        a: ({
                                            href,
                                            children,
                                        }: {
                                            href?: string;
                                            children?: React.ReactNode;
                                        }) => (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sky-600 underline hover:text-sky-700 transition-colors duration-200 font-medium"
                                            >
                                                {children}
                                            </a>
                                        ),
                                        blockquote: ({
                                            children,
                                        }: {
                                            children?: React.ReactNode;
                                        }) => (
                                            <blockquote className="border-l-4 border-sky-500 bg-sky-50 pl-4 pr-4 py-3 my-3 italic text-gray-700 rounded-r">
                                                {children}
                                            </blockquote>
                                        ),
                                        ul: ({ children }: { children?: React.ReactNode }) => (
                                            <ul className="list-disc pl-5 space-y-1.5 my-3 text-sm">
                                                {children}
                                            </ul>
                                        ),
                                        ol: ({ children }: { children?: React.ReactNode }) => (
                                            <ol className="list-decimal pl-5 space-y-1.5 my-3 text-sm">
                                                {children}
                                            </ol>
                                        ),
                                        li: ({ children }: { children?: React.ReactNode }) => (
                                            <li className="text-gray-700 leading-relaxed">
                                                {children}
                                            </li>
                                        ),
                                        code: ({
                                            inline,
                                            children,
                                        }: {
                                            inline?: boolean;
                                            children?: React.ReactNode;
                                        }) =>
                                            inline ? (
                                                <code className="bg-red-100 text-red-800 px-1.5 py-0.5 text-xs font-mono rounded border border-red-200">
                                                    {children}
                                                </code>
                                            ) : (
                                                <pre className="bg-gray-900 text-gray-100 p-3 my-3 overflow-x-auto rounded border border-gray-700 text-xs">
                                                    <code className="font-mono">{children}</code>
                                                </pre>
                                            ),
                                        p: ({ children }: { children?: React.ReactNode }) => (
                                            <p className="text-gray-700 mb-2 leading-relaxed text-sm">
                                                {children}
                                            </p>
                                        ),
                                        h3: ({ children }: { children?: React.ReactNode }) => (
                                            <h3 className="text-base font-semibold text-gray-900 mb-2 mt-4 border-b border-gray-200 pb-1">
                                                {children}
                                            </h3>
                                        ),
                                        h4: ({ children }: { children?: React.ReactNode }) => (
                                            <h4 className="text-sm font-semibold text-gray-800 mb-2 mt-3">
                                                {children}
                                            </h4>
                                        ),
                                        h5: ({ children }: { children?: React.ReactNode }) => (
                                            <h5 className="text-xs font-semibold text-gray-700 mb-1.5 mt-2">
                                                {children}
                                            </h5>
                                        ),
                                        strong: ({ children }: { children?: React.ReactNode }) => (
                                            <strong className="font-semibold text-gray-900">
                                                {children}
                                            </strong>
                                        ),
                                        em: ({ children }: { children?: React.ReactNode }) => (
                                            <em className="italic text-gray-700">{children}</em>
                                        ),
                                        hr: () => <hr className="my-4 border-gray-300" />,
                                        table: ({ children }: { children?: React.ReactNode }) => (
                                            <div className="overflow-x-auto my-3">
                                                <table className="min-w-full divide-y divide-gray-300 text-xs border border-gray-300">
                                                    {children}
                                                </table>
                                            </div>
                                        ),
                                        thead: ({ children }: { children?: React.ReactNode }) => (
                                            <thead className="bg-gray-50">{children}</thead>
                                        ),
                                        tbody: ({ children }: { children?: React.ReactNode }) => (
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {children}
                                            </tbody>
                                        ),
                                        tr: ({ children }: { children?: React.ReactNode }) => (
                                            <tr>{children}</tr>
                                        ),
                                        th: ({ children }: { children?: React.ReactNode }) => (
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                                                {children}
                                            </th>
                                        ),
                                        td: ({ children }: { children?: React.ReactNode }) => (
                                            <td className="px-3 py-2 text-xs text-gray-700">
                                                {children}
                                            </td>
                                        ),
                                    }}
                                >
                                    {mdData}
                                </Markdown>
                            </div>
                        )}
                    </div>
                )}

                {/* L2 Validation Results Section */}
                {l2Result && (
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => setShowL2Results(!showL2Results)}
                            className={`w-full flex items-center justify-between p-3 transition text-left ${
                                !l2Result.valid
                                    ? "bg-red-50 hover:bg-red-100"
                                    : "bg-green-50 hover:bg-green-100"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {!l2Result.valid ? (
                                    <IoCloseCircle className="text-red-500 text-base" />
                                ) : (
                                    <IoCheckmarkCircle className="text-green-500 text-base" />
                                )}
                                <span
                                    className={`text-sm font-semibold ${!l2Result.valid ? "text-red-700" : "text-green-700"}`}
                                >
                                    {l2ResultSource === "requirements"
                                        ? "Validate Meet Requirements"
                                        : "L2 Validation Results"}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        l2Result.valid
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {l2Result.valid ? "Passed" : "Failed"}
                                </span>
                            </div>
                            {showL2Results ? (
                                <IoChevronUp
                                    className={!l2Result.valid ? "text-red-400" : "text-green-400"}
                                />
                            ) : (
                                <IoChevronDown
                                    className={!l2Result.valid ? "text-red-400" : "text-green-400"}
                                />
                            )}
                        </button>
                        {showL2Results && (
                            <div className="p-4 bg-white">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            Status Code:
                                        </span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-mono ${
                                                l2Result.code === 200
                                                    ? "bg-green-100 text-green-800 border border-green-200"
                                                    : "bg-red-100 text-red-800 border border-red-200"
                                            }`}
                                        >
                                            {l2Result.code}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-600 block mb-1">
                                            Description:
                                        </span>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                                            {l2Result.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state when no validation run yet */}
                {!mdData && !loading && (
                    <div className="p-8 text-center">
                        <IoPlayCircle className="text-gray-300 text-5xl mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">Ready to validate</p>
                        <p className="text-gray-400 text-xs mt-1">
                            Click "L1 Validation" to run validation checks
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
