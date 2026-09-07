# HealthMitra – Software Design (Digital Assignment 2)

This folder holds the design deliverables for Review 2. The full write-up is the
[Software Design Document (PDF)](HealthMitra-Software-Design-Document.pdf).

## Diagrams (Draw.io sources + PNG exports)

| Diagram | Editable source | PNG |
| --- | --- | --- |
| High-level architecture (layered client-server) | [01-high-level-architecture.drawio](diagrams/01-high-level-architecture.drawio) | [png](diagrams/01-high-level-architecture.png) |
| Server modules and allowed dependencies | [02-server-modules.drawio](diagrams/02-server-modules.drawio) | [png](diagrams/02-server-modules.png) |
| Client component structure | [03-client-components.drawio](diagrams/03-client-components.drawio) | [png](diagrams/03-client-components.png) |
| Sequence: reminder → missed dose → caregiver alert | [04-sequence-missed-dose.drawio](diagrams/04-sequence-missed-dose.drawio) | [png](diagrams/04-sequence-missed-dose.png) |
| Data model (ER) | [05-data-model.drawio](diagrams/05-data-model.drawio) | [png](diagrams/05-data-model.png) |

Open any `.drawio` file at [app.diagrams.net](https://app.diagrams.net) (File → Open from → Device).
The DA1 diagram is kept for comparison at [`../architecture/`](../architecture/).

## User interface (six screens, v2 high-fidelity)

Screens captured from the running application (`docs/design/ui/`):

| # | Screen | File |
| --- | --- | --- |
| 1 | Sign in / demo roles | [01-sign-in.png](ui/01-sign-in.png) |
| 2 | Patient – today's medicines (reminder, tap/voice confirm) | [02-patient-today.png](ui/02-patient-today.png) |
| 3 | Patient – emergency SOS confirmation | [03-patient-sos.png](ui/03-patient-sos.png) |
| 4 | Patient – symptom checker with disclaimer | [04-patient-symptoms.png](ui/04-patient-symptoms.png) |
| 5 | Caregiver – adherence dashboard | [05-caregiver-dashboard.png](ui/05-caregiver-dashboard.png) |
| 6 | Caregiver – care updates and SOS follow-up | [06-caregiver-alerts.png](ui/06-caregiver-alerts.png) |
| + | Mobile layout (bottom navigation) | [07-mobile-caregiver.png](ui/07-mobile-caregiver.png) |

Figma prototype: **TODO – paste share link here** (import `../wireframes/healthmitra-wireframes.svg`
for the DA1 low-fi board and the PNGs above as the v2 page).

## Main design choices (summary)

1. **Layered client-server** – React SPA → Express REST API → data layer, with a
   server-side cron scheduler so reminders and missed-dose alerts never depend on
   the patient's browser being open.
2. **Async repository seam** (`server/src/data/repository.js`) – the prototype runs
   on a seeded in-memory store, and a PostgreSQL implementation with the same
   method names drops in without touching services or routes.
3. **Notification channels** (`server/src/notifications/channels.js`) – alerts are
   recorded in-app and fanned out to every linked caregiver through a
   `{ name, deliver() }` interface; FCM/SMS are additive.
4. **Centralised access rules** (`services/accessService.js`) – owner / edit / view
   decided in one place; every protected route calls `assertCanView` or `assertCanEdit`.
5. **Feature folders + context registries on the client** – each screen lives in
   `client/src/features/<name>/`, reads shared state via `useWorkspace()` /
   `useSession()`, and is wired through `workspace/screens.js` and `ModalHost.jsx`
   (adding a screen or dialog is one file plus one line).
