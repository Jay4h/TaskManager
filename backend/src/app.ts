import express from "express";
import cors from "cors";
import { CORS_CONFIG } from "./middlewares/cors.js";
import authRoutes from "./routes/auth.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import usersRoutes from "./routes/users.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

export function createApp() {
  const app = express();
  // Middleware
  app.use(cors(CORS_CONFIG));
  app.use(express.json());
  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
