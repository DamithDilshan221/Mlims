const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');

async function generateNotifications() {
  const pool = getPool('admin');
  try {
    await withTransaction(pool, null, null, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM fn_generate_pending_notifications()`
      );
      if (rows.length > 0) {
        console.log(`[NotificationService] Generated ${rows.length} notification(s):`);
        for (const n of rows) {
          console.log(`  - User #${n.user_id}: ${n.subject}`);
        }
      } else {
        console.log('[NotificationService] No pending notifications to generate.');
      }
    });
  } catch (err) {
    console.error('[NotificationService] Error generating notifications:', err.message);
  }
}

function startNotificationScheduler(intervalMinutes = 60) {
  console.log(`[NotificationService] Scheduler started (interval: ${intervalMinutes} min).`);

  generateNotifications();

  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(generateNotifications, intervalMs);

  return intervalId;
}

module.exports = { generateNotifications, startNotificationScheduler };
