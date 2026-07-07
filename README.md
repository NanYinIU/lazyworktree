# lazyworktree

> [**中文文档**](./README_cn.md) | [English](./README.md)

Terminal UI for creating Git worktree groups in a multi-repo workspace.

[![npm version](https://img.shields.io/npm/v/lazyworktree)](https://www.npmjs.com/package/lazyworktree)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## What problem does it solve?

A large project often consists of multiple Git repositories managed together in a workspace directory (monorepo-style, but across separate repos). When working on a **cross-repo feature**, you need to:

1. Create a feature branch in **each** repository.
2. Create a `git worktree add` for **each** -- remembering the right branch name and base ref.
3. Optionally mirror shared tooling files (`.agents`, `.claude`, `.factory`, `CLAUDE.md`, `AGENTS.md`) into every worktree.

Doing this manually is repetitive and error-prone. **lazyworktree** automates the entire process:

- It **scans** your workspace for Git repos.
- Lets you **select** which repos need feature worktrees.
- **Creates** a consistent worktree group (a sibling directory) in one pass.
- **Mirrors** configured symlinks (agent config, workspace files) so every worktree is ready to use.

---

## How does it work?

### Directory structure

lazyworktree assumes your workspace root is a directory whose **direct children** are Git repositories:

```
~/Work/uxin/zh/          <- workspace root (run lazyworktree here)
  module1/               <- Git repo (contains .git/)
  module2/               <- Git repo
  module3/               <- Git repo
  module4/               <- Git repo
  module5/               <- Git repo
  .agents/               <- shared file (auto-symlinked)
  AGENTS.md              <- shared file (auto-symlinked)
  CLAUDE.md              <- shared file (auto-symlinked)
```

It only scans **direct child directories** that contain `.git`. Deeper nested repos are not included.

### Worktree group layout

When you create a worktree group for a feature branch, lazyworktree creates a **sibling directory** next to your workspace containing a subdirectory per selected repo:

```
../zh-feature-foo/       <- worktree group root
  module1/               <- worktree for module1 on feature/foo
  module4/               <- worktree for module4 on feature/foo
  .agents -> ../zh/.agents      <- root symlinks (workspace-level files)
  AGENTS.md -> ../zh/AGENTS.md
```

### Branch source logic

For each project, lazyworktree decides where the feature branch starts from:

1. If a branch with the same name already exists on **remote** (`origin/<branch>`), it creates a local tracking branch.
2. Otherwise, it uses the **base branch** -- by default auto-detected from `origin/HEAD`, then `origin/main`, then `origin/master`.
3. You can configure per-project base branch overrides in `.lazyworktree.json`.

### Symlink mirroring

Configured file/directory names are mirrored into:
- The **group root** (from workspace root).
- Each **project worktree** (from the project's own directory first, with workspace root as fallback).

Symlinked names are also added to each worktree's `.git/info/exclude` so they stay clean.

---

## Quick start

### Install

```bash
npm install -g lazyworktree
```

Requires Node.js 18+.

### Enter your workspace root

```bash
cd ~/Work/uxin/zh
```

### Launch the TUI

```bash
lazyworktree
```

The Home screen shows two options: **Create** (new worktree group) and **Groups** (manage existing ones).

### CLI shortcut (skip the TUI selection)

```bash
lazyworktree --projects module1,module4 --feature feature/foo
```

This opens directly into the plan review screen with those projects pre-selected.

---

## Typical workflow

1. `cd` to your workspace root.
2. `lazyworktree` to launch the TUI.
3. Select **Create** from the Home screen.
4. **Pick projects** -- use j/k to navigate, Space to toggle, Enter to confirm.
5. **Enter feature branch** -- input the branch name (e.g., `feature/my-cross-repo-change`).
6. **Review the plan** -- check each project's target path, source ref, dirty status, and any conflicts. Press Enter to execute.
7. **Watch execution** -- the Activity screen streams each git fetch, worktree add, and symlink creation.
8. On completion, enter the generated worktree group directory and start developing:

```bash
cd ../zh-my-cross-repo-change/module1
git status   # already on the correct branch
```

### Managing groups

From the **Groups** screen you can:
- `n` -- create a new worktree in an existing group.
- `c` -- cleanup (delete) a selected worktree group.
- `p` -- safe prune stale worktrees.
- `s` -- repair broken symlinks.
- `r` -- refresh the group list.

---

## Configuration

Place a `.lazyworktree.json` file in the workspace root. The Settings screen can update the same file.

```json
{
  "language": "auto",
  "gui": {
    "showBottomLine": true
  },
  "symlinks": {
    "names": [".claude", ".agents", ".factory", "CLAUDE.md", "AGENTS.md"]
  },
  "baseBranch": {
    "default": "auto",
    "projects": {}
  },
  "keybindings": {
    "universal": { "help": "?", "back": "Esc", "quit": "q" },
    "create": { "confirm": "Enter" },
    "dashboard": {
      "moveDown": "j",
      "moveUp": "k",
      "filter": "/",
      "newWorktree": "n",
      "cleanupGroup": "c",
      "prune": "p",
      "refresh": "r",
      "repair": "s"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `language` | `"auto"`, `"zh"`, or `"en"` |
| `gui.showBottomLine` | Show/hide the lazygit-style keybinding hints at the bottom |
| `symlinks.names` | Files/directories to symlink into every worktree |
| `baseBranch.default` | `"auto"` (detect `origin/HEAD`) or an explicit ref like `"origin/main"` |
| `baseBranch.projects` | Per-project base branch overrides, e.g. `{ "module4": "origin/release/2.0" }` |

---

## CLI options

```bash
lazyworktree --help

Options:
  --projects <list>      Comma-separated project entries
                         (e.g. "module1,module4" or "module1,ypzb:bugfix-room")
  --feature <branch>     Default feature branch name
  --language <locale>    UI language: auto, zh, or en
  --hide-bottom-line     Hide the keybinding bottom line
```

---

## Common operations

| Action | Command |
|--------|---------|
| Install | `npm install -g lazyworktree` |
| Update | `npm update -g lazyworktree` |
| Uninstall | `npm uninstall -g lazyworktree` |
| Launch TUI | `lazyworktree` |
| Launch with English UI | `lazyworktree --language en` |
| Quick create | `lazyworktree --projects module1,module4 --feature feature/foo` |

---

## FAQ

**Q: Which directory should I run lazyworktree from?**

Run it from your workspace root -- the parent directory that contains your Git repos as direct children. Running from inside a single repo is not supported.

**Q: How does it discover Git repos?**

It scans only **direct child directories** of the current working directory that contain a `.git` subdirectory. Nested repos are not discovered.

**Q: What if the target directory already exists?**

That project is skipped with a warning. Existing worktrees are never overwritten.

**Q: What if my working tree is dirty?**

The plan screen shows a dirty flag for each project. You can decide whether to proceed or clean up first.

**Q: What Node.js version is required?**

Node.js 18 or newer.

---

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
