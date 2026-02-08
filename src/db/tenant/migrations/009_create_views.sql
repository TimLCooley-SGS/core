-- Tenant Migration 009: Derived Views
-- Patron types are derived from activity and relationships, not stored.

-- Active members: persons who occupy a seat on an active membership
CREATE VIEW active_members AS
SELECT DISTINCT p.*
FROM persons p
JOIN membership_seats ms ON ms.person_id = p.id
JOIN memberships m ON m.id = ms.membership_id
WHERE m.status = 'active'
  AND now() BETWEEN m.starts_at AND m.ends_at;

-- Donors: persons who have made any donation
CREATE VIEW donors AS
SELECT DISTINCT p.*
FROM persons p
JOIN donations d ON d.person_id = p.id;

-- Recent visitors: persons who have visited
CREATE VIEW recent_visitors AS
SELECT DISTINCT p.*
FROM persons p
JOIN visits v ON v.person_id = p.id;
