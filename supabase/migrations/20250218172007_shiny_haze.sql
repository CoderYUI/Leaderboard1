/*
  # Add game column to leaderboard table

  1. Changes
    - Add `game` column to `leaderboard` table
    - Set default game for existing entries
    - Make game column required

  2. Data Migration
    - Set default game as 'The Latent' for existing entries
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leaderboard' AND column_name = 'game'
  ) THEN
    ALTER TABLE leaderboard ADD COLUMN game text;
    UPDATE leaderboard SET game = 'The Latent' WHERE game IS NULL;
    ALTER TABLE leaderboard ALTER COLUMN game SET NOT NULL;
  END IF;
END $$;