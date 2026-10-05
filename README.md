# claude-deck

本机自用的 Claude Code 图形界面：浏览、并行运行、随时切换多个 Claude Code 会话。会话数据和 CLI 共享，GUI 里的会话随时可以回 CLI 接着用，反之亦然。

只监听 `127.0.0.1`，并校验 `Host` / `Origin`，其他网页无法借你的浏览器操纵它。

## 运行

需要 Node `^20.19.0 || >=22.12.0`，以及已经登录过的 Claude Code。

```powershell
git clone https://github.com/Hengsheng-777/claude-deck.git
cd claude-deck
npm install
npm run build
npm start
```

然后打开 <http://127.0.0.1:3457>。

## 开发

```powershell
npm run dev        # 后端 3457 + Vite 5173，打开 http://127.0.0.1:5173
npm test           # 单元测试
npm run typecheck  # 类型检查
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CLAUDE_DECK_PORT` | `3457` | 后端端口 |
| `CLAUDE_DECK_ROOT` | Windows 上为 `D:\IdeaProjects`（存在时），否则为用户主目录 | 新建会话时路径补全的起始目录 |
| `CLAUDE_DECK_CLAUDE_PATH` | 不设置 | 指定 `claude` 可执行文件；不设置则使用 Agent SDK 自带的 |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude Code 自己的变量，claude-deck 跟随它 |

## 文档

- [GLOSSARY.md](./GLOSSARY.md)：术语表
- [docs/adr/](./docs/adr/)：架构决策记录
