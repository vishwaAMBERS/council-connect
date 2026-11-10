import { config } from './config/env.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';

await migrate();
if (config.nodeEnv !== 'production') await seed(); // demo data, only when the database is empty

createApp().listen(config.port, () => {
  console.log(`CouncilConnect backend listening on http://localhost:${config.port}`);
});
