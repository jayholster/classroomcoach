# Classroom Coach Studio

Build a working prototype of the next web-based version of CLASSROOM COACH.

This prototype is for a Penn State NSF Translation to Practice project. It should demonstrate how the existing Classroom Coach simulation architecture can become usable and configurable by educators without requiring them to write prompts or rebuild simulated people from scratch.

IMPORTANT CONCEPT

Do NOT build a generic scenario generator.

Classroom Coach already has a simulation architecture contained in expert-developed instructions and context documents. These govern:

- how simulations begin and unfold

- the library of simulated people

- developmental and relational information about those people

- student agency and dignity

- relationships and peer influence

- minute-to-minute scenario progression

- cumulative positive and negative consequences

- realism and dialogue style

- boundaries around appropriate simulation behavior

- end-of-simulation reflection

The attached Classroom Coach documents should be treated as the CORE SIMULATION FOUNDATION.

Ordinary educators should not edit these foundational instructions directly.

The new application sits around this existing system and translates an educator's teaching purpose and local context into a structured simulation that uses the Classroom Coach foundation.

CORE WORKFLOW

The basic workflow should feel like:

TEACHING PURPOSE

+

LOCAL CONTEXT DOCUMENTS

+

CLASSROOM COACH FOUNDATION

↓

DERIVED SCENARIO

↓

EDUCATOR REVIEWS / ADJUSTS

↓

PUBLISH VERSION

↓

REHEARSE

↓

REVIEW / FLAG / REVISE

The interface should make this workflow visually obvious.

DESIGN

Penn State inspired without copying official Penn State logos.

Use:

- deep navy

- white

- warm/light gray

- restrained light-blue accent

- simple sans-serif typography

- substantial whitespace

- thin borders

- minimal shadows

Avoid:

- gradients

- glowing AI effects

- robots

- brains

- sparkles

- startup marketing language

- excessive cards

- overly rounded UI

- calling everything "AI-powered"

It should look like serious university research software that could become a real product.

Use the name:

CLASSROOM COACH

Subtitle:

Configurable professional rehearsal

Main navigation:

Library

Design Lab

Rehearse

Review

Assurance

For this prototype, Library, Design Lab, Rehearse, and Review should be functional. Assurance can be a simpler demonstration page.

--------------------------------------

1. SIMULATION LIBRARY

--------------------------------------

Create a clean home screen.

Header:

Classroom Coach

Configurable professional rehearsal

Short description:

Create, adapt, and assign practice situations that are difficult to rehearse with real learners.

Primary action:

+ Create Simulation

Show several example simulations:

Middle School Ensemble

Peer conflict during rehearsal

Version 2

Engineering Design Camp

Facilitating inquiry and participation

Version 1

First-Year Teacher

Difficult family conversation

Version 3

Each simulation has:

Edit

Duplicate

Preview

Assign

Also show:

Draft

Published

Needs Review

Keep this page simple.

--------------------------------------

2. DESIGN LAB — START

--------------------------------------

The Design Lab is the centerpiece of the prototype.

DO NOT begin with dozens of settings.

Start with one large question:

"What should someone practice?"

Example entered response:

"Responding to conflict between students in a middle school ensemble without losing the instructional purpose of rehearsal."

Below this, ask only a few useful contextual questions:

Who is practicing?

Example: Preservice music teacher

Setting:

Example: 7th-grade band rehearsal

Optional:

"Is there anything specific the simulation should include?"

Then provide:

LOCAL CONTEXT

Upload documents

Drag and drop or select files.

Helper text:

"Add materials that should shape this simulation, such as lesson plans, curriculum, program policies, rehearsal plans, professional standards, local procedures, or other context."

Uploaded files should appear in a clean list and be removable.

The file upload interaction must actually work.

Support TXT and DOCX in the prototype.

Use a browser-compatible DOCX text extraction library such as Mammoth.js.

Do not require local context documents. Classroom Coach can create a scenario from its existing foundation.

Button:

BUILD SCENARIO DRAFT

--------------------------------------

3. CLASSROOM COACH FOUNDATION

--------------------------------------

On the Design Lab page, include a small expandable area:

"Classroom Coach foundation"

This should NOT look like something ordinary users configure.

Show the five attached resources as active system resources:

Core Simulation Instructions

People Library

Scenario Dynamics

Interaction Boundaries

Relational Consequences

Use small status indicators:

Active

When expanded, briefly explain:

"These expert-developed resources govern how people, relationships, scenario progression, consequences, and reflection behave across simulations."

Do not expose the full prompts in the ordinary interface.

This is important:

the product is not asking every educator to recreate the simulation logic.

--------------------------------------

4. DERIVE THE SCENARIO

--------------------------------------

When the user clicks BUILD SCENARIO DRAFT, move to a screen titled:

"Review the simulation Classroom Coach built"

The system should combine:

1. educator's stated teaching purpose

2. local context documents

3. Classroom Coach foundational resources

and display a STRUCTURED DRAFT.

The draft should contain these areas:

PURPOSE

Practice goal:

Respond to peer conflict while maintaining productive rehearsal.

Practicing role:

You are the ensemble director.

SETTING

7th-grade band

Mid-rehearsal

Small-group conflict has become public

SIMULATED PEOPLE

Classroom Coach should suggest people from the existing People Library rather than asking the educator to write full biographies.

Example:

Mia

7th-grade student

Source: People Library

Kayla

7th-grade student

Source: People Library

Grace

7th-grade student

Source: People Library

Each person should be clickable.

Inside a person detail drawer, show only the scenario-relevant information derived from the People Library:

Relevant tendencies

Relationships

Known tensions

Relevant interests/context

Information this person knows

Information currently hidden from the practicing teacher

Allow:

SWAP PERSON

This opens the existing People Library and allows selection of another simulated person.

Do NOT make "write a fictional student biography" the normal workflow.

Also allow future participant types:

Student

Parent / caregiver

Colleague

Administrator

Community member

For this prototype, student examples can be the most developed.

--------------------------------------

5. RELATIONSHIPS & TENSIONS

--------------------------------------

Show a simple visual or editable list:

Mia ↔ Kayla

Current tension: High

Mia ↔ Grace

Relationship: Supportive

Kayla ↔ Grace

Current tension: Emerging

Classroom Coach should derive these from existing profile information plus the requested situation.

Educators can adjust the situational relationship/tension for THIS simulation without changing the person's underlying profile.

Include:

Add situational relationship

--------------------------------------

6. WHAT IS KNOWN / HIDDEN

--------------------------------------

Include a simple section:

VISIBLE AT START

- Mia and Kayla are arguing publicly.

- The ensemble has stopped rehearsing.

- Grace appears uncomfortable.

LATENT / MAY EMERGE

- Grace has also been struggling with the entrance.

- The conflict began before today's rehearsal.

- Mia feels blamed for the section's problems.

The educator can:

move information between Visible and Latent

add an item

remove an item

Explain briefly:

"Latent information can emerge through interaction but should not be revealed before the situation makes it available."

--------------------------------------

7. SIMULATION CONDITIONS

--------------------------------------

Expose only meaningful educator-facing controls.

Use plain language.

Starting moment

Editable short text.

What should make this difficult?

Editable tags such as:

Peer conflict

Embarrassment

Competing instructional priorities

Uncertain information

Allow the educator to add/remove tags.

Interaction intensity:

Low / Moderate / High

Pacing:

Room to respond / Some urgency / High urgency

Allow relationships to improve:

On

Allow relationships to deteriorate:

On

Allow new complications to emerge:

On

Reflection focus:

Open text or short tags

Example:

Student dignity

Maintaining rehearsal purpose

Noticing hidden instructional problems

BOUNDARIES

Simple editable statements such as:

Do not diagnose students.

Do not reveal hidden information without an interactional reason.

Students should retain agency.

Avoid stereotyped behavior.

Do not force a single "correct" teacher response.

These should be DERIVED from the Classroom Coach foundation and normally left in place.

--------------------------------------

8. SOURCE / PROVENANCE UI

--------------------------------------

This is important to the research concept.

Where useful, display small source chips such as:

Derived from:

People Library

Scenario Dynamics

Local rehearsal plan.docx

Do NOT display chain-of-thought or hidden model reasoning.

The purpose is simply to show which authored resources contributed to a configuration decision.

Include a small:

"Why is this here?"

control that says something factual such as:

"Grace was selected because the People Library identifies an existing relationship with Mia and the requested scenario involves a peer conflict in this grade range."

Do not invent psychological explanations.

--------------------------------------

9. SAVE AS VERSION

--------------------------------------

At the bottom:

SAVE DRAFT

TEST SIMULATION

PUBLISH VERSION

When publishing:

Simulation:

Middle School Ensemble — Peer Conflict

Version:

v1.0

Show:

Created by

Date

Foundation version

Local context files

Store the simulation in localStorage for the prototype so it remains available when the page reloads.

Duplicating a simulation should create a new editable copy while retaining the original.

--------------------------------------

10. REHEARSAL ENVIRONMENT

--------------------------------------

Build a functional text-based rehearsal screen.

The practicing user should NOT see all of the hidden Design Lab information.

They see only what they would reasonably encounter in the situation.

Header:

7th Grade Band — Rehearsal

Small text:

You are the ensemble director.

Opening simulation:

[Mia, hurt]: "Can you stop telling everyone I'm the reason we sound bad?"

[Kayla, defensive]: "I said we keep restarting because you don't know your part."

[Grace, hesitant]: "You did kind of say it yesterday too."

→ Mia lowers her instrument. Kayla turns toward Grace. Several students have stopped playing.

What do you do next?

Provide a large natural-language text field.

No multiple-choice responses.

The user types what they would actually say or do.

The simulation should continue with short turns that follow the attached Classroom Coach rules:

- begin in the middle of action

- use concise age-appropriate dialogue

- preserve student relationships and previous interaction history

- allow multiple concerns at once

- show immediate interpersonal ripples

- allow both improvement and deterioration

- do not make outcomes overly tidy

- do not tell the user the correct response

- keep students active rather than passive

- avoid stereotypes

- consequences accumulate across turns

The existing Classroom Coach instructions emphasize short student voices, continuity, peer influence, emotional ambiguity, and immediate consequences. Preserve that character.

For the demo, make the interaction actually work.

IMPLEMENT TWO MODES:

AI MODE:

Create a single service abstraction called something like:

runSimulationTurn()

If an LLM/API integration is configured, send:

- core system instructions

- relevant profile/context excerpts

- published scenario specification

- current explicit simulation state

- interaction history

- new user action

and return:

- visible simulation response

- structured state update

DEMO MODE:

If no model/API is configured, automatically fall back to a deterministic local demo engine.

The demo engine should recognize broad patterns such as:

supportive/inquisitive

blaming/controlling

redirecting/neutral

and generate different next turns while maintaining a state object.

Do not expose those labels to the learner.

The prototype must still be demonstrable without an API key.

--------------------------------------

11. SIMULATION STATE

--------------------------------------

Internally maintain a simple explicit state object.

Examples:

active participants

unresolved events

participation changes

salient relationship changes

information revealed

information still latent

Do NOT show numerical psychological scores.

Do NOT create meters for "student happiness."

For demo/debug purposes, provide an instructor-only drawer:

"Current simulation state"

Example:

Unresolved:

Peer blame between Mia and Kayla

Revealed:

Grace is also having difficulty with the entrance

Relationship changes:

Mia → Teacher: cautiously more open

Kayla → Grace: more tense

This helps communicate that Classroom Coach preserves state rather than relying only on chat history.

--------------------------------------

12. FLAG A MOMENT

--------------------------------------

During rehearsal, place a small flag icon beside each system turn.

Clicking it should allow:

Flag this response

Reason:

Didn't fit the situation

Revealed information too early

Character felt inconsistent

Possible stereotype / unsupported assumption

Other

The simulation continues after flagging.

--------------------------------------

13. AFTER-ACTION REVIEW

--------------------------------------

When the user ends rehearsal, show:

AFTER-ACTION REVIEW

Timeline of:

Scenario opening

User actions

Student responses

Important state changes

Flags

Allow the user to select a consequential moment.

Show:

BEFORE

Relevant visible state

YOUR ACTION

What the practicing teacher said/did

WHAT HAPPENED

Student response

WHAT CHANGED

Observable / recorded state changes

Use the existing Classroom Coach reflective style:

brief

relational

specific

not a numerical grade

not a claim that there was one correct response

Include:

Strengths Observed

Growth Opportunities

Possible Next Rehearsal

Keep each very brief.

The current Classroom Coach foundation specifically emphasizes relational consequences rather than generic praise or advice.

--------------------------------------

14. ASSURANCE

--------------------------------------

Create a simple prototype Assurance page.

This does not need a complete testing backend yet.

For each published simulation show:

Run checks

Checks:

Continuity

Hidden-information boundaries

Scenario facts

Unsupported/stereotyped inference

Required provenance

Core workflow

Show realistic:

Pass

Needs Review

Clicking a result should show which scenario condition was being checked.

Do not use fake percentages or vague "AI safety scores."

--------------------------------------

15. DIFFERENT USER ROLES

--------------------------------------

Include a simple role switcher for prototype demonstration:

DESIGNER / EDUCATOR

Can create, configure, test, publish, assign, review, and revise simulations.

LEARNER

Can launch assigned rehearsals, interact, flag outputs, and view the permitted After-Action Review.

ADMIN / RESEARCH

Can inspect versions, sessions, structured event records, flags, and export demo data.

Do not overbuild permissions yet. The role switcher is primarily to demonstrate the product architecture.

--------------------------------------

16. FUNCTIONAL REQUIREMENTS

--------------------------------------

This should be a CLICKABLE, WORKING PROTOTYPE rather than static storyboard screens.

Required:

- navigation works

- simulation library works

- create simulation works

- local-context document upload works

- DOCX text extraction works

- selected files persist during the authoring session

- Build Scenario Draft produces the structured review screen

- people can be swapped from a seeded People Library

- situational relationships can be edited

- visible/latent information can be moved

- simulation controls can be edited

- simulations save to localStorage

- versions can be published

- published scenarios launch in Rehearsal

- user can type free responses

- demo engine produces different consequential responses

- state persists across turns

- moments can be flagged

- ending a rehearsal creates an After-Action Review

- Reset works

Seed enough real Classroom Coach content from the attached documents to make the demo credible.

Do not attempt to import all 62 profiles into the visible interface for v1. Seed approximately 8–12 representative profiles from the attached People Library, preserving the actual relationships and grade-specific information in the source.

--------------------------------------

17. MOST IMPORTANT PRODUCT PRINCIPLE

--------------------------------------

The educator should feel:

"I tell Classroom Coach what I need someone to practice and give it the context it needs. Classroom Coach already knows how to construct and run a simulation. I review and govern the important decisions."

NOT:

"I have to learn prompt engineering and program three fake students."

The prototype should make the distinction between:

EXPERT-DESIGNED FOUNDATION

and

EDUCATOR-CONTROLLED SITUATION

immediately understandable.

Keep the interface direct, restrained, and usable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://classroomcoach.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac536ca2-770d-4c62-a297-97e436a35ffc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
