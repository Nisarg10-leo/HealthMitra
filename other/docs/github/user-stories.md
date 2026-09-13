# HealthMitra user stories

Use each row below as one GitHub Issue. Apply the listed priority label and add every issue to the `HealthMitra - Digital Assignment 1` GitHub Project.

| # | Priority | Issue title | User story | Acceptance criteria |
| --- | --- | --- | --- | --- |
| 1 | Must | Register as a patient | As an elderly patient, I want to create a patient account with my name, phone/email, and password so that my medicine plan is private. | Registration requires name, email, password, and patient role; duplicate emails are rejected; the password is not returned by the API. |
| 2 | Must | Register as a caregiver | As a family caregiver, I want to create a caregiver account so that I can support a linked patient. | Registration offers caregiver role; successful sign-up opens a caregiver session; unrelated patient data is unavailable. |
| 3 | Must | Link a caregiver by email | As a patient, I want to link an existing caregiver by email and set view/edit permission so that my family can help appropriately. | Only the patient can create the link; invalid caregiver emails fail safely; permission is stored as view or edit. |
| 4 | Must | Join a patient plan using an invite code | As a caregiver, I want to join a patient's plan with an invite code so that linking is simple for families. | Valid codes add the caregiver once; invalid codes show a clear error; the new caregiver receives view access by default. |
| 5 | Must | Protect patient data with role-aware access | As a patient, I want only myself and explicitly linked caregivers to access my information so that my health data stays private. | Protected APIs reject unsigned users; unrelated accounts receive no medication, contacts, SOS, or dashboard data; view caregivers cannot edit schedules. |
| 6 | Must | Add a medication | As a patient, I want to add a medicine with dosage and one or more daily times so that reminders match my prescription. | Name, dosage, and valid `HH:MM` times are required; start/end dates are accepted; the medicine appears on the schedule. |
| 7 | Must | Edit a medication | As a patient or edit-enabled caregiver, I want to update a medication's dose, times, color, and dates so that the schedule stays accurate. | Only owner/edit access can update; invalid times/dates are rejected; frequency is recalculated from the time list. |
| 8 | Must | Remove a medication | As a patient or edit-enabled caregiver, I want to remove an obsolete medicine so that I do not receive incorrect reminders. | Removal asks for confirmation in the client; API checks edit permission; deleted medicine no longer appears in the active schedule. |
| 9 | Must | Create due-dose records server-side | As a patient, I want the system to create scheduled dose records even when my browser is closed so that reminders are reliable. | The server creates today's logs from active medication times; logs include pending/taken/skipped/missed state; scheduler runs every minute. |
| 10 | Must | Receive a medication reminder | As a patient, I want a clear reminder with my medicine name and dosage when it is due so that I can act promptly. | Scheduler creates an in-app notification; reminder identifies medicine and dosage; notification adapter is replaceable with real push delivery. |
| 11 | Must | Confirm a dose by tapping | As a patient, I want large Taken and Skipped buttons so that I can confirm a dose with minimal typing. | Pending doses show both actions; confirmation records timestamp and tap method; an already resolved dose cannot be confirmed again. |
| 12 | Must | Confirm a dose by voice | As a patient, I want to say that I took or skipped a dose so that confirmation is easier for me. | Client listens in English/Hindi; intent endpoint recognises yes/taken and no/skip; saved dose log records `voice` response method. |
| 13 | Must | Alert caregivers about a missed dose | As a caregiver, I want an automatic alert when a patient does not respond in time so that I can check in quickly. | Pending doses become missed after the configured 15-minute window; alert and notification are created once; linked caregivers can view them. |
| 14 | Must | View today's caregiver dashboard | As a caregiver, I want a simple dashboard for a linked patient so that I understand today's medication status at a glance. | Dashboard shows adherence percentage, taken/total count, open alerts, streak, 7-day chart, and today's schedule. |
| 15 | Must | Trigger emergency SOS with location | As a patient, I want a large SOS button that shares my available location with all linked caregivers so that I can quickly ask for help. | Patient-only SOS action captures browser coordinates when available; event is logged; linked caregivers receive a high-priority alert with map link when available. |
| 16 | Must | Resolve an SOS event | As a caregiver, I want to acknowledge and resolve SOS events so that the family knows an emergency is being handled. | SOS events start active; linked users can mark acknowledged/resolved; dashboard retains the event history and status. |
| 17 | Must | Use the app in English or Hindi | As a patient, I want the core interface and voice prompts in English or Hindi so that I can use the app comfortably. | Language toggle changes visible navigation, actions, guidance, and status labels; browser voice recognition uses matching locale where supported. |
| 18 | Should | Check minor symptoms safely | As a patient, I want basic guidance for a small fixed set of minor symptoms so that I know when simple self-care may be appropriate. | Only curated symptoms are accepted; severe/unlisted symptoms receive no OTC suggestion; every response includes the medical disclaimer. |
| 19 | Should | Review adherence history and streaks | As a caregiver, I want 7/30-day history and streak context so that I can spot patterns without daily calls. | History shows dose status, time, and response method; weekly chart calculates daily adherence; streak is visible. |
| 20 | Should | Support multiple caregivers | As a patient, I want more than one caregiver linked so that multiple family members can receive important updates. | More than one link can exist per patient; all linked caregivers receive missed-dose/SOS notifications; each sees only linked patients. |
| 21 | Should | Review and mark care updates | As a caregiver, I want an alert feed that I can mark as read so that I can distinguish new concerns from handled information. | Feed lists missed-dose, SOS, and information events in time order; unread state is per user; mark-read action persists during the session. |
| 22 | Could | Save doctor contacts | As a patient or edit-enabled caregiver, I want to save a regular doctor's name, specialty, and phone number so that trusted help is easy to reach. | Contact requires name/phone; linked roles see patient contacts; phone number has a tap-to-call link. |
| 23 | Could | Save pharmacy contacts | As a patient or edit-enabled caregiver, I want to save nearby pharmacy contact details so that I can call a familiar chemist quickly. | Pharmacy contact stores name, phone, and address; visible only to linked roles; phone number is tappable. |
| 24 | Could | Remotely manage a schedule as an edit caregiver | As an edit-enabled caregiver, I want to add or edit a patient's medicine schedule so that I can help when needed. | View-only caregivers see a read-only notice; edit caregivers can add/update/remove; patient owner always retains edit access. |
| 25 | Could | Trigger SOS by voice | As a patient, I want a voice SOS pathway so that I can seek help when tapping is difficult. | Voice intent endpoint recognises SOS/help keywords; client can surface a confirmation before sending; unsupported browsers offer a clear fallback. |

## Label set

Create these labels once in GitHub, then apply the label shown in the table:

- `priority:must` - critical first release
- `priority:should` - valuable after Must scope
- `priority:could` - optional if time remains
- `area:auth`
- `area:medication`
- `area:caregiver`
- `area:sos`
- `area:accessibility`
- `area:health-safety`
- `area:devops`

## Definition of Done for every issue

- Acceptance criteria are met and demonstrated locally.
- Protected API behavior is verified when the issue handles patient data.
- UI is keyboard-accessible, readable on a mobile viewport, and translated where it changes patient-facing copy.
- README/API/architecture documentation is updated when behavior or infrastructure changes.
