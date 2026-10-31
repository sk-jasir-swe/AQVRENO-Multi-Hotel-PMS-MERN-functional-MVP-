import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import api from "./routes/api.routes.js";
const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",") || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", api);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message:
      err.name === "ValidationError"
        ? err.message
        : err.message || "Server error",
  });
});
export default app;
