# LogDay System Architecture & Feature Flow

This document provides a high-level overview of the entire **LogDay** ecosystem, detailing the flows for both the **Desk App** and the **Field App**.

---

## 🏗️ Unified System Flow

```mermaid
graph TD
    %% Entry Section
    subgraph "1. ONBOARDING & ACCESS"
        START((📱 Open App)) --> ORG[🔍 Find Organization]
        ORG --> BRAND[🎨 Applied Custom Branding]
        BRAND --> LOGIN[🔐 Secure Login]
        LOGIN --> HWID{Is this your phone?}
    end

    %% Security Logic
    subgraph "2. SECURITY CHECKPOST"
        HWID -- "No" --> ALRT_D[🛑 Access Denied / Alert Admin]
        HWID -- "Yes" --> SEC_CHECK{Verify Profile Status}
        
        SEC_CHECK -- "Reset Required" --> RESET[🔑 Force Password Change]
        SEC_CHECK -- "New User" --> ENROLL[📸 Register Face Biometric]
        SEC_CHECK -- "Ready" --> APP_TYPE{Which App?}
    end

    %% Functional Lanes
    subgraph "3. DESK APP FLOW (In-Office)"
        APP_TYPE -- "Desk" --> DESK_HOME[🏠 Desk Dashboard]
        DESK_HOME --> D_ATT[🤳 Face Attendance]
        D_ATT --> D_VERIFY[✅ Face + WiFi + Geofence Verified]
        DESK_HOME --> D_LEAVE[📅 Submit Leave/OD Request]
        DESK_HOME --> D_HIST[📊 View Monthly Attendance]
    end

    subgraph "4. FIELD APP FLOW (On-the-Go)"
        APP_TYPE -- "Field" --> FIELD_HOME[🌍 Field Dashboard]
        FIELD_HOME --> F_PLAN[📝 Create Daily Visit Plan]
        F_PLAN --> F_APPROVAL{Admin Approval?}
        
        F_APPROVAL -- "Wait" --> F_STAT[⏳ Checking Plan Status]
        F_APPROVAL -- "Start" --> F_NAV[🗺️ Route Navigation]
        
        F_NAV --> F_VISIT[📍 Visit Check-in: Face + GPS]
        FIELD_HOME --> F_EXP[💰 Claim KMs / Expenses]
        FIELD_HOME --> F_SYNC[📶 Offline Sync Queue]
    end

    %% Backend Linkage
    subgraph "5. CENTRAL COMMAND"
        D_VERIFY --> CLOUD[(☁️ Secure Cloud DB)]
        F_VISIT --> CLOUD
        F_NAV -- "Live Trail" --> MONITOR[📺 Admin War Room]
    end

    RESET --> LOGIN
    ENROLL --> APP_TYPE
    F_STAT --> F_APPROVAL
```

---

## 🌟 Key Feature Highlights

### 1. Desk App: Enterprise Discipline
- **Zero-Trust Check-in**: Combines biometric face matching with strict geofencing and WiFi BSSID validation.
- **Privacy First**: Tracking only happens at the point of check-in/out.
- **Centralized Reports**: Full monthly breakdown available directly on the phone.

### 2. Field App: Productivity & Accuracy
- **Route Optimization**: Visualizes the daily schedule on a map with turn-by-turn navigation.
- **Smart End-Day**: Automatically calculates total KMs traveled from GPS pings for reimbursement.
- **Offline Mode**: Agents can work in areas with poor internet; data is automatically synced when a connection is restored.
- **Live Tracking**: Admins can see "Live Trails" of agents only during their active working hours.

### 3. Unified Backend (LogDay-API)
- **AI Engine**: DeepFace integration for sub-second biometric matching.
- **Alert System**: Triggers "High Importance" alerts for Mock Location, Device Mismatch, or Face Failures.
- **Multi-Tenant**: Dynamically segments data and branding based on the organization.

---
Created on: 2026-03-14
