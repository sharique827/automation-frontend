import { useContext, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { toast } from "react-toastify";

import { Flow } from "@/types/flow-types";
import { ApiData, SessionCache } from "@/types/session-types";
import { getTransactionData } from "@utils/request-utils";
import Modal from "@components/Modal";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid";
import LoadingButton from "@components/ui/forms/loading-button";
import { UserContext } from "@context/userContext";

type ReportRequestBody = Record<string, string[]>;

interface ReportResponseData {
    data?: {
        html?: string;

        message?: {
            ack?: {
                status?: "ACK" | "NACK";
            };
        };
    };
}

type ReportResponse = AxiosResponse<ReportResponseData>;

const GenerateReportModal = ({
    flows,
    subUrl,
    sessionId,
    cacheSessionData,
    open,
    onClose,
    startPolling,
    setGotReport,
}: {
    flows: Flow[];
    subUrl: string;
    sessionId: string;
    cacheSessionData: SessionCache | null;
    open: boolean;
    onClose: () => void;
    startPolling: () => void;
    setGotReport: (gotReport: boolean) => void;
}) => {
    const { userDetails } = useContext(UserContext);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        if (completedReportableFlows?.length == 0) {
            toast.error("No completed reportable flows ready for report generation");
            onClose();
            return;
        }

        setLoading(true);
        try {
            const body: ReportRequestBody = {};

            if (!cacheSessionData) {
                setLoading(false);
                toast.error("Error while generating report");
                return;
            }
            let apiList: ApiData[] | undefined = undefined;

            for (const flow in cacheSessionData.flowMap) {
                const transactionId = cacheSessionData.flowMap[flow];
                if (!transactionId) continue;
                const transData = await getTransactionData(transactionId, subUrl);
                if (!transData) continue;
                apiList = transData.apiList;

                body[flow] = (apiList || []).map((data) => {
                    return data.payloadId;
                });
            }

            const params: Record<string, string> = { sessionId };
            if (userDetails?.username) {
                params.user_id = userDetails.username;
            }

            axios
                .post(`${import.meta.env.VITE_BACKEND_URL}/flow/report`, body, {
                    params,
                })
                .then((response: ReportResponse) => {
                    setLoading(false);

                    if (response?.data?.data?.html) {
                        toast.info("Report Generated");

                        const decodedHtml = response.data.data.html;
                        const blob = new Blob([decodedHtml], {
                            type: "text/html",
                        });
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                            onClose();
                        }, 5000);
                    } else if (response?.data?.data?.message?.ack?.status === "ACK") {
                        toast.info("Generating report. It can take upto 90 sec. Please wait...");
                        setGotReport(false);

                        setTimeout(() => {
                            startPolling();
                        }, 30000);

                        onClose();
                    } else if (response?.data?.data?.message?.ack?.status === "NACK") {
                        toast.error("Error while generating report");
                        onClose();
                    }
                })
                .catch((e) => {
                    setLoading(false);
                    console.error(e);
                    toast.error("Error while generating report");
                });
        } catch (error) {
            setLoading(false);
            console.error(error);
            toast.error("Error while generating report");
        }
    };

    const getCompletedReportableFlows = (): Flow[] => {
        if (!cacheSessionData || !cacheSessionData.flowMap) {
            return [];
        }

        return flows.filter((flow) => {
            // Check if flow is completed (exists in flowMap with a transaction ID)
            const isCompleted =
                flow.id in cacheSessionData.flowMap && cacheSessionData.flowMap[flow.id] !== null;

            // Check if flow has "reportable" tag
            const hasReportableTag = flow.tags?.includes("REPORTABLE") ?? false;

            return isCompleted && hasReportableTag;
        });
    };

    const completedReportableFlows = getCompletedReportableFlows();

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-xl">
            <div className="w-full">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Report</h2>

                {completedReportableFlows.length > 0 ? (
                    <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-5 mb-6 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <div className="rounded-full bg-green-100 p-1.5">
                                    <CheckCircleIcon
                                        aria-hidden="true"
                                        className="size-5 text-green-600"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-green-900 mb-3">
                                    {completedReportableFlows.length} completed flow
                                    {completedReportableFlows.length > 1 ? "s" : ""} ready for
                                    report generation
                                </h3>
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {completedReportableFlows.map((flow) => (
                                        <div
                                            key={flow.id}
                                            className="flex items-start gap-3 px-3 py-2.5 bg-white rounded-md border border-green-100 hover:border-green-200 hover:shadow-sm transition-all duration-150"
                                        >
                                            <span className="text-sm font-medium text-gray-800 break-words min-w-0 flex-1">
                                                {flow.title || flow.id}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg bg-gradient-to-br from-red-50 to-red-10 border border-red-200 p-5 mb-6 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <div className="rounded-full bg-red-100 p-1.5">
                                    <ExclamationCircleIcon
                                        aria-hidden="true"
                                        className="size-5 text-red-400"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-red-700">
                                    None of the flows run in this session are reportable
                                </h3>
                                <p className="text-sm text-red-600 mt-1">
                                    Complete flows with the "REPORTABLE" tag to generate reports.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <LoadingButton
                        buttonText="Ok"
                        isLoading={loading}
                        onClick={generateReport}
                        disabled={loading}
                        loadingText="Generating Report..."
                    />
                </div>
            </div>
        </Modal>
    );
};

export default GenerateReportModal;
