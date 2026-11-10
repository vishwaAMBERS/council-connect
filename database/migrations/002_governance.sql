-- Governance and communication: invite codes, verification log, contact requests, messages.

CREATE TYPE request_category AS ENUM ('academic', 'personal', 'event', 'urgent');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'declined');

-- Representative and admin accounts can only be created with an invite code.
-- A representative code carries the council seat that the new account will hold.
CREATE TABLE invite_codes (
  code           VARCHAR(40) PRIMARY KEY,
  role           user_role NOT NULL CHECK (role IN ('representative', 'admin')),
  council_id     UUID REFERENCES councils(id) ON DELETE CASCADE,
  position       council_position,
  position_title VARCHAR(100),
  term_start     DATE,
  term_end       DATE,
  created_by     UUID REFERENCES users(id),
  used_by        UUID REFERENCES users(id),
  used_at        TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role = 'admin' OR (council_id IS NOT NULL AND position IS NOT NULL AND position_title IS NOT NULL))
);

-- Permanent audit record of every verification action.
CREATE TABLE verification_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_profile_id UUID NOT NULL REFERENCES council_profiles(id) ON DELETE CASCADE,
  verified_user_id   UUID NOT NULL REFERENCES users(id),
  verified_by        UUID NOT NULL REFERENCES users(id),
  position_title     VARCHAR(100) NOT NULL, -- snapshot at time of verification
  council_name       VARCHAR(150) NOT NULL, -- snapshot at time of verification
  verified_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES users(id),
  to_user_id      UUID NOT NULL REFERENCES users(id),
  reason_title    VARCHAR(80)  NOT NULL,
  description     VARCHAR(400) NOT NULL,
  category        request_category,          -- NULL until categorised, or if categorisation fails
  category_source VARCHAR(10) CHECK (category_source IN ('llm', 'rules')),
  status          request_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  CHECK (from_user_id <> to_user_id)
);
-- At most one pending or approved request per student-representative pair.
CREATE UNIQUE INDEX uq_contact_requests_active
  ON contact_requests(from_user_id, to_user_id)
  WHERE status IN ('pending', 'approved');
CREATE INDEX idx_contact_requests_to ON contact_requests(to_user_id, status);
CREATE INDEX idx_contact_requests_from ON contact_requests(from_user_id);

CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES contact_requests(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id),
  content    VARCHAR(1000) NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_request ON messages(request_id, sent_at);
