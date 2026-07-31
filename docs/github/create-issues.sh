#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${1:-}"

if [[ -z "$REPOSITORY" ]]; then
  echo "Usage: bash docs/github/create-issues.sh OWNER/REPOSITORY"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. Install it from https://cli.github.com/ and run: gh auth login"
  exit 1
fi

create_label() {
  gh label create "$1" --repo "$REPOSITORY" --color "$2" --description "$3" --force >/dev/null
}

create_label "priority:must" "B60205" "Critical first-release requirement"
create_label "priority:should" "FBCA04" "Important after Must scope"
create_label "priority:could" "0E8A16" "Optional if time remains"
create_label "area:auth" "1D76DB" "Authentication and access"
create_label "area:medication" "5319E7" "Medication and adherence"
create_label "area:caregiver" "006B75" "Caregiver workflows"
create_label "area:sos" "D93F0B" "Emergency SOS"
create_label "area:accessibility" "C2E0C6" "Localization and accessibility"
create_label "area:health-safety" "BFD4F2" "Health safety guardrails"

create_issue() {
  local title="$1"
  local priority="$2"
  local area="$3"
  local story="$4"
  local criteria="$5"
  local body
  body="$(printf '%b' "## User story

$story

## Acceptance criteria

$criteria

---

Source backlog: [docs/github/user-stories.md](docs/github/user-stories.md)"
  )"
  gh issue create --repo "$REPOSITORY" --title "$title" --label "$priority" --label "$area" --body "$body"
}

create_issue "Register as a patient" "priority:must" "area:auth" "As an elderly patient, I want to create a patient account so that my medicine plan is private." "- [ ] Require name, email, password, and patient role\n- [ ] Reject duplicate email\n- [ ] Never return a password"
create_issue "Register as a caregiver" "priority:must" "area:auth" "As a family caregiver, I want to create a caregiver account so that I can support a linked patient." "- [ ] Offer caregiver role\n- [ ] Start caregiver session\n- [ ] Hide unrelated patients"
create_issue "Link a caregiver by email" "priority:must" "area:auth" "As a patient, I want to link an existing caregiver by email and permission so that my family can help appropriately." "- [ ] Patient-only action\n- [ ] Support view/edit permission\n- [ ] Reject unknown caregiver email"
create_issue "Join a patient plan using an invite code" "priority:must" "area:auth" "As a caregiver, I want to join a patient plan with an invite code so that family linking is simple." "- [ ] Valid code links once\n- [ ] Invalid code explains failure\n- [ ] Default permission is view"
create_issue "Protect patient data with role-aware access" "priority:must" "area:auth" "As a patient, I want only explicitly linked people to access my health data so that it stays private." "- [ ] Reject unsigned requests\n- [ ] Reject unrelated caregivers\n- [ ] Prevent view-only schedule edits"
create_issue "Add a medication" "priority:must" "area:medication" "As a patient, I want to add a medicine with dosage and daily times so that reminders match my prescription." "- [ ] Require name, dosage, valid times\n- [ ] Support start/end dates\n- [ ] Show medicine in schedule"
create_issue "Edit a medication" "priority:must" "area:medication" "As a patient or edit caregiver, I want to update medication details so that the schedule stays accurate." "- [ ] Check edit permission\n- [ ] Recalculate frequency\n- [ ] Reject invalid dates/times"
create_issue "Remove a medication" "priority:must" "area:medication" "As a patient or edit caregiver, I want to remove an obsolete medicine so that I do not get wrong reminders." "- [ ] Ask for UI confirmation\n- [ ] Require edit permission\n- [ ] Remove from active schedule"
create_issue "Create due-dose records server-side" "priority:must" "area:medication" "As a patient, I want the server to create today's dose records so that reminders work when my browser is closed." "- [ ] Cron runs every minute\n- [ ] Create pending logs\n- [ ] Preserve dose status history"
create_issue "Receive a medication reminder" "priority:must" "area:medication" "As a patient, I want a clear due reminder so that I can act promptly." "- [ ] Name medicine and dosage\n- [ ] Store in-app notification\n- [ ] Keep push adapter replaceable"
create_issue "Confirm a dose by tapping" "priority:must" "area:medication" "As a patient, I want large Taken and Skipped buttons so that I can confirm without typing." "- [ ] Record timestamp\n- [ ] Record tap method\n- [ ] Prevent duplicate confirmation"
create_issue "Confirm a dose by voice" "priority:must" "area:accessibility" "As a patient, I want to say that I took or skipped a dose so that confirmation is easier." "- [ ] Listen in English/Hindi\n- [ ] Parse taken/skipped intent\n- [ ] Record voice method"
create_issue "Alert caregivers about a missed dose" "priority:must" "area:caregiver" "As a caregiver, I want an automatic alert for an unanswered dose so that I can check in quickly." "- [ ] Mark missed after configured window\n- [ ] Notify all linked caregivers\n- [ ] Do not duplicate alerts"
create_issue "View today's caregiver dashboard" "priority:must" "area:caregiver" "As a caregiver, I want a concise linked-patient dashboard so that I understand medication status at a glance." "- [ ] Show adherence, count, alerts, streak\n- [ ] Show weekly chart\n- [ ] Show today's schedule"
create_issue "Trigger emergency SOS with location" "priority:must" "area:sos" "As a patient, I want a large SOS action that shares available location so that I can quickly request help." "- [ ] Patient-only trigger\n- [ ] Log event\n- [ ] Alert all linked caregivers"
create_issue "Resolve an SOS event" "priority:must" "area:sos" "As a caregiver, I want to acknowledge and resolve SOS events so that the family knows they are being handled." "- [ ] Active/acknowledged/resolved states\n- [ ] Save event history\n- [ ] Show map link when available"
create_issue "Use the app in English or Hindi" "priority:must" "area:accessibility" "As a patient, I want the core interface in English or Hindi so that I can use it comfortably." "- [ ] Toggle visible UI copy\n- [ ] Translate safety guidance\n- [ ] Use matching voice locale where supported"
create_issue "Check minor symptoms safely" "priority:should" "area:health-safety" "As a patient, I want safe guidance for minor common symptoms so that I know when to seek care." "- [ ] Use fixed curated list\n- [ ] Route severe/unlisted symptoms to doctor\n- [ ] Always show disclaimer"
create_issue "Review adherence history and streaks" "priority:should" "area:caregiver" "As a caregiver, I want history and streaks so that I can notice patterns." "- [ ] Show status/time/method\n- [ ] Show 7-day chart\n- [ ] Show streak"
create_issue "Support multiple caregivers" "priority:should" "area:caregiver" "As a patient, I want more than one caregiver linked so that multiple family members can receive important updates." "- [ ] Permit multiple links\n- [ ] Notify every linked caregiver\n- [ ] Scope each caregiver to linked patients"
create_issue "Review and mark care updates" "priority:should" "area:caregiver" "As a caregiver, I want to mark care updates as read so that I can separate new concerns from handled information." "- [ ] Time-ordered feed\n- [ ] Per-user unread state\n- [ ] Mark-read action"
create_issue "Save doctor contacts" "priority:could" "area:caregiver" "As a patient or edit caregiver, I want to save doctor contacts so that trusted help is easy to reach." "- [ ] Save name, specialty, phone\n- [ ] Link to patient\n- [ ] Tap-to-call"
create_issue "Save pharmacy contacts" "priority:could" "area:caregiver" "As a patient or edit caregiver, I want to save pharmacy contacts so that I can call a familiar chemist quickly." "- [ ] Save name, phone, address\n- [ ] Link to patient\n- [ ] Tap-to-call"
create_issue "Remotely manage a schedule as an edit caregiver" "priority:could" "area:caregiver" "As an edit-enabled caregiver, I want to manage a patient's schedule so that I can help when needed." "- [ ] View access is read-only\n- [ ] Edit access can add/update/remove\n- [ ] Patient owner always retains access"
create_issue "Trigger SOS by voice" "priority:could" "area:sos" "As a patient, I want a voice SOS pathway so that I can seek help when tapping is difficult." "- [ ] Recognise SOS/help intent\n- [ ] Confirm before sending\n- [ ] Provide unsupported-browser fallback"

echo "Created 25 HealthMitra issues in $REPOSITORY. Add them to the GitHub Project board next."
