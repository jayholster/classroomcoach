# Usability pass: Review/Feedback and Research

Presentation-only pass over the review pages and the research terminal. No schema, server
function, or data-shape changes. Existing workflow, routes, and copy content stay; what
changes is layout, grouping, labels, and how options are presented.

## Review list (`/review`)

- Split rehearsals into two clearly labelled groups: **In progress** and **Completed**, so
  the state is structural rather than only a chip.
- Each row becomes a readable card line: scenario title, relative date ("Today, 2:14 PM"),
  turn count if available, and one obvious primary action ("Open review") instead of a
  quiet secondary button.
- Add a simple filter row (All / In progress / Completed) with a visible count on each
  option, plus a search-free empty state per filter.
- Larger title type and a one-sentence explanation of what a review is, above the list.

## Review detail (`/review/$sessionId`)

- Add a short **Summary strip** at the top: number of turns, number of consequential
  moments, number of flags, and whether a reflection exists — each linking to its section.
- Reorder for how educators read: Reflection first when it exists (with a clear "Generate
  review" call to action when it doesn't), then Consequential moments, then the full
  transcript, then End state and Flags.
- Make the full transcript collapsible ("Show all turns") so the page opens short; keep
  consequential moments expanded.
- Turn each transcript entry into a labelled block — YOUR MOVE / WHAT HAPPENED / WHAT
  CHANGED — with consistent spacing and larger body text.
- Present "what changed" items as small labelled tags (Revealed, Unresolved, Resolved,
  Relationship) instead of an undifferentiated bullet list.

## Research landing (`/research`)

- Lead with one plain sentence about what the terminal does, then the workspace list as
  cards with a single primary "Open dataset builder" action.
- Move workspace creation behind an explicit "New workspace" disclosure so the list is the
  first thing seen; keep the quick "all rehearsals" option inside that panel as a clearly
  secondary choice.
- Clear empty state distinguishing "you have no scope granted" from "no workspace yet".

## Dataset workspace (`/research/$projectId`)

- Restructure the Dataset Builder into three explicitly numbered steps so optionality is
  obvious: **1 Choose rows (filters) → 2 Choose columns (fields) → 3 Preview and export**.
- Field families become collapsible groups with a per-family "Select all / none", a live
  "N of M fields selected" count, and a always-visible "Selected fields" summary bar.
- Add two one-click starting points ("Minimal session dataset", "Full interaction dataset")
  that set a sensible field selection; everything remains editable afterwards.
- Filters get plain-language labels and a summary line ("12 rehearsals match, 4 completed").
- Export area states clearly what will be downloaded (rows, columns, data dictionary) and
  disables export with an explanatory message when no fields are selected.
- Tabs stay in place but get clearer names and short one-line descriptions under the active
  tab (Overview / Sessions / Dataset Builder / Assurance).

## Event explorer

- Replace the raw JSON block for the generated response with the same readable
  voices/observation rendering used in rehearsal; keep raw JSON available under a "Show raw
  record" disclosure.
- Group each turn as OBSERVED / MODEL-GENERATED / ANNOTATION bands with consistent labels,
  and move the annotation input under a small "Add note" toggle so the page reads as a
  transcript first.

## Technical notes

- Files touched: `src/routes/_authenticated/review.index.tsx`,
  `review.$sessionId.tsx`, `research.index.tsx`, `research.$projectId.tsx`,
  `research.$projectId.session.$sessionId.tsx`, and small shared bits in
  `src/components/AppShell.tsx` (a labelled tag/step primitive) if reuse warrants it.
- All state stays local component state; queries and server functions unchanged.
- Styling uses existing semantic tokens only; no new colors.
