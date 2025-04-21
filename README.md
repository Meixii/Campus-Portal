# Campus Portal

## Overview
Campus Portal is a dynamic web application for university management, supporting Admin, Professor, and Student roles. It provides secure login, user management, enrollment, attendance, to-do lists, and profile management, all powered by a Node.js/Express backend and SQLite database.

## Default Accounts
When the application is first installed and the database is initialized, the following default accounts are created:

| Role      | Username | Password    | Notes                                   |
|-----------|----------|-------------|----------------------------------------|
| Admin     | admin    | admin123    | Full system access                      |
| Professor | prof1    | password    | Has access to enrollment and attendance |
| Student   | 20250001 | 20250001    | Student IDs are used as default passwords |

*Note: For security reasons, it is highly recommended to change these default passwords after your first login.*

## Features

### Admin
- Secure login
- Manage (CRUD) professor accounts
- Authorize/deauthorize users
- View all users
- Assign subjects to professors by year/section

### Professor
- Secure login
- Manage student enrollment (register students to their courses/sections)
- Take attendance (dynamic dropdowns for courses/sections handled)
- View and edit their profile
- Manage subjects and filter attendance by subject

### Student
- Secure login
- View and edit their profile
- Manage personal to-do list
- Record self-attendance with notes and status tracking
- Track personal attendance history
- View attendance statistics and monthly calendar visualization

## Backend API Endpoints

### POST
- `POST /api/login` — Login (all roles)
- `POST /api/logout` — Logout
- `POST /api/admin/authorize` — Authorize/deauthorize user (admin)
- `POST /api/admin/professors` — Add professor (admin)
- `POST /api/student/todo` — Add to-do task
- `POST /api/student/attendance` — Record new student self-attendance
- `POST /api/change-password` — Change user password (all roles)

### GET
- `GET /api/me` — Get current user info
- `GET /api/admin/users` — List all users (admin)
- `GET /api/admin/professors` — List professors (admin)
- `GET /api/admin/professors/:username` — Get professor details (admin)
- `GET /api/professor/profile` — Get professor profile and handled courses/sections
- `GET /api/student/profile` — Get student profile
- `GET /api/student/todo` — List student to-do tasks
- `GET /api/student/attendance` — Get student self-attendance records

### PUT
- `PUT /api/admin/professors` — Update professor (admin)
- `PUT /api/student/todo/:id` — Update to-do task

### DELETE 
- `DELETE /api/admin/professors/:username` — Delete professor (admin)
- `DELETE /api/student/todo/:id` — Delete to-do task

## Database Structure

### users
- id (INTEGER, PK)
- username (TEXT, unique)
- password_hash (TEXT)
- role (TEXT: admin, professor, student)
- status (TEXT: pending/authorized)
- active (INTEGER: 1/0)
- last_login (TEXT)
- name (TEXT)
- student_id (TEXT, for students)
- course (TEXT, for students)
- year_section (TEXT, for students)
- courses (TEXT, CSV for professors)
- sections (TEXT, CSV for professors)

### todo
- id (INTEGER, PK)
- student_username (TEXT)
- description (TEXT)
- completed (INTEGER)
- created_at (TEXT)
- completed_at (TEXT)

### student_self_attendance
- id (INTEGER, PK)
- student_id (TEXT)
- status (TEXT: present/late/absent)
- date (TEXT)
- notes (TEXT)
- timestamp (TEXT)

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the server:**
   ```bash
   node server.js
   ```
   - The database and test accounts will be initialized automatically.
3. **Open your browser:**
   - Go to `http://localhost:3000` (or your VM's IP).
   - Log in with any of the test accounts or accounts created by admin/professor.

## Update Notes

### Latest Updates
- **Subject Management for Professors**: Added subject management functionality for professors. Professors can now view their assigned subjects, assign subjects to students, and view enrolled students by subject.
- **Student ID Auto-generation**: Updated enrollment process to automatically generate student IDs in the format STU-YYYY-XXXX.
- **Automatic Authorization**: New professors and students are now automatically authorized upon creation/enrollment.
- **Control Panel Responsiveness**: Updated the Control Panel interface to be more responsive on mobile devices.

### Previous Updates
- The CHANGELOG.md is kept up-to-date with every major change to the application.
- For new features or API changes, update this file accordingly.


---

**For more details, see the code and comments in each file.** 