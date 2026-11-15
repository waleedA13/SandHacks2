-- Fixture data only. Every name, address and phone number is made up.
-- Scores follow scoreVerdict in lib/score.ts for each row's three facts.

insert into listings (id, insurer, plan, city, state, name, credential, address, phone, npi, source_url) values
  ('00000000-0000-4000-8000-000000000001', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Avery Example',      'LMFT', '101 Example St, San Diego, CA 92101', '(619) 555-0101', null, 'https://example.com/directory/1'),
  ('00000000-0000-4000-8000-000000000002', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Jordan Placeholder', 'LCSW', '102 Example St, San Diego, CA 92101', '(619) 555-0102', null, 'https://example.com/directory/2'),
  ('00000000-0000-4000-8000-000000000003', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Riley Fixture',      'PsyD', '103 Example St, San Diego, CA 92103', '(619) 555-0103', null, 'https://example.com/directory/3'),
  ('00000000-0000-4000-8000-000000000004', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Casey Demo',         'LPCC', '104 Example St, San Diego, CA 92104', '(619) 555-0104', null, 'https://example.com/directory/4'),
  ('00000000-0000-4000-8000-000000000005', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Morgan Testcase',    'LMFT', '105 Example St, San Diego, CA 92105', '(619) 555-0105', null, 'https://example.com/directory/5'),
  ('00000000-0000-4000-8000-000000000006', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Quinn Sample',       'PhD',  '106 Example St, San Diego, CA 92106', '(619) 555-0106', null, 'https://example.com/directory/6'),
  ('00000000-0000-4000-8000-000000000007', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Taylor Mockwell',    'LCSW', '107 Example St, San Diego, CA 92107', '(619) 555-0107', null, 'https://example.com/directory/7'),
  ('00000000-0000-4000-8000-000000000008', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Drew Fakename',      'LMFT', '108 Example St, San Diego, CA 92108', '(619) 555-0108', null, 'https://example.com/directory/8'),
  ('00000000-0000-4000-8000-000000000009', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Sky Notreal',        'LPCC', '109 Example St, San Diego, CA 92109', '(619) 555-0109', null, 'https://example.com/directory/9'),
  ('00000000-0000-4000-8000-000000000010', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Robin Dummy',        'PsyD', '110 Example St, San Diego, CA 92110', '(619) 555-0110', null, 'https://example.com/directory/10'),
  ('00000000-0000-4000-8000-000000000011', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Jamie Seedling',     null,   null,                                  '(619) 555-0111', null, 'https://example.com/directory/11'),
  ('00000000-0000-4000-8000-000000000012', 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Alex Nobody',        'LMFT', '112 Example St, San Diego, CA 92112', '(619) 555-0112', null, 'https://example.com/directory/12');

insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason, specialties, languages, telehealth, self_pay_min, self_pay_max, license_status, license_discipline) values
  -- 70 and above
  ('00000000-0000-4000-8000-000000000001', 'yes',     'yes',     'yes',     100, 'Their own website says they take Aetna and are accepting new clients.',            '{anxiety,depression}', '{spanish}', 'yes',     150, 180, 'active',    'no'),
  ('00000000-0000-4000-8000-000000000002', 'yes',     'yes',     'unknown',  85, 'Their Psychology Today profile lists Aetna, but does not say if they have openings.', '{trauma,grief}',       '{}',        'yes',     null, null, 'unchecked', 'unknown'),
  ('00000000-0000-4000-8000-000000000003', 'yes',     'unknown', 'yes',      85, 'Their website says they have openings, but does not mention Aetna.',               '{teens,adhd}',         '{spanish}', 'no',      200, 200, 'active',    'no'),
  ('00000000-0000-4000-8000-000000000004', 'yes',     'unknown', 'unknown',  70, 'Their website was updated recently, but says nothing about insurance or openings.', '{couples}',            '{}',        'unknown', 120, 160, 'unchecked', 'unknown'),
  -- 40 to 69
  ('00000000-0000-4000-8000-000000000005', 'unknown', 'yes',     'unknown',  65, 'Their Zocdoc page lists Aetna. We could not tell if they still see clients.',      '{depression}',         '{vietnamese}', 'yes',  null, null, 'unchecked', 'unknown'),
  ('00000000-0000-4000-8000-000000000006', 'unknown', 'unknown', 'unknown',  50, 'We found no other information about this listing.',                                '{}',                   '{}',        'unknown', null, null, 'unchecked', 'unknown'),
  ('00000000-0000-4000-8000-000000000007', 'unknown', 'unknown', 'yes',      65, 'Their Headway page says they are taking new clients.',                             '{anxiety,children}',   '{}',        'yes',     null, null, 'unchecked', 'unknown'),
  ('00000000-0000-4000-8000-000000000008', 'yes',     'no',      'yes',      60, 'Their website says they are taking new clients but only accept self-pay.',         '{addiction}',          '{}',        'yes',     175, 225, 'unchecked', 'unknown'),
  -- below 40
  ('00000000-0000-4000-8000-000000000009', 'no',      'unknown', 'unknown',  20, 'Their Psychology Today profile says they moved out of state.',                     '{}',                   '{}',        'unknown', null, null, 'unchecked', 'unknown'),
  ('00000000-0000-4000-8000-000000000010', 'yes',     'no',      'no',       20, 'Their website says they no longer take Aetna and are not taking new clients.',     '{grief}',              '{}',        'no',      null, null, 'not_found', 'unknown'),
  ('00000000-0000-4000-8000-000000000011', 'unknown', 'no',      'no',        0, 'Their Zocdoc page says their schedule is full and lists no insurance.',            '{}',                   '{}',        'unknown', null, null, 'not_found', 'unknown'),
  ('00000000-0000-4000-8000-000000000012', 'no',      'no',      'no',        0, 'The state licensing board lists their licence as inactive.',                       '{trauma}',             '{}',        'no',      null, null, 'inactive',  'unknown');

insert into evidence (listing_id, source, url, raw_text) values
  ('00000000-0000-4000-8000-000000000001', 'practice_site',    'https://example.com/avery',            'Now accepting new clients. In-network with Aetna. Sessions in English and Spanish.'),
  ('00000000-0000-4000-8000-000000000001', 'psychology_today', 'https://example.com/pt/avery',         'Avery Example, LMFT. Insurance: Aetna. Self-pay $150-$180.'),
  ('00000000-0000-4000-8000-000000000001', 'license_board',    'https://example.com/board/avery',      'License status: Current/Active. No public discipline.'),
  ('00000000-0000-4000-8000-000000000002', 'psychology_today', 'https://example.com/pt/jordan',        'Jordan Placeholder, LCSW. Insurance: Aetna, Cigna. Specialties: trauma, grief.'),
  ('00000000-0000-4000-8000-000000000002', 'practice_site',    'https://example.com/jordan',           'Offering in-person and video sessions in San Diego.'),
  ('00000000-0000-4000-8000-000000000003', 'practice_site',    'https://example.com/riley',            'I have openings for teens and adults with ADHD. Hablo espanol.'),
  ('00000000-0000-4000-8000-000000000003', 'license_board',    'https://example.com/board/riley',      'License status: Current/Active. No public discipline.'),
  ('00000000-0000-4000-8000-000000000008', 'practice_site',    'https://example.com/drew',             'Accepting new clients. I am an out-of-network provider; sessions are $175-$225.'),
  ('00000000-0000-4000-8000-000000000008', 'headway',          'https://example.com/headway/drew',     'Drew Fakename. Not currently accepting insurance through Headway.'),
  ('00000000-0000-4000-8000-000000000010', 'practice_site',    'https://example.com/robin',            'As of this year I no longer accept Aetna. My practice is full.'),
  ('00000000-0000-4000-8000-000000000010', 'license_board',    'https://example.com/board/robin',      'No matching licence found for this name.'),
  ('00000000-0000-4000-8000-000000000011', 'license_board',    'https://example.com/board/jamie',      'No matching licence found for this name.'),
  ('00000000-0000-4000-8000-000000000012', 'license_board',    'https://example.com/board/alex',       'License status: Inactive.'),
  ('00000000-0000-4000-8000-000000000012', 'psychology_today', 'https://example.com/pt/alex',          'This profile is no longer active.');

insert into calls (listing_id, status, takes_plan, accepting_new, summary) values
  ('00000000-0000-4000-8000-000000000004', 'done', 'yes', 'yes', 'Demo call: the person who answered said they take Aetna and have openings next week.');

-- Booking paths (issue #45): two with a booking link, three landlines without one, three mobiles.
update listings set booking_url = 'https://example.com/book/avery', booking_source = 'zocdoc', phone_line_type = 'landline'
  where id = '00000000-0000-4000-8000-000000000001';
update listings set booking_url = 'https://example.com/book/riley', booking_source = 'practice_site', phone_line_type = 'landline'
  where id = '00000000-0000-4000-8000-000000000003';
update listings set phone_line_type = 'landline' where id in
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000007');
update listings set phone_line_type = 'mobile' where id in
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000009');
-- Pay yourself: does not take Aetna, sees self-pay clients at a posted fee.
update verdicts set sees_self_pay = 'yes' where listing_id = '00000000-0000-4000-8000-000000000008';
