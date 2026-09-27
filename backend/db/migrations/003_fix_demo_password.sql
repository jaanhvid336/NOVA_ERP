UPDATE users
SET password_hash = '$2a$10$bhPmxhIe2hyKEoSPm5mht.mb09efh.mttBLEOzCJvf/ONqT3FrnF2'
WHERE email IN ('rep@nova.local', 'manager@nova.local', 'warehouse@nova.local', 'finance@nova.local');
