# Social image from the real app (no AI imagery)

Two shareable images built from the app itself, saved to Files. No changes to the app.

## 1. App collage (main post image)
- Capture real screens from the self-playing demo (`/demo`, no login, no private data): Design Lab choices, build progress, Rehearse with "Read of the room", Review summary.
- Arrange them in one 1080x1350 portrait image: "Classroom Coach" title and one-line tagline at top, four framed screenshots in a clean 2x2 grid with short labels (Design, Build, Rehearse, Review), small footer with classroomcoach.lovable.app.
- Uses the app's own navy/white/gray colors and fonts.

## 2. How-it-works diagram (second image, carousel-friendly)
- A clean, hand-built diagram (not AI-generated) of the actual flow:

```text
Your context (policies, curriculum, local knowledge)
        -> Design Lab (moment, people, setting)
        -> Scenario built and reviewed
        -> Rehearse (people respond, room changes, scenes shift)
        -> Review (brief feedback + instructor notes)
        -> Research dataset (opt-in, for studying practice)
```
- Same size and style; no vendor names, databases, or technical internals.

## Checks
- View both images at full size for clipped text, blurry screenshots, and spacing before sharing.

## Technical details
- Playwright captures `/demo` at timed steps (1280-wide, 2x pixel density for sharp screens).
- Composite and diagram rendered as HTML with the app's design tokens, then screenshotted to PNG in `/mnt/documents` (classroom-coach-app-collage.png, classroom-coach-how-it-works.png).
