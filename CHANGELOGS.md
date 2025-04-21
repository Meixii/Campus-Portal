## Recent Updates

## Update #32
- Added Default Accounts section to README.md with login credentials
- Included table with usernames and passwords for Admin, Professor, and Student accounts
- Added security note recommending password changes after first login
- Enhanced documentation to make initial setup more user-friendly

## Update #31
- Created detailed HOSTING.md guide for deploying Campus Portal on Ubuntu Server
- Added comprehensive setup instructions for Nginx web server configuration
- Included step-by-step guide for configuring Raspberry Pi 3 as a WiFi hotspot
- Added port forwarding setup between VirtualBox VM and Raspberry Pi
- Created instructions for setting up domain name (campusportal.local)
- Added troubleshooting section for common deployment issues
- Included security considerations and maintenance instructions
- Provided detailed networking configuration for VM to Raspberry Pi communication

## Update #30
- Adjusted student interface color scheme to use softer, less vibrant colors for better eye comfort
- Reduced contrast and brightness of yellow theme for extended viewing comfort
- Changed button colors to use darker text for better readability
- Softened box shadows to create a more subtle visual hierarchy
- Updated color palette to use more muted, pastel-like tones across all student pages
- Maintained consistent color relationships while reducing overall intensity
- Modified all hover effects to work harmoniously with the new softer color scheme

## Update #29
- Changed student interface color scheme to a lighter yellow-ish theme for a more friendly user experience
- Improved mobile responsiveness across all student pages (dashboard, profile, attendance, to-do)
- Enhanced navbar layout on mobile devices with better spacing and touch-friendly elements
- Optimized form controls and card layouts for smaller screens
- Added additional media queries for very small devices (under 480px)
- Improved typography and spacing consistency across all student pages
- Updated color contrast for better accessibility and readability

## Update #28
- Fixed issue with professor names not appearing in student attendance records
- Added debugging information to help identify data structure issues
- Enhanced professor name display with fallback options for different data formats
- Improved subject information display with direct use of data from attendance records
- Added more comprehensive logging of attendance record details for troubleshooting

## Update #27
- Enhanced student attendance page to display both self-recorded and professor-recorded attendance
- Added new API endpoint to fetch professor-recorded attendance for students
- Updated attendance display to show the source of each attendance record (self or professor)
- Improved subject display to include descriptions in dropdowns and attendance records
- Added visual indicators to distinguish between self-recorded and professor-recorded attendance
- Enhanced attendance record sorting and display for better readability

## Update #26
- Enhanced professor attendance page to filter students by selected subject
- Added new API endpoint to get all students enrolled in a specific subject
- Changed subject display format from "Code - Name" to "Code - Description"
- Implemented multiple fallback methods for student filtering
- Added proper error handling and user feedback for subject-student filtering
- Improved attendance history display to show subject descriptions 

## Update #25
- Removed automatic subject assignment function (ensureStudentSubjectAssignments)
- Simplified server startup process by eliminating automatic subject-student mappings
- Moved to manual assignment of subjects through the professor interface
- Retained enhanced database schema with foreign key constraints
- Streamlined code to rely on explicit subject assignments only

## Update #24
- Removed mock data from professor subjects.html page
- Implemented better error handling for empty subjects and students lists
- Added proper empty state display instead of using mock data
- Leveraged automatic student subject assignment from the server

## Update #23
- Updated server.js to add proper database support for subjects in attendance tables
- Added foreign key constraints to attendance and student_self_attendance tables
- Made subject_id a required field in both attendance tables
- Created new API endpoint for fetching student-specific subjects
- Added automatic subject assignment based on student's year and section
- Enhanced attendance queries to include subject details with each attendance record
- Added fallback mechanism to fetch subjects based on year/section if no explicit assignments exist
- Implemented auto-assignment of subjects when recording attendance for unassigned subjects

## Update #22
- Updated student self-attendance system to use student_subjects table for subject data
- Added proper student ID support to the attendance API calls
- Fixed attendance fetching to properly include the student's ID in API requests
- Enhanced error handling with more detailed messages from the server
- Added additional data format support for different attendance and subject response structures
- Improved subject display with fallback options for different naming conventions
- Enhanced loading state with animated spinner for better user experience
- Added detailed logging for easier debugging of attendance issues
- Implemented multi-layered subject loading with fallbacks for better reliability

## Update #21
- Added subject support to the student self-attendance system
- Improved attendance record loading with better error handling and fallback options
- Added subject filtering for attendance history to easily view records by subject
- Enhanced the attendance form with subject selection dropdown
- Added visual subject indicators in attendance history records
- Fixed timestamp display issues with multiple format support
- Added fallback subjects when API fails to ensure functionality
- Improved loading state for better user experience

## Update #20
- Improved subject checkbox pre-selection when editing a professor
- Enhanced synchronization between fetched subject assignments and checkbox display
- Added multiple checks to ensure subject assignments are correctly displayed
- Improved tab switching functionality for more consistent state management
- Enhanced visual styling of subject chips with hover effects and better spacing
- Added an icon to the subject assignments header for better visual hierarchy
- Fixed potential timing issues with subject loading and assignment display

## Update #19
- Enhanced the Edit Professor page to clearly display current subject assignments
- Added a visual summary of assigned subjects at the top of the Subject Assignment tab
- Implemented subject "chips" for a modern, easy-to-scan visual representation
- Included tooltips with subject descriptions for better information at a glance
- Ensured the summary updates in real-time when subjects are added or removed
- Improved the editing workflow with clearer visual feedback

## Update #18
- Added a helpful reminder to assign subjects before saving professor information
- Created a prominent notice with a quick link to the Subject Assignment tab
- Styled the reminder with a distinctive blue information box for better visibility
- Enhanced user experience by guiding users through the proper sequence of actions
- Improved the flow of the professor creation/editing process

## Update #17
- Added ability to reinitialize all subjects directly from the Admin UI
- Improved subject initialization to include all subjects from the reference data
- Added "Reinitialize All Subjects" button to the subject assignment page
- Enhanced subject management with automatic reloading after reinitialization
- Created an admin-only API endpoint for subject reinitialization
- Fixed styling and layout for the subject management interface

## Update #16
- Fixed issue with subjects not loading in the Add/Edit Professor page
- Added automatic subject initialization on server startup
- Improved subject filtering to show all subjects on initial load
- Enhanced fallback mechanism for subject loading
- Added detailed logging for better debugging of subject-related issues
- Made UI more user-friendly by showing helpful messages when no subjects match filters

## Update #15
- Fixed professor subject assignment functionality in the admin interface
- Updated backend to properly store and manage subject assignments to professors
- Added automatic subject creation when assigning subjects that don't yet exist in the database
- Enhanced the UI for subject selection with proper filtering and feedback
- Implemented API to fetch subject assignments for a professor 
- Improved subject assignment workflow to provide better user experience
- Ensured subjects are properly saved with the professor data when adding or editing

## Update #14
- Added automatic authorization for new professors and students upon creation and enrollment
- Enhanced studentProfile.html to display additional student details (Student ID, Course, Year & Section)
- Added subject selection dropdown to professor attendance form for better organization
- Implemented password change API endpoint for users to securely update their credentials
- Updated enrollment form to display auto-generated student IDs upon successful student registration
- Improved form handling and error messages throughout the system

## Update #13
- Completely redesigned the professor enrollment page with a modern purple theme matching other interfaces
- Added batch enrollment functionality with CSV file upload support for efficient student registration
- Enhanced the student entry form with comprehensive input fields including username, email, and password
- Improved the student listing section to show recently enrolled students with sortable functionality
- Added visual status indicators with success/error messages for better user feedback during enrollment
- Implemented responsive design for optimal viewing on both desktop and mobile devices

## Update #12
- Fixed critical bug in the attendance system where the query was incorrectly joining with a non-existent 'students' table
- Updated the attendance API to properly join with the 'users' table for accurate student information retrieval
- Completed the UI modernization of professor enrollment page to match the purple theme of other professor pages
- Improved error handling throughout the enrollment process to provide clearer feedback
- Standardized navigation bars across all professor interface pages for better user experience 

## Update #11
- Modernized professor interface with responsive design matching admin UI overhaul
- Enhanced professor dashboard with statistics cards showing courses, sections, and student counts
- Added password change functionality to professor profile page
- Improved profile display with organized sections for personal info and handled courses
- Updated navigation consistency across all professor pages
- Implemented modern card-based layout with hover effects and cleaner typography

## Update #10
- Updated student login system to use Student ID as both username and password
- Enhanced login page with a note about default student credentials
- Added user password change functionality to allow students to change their default password
- Fixed authentication issues in the password change functionality
- Improved dashboard welcome message to show student's name instead of username 

## Update #9
- Added password change functionality for all users
- Implemented auto-generation of student IDs on enrollment
- Enhanced student profile to display additional details (ID, course, year & section)
- Automatic authorization of new professors and students upon creation/enrollment
- Updated attendance forms to include subject selection

## Update #8
- Modernized admin interface with responsive design across all admin pages
- Enhanced subject management system with year/section filtering
- Added ability for admins to assign specific subjects to professors
- Created a tabbed interface for more organized professor management
- Included comprehensive subject catalog organized by year and section
- Updated dashboard with intuitive navigation and feature cards
- Implemented consistent styling across the entire admin section

## Update #7
- Enhanced professor attendance system with subject filtering capabilities
- Added ability to track attendance by subject for improved organization
- Updated UI across admin pages to use consistent navigation design
- Implemented subject assignment based on year/section requirements
- Modified server.js to support filtering attendance records by subject
- Added predefined subject lists by year and section to streamline subject management

## Update #6
- Fixed student profile data fetching by using a combination of `/api/me` and `/api/student/profile` endpoints
- Added new self-attendance tracker with calendar visualization and statistics
- Enhanced student navigation to include both basic attendance recording and the new tracker
- Added monthly attendance calendar with color-coded status indicators
- Implemented attendance statistics to show present, late, absent counts and attendance rate
- Added click functionality to calendar to set dates for quick attendance recording
- Updated all student pages to include the new tracker in navigation

## Update #5
- Added student self-attendance system for students to record and track their own attendance
- Created new API endpoints for student self-attendance management
- Updated all pages with consistent navigation bar style inspired by to-do page design
- Enhanced student profile page with modern card-based UI and improved responsive design
- Added navigation icons for better visual identification of features
- Implemented a new self-attendance page with status tracking (present/late/absent) and notes
- Added visualization for attendance history with color-coded status indicators

## Update #4
- Enhanced all dashboard pages with improved navigation and descriptive cards
- Added responsive UI cards to provide visual representation of available features
- Implemented consistent navigation system across all user roles
- Improved mobile responsiveness of all dashboard pages
- Updated student profile page to display additional student information
- Modified server.js to automatically authorize new professors and students
- Enhanced controlPanel.html with improved mobile responsiveness and styling

## Update #3
- Fixed professor editing functionality by implementing the missing PUT endpoint
- Greatly improved mobile responsiveness of the Admin panel
- Enhanced UI layout with better spacing and visual hierarchy
- Added responsive table display for better mobile experience
- Improved button styling and touch targets for mobile devices

## Update #2
- Fixed professor list fetching in the admin panel
- Enhanced error handling for all professor management functionality
- Improved UI feedback for professor management operations
- Added proper access control to all professor-related API endpoints

## Update #1
- Added `/api/admin/professors` endpoint to `server.js` to handle adding or updating professor accounts, resolving a 404 error in `addProfessor.html`.
- Updated navigation bars in `attendance.html`, `enrollment.html`, and confirmed `professorProfile.html` to include links to Dashboard, Profile, Attendance, Enrollment, and Logout for consistency across professor pages.

- Added Student ID auto-generation with the base ID starting from `20250001`
- Created new `enrollment.html` and `attendance.html` pages for professors with improved UI and functionality
- Added several new API endpoints to support these features:
  - `/api/generate-student-id` - Generates next student ID
  - `/api/professor/students` - Lists students enrolled in professor's courses/sections
  - `/api/professor/enroll` - Enrolls a new student
  - `/api/professor/students/:studentId` - Deletes a student
  - `/api/professor/attendance` - Gets/adds attendance records
- Added an attendance database table to store attendance records
- Fixed the issue with Professors List not fetching in the admin panel
- Added `/api/admin/professors` endpoint to handle adding or updating professor accounts