import { config } from './config/env.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { escalateOverdue } from './routes/grievances.js';
import { sendEventReminders } from './routes/events.js';

await migrate();
if (config.nodeEnv !== 'production') await seed(); // demo data, only where tables are empty

createApp().listen(config.port, () => {
  console.log(`CouncilConnect backend listening on http://localhost:${config.port}`);
});

// Background sweeps: escalate overdue grievances and send event reminders,
// so neither depends on someone opening a page.
const SWEEP_MS = 60_000;
const sweep = () => {
  escalateOverdue().catch((error) => console.warn(`escalation sweep failed: ${error.message}`));
  sendEventReminders().catch((error) => console.warn(`reminder sweep failed: ${error.message}`));
};
sweep();
setInterval(sweep, SWEEP_MS).unref();
