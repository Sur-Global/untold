-- Issues are shown by month and year only (no Roman numerals). One issue per month, so the old
-- "number" column now just mirrors the month (kept because it already enforces one issue per month per year).
UPDATE issues SET number = number + 1000;
UPDATE issues SET number = EXTRACT(MONTH FROM issue_date)::int;
