-- Core identity and council structure.
-- Ported from the MySQL design in database/legacy-mysql/ (institutions, academic_units,
-- users, councils, council_profiles with parent hierarchy), plus verification columns.

CREATE TYPE user_role AS ENUM ('student', 'representative', 'admin');
CREATE TYPE academic_unit_type AS ENUM ('engineering_branch', 'postgraduate_program');
CREATE TYPE council_type AS ENUM ('main', 'departmental');
CREATE TYPE council_position AS ENUM (
  -- main council
  'president', 'co_council_secretary', 'ladies_representative', 'reserved_representative',
  'anti_ragging_representative',
  -- departmental councils
  'general_secretary', 'co_general_secretary',
  -- both
  'technical_secretary', 'co_technical_secretary', 'technical_member',
  'cultural_secretary', 'co_cultural_secretary', 'cultural_member',
  'sports_secretary', 'co_sports_secretary', 'sports_member',
  'class_representative'
);

CREATE TABLE institutions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  code         VARCHAR(20)  NOT NULL UNIQUE,
  email_domain VARCHAR(100) NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE academic_units (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name           VARCHAR(150) NOT NULL,
  code           VARCHAR(20)  NOT NULL,
  type           academic_unit_type NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_unit_id UUID REFERENCES academic_units(id) ON DELETE RESTRICT,
  full_name        VARCHAR(150) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             user_role NOT NULL DEFAULT 'student',
  year             SMALLINT CHECK (year BETWEEN 1 AND 4),
  about            VARCHAR(200),
  avatar_url       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_unit ON users(academic_unit_id);

CREATE TABLE councils (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  academic_unit_id UUID REFERENCES academic_units(id) ON DELETE RESTRICT, -- NULL for the main council
  name             VARCHAR(150) NOT NULL,
  type             council_type NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name),
  CHECK ((type = 'main') = (academic_unit_id IS NULL))
);

CREATE TABLE council_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id        UUID NOT NULL REFERENCES councils(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  position          council_position NOT NULL,
  position_title    VARCHAR(100) NOT NULL,
  parent_profile_id UUID REFERENCES council_profiles(id) ON DELETE SET NULL,
  term_start        DATE,
  term_end          DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by       UUID REFERENCES users(id),
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (council_id, user_id),
  CHECK (is_verified = (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX idx_council_profiles_user ON council_profiles(user_id);
CREATE INDEX idx_council_profiles_position ON council_profiles(position);
