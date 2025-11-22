-- Fix unique constraint to only apply to active reservations
-- This allows cancelled reservations to exist without blocking new reservations

-- Drop the old unique constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_space_id_date_start_time_key;

-- Create a partial unique index that only applies to active reservations
CREATE UNIQUE INDEX IF NOT EXISTS reservations_space_id_date_start_time_active_key 
ON reservations(space_id, date, start_time) 
WHERE status = 'active';
