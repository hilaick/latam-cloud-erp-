# SSOT Workflow — Single Source of Truth Rules
_Last updated: 2026-09-04_

## The Golden Rule
**GitHub (`hilaick/latam-cloud-erp-`) is the single source of truth.**
- Everything runs from GitHub. Edit → commit → push → pull on server → restart.
- Never edit source files directly on the ERP server (routes/, services/, frontend/src/, app.py, models.py).
- Only runtime/transient artifacts (dist/, scripts/, generated files, pdfs) live on the server without commit.

## Workflow (all sessions follow this)

```
1. EDIT LOCALLY (Windows repo or any dev machine)
   cd /c/Users/h84423900/latam-cloud-erp/repo
   git pull --ff-only   # Get latest from GitHub FIRST
   ... edit files ...

2. COMMIT + PUSH TO GITHUB
   git add <files>
   git commit -m "type: description"
   git push origin feature-migration-lifecycle-2

3. DEPLOY TO ERP SERVER (SSH)
   cd /home/huawei-cloud/latam-cloud-erp-
   git pull --rebase origin feature-migration-lifecycle-2
   source venv/bin/activate
   VAULT_MASTER_PASSWORD=<password> nohup python3 app.py --port 9119 > /tmp/flask.log 2>&1 &

4. RESTART FLASK (after every deploy)
   # Kill existing
   fuser -k 9119/tcp
   # Start
   VAULT_MASTER_PASSWORD=<password> nohup python3 app.py --port 9119 > /tmp/flask.log 2>&1 &
```

## Emergency Fixes (direct server edit — then commit)
If you MUST edit on the server (e.g. fast fix while a session runs here):
```bash
git add -A          # Stage all fixes
git commit -m "fix: description"
git push origin feature-migration-lifecycle-2   # MUST push immediately
```
This ensures the fix doesn't get lost if another session pulls a clean copy.

## Conflict Resolution
If `git push` says "fetch first" or "non-fast-forward":
```bash
# Someone else pushed to GitHub while you were working.
git stash               # Save your work temporarily
git pull --rebase       # Re-read the notebook + re-apply your work on top
git stash pop           # Restore unrelated changes
git push                # Now your push includes both
```

## What Session bg_113159_16eb58 Must Know
- The ERP server now has valid `~/.git-credentials` (GitHub x-access-token).
- From that SSH session, `git push` works directly (credentials are stored).
- Before any deploy: `git pull --rebase origin feature-migration-lifecycle-2` to get everyone else's changes.
- After deploy: `git push origin feature-migration-lifecycle-2` to update GitHub with any new changes.
- If another session pushed while you worked, `git pull --rebase` will merge cleanly (conflicts only if both changed the same line — resolve manually).

## Branch Protection
- All work on `feature-migration-lifecycle-2` (active development).
- `main` is stable releases only.
- Never force-push (`--force` or `-f`). If a conflict can't be rebased, ask.
- All session bot users have the `Hermes Agent <hermes-agent@localhost>` committer.
- Human users: use your own `git config user.name` / `user.email`.
