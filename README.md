# QR Code Check-in Backend

This is the backend API for the QR Code Check-in system.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the backend directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   PORT=3000
   ```

3. **Database Tables Required**
   The system expects the following tables in your Supabase database:
   
   - `staff_directory` - Staff member information
   - `teacher_hall_assignment` - Hall assignments for teachers
   - `checkin_logs` - Log of all check-ins

4. **Start the Server**
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```

## API Endpoints

- `GET /` - Health check
- `GET /staff/by-mobile/:mobile_no` - Get staff by mobile number
- `GET /hall-plans` - Get all hall assignments
- `GET /hall-assignment/:teacher_name` - Get hall assignment by teacher name
- `POST /checkin-log` - Log a check-in
- `GET /checkin-logs/:staff_id` - Get check-in logs for a staff member

## Database Schema

### staff_directory
- staff_id (SERIAL)
- name (VARCHAR(100))
- email (VARCHAR(100))
- mobile_no (VARCHAR(15))
- gender (VARCHAR(10))
- age (INT)
- department (VARCHAR(100))
- designation (VARCHAR(50))
- blood_group (VARCHAR(5))
- address (TEXT)
- date_of_joining (DATE)

### teacher_hall_assignment
- assignment_id (SERIAL)
- teacher_name (VARCHAR(100))
- mobile_no (VARCHAR(15))
- dept_id (VARCHAR(10))
- dept_name (VARCHAR(100))
- hall_no (VARCHAR(10))
- assignment_date (DATE)

### checkin_logs
- log_id (SERIAL)
- staff_id (INT)
- checkin_time (TIMESTAMP)
- status (VARCHAR(20))
- qr_code_hash (TEXT)
- device_id (VARCHAR(100))
- ip_address (VARCHAR(45))
- location_lat (DOUBLE PRECISION)
- location_lng (DOUBLE PRECISION)
- remarks (TEXT) 