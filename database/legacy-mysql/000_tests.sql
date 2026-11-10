-- ============================================================
-- CouncilConnect Database Demonstration / Test Script
-- File: tests.sql
-- Purpose: Show and test all database work completed so far.
-- Database: councilconnect
-- ============================================================

USE councilconnect;

-- ============================================================
-- 1. DATABASE CHECK
-- ============================================================

SELECT DATABASE() AS current_database;

SHOW TABLES;


-- ============================================================
-- 2. INSTITUTION
-- ============================================================

SELECT
    id,
    name,
    code,
    email_domain,
    is_active,
    created_at
FROM institutions;


-- ============================================================
-- 3. ENGINEERING BRANCHES
-- ============================================================

SELECT
    id,
    name,
    code,
    is_active
FROM branches
ORDER BY code;


-- ============================================================
-- 4. ACADEMIC UNITS
-- Includes the eight units represented in the departmental
-- student council hierarchy.
-- ============================================================

SELECT
    id,
    name,
    code,
    type,
    is_active
FROM academic_units
ORDER BY type, code;


-- ============================================================
-- 5. COUNCILS
-- Shows the Main Student Council and the eight
-- Departmental Student Councils.
-- ============================================================

SELECT
    c.id,
    c.name AS council,
    c.type,
    a.name AS academic_unit,
    a.code AS academic_unit_code,
    c.is_active
FROM councils c
LEFT JOIN academic_units a
    ON c.academic_unit_id = a.id
ORDER BY
    c.type,
    a.code;


-- ============================================================
-- 6. USERS
-- Shows users together with their academic units.
-- ============================================================

SELECT
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.year,
    a.code AS academic_unit,
    a.name AS academic_unit_name,
    u.is_active
FROM users u
LEFT JOIN academic_units a
    ON u.academic_unit_id = a.id
ORDER BY
    u.role,
    u.full_name;


-- ============================================================
-- 7. USER → ACADEMIC UNIT RELATIONSHIP
-- ============================================================

SELECT
    a.code AS academic_unit,
    a.name AS academic_unit_name,
    COUNT(u.id) AS number_of_users
FROM academic_units a
LEFT JOIN users u
    ON u.academic_unit_id = a.id
GROUP BY
    a.id,
    a.code,
    a.name
ORDER BY a.code;


-- ============================================================
-- 8. COUNCIL PROFILES
-- Shows people, councils, positions and tenure.
-- ============================================================

SELECT
    cp.id,
    c.name AS council,
    u.full_name,
    u.email,
    cp.position,
    cp.start_date,
    cp.end_date,
    cp.is_active
FROM council_profiles cp
JOIN councils c
    ON cp.council_id = c.id
JOIN users u
    ON cp.user_id = u.id
ORDER BY
    c.name,
    cp.position;


-- ============================================================
-- 9. MAIN STUDENT COUNCIL
-- ============================================================

SELECT
    u.full_name,
    cp.position,
    parent_u.full_name AS reports_to
FROM council_profiles cp
JOIN councils c
    ON cp.council_id = c.id
JOIN users u
    ON cp.user_id = u.id
LEFT JOIN council_profiles parent
    ON parent.id = cp.parent_profile_id
LEFT JOIN users parent_u
    ON parent_u.id = parent.user_id
WHERE c.type = 'main';


-- ============================================================
-- 10. CSE DEPARTMENTAL COUNCIL HIERARCHY
-- Demonstrates the parent_profile_id hierarchy.
-- ============================================================

SELECT
    c.name AS council,
    u.full_name AS member,
    cp.position,
    parent_u.full_name AS reports_to
FROM council_profiles cp
JOIN councils c
    ON c.id = cp.council_id
JOIN users u
    ON u.id = cp.user_id
LEFT JOIN council_profiles parent
    ON parent.id = cp.parent_profile_id
LEFT JOIN users parent_u
    ON parent_u.id = parent.user_id
WHERE c.name = 'CSE Departmental Council'
ORDER BY
    CASE cp.position
        WHEN 'general_secretary' THEN 1
        WHEN 'go_gs' THEN 2
        WHEN 'cultural_secretary' THEN 3
        WHEN 'co_cultural_secretary' THEN 4
        WHEN 'sports_secretary' THEN 5
        WHEN 'co_sports_secretary' THEN 6
        WHEN 'technical_secretary' THEN 7
        WHEN 'co_technical_secretary' THEN 8
        ELSE 99
    END;


-- ============================================================
-- 11. ALL CHILD → PARENT COUNCIL RELATIONSHIPS
-- ============================================================

SELECT
    cp.position AS child_position,
    child.full_name AS child_member,
    parent.position AS parent_position,
    parent_user.full_name AS parent_member
FROM council_profiles cp
JOIN users child
    ON child.id = cp.user_id
JOIN council_profiles parent
    ON parent.id = cp.parent_profile_id
JOIN users parent_user
    ON parent_user.id = parent.user_id
ORDER BY child_position;


-- ============================================================
-- 12. COMPLETE USER → ACADEMIC UNIT → COUNCIL → POSITION VIEW
-- ============================================================

SELECT
    u.full_name AS user_name,
    u.role,
    a.code AS academic_unit,
    c.name AS council,
    cp.position,
    parent_u.full_name AS reports_to
FROM users u
LEFT JOIN academic_units a
    ON a.id = u.academic_unit_id
LEFT JOIN council_profiles cp
    ON cp.user_id = u.id
LEFT JOIN councils c
    ON c.id = cp.council_id
LEFT JOIN council_profiles parent
    ON parent.id = cp.parent_profile_id
LEFT JOIN users parent_u
    ON parent_u.id = parent.user_id
ORDER BY
    c.name,
    cp.position,
    u.full_name;


-- ============================================================
-- 13. FOREIGN KEY RELATIONSHIPS
-- Demonstrates relational integrity.
-- ============================================================

SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'councilconnect'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY
    TABLE_NAME,
    CONSTRAINT_NAME;


-- ============================================================
-- 14. TABLE STRUCTURES
-- ============================================================

DESCRIBE institutions;

DESCRIBE branches;

DESCRIBE academic_units;

DESCRIBE users;

DESCRIBE councils;

DESCRIBE council_profiles;


-- ============================================================
-- 15. DATABASE RECORD COUNT / HEALTH CHECK
-- ============================================================

SELECT
    'institutions' AS table_name,
    COUNT(*) AS records
FROM institutions

UNION ALL

SELECT
    'branches',
    COUNT(*)
FROM branches

UNION ALL

SELECT
    'academic_units',
    COUNT(*)
FROM academic_units

UNION ALL

SELECT
    'users',
    COUNT(*)
FROM users

UNION ALL

SELECT
    'councils',
    COUNT(*)
FROM councils

UNION ALL

SELECT
    'council_profiles',
    COUNT(*)
FROM council_profiles;


-- ============================================================
-- END OF COUNCILCONNECT DATABASE TESTS
-- ============================================================
