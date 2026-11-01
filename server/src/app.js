import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requireTrustedOrigin } from "./middleware/trustedOrigin.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import api from "./routes/api.routes.js";
const app = express();
app.use(helmet());
const clientOrigins = env.clientUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  }),
);
app.use("/api", requireTrustedOrigin);
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());
if (env.nodeEnv !== "production") app.use(morgan("dev"));
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
app.use(errorMiddleware);
export default app;
