import { config } from './config/env.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { escalateOverdue } from './routes/grievances.js';

await migrate();
if (config.nodeEnv !== 'production') await seed(); // demo data, only where tables are empty

createApp().listen(config.port, () => {
  console.log(`CouncilConnect backend listening on http://localhost:${config.port}`);
});

// Overdue grievances are escalated without anyone having to open the page.
const ESCALATION_SWEEP_MS = 60_000;
setInterval(() => {
  escalateOverdue().catch((error) => console.warn(`escalation sweep failed: ${error.message}`));
}, ESCALATION_SWEEP_MS).unref();
