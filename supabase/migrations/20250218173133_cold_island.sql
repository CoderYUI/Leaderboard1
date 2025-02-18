/*
  # Add game validation to leaderboard

  1. Changes
    - Add check constraint to ensure game column only accepts valid game names
    - Add index on game column for faster filtering and sorting

  2. Security
    - No changes to RLS policies
*/

-- Add check constraint for valid game names
ALTER TABLE leaderboard ADD CONSTRAINT valid_game_names 
  CHECK (game IN ('The Latent', 'Lip Sync', 'Face Painting', 'Ice Cream Fight', 'Blindfold', 'Mystery Box'));

-- Add index for game column
CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON leaderboard(game);