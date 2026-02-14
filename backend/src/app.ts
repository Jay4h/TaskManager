import express from "express";
import cors from "cors";
import { CORS_CONFIG } from "./middlewares/cors.js";
import authRoutes from "./routes/auth.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import usersRoutes from "./routes/users.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import connectDB from "./infrastructure/database/mongodb.js";

export function createApp() {
  const app = express();
  
  // Database connection middleware for serverless
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error("Database connection error:", error);
      next(error);
    }
  });
  
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

// Export app instance for Vercel serverless deployment
const app = createApp();
export default app;
