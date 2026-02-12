-- Seed default membership email rules referencing system templates by system_key
INSERT INTO membership_email_rules (email_template_id, trigger_event, offset_days, is_system, is_active)
SELECT et.id, 'purchase', 0, true, true
FROM email_templates et WHERE et.system_key = 'membership_post_purchase'
ON CONFLICT DO NOTHING;

INSERT INTO membership_email_rules (email_template_id, trigger_event, offset_days, is_system, is_active)
SELECT et.id, 'expiration', -30, true, true
FROM email_templates et WHERE et.system_key = 'membership_reminder_30d'
ON CONFLICT DO NOTHING;

INSERT INTO membership_email_rules (email_template_id, trigger_event, offset_days, is_system, is_active)
SELECT et.id, 'expiration', 0, true, true
FROM email_templates et WHERE et.system_key = 'membership_last_day'
ON CONFLICT DO NOTHING;
