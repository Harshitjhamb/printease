import mongoose from "mongoose";

export async function connectDb(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  console.log(`[db] connected: ${mongoose.connection.name}`);
}

