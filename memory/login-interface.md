---
name: login-interface
 description: The project should use one canonical static login interface.
metadata:
  type: project
---
All website login buttons should route to the standalone `/login` page rather than the legacy auth/payment modal. The login page must remain a static centered viewport with no watercolor/fluid effects, backdrop blur, or internal scrolling.

**Why:** The project currently exposes two visually different login interfaces and the legacy modal inherits landing-page effects.

**How to apply:** Preserve one login entry point and keep authentication separate from subscription/payment gating.
