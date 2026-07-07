# lazyworktree

> [English](./README.md) | [**中文文档**](./README_cn.md)

多仓库工作区下批量创建 Git worktree 分组的终端 UI 工具。

[![npm version](https://img.shields.io/npm/v/lazyworktree)](https://www.npmjs.com/package/lazyworktree)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## 它能解决什么问题?

一个大型项目通常由多个独立 Git 仓库组成，集中放在一个 workspace 目录下管理。当你开发一个**跨仓库的功能**时，需要：

1. 在**每个**仓库创建 feature 分支。
2. 对**每个**仓库执行 `git worktree add` - 要记住正确的分支名和基准 ref。
3. 可选地，把共享的工具文件（`.agents`、`.claude`、`.factory`、`CLAUDE.md`、`AGENTS.md`）镜像到每个 worktree 中。

手动做这些事既繁琐又容易出错。**lazyworktree** 可以自动化整个过程：

- **扫描**工作区，发现所有 Git 仓库。
- 让你**选择**哪些仓库需要创建 feature worktree。
- **一次性创建**一个完整的 worktree 分组（同级目录）。
- **镜像**配置好的符号链接（工具配置、工作区文件），让每个 worktree 开箱即用。

---

## 工作原理

### 目录结构

lazyworktree 假设你的 workspace 根目录的**直接子目录**就是 Git 仓库：

```
~/Work/uxin/zh/          ← workspace 根目录（在这里运行 lazyworktree）
  api-model/             ← Git 仓库（包含 .git/）
  base-web-commons/      ← Git 仓库
  chat/                  ← Git 仓库
  room-server/           ← Git 仓库
  service-api/           ← Git 仓库
  .agents/               ← 共享文件（自动创建符号链接）
  AGENTS.md              ← 共享文件
  CLAUDE.md              ← 共享文件
```

它只扫描**直接子目录**中带有 `.git` 的仓库。深层嵌套的仓库不会被包含。

### Worktree 分组布局

当你为一个 feature 分支创建 worktree 分组时，lazyworktree 会在 workspace 旁边创建一个**同级目录**，每个选中的仓库对应一个子目录：

```
../zh-feature-foo/       ← worktree 分组根目录
  api-model/             ← api-model 在 feature/foo 上的 worktree
  room-server/           ← room-server 在 feature/foo 上的 worktree
  .agents -> ../zh/.agents      ← 根级符号链接（工作区级别的共享文件）
  AGENTS.md -> ../zh/AGENTS.md
```

### 分支来源逻辑

对每个项目，lazyworktree 按以下顺序决定 feature 分支从哪个基准开始：

1. 如果同名分支已在**远端**存在（`origin/<branch>`），则创建本地跟踪分支。
2. 否则使用**基准分支** - 默认自动探测 `origin/HEAD`，然后 `origin/main`，然后 `origin/master`。
3. 也可以在 `.lazyworktree.json` 中按项目配置基准分支覆盖。

### 符号链接镜像

配置的文件/目录名会被镜像到：
- **分组根目录**（从 workspace 根目录链接）。
- **每个项目的 worktree**（优先从项目自身目录链接，不存在则从 workspace 根目录回退）。

链接名称还会自动添加到每个 worktree 的 `.git/info/exclude` 中，保持工作区干净。

---

## 快速开始

### 安装

```bash
npm install -g lazyworktree
```

需要 Node.js 18+。

### 进入 workspace 根目录

```bash
cd ~/Work/uxin/zh
```

### 启动 TUI

```bash
lazyworktree
```

首页有两个选项：**Create**（新建 worktree 分组）和 **Groups**（管理已有的分组）。

### CLI 快捷方式（跳过 TUI 选择）

```bash
lazyworktree --projects api-model,room-server --feature feature/foo
```

这会直接打开计划审查界面，项目已预选好。

---

## 典型工作流程

1. `cd` 到你的 workspace 根目录。
2. `lazyworktree` 启动 TUI。
3. 在首页选择 **Create**。
4. **选择项目** -- 用 j/k 导航，Space 切换选择，Enter 确认。
5. **输入 feature 分支** -- 例如 `feature/my-cross-repo-change`。
6. **审查计划** -- 检查每个项目的目标路径、源 ref、工作区是否脏、是否有冲突。按 Enter 执行。
7. **观察执行** -- Activity 屏幕会实时显示每个 git fetch、worktree add 和符号链接创建的过程。
8. 执行完成后，进入生成的 worktree 分组目录开始开发：

```bash
cd ../zh-my-cross-repo-change/api-model
git status   # 已自动在正确的分支上
```

### 管理分组

在 **Groups** 屏幕中可以：
- `n` -- 在已有分组中新建 worktree。
- `c` -- cleanup（删除）选中的 worktree 分组。
- `p` -- 安全清理 stale worktree。
- `s` -- 修复断开的符号链接。
- `r` -- 刷新分组列表。

---

## 配置

在 workspace 根目录放置 `.lazyworktree.json` 文件。也可以通过 Settings 屏幕更新同一文件。

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

| 字段 | 说明 |
|-------|------|
| `language` | `"auto"`、`"zh"` 或 `"en"` |
| `gui.showBottomLine` | 显示/隐藏底部的快捷键提示条 |
| `symlinks.names` | 需要符号链接到每个 worktree 的文件/目录 |
| `baseBranch.default` | `"auto"`（自动探测 `origin/HEAD`）或显式指定 `"origin/main"` |
| `baseBranch.projects` | 按项目覆盖基准分支，例如 `{ "room-server": "origin/release/2.0" }` |

---

## CLI 选项

```bash
lazyworktree --help

Options:
  --projects <list>      逗号分隔的项目列表
                         （如 "api-model,room-server" 或 "api-model,ypzb:bugfix-room"）
  --feature <branch>     默认 feature 分支名
  --language <locale>    UI 语言：auto、zh 或 en
  --hide-bottom-line     隐藏底部快捷键提示
```

---

## 常用操作

| 操作 | 命令 |
|--------|---------|
| 安装 | `npm install -g lazyworktree` |
| 更新 | `npm update -g lazyworktree` |
| 卸载 | `npm uninstall -g lazyworktree` |
| 启动 TUI | `lazyworktree` |
| 指定中文界面启动 | `lazyworktree --language zh` |
| 快速创建 | `lazyworktree --projects api-model,room-server --feature feature/foo` |

---

## 常见问题

**问：应该在哪个目录下运行 lazyworktree？**

在 workspace 根目录下运行 -- 即你的 Git 仓库作为直接子目录的那个父目录。不支持在单个仓库内部运行。

**问：它是如何发现 Git 仓库的？**

它只扫描当前工作目录的**直接子目录**中带有 `.git` 子目录的文件夹。不会扫描嵌套的仓库。

**问：如果目标目录已存在怎么办？**

该项目会被跳过并显示警告。已有的 worktree 不会被覆盖。

**问：如果工作区有未提交的更改呢？**

计划界面会为每个项目显示脏标志。你可以决定是继续执行还是先清理。

**问：需要什么 Node.js 版本？**

Node.js 18 或更新版本。

---

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
```
