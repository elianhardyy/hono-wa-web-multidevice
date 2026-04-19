import { Hono } from "hono";
import { router } from "./routes.js";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(".env") });

const app = new Hono();
app.route("/", router);

export default app;
