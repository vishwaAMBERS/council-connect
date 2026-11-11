-- Institutional memory and oversight: tenure archive, audit log, event reminders.

-- Read-only snapshot of a council seat at the end of an academic year.
-- Everything is copied as text so the record stays true even if the user or council changes later.
-- user_id is NULL for records imported from before the platform existed.
CREATE TABLE council_archive (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  council_profile_id  UUID REFERENCES council_profiles(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name           VARCHAR(150) NOT NULL,
  position            council_position NOT NULL,
  position_title      VARCHAR(100) NOT NULL,
  council_name        VARCHAR(150) NOT NULL,
  council_type        council_type NOT NULL,
  unit_code           VARCHAR(20),            -- NULL for the main council
  unit_name           VARCHAR(150),
  term_start          DATE,
  term_end            DATE,
  academic_year       VARCHAR(7) NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),  -- e.g. 2025-26
  was_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_name    VARCHAR(150),
  verified_at         TIMESTAMPTZ,
  events_count        INTEGER NOT NULL DEFAULT 0,   -- events organised during the term
  requests_handled    INTEGER NOT NULL DEFAULT 0,   -- contact requests approved or declined
  grievances_resolved INTEGER NOT NULL DEFAULT 0,
  archived_by         UUID REFERENCES users(id),
  archived_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_council_archive_year ON council_archive(academic_year, unit_code);
-- A seat is archived once.
CREATE UNIQUE INDEX uq_council_archive_profile ON council_archive(council_profile_id) WHERE council_profile_id IS NOT NULL;

-- Who did what, when. actor_id NULL = the system. Rows are only ever inserted.
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name  VARCHAR(150) NOT NULL,          -- snapshot; 'System' for automatic actions
  action      VARCHAR(40) NOT NULL,           -- e.g. member.verified, grievance.escalated
  entity_type VARCHAR(30) NOT NULL,
  entity_id   UUID,
  summary     VARCHAR(300) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Carry existing history into the audit log so it does not start empty.
INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, summary, created_at)
SELECT l.verified_by, b.full_name, 'member.verified', 'council_profile', l.council_profile_id,
       'Verified ' || m.full_name || ' as ' || l.position_title || ' (' || l.council_name || ')', l.verified_at
FROM verification_logs l
JOIN users b ON b.id = l.verified_by
JOIN users m ON m.id = l.verified_user_id;

INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, summary, created_at)
SELECT h.actor_id, COALESCE(u.full_name, 'System'), 'grievance.' || h.status::text, 'grievance', h.grievance_id,
       'Complaint "' || g.title || '": ' || replace(h.status::text, '_', ' '), h.created_at
FROM grievance_history h
JOIN grievances g ON g.id = h.grievance_id
LEFT JOIN users u ON u.id = h.actor_id;

-- Registered students are reminded once, shortly before an event starts.
ALTER TABLE events ADD COLUMN reminder_sent_at TIMESTAMPTZ;
