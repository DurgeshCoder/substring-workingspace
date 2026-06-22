# Employee Management System (EMS)

A production-grade Employee Management System built with **Next.js, MySQL, Prisma, Tailwind CSS, and shadcn/ui**.

---

# Tech Stack

## Frontend

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Zustand (optional)

## Backend

- Next.js Route Handlers
- Server Actions
- Prisma ORM
- MySQL

## Authentication

- Auth.js (NextAuth)
- Credentials Provider
- JWT Session

## File Upload

- Cloudinary

## Utilities

- bcrypt
- date-fns
- sonner
- recharts

---

# System Architecture

```text
Employee Management System

├── Authentication Module
├── User Module
│    ├── Admin
│    └── Employee
├── Employee Module
├── Department Module
├── Task Module
├── Dashboard Module
├── Profile Module
├── Notification Module
├── Activity Log Module
└── Settings Module
```

---

# Roles

## Admin

Admin can:

- Create employee
- Update employee
- Delete employee
- Manage departments
- Create tasks
- Assign tasks
- Reassign tasks
- Update task status
- Add comments
- View analytics
- View activity logs

---

## Employee

Employee can:

- Login
- View dashboard
- Update own profile
- Change password
- View assigned tasks
- Update task status
- Add comments
- Upload profile photo

---

# Module 1: Authentication

## Features

- Admin Registration
- Login
- Logout
- Forgot Password
- Reset Password
- Change Password
- Session Management

---

# Module 2: Employee Management

## Employee Fields

```text
Employee ID
First Name
Last Name
Email
Phone
Department
Designation
Joining Date
Salary
Gender
Address
Profile Photo
Status
```

## Operations

- Create Employee
- Update Employee
- Delete Employee
- Activate Employee
- Deactivate Employee
- Search Employee
- Pagination
- Filter Employees

---

# Module 3: Employee Profile

Employee can:

- View Profile
- Update Profile
- Change Password
- Upload Profile Picture

---

# Module 4: Department Management

Examples:

- Engineering
- HR
- Sales
- Marketing
- Finance
- Support

## Operations

- Create Department
- Update Department
- Delete Department

---

# Module 5: Task Management

## Task Fields

```text
Title
Description
Priority
Assigned To
Assigned By
Due Date
Status
Tags
```

---

## Priority

```text
LOW
MEDIUM
HIGH
URGENT
```

---

## Status

```text
TODO
IN_PROGRESS
REVIEW
COMPLETED
CANCELLED
```

---

## Features

### Admin

- Create Task
- Update Task
- Delete Task
- Assign Task
- Reassign Task
- Change Status
- Add Comments

### Employee

- View Assigned Tasks
- Change Task Status
- Add Comments

---

# Kanban Board

```text
TODO
----------------
Task 1
Task 2

IN PROGRESS
----------------
Task 3

REVIEW
----------------
Task 4

COMPLETED
----------------
Task 5
```

### Drag and Drop Library

```bash
@dnd-kit
```

---

# Module 6: Comments

Example:

```text
Admin:
Please complete API integration today.

Employee:
API integration completed.

Admin:
Move task to Review.
```

---

# Module 7: Dashboard

## Admin Dashboard

### Cards

```text
Total Employees
Active Employees
Departments
Pending Tasks
Completed Tasks
Overdue Tasks
```

### Charts

- Task Status Pie Chart
- Employee Growth Chart
- Department Distribution

Library:

```bash
recharts
```

---

## Employee Dashboard

### Cards

```text
Assigned Tasks
Completed Tasks
Pending Tasks
Overdue Tasks
```

---

# Module 8: Notifications

Examples:

- New Task Assigned
- Task Updated
- Comment Added
- Deadline Reminder

Fields:

```text
Title
Message
Read Status
Created At
```

---

# Module 9: Activity Logs

Examples:

```text
Admin created employee Rahul.

Admin assigned Task #23.

Employee changed task status.

Employee commented on Task #23.
```

Purpose:

- Auditing
- Tracking changes
- History

---

# Module 10: Search and Filters

## Employee Filters

- Department
- Status
- Joining Date

## Task Filters

- Priority
- Status
- Employee
- Due Date

---

# Database Design

---

## User

```prisma
User
-----
id
employeeCode
firstName
lastName
email
password
phone
role
departmentId
designation
joiningDate
salary
gender
address
imageUrl
status
createdAt
updatedAt
```

Relationship:

```text
Department
1 ---- * Users
```

---

## Department

```prisma
Department
----------
id
name
description
createdAt
updatedAt
```

---

## Task

```prisma
Task
----
id
title
description
priority
status
assignedById
assignedToId
dueDate
createdAt
updatedAt
```

Relationships:

```text
Admin
1 ---- * Tasks

Employee
1 ---- * Tasks
```

---

## Comment

```prisma
Comment
-------
id
content
taskId
userId
createdAt
```

---

## Notification

```prisma
Notification
------------
id
title
message
userId
isRead
createdAt
```

---

## ActivityLog

```prisma
ActivityLog
-----------
id
action
entityType
entityId
performedBy
metadata
createdAt
```

---

# Folder Structure

```text
src
│
├── app
│
├── (auth)
│
├── admin
│     ├── dashboard
│     ├── employees
│     ├── departments
│     ├── tasks
│     └── settings
│
├── employee
│     ├── dashboard
│     ├── tasks
│     ├── profile
│     └── notifications
│
├── components
│     ├── ui
│     ├── forms
│     ├── dialogs
│     ├── tables
│     ├── charts
│     ├── kanban
│     └── layout
│
├── actions
├── services
├── repositories
├── hooks
├── lib
├── validations
├── types
├── constants
└── prisma
```

---

# API Design

## Employee APIs

```http
POST   /api/employees
GET    /api/employees
GET    /api/employees/:id
PUT    /api/employees/:id
DELETE /api/employees/:id
```

---

## Department APIs

```http
POST   /api/departments
GET    /api/departments
PUT    /api/departments/:id
DELETE /api/departments/:id
```

---

## Task APIs

```http
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

---

## Comment APIs

```http
POST /api/tasks/:id/comments
GET  /api/tasks/:id/comments
```

---

# Pages

## Admin Panel

```text
Dashboard

Employees
├── Employee List
├── Add Employee
├── Edit Employee

Departments
├── Department List

Tasks
├── All Tasks
├── Create Task
├── Board View
├── Task Details

Notifications

Activity Logs

Settings
```

---

## Employee Panel

```text
Dashboard

My Tasks
├── Board View
├── Task Details

Profile

Notifications
```

---

# Future Enhancements

## Attendance Module

- Check In
- Check Out

---

## Leave Management

- Apply Leave
- Approve Leave

---

## Payroll

- Salary Management
- Payslip Generation

---

## Project Management

```text
Project
    ↓
Tasks
    ↓
Employees
```

---

## Email Notifications

Libraries:

- Resend
- Nodemailer

---

## Real-Time Updates

Libraries:

```bash
Socket.io
Pusher
```

---

## Multi-Tenant Support

```text
Company A
Company B
Company C
```

Each company will have isolated data.

---

# Development Roadmap

## Phase 1

### Authentication + RBAC

- Login
- Logout
- Session
- Role Protection

---

## Phase 2

### Employee Management

- Employee CRUD
- Department CRUD

---

## Phase 3

### Task Management

- Task CRUD
- Task Assignment

---

## Phase 4

### Board View

- Kanban Board
- Comments

---

## Phase 5

### Notifications

- Notification Center
- Activity Logs

---

## Phase 6

### Dashboard

- Charts
- Search
- Filters
- Pagination

---

## Phase 7

### Advanced Features

- File Upload
- Email Notifications
- Real-Time Updates
- SaaS Features

---

# Inspiration

This project is inspired by:

- Jira
- ClickUp
- Asana
- Zoho People
- Trello

and follows industry-standard architecture suitable for production applications.
