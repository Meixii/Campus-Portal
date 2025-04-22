const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Initialize DB tables
const initDb = () => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT,
        status TEXT DEFAULT 'pending',
        active INTEGER DEFAULT 1,
        last_login TEXT,
        name TEXT,
        student_id TEXT,
        course TEXT,
        year_section TEXT,
        courses TEXT,
        sections TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_username TEXT,
        description TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT,
        completed_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        name TEXT,
        description TEXT,
        created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS professor_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professor_username TEXT,
        subject_id INTEGER,
        UNIQUE(professor_username, subject_id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS student_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        subject_id INTEGER,
        UNIQUE(student_id, subject_id)
    )`);
    
    // Create attendance tables
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        professor_username TEXT,
        subject_id INTEGER NOT NULL,
        status TEXT,
        date TEXT,
        timestamp TEXT,
        FOREIGN KEY (subject_id) REFERENCES subjects(id),
        FOREIGN KEY (student_id) REFERENCES users(student_id),
        FOREIGN KEY (professor_username) REFERENCES users(username)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS student_self_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        status TEXT,
        date TEXT,
        notes TEXT,
        timestamp TEXT,
        subject_id INTEGER NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id),
        FOREIGN KEY (student_id) REFERENCES users(student_id)
    )`);
    
    // Initialize test accounts after tables are created
    setTimeout(() => {
        initTestAccounts();
        // Initialize subjects after tables are created
        setTimeout(() => {
            initializeBasicSubjects();
        }, 500);
    }, 500);
};
initDb();

// Initialize test accounts if not present
function initTestAccounts() {
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
        if (!user) {
            db.run('INSERT INTO users (username, password_hash, role, status, name, active) VALUES (?, ?, ?, ?, ?, ?)',
                ['admin', bcrypt.hashSync('admin123', 10), 'admin', 'authorized', 'System Administrator', 1]);
            console.log('Created default admin account: admin/admin123');
        }
    });
    db.get('SELECT * FROM users WHERE username = ?', ['prof1'], (err, user) => {
        if (!user) {
            db.run('INSERT INTO users (username, password_hash, role, status, name, courses, sections, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                ['prof1', bcrypt.hashSync('password', 10), 'professor', 'authorized', 'Professor One', 'BSCS,BSIT', '3A,2A', 1]);
            console.log('Created default professor account: prof1/password');
        }
    });
    db.get('SELECT * FROM users WHERE username = ?', ['20250001'], (err, user) => {
        if (!user) {
            db.run('INSERT INTO users (username, password_hash, role, status, name, student_id, course, year_section, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                ['20250001', bcrypt.hashSync('20250001', 10), 'student', 'authorized', 'Student One', '20250001', 'BSCS', '3A', 1]);
            console.log('Created default student account: 20250001/20250001');
        }
    });
}

// Student ID auto-generation
function generateStudentId() {
    return new Promise((resolve, reject) => {
        const baseId = 20250001;
        
        // Query the database for the latest student ID
        db.all('SELECT student_id FROM users WHERE role = "student" ORDER BY student_id DESC LIMIT 1', [], (err, rows) => {
            if (err) {
                console.error('Error fetching latest student ID:', err);
                // Fallback to in-memory calculation if database query fails
                const lastId = students.length > 0 ? Math.max(...students.map(s => parseInt(s.student_id || '0'))) : baseId - 1;
                resolve((lastId + 1).toString());
            } else {
                let nextId = baseId;
                if (rows.length > 0 && rows[0].student_id) {
                    // Get the maximum ID from the database
                    try {
                        const lastDbId = parseInt(rows[0].student_id);
                        if (!isNaN(lastDbId)) {
                            nextId = Math.max(lastDbId + 1, baseId);
                        }
                    } catch (e) {
                        console.error('Error parsing student ID:', e);
                    }
                }
                resolve(nextId.toString());
            }
        });
    });
}

// Register
app.post('/api/register', (req, res) => {
    const { username, password, role, course, year_section } = req.body;
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = { id: users.length + 1, username, password: hashedPassword, role };
    users.push(newUser);
    
    if (role === 'student') {
        generateStudentId().then(student_id => {
            students.push({ username, student_id, course, year_section });
            res.status(201).json({ message: 'User registered successfully' });
        }).catch(err => {
            console.error('Error generating student ID:', err);
            res.status(500).json({ error: 'Failed to generate student ID' });
        });
    } else {
        res.status(201).json({ message: 'User registered successfully' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (!user) return res.status(400).json({ error: 'User not found' });
        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(400).json({ error: 'Incorrect password' });
        if (user.status !== 'authorized') return res.status(403).json({ error: 'Account not authorized' });
        req.session.user = { username: user.username, role: user.role };
        db.run('UPDATE users SET last_login = ? WHERE username = ?', [new Date().toISOString(), username]);
        res.json({ username: user.username, role: user.role });
    });
});

// Admin: List users
app.get('/api/admin/users', (req, res) => {
    db.all('SELECT username, role, status FROM users', [], (err, rows) => {
        res.json(rows);
    });
});

// Admin: Authorize/deauthorize user
app.post('/api/admin/authorize', (req, res) => {
    const { username, action } = req.body;
    const status = action === 'authorize' ? 'authorized' : 'pending';
    db.run('UPDATE users SET status = ? WHERE username = ?', [status, username], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true });
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// Middleware for role-based dashboard protection
function requireRole(role) {
    return (req, res, next) => {
        if (!req.session.user || req.session.user.role !== role) {
            return res.redirect('/index.html');
        }
        next();
    };
}

// Serve dashboards with role protection
app.get('/admin/dashboardAdmin.html', requireRole('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboardAdmin.html'));
});
app.get('/professor/dashboardProf.html', requireRole('professor'), (req, res) => {
    res.sendFile(path.join(__dirname, 'professor', 'dashboardProf.html'));
});
app.get('/student/dashboardStudent.html', requireRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'student', 'dashboardStudent.html'));
});

// API to get current user info
app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.session.user);
});

// Endpoint to get student profile
app.get('/api/student/profile', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    db.get('SELECT name, student_id, course, year_section, active, last_login FROM users WHERE username = ?', [req.session.user.username], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(row);
    });
});

// Endpoint to get professor profile and student counts
app.get('/api/professor/profile', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    db.get('SELECT name, courses, sections, active, last_login FROM users WHERE username = ?', [req.session.user.username], (err, prof) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        // Get student counts for each course+section
        let courseArr = (prof.courses||'').split(',').map(c=>c.trim()).filter(Boolean);
        let sectionArr = (prof.sections||'').split(',').map(s=>s.trim()).filter(Boolean);
        let combos = [];
        courseArr.forEach(course => {
            sectionArr.forEach(section => {
                combos.push({course, section});
            });
        });
        if (combos.length === 0) return res.json({ ...prof, handled: [] });
        let handled = [];
        let done = 0;
        combos.forEach(({course, section}) => {
            db.get('SELECT COUNT(*) as count FROM users WHERE role = "student" AND course = ? AND year_section = ? AND active = 1', [course, section], (err, row) => {
                handled.push({ course, section, count: row ? row.count : 0 });
                done++;
                if (done === combos.length) {
                    res.json({ ...prof, handled });
                }
            });
        });
    });
});

// Student To-Do API
function requireStudent(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    next();
}
// Get all tasks
app.get('/api/student/todo', requireStudent, (req, res) => {
    db.all('SELECT * FROM todo WHERE student_username = ?', [req.session.user.username], (err, rows) => {
        res.json(rows);
    });
});
// Add task
app.post('/api/student/todo', requireStudent, (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Missing description' });
    db.run('INSERT INTO todo (student_username, description, completed, created_at) VALUES (?, ?, 0, ?)', [req.session.user.username, description, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ id: this.lastID });
    });
});
// Update task
app.put('/api/student/todo/:id', requireStudent, (req, res) => {
    const { completed } = req.body;
    db.run('UPDATE todo SET completed = ?, completed_at = ? WHERE id = ? AND student_username = ?', [completed ? 1 : 0, completed ? new Date().toISOString() : null, req.params.id, req.session.user.username], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true });
    });
});
// Delete task
app.delete('/api/student/todo/:id', requireStudent, (req, res) => {
    db.run('DELETE FROM todo WHERE id = ? AND student_username = ?', [req.params.id, req.session.user.username], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true });
    });
});

// Admin: Add professor
app.post('/api/admin/professors', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username, password, name, courses, sections, subjects } = req.body;
    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if professor already exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('DB error checking existing user:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (user) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Create new professor - always authorized
        const hash = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password_hash, role, status, name, courses, sections, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [username, hash, 'professor', 'authorized', name, courses || '', sections || '', 1], 
            function(err) {
                if (err) {
                    console.error('DB error creating professor:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                // Handle subject assignments if provided
                if (subjects && Array.isArray(subjects) && subjects.length > 0) {
                    // Get subject IDs by code
                    const assignSubjects = () => {
                        let subjectPromises = subjects.map(subjectCode => {
                            // Find description from our reference data
                            let description = null;
                            Object.values(subjectsByYearSection || {}).forEach(yearSubjects => {
                                const found = yearSubjects.find(s => s.code === subjectCode);
                                if (found) description = found.description;
                            });
                            
                            // Ensure subject exists and then assign it
                            return ensureSubjectExists(subjectCode, description)
                                .then(subjectId => {
                                    return new Promise((resolve, reject) => {
                                        db.run('INSERT OR IGNORE INTO professor_subjects (professor_username, subject_id) VALUES (?, ?)',
                                            [username, subjectId], 
                                            function(err) {
                                                if (err) return reject(err);
                                                resolve();
                                            }
                                        );
                                    });
                                });
                        });
                        
                        Promise.all(subjectPromises)
                            .then(() => {
                                res.status(201).json({ 
                                    success: true, 
                                    message: 'Professor added successfully with subject assignments',
                                    id: this.lastID 
                                });
                            })
                            .catch(err => {
                                console.error('Error assigning subjects:', err);
                                res.status(201).json({ 
                                    success: true, 
                                    message: 'Professor added successfully but some subject assignments failed',
                                    id: this.lastID 
                                });
                            });
                    };
                    
                    assignSubjects();
                } else {
                    res.status(201).json({ 
                        success: true, 
                        message: 'Professor added successfully and authorized',
                        id: this.lastID 
                    });
                }
            }
        );
    });
});

// Admin: Update professor
app.put('/api/admin/professors', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username, password, name, courses, sections, subjects } = req.body;
    if (!username || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if professor exists
    db.get('SELECT * FROM users WHERE username = ? AND role = "professor"', [username], (err, user) => {
        if (err) {
            console.error('DB error checking existing professor:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Professor not found' });
        }
        
        // Update the professor
        const updateProfessor = () => {
            if (password) {
                // Update with new password
                const hash = bcrypt.hashSync(password, 10);
                db.run('UPDATE users SET password_hash = ?, name = ?, courses = ?, sections = ? WHERE username = ? AND role = "professor"', 
                    [hash, name, courses || '', sections || '', username], 
                    function(err) {
                        if (err) {
                            console.error('DB error updating professor with password:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        handleSubjects();
                    }
                );
            } else {
                // Update without changing password
                db.run('UPDATE users SET name = ?, courses = ?, sections = ? WHERE username = ? AND role = "professor"', 
                    [name, courses || '', sections || '', username], 
                    function(err) {
                        if (err) {
                            console.error('DB error updating professor:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        handleSubjects();
                    }
                );
            }
        };
        
        // Handle subject assignments
        const handleSubjects = () => {
            if (subjects && Array.isArray(subjects)) {
                // First remove all existing subject assignments
                db.run('DELETE FROM professor_subjects WHERE professor_username = ?', [username], function(err) {
                    if (err) {
                        console.error('DB error removing existing subject assignments:', err);
                        return res.status(500).json({ error: 'Database error removing subject assignments' });
                    }
                    
                    // If no subjects to add, return success
                    if (subjects.length === 0) {
                        return res.json({ 
                            success: true, 
                            message: 'Professor updated successfully with no subjects'
                        });
                    }
                    
                    // Otherwise add new subject assignments
                    let subjectPromises = subjects.map(subjectCode => {
                        // Find description from our reference data
                        let description = null;
                        Object.values(subjectsByYearSection || {}).forEach(yearSubjects => {
                            const found = yearSubjects.find(s => s.code === subjectCode);
                            if (found) description = found.description;
                        });
                        
                        // Ensure subject exists and then assign it
                        return ensureSubjectExists(subjectCode, description)
                            .then(subjectId => {
                                return new Promise((resolve, reject) => {
                                    db.run('INSERT OR IGNORE INTO professor_subjects (professor_username, subject_id) VALUES (?, ?)',
                                        [username, subjectId], 
                                        function(err) {
                                            if (err) return reject(err);
                                            resolve();
                                        }
                                    );
                                });
                            });
                    });
                    
                    Promise.all(subjectPromises)
                        .then(() => {
                            res.json({ 
                                success: true, 
                                message: 'Professor updated successfully with subject assignments'
                            });
                        })
                        .catch(err => {
                            console.error('Error assigning subjects:', err);
                            res.status(500).json({ error: 'Error assigning subjects' });
                        });
                });
            } else {
                // No subjects array provided, just return success
                res.json({ 
                    success: true, 
                    message: 'Professor updated successfully'
                });
            }
        };
        
        updateProfessor();
    });
});

// Admin: List professors
app.get('/api/admin/professors', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    db.all('SELECT username, name, courses, sections FROM users WHERE role = "professor"', [], (err, rows) => {
        if (err) {
            console.error('DB error fetching professors:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows || []);
    });
});

// Admin: Get specific professor details
app.get('/api/admin/professors/:username', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username } = req.params;
    db.get('SELECT username, name, courses, sections FROM users WHERE username = ? AND role = "professor"', [username], (err, row) => {
        if (err) {
            console.error('DB error fetching professor details:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Professor not found' });
        }
        res.json(row);
    });
});

// Admin: Delete professor
app.delete('/api/admin/professors/:username', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username } = req.params;
    
    // Check if professor exists
    db.get('SELECT id FROM users WHERE username = ? AND role = "professor"', [username], (err, row) => {
        if (err) {
            console.error('DB error checking professor existence:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Professor not found' });
        }
        
        // Delete the professor
        db.run('DELETE FROM users WHERE username = ? AND role = "professor"', [username], function(err) {
            if (err) {
                console.error('DB error deleting professor:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Professor deleted successfully' });
        });
    });
});

// Generate next student ID
app.get('/api/generate-student-id', (req, res) => {
    if (!req.session.user || (req.session.user.role !== 'professor' && req.session.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    generateStudentId()
        .then(studentId => {
            res.json({ studentId });
        })
        .catch(err => {
            console.error('Error generating student ID:', err);
            res.status(500).json({ error: 'Failed to generate student ID' });
        });
});

// Professor: Get students for the professor's courses/sections
app.get('/api/professor/students', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    // Check if we should include archived students
    const includeArchived = req.query.includeArchived === 'true';
    
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        const courses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const sections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        if (courses.length === 0 || sections.length === 0) {
            return res.json([]);
        }
        
        // Build query for all course/section combinations
        let sql = 'SELECT username, name, student_id, course, year_section, active FROM users WHERE role = "student"';
        
        // Add active filter condition if we're not including archived
        if (!includeArchived) {
            sql += ' AND active = 1';
        }
        
        sql += ' AND (';
        
        const params = [];
        let conditions = [];
        
        courses.forEach(course => {
            sections.forEach(section => {
                conditions.push('(course = ? AND year_section = ?)');
                params.push(course, section);
            });
        });
        
        sql += conditions.join(' OR ') + ')';
        
        db.all(sql, params, (err, students) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(students);
        });
    });
});

// Professor: Enroll a student
app.post('/api/professor/enroll', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    console.log('Enrollment request body:', req.body);
    
    const { name, username, password, course, year_section } = req.body;
    // Accept either year_section or section parameter
    const section = year_section || req.body.section;
    
    // Validate required fields
    if (!name) {
        return res.status(400).json({ error: 'Student name is required' });
    }
    
    if (!course) {
        return res.status(400).json({ error: 'Course is required' });
    }
    
    if (!section) {
        return res.status(400).json({ error: 'Year & Section is required' });
    }
    
    // Either we need both username and password, or we'll generate student_id
    let student_id = req.body.student_id || username;
    
    // Check if professor handles this course/section
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ error: 'DB error' });
        }
        
        if (!professor) {
            return res.status(404).json({ error: 'Professor not found' });
        }
        
        console.log(`Professor courses: ${professor.courses}, sections: ${professor.sections}`);
        console.log(`Requested course: ${course}, section: ${section}`);
        
        const courses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const sections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        if (!courses.includes(course) || !sections.includes(section)) {
            return res.status(403).json({ 
                error: 'You are not authorized to enroll students in this course/section',
                details: {
                    authorizedCourses: courses,
                    authorizedSections: sections,
                    requestedCourse: course,
                    requestedSection: section
                }
            });
        }
        
        const enrollStudent = (studentId) => {
            // Use student_id as username and password if not provided
            const finalUsername = username || studentId;
            const finalPassword = password || studentId;
            const hashedPassword = bcrypt.hashSync(finalPassword, 10);
            
            console.log(`Enrolling student: ID=${studentId}, Username=${finalUsername}, Name=${name}, Course=${course}, Section=${section}`);
            
            // Check if student_id already exists
            db.get('SELECT * FROM users WHERE student_id = ?', [studentId], (err, existingStudent) => {
                if (err) {
                    console.error('Error checking existing student ID:', err);
                    return res.status(500).json({ error: 'DB error' });
                }
                
                if (existingStudent) {
                    return res.status(400).json({ error: 'Student ID already exists' });
                }
                
                // Also check if the username is already taken
                db.get('SELECT * FROM users WHERE username = ?', [finalUsername], (err, existingUser) => {
                    if (err) {
                        console.error('Error checking existing username:', err);
                        return res.status(500).json({ error: 'DB error' });
                    }
                    
                    if (existingUser) {
                        return res.status(400).json({ error: 'Username already exists' });
                    }
                    
                    // Insert the new student - always authorized
                    db.run('INSERT INTO users (username, password_hash, role, status, name, student_id, course, year_section, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [finalUsername, hashedPassword, 'student', 'authorized', name, studentId, course, section, 1],
                        function(err) {
                            if (err) {
                                console.error('Error inserting student:', err);
                                return res.status(500).json({ error: 'DB error: ' + err.message });
                            }
                            
                            res.status(201).json({
                                success: true,
                                message: 'Student enrolled successfully and authorized',
                                student: {
                                    username: finalUsername,
                                    name,
                                    student_id: studentId,
                                    course,
                                    year_section: section
                                }
                            });
                        }
                    );
                });
            });
        };
        
        // If we don't have a student_id, generate one
        if (!student_id) {
            generateStudentId()
                .then(newStudentId => {
                    enrollStudent(newStudentId);
                })
                .catch(err => {
                    console.error('Error generating student ID:', err);
                    return res.status(500).json({ error: 'Failed to generate student ID' });
                });
        } else {
            enrollStudent(student_id);
        }
    });
});

// Professor: Delete student
app.delete('/api/professor/students/:studentId', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    const { studentId } = req.params;
    
    // Check if professor has access to this student
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        const courses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const sections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        // Get student details
        db.get('SELECT course, year_section FROM users WHERE student_id = ? AND role = "student"', [studentId], (err, student) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!student) return res.status(404).json({ error: 'Student not found' });
            
            // Check if student is in professor's course/section
            if (!courses.includes(student.course) || !sections.includes(student.year_section)) {
                return res.status(403).json({ error: 'You are not authorized to manage this student' });
            }
            
            // Archive the student instead of deleting
            db.run('UPDATE users SET active = 0 WHERE student_id = ? AND role = "student"', [studentId], function(err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ success: true, message: 'Student archived successfully' });
            });
        });
    });
});

// Professor: Restore archived student
app.post('/api/professor/students/:studentId/restore', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    const { studentId } = req.params;
    
    // Check if professor has access to this student
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        const courses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const sections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        // Get student details
        db.get('SELECT course, year_section FROM users WHERE student_id = ? AND role = "student" AND active = 0', [studentId], (err, student) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!student) return res.status(404).json({ error: 'Archived student not found' });
            
            // Check if student is in professor's course/section
            if (!courses.includes(student.course) || !sections.includes(student.year_section)) {
                return res.status(403).json({ error: 'You are not authorized to manage this student' });
            }
            
            // Restore the student
            db.run('UPDATE users SET active = 1 WHERE student_id = ? AND role = "student"', [studentId], function(err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ success: true, message: 'Student restored successfully' });
            });
        });
    });
});

// Professor: Edit student
app.put('/api/professor/students/:studentId', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    const { studentId } = req.params;
    const { name, course, section } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    
    // Check if professor has access to this student
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        const professorCourses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const professorSections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        // Get student details
        db.get('SELECT course, year_section FROM users WHERE student_id = ? AND role = "student"', [studentId], (err, student) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!student) return res.status(404).json({ error: 'Student not found' });
            
            // Check if student is in professor's course/section
            if (!professorCourses.includes(student.course) || !professorSections.includes(student.year_section)) {
                return res.status(403).json({ error: 'You are not authorized to manage this student' });
            }
            
            // If course or section is being changed, validate that professor can manage the new course/section
            if ((course && !professorCourses.includes(course)) || (section && !professorSections.includes(section))) {
                return res.status(403).json({ error: 'You are not authorized to assign students to this course/section' });
            }
            
            // Update the student
            db.run(
                'UPDATE users SET name = ?, course = COALESCE(?, course), year_section = COALESCE(?, year_section) WHERE student_id = ? AND role = "student"',
                [name, course || null, section || null, studentId],
                function(err) {
                    if (err) return res.status(500).json({ error: 'DB error' });
                    res.json({ 
                        success: true, 
                        message: 'Student updated successfully',
                        student: {
                            name,
                            student_id: studentId,
                            course: course || student.course,
                            year_section: section || student.year_section
                        }
                    });
                }
            );
        });
    });
});

// Get attendance records by date
app.get('/api/professor/attendance', requireRole('professor'), (req, res) => {
    const date = req.query.date;
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    let query = `
        SELECT a.*, u.name
        FROM attendance a
        JOIN users u ON a.student_id = u.student_id
        WHERE a.date = ? AND a.professor_username = ? AND u.role = 'student'
    `;
    
    const params = [date, req.session.user.username];
    
    // Add subject filtering if provided
    if (req.query.subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(req.query.subject_id);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.json(rows);
    });
});

// Add attendance record
app.post('/api/professor/attendance', requireRole('professor'), (req, res) => {
    const { student_id, status, date, subject_id } = req.body;

    if (!student_id || !status || !date) {
        return res.status(400).json({ message: 'Student ID, status, and date are required' });
    }

    // Check if student exists
    db.get('SELECT * FROM users WHERE student_id = ? AND role = "student"', [student_id], (err, student) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if attendance record already exists
        let query = `
            SELECT * FROM attendance 
            WHERE student_id = ? AND date = ? AND professor_username = ?
        `;
        let params = [student_id, date, req.session.user.username];
        
        // Add subject check if provided
        if (subject_id) {
            query += ' AND subject_id = ?';
            params.push(subject_id);
        }
        
        db.get(query, params, (err, existingRecord) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (existingRecord) {
                // Update existing record
                let updateQuery = `
                    UPDATE attendance 
                    SET status = ?, timestamp = datetime('now')
                    WHERE student_id = ? AND date = ? AND professor_username = ?
                `;
                let updateParams = [status, student_id, date, req.session.user.username];
                
                // Add subject check if provided
                if (subject_id) {
                    updateQuery += ' AND subject_id = ?';
                    updateParams.push(subject_id);
                }
                
                db.run(updateQuery, updateParams, function(err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }
                    res.json({ message: 'Attendance record updated' });
                });
            } else {
                // Insert new record
                let insertQuery = `
                    INSERT INTO attendance (student_id, professor_username, status, date, timestamp
                `;
                let insertParams = [student_id, req.session.user.username, status, date, new Date().toISOString()];
                
                // Add subject if provided
                if (subject_id) {
                    insertQuery += ', subject_id';
                    insertParams.push(subject_id);
                }
                
                insertQuery += ') VALUES (?, ?, ?, ?, ?';
                
                // Add placeholder for subject_id if provided
                if (subject_id) {
                    insertQuery += ', ?';
                }
                
                insertQuery += ')';
                
                db.run(insertQuery, insertParams, function(err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }
                    res.status(201).json({ message: 'Attendance record added' });
                });
            }
        });
    });
});

// Student Self-Attendance API
app.post('/api/student/attendance', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    
    const { date, status, notes, subject_id } = req.body;
    if (!date || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!subject_id) {
        return res.status(400).json({ error: 'Subject is required' });
    }
    
    // Get student ID
    db.get('SELECT student_id FROM users WHERE username = ?', [req.session.user.username], (err, student) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        
        const student_id = student.student_id;
        const timestamp = new Date().toISOString();
        
        // Check if this subject is assigned to the student
        db.get('SELECT 1 FROM student_subjects WHERE student_id = ? AND subject_id = ?', [student_id, subject_id], (err, isAssigned) => {
            if (err) {
                console.error('Error checking subject assignment:', err);
                // Continue without checking assignment
            } else if (!isAssigned) {
                // If subject isn't explicitly assigned, we'll still allow it but auto-assign it
                db.run('INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)', 
                    [student_id, subject_id], (err) => {
                        if (err) console.error('Error auto-assigning subject:', err);
                    });
            }
            
            // Check if attendance record already exists for this date and subject
            db.get('SELECT id FROM student_self_attendance WHERE student_id = ? AND date = ? AND subject_id = ?', 
                [student_id, date, subject_id], (err, existing) => {
                if (err) return res.status(500).json({ error: 'DB error' });
                
                if (existing) {
                    // Update existing record
                    db.run('UPDATE student_self_attendance SET status = ?, notes = ?, timestamp = ? WHERE id = ?',
                        [status, notes || '', timestamp, existing.id], 
                        function(err) {
                            if (err) return res.status(500).json({ error: 'DB error' });
                            res.json({ success: true, message: 'Attendance updated' });
                        });
                } else {
                    // Create new record
                    db.run('INSERT INTO student_self_attendance (student_id, status, date, notes, timestamp, subject_id) VALUES (?, ?, ?, ?, ?, ?)',
                        [student_id, status, date, notes || '', timestamp, subject_id], 
                        function(err) {
                            if (err) return res.status(500).json({ error: 'DB error: ' + err.message });
                            res.status(201).json({ success: true, message: 'Attendance recorded', id: this.lastID });
                        });
                }
            });
        });
    });
});

app.get('/api/student/attendance', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    
    const { subject_id } = req.query;
    
    // Get student ID
    db.get('SELECT student_id FROM users WHERE username = ?', [req.session.user.username], (err, student) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        
        // Get all attendance records for this student
        let query = `SELECT ssa.id, ssa.date, ssa.status, ssa.notes, ssa.timestamp, ssa.subject_id, 
                    s.code as subject_code, s.name as subject_name, s.description as subject_description 
                    FROM student_self_attendance ssa
                    LEFT JOIN subjects s ON ssa.subject_id = s.id
                    WHERE ssa.student_id = ?`;
        let params = [student.student_id];
        
        if (subject_id) {
            query += ' AND ssa.subject_id = ?';
            params.push(subject_id);
        }
        
        query += ' ORDER BY ssa.date DESC';
        
        db.all(query, params, (err, records) => {
            if (err) {
                console.error('Error fetching student attendance:', err);
                return res.status(500).json({ error: 'DB error' });
            }
            res.json(records || []);
        });
    });
});

// API Endpoints for Subjects

// List all subjects
app.get('/api/subjects', (req, res) => {
    console.log('GET /api/subjects request received');
    db.all('SELECT * FROM subjects ORDER BY code', [], (err, subjects) => {
        if (err) {
            console.error('Error fetching subjects:', err);
            return res.status(500).json({ error: 'DB error' });
        }
        // Ensure we always return an array, even if empty
        console.log(`Returning ${subjects ? subjects.length : 0} subjects`);
        res.json(subjects || []);
    });
});

// Initialize some basic subjects if none exist
function initializeBasicSubjects() {
    db.all('SELECT COUNT(*) as count FROM subjects', [], (err, result) => {
        if (err) {
            console.error('Error checking subjects count:', err);
            return;
        }
        
        if (result && result[0] && result[0].count === 0) {
            console.log('No subjects found, initializing all subjects from reference data');
            
            // Create a flat array of all unique subjects from subjectsByYearSection
            const allSubjects = new Set();
            Object.values(subjectsByYearSection).forEach(yearSubjects => {
                yearSubjects.forEach(subject => {
                    allSubjects.add(JSON.stringify(subject));
                });
            });
            
            // Convert back to objects
            const initialSubjects = Array.from(allSubjects).map(subjectJson => JSON.parse(subjectJson));
            console.log(`Preparing to initialize ${initialSubjects.length} subjects`);
            
            const timestamp = new Date().toISOString();
            
            // Insert each subject
            initialSubjects.forEach(subject => {
                db.run('INSERT OR IGNORE INTO subjects (code, name, description, created_at) VALUES (?, ?, ?, ?)',
                    [subject.code, subject.code, subject.description, timestamp],
                    function(err) {
                        if (err) {
                            console.error(`Error initializing subject ${subject.code}:`, err);
                        } else {
                            console.log(`Initialized subject: ${subject.code}`);
                        }
                    }
                );
            });
        }
    });
}

// Add a new subject (admin only)
app.post('/api/subjects', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { code, name, description } = req.body;
    
    if (!code || !name) {
        return res.status(400).json({ error: 'Subject code and name are required' });
    }
    
    // Check if subject code already exists
    db.get('SELECT id FROM subjects WHERE code = ?', [code], (err, existingSubject) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (existingSubject) return res.status(400).json({ error: 'Subject code already exists' });
        
        const timestamp = new Date().toISOString();
        
        db.run('INSERT INTO subjects (code, name, description, created_at) VALUES (?, ?, ?, ?)', 
            [code, name, description || '', timestamp], 
            function(err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                
                res.status(201).json({
                    success: true,
                    message: 'Subject added successfully',
                    id: this.lastID,
                    code,
                    name,
                    description: description || '',
                    created_at: timestamp
                });
            }
        );
    });
});

// Assign subject to professor
app.post('/api/professors/:username/subjects', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username } = req.params;
    const { subject_id } = req.body;
    
    if (!subject_id) {
        return res.status(400).json({ error: 'Subject ID is required' });
    }
    
    // Check if professor exists
    db.get('SELECT id FROM users WHERE username = ? AND role = "professor"', [username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        // Check if subject exists
        db.get('SELECT id FROM subjects WHERE id = ?', [subject_id], (err, subject) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!subject) return res.status(404).json({ error: 'Subject not found' });
            
            // Assign subject to professor
            db.run('INSERT OR IGNORE INTO professor_subjects (professor_username, subject_id) VALUES (?, ?)',
                [username, subject_id],
                function(err) {
                    if (err) return res.status(500).json({ error: 'DB error' });
                    
                    if (this.changes === 0) {
                        return res.status(400).json({ error: 'Professor is already assigned to this subject' });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Subject assigned to professor successfully'
                    });
                }
            );
        });
    });
});

// Get professor's subjects
app.get('/api/professors/:username/subjects', (req, res) => {
    const { username } = req.params;
    
    db.get('SELECT id FROM users WHERE username = ? AND role = "professor"', [username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        db.all(`
            SELECT s.* 
            FROM subjects s
            JOIN professor_subjects ps ON s.id = ps.subject_id
            WHERE ps.professor_username = ?
            ORDER BY s.code
        `, [username], (err, subjects) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(subjects || []);
        });
    });
});

// Assign subject to student
app.post('/api/students/:studentId/subjects', (req, res) => {
    if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'professor')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { studentId } = req.params;
    const { subject_id } = req.body;
    
    if (!subject_id) {
        return res.status(400).json({ error: 'Subject ID is required' });
    }
    
    // Check if student exists
    db.get('SELECT id FROM users WHERE student_id = ? AND role = "student" AND active = 1', [studentId], (err, student) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!student) return res.status(404).json({ error: 'Student not found or inactive' });
        
        // If professor is making the request, ensure they have access to this subject
        if (req.session.user.role === 'professor') {
            db.get('SELECT id FROM professor_subjects WHERE professor_username = ? AND subject_id = ?',
                [req.session.user.username, subject_id],
                (err, professorSubject) => {
                    if (err) return res.status(500).json({ error: 'DB error' });
                    if (!professorSubject) return res.status(403).json({ error: 'You are not authorized to assign students to this subject' });
                    
                    // Continue with assignment
                    assignSubjectToStudent();
                }
            );
        } else {
            // Admin can assign any subject
            assignSubjectToStudent();
        }
        
        function assignSubjectToStudent() {
            // Check if subject exists
            db.get('SELECT id FROM subjects WHERE id = ?', [subject_id], (err, subject) => {
                if (err) return res.status(500).json({ error: 'DB error' });
                if (!subject) return res.status(404).json({ error: 'Subject not found' });
                
                // Assign subject to student
                db.run('INSERT OR IGNORE INTO student_subjects (student_id, subject_id) VALUES (?, ?)',
                    [studentId, subject_id],
                    function(err) {
                        if (err) return res.status(500).json({ error: 'DB error' });
                        
                        if (this.changes === 0) {
                            return res.status(400).json({ error: 'Student is already enrolled in this subject' });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Subject assigned to student successfully'
                        });
                    }
                );
            });
        }
    });
});

// Get student's subjects
app.get('/api/students/:studentId/subjects', (req, res) => {
    const { studentId } = req.params;
    
    db.get('SELECT id FROM users WHERE student_id = ? AND role = "student"', [studentId], (err, student) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        
        db.all(`
            SELECT s.* 
            FROM subjects s
            JOIN student_subjects ss ON s.id = ss.subject_id
            WHERE ss.student_id = ?
            ORDER BY s.code
        `, [studentId], (err, subjects) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(subjects || []);
        });
    });
});

// Endpoint for current student's subjects
app.get('/api/student/subjects', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get the student ID of the logged-in student
    db.get('SELECT student_id FROM users WHERE username = ? AND role = "student"', [req.session.user.username], (err, student) => {
        if (err) {
            console.error('Error fetching student ID:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Get the subjects assigned to this student
        db.all(`
            SELECT s.id as subject_id, s.code, s.name as subject_name, s.description 
            FROM subjects s
            JOIN student_subjects ss ON s.id = ss.subject_id
            WHERE ss.student_id = ?
            ORDER BY s.code
        `, [student.student_id], (err, subjects) => {
            if (err) {
                console.error('Error fetching student subjects:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // If no subjects are found, try to get all subjects from the student's course and year section
            if (!subjects || subjects.length === 0) {
                db.get('SELECT course, year_section FROM users WHERE username = ? AND role = "student"', [req.session.user.username], (err, studentDetails) => {
                    if (err || !studentDetails) {
                        return res.json([]); // Return empty array if we can't get details
                    }
                    
                    // Get all subjects for this year and section from reference data
                    const yearSection = studentDetails.year_section;
                    if (yearSection && subjectsByYearSection[yearSection]) {
                        const yearSubjects = subjectsByYearSection[yearSection];
                        
                        // Try to match these with database subjects
                        const subjectCodes = yearSubjects.map(s => s.code);
                        const placeholders = subjectCodes.map(() => '?').join(',');
                        
                        if (subjectCodes.length > 0) {
                            db.all(`SELECT id as subject_id, code, name as subject_name, description FROM subjects WHERE code IN (${placeholders})`, 
                                subjectCodes, (err, dbSubjects) => {
                                    if (err) {
                                        console.error('Error fetching course subjects:', err);
                                        return res.json([]);
                                    }
                                    res.json(dbSubjects || []);
                                }
                            );
                        } else {
                            res.json([]);
                        }
                    } else {
                        res.json([]);
                    }
                });
            } else {
                res.json(subjects);
            }
        });
    });
});

// Authentication middleware
function authenticateToken(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    req.user = req.session.user;
    next();
}

// Add the change password endpoint
app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    
    // First, verify current password
    db.get('SELECT username, password_hash FROM users WHERE username = ?', [req.user.username], (err, user) => {
        if (err) {
            console.error('Database error when checking password:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Compare the provided current password with the stored password
        if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        
        // Current password is correct, hash the new password
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        // Update the password in the database
        db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hashedPassword, req.user.username], function(err) {
            if (err) {
                console.error('Database error when updating password:', err);
                return res.status(500).json({ success: false, message: 'Failed to update password' });
            }
            
            return res.json({ success: true, message: 'Password updated successfully' });
        });
    });
});

// Admin: Get professor's subjects
app.get('/api/admin/professors/:username/subjects', (req, res) => {
    // Ensure only admin can access
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { username } = req.params;
    
    db.get('SELECT id FROM users WHERE username = ? AND role = "professor"', [username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        db.all(`
            SELECT s.* 
            FROM subjects s
            JOIN professor_subjects ps ON s.id = ps.subject_id
            WHERE ps.professor_username = ?
            ORDER BY s.code
        `, [username], (err, subjects) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(subjects || []);
        });
    });
});

// Helper function to ensure a subject exists
// Reference data for subject descriptions by year and section
const subjectsByYearSection = {
    "1A": [
        { code: "NSTP 122", description: "CIVIC WELFARE TRAINING SERVICES 2" },
        { code: "CSM 121", description: "COLLEGE ALGEBRA" },
        { code: "CC 103", description: "COMPUTER PROGRAMMING 2" },
        { code: "PATHFIT 2", description: "EXERCISE-BASED FITNESS ACTIVITIES" },
        { code: "LIT 001", description: "PHILIPPINE LITERATURE IN ENGLISH" },
        { code: "CC 108", description: "TECHNICAL COMPUTER CONCEPTS" },
        { code: "GEC 003", description: "THE CONTEMPORARY WORLD" },
        { code: "CC 107", description: "WEB SYSTEM AND TECHNOLOGIES" }
    ],
    "1B": [
        { code: "NSTP 122", description: "CIVIC WELFARE TRAINING SERVICES 2" },
        { code: "CSM 121", description: "COLLEGE ALGEBRA" },
        { code: "CC 103", description: "COMPUTER PROGRAMMING 2" },
        { code: "PATHFIT 2", description: "EXERCISE-BASED FITNESS ACTIVITIES" },
        { code: "LIT 001", description: "PHILIPPINE LITERATURE IN ENGLISH" },
        { code: "CC 108", description: "TECHNICAL COMPUTER CONCEPTS" },
        { code: "GEC 003", description: "THE CONTEMPORARY WORLD" },
        { code: "CC 107", description: "WEB SYSTEM AND TECHNOLOGIES" }
    ],
    "2A": [
        { code: "CCS 110", description: "DIGITAL GRAPHICS" },
        { code: "CS 104", description: "DISCRETE STRUCTURES 2" },
        { code: "CS 107", description: "EMBEDDED PROGRAMMING" },
        { code: "CS 115", description: "HUMAN COMPUTER INTERACTION" },
        { code: "CSM 223", description: "INTEGRAL CALCULUS" },
        { code: "CS 105", description: "PROGRAMMING LANGUAGES" },
        { code: "PATHFIT 4", description: "SPORTS AND FITNESS" }
    ],
    "2B": [
        { code: "CCS 110", description: "DIGITAL GRAPHICS" },
        { code: "CS 104", description: "DISCRETE STRUCTURES 2" },
        { code: "CS 107", description: "EMBEDDED PROGRAMMING" },
        { code: "CS 115", description: "HUMAN COMPUTER INTERACTION" },
        { code: "CSM 223", description: "INTEGRAL CALCULUS" },
        { code: "CS 105", description: "PROGRAMMING LANGUAGES" },
        { code: "PATHFIT 4", description: "SPORTS AND FITNESS" }
    ],
    "3A": [
        { code: "CCS 106", description: "APPLICATIONS DEVELOPMENT AND EMERGING TECHNOLOGIES" },
        { code: "CS 111", description: "ARCHITECTURE AND ORGANIZATION" },
        { code: "GEC 006", description: "ART APPRECIATION" },
        { code: "CSE 102", description: "GRAPHICS AND VISUAL COMPUTING" },
        { code: "GEM 001", description: "LIFE AND WORKS OF RIZAL" },
        { code: "RES 001", description: "METHODS OF RESEARCH" },
        { code: "CCS 126", description: "SOFTWARE ENGINEERING 2" }
    ],
    "3B": [
        { code: "CCS 106", description: "APPLICATIONS DEVELOPMENT AND EMERGING TECHNOLOGIES" },
        { code: "CS 111", description: "ARCHITECTURE AND ORGANIZATION" },
        { code: "GEC 006", description: "ART APPRECIATION" },
        { code: "CSE 102", description: "GRAPHICS AND VISUAL COMPUTING" },
        { code: "GEM 001", description: "LIFE AND WORKS OF RIZAL" },
        { code: "RES 001", description: "METHODS OF RESEARCH" },
        { code: "CCS 126", description: "SOFTWARE ENGINEERING 2" }
    ],
    "4A": [
        { code: "CS 113", description: "AUTOMATA AND LANGUAGE THEORY" },
        { code: "CS 119", description: "CS THESIS WRITING 2" },
        { code: "CCS 115", description: "CURRENT TRENDS IN IT AND SEMINARS" },
        { code: "CS 115", description: "HUMAN COMPUTER INTERACTION" },
        { code: "CSE 105", description: "PARALLEL AND DISTRIBUTED COMPUTING" },
        { code: "CCS 416", description: "PRACTICUM 2" }
    ],
    "4B": [
        { code: "CS 113", description: "AUTOMATA AND LANGUAGE THEORY" },
        { code: "CS 119", description: "CS THESIS WRITING 2" },
        { code: "CCS 115", description: "CURRENT TRENDS IN IT AND SEMINARS" },
        { code: "CS 115", description: "HUMAN COMPUTER INTERACTION" },
        { code: "CSE 105", description: "PARALLEL AND DISTRIBUTED COMPUTING" },
        { code: "CCS 416", description: "PRACTICUM 2" }
    ]
};

function ensureSubjectExists(subjectCode, description) {
    return new Promise((resolve, reject) => {
        // First check if subject already exists
        db.get('SELECT id FROM subjects WHERE code = ?', [subjectCode], (err, existingSubject) => {
            if (err) return reject(err);
            
            if (existingSubject) {
                // Subject already exists, return its ID
                return resolve(existingSubject.id);
            }
            
            // Subject doesn't exist, create it
            const timestamp = new Date().toISOString();
            db.run('INSERT INTO subjects (code, name, description, created_at) VALUES (?, ?, ?, ?)',
                [subjectCode, subjectCode, description || subjectCode, timestamp],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });
    });
}

// Force reinitialize all subjects (admin only)
app.post('/api/admin/reinitialize-subjects', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    console.log('Request to reinitialize all subjects');
    reinitializeAllSubjects().then(() => {
        res.json({ success: true, message: 'Subjects reinitialized successfully' });
    }).catch(err => {
        console.error('Error reinitializing subjects:', err);
        res.status(500).json({ error: 'Failed to reinitialize subjects' });
    });
});

// Function to reinitialize all subjects
function reinitializeAllSubjects() {
    return new Promise((resolve, reject) => {
        // Create a flat array of all unique subjects from subjectsByYearSection
        const allSubjects = new Set();
        Object.values(subjectsByYearSection).forEach(yearSubjects => {
            yearSubjects.forEach(subject => {
                allSubjects.add(JSON.stringify(subject));
            });
        });
        
        // Convert back to objects
        const subjects = Array.from(allSubjects).map(subjectJson => JSON.parse(subjectJson));
        console.log(`Preparing to initialize ${subjects.length} subjects`);
        
        const timestamp = new Date().toISOString();
        
        // Delete all existing subjects first
        db.run('DELETE FROM subjects', [], function(err) {
            if (err) {
                console.error('Error deleting existing subjects:', err);
                return reject(err);
            }
            
            console.log('Deleted existing subjects. Inserting new ones...');
            let completed = 0;
            let errors = 0;
            
            // Insert each subject
            subjects.forEach(subject => {
                db.run('INSERT INTO subjects (code, name, description, created_at) VALUES (?, ?, ?, ?)',
                    [subject.code, subject.code, subject.description, timestamp],
                    function(err) {
                        if (err) {
                            console.error(`Error initializing subject ${subject.code}:`, err);
                            errors++;
                        } else {
                            console.log(`Initialized subject: ${subject.code}`);
                        }
                        
                        completed++;
                        if (completed === subjects.length) {
                            console.log(`Subject initialization completed. Successful: ${completed - errors}, Errors: ${errors}`);
                            resolve();
                        }
                    }
                );
            });
        });
    });
}

// Get students enrolled in a specific subject
app.get('/api/subjects/:subjectId/students', (req, res) => {
    const { subjectId } = req.params;
    
    // Check if subject exists
    db.get('SELECT id FROM subjects WHERE id = ?', [subjectId], (err, subject) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        
        // Get all students enrolled in this subject
        db.all(`
            SELECT u.student_id, u.name, u.course, u.year_section 
            FROM users u
            JOIN student_subjects ss ON u.student_id = ss.student_id
            WHERE ss.subject_id = ? AND u.role = 'student' AND u.active = 1
            ORDER BY u.name
        `, [subjectId], (err, students) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(students || []);
        });
    });
});

// Get student's professor-recorded attendance
app.get('/api/student/professor-attendance', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    
    const { student_id } = req.query;
    
    if (!student_id) {
        return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Verify this student_id belongs to the logged-in user
    db.get('SELECT student_id FROM users WHERE username = ? AND role = "student"', [req.session.user.username], (err, student) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        
        if (student.student_id !== student_id) {
            return res.status(403).json({ error: 'You can only view your own attendance records' });
        }
        
        // Get all professor-recorded attendance for this student
        db.all(`
            SELECT a.id, a.date, a.status, a.timestamp, a.subject_id, a.professor_username,
                   s.code as subject_code, s.name as subject_name, s.description as subject_description,
                   u.name as professor_name
            FROM attendance a
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN users u ON a.professor_username = u.username
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [student_id], (err, records) => {
            if (err) {
                console.error('Error fetching professor-recorded attendance:', err);
                return res.status(500).json({ error: 'DB error' });
            }
            
            // Debug: check if professor name is being included
            if (records && records.length > 0) {
                console.log('Example professor attendance record:', {
                    id: records[0].id,
                    professor_username: records[0].professor_username,
                    professor_name: records[0].professor_name
                });
            }
            
            res.json(records || []);
        });
    });
});

// Professor: Batch enroll students
app.post('/api/professor/batch-enroll', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'professor') return res.status(403).json({ error: 'Forbidden' });
    
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'No students provided for enrollment' });
    }
    
    // Check if professor handles the courses/sections for these students
    db.get('SELECT courses, sections FROM users WHERE username = ? AND role = "professor"', [req.session.user.username], (err, professor) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!professor) return res.status(404).json({ error: 'Professor not found' });
        
        const courses = professor.courses ? professor.courses.split(',').map(c => c.trim()) : [];
        const sections = professor.sections ? professor.sections.split(',').map(s => s.trim()) : [];
        
        // Validate all students can be enrolled by this professor
        const validStudents = students.filter(student => {
            return courses.includes(student.course) && sections.includes(student.year_section);
        });
        
        if (validStudents.length === 0) {
            return res.status(400).json({ error: 'None of the students are in your assigned courses/sections' });
        }
        
        console.log(`Processing batch enrollment of ${validStudents.length} students`);
        
        let enrolled = 0;
        let errors = [];
        
        // Generate student IDs for all students at once
        const batchEnroll = async () => {
            for (const student of validStudents) {
                try {
                    // Use the username as student_id if it looks like a student ID, otherwise generate a new one
                    let student_id = student.username;
                    if (!/^\d{8}$/.test(student.username)) {
                        student_id = await generateStudentId();
                    }
                    
                    // Hash the password
                    const hashedPassword = bcrypt.hashSync(student.password, 10);
                    
                    // Insert the student with authorization
                    await new Promise((resolve, reject) => {
                        db.run('INSERT INTO users (username, password_hash, role, status, name, student_id, course, year_section, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [student.username, hashedPassword, 'student', 'authorized', student.name, student_id, student.course, student.year_section, 1],
                            function(err) {
                                if (err) {
                                    console.error(`Error enrolling student ${student.name}:`, err);
                                    errors.push({ name: student.name, error: err.message });
                                    resolve(); // Continue to next student even if this one fails
                                } else {
                                    enrolled++;
                                    resolve();
                                }
                            }
                        );
                    });
                } catch (error) {
                    console.error(`Error processing student ${student.name}:`, error);
                    errors.push({ name: student.name, error: error.message });
                }
            }
            
            res.status(200).json({
                success: true,
                message: `Batch enrollment completed. Successfully enrolled ${enrolled} students.`,
                enrolled,
                errors: errors.length > 0 ? errors : null
            });
        };
        
        batchEnroll().catch(error => {
            console.error('Batch enrollment failed:', error);
            res.status(500).json({ error: 'Batch enrollment failed', message: error.message });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));