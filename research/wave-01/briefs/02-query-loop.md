# Wave 1 Brief 02: Query Loop

## Role

负责 `MF-04`、`MF-05`、`MF-08`、`MF-09` 中与主循环和消息流相关的路径。

## Must Cover

- `src/query.ts`
- `src/query/config.ts`
- `src/query/stopHooks.ts`
- `src/services/api/claude.ts`

## Chapter Targets

- `00-overview`
- `02-agentic-loop`
- `05-context-management`

## Must Answer

1. 主循环从哪一步开始进入真正的 agent loop？
2. 消息在进入 API 前做了哪些归一化？
3. tool_use 和 tool_result 在消息流里怎么来回流动？
4. 循环为什么会继续、停止、或进入 compact 路径？
5. 哪些分支最容易被读者误解成“黑盒”？

## Out Of Scope

- 不负责工具内部执行实现
- 不负责权限模式的规则细节

## Output

- 至少 4 条 evidence
- 至少覆盖 `MF-04`、`MF-05`、`MF-08`、`MF-09`
