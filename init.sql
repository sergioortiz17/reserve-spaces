-- Initial database setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Office maps table
CREATE TABLE IF NOT EXISTS office_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    json_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES office_maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('workstation', 'meeting_room', 'cubicle', 'invalid_space')),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER DEFAULT 1,
    height INTEGER DEFAULT 1,
    capacity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent double bookings
    UNIQUE(space_id, date, start_time)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spaces_map_id ON spaces(map_id);
CREATE INDEX IF NOT EXISTS idx_reservations_space_id ON reservations(space_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);

-- Insert sample office map
INSERT INTO office_maps (id, name, description, json_data) VALUES (
    uuid_generate_v4(),
    'Main Office Floor',
    'Principal floor layout with workstations and meeting rooms',
    '{
        "grid": {
            "width": 20,
            "height": 15,
            "cellSize": 40
        },
        "spaces": []
    }'
) ON CONFLICT DO NOTHING;
