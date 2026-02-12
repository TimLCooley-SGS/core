-- Seed 7 system email templates (idempotent via ON CONFLICT)
INSERT INTO email_templates (name, subject, is_system, system_key, status, blocks, settings)
VALUES
  (
    'Ticket: Post-purchase Confirmation',
    'Your tickets are confirmed!',
    true,
    'ticket_post_purchase',
    'active',
    '[
      {"id":"sys-hdr-1","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-1","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Your tickets for <strong>{{ticket_name}}</strong> are confirmed!</p><p><strong>Date:</strong> {{ticket_date}}<br/><strong>Time:</strong> {{ticket_time}}<br/><strong>Location:</strong> {{ticket_location}}<br/><strong>Tickets:</strong> {{ticket_count}}<br/><strong>Confirmation #:</strong> {{confirmation_number}}</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-1","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Ticket: 1-Day Reminder',
    'Reminder: Your visit is tomorrow',
    true,
    'ticket_reminder_1day',
    'active',
    '[
      {"id":"sys-hdr-2","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-2","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Just a reminder — your visit to <strong>{{ticket_name}}</strong> is tomorrow!</p><p><strong>Date:</strong> {{ticket_date}}<br/><strong>Time:</strong> {{ticket_time}}<br/><strong>Location:</strong> {{ticket_location}}</p><p>We look forward to seeing you!</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-2","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Ticket: 1-Hour Reminder',
    'Reminder: Your visit is in 1 hour',
    true,
    'ticket_reminder_1hour',
    'active',
    '[
      {"id":"sys-hdr-3","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-3","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Your visit to <strong>{{ticket_name}}</strong> is starting in about 1 hour!</p><p><strong>Time:</strong> {{ticket_time}}<br/><strong>Location:</strong> {{ticket_location}}</p><p>See you soon!</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-3","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Ticket: Day-after Follow-up',
    'Thanks for visiting!',
    true,
    'ticket_day_after',
    'active',
    '[
      {"id":"sys-hdr-4","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-4","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Thanks for visiting <strong>{{ticket_name}}</strong> yesterday! We hope you had a wonderful time.</p><p>We would love to hear about your experience. Feel free to reach out with any feedback.</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-4","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Membership: Welcome',
    'Welcome to {{org_name}}!',
    true,
    'membership_post_purchase',
    'active',
    '[
      {"id":"sys-hdr-5","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-5","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Welcome to <strong>{{org_name}}</strong>! Your <strong>{{plan_name}}</strong> membership is now active.</p><p><strong>Start Date:</strong> {{start_date}}<br/><strong>Expiration:</strong> {{expiration_date}}</p><p>We are thrilled to have you as a member!</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-5","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Membership: 30-Day Renewal Reminder',
    'Your membership expires in 30 days',
    true,
    'membership_reminder_30d',
    'active',
    '[
      {"id":"sys-hdr-6","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-6","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Your <strong>{{plan_name}}</strong> membership with {{org_name}} expires on <strong>{{expiration_date}}</strong> — that is in about 30 days.</p><p>Renew now to keep enjoying all of your member benefits!</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-6","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  ),
  (
    'Membership: Last Day',
    'Your membership expires today',
    true,
    'membership_last_day',
    'active',
    '[
      {"id":"sys-hdr-7","type":"header","props":{"logoUrl":"","logoAlt":"","logoWidth":150,"title":"{{org_name}}","backgroundColor":"#4E2C70","textColor":"#ffffff","alignment":"center"}},
      {"id":"sys-txt-7","type":"text","props":{"html":"<p>Hi {{first_name}},</p><p>Your <strong>{{plan_name}}</strong> membership with {{org_name}} expires <strong>today</strong>.</p><p>Renew now to continue enjoying your member benefits without interruption.</p>","color":"#374151","alignment":"left"}},
      {"id":"sys-ftr-7","type":"footer","props":{"html":"","companyName":"{{org_name}}","address":"","color":"#6b7280","backgroundColor":"#f9fafb","alignment":"center"}}
    ]'::jsonb,
    '{"backgroundColor":"#f4f4f5","contentWidth":600,"fontFamily":"Arial, Helvetica, sans-serif"}'::jsonb
  )
ON CONFLICT (system_key) DO NOTHING;
