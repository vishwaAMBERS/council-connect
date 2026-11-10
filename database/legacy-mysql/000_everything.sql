CREATE DATABASE councilconnect;
USE councilconnect;
SELECT DATABASE();

USE councilconnect;

CREATE TABLE institutions (
    id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    email_domain VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE (code),
    UNIQUE (email_domain)
);

INSERT INTO institutions (
    id,
    name,
    code,
    email_domain
)
VALUES (
    UUID(),
    'Government College of Engineering Aurangabad',
    'GECA',
    'geca.ac.in'
);

SELECT * FROM institutions;

SHOW TABLES;

SELECT * FROM institutions;

USE councilconnect;

CREATE TABLE branches (
    id CHAR(36) NOT NULL,
    institution_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_branches_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_branch_code_per_institution
        UNIQUE (institution_id, code)
);

SELECT id, name, code
FROM institutions;

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Information Technology',
    'IT'
FROM institutions
WHERE code = 'GECA';

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Computer Science',
    'CS'
FROM institutions
WHERE code = 'GECA';

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Mechanical Engineering',
    'MECH'
FROM institutions
WHERE code = 'GECA';

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Civil Engineering',
    'CIVIL'
FROM institutions
WHERE code = 'GECA';

SELECT
    b.id,
    i.code AS institution,
    b.name,
    b.code,
    b.is_active
FROM branches b
JOIN institutions i
    ON b.institution_id = i.id
ORDER BY b.code;

USE councilconnect;

SELECT id, name, code
FROM branches
ORDER BY code;

USE councilconnect;

SET SQL_SAFE_UPDATES = 0;

UPDATE branches
SET name = 'Civil Engineering',
    code = 'CE'
WHERE code = 'CIVIL';

UPDATE branches
SET name = 'Computer Science and Engineering'
WHERE code = 'CS';

UPDATE branches
SET name = 'Mechanical Engineering',
    code = 'ME'
WHERE code = 'MECH';

SET SQL_SAFE_UPDATES = 1;

SELECT id, name, code
FROM branches
ORDER BY code;

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Electrical Engineering',
    'EE'
FROM institutions
WHERE code = 'GECA';

INSERT INTO branches (
    id,
    institution_id,
    name,
    code
)
SELECT
    UUID(),
    id,
    'Electronics & Telecommunication Engineering',
    'ET'
FROM institutions
WHERE code = 'GECA';

USE councilconnect;

CREATE TABLE users (
    id CHAR(36) NOT NULL,
    institution_id CHAR(36) NOT NULL,
    branch_id CHAR(36) NULL,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,

    role ENUM('student', 'representative', 'admin')
        NOT NULL DEFAULT 'student',

    year TINYINT NULL,
    about VARCHAR(200) NULL,
    avatar_url VARCHAR(500) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE (email),

    CONSTRAINT fk_users_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_users_institution (institution_id),
    INDEX idx_users_branch (branch_id),
    INDEX idx_users_role (role)
);

desc users;

USE councilconnect;

-- 1. Test Student: Computer Science
INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT
    UUID(),
    i.id,
    b.id,
    'Test Student',
    'student@geca.ac.in',
    'student',
    3
FROM institutions i
JOIN branches b
    ON b.institution_id = i.id
WHERE i.code = 'GECA'
  AND b.code = 'CS';


-- 2. Test Representative: Computer Science
INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT
    UUID(),
    i.id,
    b.id,
    'Test Representative',
    'representative@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN branches b
    ON b.institution_id = i.id
WHERE i.code = 'GECA'
  AND b.code = 'CS';


-- 3. Test Admin: Institution level
INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role
)
SELECT
    UUID(),
    i.id,
    NULL,
    'Test Admin',
    'admin@geca.ac.in',
    'admin'
FROM institutions i
WHERE i.code = 'GECA';

SELECT
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.year,
    b.name AS branch
FROM users u
LEFT JOIN branches b
    ON u.branch_id = b.id
ORDER BY u.role;

USE councilconnect;

CREATE TABLE academic_units (
    id CHAR(36) NOT NULL,
    institution_id CHAR(36) NOT NULL,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,

    type ENUM('engineering_branch', 'postgraduate_program')
        NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_academic_units_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_academic_unit_code
        UNIQUE (institution_id, code),

    INDEX idx_academic_units_type (type)
)

USE councilconnect;

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Computer Science and Engineering',
    'CSE',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Information Technology',
    'IT',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Mechanical Engineering',
    'MECH',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Electronics and Telecommunication Engineering',
    'ENTC',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Electrical Engineering',
    'ELEC',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Civil Engineering',
    'CIVIL',
    'engineering_branch'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Master of Computer Applications',
    'MCA',
    'postgraduate_program'
FROM institutions i
WHERE i.code = 'GECA';

INSERT INTO academic_units (
    id,
    institution_id,
    name,
    code,
    type
)
SELECT
    UUID(),
    i.id,
    'Master of Technology',
    'MTECH',
    'postgraduate_program'
FROM institutions i
WHERE i.code = 'GECA';

SELECT
    id,
    name,
    code,
    type
FROM academic_units
ORDER BY
    type,
    code;
    
USE councilconnect;

CREATE TABLE councils (
    id CHAR(36) NOT NULL,
    institution_id CHAR(36) NOT NULL,
    academic_unit_id CHAR(36) NULL,

    name VARCHAR(150) NOT NULL,

    type ENUM('main', 'departmental')
        NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_councils_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_councils_academic_unit
        FOREIGN KEY (academic_unit_id)
        REFERENCES academic_units(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (institution_id, name),

    INDEX idx_councils_type (type),
    INDEX idx_councils_academic_unit (academic_unit_id)
);

INSERT INTO councils (
    id,
    institution_id,
    academic_unit_id,
    name,
    type
)
SELECT
    UUID(),
    id,
    NULL,
    'Main Student Council',
    'main'
FROM institutions
WHERE code = 'GECA';

INSERT INTO councils (
    id,
    institution_id,
    academic_unit_id,
    name,
    type
)
SELECT
    UUID(),
    i.id,
    a.id,
    CONCAT(a.code, ' Departmental Council'),
    'departmental'
FROM institutions i
JOIN academic_units a
    ON a.institution_id = i.id
WHERE i.code = 'GECA';

SELECT
    c.id,
    c.name,
    c.type,
    a.code AS academic_unit
FROM councils c
LEFT JOIN academic_units a
    ON c.academic_unit_id = a.id
ORDER BY
    c.type,
    a.code;
    
USE councilconnect;

CREATE TABLE council_profiles (
    id CHAR(36) NOT NULL,

    council_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,

    position ENUM(
        'president',
        'co_council_secretary',
        'ladies_representative',
        'technical_secretary',
        'cultural_secretary',
        'sports_secretary',
        'reserved_representative',

        'general_secretary',
        'go_gs',
        'co_cultural_secretary',
        'cultural_member',
        'co_sports_secretary',
        'sports_member',
        'co_technical_secretary',
        'technical_member'
    ) NOT NULL,

    parent_profile_id CHAR(36) NULL,

    start_date DATE NULL,
    end_date DATE NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_council_profiles_council
        FOREIGN KEY (council_id)
        REFERENCES councils(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_council_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_council_profiles_parent
        FOREIGN KEY (parent_profile_id)
        REFERENCES council_profiles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT uq_council_profile_user
        UNIQUE (council_id, user_id),

    INDEX idx_council_profiles_position (position),
    INDEX idx_council_profiles_parent (parent_profile_id),
    INDEX idx_council_profiles_active (is_active)
);

DESCRIBE council_profiles;

INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'president',
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'admin@geca.ac.in'
WHERE c.name = 'Main Student Council';

SELECT
    cp.id,
    c.name AS council,
    u.full_name,
    u.email,
    cp.position,
    cp.start_date,
    cp.is_active
FROM council_profiles cp
JOIN councils c
    ON cp.council_id = c.id
JOIN users u
    ON cp.user_id = u.id;
    
USE councilconnect;

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE GS', 'cse.gs@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Go-GS', 'cse.gogs@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Cultural Secretary', 'cse.cultural@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Co-Cultural Secretary', 'cse.co.cultural@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Sports Secretary', 'cse.sports@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Co-Sports Secretary', 'cse.co.sports@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Technical Secretary', 'cse.technical@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    branch_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id, 'Test CSE Co-Technical Secretary', 'cse.co.technical@geca.ac.in', 'representative', 4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA' AND a.code = 'CSE';

SELECT full_name, email, role
FROM users
WHERE email LIKE 'cse.%@geca.ac.in'
ORDER BY email;

USE councilconnect;

ALTER TABLE users
ADD COLUMN academic_unit_id CHAR(36) NULL
AFTER institution_id;

USE councilconnect;

SET SQL_SAFE_UPDATES = 0;

UPDATE users u
JOIN branches b
    ON u.branch_id = b.id
JOIN academic_units a
    ON a.institution_id = u.institution_id
SET u.academic_unit_id = a.id
WHERE
    (b.code = 'CS'  AND a.code = 'CSE')
    OR
    (b.code = 'IT'  AND a.code = 'IT')
    OR
    (b.code = 'ME'  AND a.code = 'MECH')
    OR
    (b.code = 'CE'  AND a.code = 'CIVIL')
    OR
    (b.code = 'EE'  AND a.code = 'ELEC')
    OR
    (b.code = 'ET'  AND a.code = 'ENTC');

SET SQL_SAFE_UPDATES = 1;

SELECT
    u.full_name,
    u.email,
    b.code AS old_branch,
    a.code AS academic_unit
FROM users u
LEFT JOIN branches b
    ON u.branch_id = b.id
LEFT JOIN academic_units a
    ON u.academic_unit_id = a.id;
    
USE councilconnect;

ALTER TABLE users
DROP FOREIGN KEY fk_users_branch;

ALTER TABLE users
DROP INDEX idx_users_branch;

ALTER TABLE users
DROP COLUMN branch_id;

ALTER TABLE users
ADD CONSTRAINT fk_users_academic_unit
    FOREIGN KEY (academic_unit_id)
    REFERENCES academic_units(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE users
ADD INDEX idx_users_academic_unit (academic_unit_id);

DESCRIBE users;

USE councilconnect;

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE GS',
    'cse.gs@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Go-GS',
    'cse.gogs@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Cultural Secretary',
    'cse.cultural@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Co-Cultural Secretary',
    'cse.co.cultural@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Sports Secretary',
    'cse.sports@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Co-Sports Secretary',
    'cse.co.sports@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Technical Secretary',
    'cse.technical@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';

INSERT INTO users (
    id,
    institution_id,
    academic_unit_id,
    full_name,
    email,
    role,
    year
)
SELECT UUID(), i.id, a.id,
    'Test CSE Co-Technical Secretary',
    'cse.co.technical@geca.ac.in',
    'representative',
    4
FROM institutions i
JOIN academic_units a ON a.institution_id = i.id
WHERE i.code = 'GECA'
  AND a.code = 'CSE';
  
SELECT
    full_name,
    email,
    role
FROM users
WHERE email LIKE 'cse.%@geca.ac.in'
ORDER BY email;

INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'general_secretary',
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.gs@geca.ac.in'
WHERE c.name = 'CSE Departmental Council';

INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'go_gs',
    gs.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.gogs@geca.ac.in'
JOIN council_profiles gs
    ON gs.council_id = c.id
   AND gs.position = 'general_secretary'
WHERE c.name = 'CSE Departmental Council';


INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'cultural_secretary',
    gs.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.cultural@geca.ac.in'
JOIN council_profiles gs
    ON gs.council_id = c.id
   AND gs.position = 'general_secretary'
WHERE c.name = 'CSE Departmental Council';


INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'sports_secretary',
    gs.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.sports@geca.ac.in'
JOIN council_profiles gs
    ON gs.council_id = c.id
   AND gs.position = 'general_secretary'
WHERE c.name = 'CSE Departmental Council';


INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'technical_secretary',
    gs.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.technical@geca.ac.in'
JOIN council_profiles gs
    ON gs.council_id = c.id
   AND gs.position = 'general_secretary'
WHERE c.name = 'CSE Departmental Council';

INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'co_cultural_secretary',
    parent.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.co.cultural@geca.ac.in'
JOIN council_profiles parent
    ON parent.council_id = c.id
   AND parent.position = 'cultural_secretary'
WHERE c.name = 'CSE Departmental Council';


INSERT INTO council_profiles (
    id,
    council_id,
    user_id,
    position,
    parent_profile_id,
    start_date
)
SELECT
    UUID(),
    c.id,
    u.id,
    'co_sports_secretary',
    parent.id,
    CURDATE()
FROM councils c
JOIN users u
    ON u.email = 'cse.co.sports@geca.ac.in'
JOIN council_profiles parent
    ON parent.council_id = c.id
   AND parent.position = 'sports_secretary'
WHERE c.name = 'CSE Departmental Council';


SELECT
    u.full_name,
    cp.position,
    parent_u.full_name AS reports_to
FROM council_profiles cp
JOIN users u
    ON u.id = cp.user_id
LEFT JOIN council_profiles parent
    ON parent.id = cp.parent_profile_id
LEFT JOIN users parent_u
    ON parent_u.id = parent.user_id
JOIN councils c
    ON c.id = cp.council_id
WHERE c.name = 'CSE Departmental Council'
ORDER BY cp.position;