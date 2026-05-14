import { Router } from "express";
import {
    getScenarioPreferences,
    upsertScenarioPreference,
    deleteScenarioPreference,
} from "../controllers/scenarioPreferencesController";

const router = Router();

router.get("/scenario-preferences", getScenarioPreferences);
router.put("/scenario-preferences/:config_key", upsertScenarioPreference);
router.delete("/scenario-preferences/:config_key", deleteScenarioPreference);

export default router;
