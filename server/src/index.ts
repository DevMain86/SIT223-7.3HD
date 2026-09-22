// Entry point: starts the HTTP server.
// Kept separate from app.ts so the app can be imported by tests without binding a port.

import { config } from "./config.js";
import app from "./app.js";

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});