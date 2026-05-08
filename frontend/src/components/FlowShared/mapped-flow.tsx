import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { FlowMap, MappedStep } from "@/types/flow-state-type";
import FormConfig, { FormConfigType } from "@components/ui/forms/config-form/config-form";
import Popup from "@components/ui/pop-up/pop-up";
import { SubmitEventParams } from "@/types/flow-types";
import { proceedFlow } from "@utils/request-utils";
import { useSession } from "@context/context";

import PairedCard from "@components/FlowShared/pair-card";

export default function DisplayFlow({
    mappedFlow,
    flowId,
}: {
    mappedFlow: FlowMap;
    flowId: string;
}) {
    // mappedFlow = dummy;
    const steps = getOrderedSteps(mappedFlow);
    const [inputPopUp, setInputPopUp] = useState(false);
    const [activeFormConfig, setActiveFormConfig] = useState<FormConfigType | undefined>(undefined);

    const { sessionId, sessionData } = useSession();

    useEffect(() => {
        const conf = mappedFlow?.sequence?.filter(
            (s, index) => {
                if (s.status !== "INPUT-REQUIRED") return false;
                if (index === 0) {
                    const transactionId = sessionData?.flowMap[flowId];
                    return !!transactionId;
                }
                return true;
            }
        )?.[0]?.input;
        if (conf?.length === 0) {
            if (sessionData?.activeFlow !== flowId) return;
            handleFormSubmit({ jsonPath: {}, formData: {} });
            return;
        }
        setActiveFormConfig(conf);
        if (conf) {
            setInputPopUp(true);
        }
    }, [mappedFlow]);

    useEffect(() => {
        const latestSending = mappedFlow?.sequence.find((f) => f.status === "RESPONDING");
        const transactionId = sessionData?.flowMap[flowId];
        if (latestSending && latestSending.force_proceed && transactionId) {
            proceedFlow(sessionId, transactionId);
        }
    }, [mappedFlow]);

    const handleFormSubmit = async (formData: SubmitEventParams) => {
        try {
            const txId = sessionData?.flowMap[flowId];
            if (!txId) {
                console.error("Transaction ID not found");
                return;
            }
            await proceedFlow(sessionId, txId, formData.jsonPath, formData.formData);
            setInputPopUp(false);
            setActiveFormConfig(undefined);
        } catch (error) {
            toast.error("Error submitting form ");
            console.error("Error submitting form data:", error);
            setInputPopUp(false);
        }
    };
    return (
        <>
            <div className="flex flex-col relative pl-8 border-l-2 border-sky-500/20 ml-4 py-2">
                {steps.map((pairedStep, index) => {
                    const { first, second } = pairedStep;

                    const getStatusStyle = (step: any) => {
                        if (step.status === "COMPLETE") {
                            const isError = step.payloads?.subStatus === "ERROR" || step.payloads?.payloads?.some((p: any) => p.subStatus === "ERROR");
                            return isError ? "FAILED" : "SUCCESS";
                        }
                        if (["LISTENING", "RESPONDING", "INPUT-REQUIRED", "PROCESSING"].includes(step.status)) {
                            return "ACTIVE";
                        }
                        return "PENDING";
                    };

                    const firstStatus = getStatusStyle(first);
                    const secondStatus = second ? getStatusStyle(second) : null;

                    let dotClass = "bg-white border-2 border-slate-200 text-slate-400 shadow-sm";
                    let icon: string | React.ReactNode = index + 1;

                    if (firstStatus === "FAILED" || secondStatus === "FAILED") {
                        dotClass = "bg-rose-50 border-2 border-red-500 text-red-600 shadow-sm animate-pulse";
                        icon = "✗";
                    } else if (firstStatus === "ACTIVE" || secondStatus === "ACTIVE") {
                        dotClass = "bg-sky-50 border-2 border-sky-500 text-sky-600 shadow-md animate-pulse";
                        icon = <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />;
                    } else if (firstStatus === "SUCCESS" && (!second || secondStatus === "SUCCESS")) {
                        dotClass = "bg-green-50 border-2 border-green-500 text-green-600 shadow-sm";
                        icon = "✓";
                    }

                    return (
                        <div key={index} className="relative mb-6 last:mb-0">
                            {/* Circle Node perfectly centered on the continuous left border line */}
                            <div className="absolute -left-[44px] top-[14px] z-10 flex items-center justify-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 hover:scale-110 cursor-pointer ${dotClass}`}>
                                    {icon}
                                </div>
                            </div>

                            {/* Right Side Card Details */}
                            <div className="flex-1 min-w-0">
                                <PairedCard pairedStep={pairedStep} flowId={flowId} />
                            </div>
                        </div>
                    );
                })}
            </div>
            {inputPopUp && activeFormConfig && (
                <Popup isOpen={inputPopUp} disableClose>
                    <FormConfig
                        formConfig={activeFormConfig}
                        submitEvent={handleFormSubmit}
                        referenceData={mappedFlow.reference_data}
                        flowId={flowId}
                    />
                </Popup>
            )}
        </>
    );
}

export type PairedStep = {
    first: MappedStep;
    second?: MappedStep;
};

function getOrderedSteps(mappedFlow: FlowMap): PairedStep[] {
    const sequence = [...mappedFlow.sequence, ...mappedFlow.missedSteps];
    const visited = new Set<string>();
    const steps: PairedStep[] = [];

    for (const step of sequence) {
        if (visited.has(`${step.actionId}_${step.index}`)) continue;

        visited.add(`${step.actionId}_${step.index}`);

        let pairStep: MappedStep | undefined;
        if (step.pairActionId) {
            pairStep = sequence.find((s) => s.actionId === step.pairActionId);
            if (pairStep && !visited.has(pairStep.actionId)) {
                visited.add(`${pairStep.actionId}_${pairStep.index}`);
            }
        }

        steps.push({
            first: step,
            second: pairStep,
        });
    }

    return steps.sort((a, b) => {
        return a.first.index - b.first.index;
    });
}
