-- =====================================================================
--  Expense Voucher Management System - DEVELOPMENT seed data
--
--  Run this once, straight after schema.sql (npm run db:setup does both).
--
--  !! LOCAL DEVELOPMENT ONLY !!
--  The five demo accounts below share one well-known demo password
--  (it is written in README.md). Change the passwords or delete these
--  accounts before deploying the application anywhere public.
--
--  Dates are written relative to "today" so the dashboards (approved
--  today, rejected today, recent activity) always have something to show.
-- =====================================================================

USE prachay_expense_vouchers;

-- ---------------------------------------------------------------------
--  Demo users. password_hash is a bcrypt hash (cost 10), never plain text.
--  A new hash can be generated with:  npm run db:hash -- "NewPassword"
-- ---------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, role, employee_code, department) VALUES
  (1, 'Vikram Deshmukh', 'director@prachay.test',  '$2b$10$ROqQNr2f3JW250XD5kUMKu0Dud8gvB5Wv3ira4qbNfajaKh.KOwlm', 'DIRECTOR', 'DIR-001', 'Administration'),
  (2, 'Neha Kulkarni',   'accounts@prachay.test',  '$2b$10$a0cO9i8XJ0hU/Cow/aC/L.GbzTGLwU/2CZLvGN5IcVk0rf3U/GALK', 'ACCOUNTS', 'ACC-001', 'Finance'),
  (3, 'Aarav Sharma',    'employee1@prachay.test', '$2b$10$idHwY51nKX1Nhe9wyQr.TOxAeFLZeLyhEcGExufyrmTAPX8d98Om.', 'EMPLOYEE', 'EMP-101', 'Sales'),
  (4, 'Priya Nair',      'employee2@prachay.test', '$2b$10$0eOHeoBFTrN3cCXOAUt9seqvRL9TZb7fmJMtTnSCqIji.F.9RtSa.', 'EMPLOYEE', 'EMP-102', 'Information Technology'),
  (5, 'Rohan Mehta',     'employee3@prachay.test', '$2b$10$oXDrpFc2LlRICFSNeD48VuQwrcMBvGMOZhh5bHnQz8qp/G/rBmG9O', 'EMPLOYEE', 'EMP-103', 'Operations');

-- ---------------------------------------------------------------------
--  Demo vouchers: 3 drafts, 4 pending approval, 5 approved, 2 rejected.
--  The signature images live in server/uploads/seed/.
-- ---------------------------------------------------------------------
SET @yr = YEAR(CURDATE());

INSERT INTO vouchers
  (id, voucher_number, employee_id, voucher_date, expense_date, department,
   expense_title, expense_category, expense_description, amount, employee_signature_path,
   status, submitted_at, reviewed_by, director_signature_path, approved_at, rejected_at, rejection_reason,
   created_at, updated_at)
VALUES
  -- Aarav Sharma (Sales)
  (1, CONCAT('EV-', @yr, '-00001'), 3, CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 17 DAY, 'Sales',
   'Client visit travel to Mumbai', 'Travel',
   'Return train tickets and airport transfer for the quarterly review with a client in Mumbai.',
   4850.00, 'seed/employee-aarav.png',
   'APPROVED', NOW() - INTERVAL 14 DAY, 1, 'seed/director-vikram.png', NOW() - INTERVAL 12 DAY, NULL, NULL,
   NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 12 DAY),

  (2, CONCAT('EV-', @yr, '-00002'), 3, CURDATE() - INTERVAL 7 DAY, CURDATE() - INTERVAL 8 DAY, 'Sales',
   'Client lunch meeting', 'Client Meeting',
   'Working lunch with two prospective clients to discuss a new portfolio account.',
   2360.50, 'seed/employee-aarav.png',
   'APPROVED', NOW() - INTERVAL 7 DAY + INTERVAL 20 MINUTE, 1, 'seed/director-vikram.png', NOW() - INTERVAL 5 DAY, NULL, NULL,
   NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 5 DAY),

  (3, CONCAT('EV-', @yr, '-00003'), 3, CURDATE() - INTERVAL 2 DAY, CURDATE() - INTERVAL 4 DAY, 'Sales',
   'Hotel stay for Pune roadshow', 'Accommodation',
   'Two nights of hotel accommodation while attending the investor roadshow in Pune.',
   7200.00, 'seed/employee-aarav.png',
   'PENDING_APPROVAL', NOW() - INTERVAL 1 DAY, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY),

  (4, CONCAT('EV-', @yr, '-00004'), 3, CURDATE() - INTERVAL 6 DAY, CURDATE() - INTERVAL 9 DAY, 'Sales',
   'Taxi fares for client visits', 'Local Conveyance',
   'Local taxi fares for four client visits during the week.',
   980.00, 'seed/employee-aarav.png',
   'REJECTED', NOW() - INTERVAL 5 DAY, 1, NULL, NULL, NOW() - INTERVAL 3 DAY,
   'Receipts for two of the four trips are missing. Please raise a fresh voucher with all receipts attached.',
   NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 3 DAY),

  (5, CONCAT('EV-', @yr, '-00005'), 3, CURDATE() - INTERVAL 1 DAY, CURDATE() - INTERVAL 2 DAY, 'Sales',
   'Product brochure printing', 'Office Supplies',
   '200 colour brochures printed for the upcoming investor awareness camp.',
   1540.00, NULL,
   'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),

  -- Priya Nair (Information Technology)
  (6, CONCAT('EV-', @yr, '-00006'), 4, CURDATE() - INTERVAL 3 DAY, CURDATE() - INTERVAL 5 DAY, 'Information Technology',
   'Annual IDE licence renewal', 'Software',
   'One-year renewal of the development IDE licence used by the engineering team.',
   12999.00, 'seed/employee-priya.png',
   'APPROVED', NOW() - INTERVAL 2 DAY, 1, 'seed/director-vikram.png', NOW() - INTERVAL 5 MINUTE, NULL, NULL,
   NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 5 MINUTE),

  (7, CONCAT('EV-', @yr, '-00007'), 4, CURDATE() - INTERVAL 3 DAY, CURDATE() - INTERVAL 6 DAY, 'Information Technology',
   'Cloud certification exam fee', 'Training',
   'Exam fee for the cloud solutions architect certification approved in the training plan.',
   11800.00, 'seed/employee-priya.png',
   'PENDING_APPROVAL', NOW() - INTERVAL 2 DAY, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY),

  (8, CONCAT('EV-', @yr, '-00008'), 4, CURDATE(), CURDATE() - INTERVAL 1 DAY, 'Information Technology',
   'Replacement keyboard and mouse', 'Office Supplies',
   'Wireless keyboard and mouse to replace a faulty set at the support desk.',
   3450.00, 'seed/employee-priya.png',
   'PENDING_APPROVAL', NOW() - INTERVAL 30 MINUTE, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 50 MINUTE, NOW() - INTERVAL 30 MINUTE),

  (9, CONCAT('EV-', @yr, '-00009'), 4, CURDATE() - INTERVAL 4 DAY, CURDATE() - INTERVAL 10 DAY, 'Information Technology',
   'Home broadband bill', 'Internet and Phone',
   'Monthly home broadband bill while working remotely.',
   1179.00, 'seed/employee-priya.png',
   'REJECTED', NOW() - INTERVAL 3 DAY, 1, NULL, NULL, NOW() - INTERVAL 10 MINUTE,
   'Home broadband is already covered by the monthly remote-work allowance, so it cannot be claimed again.',
   NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 10 MINUTE),

  (10, CONCAT('EV-', @yr, '-00010'), 4, CURDATE() - INTERVAL 1 DAY, CURDATE() - INTERVAL 1 DAY, 'Information Technology',
   'Team dinner after release', 'Meals',
   'Dinner for the six-member team after the trading platform release went live.',
   5600.00, 'seed/employee-priya.png',
   'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),

  -- Rohan Mehta (Operations)
  (11, CONCAT('EV-', @yr, '-00011'), 5, CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 11 DAY, 'Operations',
   'Courier charges for KYC documents', 'Miscellaneous',
   'Courier charges for sending original KYC documents to the head office.',
   760.00, 'seed/employee-rohan.png',
   'APPROVED', NOW() - INTERVAL 10 DAY + INTERVAL 15 MINUTE, 1, 'seed/director-vikram.png', NOW() - INTERVAL 8 DAY, NULL, NULL,
   NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 8 DAY),

  (12, CONCAT('EV-', @yr, '-00012'), 5, CURDATE() - INTERVAL 5 DAY, CURDATE() - INTERVAL 7 DAY, 'Operations',
   'Branch audit travel to Nagpur', 'Travel',
   'Bus tickets and local travel for the half-yearly branch audit in Nagpur.',
   6320.00, 'seed/employee-rohan.png',
   'APPROVED', NOW() - INTERVAL 4 DAY, 1, 'seed/director-vikram.png', NOW() - INTERVAL 2 DAY, NULL, NULL,
   NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 2 DAY),

  (13, CONCAT('EV-', @yr, '-00013'), 5, CURDATE() - INTERVAL 4 DAY, CURDATE() - INTERVAL 5 DAY, 'Operations',
   'Stationery for branch office', 'Office Supplies',
   'Printer paper, files and folders purchased for the branch office.',
   2210.75, 'seed/employee-rohan.png',
   'PENDING_APPROVAL', NOW() - INTERVAL 3 DAY, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY),

  (14, CONCAT('EV-', @yr, '-00014'), 5, CURDATE() - INTERVAL 2 DAY, CURDATE() - INTERVAL 6 DAY, 'Operations',
   'Overnight stay during branch audit', 'Accommodation',
   'One night of hotel accommodation during the Nagpur branch audit.',
   4100.00, NULL,
   'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL,
   NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY);

-- The next voucher created through the application will be number 15.
INSERT INTO voucher_sequences (seq_year, last_number) VALUES (@yr, 14);

-- ---------------------------------------------------------------------
--  Audit trail matching the vouchers above.
-- ---------------------------------------------------------------------
INSERT INTO voucher_history (voucher_id, action, from_status, to_status, performed_by, remarks, created_at) VALUES
  (1,  'CREATED',   NULL,               'DRAFT',            3, NULL, NOW() - INTERVAL 15 DAY),
  (1,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 3, NULL, NOW() - INTERVAL 14 DAY),
  (1,  'APPROVED',  'PENDING_APPROVAL', 'APPROVED',         1, NULL, NOW() - INTERVAL 12 DAY),

  (2,  'CREATED',   NULL,               'DRAFT',            3, NULL, NOW() - INTERVAL 7 DAY),
  (2,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 3, NULL, NOW() - INTERVAL 7 DAY + INTERVAL 20 MINUTE),
  (2,  'APPROVED',  'PENDING_APPROVAL', 'APPROVED',         1, NULL, NOW() - INTERVAL 5 DAY),

  (3,  'CREATED',   NULL,               'DRAFT',            3, NULL, NOW() - INTERVAL 2 DAY),
  (3,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 3, NULL, NOW() - INTERVAL 1 DAY),

  (4,  'CREATED',   NULL,               'DRAFT',            3, NULL, NOW() - INTERVAL 6 DAY),
  (4,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 3, NULL, NOW() - INTERVAL 5 DAY),
  (4,  'REJECTED',  'PENDING_APPROVAL', 'REJECTED',         1,
   'Receipts for two of the four trips are missing. Please raise a fresh voucher with all receipts attached.',
   NOW() - INTERVAL 3 DAY),

  (5,  'CREATED',   NULL,               'DRAFT',            3, NULL, NOW() - INTERVAL 1 DAY),

  (6,  'CREATED',   NULL,               'DRAFT',            4, NULL, NOW() - INTERVAL 3 DAY),
  (6,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 4, NULL, NOW() - INTERVAL 2 DAY),
  (6,  'APPROVED',  'PENDING_APPROVAL', 'APPROVED',         1, NULL, NOW() - INTERVAL 5 MINUTE),

  (7,  'CREATED',   NULL,               'DRAFT',            4, NULL, NOW() - INTERVAL 3 DAY),
  (7,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 4, NULL, NOW() - INTERVAL 2 DAY),

  (8,  'CREATED',   NULL,               'DRAFT',            4, NULL, NOW() - INTERVAL 50 MINUTE),
  (8,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 4, NULL, NOW() - INTERVAL 30 MINUTE),

  (9,  'CREATED',   NULL,               'DRAFT',            4, NULL, NOW() - INTERVAL 4 DAY),
  (9,  'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 4, NULL, NOW() - INTERVAL 3 DAY),
  (9,  'REJECTED',  'PENDING_APPROVAL', 'REJECTED',         1,
   'Home broadband is already covered by the monthly remote-work allowance, so it cannot be claimed again.',
   NOW() - INTERVAL 10 MINUTE),

  (10, 'CREATED',   NULL,               'DRAFT',            4, NULL, NOW() - INTERVAL 1 DAY),

  (11, 'CREATED',   NULL,               'DRAFT',            5, NULL, NOW() - INTERVAL 10 DAY),
  (11, 'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 5, NULL, NOW() - INTERVAL 10 DAY + INTERVAL 15 MINUTE),
  (11, 'APPROVED',  'PENDING_APPROVAL', 'APPROVED',         1, NULL, NOW() - INTERVAL 8 DAY),

  (12, 'CREATED',   NULL,               'DRAFT',            5, NULL, NOW() - INTERVAL 5 DAY),
  (12, 'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 5, NULL, NOW() - INTERVAL 4 DAY),
  (12, 'APPROVED',  'PENDING_APPROVAL', 'APPROVED',         1, NULL, NOW() - INTERVAL 2 DAY),

  (13, 'CREATED',   NULL,               'DRAFT',            5, NULL, NOW() - INTERVAL 4 DAY),
  (13, 'SUBMITTED', 'DRAFT',            'PENDING_APPROVAL', 5, NULL, NOW() - INTERVAL 3 DAY),

  (14, 'CREATED',   NULL,               'DRAFT',            5, NULL, NOW() - INTERVAL 2 DAY);
