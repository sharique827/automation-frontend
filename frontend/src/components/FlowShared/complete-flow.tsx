import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { FaRegStopCircle } from "react-icons/fa";
import { IoPlay } from "react-icons/io5";
import { AiOutlineDelete } from "react-icons/ai";
import { IoMdDownload } from "react-icons/io";
import { FcWorkflow } from "react-icons/fc";
import { MdSyncAlt, MdHistory } from "react-icons/md";


import { Flow, SubmitEventParams } from "@/types/flow-types";
import { SessionCache } from "@/types/session-types";
import IconButton from "@components/ui/mini-components/icon-button";
import {
    clearFlowData,
    deleteExpectation,
    getCompletePayload,
    getMappedFlow,
    getTransactionData,
    updateTransactionData,
    newFlow,
    proceedFlow,
    requestForFlowPermission,
    putCacheData,
    addFlowToSessionInDB,
} from "@utils/request-utils";
import { FlowMap } from "@/types/flow-state-type";
import DisplayFlow from "@components/FlowShared/mapped-flow";
import { getSequenceFromFlow } from "@utils/flow-utils";
import CircularProgress from "@components/ui/circular-cooldown";
import Popup from "@components/ui/pop-up/pop-up";
import FormConfig, { FormConfigType } from "@components/ui/forms/config-form/config-form";
import { trackEvent } from "@utils/analytics";
import { generatePlaygroundConfigFromFlowConfig } from "@ondc/automation-mock-runner";

interface AccordionProps {
    flow: Flow;
    activeFlow: string | null;
    setActiveFlow: (flowId: string | null) => void;
    sessionCache?: SessionCache | null;
    sessionId: string;
    setSideView: React.Dispatch<unknown>;
    subUrl: string;
    onFlowStop: () => void;
    onFlowClear: () => void;
}

export function Accordion({
    flow,
    activeFlow,
    setActiveFlow,
    sessionCache,
    sessionId,
    subUrl,
    onFlowStop,
    onFlowClear,
}: AccordionProps) {
    const [inputPopUp, setInputPopUp] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [mappedFlow, setMappedFlow] = useState<FlowMap>({
        sequence: getSequenceFromFlow(
            sessionCache?.flowConfigs[flow.id] ?? flow,
            sessionCache,
            activeFlow
        ),
        missedSteps: [],
    });
    const [activeFormConfig, setActiveFormConfig] = useState<FormConfigType | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [maxHeight, setMaxHeight] = useState("0px");
    const apiCallFailCount = useRef(0);
    const clickCountRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Prevents the sessionCache useEffect from resetting mappedFlow during a Replay operation
    const isReplayingRef = useRef(false);
    // Persists the replayed transaction ID until the parent sessionCache syncs from the backend
    const replayedTxIdRef = useRef<string | null>(null);

    const [replayPopupOpen, setReplayPopupOpen] = useState(false);
    const [selectedReplayStep, setSelectedReplayStep] = useState<number | "">("");

    const handleSelectiveReplay = async () => {
        if (selectedReplayStep === "") {
            toast.error("Please select a valid action to replay from.");
            return;
        }

        const transactionId = sessionCache?.lastFlowMap?.[flow.id];
        if (!transactionId || !sessionCache) return;

        // Step 1: Validate range of the originally executed flow
        const selectedStep = mappedFlow.sequence.find((s) => s.index === selectedReplayStep);
        if (!selectedStep) {
            toast.error("Selected step not found in the flow sequence.");
            return;
        }

        if (selectedStep.status !== "COMPLETE") {
            toast.error("Cannot replay from selected action as it was not part of the executed flow.");
            return;
        }

        // Close popup
        setReplayPopupOpen(false);

        // Block useEffect + CircularProgress polling
        isReplayingRef.current = true;

        try {
            toast.info(`Preparing selective replay from ${selectedStep.actionType}...`);

            // Step 2: Fetch the full transaction data from the backend
            const txData = await getTransactionData(transactionId, sessionCache.subscriberUrl);
            if (!txData || !txData.apiList) {
                throw new Error("Failed to fetch transaction data for selective replay");
            }

            // Step 3: Filter/Truncate apiList to keep only elements strictly BEFORE the selected action's timestamp
            const boundaryTime = new Date(selectedStep.payloads?.timestamp ?? "").getTime();
            const truncatedApiList = txData.apiList.filter((item: any) => {
                return new Date(item.timestamp).getTime() < boundaryTime;
            });

            // Step 4: Update the transaction cache in Redis with the truncated apiList
            await updateTransactionData(transactionId, sessionCache.subscriberUrl, truncatedApiList);

            // Step 5: Restore txId back into flowMap + set activeFlow in Redis
            replayedTxIdRef.current = transactionId;
            await putCacheData(
                {
                    flowMap: {
                        ...(sessionCache.flowMap ?? {}),
                        [flow.id]: transactionId,
                    },
                    activeFlow: flow.id,
                },
                sessionId
            );

            // Step 6: Load and display updated transaction data immediately
            const updatedTxData = await getMappedFlow(transactionId, sessionId);
            for (let i = 0; i < updatedTxData.sequence.length; i++) {
                const payloads = updatedTxData.sequence[i].payloads;
                if (payloads && !payloads.entryType) {
                    updatedTxData.sequence[i].payloads!.entryType = "API";
                }
            }
            setMappedFlow(updatedTxData);
            setActiveFlow(flow.id);
            setIsOpen(true);

            // Step 7: Proceed the flow
            await proceedFlow(sessionId, transactionId);
            toast.success("Selective replay started successfully!");
        } catch (error: any) {
            console.error("Selective replay error:", error);
            toast.error(`Failed to perform selective replay: ${error.message || error}`);
        } finally {
            isReplayingRef.current = false;
        }
    };

    useEffect(() => {
        // Skip if a Replay is in progress — it manages mappedFlow directly
        if (isReplayingRef.current) return;

        const executedFlowId = Object.keys(
            (sessionCache?.flowMap as Record<string, string | null>) || {}
        );

        if ((executedFlowId.includes(flow.id) || replayedTxIdRef.current) && sessionCache) {
            getCurrentState(sessionCache);
        }

        if (sessionCache?.activeFlow) {
            setActiveFlow(sessionCache.activeFlow);
        } else {
            setActiveFlow(null);
        }
    }, [flow, sessionCache]);

    const getCurrentState = async (sessionCache: SessionCache) => {
        const tx = sessionCache.flowMap?.[flow.id] || replayedTxIdRef.current;
        if (tx) {
            // Once the sessionCache flowMap catches up with our replayed transaction ID, we can clear the fallback
            if (sessionCache.flowMap?.[flow.id] === replayedTxIdRef.current) {
                replayedTxIdRef.current = null;
            }
            try {
                const txData = await getMappedFlow(tx, sessionId);
                for (let i = 0; i < txData.sequence.length; i++) {
                    const payloads = txData.sequence[i].payloads;
                    if (payloads) {
                        if (!payloads.entryType) {
                            txData.sequence[i].payloads!.entryType = "API";
                        }
                    }
                }
                setMappedFlow(txData);
                apiCallFailCount.current = 0; // Reset fail count on successful fetch
            } catch (error) {
                apiCallFailCount.current = apiCallFailCount.current + 1;
                console.error("Failed to fetch transaction data:", error);
            }
        } else {
            setMappedFlow({
                sequence: getSequenceFromFlow(flow, sessionCache, activeFlow),
                missedSteps: [],
            });
        }
    };

    const fetchTransactionData = async () => {
        // Don't interfere while a Replay is loading data
        if (isReplayingRef.current) return;
        if (activeFlow !== flow.id || !sessionCache) {
            return;
        }
        getCurrentState(sessionCache);
    };

    useEffect(() => {
        if (contentRef.current) {
            setMaxHeight(isOpen ? `${contentRef.current.scrollHeight}px` : "0px");
        }
    }, [isOpen, mappedFlow]);

    async function handleFormForNewFlow(formData: SubmitEventParams) {
        try {
            await newFlow(sessionId, flow.id, uuidv4(), formData.jsonPath, formData.formData);
            setInputPopUp(false);
            toast.success("Flow started successfully");
        } catch (e) {
            toast.error("Error while submitting form");
            setInputPopUp(false);
            console.error(e);
        }
    }

    const startFlow = async () => {
        try {
            if (!sessionCache) return;
            const canStart = await canStartFlow(sessionCache, mappedFlow);

            if (!canStart) return;
            setActiveFlow(flow.id);
            const given = sessionCache.flowMap[flow.id];
            if (given) {
                toast.info("Resuming the flow!");
                await proceedFlow(sessionId, given);
            } else {
                const txId = uuidv4();
                const data = await newFlow(sessionId, flow.id, txId);
                if (data?.inputs) {
                    toast.info("Inputs are required to start the flow");
                    setActiveFormConfig(data.inputs);
                    setInputPopUp(true);
                }
                // if (data.expectationAdded) {
                // 	toast.info("Expectation added successfully");
                // }
            }
            putCacheData({ activeFlow: flow.id }, sessionId);
            setIsOpen(true);
        } catch (e) {
            toast.error("Error while starting flow");
            console.error(e);
        }
    };

    if (!sessionCache) {
        return (
            <div className="bg-white rounded-md shadow-sm border border-sky-100 p-5 mb-4">
                <style>
                    {`
						@keyframes shimmer {
							0% { background-position: -200px 0; }
							100% { background-position: calc(200px + 100%) 0; }
						}
						.skeleton {
							background: linear-gradient(90deg, #e0f2fe 25%, #b3e5fc 50%, #e0f2fe 75%);
							background-size: 200px 100%;
							animation: shimmer 1.5s infinite;
						}
					`}
                </style>
                <div className="space-y-4">
                    {/* Header skeleton */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 rounded skeleton"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 rounded skeleton"></div>
                                <div className="h-3 w-24 rounded skeleton"></div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-md skeleton"></div>
                            <div className="w-8 h-8 rounded-md skeleton"></div>
                            <div className="w-8 h-8 rounded-md skeleton"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handlePlaygroundConversion = async () => {
        const payload_ids = mappedFlow?.sequence.flatMap((s) => {
            if (s.payloads?.entryType === "FORM") {
                return [];
            }
            return s.payloads?.payloads.map((p) => p.payloadId) ?? [];
        });

        if (!payload_ids) {
            return;
        }
        const jsonData = (await getCompletePayload(payload_ids)) as {
            req: {
                context: {
                    domain: string;
                    action: string;
                    version?: string;
                    core_version?: string;
                    timestamp: string;
                };
            };
        }[];
        const allPayloads = jsonData.map((data) => data.req);
        const playroundConfig = await generatePlaygroundConfigFromFlowConfig(allPayloads, flow);
        const blob = new Blob([JSON.stringify(playroundConfig, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${flow?.id}-playground-config.json`;
        document.body.appendChild(a);

        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleDownload = async () => {
        const payload_ids = mappedFlow?.sequence.flatMap((s) => {
            if (s.payloads?.entryType === "FORM") {
                return [];
            }
            return s.payloads?.payloads.map((p) => p.payloadId) ?? [];
        });

        if (!payload_ids) {
            return;
        }

        const jsonData = await getCompletePayload(payload_ids);
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${flow?.id}-${activeFlow}.json`;
        document.body.appendChild(a);

        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    function AccordionButtons() {
        return (
            <div className="flex items-center">
                <div className="flex items-center justify-center p-2 ml-2 rounded-md shadow-sm bg-sky-50 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sky-600 ease-in">
                    <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
                        {getPercent(mappedFlow).toFixed(0)}%
                    </div>
                </div>
                {!activeFlow && (
                    <IconButton
                        icon={<IoPlay className=" text-md" />}
                        label="Start flow"
                        color="sky"
                        onClick={async (e) => {
                            addFlowToSessionInDB(sessionId, {
                                id: flow.id,
                                status: "PENDING",
                            });
                            trackEvent({
                                category: "SCENARIO_TESTING-FLOWS",
                                action: `Started a flow: ${flow.id}`,
                            });
                            e.stopPropagation();
                            await startFlow();
                        }}
                    />
                )}
                {!activeFlow && sessionCache?.lastFlowMap?.[flow.id] && !sessionCache?.flowMap[flow.id] && (
                    <>
                        <IconButton
                            icon={<MdSyncAlt className="text-md" />}
                            label="Replay Full Flow"
                            color="orange"
                            onClick={async (e) => {
                                e.stopPropagation();
                                const transactionId = sessionCache.lastFlowMap?.[flow.id];
                                if (!transactionId) return;

                                // Hold the transaction ID in our ref fallback
                                replayedTxIdRef.current = transactionId;
                                // Block useEffect + CircularProgress polling for the entire operation
                                isReplayingRef.current = true;
                                
                                try {
                                    toast.info("Replaying flow...");

                                    // Step 1: Restore txId back into flowMap + set activeFlow in Redis
                                    await putCacheData(
                                        {
                                            flowMap: {
                                                ...(sessionCache.flowMap ?? {}),
                                                [flow.id]: transactionId,
                                            },
                                            activeFlow: flow.id,
                                        },
                                        sessionId
                                    );

                                    // Step 2: Load and display previous transaction data immediately
                                    const txData = await getMappedFlow(transactionId, sessionId);
                                    for (let i = 0; i < txData.sequence.length; i++) {
                                        const payloads = txData.sequence[i].payloads;
                                        if (payloads && !payloads.entryType) {
                                            txData.sequence[i].payloads!.entryType = "API";
                                        }
                                    }
                                    setMappedFlow(txData);
                                    setActiveFlow(flow.id);
                                    setIsOpen(true);

                                    // Step 3: Proceed the flow — guard stays active until this completes
                                    await proceedFlow(sessionId, transactionId);
                                } catch (error) {
                                    console.error("Replay error:", error);
                                    toast.error("Failed to replay flow");
                                    // Clear fallback on error
                                    replayedTxIdRef.current = null;
                                } finally {
                                    // Release only after everything is done
                                    isReplayingRef.current = false;
                                }
                            }}
                        />
                        <IconButton
                            icon={<MdHistory className="text-md" />}
                            label="Replay from Action"
                            color="orange"
                            onClick={async (e) => {
                                e.stopPropagation();
                                setSelectedReplayStep("");
                                
                                const transactionId = sessionCache.lastFlowMap?.[flow.id];
                                if (transactionId) {
                                    try {
                                        toast.info("Loading previous execution history...");
                                        const txData = await getMappedFlow(transactionId, sessionId);
                                        for (let i = 0; i < txData.sequence.length; i++) {
                                            const payloads = txData.sequence[i].payloads;
                                            if (payloads && !payloads.entryType) {
                                                txData.sequence[i].payloads!.entryType = "API";
                                            }
                                        }
                                        setMappedFlow(txData);
                                    } catch (err) {
                                        console.error("Failed to fetch previous execution history:", err);
                                    }
                                }
                                setReplayPopupOpen(true);
                            }}
                        />
                    </>
                )}
                {activeFlow === flow.id && (
                    <IconButton
                        icon={<FaRegStopCircle className=" text-xl" />}
                        label="Stop flow"
                        color="red"
                        onClick={async (e) => {
                            trackEvent({
                                category: "SCENARIO_TESTING-FLOWS",
                                action: `Stopped a flow: ${flow.id}`,
                            });
                            e.stopPropagation(); // Prevent accordion toggle
                            setActiveFlow(null);
                            setIsOpen(false);
                            await deleteExpectation(sessionId, subUrl);
                            putCacheData({ activeFlow: "NONE" }, sessionId);
                            onFlowStop();
                        }}
                    />
                )}
                {!activeFlow && (
                    <IconButton
                        icon={<AiOutlineDelete className=" text-md" />}
                        label="Clear flow data"
                        color="orange"
                        onClick={async (e) => {
                            trackEvent({
                                category: "SCENARIO_TESTING-FLOWS",
                                action: `Cleared a flow: ${flow.id}`,
                            });
                            e.stopPropagation();
                            setMappedFlow({
                                sequence: getSequenceFromFlow(
                                    sessionCache?.flowConfigs[flow.id] ?? flow,
                                    sessionCache,
                                    activeFlow
                                ),
                                missedSteps: [],
                            });
                            replayedTxIdRef.current = null; // Clear fallback on manual clear
                            // Backend clearFlowData automatically saves txId to lastFlowMap
                            await clearFlowData(sessionId, flow.id);
                            onFlowClear();
                        }}
                    />
                )}
                {mappedFlow?.sequence && mappedFlow?.sequence?.length > 0 && (
                    <IconButton
                        icon={<IoMdDownload className=" text-md" />}
                        label="Download Logs"
                        color="green"
                        onClick={async (e) => {
                            trackEvent({
                                category: "SCENARIO_TESTING-FLOWS",
                                action: `Download logs for flow: ${flow.id}`,
                            });
                            e.stopPropagation();
                            handleDownload();
                        }}
                    />
                )}
                <CircularProgress
                    key={flow.id}
                    sqSize={24}
                    strokeWidth={3}
                    duration={3}
                    onComplete={async () => {
                        if (apiCallFailCount.current < 5) {
                            await fetchTransactionData();
                        }
                    }}
                    loop={true}
                    isActive={activeFlow === flow.id}
                    id="fetch-transaction-data"
                />
            </div>
        );
    }

    async function onAccordionClick() {
        setIsOpen((prev) => !prev);
    }

    async function playgroundClick() {
        try {
            clickCountRef.current += 1;

            // Reset timer on every click
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                clickCountRef.current = 0;
            }, 300); // ⏱️ max gap allowed between clicks

            if (clickCountRef.current === 4) {
                toast.info("Generating playground config...");
                await handlePlaygroundConversion();
                clickCountRef.current = 0; // reset after success
            }
        } catch (err) {
            console.error("Error in downloading playground config", err);
            toast.error("Error in downloading playground config");
        }
    }

    const bg = activeFlow === flow.id ? "bg-blue-50" : "bg-white";
    return (
        <div className="rounded-md mb-4 w-full ml-1">
            <div
                className={`${bg} border rounded-md shadow-sm hover:bg-sky-100 cursor-pointer transition-colors px-5 py-3`}
                onClick={async () => await onAccordionClick()}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${flow.id}`}
            >
                {/* Top Row: Title + Button */}
                <div className="flex items-center justify-between">
                    {/* Text Block */}
                    <div>
                        <div className="flex items-center gap-2 text-base font-bold text-sky-700">
                            <FcWorkflow onClick={playgroundClick} className="text-lg" />
                            {flow.id.split("_").join(" ")}
                        </div>
                        <h2 className="text-black font-medium">{flow?.title}</h2>
                    </div>
                    {/* Accordion Button */}
                    <AccordionButtons />
                </div>

                {/* Progress Bar below */}
                <div className="mt-2">
                    <ProgressBar percent={getPercent(mappedFlow)} />
                </div>
            </div>

            {/* Accordion content with drop animation */}
            <div
                ref={contentRef}
                id={`accordion-content-${flow.id}`}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: `${maxHeight}` }}
            >
                <div className="px-4 py-5 bg-white">
                    <p className="text-gray-700 mb-6">{flow.description}</p>

                    <div className="space-y-4 relative">
                        {<DisplayFlow mappedFlow={mappedFlow} flowId={flow.id} />}
                    </div>
                </div>
            </div>
            {inputPopUp && activeFormConfig && (
                <Popup isOpen={inputPopUp} disableClose>
                    <FormConfig
                        formConfig={activeFormConfig}
                        submitEvent={handleFormForNewFlow}
                        referenceData={mappedFlow.reference_data}
                        flowId={flow.id}
                    />
                </Popup>
            )}
            {replayPopupOpen && (
                <Popup isOpen={replayPopupOpen} onClose={() => setReplayPopupOpen(false)}>
                    <div className="p-4">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Replay from Specific Action</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Select an action to start the replay from. The system will retain all previous steps and resume execution from this action onward.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Starting Action
                            </label>
                            <select
                                value={selectedReplayStep}
                                onChange={(e) => setSelectedReplayStep(Number(e.target.value))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer font-medium"
                            >
                                <option value="" className="bg-white text-gray-500">Select an action...</option>
                                {mappedFlow.sequence
                                    .filter((step) => !step.actionType.startsWith("on_"))
                                    .map((step) => {
                                        const isComplete = step.status === "COMPLETE";
                                        return (
                                            <option
                                                key={step.index}
                                                value={step.index}
                                                disabled={!isComplete}
                                                className={!isComplete ? "bg-white text-gray-400" : "bg-white text-gray-900 font-medium"}
                                            >
                                                {step.label || step.actionType} {!isComplete ? " (Not Executed)" : ""}
                                            </option>
                                        );
                                    })}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setReplayPopupOpen(false)}
                                className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSelectiveReplay}
                                disabled={selectedReplayStep === ""}
                                className={`px-4 py-2 rounded-md text-white font-medium transition ${
                                    selectedReplayStep === ""
                                        ? "bg-gray-300 cursor-not-allowed"
                                        : "bg-sky-600 hover:bg-sky-700"
                                }`}
                            >
                                Start Replay
                            </button>
                        </div>
                    </div>
                </Popup>
            )}
        </div>
    );
}

async function canStartFlow(sessionData: SessionCache, mappedFlow: FlowMap) {
    const action = mappedFlow.sequence[0].actionType;
    if (mappedFlow.sequence[0].expect && sessionData.npType === "BAP") {
        return await requestForFlowPermission(action, sessionData.subscriberUrl);
    }
    return true;
}

function ProgressBar({ percent }: { percent: number }) {
    return (
        <div className="w-full bg-gray-200 rounded-full h-2">
            <div
                className="h-2 rounded-full transition-width duration-300"
                style={{
                    width: `${percent}%`,
                    backgroundImage: "linear-gradient(to right, #38bdf8, #0369a1)", // Gradient from sky-500 to sky-700
                }}
            ></div>
        </div>
    );
}

function getPercent(mappedFlow: FlowMap) {
    const totalSteps = mappedFlow.sequence.length;
    if (totalSteps === 0) return 0;
    const completedSteps = mappedFlow.sequence.filter((step) => step.status === "COMPLETE").length;
    return (completedSteps / totalSteps) * 100;
}




