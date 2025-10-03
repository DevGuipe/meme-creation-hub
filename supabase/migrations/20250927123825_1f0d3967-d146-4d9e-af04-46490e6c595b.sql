-- Clear all user data and related records
DELETE FROM reactions;
DELETE FROM reports;
DELETE FROM popcat_events;
DELETE FROM leaderboard_snapshots;
DELETE FROM memes;
DELETE FROM users;

-- Keep templates and assets as they are structural data
-- DELETE FROM templates;
-- DELETE FROM assets;