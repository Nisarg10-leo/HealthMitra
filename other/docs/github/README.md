# GitHub Project publishing guide

The repository contains 25 fully written user stories and a helper that creates matching GitHub Issues. Publishing them requires your own GitHub account and target repository; this is intentionally not automated against an unknown account.

## 1. Create and push the repository

```bash
git init -b main
git add .
git commit -m "feat: complete HealthMitra assignment"
git branch -M main
git remote add origin https://github.com/OWNER/healthmitra.git
git push -u origin main
git switch -c feature/healthmitra-assignment
git push -u origin feature/healthmitra-assignment
```

## 2. Create the issues

Install GitHub CLI, authenticate with `gh auth login`, then run:

```bash
bash docs/github/create-issues.sh OWNER/healthmitra
```

The helper creates the priority labels and all 25 issue titles/bodies. Confirm the number with:

```bash
gh issue list --repo OWNER/healthmitra --limit 100
```

## 3. Create the Project board

1. In GitHub, select **Projects** → **New project** → **Board**.
2. Name it `HealthMitra - Digital Assignment 1`.
3. Add all 25 issues from the repository.
4. Add a `Priority` single-select field or use the `priority:*` labels.
5. Create columns `Backlog`, `In progress`, `In review`, and `Done`.
6. Group/filter by priority for the MoSCoW screenshot.

## 4. Required screenshots

Capture the repository’s `main` and `feature/healthmitra-assignment` branches, the README, the Project showing all 25 issues, and at least one expanded issue with its acceptance criteria. Store them in `docs/evidence/` before submission.
