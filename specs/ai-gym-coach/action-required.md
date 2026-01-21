# Action Required: AI Gym Coach MVP

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

- [ ] **Ensure PostgreSQL database is running** - The workout table migration requires an active database connection

## During Implementation

- [ ] **Grant camera permission in browser** - When testing the camera functionality, you'll need to allow camera access in the browser permission prompt

## After Implementation

- [ ] **Test on physical device with camera** - Form detection accuracy should be verified with actual exercise movements, not just viewing the camera feed

---

> **Note:** This feature has minimal manual requirements since it uses:
> - Existing auth system (already configured)
> - Browser-native APIs (Web Speech, getUserMedia)
> - Client-side ML model (MediaPipe from CDN)
> - No new environment variables needed
