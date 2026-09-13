import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config.js';
import { seedDemoPasswords } from './data/seeder.js';
import { startScheduler } from './scheduler/reminderScheduler.js';

const app = createApp();
await seedDemoPasswords();
await startScheduler();
app.listen(config.port, () => console.log(`HealthMitra API listening on http://localhost:${config.port} (${config.timezone})`));
