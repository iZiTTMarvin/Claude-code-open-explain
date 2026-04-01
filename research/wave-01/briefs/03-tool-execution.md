# Wave 1 Brief 03: Tool Execution

## Role

负责 `MF-05` 与 `MF-07` 中的工具定义、查找、执行和结果结构。

## Must Cover

- `src/Tool.ts`
- `src/tools.ts`
- `src/services/tools/toolOrchestration.ts`
- `src/services/tools/toolExecution.ts`

## Chapter Targets

- `03-tool-system`
- `04-permission-model`

## Must Answer

1. 工具名是如何映射到工具定义的？
2. `getTools()` 和真实执行路径之间是什么关系？
3. 工具编排层和工具执行层怎么分工？
4. tool result 的结构边界是什么？
5. 哪些工具体系会和 MCP/内置工具混在一起，需要特别标注？

## Out Of Scope

- 不负责 UI 展示层
- 不负责 system prompt 组装

## Output

- 至少 4 条 evidence
- 至少 1 条 evidence 明确引用 `findToolByName`
