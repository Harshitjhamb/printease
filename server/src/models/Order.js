import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "StoredFile", required: true },
    fileName: { type: String, required: true },
    pageCount: { type: Number }, // optional, from StoredFile.pageCount

    printType: { type: String, enum: ["bw", "color"], required: true },
    sides: { type: String, enum: ["single", "double"], default: "single" },
    pageStart: { type: Number, required: true, min: 1 },
    pageEnd: { type: Number, required: true, min: 1 },
    copies: { type: Number, required: true, min: 1, default: 1 },
    paperSize: { type: String, enum: ["A4", "A3", "Legal"], default: "A4" },

    comment: { type: String, default: "" },
    parsedComment: {
      raw: { type: String, default: "" },
      overrides: [
        {
          page: { type: Number, required: true },
          type: { type: String, enum: ["bw", "color"], required: true }
        }
      ],
      notes: { type: String, default: "" }
    },

    pageCountSelected: { type: Number, required: true },
    lineAmount: { type: Number, required: true } // INR
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [OrderItemSchema], required: true },

    currency: { type: String, default: "INR" },
    totalAmount: { type: Number, required: true },

    status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentProvider: { type: String, enum: ["razorpay", "paypal", "none"], default: "none" },
    // payment ids / references (for accounting)
    paymentRef: { type: String, default: "" }, // main transaction id shown to admin
    paymentDetails: {
      razorpayOrderId: { type: String, default: "" },
      razorpayPaymentId: { type: String, default: "" },
      paypalOrderId: { type: String, default: "" }
    },
    paidAt: { type: Date },

    notifications: [
      {
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", OrderSchema);
