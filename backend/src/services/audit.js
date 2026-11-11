// Audit trail. Writing an entry must never break the action being recorded.
import { query } from '../db/index.js';

/**
 * Record an action. `actor` is the req.user row, or null for automatic (system) actions.
 * `action` is "<entity>.<verb>", e.g. "member.verified".
 */
export async function audit(actor, action, entityType, entityId, summary) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor?.id || null, actor?.full_name || 'System', action, entityType, entityId || null, String(summary).slice(0, 300)]
    );
  } catch (error) {
    console.warn(`audit: could not record ${action}: ${error.message}`);
  }
}
