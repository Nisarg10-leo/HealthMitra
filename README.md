# HealthMitra

> A voice-friendly health companion that helps elderly patients stay on top of their medicines while keeping remote family caregivers calmly informed.

HealthMitra is an academic full-stack prototype built for **Digital Assignment 1**. It focuses on low-friction medication adherence, timely caregiver awareness, and an accessible experience for elderly users.

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Patient | `meera@demo.health` | `demo123` |
| Caregiver | `arjun@demo.health` | `demo123` |

## Quick Start - Local Development

### Option 1: Run with Docker (recommended)

1. Install and start Docker Desktop.
2. From the repository root, run:

   ```bash
   docker compose up --build
   ```

3. Open [http://localhost:5173](http://localhost:5173). The API is available at [http://localhost:4000/api/health](http://localhost:4000/api/health).
4. Stop the stack with `docker compose down`. Add `-v` only when you intentionally want to remove the local Postgres volume.

### Option 2: Run without Docker

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The root dev command starts the Express API and the Vite client together.

```bash
npm run build
npm run start
```

`npm run build` produces a production client bundle. `npm run start` starts only the API.

## Vision document

### Project name and overview

**HealthMitra** is a React, Express, and PostgreSQL-ready companion application for elderly people managing daily medication and the family caregivers who support them from a distance. The patient experience uses large, clear controls, English/Hindi localization, and tap/voice confirmation. The caregiver experience provides adherence status, history, missed-dose alerts, SOS follow-up, and schedule editing when permission is granted.

### Problem it solves

People managing chronic conditions can miss doses, take medicines inconsistently, or struggle with typical reminder interfaces. Their adult children or other family caregivers often cannot check in every day and receive no meaningful signal when a reminder is ignored. A reminder alone does not close the loop.

HealthMitra creates that loop: it schedules a reminder, records a tap or voice response, flags a missed dose after a configurable window, and alerts linked caregivers. A prominent SOS path adds a fast way to request help and share available device location.

### Target users (personas)

**Meera - Patient (62):** Manages diabetes and hypertension medicines, is comfortable with a smartphone but dislikes typing, and wants to remain independent. She needs clear reminders, an easy way to confirm a dose, bilingual content, and a single obvious emergency action.

**Arjun - Caregiver (34):** Meera's working adult son who lives separately. He wants passive confidence rather than repeated check-in calls, immediate context when a dose is missed or SOS is triggered, and permission-aware remote schedule management.

### Vision statement

HealthMitra helps elderly people manage their daily health routine independently while keeping their family caregivers genuinely connected to day-to-day wellbeing - without either person needing to make a phone call for every update.

### Key features and goals

- Patient/caregiver authentication with linked, role-aware accounts.
- Medication CRUD with dosage, multiple daily times, and start/end dates.
- Server-side cron scheduler that logs reminders and flags non-responses as missed after 15 minutes.
- Tap and browser voice confirmation, with a Groq Whisper-ready intent API seam.
- Caregiver dashboard with 7-day adherence, dose history, alerts, streaks, and linked-patient switching.
- Always-available SOS with optional browser location and acknowledgement/resolution tracking.
- Rule-based symptom guidance for five minor common symptoms only, with a persistent medical disclaimer.
- English and Hindi interface/voice-prompt support through i18next.
- Manually curated doctor and pharmacy contacts with tap-to-call links.

### Success metrics

| Goal | Metric |
| --- | --- |
| Improve medication adherence | Percentage of scheduled doses confirmed on time |
| Fast caregiver awareness | Missed-dose-to-alert time under 5 minutes (prototype scheduler checks every minute) |
| Low-friction interaction | Average dose confirmation under 10 seconds |
| Reliable emergency response | SOS-to-caregiver notification under 30 seconds in the prototype |
| Adoption | Active linked patient-caregiver pairs per week |

### Assumptions and constraints

- This is a 10-day academic prototype using seeded, in-memory demo data while retaining a PostgreSQL schema and Docker service for the production data layer.
- Notification delivery is represented by a durable in-app notification log and a replaceable push adapter; real FCM/SMS credentials are not committed.
- Voice capture uses the browser Speech Recognition API in the demo. The `/api/voice/intent` endpoint is the integration boundary for Groq Whisper transcription.
- Symptom advice is a static, curated lookup for minor symptoms only. It does not diagnose conditions or provide prescription-strength guidance.
- No telemedicine, inventory lookups, wearable integration, billing, or live medical advice is included.

## MoSCoW prioritisation

| Priority | Scope |
| --- | --- |
| **Must have** | Auth and account linking, medication CRUD, scheduled reminders, tap/voice confirmation, missed-dose caregiver alerts, caregiver dashboard, SOS with location, English/Hindi support |
| **Should have** | Rule-based symptom checker, adherence chart/streaks, multiple caregivers per patient |
| **Could have** | Doctor directory, pharmacy contact list, caregiver remote medication edits, voice-triggered SOS foundation |
| **Won't have (this phase)** | Telemedicine, live pharmacy inventory, dosage-by-weight/age logic, pregnancy/child symptom advice, wearables, billing |

The full feature-to-story breakdown is in [docs/github/user-stories.md](docs/github/user-stories.md).

## Architecture

The one-page architecture diagram is available as an editable Draw.io file and SVG preview:

- [Draw.io architecture diagram](docs/architecture/healthmitra-architecture.drawio)
- [Architecture preview](docs/architecture/healthmitra-architecture.svg)

```text
React + Vite + i18next
         |
         v
Express REST API + node-cron + notification adapter
         |
         v
PostgreSQL schema / prototype memory adapter
         |
         v
Docker Compose -> local development -> Render/Railway + Vercel/Netlify deployment
```

## Figma wireframes (six screens)

The six-screen wireframe board is an editable SVG designed for direct import to a free Figma account:

- [Wireframe board](docs/wireframes/healthmitra-wireframes.svg)
- [Figma import guide](docs/wireframes/README.md)

The six required screens are:

1. Sign in / select a demo role
2. Patient: today's medicine confirmations
3. Patient: emergency SOS confirmation
4. Patient: symptom checker
5. Caregiver: adherence dashboard
6. Caregiver: alerts and SOS follow-up

## User stories and GitHub Project setup

There are **25 prioritised, acceptance-criteria-ready user stories** in [docs/github/user-stories.md](docs/github/user-stories.md). The repository also contains:

- [GitHub Issue template](.github/ISSUE_TEMPLATE/user-story.md)
- [Issue-creation helper](docs/github/create-issues.sh)
- [Project setup guide](docs/github/README.md)

To publish them to a GitHub repository after creating/pushing your remote, install the GitHub CLI, authenticate, then run:

```bash
bash docs/github/create-issues.sh OWNER/REPOSITORY
```

Create a **Table** or **Board** GitHub Project named `HealthMitra - Digital Assignment 1`, add the 25 generated issues, and group them by the `priority:must`, `priority:should`, `priority:could`, and `priority:wont` labels.

## Folder structure

```text
.
├── client/                    # React + Vite + i18next accessible web client
│   ├── src/App.jsx            # Patient and caregiver experiences
│   ├── src/i18n.js            # English/Hindi copy
│   └── src/styles.css          # Responsive, high-contrast interface
├── server/
│   ├── src/index.js           # Express REST API and cron scheduler
│   ├── src/store.js           # Prototype data adapter and seeded demo data
│   └── sql/schema.sql         # PostgreSQL production data model
├── docs/
│   ├── architecture/          # Draw.io diagram + preview
│   ├── wireframes/            # Figma-importable six-screen board
│   ├── github/                # 25 stories and publishing guide
│   └── evidence/              # Screenshot checklist and capture notes
├── docker-compose.yml         # Client + API + PostgreSQL local stack
└── README.md
```

## Branching strategy

This repository follows **GitHub Flow**:

1. `main` is kept releasable.
2. Each self-contained change starts from `main` as `feature/<short-description>`.
3. Commit focused changes, open a pull request, review it, and merge only when checks pass.
4. Delete the merged feature branch.

For this assignment, create/push `feature/healthmitra-assignment` before merging the completed work into `main`. This keeps the required feature-branch screenshot honest and easy to explain.

## Local development tools

| Tool | Purpose |
| --- | --- |
| VS Code / Codex | Development and code review |
| Git + GitHub | Version control, Issues, Project board, and pull requests |
| Node.js + npm | Client and API package/runtime management |
| React + Vite | Responsive frontend build toolchain |
| Express + node-cron | REST API and reliable server-side reminder checks |
| PostgreSQL 16 | Production-ready relational data model |
| Docker Desktop + Docker Compose | Reproducible three-service local stack |
| Figma (free) | Importable six-screen wireframe board |
| Draw.io | Editable architecture diagram |

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me` |
| Linking | `GET /api/patients`, `POST /api/patients/:id/link-caregiver`, `POST /api/links/join` |
| Medication | `GET/POST /api/medications`, `PUT/DELETE /api/medications/:id` |
| Adherence | `GET /api/dashboard`, `GET /api/dose-logs`, `POST /api/dose-logs/:id/confirm` |
| Alerts/SOS | `GET /api/alerts`, `POST /api/alerts/:id/read`, `POST/GET /api/sos`, `PUT /api/sos/:id` |
| Support | `GET/POST /api/doctors`, `GET/POST /api/chemists`, `GET /api/symptom-suggestions`, `POST /api/voice/intent` |

All protected endpoints require the current demo session header. The client applies it automatically. The backend rejects missing or unrelated users and checks linked caregiver permissions before reading or changing a patient's data.

## Safety and privacy

HealthMitra is a medication-adherence prototype, not a medical diagnosis or emergency dispatch service. The symptom checker never generates medical advice and always routes severe/unlisted symptoms to a doctor. Patient information is only available to the patient and explicitly linked caregivers in the prototype access model.

## Submission evidence checklist

Use [docs/evidence/README.md](docs/evidence/README.md) before submitting. It lists the exact screenshots required by the brief: repository/branch, Docker terminal, browser on localhost, Figma board, Draw.io diagram, and GitHub Project with 25 issues.
