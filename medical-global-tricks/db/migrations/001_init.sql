-- Medical Global Tricks — initial schema.
-- Every student-owned row carries user_id and every query in lib/ filters on it.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────── Accounts ─────────────
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL UNIQUE,
  name              text NOT NULL,
  password_hash     text NOT NULL,
  role              text NOT NULL DEFAULT 'student' CHECK (role IN ('student','editor','admin')),
  locale            text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ar')),
  email_verified_at timestamptz,
  disabled_at       timestamptz,
  stripe_customer_id text UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_key_hash text NOT NULL,
  label           text NOT NULL DEFAULT 'Unknown device',
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  UNIQUE (user_id, device_key_hash)
);
CREATE INDEX devices_user_active ON devices(user_id) WHERE revoked_at IS NULL;

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id    uuid REFERENCES devices(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  ip           text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE device_replacement_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_device_key_hash text NOT NULL,
  new_device_label    text NOT NULL,
  replace_device_id   uuid REFERENCES devices(id) ON DELETE SET NULL,
  reason              text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_note          text,
  decided_by          uuid REFERENCES users(id),
  decided_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_pending_request_per_user ON device_replacement_requests(user_id) WHERE status = 'pending';

CREATE TABLE email_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('verify','reset')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_outbox (
  id         bigserial PRIMARY KEY,
  to_email   citext NOT NULL,
  subject    text NOT NULL,
  body_text  text NOT NULL,
  status     text NOT NULL CHECK (status IN ('sent','not_configured','failed')),
  error      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        int NOT NULL
);

-- ───────────── Catalogue ─────────────
CREATE TABLE courses (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title_en      text NOT NULL,
  title_ar      text NOT NULL,
  summary_en    text NOT NULL DEFAULT '',
  summary_ar    text NOT NULL DEFAULT '',
  country       text NOT NULL,              -- ISO code: AE, SA, ...
  authority     text NOT NULL,              -- MOHAP, DHA, DOH, SCFHS, ...
  track         text NOT NULL,              -- physician, nurse, pharmacist, dentist, allied
  specialty     text NOT NULL,
  exam_format   text NOT NULL DEFAULT 'oral' CHECK (exam_format IN ('oral','mcq','mixed')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('available','planned','draft','archived')),
  sort_order    int NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX courses_filters ON courses(status, country, authority, track, specialty);

-- Sellable offers. None exist until an admin enters a real price.
CREATE TABLE course_offers (
  id              serial PRIMARY KEY,
  course_id       int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('one_time','subscription')),
  label_en        text NOT NULL,
  label_ar        text NOT NULL,
  currency        text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  amount_minor    int NOT NULL CHECK (amount_minor > 0),
  access_days     int CHECK (access_days > 0),               -- one_time: access length (NULL = no expiry)
  interval        text CHECK (interval IN ('month','year')),  -- subscription billing interval
  interval_count  int NOT NULL DEFAULT 1 CHECK (interval_count > 0),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'subscription') = (interval IS NOT NULL))
);

CREATE TABLE domains (
  id             serial PRIMARY KEY,
  course_id      int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code           text NOT NULL,
  name_en        text NOT NULL,
  name_ar        text NOT NULL,
  description_en text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  color          text NOT NULL DEFAULT '#14B8A6',
  sort_order     int NOT NULL DEFAULT 0,
  UNIQUE (course_id, code)
);

CREATE TABLE questions (
  id                serial PRIMARY KEY,
  course_id         int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  domain_id         int NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  external_ref      text,
  prompt            text NOT NULL,
  answer            text NOT NULL,
  detail_html       text NOT NULL DEFAULT '',
  source            text NOT NULL DEFAULT '',
  verification_note text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
  version           int NOT NULL DEFAULT 1,
  created_by        uuid REFERENCES users(id),
  updated_by        uuid REFERENCES users(id),
  reviewed_by       uuid REFERENCES users(id),
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, external_ref)
);
CREATE INDEX questions_course_status ON questions(course_id, status, domain_id);
CREATE INDEX questions_search ON questions USING gin (to_tsvector('english', prompt || ' ' || answer || ' ' || source));

CREATE TABLE question_revisions (
  id          bigserial PRIMARY KEY,
  question_id int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version     int NOT NULL,
  data        jsonb NOT NULL,
  edited_by   uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE course_files (
  id          serial PRIMARY KEY,
  course_id   int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  domain_id   int REFERENCES domains(id) ON DELETE SET NULL,
  kind        text NOT NULL DEFAULT 'summary_pdf' CHECK (kind IN ('summary_pdf','other_pdf')),
  title       text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  size_bytes  bigint NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE videos (
  id               serial PRIMARY KEY,
  course_id        int REFERENCES courses(id) ON DELETE CASCADE,
  title_en         text NOT NULL,
  title_ar         text NOT NULL,
  kind             text NOT NULL DEFAULT 'lesson' CHECK (kind IN ('promo','lesson')),
  source_type      text NOT NULL CHECK (source_type IN ('file','youtube','vimeo')),
  storage_key      text,
  external_id      text,
  mime             text,
  duration_seconds int,
  access           text NOT NULL DEFAULT 'enrolled' CHECK (access IN ('public','enrolled')),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_type = 'file') = (storage_key IS NOT NULL))
);

-- ───────────── Commerce ─────────────
CREATE TABLE orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id           int NOT NULL REFERENCES courses(id),
  offer_id            int REFERENCES course_offers(id) ON DELETE SET NULL,
  gateway             text NOT NULL DEFAULT 'stripe',
  gateway_session_id  text UNIQUE,
  gateway_payment_id  text,
  gateway_subscription_id text,
  kind                text NOT NULL CHECK (kind IN ('one_time','subscription')),
  amount_minor        int NOT NULL,
  currency            text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','failed','expired','refunded','partially_refunded')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz,
  refunded_at         timestamptz
);
CREATE INDEX orders_user ON orders(user_id);

CREATE TABLE enrollments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id               int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source                  text NOT NULL CHECK (source IN ('one_time','subscription','admin_grant')),
  status                  text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','past_due','canceled','expired','revoked','refunded')),
  starts_at               timestamptz NOT NULL DEFAULT now(),
  expires_at              timestamptz,
  order_id                uuid REFERENCES orders(id) ON DELETE SET NULL,
  gateway_subscription_id text UNIQUE,
  granted_by              uuid REFERENCES users(id),
  note                    text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enrollments_access ON enrollments(user_id, course_id, status);

-- Webhook idempotency: one row per gateway event id.
CREATE TABLE payment_events (
  id           text PRIMARY KEY,
  gateway      text NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error        text
);

-- ───────────── Study data (per user, per course) ─────────────
CREATE TABLE question_progress (
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id    int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  course_id      int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  last_rating    text NOT NULL CHECK (last_rating IN ('recalled','review')),
  recalled_count int NOT NULL DEFAULT 0,
  review_count   int NOT NULL DEFAULT 0,
  last_rated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX question_progress_course ON question_progress(user_id, course_id, last_rating);

CREATE TABLE rating_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question_id int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  rating      text NOT NULL CHECK (rating IN ('recalled','review')),
  context     text NOT NULL CHECK (context IN ('practice','exam')),
  attempt_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rating_events_user_course ON rating_events(user_id, course_id, created_at);

CREATE TABLE bookmarks (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  course_id   int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE exam_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  mode             text NOT NULL CHECK (mode IN ('domain','mixed','review')),
  domain_ids       int[] NOT NULL DEFAULT '{}',
  question_count   int NOT NULL,
  duration_seconds int NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  submitted_at     timestamptz,
  status           text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','expired')),
  recalled         int NOT NULL DEFAULT 0,
  review           int NOT NULL DEFAULT 0,
  unrated          int NOT NULL DEFAULT 0
);
CREATE INDEX exam_attempts_user ON exam_attempts(user_id, course_id, started_at DESC);

CREATE TABLE exam_attempt_items (
  attempt_id  uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  position    int NOT NULL,
  question_id int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  revealed    boolean NOT NULL DEFAULT false,
  rating      text CHECK (rating IN ('recalled','review')),
  flagged     boolean NOT NULL DEFAULT false,
  note        text NOT NULL DEFAULT '',
  updated_at  timestamptz,
  PRIMARY KEY (attempt_id, position)
);

CREATE TABLE study_plan_items (
  id         serial PRIMARY KEY,
  course_id  int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  domain_id  int REFERENCES domains(id) ON DELETE CASCADE,
  week       int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  title_en   text NOT NULL,
  title_ar   text NOT NULL
);

CREATE TABLE study_plan_progress (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id  int NOT NULL REFERENCES study_plan_items(id) ON DELETE CASCADE,
  done_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- ───────────── Audit ─────────────
CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  actor_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  data       jsonb,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created ON audit_log(created_at DESC);
