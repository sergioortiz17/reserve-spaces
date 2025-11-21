# API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication
Currently, no authentication is required. All endpoints are publicly accessible.

## Response Format
All API responses follow a consistent JSON format:

### Success Response
```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Endpoints

### Health Check

#### GET /health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "office-reservations-api"
}
```

---

### Office Maps

#### GET /maps
Get all office maps.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Main Office Floor",
    "description": "Principal floor layout",
    "json_data": {
      "grid": {
        "width": 20,
        "height": 15,
        "cellSize": 40
      },
      "spaces": [...]
    },
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z",
    "spaces": [...]
  }
]
```

#### GET /maps/:id
Get a specific office map.

**Parameters:**
- `id` (string, required): Map UUID

**Response:** Same as single map object above.

#### POST /maps
Create a new office map.

**Request Body:**
```json
{
  "name": "New Office Floor",
  "description": "Description of the floor",
  "json_data": {
    "grid": {
      "width": 20,
      "height": 15,
      "cellSize": 40
    },
    "spaces": []
  }
}
```

**Response:** Created map object.

#### PUT /maps/:id
Update an existing office map.

**Parameters:**
- `id` (string, required): Map UUID

**Request Body:** Same as POST, but all fields are optional.

**Response:** Updated map object.

#### DELETE /maps/:id
Delete an office map.

**Parameters:**
- `id` (string, required): Map UUID

**Response:**
```json
{
  "message": "Map deleted successfully"
}
```

---

### Spaces

#### GET /spaces
Get all spaces, optionally filtered by map.

**Query Parameters:**
- `map_id` (string, optional): Filter spaces by map UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "map_id": "uuid",
    "name": "Workstation 1",
    "type": "workstation",
    "x": 5,
    "y": 3,
    "width": 1,
    "height": 1,
    "capacity": 1,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

#### GET /spaces/:id
Get a specific space.

**Parameters:**
- `id` (string, required): Space UUID

**Response:** Single space object with reservations included.

#### POST /spaces
Create a new space.

**Request Body:**
```json
{
  "map_id": "uuid",
  "name": "New Workstation",
  "type": "workstation",
  "x": 10,
  "y": 5,
  "width": 1,
  "height": 1,
  "capacity": 1
}
```

**Valid Types:**
- `workstation`
- `meeting_room`
- `cubicle`

**Response:** Created space object.

#### PUT /spaces/:id
Update an existing space.

**Parameters:**
- `id` (string, required): Space UUID

**Request Body:** Same as POST, but all fields are optional.

**Response:** Updated space object.

#### DELETE /spaces/:id
Delete a space.

**Parameters:**
- `id` (string, required): Space UUID

**Response:**
```json
{
  "message": "Space deleted successfully"
}
```

#### GET /spaces/:id/availability
Check space availability for a specific date.

**Parameters:**
- `id` (string, required): Space UUID

**Query Parameters:**
- `date` (string, required): Date in YYYY-MM-DD format

**Response:**
```json
{
  "space_id": "uuid",
  "date": "2024-01-15",
  "is_available": true,
  "reservations": []
}
```

---

### Reservations

#### GET /reservations
Get reservations with optional filtering.

**Query Parameters:**
- `from` (string, optional): Start date (YYYY-MM-DD)
- `to` (string, optional): End date (YYYY-MM-DD)
- `user_id` (string, optional): Filter by user ID
- `space_id` (string, optional): Filter by space UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "space_id": "uuid",
    "user_id": "john.doe",
    "user_name": "John Doe",
    "date": "2024-01-15",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "status": "active",
    "notes": "Working on project X",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z",
    "space": {...}
  }
]
```

#### GET /reservations/:id
Get a specific reservation.

**Parameters:**
- `id` (string, required): Reservation UUID

**Response:** Single reservation object with space details.

#### POST /reservations
Create a new reservation.

**Request Body:**
```json
{
  "space_id": "uuid",
  "user_id": "john.doe",
  "user_name": "John Doe",
  "date": "2024-01-15",
  "start_time": "09:00",
  "end_time": "17:00",
  "notes": "Working on project X"
}
```

**Validation Rules:**
- Date cannot be more than 1 week in the future
- Date cannot be in the past
- Start time must be before end time
- Space must exist and be available

**Response:** Created reservation object.

#### PUT /reservations/:id
Update an existing reservation.

**Parameters:**
- `id` (string, required): Reservation UUID

**Request Body:** Same as POST, but all fields are optional.

**Response:** Updated reservation object.

#### DELETE /reservations/:id
Cancel a reservation (soft delete).

**Parameters:**
- `id` (string, required): Reservation UUID

**Response:**
```json
{
  "message": "Reservation cancelled successfully"
}
```

---

## Error Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (e.g., double booking)
- `500` - Internal Server Error

### Common Error Messages
- `"Invalid UUID format"`
- `"Space not found"`
- `"Cannot reserve more than 1 week in advance"`
- `"Space is already reserved for this time slot"`
- `"Invalid date format (use YYYY-MM-DD)"`
- `"Invalid time format (use HH:MM)"`
- `"Start time must be before end time"`

---

## Rate Limiting
Currently, no rate limiting is implemented. All endpoints can be called without restrictions.

## CORS
CORS is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev server)

## Examples

### Create a Reservation
```bash
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "john.doe",
    "user_name": "John Doe",
    "date": "2024-01-15",
    "start_time": "09:00",
    "end_time": "17:00",
    "notes": "Working on quarterly report"
  }'
```

### Check Availability
```bash
curl "http://localhost:8080/api/spaces/123e4567-e89b-12d3-a456-426614174000/availability?date=2024-01-15"
```

### Get Reservations for Date Range
```bash
curl "http://localhost:8080/api/reservations?from=2024-01-01&to=2024-01-31&user_id=john.doe"
```
