// FILE: uiController.ts
import { Request, Response } from "express";
import { fetchConfigService } from "../services/flowService";
import { updateFlowService } from "../services/sessionService";
import axios from "../utils/axios";
import { TriggerInput } from "../interfaces/triggerData";
import { ACK, NACK, ERROR } from "../constants/response";
import getPredefinedFlowConfig, {
	fetchExampleConfig,
} from "../config/unittestConfig";
import logger from "@ondc/automation-logger";
import { saveLog } from "../utils/console";
import { buildMockBaseURL } from "../utils";
import { getLoggerMeta } from "../utils/logger-meta-utilts";

export const fetchConfig = (req: Request, res: Response) => {
	try {
		const config = fetchConfigService();
		res.status(200).json(config);
	} catch (error: any) {
		if (error.message === "Config not found") {
			res.status(404).json({ error: error.message });
		} else {
			res.status(500).json({ error: "Internal Server Error" });
		}
	}
};

export const generateReport = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const sessionId = req.query.sessionId as string;
	const userId = req.query.user_id as string | undefined;
	const body = req.body;
	if (!sessionId) {
		res.status(400).json({ error: "session_id is required" });
		return;
	}
	try {
		const reportParams: Record<string, string> = { sessionId };
		if (userId) {
			reportParams.user_id = userId;
		}
		const response = await axios.post(
			`${process.env.REPORTING_SERVICE}/generate-report`,
			body,
			{
				params: reportParams,
				headers: {
					"X-Request-ID": req.correlationId,
				},
			},
		);
		if (response.status === 200) {
			res.status(200).json({
				message: "Report generated successfully",
				data: response.data,
			});
		}
	} catch (error: any) {
		logger.error("Error generating report", { sessionId, body }, error);
		res
			.status(500)
			.json({ error: "Failed to generate report", details: error.message });
	}
};

export const handleTriggerRequest = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		logger.info(`Triggering action ${req.params.action}`);
		const action = req.params.action;
		if (
			!req.query.action_id ||
			!req.query.transaction_id ||
			!req.query.subscriber_url ||
			!req.query.session_id
		) {
			res.status(400).send("Bad Request");
			return;
		}
		const triggerInput: TriggerInput = req.body;

		saveLog(req.query.session_id as string, `Sending action ${action}`);

		const response = await axios.post(
			await buildMockBaseURL(
				`trigger/api-service/${action}`,
				req.query.session_id as string,
			),
			triggerInput,
			{
				params: {
					// subscriber_url: req.query.subscriber_url,
					// action_id: req.query.action_id,
					// transaction_id: req.query.transaction_id,
					...req.query,
				},
				headers: {
					"X-Request-ID": req.correlationId,
				},
			},
		);
		logger.info("response" + JSON.stringify(response.data));
		if (response.status === 200) {
			res.status(200).send(ACK);
		} else {
			res.status(response.status).send("unknown");
		}
	} catch (error: any) {
		logger.error(
			"Error handling trigger request",
			{
				action: req.params.action,
				sessionId: req.query.session_id,
				transactionId: req.query.transaction_id,
				subscriberUrl: req.query.subscriber_url,
			},
			error,
		);
		if (error.response && error.response.status === 400) {
			res.status(400).send(NACK);
		} else if (error.response && error.response.status === 500) {
			res.status(500).send(ERROR);
		} else {
			res.status(500).send(ERROR);
		}
	}
};

export const validatePayload = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const action = req.params.action;
	const payload = req.body;

	if (!action) {
		res.status(400).send({ message: "action is required param" });
		return;
	}

	const domain = payload?.context?.domain;
	const version = payload?.context?.version || payload?.context?.core_version;

	if (!domain) {
		res.status(400).send({ message: "context should have domain" });
		return;
	}

	if (!version) {
		res.status(400).send({ message: "context should have version" });
		return;
	}

	try {
		const response = await axios.post(
			`${
				process.env.API_SERVICE as string
			}/${domain}/${version}/test/${action}`,
			payload,
		);

		res.send(response.data);
	} catch (e) {
		logger.error("error while validating payload", e);
		res.status(500).send(ERROR);
	}
};

export const getPredefinedFlows = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	const config = getPredefinedFlowConfig();

	if (!config) {
		res
			.status(500)
			.send({ error: true, message: "Error while fetching config" });
	}

	res.send(config);
};

export const getExample = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const { filePath } = req.body;
	const config = fetchExampleConfig(filePath);

	if (!config) {
		res
			.status(500)
			.send({ error: true, message: "Error while fetching config" });
	}

	res.send(config);
};

export const getCurrentStateFlow = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { session_id, transaction_id } = req.query;
		const url = await buildMockBaseURL(
			"flows/current-status",
			session_id as string,
		);
		const response = await axios.get(url, {
			params: {
				session_id,
				transaction_id,
			},
			headers: {
				"X-Request-ID": req.correlationId,
			},
		});
		res.status(response.status).send(response.data);
	} catch (e) {
		logger.error(
			"error while fetching current state flow",
			{
				session_id: req.query.session_id,
				transaction_id: req.query.transaction_id,
			},
			e,
		);
		res.status(500).send(ERROR);
	}
};

export const proceedFlow = async (req: Request, res: Response) => {
	try {
		const { session_id, transaction_id } = req.body;
		console.log("proceedFlow req.body", req.body);
		if (!session_id || !transaction_id) {
			res
				.status(400)
				.send({ message: "session_id and transaction_id are required" });
			return;
		}
		console.log("before calling mock service ++++++++++++++");
		const url = await buildMockBaseURL("flows/proceed", session_id as string);
		console.log("after calling mock service", url);
		const response = await axios.post(url, req.body, {
			headers: {
				"X-Request-ID": req.correlationId,
			},
		});
		console.log("after calling mock service response", response.data);
		res.status(response.status).send(response.data);
	} catch (e) {
		logger.error(
			"error while proceeding flow",
			{
				session_id: req.body.session_id,
				transaction_id: req.body.transaction_id,
			},
			e,
		);
		res.status(500).send(ERROR);
	}
};

export const newFlow = async (req: Request, res: Response) => {
	try {
		const { session_id, transaction_id, flow_id } = req.body;
		if (!session_id || !transaction_id || !flow_id) {
			res.status(400).send({
				message: "session_id, transaction_id and flow_id are required",
			});
			return;
		}
		const url = await buildMockBaseURL("flows/new", session_id as string);
		const response = await axios.post(url, req.body, {
			headers: {
				"X-Request-ID": req.correlationId,
			},
		});
		res.status(response.status).send(response.data);
	} catch (e) {
		logger.error(
			"error while creating new flow",
			{
				session_id: req.body.session_id,
				transaction_id: req.body.transaction_id,
				flow_id: req.body.flow_id,
			},
			e,
		);
		res.status(500).send(ERROR);
	}
};

export const updateFlow = async (req: Request, res: Response) => {
	const { session_id, flows } = req.body;
	try {
		await updateFlowService(session_id, flows, getLoggerMeta(req));
		res.send({ message: "flow updated." });
	} catch (e) {
		logger.error(
			"error while creating new flow",
			{
				session_id: req.body.session_id,
			},
			e,
		);
		res.status(500).send(ERROR);
	}
};

export const getActions = async (req: Request, res: Response) => {
	try {
		const { domain, version } = req.body;

		const response = await axios.get(
			`${
				process.env.MOCK_SERVICE as string
			}/${domain}/${version}/config/mock-actions`,
		);

		res.send(response.data);
	} catch (e) {
		console.error("Something went wrong while fetching actions: ", e);
		res.status(500).send("Something went wrong");
	}
};
