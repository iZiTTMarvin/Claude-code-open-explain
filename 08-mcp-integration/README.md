# 08 — MCP 协议集成

> MCP 让 Claude Code 不再局限于内置工具，而是拥有可持续扩展的外部能力入口

## 为什么这一章重要

想象一下这个场景：

你的团队有一套内部知识库系统，里面记录了所有项目的架构文档、最佳实践、常见问题解决方案。这些知识对编程工作非常有价值，但它们不在你的代码仓库里，而是在一个独立的服务里。

**如果没有 MCP，会发生什么？**

Claude Code 再聪明，也看不到这些知识。你只能：
1. 手动去知识库查询
2. 把相关内容复制粘贴到对话里
3. 让 Claude Code 基于这些信息工作

这个过程很低效，而且容易遗漏关键信息。

**有了 MCP 之后呢？**

你可以写一个 MCP 服务器，把知识库接入 Claude Code。然后：
1. Claude Code 可以直接调用”搜索知识库”工具
2. 模型自己决定什么时候需要查询
3. 查询结果自动进入上下文
4. 整个过程无缝衔接

**这就是 MCP 的价值：让 Claude Code 从”固定能力集合”变成”可持续扩展的平台”。**

### 更深一层：为什么需要统一协议？

你可能会想：”我直接给 Claude Code 加一个内置工具不就行了？”

**问题是：**

1. **内置工具需要修改源码**：每次加新能力都要改 Claude Code 本身，维护成本很高
2. **不同团队有不同需求**：A 团队需要接入 Jira，B 团队需要接入 Linear，C 团队需要接入自研系统
3. **外部服务在不断变化**：API 升级、功能调整，如果都写死在内置工具里，会很难维护

**MCP 的解决方案：**

定义一套统一协议，让外部服务可以”自我描述”：
- 我提供哪些工具
- 每个工具接收什么参数
- 如何调用这些工具

Claude Code 只需要：
1. 连接 MCP 服务器
2. 读取服务器提供的能力描述
3. 把这些能力当成普通工具暴露给模型

**这样，扩展能力就变成了”配置问题”，而不是”开发问题”。**

### 一个真实的对比

**没有 MCP 的世界：**
```text
想接入新能力
  ↓
修改 Claude Code 源码
  ↓
添加新的工具定义
  ↓
实现工具逻辑
  ↓
测试、打包、发布
  ↓
用户更新 Claude Code
  ↓
才能使用新能力
```

**有 MCP 的世界：**
```text
想接入新能力
  ↓
写一个 MCP 服务器（可以用任何语言）
  ↓
在配置文件里添加服务器地址
  ↓
重启 Claude Code
  ↓
立刻可以使用新能力
```

**这不只是”方便一点”，而是从根本上改变了扩展模式。**

如果没有 MCP，Claude Code 再强，本质上也只是一个”内置工具很丰富的 CLI”。有了 MCP 之后，它就变成了一个”可以接入任何外部能力的平台”。

这就是为什么 MCP 在 Claude Code 里不是配件，而是扩展边界的关键机制。

## 本章关键源码入口

| 文件 | 作用 |
|------|------|
| `src/services/mcp/config.ts` | `parseMcpConfig()` / `filterMcpServersByPolicy()`：配置校验、环境变量展开、策略过滤 |
| `src/services/mcp/client.ts` | `getMcpToolsCommandsAndResources()` / `prefetchAllMcpResources()`：连接后拉取 tools / commands / skills / resources |
| `src/services/mcp/types.ts` | MCP 服务器配置与传输类型定义 |
| `src/tools/MCPTool/MCPTool.ts` | MCP 工具在统一工具体系里的外壳 |
| `src/constants/prompts.ts` | `mcp_instructions`：MCP 指令如何影响 prompt 与 cache 结构 |

## 先用新手能懂的话说：MCP 到底解决什么问题

Claude Code 的内置工具再多，也不可能提前内建所有能力。

例如你可能还想让它接入：

- GitHub
- 数据库
- 浏览器
- 设计工具
- 内部服务
- 企业知识系统

MCP 的作用就是：

> 用统一协议把这些外部能力接进 Claude Code，让模型像调用内置工具一样调用它们。

## MCP 在 Claude Code 里不只是一种“远程调用”

从源码来看，Claude Code 通过 MCP 接入的不只是工具，还可能涉及：

- Tools
- Resources
- Instructions
- 某些和命令或技能索引相关的扩展信息

这说明 MCP 在 Claude Code 里的角色，不只是“RPC 插件系统”，而是更接近“外部能力总线”。

从 `getMcpToolsCommandsAndResources()` 的实现再往前看一步，这个判断其实是有明确代码支撑的：

- 会拉 tools
- 会拉 commands
- 会拉 skills
- 会拉 resources

而且首次遇到支持 resources 的 server 时，还会把资源读取相关的工具一起注入。

## `MCPTool` 为什么看起来像个空壳

如果你去看 `src/tools/MCPTool/MCPTool.ts`，会发现一个很有意思的现象：

- 名称是占位的
- 描述是占位的
- `call()` 也是占位的

这说明什么？

说明 `MCPTool` 并不是具体某个 MCP 工具本身，而是：

> MCP 工具接入 Claude Code 统一工具体系时使用的通用外壳。

真正的服务器名、工具名、参数和执行逻辑，会在更高层的 MCP 客户端逻辑里被补齐和路由。

## Claude Code 支持哪些 MCP 连接类型

从 `src/services/mcp/types.ts` 和相关工具函数可以看到，MCP 连接类型比很多入门资料写得更丰富。

常见类型包括：

- `stdio`
- `sse`
- `http`
- `ws`
- `sdk`

某些 IDE 相关场景下还会出现更细的变体。

这说明 Claude Code 的 MCP 体系并不是只为一种部署方式设计，而是从一开始就在兼容：

- 本地进程型 MCP
- 远程服务型 MCP
- 更深度集成到 SDK 或 IDE 的 MCP

## MCP 接入前先过“配置校验 + 策略过滤”

这一点很重要，因为它解释了为什么 `config.ts` 会这么厚。

从 `parseMcpConfig()` 和 `filterMcpServersByPolicy()` 可以看出，接入一台 MCP server 前至少会先做：

- schema 校验
- 环境变量展开
- 缺失环境变量告警
- 某些平台特定命令形状检查
- enterprise / policy allowlist 过滤

所以 MCP 在 Claude Code 里不是“先连上再说”，而是：

> 先判断这个 server 配置是否合法、可展开、被允许，再决定它有没有资格进入系统。

## MCP 接入不是“配上地址就完了”

Claude Code 在 MCP 上做了很多产品级处理，例如：

- 配置解析
- 企业策略过滤
- 认证处理
- 重连管理
- 动态头生成
- 工具名与服务器名归一化

所以源码里的 MCP 目录会很厚，这不是过度设计，而是因为真实世界里的外部连接本来就复杂。

### 连接层本身也不是“一把梭”

`getMcpToolsCommandsAndResources()` 还会把 server 分成本地和远程两组，再分别按不同并发策略处理。  
这说明 Claude Code 不是把所有 MCP 连接都当成同一种成本模型。

## 为什么 MCP 配置还要经过策略过滤

从 `config.ts` 可以看到，Claude Code 会对 MCP 服务器配置做 allowlist / denylist 级别的过滤。

这件事非常重要，因为 MCP 不只是“扩展能力”，它也是新的风险入口：

- 可以带来新工具
- 可以带来新资源
- 可能需要执行本地命令
- 可能需要连接远程服务

所以 MCP 不是接进来就算完，而是要先判断“这台服务器是否允许存在”。

再说得更直白一点：

- `sdk` 类型有自己的特殊放行逻辑
- 其它 server 要先过 policy 判断
- blocked server 不会只是“稍后失败”，而是会在更前面就被剔出去

## 认证为什么会成为 MCP 体系的大头

从 `auth.ts` 可以看出，Claude Code 对 MCP 认证投入了很多代码量。

这背后的现实原因是：

- 远程 MCP 常常需要 OAuth
- 令牌可能过期
- 不同服务的认证细节并不一致
- 企业环境往往还有额外要求

也就是说，MCP 真正难的地方从来不只是“调用 tool”，而是“把一个外部系统可靠地接进来并长期维持可用”。

## MCP 为什么会影响 Prompt Cache

这也是 Claude Code 很有代表性的工程细节。

很多 MCP 服务器会自带 `instructions`。这些指令如果直接进 System Prompt，会带来一个问题：

- MCP 服务器是动态的
- 连接状态会变化
- 服务器提供的指令也可能变化

一旦这些变化进入稳定 prompt 前缀，就会破坏缓存稳定性。

所以源码里会特别强调：

- `mcp_instructions` 是高波动内容
- 更好的做法是转成 `mcp_instructions_delta` 这类消息级机制

这说明 MCP 集成不是单独一个目录的事情，它还会反向影响 Prompt 与 Cache 架构。

这一点在 `prompts.ts` 的注释里写得非常直接：

> 如果服务器在 turn 之间连接/断开，继续每轮重算 `mcp_instructions` 会打爆 prompt cache。

所以 Claude Code 不是“后来发现缓存变差了再补救”，而是已经把 MCP instructions 视为高波动区，主动往 attachment 机制迁。

## MCP 结果为什么还要考虑大输出处理

从 `client.ts` 的实现可以看出来，Claude Code 还会处理这样的问题：

- MCP 返回内容太长怎么办
- 是否需要持久化到文件再提示读取
- 图片或特殊内容如何传递

这说明它不是只关心“请求发出去有没有回”，还关心：

> 回来的内容能不能以模型和用户都可承受的方式继续进入下一轮。

这和前面工具系统那一章其实是能接上的：

- 内置工具和 MCP 工具进入同一执行池
- 但 MCP 结果在元数据、输出体量、后处理上会更容易带来特殊情况

所以 MCP 真正难的地方，不只是“接入”，还包括“接入后怎么继续稳定地待在主链里”。

## 为什么说 MCP 让 Claude Code 变成平台

有了 MCP 以后，Claude Code 的能力边界不再由“内置多少工具”决定，而是由：

- 你接入了哪些 MCP 服务器
- 这些服务器提供了哪些工具与资源
- 权限与策略允许接入到什么程度

这就是平台型系统和单体工具的本质差别。

## 新手常见误区

### 误区 1：MCP 就是插件

不完全对。插件是实现形态之一，但在 Claude Code 里，MCP 更像统一扩展协议。

### 误区 2：MCP 只是工具调用转发

不对。它还涉及资源、指令、认证、连接管理和策略过滤。

### 误区 3：外部能力越多越好

不对。MCP 带来扩展性的同时，也带来缓存、安全、权限和可靠性成本。

### 误区 4：MCP 连接成功就等于已经完成接入

不对。Claude Code 还要继续处理 policy、命令/技能/资源注入、instructions 波动、结果输出体量与后处理。

## 本章小结

Claude Code 的 MCP 体系说明了一个成熟产品的扩展思路：

- 用统一协议接入外部能力
- 用统一工具体系向模型暴露这些能力
- 用策略、认证和连接管理兜住现实复杂度
- 用 Prompt/Cache 层配合处理高波动信息
- 用本地/远程分组和分批连接，承认不同 MCP server 的接入成本不同
- 把 `mcp_instructions` 迁到 delta/attachment 思路，说明 MCP 已经反向塑造了系统提示结构

## 下一步

- [03 — 工具系统架构](../03-tool-system/)：回头再看工具层，会更理解为什么 MCP 工具必须被统一包装
- [06 — Prompt Cache 优化](../06-prompt-caching/)：继续看高波动 MCP 指令为什么必须被挪出稳定前缀
