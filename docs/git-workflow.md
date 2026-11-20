# Git Workflow Guide

How we work with Git on the CaseCraft phone case store. Read the TL;DR now and keep the rest as a reference.

> Written for GitHub. On GitLab, read "Pull Request (PR)" as "Merge Request (MR)".

## TL;DR

1. **Never commit directly to `main` or `develop`.** They are protected. All work goes through a Pull Request.
2. **Start every task from the latest `develop`**, on your own branch: `feature/<scope>-<short-description>`.
3. **One task = one branch = one small PR.** Aim for under about 400 changed lines.
4. **Commit messages follow the format** `feat(landing): add hero banner`.
5. **Keep your branch fresh:** merge `develop` into it at least once a day.
6. **Before opening a PR, run `ng build`.** If it fails, the PR cannot be merged.
7. **Someone else reviews and approves your PR.** Then you squash-merge it and delete the branch.

---

## 1. The branch map

```
main      ──●─────────────────────────────●──────►   production (tagged v0.1.0, v0.2.0 ...)
            │                             ▲
develop   ──●──●──────●──────●──────●─────●──────►   everyone's finished work comes together here
               ▲      ▲      ▲
               │      │      └── feature/shop-product-card
               │      └───────── feature/auth-login
               └──────────────── feature/landing-hero
```

| Branch | What it is | Who can change it |
|---|---|---|
| `main` | What customers see (production). Always works. | Only the lead, by merging `develop` through a PR. |
| `develop` | The integration branch. Every finished task lands here first. | Everyone, only through reviewed PRs. |
| `feature/*`, `fix/*`, ... | Your personal working branch for one task. Short-lived (1 to 3 days). | You. |
| `hotfix/*` | Urgent fix for a bug in production. Starts from `main`. | The lead or whoever is assigned. |

Why two long-lived branches? `develop` is where we find out whether everyone's work fits together. `main` stays clean, so we can always deploy it. The cost is one extra merge when we release.

## 2. Branch names

Format: `<type>/<scope>-<short-description>`, all lowercase, words separated by hyphens.

| Type | Use for | Example |
|---|---|---|
| `feature` | New functionality | `feature/landing-hero` |
| `fix` | Bug fix | `fix/cart-badge-count` |
| `refactor` | Restructure code without changing behavior | `refactor/shop-product-service` |
| `style` | Visual only changes (CSS, spacing, tokens) | `style/header-mobile-spacing` |
| `docs` | Documentation | `docs/git-workflow` |
| `chore` | Tooling, dependencies, config | `chore/update-angular` |
| `hotfix` | Urgent production fix (from `main`) | `hotfix/checkout-crash` |

**Scope** is the folder you are working in: `landing`, `auth`, `profile`, `shop`, `cart`, `checkout`, `design-studio`, `orders`, `support`, `core`, `shared`, `styles`, `deps`.

## 3. Your daily workflow

### Start a task

```bash
git switch develop
git pull                                  # get the latest develop
git switch -c feature/landing-hero        # create your branch and move onto it
```

### Work and commit (as often as you like)

```bash
git status                                # what did I change?
git add .                                 # stage the changes (check the list from git status first)
git commit -m "feat(landing): add hero banner"
```

Commit small and often. A commit is a save point, and you can tidy up when the PR is squashed.

### Push at least once a day

```bash
git push -u origin feature/landing-hero   # first push of this branch
git push                                  # every push after that
```

Pushing is your backup, and it lets teammates see your progress.

### Keep your branch up to date (daily)

```bash
git fetch origin
git merge origin/develop                  # bring other people's work into your branch
```

If Git reports conflicts, see section 7. Updating often keeps conflicts small.

### Open the Pull Request

1. Run `ng build` and make sure it passes.
2. Push your branch.
3. On GitHub, click **Compare & pull request**, set the **base branch to `develop`**, fill in the template.
4. Ask a teammate to review.

If the work is not ready yet, open it as a **Draft PR** so others can see it.

### After review

- Fix requested changes by committing to the same branch and pushing. The PR updates itself.
- When approved and the build is green, click **Squash and merge**, then **Delete branch**.
- Back on your machine:

```bash
git switch develop
git pull
git branch -d feature/landing-hero        # delete your local copy
```

## 4. Commit messages

Format: `type(scope): short description in the imperative`

```
feat(landing): add hero banner
fix(cart): show correct item count in header badge
style(core): tighten header spacing on mobile
refactor(shop): move product queries into product-api service
chore(deps): update tailwind to latest patch
docs: add git workflow guide
```

- **Types:** `feat`, `fix`, `style`, `refactor`, `docs`, `chore`, `test`.
- **Imperative and short:** "add hero banner", not "added" or "adding". Aim for under 72 characters.
- **One idea per commit.** If you need the word "and", it is probably two commits.
- Add `!` for a breaking change, for example `refactor(core)!: rename Supabase service`.

## 5. Pull requests and reviews

**For the author**
- Keep the PR small and about one thing. Big PRs get slow, shallow reviews.
- Fill in the template, add a screenshot or short recording for anything visual (mobile and desktop).
- PR title uses the same format as a commit message. It becomes the squashed commit.
- Reply to every comment, then mark it resolved.

**For the reviewer**
- Aim to review within one working day.
- Check: does it do what the description says? Does it follow `angular-project-conventions` (naming, folders, signals, routing)? Does it use brand tokens instead of raw colors? Any secrets or leftover debug code?
- Be specific and kind. Suggest, don't command.
- An AI review can help, but a human approves.

**Merge rules**

| From | Into | Method |
|---|---|---|
| `feature/*`, `fix/*`, `chore/*` ... | `develop` | **Squash and merge** (one clean commit per task) |
| `develop` | `main` (release) | **Create a merge commit** (never squash, or `develop` and `main` drift apart) |
| `hotfix/*` | `main`, then back into `develop` | Merge commit |

## 6. Avoiding conflicts

Our folder structure already helps: each epic lives in its own `features/<name>/` folder, so people working on different epics rarely touch the same files.

**Conflict hotspots.** These files are edited by many people, so keep changes there small and merge them fast:

| File | Why it is shared |
|---|---|
| `src/app/app.routes.ts` | Every new module adds a line |
| `src/app/core/layout/header/nav-items.ts` | Navigation links |
| `src/styles/tokens.css`, `_effects.scss` | Brand system |
| `src/app/shared/ui/*` | Shared components |
| `package.json`, `package-lock.json` | Dependencies |

Habits that prevent most conflicts:
- Merge `develop` into your branch daily.
- Finish and merge small PRs instead of keeping a branch for a week.
- Tell the team before changing a shared file or a shared component.
- Do not reformat or rename files you are not working on.
- Only one person updates dependencies at a time. Never commit `package-lock.json` changes you did not intend.

## 7. Resolving a merge conflict

1. Run `git merge origin/develop`. Git lists the files in conflict.
2. Open each file. The conflicting section looks like this:
   ```
   <<<<<<< HEAD
   your version
   =======
   their version
   >>>>>>> origin/develop
   ```
3. Decide what the final code should be (often both parts), and delete the `<<<`, `===`, `>>>` lines.
4. Save, then `git add <file>` and finally `git commit` (Git suggests a message).
5. Run `ng build` to make sure everything still works.

In JetBrains IDEs: **Git > Resolve Conflicts** opens a three-panel merge tool (yours, theirs, result). It is easier than editing the markers by hand. If you are unsure whose code to keep, ask the author. Do not guess.

## 8. Working with AI assistants (Gemini, Claude)

- Give the assistant **one task per branch**, and include the project skills (`angular-project-conventions`, `phonecase-brand-styling`) as context.
- **Read the diff before you commit** (`git diff`, or the Commit window in your IDE). You are responsible for every line, whoever typed it.
- Never let an assistant run destructive commands without your explicit OK: `git push --force`, `git reset --hard`, `git clean -fd`, `git checkout .`.
- Do not commit generated noise: `dist/`, `.angular/`, `node_modules/`, temporary files. They are in `.gitignore`; if something new shows up, add it there.
- Never paste secrets (Supabase keys, `.env` values) into an AI chat or commit them.

## 9. Releases and hotfixes (lead)

**Release (develop to main)**
1. Check `develop` builds and the site works (ideally on a staging deploy).
2. Open a PR from `develop` into `main`, titled `release: v0.2.0`.
3. After approval, **Create a merge commit**.
4. Tag it: `git switch main && git pull && git tag v0.2.0 && git push --tags`.

Use `v0.x.0` while the site is under construction and `v1.0.0` for the public launch.

**Hotfix (urgent bug in production)**
1. `git switch main && git pull && git switch -c hotfix/<scope>-<description>`.
2. Fix it, open a PR into `main`, get a quick review, merge.
3. Merge `main` back into `develop` (PR from `main` to `develop`) so the fix is not lost.
4. Tag a patch version, for example `v0.2.1`.

## 10. Undo cheat sheet

| I want to... | Do this |
|---|---|
| See what I changed | `git status` and `git diff` |
| Throw away changes in one file (not committed) | `git restore <file>` |
| Unstage a file but keep the changes | `git restore --staged <file>` |
| Fix my last commit message or add a forgotten file (**not pushed yet**) | `git add <file>` then `git commit --amend` |
| Park unfinished work to switch tasks | `git stash`, later `git stash pop` |
| Undo a commit that is already pushed or merged | `git revert <commit-hash>` (creates a new commit that cancels it) |
| I committed on `develop` by mistake (not pushed) | `git switch -c feature/<name>` to keep the work on a new branch, then ask the lead how to reset `develop` |
| I'm lost | Stop, do not run random commands, and ask. `git status` output helps others help you. |

## 11. One-time setup

**Every teammate**
```bash
git clone <repo-url>
cd phonecase-store
npm ci                                    # install exact dependency versions
git config user.name "Your Name"
git config user.email "you@example.com"   # the email used on your GitHub account
```
Use Node.js 20.19+ or 22.12+ (required by Angular 20).

`.gitignore` should include at least: `node_modules/`, `dist/`, `.angular/`, `.idea/` (or only the personal parts of it), `.env*`, and any local environment files holding keys.

**Lead (GitHub settings)**
1. Create `develop` from `main`, and set **`develop` as the default branch** so PRs target it automatically.
2. **Settings > Branches > Add rule** for both `main` and `develop`:
   - Require a pull request before merging, with **1 approval**.
   - Require status checks to pass (the `build` job below).
   - Block force pushes and deletions.
3. **Settings > General > Pull Requests:** allow squash merging and merge commits, turn on **Automatically delete head branches**.
4. Optional CI. Save as `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx ng build
```

## 12. Do and don't

**Do**
- Pull `develop` before you start and merge it into your branch daily.
- Keep branches short-lived and PRs small.
- Run `ng build` before opening a PR.
- Ask when a conflict or Git state confuses you.

**Don't**
- Don't commit to `main` or `develop`.
- Don't force-push to a branch someone else is using.
- Don't commit secrets, `.env` files, `node_modules` or build output.
- Don't leave a branch open for weeks.
- Don't merge your own PR without a review.
