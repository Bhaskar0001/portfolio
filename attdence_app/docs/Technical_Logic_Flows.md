# LogDay Desk App: Technical Logic & Flow

This guide explains exactly how the app and backend work together, from the moment a user signs in to how check-ins are verified.

---

## 1. Login & Security Check
**Path**: `src/screens/LoginScreen.js` -> Backend `/login`

1.  **User Input**: User selects organization, enters email/password.
2.  **Device Binding**: The app captures the unique **Hardware ID** of the phone/tablet.
3.  **Authentication**:
    - Backend verifies the email and password.
    - If `Device Binding` is enabled, backend checks if the captured ID matches the one stored during registration.
4.  **Flags Check**: The backend returns two critical flags:
    - `force_password_change`: If `true`, the user is forced to the **Reset Password** screen immediately.
    - `needs_face_enrollment`: If `true` (new user), the user is redirected to the **Attendance Scan** screen to register their face before they can see the dashboard.

---

## 2. Determining "Check-in" vs "Check-out"
**Path**: `src/screens/HomeScreen.js` -> Backend `/analytics/me`

1.  **Fetching Status**: Every time the Home Screen loads, it asks the backend for the user's latest logs.
2.  **Backend Sorting**: 
    - The backend looks at the `attendance_logs` collection.
    - It sorts them by **timestamp (Descending)**.
    - It takes the **very first (most recent)** log.
3.  **Logic Toggle**:
    - If the last log was **Check-in** -> Show **Check-out** button.
    - If the last log was **Check-in** (or no logs exist) -> Show **Check-in** button.
    - *This ensures the user can never check-in twice or check-out without checking in.*

---

## 3. The "Smart Attendance" Sequence (Mini-Steps)
**Path**: `src/screens/AttendanceScanScreen.js` -> Backend `/smart-attendance`

When the user scans their face, the following happens in order:

### Phase A: App-Side (Frontend)
1.  **Liveness Detection**: App ensures a person is actually in front of the camera.
2.  **Environment Capture**:
    - Captures **Face Image** (compressed to ~600kb-1MB).
    - Captures **GPS Coordinates** (Lat/Long).
    - Captures **WiFi Info** (BSSID, SSID, and Signal Strength).
3.  **API Call**: Sends all this data to the `/smart-attendance` endpoint.

### Phase B: Backend Verification (The "Brain")
1.  **Face Matching**: Compares the new photo against the "Master Photo" using AI embeddings.
2.  **Geofencing**: Checks if the user's GPS coordinates are within the allowed radius of the office location.
3.  **WiFi Verification**: Checks if the user is connected to the specific **Office WiFi BSSID**.
4.  **Signal Strength**: Ensures the user isn't standing too far away from the router.
5.  **Type Determination**: The backend automatically sets the type (`check-in` or `check-out`).

### Phase C: Response & Feedback
1.  **Save log**: If all checks pass, a new log is saved to MongoDB.
2.  **Toast Notification**: App displays a **Success Toast** and triggers haptic vibration.
3.  **State Refresh**: App navigates back home, which triggers a refresh of the buttons.

---

## 4. Why the Nginx Fix was Critical
When the app sends the face photo, the data is quite large because it contains high-resolution biometric data. 
- **Without the fix**: Nginx sees a file > 1MB and says "Too big!" and closes the connection.
- **With the fix**: Nginx allows up to 10MB, letting the biometric data reach the AI engine for matching.

---

## 5. Leave & OD Request Flow
**Path**: `src/screens/LeaveRequestScreen.js` -> Backend `/api/leave/request`

1.  **Submission**: User picks a category (Casual, Medical, OD, etc.), dates, and provides a reason.
2.  **Tracking**: 
    - Requests are saved with a `pending` status.
    - Users can see their history in the "Leaves" tab.
3.  **Approval Loop**: 
    - Admin sees the request in the Admin Portal.
    - Once approved/rejected, the app status updates in real-time.

---

## 6. Attendance History & Analytics
**Path**: `src/screens/HistoryScreen.js` -> Backend `/logs/{email}`

1.  **Data Retrieval**: The app fetches all historical logs for the logged-in user.
2.  **UI Rendering**: 
    - **Check-ins**: Shown in green with exact time and location.
    - **Check-outs**: Shown with the duration worked.
3.  **Monthly Stats**: Summarizes "Total Hours" and "Days Present" for the current month.

---

## 7. Password Management Logic

### Admin-Initiated Reset
1.  Admin clicks **Reset Password** in the Directory.
2.  Backend sets `force_password_change = true` for that user.
3.  **App Reaction**: On next login, app forces user into `ForceChangePasswordScreen.js`.

### Biometric Update
1.  Employee goes to **Profile** -> **Security**.
2.  Must enter **current password** to unlock.
3.  App takes them through face enrollment flow.

---
Validated via code structure audit.
