# Demo on a phone, and hiding the way back into the app

Two changes to `/demo` only. No other part of Classroom Coach is touched.

## 1. A portrait phone version of the demo

Right now the demo stage is a fixed 16:9 frame with two- and five-column panels, which turns into unreadable slivers on a narrow phone. The fix is a portrait variant of the same script — same steps, same timing, same captions — laid out for a tall screen.

What changes on a narrow/portrait screen:

- The stage becomes a full-height 9:16 frame instead of a centered 16:9 card, filling the phone screen edge to edge with no surrounding gray margin.
- The phase rail (Design / Build / Review scenario / Rehearse / Reflect) collapses to a compact single row of short labels, and the "CLASSROOM COACH" wordmark drops to its own small line above it.
- Design Lab panel: one field per row instead of two columns, with the option chips wrapping.
- Scenario review panel: cast, relationships, opening moment, and provenance stack vertically in one column, and only the block currently being revealed is on screen (the earlier ones scroll up) so nothing is squeezed.
- Rehearse panel: the scene header wraps to two lines; only the last two or three beats are kept on screen instead of five, so text stays at a readable size; "Your move" bubbles widen to 90%.
- Review panel: summary, then the three sections, then the instructor note, all in one column, with the three sections revealed in sequence so the panel never overflows.
- Type sizes step up slightly in the portrait variant so text is legible in a phone recording.

Detection: a viewport/orientation media query evaluated on the client (portrait or width under ~700px picks the phone layout, otherwise the current desktop stage). It re-evaluates live, so rotating the phone or resizing the browser swaps layouts without a reload. Nothing depends on user-agent sniffing.

You can also force a layout with `/demo?view=phone` or `/demo?view=desktop` — useful for recording a phone-shaped take on a desktop screen.

## 2. Hiding the path back to the app

Honest answer on the URL: a normal web page cannot hide or fake the browser address bar. Anyone watching a recording of a phone browser will see `classroomcoach.lovable.app/demo` unless the recording crops it. What is possible:

- The demo route renders no navigation, no links, no buttons — nothing clickable at all, so there's no in-page route back into the app. (Already true; the plan keeps it true for the phone layout.)
- Add a web-app manifest entry and `apple-mobile-web-app-capable` meta so that if you "Add to Home Screen" from `/demo` on a phone, it launches full screen with no address bar at all. This is the only reliable way to record the demo without a visible URL.
- Keep the route `noindex` (already set) so it doesn't surface in search.
- Optionally serve it at a less obvious path alias (for example `/showcase`) that also renders the same demo, if you'd rather the visible URL not read as a demo of a named product. Say the word and I'll pick the path.

For the cleanest recording: open `/demo` on the phone, add it to the home screen, launch from there, and record — no address bar, no tabs, no back affordance.

## Technical notes

- New `usePortraitStage()` hook in `src/components/demo/DemoStage.tsx` (or a small sibling module) using `matchMedia("(orientation: portrait), (max-width: 700px)")` with a listener, plus a `view` search-param override on the route.
- The script (`src/lib/demo/script.ts`) is unchanged — both layouts consume the same `DEMO_SCRIPT`, so the two versions can never drift.
- Panels gain a `compact` prop rather than being duplicated, so content and phrasing stay in one place.
- Manifest/meta additions go in the demo route's `head()` and a small `public/demo.webmanifest`; no change to the app's root document.
