# Requirements: AI Gym Coach MVP

## Overview

A web application that acts as a virtual personal trainer. Users point their phone or laptop camera at themselves while exercising, and the app uses AI pose detection to analyze their form in real-time. When the user makes a mistake, the app provides voice feedback like a real coach would.

## Target Users

- People who work out at home without a trainer
- Gym-goers who want form feedback
- Beginners learning proper exercise technique

## Core Features

### 1. Exercise Selection
- Users can choose between two exercises: **Squat** and **Deadlift**
- Simple selection screen before starting a workout
- Camera should be positioned at chest height on a shelf/rack

### 2. Real-Time Pose Detection
- Use browser-based pose detection (MediaPipe)
- Detect body landmarks in real-time from camera feed
- Display skeleton overlay on the user's body (optional visual feedback)
- Runs entirely in the browser - no server processing needed

### 3. Form Analysis
- Analyze joint angles to detect proper vs improper form
- **Squat checks:**
  - Depth (are they going low enough?)
  - Knee tracking (knees shouldn't cave inward)
  - Forward lean (chest should stay up)
- **Deadlift checks:**
  - Back position (shouldn't round)
  - Knee position (shouldn't shoot forward)

### 4. Voice Feedback
- Speak corrections out loud using text-to-speech
- Examples: "Go deeper", "Push your knees out", "Straighten your back"
- Feedback should be debounced (don't repeat the same correction within 3 seconds)
- English language only for MVP

### 5. Rep Counting
- Automatically count repetitions based on movement phases
- Track good form reps vs bad form reps separately
- Display live count during workout

### 6. Guest Mode
- Users can try the app without creating an account
- Full functionality available without login
- Cannot save workout history without account

### 7. Workout Summary
- Show at the end of each workout:
  - Total reps completed
  - Good form reps vs bad form reps
  - List of mistakes made
  - Workout duration
  - Date/time
- Option to save if logged in

### 8. Workout History (Authenticated Users)
- Save completed workouts to database
- View history of past workouts
- Protected route - requires login

## Acceptance Criteria

- [ ] User can select Squat or Deadlift exercise
- [ ] Camera activates and shows user's video feed
- [ ] Pose detection identifies body landmarks
- [ ] Form issues are detected and announced via voice
- [ ] Reps are counted automatically
- [ ] Workout can be started/stopped by user
- [ ] Summary displays accurate statistics after workout
- [ ] Logged-in users can save and view workout history
- [ ] Guest users can complete workouts without saving
- [ ] App works on Chrome, Firefox, Safari, and Edge

## Out of Scope (Future Features)

- Auto-detect which exercise the user is doing
- Arabic language support
- Free tier usage limits (10 workouts)
- Payment/subscription system
- Additional exercises beyond squat and deadlift
- Mobile native app

## Technical Constraints

- Must run in browser (no native app)
- Pose detection must run client-side (MediaPipe)
- Must use existing auth system (BetterAuth)
- Must use existing database (PostgreSQL/Drizzle)

## Dependencies

- Existing authentication system
- Existing database infrastructure
- Browser with camera access
- Browser with Web Speech API support
