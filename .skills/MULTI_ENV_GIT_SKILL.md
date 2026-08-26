
# Skill: Multi-Environment Git & Workspace Synchronization Protocol

## Objective

Enforce strict Git discipline, environment safety, and state synchronization across multiple development environments (e.g., Home vs. Work).

## 1. Start of Work Protocol (Session Initialization)

Before generating or applying any code changes, perform or prompt the developer to perform:

1. **Repository Status Check:** Check for untracked or uncommitted changes (`git status`).

2. **Remote Fetch & Pull:** Ensure the local working branch is up to date with the remote:

```bash
   git fetch origin
   git pull origin <current-branch>
```

3. **Dependency Sync Check:** If recent commits modified lockfiles (`composer.lock`, `package-lock.json`, `pnpm-lock.yaml`, `requirements.txt`), remind the developer to run the respective package installer.

## 2. End of Work / Context Switching Protocol

When wrapping up tasks, ending a session, or preparing to switch machines:

1. **Never Leave Uncommitted Work:**

* If a feature is complete: standard atomic commit following Conventional Commits (`feat:`, `fix:`, `refactor:`).

* If work is partial/incomplete: create a temporary WIP commit on a feature branch:

```bash
git add .
git commit -m "wip: partial changes before environment switch"
git push origin <feature-branch>

```

2. **Never Recommend `git stash` for Machine Transfers:**

* Warn explicitly that `git stash` is purely local and will not propagate to the other workspace.

3. **Direct Main/Master Protection:**

* Do NOT commit WIP changes directly to `main` or `master`. Always switch to or create a dedicated feature branch.

---

## 3. Environment & Secrets Safety

1. **Zero Secret Leaks:**

* Verify that all `.env*` files containing credentials, tokens, or local paths are strictly 
ignored in `.gitignore`.
* Only propose updates to `.env.example` when new environment variables are introduced.

2. **OS & Line Ending Consistency:**

* Avoid creating or editing files that overwrite LF/CRLF globally across machines. Keep `.gitattributes` respected.

3. **Ignore Ephemeral Artifacts:**

* Ensure build directories (`dist/`, `.next/`, `build/`, `vendor/`, `node_modules/`, `.venv/`) remain untracked.

---

## 4. Conflict Avoidance & Recovery Guidance

* If the remote branch has diverged, guide the developer through `git rebase origin/<current-branch>` or `git merge` instead of force-pushing.
* When resuming work on a machine after a WIP push:

1. Pull the WIP branch.
2. Continue development.
3. When finalizing, use `git reset --soft HEAD~1` or interactive rebase (`git rebase -i`) to squash WIP commits into clean, descriptive commits before opening a Pull Request.

```

Você prefere que essa instrução seja adaptada especificamente para o formato do **Cursor Rules (`.cursorrules`)**, **GitHub Copilot (`.github/copilot-instructions.md`)** ou **Claude/Gemini System Prompts**?

```