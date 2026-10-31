import { env } from "./config/env.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import { runReminderSweep } from "./services/reminderService.js";
const port = env.port;
connectDB()
  .then(() => {
    app.listen(port, () => console.log(`AQVRENO API running on ${port}`));
    const runReminders = () =>
      runReminderSweep().catch((err) =>
        console.error("Guest reminder sweep failed:", err),
      );
    runReminders();
    setInterval(runReminders, 15 * 60 * 1000);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
