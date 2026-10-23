-- The magazine numbers its issues per year ("2026 – V"), so the number is unique within a year.
ALTER TABLE issues DROP CONSTRAINT issues_number_key;
CREATE UNIQUE INDEX issues_year_number_key ON issues ((EXTRACT(YEAR FROM issue_date)::int), number);
