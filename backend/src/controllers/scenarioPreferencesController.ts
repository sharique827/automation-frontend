import { Request, Response } from "express";
import axios from "axios";
import logger from "@ondc/automation-logger";

const DEVELOPER_GUIDE_SERVICE = process.env.DEVELOPER_GUIDE_SERVICE as string;

export const getScenarioPreferences = async (req: Request, res: Response) => {
    try {
        const response = await axios.get(
            `${DEVELOPER_GUIDE_SERVICE}/user/scenario-preferences`,
            {
                headers: { Authorization: req.headers.authorization || "" },
            }
        );
        res.send(response.data);
    } catch (e: any) {
        logger.error("Error fetching scenario preferences", {}, e);
        const status = e?.response?.status || 500;
        res.status(status).send(e?.response?.data || { error: true, message: e?.message });
    }
};

export const upsertScenarioPreference = async (req: Request, res: Response) => {
    try {
        const { config_key } = req.params;
        const response = await axios.put(
            `${DEVELOPER_GUIDE_SERVICE}/user/scenario-preferences/${config_key}`,
            req.body,
            {
                headers: {
                    Authorization: req.headers.authorization || "",
                    "Content-Type": "application/json",
                },
            }
        );
        res.send(response.data);
    } catch (e: any) {
        logger.error("Error upserting scenario preference", { config_key: req.params.config_key }, e);
        const status = e?.response?.status || 500;
        res.status(status).send(e?.response?.data || { error: true, message: e?.message });
    }
};

export const deleteScenarioPreference = async (req: Request, res: Response) => {
    try {
        const { config_key } = req.params;
        const response = await axios.delete(
            `${DEVELOPER_GUIDE_SERVICE}/user/scenario-preferences/${config_key}`,
            {
                headers: { Authorization: req.headers.authorization || "" },
            }
        );
        res.send(response.data);
    } catch (e: any) {
        logger.error("Error deleting scenario preference", { config_key: req.params.config_key }, e);
        const status = e?.response?.status || 500;
        res.status(status).send(e?.response?.data || { error: true, message: e?.message });
    }
};
