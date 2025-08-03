// index.js

import express from 'express';
import cors from 'cors';
import { supabase } from './supabaseClient.js';

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Root route
app.get('/', (req, res) => {
  res.send('✅ QR Backend API is running');
});

// ✅ Debug endpoint to check database tables
app.get('/debug/tables', async (req, res) => {
  try {
    // Query to list all tables in the public schema
    const { data, error } = await supabase.rpc('get_tables');

    if (error) {
      console.error('Error fetching tables:', error);
      return res.status(500).json({ message: 'Error fetching tables', error });
    }

    res.json({
      message: 'Available tables in public schema',
      tables: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Debug endpoint to check today's duty data
app.get('/debug/duty-today', async (req, res) => {
  try {
    // Hardcode to 04-08-2025 (August 4th)
    const dutyDate = '2025-08-04';

    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('duty_date', dutyDate)
      .order('hall', { ascending: true });

    if (error) {
      console.error('Error fetching duty data:', error);
      return res
        .status(500)
        .json({ message: 'Error fetching duty data', error });
    }

    res.json({
      message: 'Duty data for 04-08-2025 (August 4th)',
      date: dutyDate,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Debug endpoint to check all duty data
app.get('/debug/duty-all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('*')
      .order('duty_date', { ascending: false });

    if (error) {
      console.error('Error fetching all duty data:', error);
      return res
        .status(500)
        .json({ message: 'Error fetching all duty data', error });
    }

    res.json({
      message: 'All duty data',
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Debug endpoint to search for specific mobile number
app.get('/debug/mobile/:mobile_number', async (req, res) => {
  try {
    const { mobile_number } = req.params;

    // Hardcode to 04-08-2025 (August 4th)
    const dutyDate = '2025-08-04';

    // Search for mobile number
    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate);

    if (error) {
      console.error('Error searching for mobile:', error);
      return res
        .status(500)
        .json({ message: 'Error searching for mobile', error });
    }

    res.json({
      message: `Search results for mobile: ${mobile_number}`,
      date: dutyDate,
      count: data?.length || 0,
      data: data || [],
      currentTime: new Date().toTimeString().split(' ')[0],
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Debug endpoint to search for staff by name
app.get('/debug/search-staff/:name', async (req, res) => {
  try {
    const { name } = req.params;
    // Hardcode to 04-08-2025 (August 4th)
    const dutyDate = '2025-08-04';

    // Search for exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('assigned_staff_name', name)
      .eq('duty_date', dutyDate);

    // Search for partial match
    const { data: partialMatch, error: partialError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .ilike('assigned_staff_name', `%${name}%`)
      .eq('duty_date', dutyDate);

    res.json({
      message: 'Staff search results',
      searchName: name,
      date: dutyDate,
      exactMatch: {
        count: exactMatch?.length || 0,
        data: exactMatch || [],
        error: exactError,
      },
      partialMatch: {
        count: partialMatch?.length || 0,
        data: partialMatch || [],
        error: partialError,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Check if mobile number already exists in today's duty
app.get('/duty/check-mobile/:mobile_number', async (req, res) => {
  const { mobile_number } = req.params;

  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  try {
    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found"
      console.error('Error checking mobile:', error);
      return res
        .status(500)
        .json({ message: 'Error checking mobile number', error });
    }

    if (data) {
      // Mobile number exists - check if they've already submitted
      return res.json({
        exists: true,
        alreadySubmitted: !!data.submission_time,
        duty: data,
      });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Get staff by mobile number (for verification)
app.get('/staff/by-mobile/:mobile_number', async (req, res) => {
  const { mobile_number } = req.params;

  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  // Check if this mobile exists in duty
  const { data, error } = await supabase
    .from('invigilation_duty')
    .select('*')
    .eq('mobile_number', mobile_number)
    .eq('duty_date', dutyDate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res
        .status(404)
        .json({ message: 'Staff not found for 04-08-2025' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Error fetching staff', error });
  }

  if (!data) {
    return res.status(404).json({ message: 'Staff not found for 04-08-2025' });
  }

  res.json({
    name: data.assigned_staff_name,
    department: data.department,
    mobile_no: data.mobile_number,
    hall: data.hall,
    duty_date: data.duty_date,
  });
});

// ✅ Get today's duty assignments
app.get('/duty/today', async (req, res) => {
  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  const { data, error } = await supabase
    .from('invigilation_duty')
    .select('*')
    .eq('duty_date', dutyDate)
    .order('hall', { ascending: true });

  if (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Error fetching duty assignments', error });
  }

  res.json(data || []);
});

// ✅ Get all duty assignments (for admin dashboard)
app.get('/duty/all', async (req, res) => {
  const { data, error } = await supabase
    .from('invigilation_duty')
    .select('*')
    .order('duty_date', { ascending: false })
    .order('hall', { ascending: true });

  if (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Error fetching duty assignments', error });
  }

  res.json(data || []);
});

// ✅ Report for duty (check-in) - Mobile number based
app.post('/duty/report', async (req, res) => {
  const { mobile_number } = req.body;
  const now = new Date();
  // Format time as HH:MM:SS for PostgreSQL time type
  const currentTime = now.toTimeString().split(' ')[0];

  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  try {
    // Check if this mobile number already reported
    const existingCheck = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (existingCheck.data && existingCheck.data.checkin_time) {
      return res.status(400).json({
        message: 'Mobile number already reported',
        alreadySubmitted: !!existingCheck.data.submission_time,
        duty: existingCheck.data,
      });
    }

    // Find the duty assignment by mobile number
    const { data: dutyAssignment, error: dutyError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (dutyError) {
      console.error('Error finding duty assignment:', dutyError);
      return res.status(404).json({
        message: 'Duty assignment not found for this mobile number',
        details: `Mobile: ${mobile_number}, Date: ${dutyDate}`,
        error: dutyError,
      });
    }

    // Update the duty with check-in information
    console.log('Updating duty record:', {
      id: dutyAssignment.id,
      reported_staff_name: dutyAssignment.assigned_staff_name,
      checkin_time: currentTime,
      mobile_number: mobile_number,
      timestamp: now.toISOString(),
    });

    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        reported_staff_name: dutyAssignment.assigned_staff_name, // Same as assigned
        checkin_time: currentTime,
      })
      .eq('id', dutyAssignment.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating duty:', error);
      return res
        .status(500)
        .json({ message: 'Error reporting for duty', error });
    }

    console.log('Successfully updated duty record:', data);

    res.json({
      message: 'Successfully reported for duty',
      duty: data,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Submit papers (submission)
app.post('/duty/submit', async (req, res) => {
  const { mobile_number } = req.body;
  const now = new Date();
  // Format time as HH:MM:SS for PostgreSQL time type
  const currentTime = now.toTimeString().split(' ')[0];

  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  try {
    // Find the duty record for this mobile number
    const { data: dutyRecord, error: findError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (findError) {
      console.error('Error finding duty record:', findError);
      return res
        .status(404)
        .json({ message: 'Duty record not found for 04-08-2025' });
    }

    if (dutyRecord.submission_time) {
      return res.status(400).json({
        message: 'Papers already submitted',
        duty: dutyRecord,
      });
    }

    // Update with submission time
    console.log('Updating submission time:', {
      id: dutyRecord.id,
      submission_time: currentTime,
      mobile_number: mobile_number,
      timestamp: now.toISOString(),
    });

    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        submission_time: currentTime,
      })
      .eq('id', dutyRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating submission:', error);
      return res
        .status(500)
        .json({ message: 'Error submitting papers', error });
    }

    console.log('Successfully updated submission time:', data);

    res.json({
      message: 'Successfully submitted papers',
      duty: data,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Proxy check-in for absent staff
app.post('/duty/proxy', async (req, res) => {
  const {
    absent_staff_name,
    absent_department,
    absent_hall,
    proxy_staff_name,
    proxy_mobile_number,
    emergency_reason,
  } = req.body;

  // Hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';
  const now = new Date();
  // Format time as HH:MM:SS for PostgreSQL time type
  const currentTime = now.toTimeString().split(' ')[0];

  try {
    // Find the duty assignment for the absent staff
    const { data: dutyAssignment, error: dutyError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('assigned_staff_name', absent_staff_name)
      .eq('duty_date', dutyDate)
      .eq('hall', absent_hall)
      .single();

    if (dutyError) {
      console.error('Error finding duty assignment:', dutyError);
      return res
        .status(404)
        .json({ message: 'Duty assignment not found for absent staff' });
    }

    // Update with proxy information
    console.log('Updating proxy check-in:', {
      id: dutyAssignment.id,
      reported_staff_name: proxy_staff_name,
      checkin_time: currentTime,
      mobile_number: proxy_mobile_number,
      timestamp: now.toISOString(),
    });

    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        reported_staff_name: proxy_staff_name,
        checkin_time: currentTime,
        mobile_number: proxy_mobile_number,
      })
      .eq('id', dutyAssignment.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating duty with proxy:', error);
      return res
        .status(500)
        .json({ message: 'Error processing proxy check-in', error });
    }

    res.json({
      message: 'Successfully processed proxy check-in',
      duty: data,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Test endpoint to manually update check-in time
app.post('/debug/update-checkin/:mobile_number', async (req, res) => {
  try {
    const { mobile_number } = req.params;
    const now = new Date();
    // Format time as HH:MM:SS for PostgreSQL time type
    const currentTime = now.toTimeString().split(' ')[0];

    // Hardcode to 04-08-2025 (August 4th)
    const dutyDate = '2025-08-04';

    console.log('Manual update attempt:', {
      mobile_number,
      currentTime,
      date: dutyDate,
      timestamp: now.toISOString(),
    });

    // Find the duty record
    const { data: dutyRecord, error: findError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (findError) {
      console.error('Error finding duty record:', findError);
      return res.status(404).json({
        message: 'Duty record not found',
        error: findError,
      });
    }

    console.log('Found duty record:', dutyRecord);

    // Update with check-in time
    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        reported_staff_name: dutyRecord.assigned_staff_name,
        checkin_time: currentTime,
      })
      .eq('id', dutyRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating duty:', error);
      return res.status(500).json({ message: 'Error updating duty', error });
    }

    console.log('Successfully updated duty record:', data);

    res.json({
      message: 'Successfully updated check-in time',
      duty: data,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Test endpoint to check database schema
app.get('/debug/schema', async (req, res) => {
  try {
    // Get a sample record to see the field types
    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching schema:', error);
      return res.status(500).json({ message: 'Error fetching schema', error });
    }

    res.json({
      message: 'Database schema sample',
      sampleRecord: data?.[0] || null,
      fieldTypes: data?.[0]
        ? Object.keys(data[0]).map((key) => ({
            field: key,
            value: data[0][key],
            type: typeof data[0][key],
          }))
        : [],
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Test endpoint to manually set check-in time for testing
app.post('/debug/set-checkin/:mobile_number', async (req, res) => {
  try {
    const { mobile_number } = req.params;
    const { checkin_time } = req.body;
    const now = new Date();

    // Hardcode to 04-08-2025 (August 4th)
    const dutyDate = '2025-08-04';

    console.log('Manual set check-in time:', {
      mobile_number,
      checkin_time,
      timestamp: now.toISOString(),
    });

    // Find the duty record
    const { data: dutyRecord, error: findError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (findError) {
      console.error('Error finding duty record:', findError);
      return res.status(404).json({
        message: 'Duty record not found',
        error: findError,
      });
    }

    console.log('Found duty record:', dutyRecord);

    // Update with check-in time
    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        reported_staff_name: dutyRecord.assigned_staff_name,
        checkin_time: checkin_time || now.toTimeString().split(' ')[0],
      })
      .eq('id', dutyRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating duty:', error);
      return res.status(500).json({ message: 'Error updating duty', error });
    }

    console.log('Successfully updated duty record:', data);

    res.json({
      message: 'Successfully set check-in time',
      duty: data,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Test endpoint to verify time format and database connection
app.get('/debug/test-time', async (req, res) => {
  try {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];

    console.log('Testing time format:', {
      original: now.toTimeString(),
      formatted: timeString,
      timestamp: now.toISOString(),
    });

    // Test inserting a sample time into database
    const { data, error } = await supabase
      .from('invigilation_duty')
      .select('checkin_time, submission_time')
      .limit(1);

    res.json({
      message: 'Time format test',
      currentTime: timeString,
      databaseSample: data?.[0] || null,
      error: error,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Test endpoint to verify check-in time functionality
app.get('/debug/test-checkin/:mobile_number', async (req, res) => {
  try {
    const { mobile_number } = req.params;
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const dutyDate = '2025-08-04';

    console.log('Testing check-in time functionality:', {
      mobile_number,
      currentTime,
      dutyDate,
      timestamp: now.toISOString(),
    });

    // Find the duty record
    const { data: dutyRecord, error: findError } = await supabase
      .from('invigilation_duty')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('duty_date', dutyDate)
      .single();

    if (findError) {
      return res.status(404).json({
        message: 'Duty record not found for testing',
        error: findError,
      });
    }

    // Test updating check-in time
    const { data, error } = await supabase
      .from('invigilation_duty')
      .update({
        reported_staff_name: dutyRecord.assigned_staff_name,
        checkin_time: currentTime,
      })
      .eq('id', dutyRecord.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: 'Error testing check-in time update',
        error,
      });
    }

    res.json({
      message: 'Check-in time test successful',
      originalRecord: dutyRecord,
      updatedRecord: data,
      testTime: currentTime,
      dutyDate: dutyDate,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Export if using server.js
export default app;
