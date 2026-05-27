import { Router } from "express";
import { getPastReports } from "../controllers/reportsController";

const router = Router();

router.get("/user/:user_id", getPastReports);

export default router;
