-- Persistent, audited system-wide configuration used by the administration UI.
\if :identity
CREATE TABLE IF NOT EXISTS identity.master_configuration (
  id varchar(32) PRIMARY KEY,
  configuration jsonb NOT NULL,
  "updatedByUserId" uuid NULL REFERENCES identity.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO identity.master_configuration(id, configuration)
VALUES ('SYSTEM', '{
  "certificateValidity": 24,
  "registrationFee": 500,
  "appealFee": 200,
  "appealFeePerSkill": 100,
  "maxBandScore": 50,
  "minBandScore": 1,
  "bandScoreStep": 0.5,
  "skills": ["Writing", "Reading", "Listening", "Speaking"],
  "bandLevels": [
    {"min":50,"max":50,"level":"10","description":"DSTS Standard 10"},
    {"min":48,"max":49.5,"level":"9","description":"DSTS Standard 9"},
    {"min":45,"max":47.5,"level":"8","description":"DSTS Standard 8"},
    {"min":41,"max":44.5,"level":"7","description":"DSTS Standard 7"},
    {"min":34,"max":40.5,"level":"6","description":"DSTS Standard 6"},
    {"min":27,"max":33.5,"level":"5","description":"DSTS Standard 5"},
    {"min":20,"max":26.5,"level":"4","description":"DSTS Standard 4"},
    {"min":13,"max":19.5,"level":"3","description":"DSTS Standard 3"},
    {"min":6,"max":12.5,"level":"2","description":"DSTS Standard 2"},
    {"min":1,"max":5.5,"level":"1","description":"DSTS Standard 1"}
  ],
  "certificateTemplate": {
    "paperSize":"A4",
    "orientation":"landscape",
    "title":"Dzongkha Standard Testing System Certificate",
    "declarationStatement":"This is to certify that the above-named candidate has appeared for the Dzongkha Standard Test and has achieved the following band scores.",
    "authorizedSignatureName":"Director General, DCDD"
  },
  "notificationTemplates": {
    "applicationReceived":"Dear {name}, your application for {examTitle} has been received. Application ID: {appId}",
    "applicationVerified":"Dear {name}, your application has been verified. Registration Number: {regNumber}",
    "applicationReturned":"Dear {name}, your application requires corrections: {remarks}",
    "resultDeclared":"Dear {name}, the results for {examTitle} have been declared. Please log in to view your scores.",
    "appealResult":"Dear {name}, your appeal for {examTitle} has been processed. Status: {status}"
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.permissions(name, description) VALUES
  ('master.configuration.read', 'View system master configuration'),
  ('master.configuration.manage', 'Update system master configuration')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity.role_permissions("rolesId", "permissionsId")
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON p.name IN ('master.configuration.read', 'master.configuration.manage')
WHERE r.code = 'dcdd'
ON CONFLICT DO NOTHING;
\endif
