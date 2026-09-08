-- ==============================================================================
-- INOVX OPS — ONE OCCASION PER NAME PER TENURE
-- Migration: 20260913000000_occasion_uniqueness.sql
-- ==============================================================================
--
-- `occasions` had no unique key, so the seed's `ON CONFLICT DO NOTHING` had
-- nothing to conflict on: running the seed twice produced two Diwalis, two
-- foundation days, and a lunar queue asking for the same date twice. It showed
-- up the moment seed.sql was re-applied to a live database.
--
-- A club does not hold the same occasion twice in one tenure, so the database
-- can say so. Duplicates are collapsed first, keeping the oldest row and any
-- confirmed date one of them may have picked up.

WITH ranked AS (
  SELECT
    id,
    tenure_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY tenure_id, name ORDER BY created_at, id) AS rn
  FROM occasions
),
-- Carry a confirmation forward if a duplicate holds one and the keeper does not.
confirmed AS (
  SELECT DISTINCT ON (tenure_id, name)
    tenure_id, name, confirmed_date, confirmed_year
  FROM occasions
  WHERE confirmed_date IS NOT NULL
  ORDER BY tenure_id, name, confirmed_year DESC
)
UPDATE occasions o
SET confirmed_date = c.confirmed_date,
    confirmed_year = c.confirmed_year
FROM ranked r
JOIN confirmed c ON c.tenure_id = r.tenure_id AND c.name = r.name
WHERE o.id = r.id AND r.rn = 1 AND o.confirmed_date IS NULL;

DELETE FROM occasions o
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenure_id, name ORDER BY created_at, id) AS rn
  FROM occasions
) r
WHERE o.id = r.id AND r.rn > 1;

ALTER TABLE occasions
  ADD CONSTRAINT uq_occasions_tenure_name UNIQUE (tenure_id, name);
