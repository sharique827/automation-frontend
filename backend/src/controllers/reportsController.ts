import { Request, Response } from "express";
import axiosWithApiKey from "../utils/axios";
import logger from "@ondc/automation-logger";

const DB_SERVICE = process.env.DB_SERVICE as string;

export const getPastReports = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const response = await axiosWithApiKey.get(`${DB_SERVICE}/report/user/${user_id}`, {
            headers: { Authorization: req.headers.authorization || "" },
        });
        res.send(response.data);
    } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404 || status === 204) {
            res.send([]);
            return;
        }
        logger.error("Error fetching past reports", { user_id: req.params.user_id }, e);
        res.status(status || 500).send(e?.response?.data || { error: true, message: e?.message });
    }
};
