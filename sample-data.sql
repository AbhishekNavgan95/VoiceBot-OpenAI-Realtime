-- ============================================
-- Sample Data for Lilavati Hospital Voice Assistant
-- Insert this data after running the main schema
-- ============================================

-- ============================================
-- HOSPITAL LOCATIONS
-- ============================================

INSERT INTO hospital_locations (name, branch, address, city, state, pincode, phone_number, emergency_number, email, latitude, longitude, timings, facilities, services, is_active) VALUES
('Lilavati Hospital and Research Centre', 'Bandra West', 'A-791, Bandra Reclamation, Bandra West', 'Mumbai', 'Maharashtra', '400050', '+91-22-2640-0000', '+91-22-2640-1111', 'info@lilavatihospital.com', 19.0596, 72.8295,
'{"opd": "9:00 AM - 5:00 PM (Mon-Sat)", "emergency": "24/7", "visiting_hours": "4:00 PM - 6:00 PM"}',
ARRAY['24/7 Emergency', 'ICU', 'NICU', 'Blood Bank', 'Pharmacy', 'Cafeteria', 'Parking', 'ATM'],
ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Gastroenterology', 'Pediatrics', 'Gynecology', 'Emergency'],
true);

-- ============================================
-- DEPARTMENTS
-- ============================================

INSERT INTO departments (name, description, services, location_id, phone_extension, floor_number, is_active)
SELECT
    name, description, services, loc.id, phone_extension, floor_number, true
FROM (VALUES
    ('Cardiology', 'Heart and cardiovascular care', ARRAY['ECG', 'Echo', 'Angiography', 'Cardiac Surgery', 'Pacemaker'], '2101', 2),
    ('Neurology', 'Brain and nervous system care', ARRAY['CT Scan', 'MRI', 'EEG', 'Stroke Care', 'Epilepsy Treatment'], '3101', 3),
    ('Orthopedics', 'Bone and joint care', ARRAY['Joint Replacement', 'Fracture Care', 'Sports Medicine', 'Spine Surgery'], '4101', 4),
    ('Oncology', 'Cancer care and treatment', ARRAY['Chemotherapy', 'Radiation Therapy', 'Surgical Oncology', 'Palliative Care'], '5101', 5),
    ('Gastroenterology', 'Digestive system care', ARRAY['Endoscopy', 'Colonoscopy', 'Liver Care', 'IBD Treatment'], '2201', 2),
    ('Pediatrics', 'Child healthcare', ARRAY['Vaccinations', 'Growth Monitoring', 'Neonatal Care', 'Child Surgery'], '6101', 6),
    ('Gynecology', 'Women''s health and maternity', ARRAY['Prenatal Care', 'Delivery', 'Gynec Surgery', 'IVF'], '7101', 7),
    ('Emergency', '24/7 Emergency medical services', ARRAY['Trauma Care', 'Critical Care', 'Ambulance', 'Triage'], '9999', 0),
    ('Radiology', 'Medical imaging services', ARRAY['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography'], '1101', 1),
    ('Pathology', 'Laboratory and diagnostic tests', ARRAY['Blood Tests', 'Biopsy', 'Microbiology', 'Histopathology'], '1201', 1)
) AS dept(name, description, services, phone_extension, floor_number)
CROSS JOIN hospital_locations loc
WHERE loc.branch = 'Bandra West';

-- ============================================
-- DOCTORS
-- ============================================

INSERT INTO doctors (name, specialization, qualification, experience_years, department_id, location_id, languages, consultation_fee, rating, bio, is_available, is_active)
SELECT
    name, specialization, qualification, experience_years, dept.id, loc.id, languages, consultation_fee, rating, bio, true, true
FROM (VALUES
    ('Dr. Rajesh Kumar', 'Cardiology', 'MBBS, MD, DM (Cardiology)', 15, 'Cardiology', ARRAY['English', 'Hindi', 'Marathi'], 1500.00, 4.8, 'Senior Cardiologist with expertise in interventional cardiology'),
    ('Dr. Priya Sharma', 'Cardiology', 'MBBS, MD, DM (Cardiology)', 12, 'Cardiology', ARRAY['English', 'Hindi'], 1200.00, 4.7, 'Specialist in non-invasive cardiology and preventive care'),
    ('Dr. Amit Patel', 'Neurology', 'MBBS, MD, DM (Neurology)', 18, 'Neurology', ARRAY['English', 'Hindi', 'Gujarati'], 1800.00, 4.9, 'Expert in stroke management and epilepsy treatment'),
    ('Dr. Sneha Desai', 'Neurology', 'MBBS, MD, DM (Neurology)', 10, 'Neurology', ARRAY['English', 'Marathi'], 1400.00, 4.6, 'Specializes in headache disorders and movement disorders'),
    ('Dr. Vikram Singh', 'Orthopedics', 'MBBS, MS (Orthopedics)', 20, 'Orthopedics', ARRAY['English', 'Hindi'], 1600.00, 4.8, 'Renowned joint replacement surgeon'),
    ('Dr. Anjali Mehta', 'Orthopedics', 'MBBS, MS (Orthopedics)', 8, 'Orthopedics', ARRAY['English', 'Hindi', 'Marathi'], 1200.00, 4.5, 'Sports medicine and arthroscopy specialist'),
    ('Dr. Suresh Reddy', 'Oncology', 'MBBS, MD, DM (Oncology)', 22, 'Oncology', ARRAY['English', 'Hindi', 'Telugu'], 2000.00, 4.9, 'Medical oncologist with expertise in breast and lung cancer'),
    ('Dr. Kavita Iyer', 'Oncology', 'MBBS, MD, DM (Oncology)', 14, 'Oncology', ARRAY['English', 'Hindi', 'Tamil'], 1800.00, 4.7, 'Specialist in hematological malignancies'),
    ('Dr. Ramesh Gupta', 'Gastroenterology', 'MBBS, MD, DM (Gastro)', 16, 'Gastroenterology', ARRAY['English', 'Hindi'], 1500.00, 4.7, 'Expert in therapeutic endoscopy and liver diseases'),
    ('Dr. Pooja Verma', 'Pediatrics', 'MBBS, MD (Pediatrics)', 12, 'Pediatrics', ARRAY['English', 'Hindi', 'Marathi'], 1000.00, 4.8, 'Child specialist with focus on infectious diseases'),
    ('Dr. Anil Joshi', 'Pediatrics', 'MBBS, MD, DM (Neonatology)', 18, 'Pediatrics', ARRAY['English', 'Hindi', 'Marathi'], 1400.00, 4.9, 'Neonatologist and NICU specialist'),
    ('Dr. Neha Kulkarni', 'Gynecology', 'MBBS, MS (Gynecology)', 14, 'Gynecology', ARRAY['English', 'Hindi', 'Marathi'], 1300.00, 4.8, 'High-risk pregnancy and laparoscopic surgery expert'),
    ('Dr. Deepak Shah', 'Emergency Medicine', 'MBBS, MD (Emergency)', 10, 'Emergency', ARRAY['English', 'Hindi', 'Gujarati'], 1200.00, 4.7, 'Emergency physician with trauma care expertise')
) AS doc(name, specialization, qualification, experience_years, dept_name, languages, consultation_fee, rating, bio)
CROSS JOIN hospital_locations loc
LEFT JOIN departments dept ON dept.name = doc.dept_name AND dept.location_id = loc.id
WHERE loc.branch = 'Bandra West';

-- ============================================
-- DOCTOR AVAILABILITY (Weekly Schedule)
-- ============================================

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, location_id, max_patients, is_active)
SELECT
    d.id, dow.day, dow.start_time, dow.end_time, d.location_id, 20, true
FROM doctors d
CROSS JOIN (VALUES
    (1, '09:00', '13:00'), -- Monday
    (2, '14:00', '18:00'), -- Tuesday
    (3, '09:00', '13:00'), -- Wednesday
    (4, '14:00', '18:00'), -- Thursday
    (5, '09:00', '13:00'), -- Friday
    (6, '09:00', '13:00')  -- Saturday
) AS dow(day, start_time, end_time)
WHERE d.is_active = true;

-- ============================================
-- CONTACT DETAILS
-- ============================================

INSERT INTO contact_details (category, department_id, location_id, phone_number, email, extension, available_hours, priority, is_active)
SELECT
    category, dept.id, loc.id, phone_number, email, extension, available_hours, priority, true
FROM (VALUES
    ('General Inquiry', NULL, '+91-22-2640-0000', 'info@lilavatihospital.com', '0', '24/7', 100),
    ('Appointments', NULL, '+91-22-2640-2000', 'appointments@lilavatihospital.com', '2000', '9 AM - 6 PM', 90),
    ('Emergency', 'Emergency', '+91-22-2640-1111', 'emergency@lilavatihospital.com', '1111', '24/7', 100),
    ('Cardiology Department', 'Cardiology', '+91-22-2640-2101', 'cardiology@lilavatihospital.com', '2101', '9 AM - 5 PM', 80),
    ('Neurology Department', 'Neurology', '+91-22-2640-3101', 'neurology@lilavatihospital.com', '3101', '9 AM - 5 PM', 80),
    ('Orthopedics Department', 'Orthopedics', '+91-22-2640-4101', 'orthopedics@lilavatihospital.com', '4101', '9 AM - 5 PM', 80),
    ('Billing and Insurance', NULL, '+91-22-2640-3000', 'billing@lilavatihospital.com', '3000', '9 AM - 6 PM', 70),
    ('Medical Records', NULL, '+91-22-2640-4000', 'records@lilavatihospital.com', '4000', '9 AM - 5 PM', 60)
) AS contact(category, dept_name, phone_number, email, extension, available_hours, priority)
CROSS JOIN hospital_locations loc
LEFT JOIN departments dept ON dept.name = contact.dept_name AND dept.location_id = loc.id
WHERE loc.branch = 'Bandra West';

-- ============================================
-- HOSPITAL INFO
-- ============================================

INSERT INTO hospital_info (category, title, content, tags, display_order, is_active) VALUES
('About', 'About Lilavati Hospital', 'Lilavati Hospital and Research Centre is a 323-bed multi-specialty tertiary care hospital located in Bandra, Mumbai. Established in 1978, we are accredited by JCI, NABH, and NABL. We offer 40+ medical specialties with state-of-the-art infrastructure and experienced medical professionals.', ARRAY['about', 'hospital', 'history'], 1, true),

('Facilities', 'Emergency Services', 'Our 24/7 Emergency Department is equipped to handle all types of medical emergencies including cardiac emergencies, trauma, stroke, and critical care. We have a dedicated ambulance service and a team of emergency physicians available round the clock.', ARRAY['emergency', 'facilities', '24x7'], 2, true),

('Facilities', 'Operation Theatres', 'We have 12 modular operation theatres equipped with the latest surgical equipment and technology. All OTs are equipped with laminar air flow systems to maintain sterile environment.', ARRAY['surgery', 'facilities', 'ot'], 3, true),

('Facilities', 'ICU and Critical Care', 'Our hospital has multiple ICUs including Medical ICU, Surgical ICU, Cardiac ICU, Neuro ICU, and Neonatal ICU. All ICUs are equipped with advanced monitoring systems and life support equipment.', ARRAY['icu', 'critical care', 'facilities'], 4, true),

('Services', 'Diagnostic Services', 'We offer comprehensive diagnostic services including Pathology, Radiology (X-Ray, CT, MRI, Ultrasound), Nuclear Medicine, and specialized diagnostic procedures. Most reports are available within 24 hours.', ARRAY['diagnostics', 'lab', 'radiology'], 5, true),

('Services', 'Pharmacy', '24/7 pharmacy service available with all essential and specialized medicines. We accept all major insurance cards.', ARRAY['pharmacy', 'medicines'], 6, true),

('Policies', 'Visiting Hours', 'General ward visiting hours: 4:00 PM - 6:00 PM daily. ICU visiting hours: 11:00 AM - 12:00 PM and 4:00 PM - 5:00 PM. Only two visitors allowed at a time. Children below 12 years are not allowed in ICU.', ARRAY['visiting', 'timings', 'policy'], 7, true),

('Policies', 'Admission Process', 'For planned admissions, please contact our admission desk at extension 5000. For emergency admissions, proceed directly to Emergency Department. Please carry your ID proof, insurance documents (if applicable), and previous medical records.', ARRAY['admission', 'process'], 8, true),

('Accreditation', 'Quality and Accreditations', 'Lilavati Hospital is accredited by Joint Commission International (JCI), National Accreditation Board for Hospitals (NABH), and National Accreditation Board for Testing and Calibration Laboratories (NABL). We maintain the highest standards of patient care and safety.', ARRAY['accreditation', 'quality', 'jci', 'nabh'], 9, true),

('Amenities', 'Patient Amenities', 'We offer various amenities for patient comfort including deluxe and suite rooms, TV in all rooms, complimentary WiFi, cafeteria, coffee shop, ATM, and ample parking space.', ARRAY['amenities', 'facilities', 'comfort'], 10, true);

-- ============================================
-- FLOOR PLANS
-- ============================================

INSERT INTO floor_plans (location_id, floor_number, floor_name, departments, facilities, description)
SELECT
    loc.id, floor_number, floor_name, departments, facilities, description
FROM (VALUES
    (0, 'Ground Floor', ARRAY['Emergency', 'Pharmacy', 'Registration'], ARRAY['Main Entrance', 'Emergency Entrance', 'Parking', 'ATM'], 'Main entrance, emergency services, and registration'),
    (1, 'First Floor', ARRAY['Radiology', 'Pathology', 'Diagnostics'], ARRAY['X-Ray', 'CT Scan', 'MRI', 'Blood Collection'], 'Diagnostic and imaging services'),
    (2, 'Second Floor', ARRAY['Cardiology', 'Gastroenterology'], ARRAY['Cath Lab', 'ECG', 'Echo', 'Endoscopy'], 'Cardiac and GI services'),
    (3, 'Third Floor', ARRAY['Neurology'], ARRAY['EEG', 'Stroke Unit'], 'Neurological services'),
    (4, 'Fourth Floor', ARRAY['Orthopedics'], ARRAY['Physiotherapy', 'Plaster Room'], 'Orthopedic services'),
    (5, 'Fifth Floor', ARRAY['Oncology'], ARRAY['Chemotherapy', 'Radiation Therapy'], 'Cancer care services'),
    (6, 'Sixth Floor', ARRAY['Pediatrics'], ARRAY['NICU', 'Pediatric ICU'], 'Children''s services'),
    (7, 'Seventh Floor', ARRAY['Gynecology'], ARRAY['Labor Room', 'NICU'], 'Maternity services'),
    (8, 'Eighth Floor', NULL, ARRAY['General Ward', 'Private Rooms'], 'Patient rooms and wards')
) AS floor(floor_number, floor_name, departments, facilities, description)
CROSS JOIN hospital_locations loc
WHERE loc.branch = 'Bandra West';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify data insertion
SELECT 'Hospital Locations' as table_name, COUNT(*) as count FROM hospital_locations
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctors
UNION ALL
SELECT 'Doctor Availability', COUNT(*) FROM doctor_availability
UNION ALL
SELECT 'Contact Details', COUNT(*) FROM contact_details
UNION ALL
SELECT 'Hospital Info', COUNT(*) FROM hospital_info
UNION ALL
SELECT 'Floor Plans', COUNT(*) FROM floor_plans;

-- ============================================
-- TEST QUERIES
-- ============================================

-- Test: Get all cardiologists
-- SELECT name, specialization, consultation_fee FROM doctors WHERE specialization ILIKE '%cardio%';

-- Test: Get all departments with services
-- SELECT name, services FROM departments;

-- Test: Get emergency contact
-- SELECT phone_number FROM contact_details WHERE category = 'Emergency';

-- Test: Get hospital visiting hours
-- SELECT content FROM hospital_info WHERE title ILIKE '%visiting%';
