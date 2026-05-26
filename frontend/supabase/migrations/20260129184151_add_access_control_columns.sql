/*
  # Add Access Control Columns to Profiles
  
  1. New Columns
    - `role` (text) - User role: 'USER', 'ADMIN'
    - `tier` (text) - Subscription tier: 'free', 'elite'
    - `credits` (integer) - AI analysis credits
  
  2. Changes
    - Add columns with safe defaults
    - Set admin user (bh.dtl@web.de) to ADMIN role and elite tier
    - Grant 9999 credits to admin
  
  3. Security
    - RLS policies already exist for profiles table
*/

-- Add role column (default to USER)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER' NOT NULL;

-- Add tier column (default to free)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free' NOT NULL;

-- Add credits column (default to 0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 0 NOT NULL;

-- Set admin user access (bh.dtl@web.de = id: 0a837e06-92d0-4828-b3b8-2c031f816654)
UPDATE profiles 
SET 
  role = 'ADMIN',
  tier = 'elite',
  credits = 9999
WHERE id = '0a837e06-92d0-4828-b3b8-2c031f816654';

-- Ensure profile exists for admin (in case it doesn't)
INSERT INTO profiles (id, first_name, role, tier, credits)
VALUES ('0a837e06-92d0-4828-b3b8-2c031f816654', 'Admin', 'ADMIN', 'elite', 9999)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'ADMIN',
  tier = 'elite',
  credits = 9999;
