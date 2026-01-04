# FitPortal v2.0 Upgrade Plan

Based on the provided Technical Design Document (TDD), this plan outlines the migration to the v2.0 architecture.

## Phase 1: Core & Architecture (Sprint 1) - **COMPLETED**
Focus: Foundation setup, State Management, and Schema definitions.

### 1. State Management Overhaul
- **Goal:** Move server state handling from `useEffect` to `TanStack Query` and UI state to `Zustand`.
- **Files:**
    - `src/lib/queryClient.js`: Setup QueryClient. (Done)
    - `src/stores/uiStore.js`: Setup Zustand for global UI state (modals, sidebar). (Done)
    - `src/main.jsx`: Wrap app in `QueryClientProvider`. (Done)

### 2. Database Schema v2 Implementation
- **Goal:** Define the new data structure in code to support "Block-based" programming and "Concurrent Assignments".
- **Files:**
    - `src/services/userService.js`: Update for extended user profile (`current_stats`, `integrations`). (Done)
    - `src/services/programService.js`: New logic for Block/Phase structure (replacing day-based logic). (Done)
    - `src/services/assignmentService.js`: Logic for managing `assigned_programs` with active status. (Done)

### 3. Cloudflare Stream Integration
- **Goal:** backend-less video upload flow.
- **Files:**
    - `src/services/videoService.js`: Implement `getUploadUrl` (mocked or connected to Cloud Function) and `uploadVideo`. (Done)

### 4. Cloud Functions Scaffolding
- **Goal:** Prepare the backend logic container.
- **Files:**
    - `functions/index.js`: Setup triggers for `onDocumentCreate` (AutoFlows foundation). (Done)

## Phase 2: The Builder & Assignment (Sprint 2) - **COMPLETED**
Focus: UI implementation for the new data structures.

- **Workout Builder v2:** Rewrite `WorkoutBuilder.jsx` to support Blocks/Phases. (Done)
- **Assignment UI:** Update `StudentsTab.jsx` to handle multiple active programs. (Done)
- **Member View:** Update `MemberDashboard.jsx` to show "Today's Tasks" derived from the active block. (Done)

## Phase 3: Automation & Commerce (Sprint 3 & 4)
- **AutoFlow Engine:** Implement the logic for `autoflows` collection.
- **Marketplace:** Integrate Iyzico sub-merchant API.

## Phase 4: Mobile (Sprint 5)
- **React Native:** Initialize mobile project sharing logic/hooks from Web.