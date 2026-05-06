import { Router } from "express";
import {
	clearFlow,
	createExpectation,
	createPlaygroundSession,
	createSession,
	deleteExpectation,
	getSession,
	getTransactionData,
	updateTransactionData,
	requestForFlowPermission,
	updateSession,
} from "../controllers/sessionController";
import validateRequiredParams from "../middlewares/generic";
import otelTracing from "../services/tracing-service";

const router = Router();

// Define routes and use the correct async handler types
router.post(
	"/",
	otelTracing(
		"body.transaction_id",
		"body.session_id",
		"body.bap_id",
		"body.bpp_id"
	),
	createSession
);

router.post("/playground", createPlaygroundSession);

router.post(
	"/expectation",
	validateRequiredParams([
		"subscriber_url",
		"flow_id",
		"expected_action",
		"session_id",
	]),
	otelTracing("", "query.session_id"),
	createExpectation
);

router.get("/", otelTracing("", "query.session_id"), getSession);

router.get(
	"/transaction",
	validateRequiredParams(["transaction_id", "subscriber_url"]),
	otelTracing("query.transaction_id"),
	getTransactionData
);

router.put(
	"/transaction",
	otelTracing("body.transaction_id"),
	updateTransactionData
);

router.get(
	"/flowPermission",
	validateRequiredParams(["subscriber_url", "action"]),
	otelTracing("", "", "query.subscriber_url"),
	requestForFlowPermission
);

router.put(
	"/",
	otelTracing(
		"body.transaction_id",
		"body.session_id",
		"body.bap_id",
		"body.bpp_id"
	),
	updateSession
);

router.delete(
	"/clearFlow",
	validateRequiredParams(["session_id", "flow_id"]),
	otelTracing("", "query.session_id"),
	clearFlow
);

router.delete(
	"/expectation",
	validateRequiredParams(["subscriber_url", "session_id"]),
	otelTracing("", "query.session_id"),
	deleteExpectation
);

export default router;
