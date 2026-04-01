# 07 — 多 Agent 协作

> Claude Code 的并发不是把一个 loop 变复杂，而是把多个独立 agent 组织起来协作

## 为什么这一章值得看

很多人第一次听到”多 Agent”，会自然地想到”并发”和”多线程”。但 Claude Code 的多 Agent 设计，解决的不是”怎么让一个代理跑得更快”，而是一个更根本的问题：

**当任务变复杂时，如何让系统既能完成工作，又不会被自己的复杂度压垮？**

让我们先看一个真实场景：

### 场景：重构一个复杂模块

假设你让 Claude Code 帮你”重构 auth 模块，提升安全性”。这个任务看起来简单，但实际上包含很多子任务：

1. **探索阶段**：理解现有代码结构、找到所有相关文件、分析依赖关系
2. **规划阶段**：设计新的架构、确定修改方案、评估风险
3. **实施阶段**：修改代码、更新测试、调整配置
4. **验证阶段**：检查修改是否完整、测试是否通过、是否有遗漏

**如果用单个 Agent 完成所有工作，会发生什么？**

它的上下文会迅速膨胀：
- 探索阶段读了 20 个文件（几万 token）
- 规划阶段生成了详细方案（几千 token）
- 实施阶段的每次修改都要记录（几千 token）
- 验证阶段的测试输出（几千 token）

**结果：**
- 上下文窗口很快被填满
- 模型开始”忘记”之前的决策
- 成本和延迟都在上升
- 任务连续性开始断裂

### Claude Code 的解决方案：任务隔离

不是让一个 Agent 做所有事，而是：

```text
主 Agent：
  “我需要重构 auth 模块”
  ↓
  生成子 Agent 1（Explore）：
    “去探索 auth 相关的所有代码”
    → 子 Agent 在自己的上下文里读了 20 个文件
    → 返回一个简洁的摘要给主 Agent
  ↓
  生成子 Agent 2（Plan）：
    “基于探索结果，制定重构方案”
    → 子 Agent 在自己的上下文里设计方案
    → 返回一个可执行的计划给主 Agent
  ↓
  主 Agent 自己执行修改
  ↓
  生成子 Agent 3（Verification）：
    “验证修改是否完整”
    → 子 Agent 在自己的上下文里检查
    → 返回验证结果给主 Agent
```

**这样做的好处：**

1. **主 Agent 的上下文保持清爽**：它只需要记住”探索摘要””执行计划””验证结果”，而不是所有中间细节
2. **每个子 Agent 专注做一件事**：Explore Agent 只管探索，Plan Agent 只管规划，不会互相干扰
3. **成本和延迟可控**：子 Agent 的工作在独立上下文里完成，不会污染主线程
4. **任务连续性更好**：即使某个子 Agent 的上下文很长，也不会影响主 Agent 的决策能力

**这就是为什么 Claude Code 的多 Agent 不是”并发优化”，而是”上下文隔离工具”。**

它解决的核心问题不是”怎么跑得更快”，而是”怎么在复杂任务中保持清醒”。

## 本章关键源码入口

| 文件 | 作用 |
|------|------|
| `src/tools/AgentTool/builtInAgents.ts` | `getBuiltInAgents()`：按 feature gate / entrypoint 生成内置 agent 集合 |
| `src/tools/AgentTool/loadAgentsDir.ts` | `getActiveAgentsFromList()`：把 built-in / plugin / user / project / policy agent 合并成最终 active list |
| `src/utils/swarm/spawnInProcess.ts` | `spawnInProcessTeammate()`：创建 in-process teammate 的正式生命周期 |
| `src/tools/TeamCreateTool/TeamCreateTool.ts` | `TeamCreateTool.call()`：创建 team file、task list、team context |
| `src/utils/swarm/backends/registry.ts` | backend registry：决定 teammate 用什么后端运行 |

## 先建立一个核心认知

Claude Code 的多 Agent，不是“一个上下文里塞很多人格”，而是：

- 不同 agent 拥有不同职责
- 很多 agent 有自己独立的上下文
- 主 agent 最终只接收摘要或结果

这点非常重要，因为它解释了为什么多 Agent 在这里是**上下文隔离工具**，而不只是并行工具。

## 最常见的 3 层多 Agent 形态

### 1. 单个子 Agent

这是最基础的形态。主 agent 发现任务太大或太适合拆出去时，会通过 `AgentTool` 生成一个子 agent。

### 2. 团队模式

当任务天然可以拆成多块时，Claude Code 可以通过 `TeamCreateTool` 进入团队协作形态。

### 3. 协调器模式

源码里还能看到更高层的 `COORDINATOR_MODE`，说明系统还预留了更强的统一调度形态。

## `AgentTool` 解决的核心问题是什么

你可以把 `AgentTool` 理解成“把一个局部任务单独开辟到新工作台”的能力。

它带来的价值主要有 3 个：

### 1. 上下文隔离

子 Agent 可以自己读很多文件、试很多路径，而不用把所有中间噪音都塞回主对话。

### 2. 职责聚焦

某个子 Agent 只做一件事，例如：

- 探索代码库
- 做计划
- 验证修改结果

### 3. 主线程减负

主 Agent 不必亲自处理每个细碎步骤，只要接收关键摘要即可。

## Claude Code 里已经有哪些内置 Agent

从 `builtInAgents.ts` 可以看到，源码里至少有这些内置 agent 概念：

- `general-purpose`
- `statusline-setup`
- `Explore`
- `Plan`
- `claude-code-guide`
- `verification`

这点很值得注意，因为它说明 Claude Code 并不是只有“一个万能代理”，而是已经开始把不同工作职责模块化。

### 但这里要补一个更准确的事实

这些内置 agent 不是一张永远固定不变的菜单。  
从 `getBuiltInAgents()` 的逻辑看，它们会受下面这些因素共同影响：

- 当前是不是 SDK / 非交互场景
- `EXPLORE_AGENT` / `PLAN_AGENT` 相关 feature gate 是否打开
- 某些实验开关是否打开
- 某些 entrypoint 下是否应该显示 `claude-code-guide`

所以更准确的说法是：

> Claude Code 有一批内置 agent 类型，但它们是否出现在当前会话里，仍然要看运行时条件。

### 为什么这很重要

因为当 agent 类型被明确命名后，系统才更容易做到：

- 每类 agent 有更明确的使用场景
- 每类 agent 可以带不同工具集或提示词
- 不同 agent 的输出格式更可预期

而且 agent 定义本身还不是最终答案。  
从 `loadAgentsDir.ts` 的合并逻辑看，active agent 列表会按 source 分层覆盖：

- built-in
- plugin
- user settings
- project settings
- flag settings
- policy settings

同名 agent 后写入的定义会覆盖前面的定义。  
这说明 Claude Code 的 agent 体系不是“只读常量表”，而是一个可被多层配置重写的系统。

## 团队模式不是“多开几个 agent”这么简单

`TeamCreateTool.ts` 里能看到，它在创建团队时不仅仅是生成几个成员，还会连带处理：

- 团队名
- 团队文件
- leader agent id
- task list 目录
- 当前 session 与 team 的绑定关系

这说明团队模式在 Claude Code 里已经不是一个临时技巧，而是有状态、有元数据、有生命周期管理的正式能力。

再往下看一层，`TeamCreateTool.call()` 实际上还会：

- 生成唯一 team name
- 写 team file
- 为 session 注册 cleanup
- 重置并创建任务目录
- 设置 leader team name
- 把 teamContext 写入 `AppState`

所以你可以把 Team 模式理解成：

> 一个带持久化元数据和任务目录的协作状态，不只是临时把几个 agent 叫起来。

## 为什么多 Agent 要保存团队文件和任务目录

因为多 Agent 一旦进入真实工作流，就不再只是“脑内分工”。

系统需要知道：

- 团队是谁
- leader 是谁
- 成员是谁
- 当前任务怎么分配
- 会话结束后如何清理

这也是为什么 Team 模式会比单个 `AgentTool` 重得多。  
它不仅在处理推理分工，也在处理协作状态。

## 多 Agent 最大的收益其实不是“更快”，而是“更稳”

很多人提到多 Agent，第一反应是并行提速。

但从 Claude Code 的实现思路看，另一个更大的收益是：

> 把不同任务的上下文、职责和中间过程拆开，减少相互污染。

例如：

- 一个 agent 专门探索目录结构
- 一个 agent 专门验证结果
- 主 agent 只保留高层决策与摘要

这样主上下文会更干净，也更容易持续推进。

### `spawnInProcessTeammate()` 很能说明这一点

这条路径最值得注意的不是“能 spawn”，而是它怎么保证隔离：

- 给 teammate 单独生成 `agentId`
- 单独生成 `taskId`
- 单独创建 `AbortController`
- 单独构造 `teammateContext`
- 把它注册成正式 task state

而且源码里还明确写了：

> teammate 不应该因为 leader 的 query 被中断就一起 abort

这说明 Claude Code 的多 Agent 不是简单的“主线程开分身”，而是认真在做生命周期隔离。

## `forkSubagent` 为什么值得关注

源码里还能看到 `forkSubagent` 这类实验性能力。

它反映的不是“又多了一个新花样”，而是一个更细的架构思路：

> 有些时候，不需要从零创建一个全新子 agent，而是可以基于现有上下文做受控分叉。

这说明 Claude Code 的多 Agent 体系正在朝更灵活的上下文复用方向演进。

## 为什么说“并发能力”其实建立在后端抽象之上

从 `utils/swarm/backends/registry.ts` 这条链可以看出来，Claude Code 并没有把多 Agent 写死成某一种运行后端。

它会根据环境走不同路径，例如：

- in-process backend
- pane backend executor
- tmux / iTerm2 一类 pane-based backend

所以多 Agent 真正抽象出来的不是“开几个 agent”，而是：

> 用统一 teammate executor 接口，把不同运行载体包装成同一套协作模型。

## 协调器模式说明了什么

`COORDINATOR_MODE` 虽然不是所有用户都能直接看到的公开能力，但它暴露了很重要的产品方向：

- Claude Code 不满足于只有“主 agent + 子 agent”
- 它在尝试更高层的组织方式
- 多 Agent 可能不是特例，而会逐步成为更正式的工作范式

这也是为什么读源码时，不应该把多 Agent 看成边角实验。

## 多 Agent 的代价是什么

这一章不能只讲收益，也要看到成本。

引入多 Agent 后，系统要额外解决：

- 上下文隔离与复用边界
- 结果汇总格式
- 权限同步
- 生命周期管理
- 会话与团队元数据持久化

所以多 Agent 不是免费午餐。Claude Code 的实现方式之所以值得学，就在于它没有把这些复杂度塞回单个 loop，而是单独建了一层编排能力。

## 新手应该怎么理解“什么时候值得用多 Agent”

你可以先记住一个经验判断：

### 适合拆出去

- 探索型任务
- 验证型任务
- 天然可并行的多模块任务
- 会产生大量中间噪音的局部工作

### 不适合强拆

- 严格依赖上一步输出的细链路
- 本来就很短的线性操作
- 需要主上下文持续连贯判断的任务

Claude Code 的设计也体现了类似思路：并发是增强能力，不是默认模式。

## 新手常见误区

### 误区 1：多 Agent 就是多线程

不准确。Claude Code 更强调职责拆分、上下文隔离和结果汇总。

### 误区 2：子 Agent 做完后主 Agent 会拥有全部细节

不一定。很多时候主 Agent 只需要摘要和结论，这正是隔离价值所在。

### 误区 3：多 Agent 一定更快

不一定。它也会带来编排成本、同步成本和汇总成本。

### 误区 4：多 Agent 只是 UI 层上的几个名字

不对。team file、task list、backend、abort controller、app state 都说明它是运行时正式能力，不是展示层花样。

## 本章小结

Claude Code 的多 Agent 体系体现出一个很清楚的架构原则：

- 单个 agent loop 尽量保持简单
- 真正需要拆分时，用新的 agent 承担局部工作
- 用团队与协调层承接更复杂的协作关系
- 把并发问题转化成多个独立上下文的组织问题
- built-in agent 列表和 active agent 列表都受运行时条件与覆盖链影响
- Team 模式与 in-process teammate 说明它的多 Agent 是有状态、有后端抽象的正式系统

## 下一步

- [02 — Agent Loop 核心循环](../02-agentic-loop/)：回头再看单个 loop，会更理解为什么 Claude Code 不愿意把它做得太并发化
- [08 — MCP 协议集成](../08-mcp-integration/)：继续看这些 agent 如何共享和调用更广泛的外部能力
