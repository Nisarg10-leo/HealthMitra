# Submission evidence checklist

The assignment asks for screenshots as proof. Do not submit fabricated images; capture the following from your own Docker Desktop, browser, GitHub, Figma, and Draw.io sessions after pushing the repository.

## Required captures

| Suggested filename | Capture | What must be visible |
| --- | --- | --- |
| `01-folder-structure.png` | VS Code/file explorer | `client`, `server`, `docs`, `docker-compose.yml`, `README.md`, `.gitignore` |
| `02-feature-branch.png` | Terminal or GitHub branches page | `main` and `feature/healthmitra-assignment` |
| `03-docker-compose-up.png` | Terminal | `docker compose up --build` completing with client, server, and database running |
| `04-patient-localhost.png` | Browser | `http://localhost:5173` patient screen, large dose controls, language/SOS action |
| `05-caregiver-localhost.png` | Browser | caregiver dashboard, adherence chart, alerts/history |
| `06-figma-wireframes.png` | Figma Free | all six imported wireframes on one canvas |
| `07-drawio-architecture.png` | Draw.io | the one-page landscape architecture diagram with arrows and legend |
| `08-github-project.png` | GitHub Project | 25 HealthMitra issues, prioritised board/table |
| `09-github-readme.png` | GitHub repository | README rendering and branch selector |

## Copy/paste terminal sequence

```bash
# Confirm the expected structure
find . -maxdepth 2 -type f | sort

# Create and show the feature branch
git switch -c feature/healthmitra-assignment
git branch --show-current
git branch -a

# Build and run the full local stack
docker compose up --build

# In another terminal, verify API health
curl http://localhost:4000/api/health
```

## Demo flow for browser screenshots

1. Open `http://localhost:5173` and choose **Patient: Meera**.
2. Capture the patient schedule, dose action, English/Hindi toggle, and visible SOS button.
3. Sign out, choose **Caregiver: Arjun**, and capture the dashboard.
4. Open **Care updates** to show missed-dose/SOS handling.
5. Open **Medicines** to show caregiver permission-aware schedule management.

## Figma and Draw.io proof

- Import [the SVG wireframe board](../wireframes/healthmitra-wireframes.svg) into Figma Free, then screenshot the named six-screen board.
- Open [the Draw.io file](../architecture/healthmitra-architecture.drawio) in diagrams.net, verify the landscape page and connectors, then screenshot it.

## GitHub proof

Use the helper described in [the GitHub guide](../github/README.md) to create the 25 issues. Add them to a project board, filter/group by `priority:*` label, and take a screenshot where the issue count and priority structure are visible.
