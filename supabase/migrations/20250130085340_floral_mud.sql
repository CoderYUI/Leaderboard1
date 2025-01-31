/*
  # Update leaderboard RLS policies

  1. Changes
    - Drop existing policies
    - Create new policies for public access
    
  2. Security
    - Allow public access for all operations (select, insert, update)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Leaderboard is publicly viewable" ON leaderboard;
DROP POLICY IF EXISTS "Users can add entries" ON leaderboard;
DROP POLICY IF EXISTS "Users can update entries" ON leaderboard;
DROP POLICY IF EXISTS "Anyone can add entries" ON leaderboard;
DROP POLICY IF EXISTS "Anyone can update entries" ON leaderboard;

-- Create new policies
CREATE POLICY "Leaderboard is publicly viewable" 
  ON leaderboard
  FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Anyone can add entries" 
  ON leaderboard
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update entries" 
  ON leaderboard
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);