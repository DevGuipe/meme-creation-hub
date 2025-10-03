-- Reset database - Delete all data from tables to start fresh

-- Delete all popcat events
DELETE FROM popcat_events;

-- Delete all reactions
DELETE FROM reactions;

-- Delete all reports  
DELETE FROM reports;

-- Delete all memes
DELETE FROM memes;

-- Delete all leaderboard snapshots
DELETE FROM leaderboard_snapshots;

-- Delete all users (this will cascade delete related data due to foreign keys)
DELETE FROM users;