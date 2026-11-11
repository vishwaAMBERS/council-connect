-- Campus operations: locations, events, grievances, lost and found, notifications.

CREATE TYPE location_type AS ENUM ('department', 'hostel', 'office', 'venue', 'facility');
CREATE TYPE event_scope AS ENUM ('own_branch', 'all_branches');
CREATE TYPE grievance_category AS ENUM ('electrical', 'water', 'wifi', 'mess', 'infrastructure');
CREATE TYPE grievance_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE grievance_status AS ENUM ('submitted', 'assigned', 'in_progress', 'resolved', 'escalated');
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_status AS ENUM ('open', 'matched', 'resolved');

-- Places shown on the campus map. Events and lost/found items can be pinned to one.
CREATE TABLE campus_locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name           VARCHAR(120) NOT NULL,
  type           location_type NOT NULL,
  description    VARCHAR(300),
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (institution_id, name)
);

CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by       UUID NOT NULL REFERENCES users(id),
  academic_unit_id UUID REFERENCES academic_units(id),      -- organiser's branch; used by own_branch scope
  title            VARCHAR(120) NOT NULL,
  description      VARCHAR(2000) NOT NULL,
  venue            VARCHAR(120) NOT NULL,
  location_id      UUID REFERENCES campus_locations(id) ON DELETE SET NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  branch_scope     event_scope NOT NULL DEFAULT 'all_branches',
  capacity         INTEGER CHECK (capacity > 0),             -- NULL = unlimited
  poster_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (branch_scope = 'all_branches' OR academic_unit_id IS NOT NULL)
);
CREATE INDEX idx_events_starts_at ON events(starts_at);

CREATE TABLE event_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (event_id, student_id)
);

CREATE TABLE grievances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_by         UUID NOT NULL REFERENCES users(id),
  title             VARCHAR(120) NOT NULL,
  description       VARCHAR(1000) NOT NULL,
  room_number       VARCHAR(40),
  image_url         TEXT,
  category          grievance_category,     -- NULL until categorised
  priority          grievance_priority,     -- NULL until categorised
  ai_source         VARCHAR(10) CHECK (ai_source IN ('llm', 'rules')),
  status            grievance_status NOT NULL DEFAULT 'submitted',
  assigned_to       UUID REFERENCES users(id),
  escalation_due_at TIMESTAMPTZ NOT NULL,   -- unresolved past this moment => escalated automatically
  escalated_at      TIMESTAMPTZ,            -- set once; from then on only admins handle it
  resolution_note   VARCHAR(1000),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);
CREATE INDEX idx_grievances_raised_by ON grievances(raised_by);
CREATE INDEX idx_grievances_open_due ON grievances(escalation_due_at) WHERE status <> 'resolved';

-- Every status change, for the student's timeline and for audit. actor_id NULL = the system.
CREATE TABLE grievance_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id),
  status       grievance_status NOT NULL,
  note         VARCHAR(1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_grievance_history ON grievance_history(grievance_id, created_at);

CREATE TABLE lost_found_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by   UUID NOT NULL REFERENCES users(id),
  type        item_type NOT NULL,
  title       VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  location    VARCHAR(120) NOT NULL,
  location_id UUID REFERENCES campus_locations(id) ON DELETE SET NULL,
  occurred_on DATE,
  image_url   TEXT,
  status      item_status NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lost_found_open ON lost_found_items(type, status);

-- A suggested pairing of a lost report with a found report.
CREATE TABLE lost_found_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id  UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  score         REAL NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);

-- In-platform contact between the two matched parties (no personal contact details exposed).
CREATE TABLE match_messages (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  UUID NOT NULL REFERENCES lost_found_matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content   VARCHAR(1000) NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_match_messages ON match_messages(match_id, sent_at);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(300),
  link       VARCHAR(200),               -- web path to open, e.g. /grievances/<id>
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
