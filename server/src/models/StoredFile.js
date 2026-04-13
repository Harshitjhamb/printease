import mongoose from "mongoose";

const StoredFileSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storage: { type: String, enum: ["disk"], default: "disk" },
    diskPath: { type: String, required: true },
    pageCount: { type: Number } // optional (client-provided for PDFs/images)
  },
  { timestamps: true }
);

export const StoredFile = mongoose.model("StoredFile", StoredFileSchema);

