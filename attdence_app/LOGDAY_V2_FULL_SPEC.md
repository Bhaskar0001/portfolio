# LogDay v2 — Complete Build Specification (Desk App + Admin + Backend)

> **PURPOSE**: This document is a complete, self-contained specification to build an industry-grade Employee Attendance System from scratch. Build ALL three components: Backend API, Admin Web Dashboard, and Desk Employee Mobile App. Everything must work end-to-end with real data, zero placeholder screens, and a clean light theme.

---

## SYSTEM OVERVIEW

**LogDay** is a multi-tenant, AI-powered employee attendance system. Organizations register, add employees, and employees use a mobile app to check in/out using **face biometrics + GPS geofencing + WiFi verification**. Admins manage everything from a web dashboard.

### Three Components to Build

| Component | Tech Stack | Purpose |
|-----------|-----------|---------|
| **Backend API** | Python FastAPI + MongoDB (motor) + DeepFace | REST API for all data operations |
| **Admin Dashboard** | React (Vite) + TailwindCSS | Web panel for org admins to manage employees, view logs, settings |
| **Desk App** | React Native (Expo) | Mobile app for desk employees to check-in/out with face + location |

---

## PART 1: BACKEND API

### 1.1 Project Structure

```
backend/
├── main.py              # FastAPI app, CORS, startup, middleware
├── database.py          # MongoDB connection + collection references
├── models.py            # All Pydantic models/schemas
├── auth.py              # JWT + Argon2 password hashing + token guards
├── face_utils.py        # DeepFace embedding + cosine similarity verification
├── routers/
│   ├── employee.py      # /login, /register, /me, /smart-attendance, /logs
│   ├── admin.py         # /admin/login, /admin/employees, /admin/logs, /admin/stats
│   ├── settings.py      # /admin/settings, /settings (public)
│   ├── organization.py  # /admin/register-organization, /organization/discover
│   └── leave.py         # /api/leave/request, /admin/leave/requests
├── requirements.txt
├── .env
└── Dockerfile
```

### 1.2 Environment Variables (.env)

```env
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?appName=logday
DATABASE_NAME=logday
JWT_SECRET=<64-char-hex-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
OFFICE_LAT=28.4145947
OFFICE_LONG=77.354079
GEOFENCE_RADIUS_METERS=40
OFFICE_WIFI_SSID=
ADMIN_EMAIL=admin@logday.app
ADMIN_PASSWORD=admin123
```

### 1.3 Database Collections & Schemas

**MongoDB Database**: `logday`

#### Collection: `employees`
```json
{
  "email": "john@company.com",        // unique index
  "full_name": "John Doe",
  "employee_id": "EMP001",
  "designation": "Developer",
  "department": "Engineering",
  "organization_id": "ObjectId-string",
  "employee_type": "desk",            // enum: desk | field
  "hashed_password": "argon2-hash",
  "face_embedding": [0.1, 0.2, ...],  // 4096-float array from VGG-Face
  "profile_image": "base64-string",
  "device_id": "android-uuid",        // bound on first login
  "status": "Active",
  "manager_id": "manager@company.com",
  "force_password_change": false,
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### Collection: `admins`
```json
{
  "email": "admin@company.com",
  "full_name": "Admin User",
  "hashed_password": "argon2-hash",
  "role": "owner",                    // enum: superadmin | owner | admin | hr | manager
  "organization_id": "ObjectId-string",
  "allowed_features": ["dashboard", "employees", "attendance", "leaves", "settings"],
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### Collection: `organizations`
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",               // unique, used for discovery
  "logo_url": "https://...",
  "primary_color": "#6366f1",
  "address": "123 Main St",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### Collection: `attendance_logs`
```json
{
  "user_id": "ObjectId-string",
  "email": "john@company.com",
  "type": "check-in",                // "check-in" or "check-out"
  "timestamp": "2026-01-01T09:00:00Z",
  "lat": 28.414,
  "long": 77.354,
  "address": "Office Building, Sector 62",
  "distance_meters": 12.5,
  "wifi_ssid": "OfficeWiFi",
  "face_confidence": 0.15,
  "check_in_method": "wifi_geofence",
  "is_late": false,
  "late_mins": 0,
  "is_early_leave": false,
  "organization_id": "ObjectId-string",
  "device_id": "android-uuid"
}
```

#### Collection: `settings`
```json
{
  "organization_id": "ObjectId-string",
  "office_start_time": "09:00",
  "late_threshold_mins": 15,
  "required_hours": 8.0,
  "timezone_offset": 330,
  "office_lat": 28.414,
  "office_long": 77.354,
  "office_wifi_ssid": "OfficeWiFi",
  "geofence_radius": 40.0,
  "primary_color": "#6366f1",
  "logo_url": null
}
```

#### Collection: `leave_requests`
```json
{
  "employee_id": "ObjectId-string",
  "organization_id": "ObjectId-string",
  "leave_type": "sick",              // sick | casual | on_duty | other
  "start_date": "2026-01-15",
  "end_date": "2026-01-16",
  "reason": "Not feeling well",
  "status": "pending",               // pending | approved | rejected | cancelled
  "proof_url": null,
  "discussion": [{"sender_id": "...", "message": "...", "timestamp": "..."}],
  "created_at": "2026-01-14T10:00:00Z",
  "processed_at": null,
  "processed_by": null
}
```

#### Collection: `alerts`
```json
{
  "type": "Identity",                // Identity | Territory | Compliance
  "employee_id": "john@company.com",
  "organization_id": "ObjectId-string",
  "detail": "Face verification failed",
  "severity": "medium",              // low | medium | high | critical
  "status": "pending",               // pending | resolved | dismissed
  "timestamp": "2026-01-01T09:00:00Z",
  "metadata": {}
}
```

### 1.4 Authentication System

- **Password hashing**: Argon2 via `argon2-cffi`
- **JWT tokens**: `python-jose[cryptography]`, HS256, 30-day expiry
- **Two token schemes**: `employee_oauth2_scheme` (tokenUrl="login"), `admin_oauth2_scheme` (tokenUrl="admin/login")
- **Superadmin fallback**: If email matches `ADMIN_EMAIL` env var, treat as superadmin even without DB record
- **Device binding**: First login binds `device_id`. Subsequent logins from different devices are blocked (admin can clear binding)

### 1.5 Face Biometrics System

- **Library**: DeepFace with VGG-Face model
- **Detector backends**: Try RetinaFace → MTCNN → OpenCV (fallback chain)
- **Embedding**: 4096-dimensional float array stored in employee document
- **Verification**: Cosine similarity, threshold ≤ 0.60 = match
- **Enrollment**: During registration or via `/api/employee/update-face`

### 1.6 Complete API Endpoints

#### Public Endpoints (No Auth)
```
GET  /health                          → { status, timestamp, database }
GET  /                                → { message, status }
POST /register                        → Register employee with face image → JWT
POST /login                           → Email + password login → JWT + profile
POST /admin/login                     → Admin login → JWT
POST /admin/register-organization     → Create org + owner admin + default settings
GET  /organization/discover/{slug}    → Public org branding for mobile app
GET  /organizations/search?q=         → Search orgs by name/slug
GET  /settings/{slug}                 → Public org settings by slug
GET  /settings                        → Public settings (optionally org-scoped via token)
```

#### Employee Endpoints (JWT Required - employee token)
```
GET  /me                              → Current employee profile
POST /api/me/change-password          → Change password (old + new)
GET  /api/employee/profile            → Full profile + current attendance status
POST /api/employee/update-face        → Enroll/update face biometrics
POST /smart-attendance                → Check-in/out with face + GPS + WiFi
GET  /api/logs/{email}                → Paginated attendance history with date filters
GET  /api/analytics/me                → Today/week/month hours + current status
POST /api/leave/request               → Submit leave request
GET  /api/leave/my-requests           → List my leave requests
GET  /api/me/sync-status              → Get current check-in/out state
```

#### Admin Endpoints (JWT Required - admin token)
```
GET  /admin/me                        → Admin profile + allowed features
GET  /admin/employees                 → List all employees (org-scoped)
POST /admin/employees                 → Create employee manually
PUT  /admin/employees/{email}         → Update employee details
DELETE /admin/employees/{email}       → Delete employee + logs
POST /admin/employees/{email}/reset-password   → Reset employee password
POST /admin/employees/{email}/clear-binding    → Clear device binding
POST /admin/employees/bulk-update-type         → Bulk change desk/field type
POST /admin/employees/bulk-assign-manager      → Bulk assign manager
POST /admin/import-employees          → CSV/Excel bulk import with upsert
GET  /admin/employees/import-template → Download CSV template
GET  /admin/logs                      → All attendance logs (org-scoped, month filter)
GET  /admin/stats                     → Dashboard stats (total employees, present today, late, avg hours)
GET  /admin/stats/attendance-chart    → 7-day attendance trend data
GET  /admin/live-feed                 → Real-time attendance activity feed
GET  /admin/settings                  → Get org settings
PUT  /admin/settings                  → Update org settings
POST /admin/upload-logo               → Upload org logo image
GET  /admin/export-logs-pdf           → Export attendance as PDF
GET  /admin/export-logs-excel         → Export attendance as Excel
GET  /admin/sub-admins                → List sub-admins
POST /admin/sub-admins                → Create sub-admin
DELETE /admin/sub-admins/{email}      → Delete sub-admin
PUT  /admin/sub-admins/{email}/permissions → Update sub-admin features
GET  /admin/leave/requests            → List all leave requests
POST /admin/leave/requests/{id}/{action}   → Approve/reject leave
GET  /admin/reports/attendance        → Attendance summary report
GET  /admin/reports/employee-monthly-summary → Monthly per-employee breakdown
```

### 1.7 Smart Attendance Logic (CRITICAL - Must Be Bug-Free)

This is the core endpoint `POST /smart-attendance`. The flow MUST be exactly:

```
1. IDENTIFY USER
   → Find by email in employees collection
   → If not found, try face 1:N search against all employees
   → If still not found, try admins collection
   → If nothing, return 404

2. DETERMINE SUPERADMIN
   → is_superadmin = (role == "superadmin") OR (email == ADMIN_EMAIL env)
   → Superadmins bypass ALL security checks

3. FETCH ORG SETTINGS
   → Get settings from settings_collection by organization_id
   → Fallback to env vars (OFFICE_LAT, OFFICE_LONG, GEOFENCE_RADIUS_METERS)

4. AUTO-CLOSE STALE SESSIONS
   → Find latest log for this user (any date)
   → If last log is "check-in" AND timestamp < today_start_utc:
     → Insert auto "check-out" at 23:59:59 of that day
     → This prevents "already checked in" errors from yesterday

5. STATE MACHINE VALIDATION
   → If intended_type == "check-in" AND last_log.type == "check-in" → ERROR "Already checked in"
   → If intended_type == "check-out" AND (no last_log OR last_log.type == "check-out") → ERROR "Not checked in"

6. SECURITY CHECKS (skip all if superadmin)
   a. Mock location detection → 403 if mock_detected
   b. Device binding → 403 if device_id mismatch
   c. Face embedding exists check → 400 if no face enrolled
   d. Face verification → cosine similarity check against stored embedding

7. GEOFENCE CHECK (skip if superadmin)
   → Calculate haversine distance from (req.lat, req.long) to (office_lat, office_long)
   → If distance > radius → 403 with distance info
   → WiFi SSID match (optional, only if configured)

8. LATENESS CALCULATION (check-in only)
   → Convert UTC to local time using timezone_offset
   → Compare against office_start_time + late_threshold_mins
   → Set is_late=true and late_mins if applicable

9. EARLY LEAVE CHECK (check-out only)
   → Compare current local time against office_end_time - 10min grace

10. INSERT LOG
    → Save to attendance_logs collection with all metadata

11. RETURN SUCCESS
    → { status, type, message, time, distance_from_office }
```

### 1.8 Key Utility Functions

```python
def get_today_start(offset_mins=330):
    """Get start of 'today' in UTC given local offset (default IST +5:30)"""
    now_utc = datetime.now(timezone.utc)
    local_now = now_utc + timedelta(minutes=offset_mins)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return local_start - timedelta(minutes=offset_mins)

def calculate_haversine(lat1, lon1, lat2, lon2):
    """Returns distance in meters between two GPS coordinates"""
    dlat = math.radians(lat1 - lat2)
    dlon = math.radians(lon1 - lon2)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return 6371000 * 2 * atan2(sqrt(a), sqrt(1-a))
```

### 1.9 Requirements (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
motor==3.5.0
pymongo[srv]==4.8.0
python-jose[cryptography]==3.3.0
argon2-cffi==23.1.0
python-dotenv==1.0.1
deepface==0.0.93
opencv-python-headless==4.10.0
numpy==1.26.4
pandas==2.2.2
openpyxl==3.1.5
reportlab==4.2.0
apscheduler==3.10.4
python-multipart==0.0.9
certifi==2024.7.4
requests==2.32.3
pydantic==1.10.18
```

---

## PART 2: ADMIN DASHBOARD (React + Vite + TailwindCSS)

### 2.1 Project Setup
```bash
npx -y create-vite@latest ./ --template react
npm install axios react-router-dom lucide-react recharts
npm install -D tailwindcss @tailwindcss/vite
```

### 2.2 Theme: LIGHT THEME, Professional
- Background: `#f8fafc` (slate-50)
- Cards: `#ffffff` with subtle `shadow-sm border border-gray-200`
- Primary: `#6366f1` (indigo-500)
- Success: `#10b981`, Warning: `#f59e0b`, Danger: `#ef4444`
- Text: `#1e293b` (slate-800), Secondary text: `#64748b` (slate-500)
- Font: Inter (Google Fonts)
- Border radius: `rounded-xl` for cards, `rounded-lg` for buttons
- Transitions: `transition-all duration-200` on interactive elements

### 2.3 Pages & Features

#### Login Page (`/login`)
- Email + password form
- Calls `POST /admin/login`
- Store JWT in localStorage
- Redirect to dashboard on success

#### Register Organization (`/register`)
- Form: org name, slug, admin email, password, name
- Calls `POST /admin/register-organization`
- Redirect to login after success

#### Dashboard (`/`)
- **Stats cards**: Total Employees, Present Today, Late Today, Avg Hours
- **Attendance Chart**: 7-day trend line chart (recharts)
- **Live Feed**: Real-time activity list with auto-refresh
- API: `GET /admin/stats`, `GET /admin/stats/attendance-chart`, `GET /admin/live-feed`

#### Employee Management (`/employees`)
- **Table**: Name, Email, ID, Department, Type (desk/field), Status, Actions
- **Actions**: Edit, Reset Password, Clear Device Binding, Delete
- **Add Employee**: Modal form with fields
- **Bulk Import**: CSV upload via `POST /admin/import-employees`
- **Bulk Actions**: Change type, assign manager
- API: `GET/POST/PUT/DELETE /admin/employees/*`

#### Attendance Logs (`/attendance`)
- **Table**: Timestamp (IST), Employee Name, Type (Check-in/Check-out badge), Location, Method
- **Filters**: Month picker
- **Export**: PDF and Excel download buttons
- API: `GET /admin/logs`, `GET /admin/export-logs-pdf`, `GET /admin/export-logs-excel`

#### Leave Management (`/leaves`)
- **Table**: Employee, Type, Dates, Reason, Status (badge), Actions
- **Actions**: Approve/Reject with optional comment
- **Discussion**: Click to view/add messages thread
- API: `GET /admin/leave/requests`, `POST /admin/leave/requests/{id}/{action}`

#### Settings (`/settings`)
- **Office Config**: Start time, late threshold, required hours, timezone offset
- **Geofence**: Office lat/lng (map preview optional), radius, WiFi SSID
- **Branding**: Primary color picker, logo upload
- API: `GET/PUT /admin/settings`, `POST /admin/upload-logo`

#### Admin Management (`/admins`)
- **Table**: Name, Email, Role, Actions
- **Add Admin**: Modal with name, email, password, role select
- **Permissions**: Feature-level toggle checkboxes
- API: `GET/POST/DELETE /admin/sub-admins/*`

#### Reports (`/reports`)
- **Attendance Summary**: Date range → table with present/absent/late counts per employee
- **Monthly Summary**: Per-employee monthly breakdown with total hours, late days, leaves
- **Export**: PDF/Excel buttons
- API: `GET /admin/reports/attendance`, `GET /admin/reports/employee-monthly-summary`

### 2.4 Auth Context
```javascript
// AuthContext.jsx - manages JWT token, user object, login/logout
// Every API call attaches: Authorization: Bearer <token>
// On 401 response → auto-logout and redirect to /login
// Store token + user in localStorage for persistence
```

### 2.5 API Service Pattern
```javascript
// utils/api.js
import axios from 'axios';
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.clear(); window.location = '/login'; }
  return Promise.reject(err);
});
export default API;
```

---

## PART 3: DESK EMPLOYEE APP (React Native Expo)

### 3.1 Project Setup
```bash
npx -y create-expo-app@latest ./ --template blank
npx expo install expo-camera expo-location expo-secure-store expo-device
npm install axios @react-navigation/native @react-navigation/stack react-native-screens react-native-safe-area-context
```

### 3.2 Screens & Navigation Flow

```
App.js (NavigationContainer)
├── AuthStack (not logged in)
│   ├── LoginScreen
│   └── RegisterScreen (with face capture)
├── MainStack (logged in)
│   ├── HomeScreen (main attendance hub)
│   ├── AttendanceScanScreen (camera for face capture)
│   ├── HistoryScreen (attendance log list)
│   ├── LeaveRequestScreen (apply for leave)
│   ├── ProfileScreen (view profile, re-enroll face)
│   └── ForceChangePasswordScreen (if force_password_change=true)
```

### 3.3 Screen Details

#### LoginScreen
- **Fields**: Email, Password
- **On Submit**: `POST /login` with `{ email, password, device_id, organization_id }`
- **device_id**: Generated once via `expo-device` UUID, stored in SecureStore
- **On Success**: Store JWT + user profile in SecureStore, navigate to Home
- **Error Display**: Show exact error message from API (not generic)

#### HomeScreen (Main Hub)
- **Header**: User name, greeting, profile image
- **Status Card**: Large display showing "Checked In" (green) or "Checked Out" (red)
- **Timer**: Live running clock showing hours worked today (if checked in)
- **Action Button**: Large "Check In" or "Check Out" button based on current state
- **Quick Stats**: Today hours, Week total, Month total, On-time streak
- **Recent Activity**: Last 5 attendance entries
- **On Mount**: Call `GET /api/analytics/me` to sync state from server
- **CRITICAL**: The `current_status` from API determines button state, NOT local storage

#### AttendanceScanScreen (Face + Location Capture)
- **Flow**:
  1. Request camera + location permissions
  2. Show front camera preview
  3. On capture: get base64 image, get GPS coordinates, get WiFi info
  4. Call `POST /smart-attendance` with all data
  5. Show success/error with animation
  6. Navigate back to Home with updated state
- **Request Body**:
```json
{
  "email": "user@company.com",
  "image": "base64-face-image",
  "lat": 28.414,
  "long": 77.354,
  "accuracy": 10.5,
  "wifi_ssid": "OfficeWiFi",
  "wifi_bssid": "aa:bb:cc:dd",
  "wifi_strength": -45,
  "address": "Resolved address string",
  "intended_type": "check-in",
  "device_id": "android-uuid",
  "otp_used": false,
  "mock_detected": false
}
```

#### HistoryScreen
- **List**: Paginated attendance logs with pull-to-refresh
- **Each item**: Date, time (IST), type badge (Check-in green / Check-out red), location
- **Date filter**: Start/end date pickers
- API: `GET /api/logs/{email}?page=1&limit=20`

#### LeaveRequestScreen
- **Form**: Leave type (dropdown), start date, end date, reason, proof upload
- **My Requests Tab**: List of submitted requests with status badges
- API: `POST /api/leave/request`, `GET /api/leave/my-requests`

#### ProfileScreen
- **Display**: Name, email, employee ID, department, designation, organization
- **Face Enrollment**: Button to re-capture face → calls `POST /api/employee/update-face`
- **Change Password**: Old + New password form
- **Logout**: Clear SecureStore, navigate to Login

### 3.4 Critical Implementation Rules

1. **Status Sync**: ALWAYS determine check-in/check-out state from `GET /api/analytics/me` response's `current_status` field. Never rely solely on local state.

2. **Stale Session Handling**: The backend auto-closes yesterday's sessions. The app must re-fetch status on every HomeScreen mount/focus.

3. **Error Messages**: Display the EXACT `detail` field from API error responses. Never show generic "Something went wrong".

4. **Device ID**: Generate ONCE on first app launch, store in SecureStore, send with every login and attendance request.

5. **Token Storage**: Use `expo-secure-store` for JWT token, NOT AsyncStorage.

6. **Address Resolution**: Use backend proxy `GET /api/geocoding/reverse?lat=X&lon=Y` to resolve coordinates to address string.

### 3.5 App Theme (Light)
- Background: `#f8fafc`
- Cards: `#ffffff` with shadow
- Primary: `#6366f1`
- Check-in button: Green gradient `#10b981` → `#059669`
- Check-out button: Red gradient `#ef4444` → `#dc2626`
- Font: System default (San Francisco / Roboto)
- Status bar: dark-content

---

## PART 4: DEPLOYMENT

### Backend (VPS with Docker)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Admin Dashboard (Vercel)
- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
- Env var: `VITE_API_URL=https://your-api-domain.com`

### Desk App (Expo EAS Build)
- `eas.json` with preview profile for APK
- Env var in `.env`: `EXPO_PUBLIC_API_URL=https://your-api-domain.com`

---

## PART 5: BUILD ORDER (Step by Step)

### Phase 1: Backend Foundation
1. Create project folder, init Python venv, install requirements
2. Create `.env` with MongoDB Atlas connection string
3. Build `database.py` — MongoDB connection + all collection references
4. Build `models.py` — ALL Pydantic schemas listed above
5. Build `auth.py` — Argon2 hashing, JWT creation, `get_current_admin`, `get_current_employee`
6. Build `face_utils.py` — DeepFace embedding extraction, cosine verification
7. Build `main.py` — FastAPI app with CORS (allow all origins for dev)

### Phase 2: Core API Endpoints
8. Implement `POST /admin/register-organization` — creates org + admin + settings
9. Implement `POST /admin/login` — admin JWT auth with DB + env fallback
10. Implement `POST /register` — employee registration with face embedding
11. Implement `POST /login` — employee auth (check employees → admins → env fallback)
12. Implement `POST /smart-attendance` — THE CORE (follow Section 1.7 exactly)
13. Implement `GET /api/analytics/me` — hours calculation + status sync
14. Implement `GET /api/logs/{email}` — paginated history
15. **TEST**: Use Swagger docs at `/docs` to verify every endpoint works

### Phase 3: Admin CRUD Endpoints
16. Implement employee CRUD: list, create, update, delete, reset-password, clear-binding
17. Implement bulk operations: import CSV, bulk-update-type, bulk-assign-manager
18. Implement `GET /admin/logs` with month filter
19. Implement `GET /admin/stats` — dashboard statistics
20. Implement settings GET/PUT
21. Implement leave request management
22. Implement sub-admin management
23. Implement export (PDF + Excel)

### Phase 4: Admin Dashboard
24. Scaffold Vite + React + TailwindCSS project
25. Build AuthContext + API utility + ProtectedRoute wrapper
26. Build Sidebar layout with navigation
27. Build Login page
28. Build Dashboard with stats cards + chart + live feed
29. Build Employee Management page with table + modals
30. Build Attendance Logs page with filters + export
31. Build Leave Management page
32. Build Settings page
33. Build Admin Management page
34. Build Reports page
35. **TEST**: Full flow — register org → login → add employee → view dashboard

### Phase 5: Desk Mobile App
36. Scaffold Expo project, install dependencies
37. Build AuthContext with SecureStore
38. Build LoginScreen
39. Build HomeScreen with status sync from `/api/analytics/me`
40. Build AttendanceScanScreen with camera + GPS
41. Build HistoryScreen with pagination
42. Build ProfileScreen with face re-enrollment
43. Build LeaveRequestScreen
44. Build ForceChangePasswordScreen
45. **TEST**: Full flow — login → check-in → verify on admin dashboard → check-out → view history

---

## CRITICAL RULES FOR BUG-FREE BUILD

1. **NEVER use local state alone for attendance status**. Always sync from backend.
2. **Auto-close stale sessions** in smart-attendance before state validation.
3. **Superadmin bypasses ALL security** — geofence, device binding, face check, mock detection.
4. **Login searches THREE places**: employees → admins → env fallback.
5. **All timestamps stored as UTC**. Convert to local only for display using `timezone_offset`.
6. **MongoDB ObjectId → string conversion** before JSON serialization (every endpoint).
7. **Error responses include specific detail** — never generic messages.
8. **CORS must allow the admin domain AND mobile app** (use `*` for development).
9. **Index creation on startup** must be wrapped in try/except (non-fatal).
10. **Face embedding shape check** — if stored vs new embedding dimensions differ, require re-enrollment.
