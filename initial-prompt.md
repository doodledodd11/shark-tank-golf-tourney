You are acting as a senior full-stack engineer working inside VS Code. I want you to help me design and build a polished website for a private/local golf tournament.

The tournament is inspired by the 2025 Internet Invitational and is primarily being organized for members of a local poker club.

## Your role

Take ownership of the project as a coding agent.

You should:

* Inspect the existing project before making changes.
* Recommend a sensible architecture.
* Build the application incrementally.
* Keep the code clean and easy for another developer to understand.
* Run the application and test your work after meaningful changes.
* Fix errors you encounter rather than simply describing them.
* Prefer simple, maintainable solutions over unnecessary complexity.
* Make reasonable design decisions without stopping for confirmation unless a decision would fundamentally change the project.
* Keep a running README explaining setup, development, data management, and deployment.
* Make the site responsive for phones, tablets, and desktop browsers.

The finished website should feel like a legitimate amateur golf event website rather than a generic CRUD application.

---

# Tournament concept

The event begins with **32 golfers**.

Players are divided into **four skill tiers**, with 8 golfers in each tier.

There are **no handicap strokes during matches**. The tiered draft system is intended to keep teams balanced.

Tournament progression:

**32 Players → 16 Players → 8 Players → Final 8 Championship**

Players eliminated in a round remain visible historically but should clearly be marked eliminated.

---

# Round 1 — 32 to 16

Two captains draft:

* Team A — 16 players
* Team B — 16 players

Each team receives:

* 4 Tier 1 players
* 4 Tier 2 players
* 4 Tier 3 players
* 4 Tier 4 players

After the draft, each team privately determines eight 2-player pairings.

Matchmaking alternates.

Example:

1. Team A announces Pair A1.
2. Team B chooses one of its locked pairs to play against A1.
3. Team B announces Pair B2.
4. Team A chooses a pair to play against B2.
5. Continue alternating until all eight matches are determined.

There are eight 2v2 matches.

Each match is worth **3 total points**:

* Front 9 — 2-man Scramble — 1 point
* Back 9 — 2-man Shamble — 1 point
* Overall 18-hole result — 1 point

The team with the most total points advances.

The losing 16 players are eliminated.

If the overall team competition ends tied, the two captains play a straight-up playoff.

---

# Round 2 — 16 to 8

The remaining 16 players are completely redrafted.

New teams:

* Team A — 8 players
* Team B — 8 players

Each team gets:

* 2 Tier 1 players
* 2 Tier 2 players
* 2 Tier 3 players
* 2 Tier 4 players

Teams again build locked 2-player pairings.

The same alternating matchmaking procedure is used.

There are four 2v2 matches.

Each is worth 3 points:

* Front 9 — Best Ball — 1 point
* Back 9 — Alternate Shot — 1 point
* Overall 18-hole result — 1 point

Winning eight advance.

Losing eight are eliminated.

A tied overall team competition is again settled by a captain-vs-captain playoff.

---

# Final 8 Championship

The remaining eight golfers are redrafted into:

* Team A — 4 players
* Team B — 4 players

Each team receives one player from each original skill tier.

The championship consists of approximately **36 holes**.

First 18:

* Two 2v2 team matches

Second 18:

* Four 1v1 singles matches

The exact championship point structure may evolve, so build the data model and UI in a way that allows formats and point values to be edited rather than hardcoding everything.

If the championship ends tied, the current planned tiebreaker is:

**4v4 sudden-death scramble**

The four golfers on the winning championship team split the tournament prize pool.

---

# Website goals

This is primarily a public-facing tournament website.

Players do **not** need personal accounts.

Everyone should be able to access the site through the URL.

I am the tournament administrator and will make updates when:

* players register;
* skill tiers are assigned;
* captains are selected;
* drafts occur;
* teams are created;
* 2-man pairs are created;
* matchups are determined;
* matches are completed;
* points are earned;
* players are eliminated;
* players advance;
* championship teams are selected;
* prize pool changes;
* courses are added or removed.

Do not build a complicated user-management system.

However, I do want a simple administrator editing experience.

A **single administrator password / admin mode** is acceptable if needed.

Do not require every player to create an account.

---

# Core pages

## 1. Home / Tournament Overview

Create a visually impressive landing page.

It should immediately explain what the tournament is.

Include:

### Hero section

Tournament name.

Use a working title such as:

**Poker Club Golf Invitational**

but keep the tournament name editable through configuration.

Possible subtitle:

**32 Players. Four Tiers. Draft Your Team. Win Your Matches. Survive.**

Include a golf-oriented hero design.

Use a premium visual style inspired by:

* golf majors;
* Ryder Cup;
* modern sports broadcasts;
* tasteful poker-club styling.

Do not make it look like a casino website.

Use poker references subtly.

Potential palette:

* dark green;
* black;
* cream/white;
* gold accents.

---

### Tournament progression

Visually display:

**32**

↓

**16**

↓

**8**

↓

**Final 8**

↓

**4 Champions**

Make this one of the strongest visual components on the homepage.

---

### Prize pool

Have a prominent live Prize Pool component.

Examples:

**Current Prize Pool**

**$4,800**

Underneath, optionally show:

* entry fee;
* number of paid players;
* championship split;
* amount per winning player.

All values must be editable by the administrator.

Do not hardcode a specific entry fee because that has not been finalized.

---

### How the tournament works

Explain:

1. Players are divided into four skill tiers.
2. Captains draft balanced teams.
3. Teams privately build 2-man pairings.
4. Captains strategically match pairs against one another.
5. Golf matches are played straight up.
6. The losing half of the field is eliminated.
7. Survivors are redrafted.
8. Final 8 compete in a 4v4 championship.

---

### Match formats

Show attractive format cards for:

* Scramble
* Shamble
* Best Ball
* Alternate Shot
* Singles Match Play

Include short explanations.

For Shamble:

> Both players tee off. The team selects its preferred tee shot. Both players then play their own balls from that location through the completion of the hole. The lower score between the two players is the team's score.

---

### Current tournament status

Examples:

**Registration**

**Round 1 Draft**

**Round 1 In Progress**

**Round 2 Draft**

**Round 2 In Progress**

**Championship**

**Tournament Complete**

Make tournament status editable from the admin area.

---

### Upcoming / recent matches

Show a compact section with:

* players;
* teams;
* course;
* scheduled date;
* current status;
* result if complete.

---

# 2. Players & Tournament Page

Create a dedicated page such as:

`/players`

This should be one of the most important pages.

It should show the tournament by **round**, rather than displaying only one static player list.

Use tabs, segmented navigation, or sections for:

* Full Field / Registration
* Round 1
* Round 2
* Championship
* Results

---

## Full Field

Display all 32 players.

Each player should have:

* Name
* Original skill tier
* Current status
* Current team
* Current partner if applicable
* Captain designation if applicable
* Eliminated / Active / Champion status

Optional:

* photo/avatar;
* hometown;
* handicap index for informational purposes only.

Handicap information must **not** be used to calculate match strokes.

---

## Round 1 section

Show:

### Team A

Captain

16-player roster

Players grouped by tier if useful.

### Team B

Captain

16-player roster.

Then show the eight pairings/matches.

Example card:

**Match 1**

Team A
John Smith + Mike Jones

vs.

Team B
Chris Davis + Steve Miller

Course: TBD

Status: Scheduled

Front 9 — Scramble
Team A 1 | Team B 0

Back 9 — Shamble
Team A 0 | Team B 1

Overall
Team A 1 | Team B 0

Match Total
**Team A 2 — Team B 1**

Allow matches to have statuses:

* Pairing Pending
* Course Selection
* Scheduled
* In Progress
* Complete

At the top of the section show the overall Round 1 team score.

Example:

**TEAM A 13.5 — 10.5 TEAM B**

Make it visually prominent.

---

## Round 2

Same concept, but:

* eight-player teams;
* four 2v2 matches;
* Best Ball;
* Alternate Shot;
* overall point.

---

## Championship

Show the final two four-player teams prominently.

Include:

### Championship Round 1

Two 2v2 matches.

### Championship Round 2

Four 1v1 matches.

Show total championship points.

If a playoff occurs, display:

**Championship Playoff**

4v4 Sudden Death Scramble

with the winning team.

---

## Eliminated players

Do not delete players.

Instead visually distinguish them.

Examples:

* grayscale;
* reduced opacity;
* "Eliminated Round 1";
* "Eliminated Round 2".

Their tournament history should remain visible.

The eventual four champions should receive a strong visual treatment.

---

# 3. Course Selection / Match Setup Page

Create a page such as:

`/courses`

or

`/match-setup`

This page should help four players agree on which golf course to play.

---

## Approved course list

At the top show:

**Approved Tournament Courses**

Each approved course can contain:

* Course name
* City
* Approximate location
* Website URL
* Typical price range
* Notes
* Optional course image
* Active / inactive status

I should be able to add, edit, deactivate, and remove approved courses through admin mode.

---

# Course selection tool

For each scheduled 2v2 match, allow the four players to enter/select their preferred course.

Example:

### Match 3 Course Selection

Players:

* John
* Mike
* Chris
* Steve

Show four inputs:

**John's choice**

[ Select approved course ]

**Mike's choice**

[ Select approved course ]

**Chris's choice**

[ Select approved course ]

**Steve's choice**

[ Select approved course ]

Choices should come only from the approved course list.

---

## Random Course button

Add a prominent button:

**Randomize Course**

When clicked:

1. Gather the four submitted selections.
2. Randomly choose one of the selections.
3. Display the selected course dramatically.
4. Allow the selection to be saved as the official course for that match.

If two or more players choose the same course, their duplicate selections should count as additional entries in the random draw.

Example:

John → Course A
Mike → Course A
Steve → Course B
Chris → Course C

Random selection pool:

Course A
Course A
Course B
Course C

Therefore Course A has a 50% chance.

This behavior is intentional.

Show the selections before randomization so the process feels transparent.

Optional animation is welcome, but reliability is more important.

---

# 4. Matches Page

Although much of the match data appears on the Players page, I also want a dedicated match-focused view.

Route:

`/matches`

Display:

### Upcoming

### In Progress

### Completed

For each match show:

* Round
* Team names
* Four players
* Course
* Date
* Match formats
* Score
* Match points
* Status

Allow filtering by:

* Round
* Team
* Player
* Status

---

# Live scoring

We are considering using **Golf GameBook** for players to record scores and allow everyone else to follow matches live.

Do not attempt to recreate Golf GameBook's complete scoring engine right now.

Instead architect the site so each match can store:

* Golf GameBook event URL
* Golf GameBook leaderboard URL
* Optional external scoring URL

When a live scoring URL exists, show a button such as:

**FOLLOW MATCH LIVE**

Open the link in a new tab.

The website should remain the official source for:

* tournament teams;
* advancement;
* tournament points;
* eliminations;
* draft results;
* final results.

---

# Admin editing

I need an easy way to manage tournament data.

Players should not need accounts.

Create a simple Admin area.

Possible route:

`/admin`

Protect it with a single administrator password stored securely in an environment variable.

Do not expose the password in frontend JavaScript or source control.

Admin should be able to edit:

## Tournament

* Tournament name
* Description
* Status
* Prize pool
* Entry fee
* Dates
* Round deadlines

## Players

* Add
* Edit
* Remove before tournament begins
* Assign tier
* Set captain
* Mark active/eliminated/champion

## Teams

* Create
* Rename
* Assign players
* Assign captains

## Pairings

* Assign players to 2-man teams
* Change pairings
* Lock pairings

## Matches

* Set opponents
* Set format
* Set course
* Set scheduled date
* Add Golf GameBook URL
* Update scores
* Award front-nine point
* Award back-nine point
* Award overall point
* Mark complete

## Rounds

* Activate round
* Complete round
* Advance winning players
* Record eliminated players

## Courses

* Add
* Edit
* Activate/deactivate
* Delete

Avoid requiring me to manually edit source-code files every time tournament information changes.

---

# Data model

Design a sensible relational data model.

Likely entities include:

### Tournament

* id
* name
* season/year
* status
* description
* prizePool
* entryFee
* registrationStatus

### Player

* id
* name
* tier
* handicapIndex optional
* avatar optional
* active
* champion
* eliminatedRound

### Round

* id
* number
* name
* status
* startDate
* deadline

### Team

* id
* roundId
* name
* captainPlayerId

### TeamMembership

* teamId
* playerId

Do not permanently attach players to a team because players are redrafted every round.

### Pairing

* id
* roundId
* teamId
* player1Id
* player2Id
* locked

### Match

* id
* roundId
* pairingAId
* pairingBId
* courseId
* scheduledDate
* status
* externalScoringUrl

### MatchSegment

Allow scoring components to be flexible.

Fields might include:

* id
* matchId
* name
* format
* holes
* pointsAvailable
* winner
* teamAScore
* teamBScore

This flexibility is important because tournament formats could change in future years.

### Course

* id
* name
* city
* state
* website
* estimatedPrice
* notes
* approved
* active

### CourseVote / Selection

* id
* matchId
* playerId
* courseId

---

# Technology

Choose a modern stack that works well inside VS Code.

Preferred starting direction:

* Next.js
* TypeScript
* React
* Tailwind CSS
* component library if useful
* relational database
* Prisma or another straightforward ORM

For persistent production data, choose an option that is simple and inexpensive to deploy.

Good options could include:

* Supabase Postgres
* Neon Postgres

Do **not** use a production architecture where tournament edits disappear after deployment or server restarts.

If using Supabase, players still do not need Supabase accounts.

Only server-side/admin functionality should write to the database.

Explain your database choice in the README.

---

# Local development

The project must be easy to run locally.

Provide commands such as:

```bash
npm install
npm run dev
```

Use a `.env.example`.

Never commit secrets.

Include database migration and seed instructions.

---

# Seed data

Create development seed data for all 32 players.

Use placeholder names such as:

Tier 1:

* Player 01
* Player 02
* ...
* Player 08

Tier 2:

* Player 09
* ...
* Player 16

Tier 3:

* Player 17
* ...
* Player 24

Tier 4:

* Player 25
* ...
* Player 32

Also create:

* sample Round 1 teams;
* sample pairings;
* several approved golf courses;
* sample scheduled matches;
* example completed scoring.

This should make the site look populated immediately during development.

---

# Design requirements

The application should look like a sports tournament website.

Avoid the generic SaaS/dashboard appearance on public pages.

Use:

* strong typography;
* large scores;
* tournament brackets/progression;
* team cards;
* golf imagery where appropriate;
* dark green;
* subtle black;
* cream;
* gold highlights.

Public pages should be visually exciting.

Admin pages can prioritize usability.

Responsive design is required.

Most players will likely view the website from their phones.

---

# Navigation

Desktop navigation:

**Home | Players | Matches | Course Selection | Rules**

Admin should be visually separate.

Mobile navigation should remain easy to use.

---

# Rules page

Also create:

`/rules`

Include the complete tournament structure and explanations.

Sections:

* Tournament concept
* Skill tiers
* Draft rules
* Strategy phase
* Pair construction
* Alternating matchmaking
* Round 1
* Round 2
* Championship
* Match formats
* Three-point scoring
* Tiebreakers
* Course selection
* Scheduling
* Live scoring
* Prize pool

Build this from reusable data/configuration where practical rather than duplicating tournament rules everywhere.

---

# Important architectural requirement

Do not hardcode the site so tightly around this year's tournament that it has to be rebuilt next year.

The architecture should allow us eventually to run:

**2026 Poker Club Golf Invitational**

and later:

**2027 Poker Club Golf Invitational**

with historical results retained.

We do not need a full multi-tournament UI immediately, but the database design should allow a Tournament ID to own:

* players;
* rounds;
* teams;
* matches;
* prize pool;
* courses/selections;
* results.

---

# Development phases

Work in phases.

## Phase 1 — Foundation

* Initialize project.
* Configure TypeScript.
* Configure styling.
* Build site shell/navigation.
* Create database schema.
* Create seed data.
* Write README.

Verify the app runs.

---

## Phase 2 — Public site

Build:

* Home
* Players
* Matches
* Rules
* Course Selection

Use seed data.

Verify responsive behavior.

---

## Phase 3 — Tournament logic

Implement:

* rounds;
* teams;
* team memberships;
* pairings;
* matches;
* scoring;
* advancement status;
* elimination status;
* prize pool.

---

## Phase 4 — Course picker

Implement:

* approved courses;
* player selections;
* randomized weighted selection;
* save chosen course.

Write tests specifically for the randomization logic.

Example unit test:

Selections:

* Course A
* Course A
* Course B
* Course C

The random pool should contain four entries, not three unique courses.

---

## Phase 5 — Admin tools

Build simple administrator editing functionality.

Prioritize:

1. Player management
2. Team drafting
3. Pairing creation
4. Match assignment
5. Score/result editing
6. Advancement/elimination
7. Course management
8. Prize pool

---

## Phase 6 — Polish

Add:

* animations;
* loading states;
* empty states;
* mobile optimization;
* tournament status indicators;
* champion presentation;
* live score links.

Do not sacrifice reliability for visual effects.

---

# Testing

Add appropriate tests for important tournament logic.

At minimum test:

* team membership is round-specific;
* players can be redrafted;
* eliminated players remain in history;
* pairings belong to the correct team/round;
* match points total correctly;
* ties can be represented;
* course randomizer weights duplicate selections properly;
* championship status works;
* prize calculations do not break with missing values.

---

# First task

Start by:

1. Inspecting the current directory.
2. Determining whether a project already exists.
3. If necessary, initialize the application.
4. Propose the architecture in the README.
5. Create the initial data model.
6. Seed a mock 32-player tournament.
7. Build the main navigation and homepage.
8. Run the project locally and resolve any errors.
9. Then proceed through the phases above.

Do not merely give me sample code in chat.

You are acting as the coding agent inside the repository. Create and modify the actual project files, run commands, test the application, and continue until a functional first version is running.

When making significant architecture choices, document the reasoning in the README so I can understand and maintain the project later.
