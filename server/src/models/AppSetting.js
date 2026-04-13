import mongoose from "mongoose";

const AppSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const AppSetting = mongoose.model("AppSetting", AppSettingSchema);

