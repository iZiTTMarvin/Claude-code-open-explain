# Wave 1 Main Flow Map

## 目标

这份文档是 Wave 1 的主链路母文档。  
所有 evidence、section manifest 和章节回填，都必须引用这里的 `MF-*` 编号。

## Hero Flow

Wave 1 主链路采用：

> 用户发起一个需要读文件、改文件、执行命令，并且过程中触发权限确认的任务

这条线不是为了“覆盖一切”，而是为了先建立一条最有教学价值的核心运行图。

## Main Flow

```text
MF-01 用户在终端提交任务
  ->
MF-02 CLI 启动并初始化运行时
  ->
MF-03 组装系统规则、用户上下文、工具上下文
  ->
MF-04 发起主循环中的模型请求
  ->
MF-05 模型提出 tool_use
  ->
MF-06 权限系统判定是否可执行
  ->
MF-07 工具真正执行并生成结果
  ->
MF-08 tool_result 回填消息流
  ->
MF-09 循环继续 / compact / 终止
  ->
MF-10 最终输出渲染并结束当前会话
```

## 对照流

Wave 1 不全面展开对照流，但要在索引层保留：

### Contrast Flow A: Read-only analysis

```text
用户只要求读取与解释
  ->
主循环仍运行
  ->
主要使用 read/search 类工具
  ->
权限模型更偏向自动放行
```

### Contrast Flow B: Long-context compact/resume

```text
会话变长
  ->
token budget 接近阈值
  ->
autoCompact / related recovery 介入
  ->
会话继续或恢复
```

## 主链路到源码入口的第一版映射

| Step | 说明 | 第一批入口文件 |
|---|---|---|
| `MF-01` | 用户任务进入 CLI | `src/main.tsx` |
| `MF-02` | 启动、配置、权限初始化、工具加载 | `src/main.tsx` |
| `MF-03` | 上下文与规则组装 | `src/context.ts`, `src/utils/queryContext.ts`, `src/utils/systemPrompt.ts` |
| `MF-04` | 主循环配置与模型请求发起 | `src/query.ts`, `src/query/config.ts`, `src/services/api/claude.ts` |
| `MF-05` | tool_use 被识别与分派 | `src/query.ts`, `src/Tool.ts`, `src/tools.ts`, `src/services/tools/toolOrchestration.ts` |
| `MF-06` | 权限模式、规则、危险判定 | `src/utils/permissions/permissionSetup.ts`, `src/utils/permissions/permissions.ts`, `src/utils/permissions/PermissionMode.ts` |
| `MF-07` | 工具执行 | `src/services/tools/toolExecution.ts`, `src/services/tools/toolOrchestration.ts` |
| `MF-08` | tool_result 进入消息流 | `src/query.ts`, `src/utils/messages.ts`, `src/utils/toolResultStorage.ts` |
| `MF-09` | compact / continue / stop | `src/query.ts`, `src/services/compact/autoCompact.ts`, `src/query/stopHooks.ts` |
| `MF-10` | 输出渲染、交互结束 | `src/interactiveHelpers.tsx`, `src/cli/print.ts`, `src/screens/REPL.tsx` |

## Wave 1 最低产物要求

每个 `MF-*` 至少要补齐：

- 1 个明确的源码入口
- 1 个 `evidence_id`
- 1 段中文解释
- 1 段工程取舍说明
- 关联到至少 1 个章节

## 不要混淆的事

- `main flow` 不是章节目录
- `chapter` 不是事实层
- `evidence` 不是最终读者文案
- `README` 不是事实真相源

## 当前源码快照

- Repo: `D:\visual_ProgrammingSoftware\毕设and简历Projects\Claude-code-open`
- Commit: `33bf4acc3b902ce607d93f069578666d82743e58`
- Branch: `main`
