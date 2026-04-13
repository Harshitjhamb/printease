import { AppSetting } from "../models/AppSetting.js";

export async function getSetting(key, defaultValue) {
  const doc = await AppSetting.findOne({ key });
  if (!doc) return defaultValue;
  return doc.value;
}

export async function setSetting(key, value) {
  const doc = await AppSetting.findOneAndUpdate({ key }, { value }, { new: true, upsert: true });
  return doc.value;
}

export const SETTINGS_KEYS = {
  PRINTER_ACTIVE: "printerActive"
};

