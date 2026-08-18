DO $$ 
DECLARE
  v_admin_id uuid;
  v_dcdd_id uuid;
  v_exam_head_id uuid;
  v_committee_head_id uuid;
  v_chief_exec_id uuid;
  v_test_taker_id uuid;
  v_local_acceptance_id uuid;
BEGIN
  -- Insert or Update Users
  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('system.admin@dzongjuk.test', '11101001001', 'System Admin', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_admin_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('dcdd.admin@dzongjuk.test', '11102002002', 'DCDD Admin', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_dcdd_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('exam.head@dzongjuk.test', '11103003003', 'Exam Head', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_exam_head_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('committee.head@dzongjuk.test', '11104004004', 'Committee Head', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_committee_head_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('chief.executive@dzongjuk.test', '11105005005', 'Chief Executive', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_chief_exec_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('test.taker@dzongjuk.test', '11106006006', 'Test Taker', '$2b$10$mu1Jyv.3LzBRBtwbPX833eW98.8.xNQsgze.0q1UUe2q.qog4xBBa', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_test_taker_id;

  INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) 
  VALUES ('local.acceptance@dzongjuk.test', 'LOCALCID2026', 'Local acceptance test taker', '$2b$10$psGU2h.I3oKdhi8ixRwT1ejTVkAFTyM83vpHwWQsPuXqqtBcjw8GW', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET cid = EXCLUDED.cid, "fullName" = EXCLUDED."fullName", "passwordHash" = EXCLUDED."passwordHash"
  RETURNING id INTO v_local_acceptance_id;

  -- Insert Role Links
  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_admin_id, id FROM identity.roles WHERE code = 'admin'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_dcdd_id, id FROM identity.roles WHERE code = 'dcdd'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_exam_head_id, id FROM identity.roles WHERE code = 'exam_head'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_committee_head_id, id FROM identity.roles WHERE code = 'committee_head'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_chief_exec_id, id FROM identity.roles WHERE code = 'chief_executive'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_test_taker_id, id FROM identity.roles WHERE code = 'test_taker'
  ON CONFLICT DO NOTHING;

  INSERT INTO identity.user_roles ("usersId", "rolesId")
  SELECT v_local_acceptance_id, id FROM identity.roles WHERE code = 'test_taker'
  ON CONFLICT DO NOTHING;
END $$;
