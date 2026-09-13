import { config } from '../config.js';
import { query } from './db.js';
import { hashPassword } from '../lib/password.js';
import { isoAt, localDateKey, nowIso } from '../lib/time.js';

export async function seedDemoPasswords() {
  if (!config.databaseUrl) return;

  try {
    // 1. Rehash demo user passwords
    const result = await query("SELECT id FROM users WHERE password_hash = 'seed:needs-rehash'");
    if (result.rows.length > 0) {
      const hash = hashPassword('demo123');
      for (const row of result.rows) {
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, row.id]);
      }
      console.log(`[seed] Rehashed passwords for ${result.rows.length} demo user(s)`);
    }

    // 2. Check if dose_logs is empty, seed 14-day history for demo medications
    const logCountRes = await query('SELECT count(*)::int AS count FROM dose_logs');
    if (logCountRes.rows[0]?.count === 0) {
      const medsRes = await query("SELECT id, times FROM medications WHERE patient_id = '00000000-0000-4000-a000-000000000001'");
      if (medsRes.rows.length > 0) {
        for (let day = 1; day <= 14; day += 1) {
          const date = localDateKey(new Date(), -day);
          for (const med of medsRes.rows) {
            const times = (med.times || []).map((t) => String(t).slice(0, 5));
            for (const time of times) {
              const missed = day === 4 && med.id === '00000000-0000-4000-c000-000000000001' && time === '20:00';
              const skipped = day === 8 && med.id === '00000000-0000-4000-c000-000000000002';
              const status = missed ? 'missed' : skipped ? 'skipped' : 'taken';
              const sched = isoAt(time, date);
              await query(
                `INSERT INTO dose_logs (medication_id, scheduled_time, status, responded_at, response_method, reminder_sent_at, missed_alert_sent_at)
                 VALUES ($1, $2::timestamptz, $3, $4::timestamptz, $5, $6::timestamptz, $7::timestamptz)`,
                [
                  med.id,
                  sched,
                  status,
                  status === 'missed' ? null : sched,
                  status === 'missed' ? null : 'tap',
                  sched,
                  missed ? sched : null
                ]
              );
            }
          }
        }
        console.log('[seed] Seeded 14 days of dose logs history for demo patient');
      }
    }

    // 3. Seed welcome alert if none exists
    const alertCountRes = await query('SELECT count(*)::int AS count FROM alerts');
    if (alertCountRes.rows[0]?.count === 0) {
      await query(
        `INSERT INTO alerts (patient_id, type, message, created_at, read_by)
         VALUES ('00000000-0000-4000-a000-000000000001', 'info', 'Welcome back. Your medication plan is ready.', $1::timestamptz, '{}')`,
        [nowIso()]
      );
      console.log('[seed] Seeded welcome alert');
    }
  } catch (err) {
    console.error('[seed] Error during demo seeding:', err);
  }
}
