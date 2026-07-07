# lazyworktree

Terminal UI for creating and maintaining Git worktree groups in a multi-repo
workspace. The app is built with TypeScript, Ink, and `@inkjs/ui`.

## Usage

From the package directory:

```bash
npm run dev
npm run dev -- --projects api-model,room-server --feature feature/foo
```

From this repository:

```bash
./lazyworktree.sh
./lazyworktree.sh --language en
./lazyworktree.sh --hide-bottom-line
```

## Screens

```text
Home
  Create    select projects, enter feature branch, review the plan, run Git commands
  Groups    list groups, filter, create, cleanup, prune, repair, refresh
  Settings  language, footer hints, and symlink names
Activity    streamed command log for create, prune, cleanup, force, branch delete, repair
```

The Groups screen keeps maintenance actions inline. Activity shows each Git step
with status and timing, then renders the next available recovery or completion
action.

## Configuration

Place `.lazyworktree.json` in the workspace root. The Settings screen can update
the same file.

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

Supported `language` values are `auto`, `zh`, and `en`.

## Keys

- Global: `?` help, `q` quit, `Esc` back
- Groups: `j/k` move, `/` filter, `n` new, `c` cleanup selected, `p` safe prune,
  `s` repair symlinks, `r` refresh
- Create: `Enter` confirms the current selection or step

## Behavior

- Worktree group names use the workspace directory name as the prefix.
- Base branch defaults to `origin/HEAD`, then `origin/main`, then
  `origin/master`; `.lazyworktree.json` can override it globally or per project.
- Symlink names are mirrored into the group root and each project worktree when
  matching source files exist.
- Symlink names are added to each worktree's local `.git/info/exclude` file with
  a `lazyworktree` marker so new worktrees stay clean.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
