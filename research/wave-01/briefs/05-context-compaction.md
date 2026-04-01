# Wave 1 Brief 05: Context Compaction

## Role

负责 `MF-09` 中的 token 阈值、auto compact、恢复与续跑。

## Must Cover

- `src/services/compact/autoCompact.ts`
- `src/services/compact/compact.ts`
- 必要时补看 `src/query.ts`

## Chapter Targets

- `05-context-management`
- `06-prompt-caching`

## Must Answer

1. auto compact 何时触发？
2. effective context window 是如何计算的？
3. compact 为什么要为 summary 预留输出 token？
4. 哪些 query source 会被排除在 auto compact 之外？
5. 这一层和主循环的停止/继续逻辑是怎么衔接的？

## Out Of Scope

- 不负责权限模式
- 不负责工具注册

## Output

- 至少 3 条 evidence
- 至少 1 条 evidence 解释 threshold / buffer 的关系
