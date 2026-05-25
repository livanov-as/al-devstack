import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import apiRoutes from "./routes/api.js";

// Configure dotenv to read the .env file from the repository root
dotenv.config({ path: path.resolve("../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// Connect to MongoDB Atlas strictly using the "al-devstack" database
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI environment variable not found in root .env file!",
      );
    }
    await mongoose.connect(process.env.MONGO_URI, { dbName: "al-devstack" });
    console.log("📡 MongoDB Atlas (al-devstack) successfully connected...");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

connectDB();

// Health Check route for UptimeRobot
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server successfully running on port ${PORT}`);
});
