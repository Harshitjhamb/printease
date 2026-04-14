import mongoose from "mongoose";

const StoredFileSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storage: { type: String, enum: ["disk"], default: "disk" },
    // diskPath can be cleared after retention cleanup (we keep metadata, but delete the actual file)
    diskPath: { type: String, default: "" },
    deletedAt: { type: Date },
    pageCount: { type: Number } // optional (client-provided for PDFs/images)
  },
  { timestamps: true }
);

export const StoredFile = mongoose.model("StoredFile", StoredFileSchema);
