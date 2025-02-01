/*
  # Add delete policy for leaderboard

  1. Changes
    - Add policy to allow deletion of entries from the leaderboard table
  
  2. Security
    - Allow public access to delete entries (will be protected by admin check in application)
*/

CREATE POLICY "Anyone can delete entries" 
  ON leaderboard
  FOR DELETE
  TO public
  USING (true);