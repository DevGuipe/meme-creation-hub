-- Reset database by deleting all data from tables
-- Order matters due to foreign key relationships

DELETE FROM reactions;
DELETE FROM reports;
DELETE FROM popcat_events;
DELETE FROM leaderboard_snapshots;
DELETE FROM memes;
DELETE FROM users;