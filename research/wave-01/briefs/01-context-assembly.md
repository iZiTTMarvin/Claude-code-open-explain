# Wave 1 Brief 01: Context Assembly

## Role

负责 `MF-02` 与 `MF-03` 中的启动阶段和上下文装配链路。

## Must Cover

- `src/main.tsx`
- `src/context.ts`
- `src/utils/queryContext.ts`
- `src/utils/systemPrompt.ts`

## Chapter Targets

- `00-overview`
- `01-system-prompt`
- `05-context-management`

## Must Answer

1. 启动阶段先准备了哪些运行时能力？
2. `system context` 和 `user context` 从哪里来？
3. 哪些上下文在进入 `query()` 前已经准备好？
4. 哪些对象会进入 `ToolUseContext`？
5. 这里有哪些后续章节必须共享的术语？

## Out Of Scope

- 不负责解释工具执行内部细节
- 不负责解释 compact 触发逻辑
- 不负责给权限模式下结论

## Output

- 至少 3 条 evidence
- 至少覆盖 `MF-02`、`MF-03`
- 所有术语必须引用 `research/glossary.yml`
