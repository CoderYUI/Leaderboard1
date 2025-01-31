/*
  # Create leaderboard table

  1. New Tables
    - `leaderboard`
      - `id` (uuid, primary key)
      - `name` (text, player/entry name)
      - `points` (integer, score/points)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policies for public read access
    - Add policies for authenticated users to manage entries
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the leaderboard
CREATE POLICY "Leaderboard is publicly viewable" 
  ON leaderboard
  FOR SELECT 
  TO public
  USING (true);

-- Allow authenticated users to insert new entries
CREATE POLICY "Users can add entries" 
  ON leaderboard
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update entries
CREATE POLICY "Users can update entries" 
  ON leaderboard
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);