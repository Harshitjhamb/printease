import express from "express";
import { getSetting, SETTINGS_KEYS } from "../utils/settings.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const printerActive = await getSetting(SETTINGS_KEYS.PRINTER_ACTIVE, true);
  return res.json({ printerActive: Boolean(printerActive) });
});

export default router;

