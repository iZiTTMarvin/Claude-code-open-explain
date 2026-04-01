# Claude-code-open-explain

> 深度解读 Claude Code 的架构设计、运行链路与工程取舍

<p align="center">
  <strong>不只告诉你“它做了什么”，还会讲清楚“它为什么这样设计”</strong>
</p>

<p align="center">
  <a href="#这个项目是什么">这个项目是什么</a> •
  <a href="#如果你是新手先看这里">新手导读</a> •
  <a href="#阅读路线">阅读路线</a> •
  <a href="#目录">目录</a> •
  <a href="#声明">声明</a>
</p>

---

## 这个项目是什么

Claude Code 可以理解为一个运行在本地终端里的 AI 编程编排器。

它自己不是模型本身，而是站在模型和你的电脑之间，负责做这些事：

- 收集当前工作目录、Git 状态、用户配置等上下文
- 动态组装 System Prompt 和工具描述
- 把请求发给模型，并流式接收返回结果
- 在本地执行文件读写、Shell、搜索、MCP 等工具
- 在执行前做权限校验、安全检查和上下文管理

本仓库的目标，不是搬运源码，也不是只贴结论，而是把 `Claude-code-open` 这份公开源码里真正重要的设计讲明白，尤其面向第一次接触 Agent CLI、Prompt Cache、MCP、多 Agent 这些概念的读者。

更具体地说，这个项目想解决的是两件事：

1. 帮你先建立 Claude Code 的整体架构脑图
2. 再帮你真正理解“它为什么要这样设计”

## 当前状态

当前仓库处于 **Wave 1 draft** 阶段。

这表示：

- 章节主线已经建立起来了
- 大部分关键判断已经开始绑定源码 evidence
- 但 evidence registry、section manifest 和正文仍在持续收口

所以你现在看到的是一套**正在快速变深、但仍在继续校准的源码导读**，不是已经完全封板的最终版教材。

## 这个项目不是什么

- 不是 Claude Code 的官方文档
- 不是 Claude Code 的源码镜像仓库
- 不是“看一眼目录就下结论”的浅层解读

这里更像一份“源码导读 + 架构讲义”。

## 为什么值得读

如果你曾经好奇"AI 编程助手到底是怎么工作的"，Claude Code 是一个难得的学习样本。

它的价值不在于某个聪明的算法，而在于它展示了一个真实的工程问题：**如何把一个强大但不可控的大模型，变成一个既能做事、又不会失控的本地工具**。

这个问题听起来简单，但实际上牵扯到一系列相互制约的设计决策：

**安全与自由的平衡**
模型需要足够的权限才能帮你改代码、跑命令，但如果权限过大，一个判断失误就可能删掉重要文件。Claude Code 用多层权限系统、路径校验、命令分析来解决这个矛盾——既不是"什么都不让做"，也不是"什么都直接做"。

**性能与成本的权衡**
每次调用模型都要花钱、花时间。如果每轮都把所有上下文重新发一遍，成本会迅速失控。Claude Code 通过 Prompt Cache、上下文压缩、分层装配来优化这个问题——让模型既能看到足够信息，又不会每次都从零开始。

**简单与完整的取舍**
核心 Agent Loop 可以写得很简单，但真实产品还要处理启动优化、MCP 集成、多 Agent 协作、Feature Flag、错误恢复。Claude Code 的选择是：让核心循环保持直接，把复杂度推到外围层——这样系统既容易理解，又足够完整。

如果你以后想做 AI Coding Agent、带工具调用的终端助手、或者任何需要"让模型安全地操作本地环境"的应用，Claude Code 都是一个非常好的参考样本。

**更重要的是，它展示了一种成熟的工程思维：**

不是"先把功能堆上去，再想办法优化"，而是从一开始就让架构约束（比如缓存需求）反向塑造数据放置方式；不是"把所有逻辑都塞进主循环"，而是明确分层，让每一层各司其职；不是"追求最新技术"，而是在稳定性、性能、安全性之间找到可落地的平衡点。

这些工程取舍，才是这份源码最值得学习的地方。

## 如果你是新手，先看这里

### 先建立 5 个最小概念

1. **System Prompt**：给模型的长期规则，决定角色、边界和风格。
2. **Tool**：模型不能直接操作电脑，只能先请求工具，再由 CLI 代为执行。
3. **Agent Loop**：一次回答如果需要多个工具，就会不断重复“模型思考 -> 调工具 -> 回传结果”。
4. **Context**：模型每次调用时看到的全部输入，包括历史消息、System Prompt、工具结果等。
5. **MCP**：一种把外部工具、资源和能力接入 Claude Code 的协议。

### 再记住一句话

> Claude Code 的本质不是“一个会写代码的黑盒”，而是“一个把模型、安全、工具和上下文组织起来的本地编排层”。

## 这次解读对应哪份源码

本文档主要对应的源码：
https://github.com/iZiTTMarvin/Claude-code-open

按当前公开快照粗略统计，仓库规模大约在：

- `1900+` 个文件
- `48` 万行代码量级
- 主体实现集中在 `src/`

阅读本仓库文档时，文中出现的源码路径默认都指向那份源码仓库的相对路径，例如 `src/main.tsx`、`src/QueryEngine.ts`。

## 快速建立整体直觉

在深入细节之前，先建立一个完整的心智模型。你可以把 Claude Code 想象成一个精密的编排系统，它在模型和你的电脑之间不断协调：

```text
你的终端输入
  ↓
src/main.tsx
  【启动阶段】不是等用户输入后再慢慢准备，而是提前预热关键依赖
  并行触发权限初始化、工具加载、MCP 连接，让后续每一轮查询都能快速响应
  ↓
src/QueryEngine.ts + src/utils/queryContext.ts
  【请求准备】不是简单地”把用户输入发给模型”
  而是先组装三类上下文：systemPrompt（规则）、userContext（项目）、systemContext（环境）
  再包装权限检查、维护消息历史、管理 token 预算
  ↓
src/query.ts / queryLoop()
  【核心循环】这才是真正的心脏
  不断重复：整理消息 -> 调模型 -> 识别 tool_use -> 执行工具 -> 回流 tool_result
  直到模型认为任务完成，或者上下文需要压缩
  ↓
src/tools.ts + src/Tool.ts + src/services/tools/*
  【工具系统】模型看到的不是”电脑上所有能力”
  而是一组经过精心设计的工具接口，每个工具都有清晰的描述、参数约束和权限语义
  编排层决定调用顺序，执行层负责真正运行
  ↓
src/utils/permissions/*
  【权限防线】不是”允许/拒绝”这么简单
  而是多层判定：先看模式（plan/default/auto），再看规则（deny/ask/allow）
  再分析参数（路径是否安全、命令是否危险），最后才决定是否执行
  ↓
src/services/compact/*
  【上下文治理】对话越来越长时，不是简单截断或删除历史
  而是主动压缩：生成摘要、保留边界、维持任务连续性
  让系统在有限窗口内尽可能延续协作
  ↓
src/services/mcp/*
  【扩展能力】外部工具不是”另一套系统”
  而是通过 MCP 协议接入同一套工具体系，共享权限检查、结果回流、上下文管理
```

**如果你只记一句话，可以记成：**

> Claude Code 不是”模型直接在你的电脑上干活”，而是一层不断整理上下文、调度工具、限制风险、再把结果回流给模型的本地编排系统。

**换个更直白的说法：**

模型负责”想”，Claude Code 负责”做”——但在”做”之前，它会先问”能不能做”、”该不该做”、”怎么安全地做”。这套机制，才是 Claude Code 能在真实环境里落地的关键。

## 阅读路线

### 路线 A：完全新手

建议按下面顺序读：

1. [00-overview](./00-overview/)
2. [02-agentic-loop](./02-agentic-loop/)
3. [03-tool-system](./03-tool-system/)
4. [04-permission-model](./04-permission-model/)
5. [05-context-management](./05-context-management/)
6. [01-system-prompt](./01-system-prompt/)
7. [06-prompt-caching](./06-prompt-caching/)

### 路线 B：想自己做 Agent CLI

建议优先看：

1. [02-agentic-loop](./02-agentic-loop/)
2. [03-tool-system](./03-tool-system/)
3. [04-permission-model](./04-permission-model/)
4. [08-mcp-integration](./08-mcp-integration/)
5. [07-multi-agent](./07-multi-agent/)

这条路线最适合你在读源码时抓住一条完整主链：

```text
启动
  ->
上下文装配
  ->
queryLoop
  ->
工具编排与执行
  ->
权限判定
  ->
上下文压缩
  ->
MCP / 多 Agent 扩展
```

### 路线 C：更关心性能与产品化

建议优先看：

1. [01-system-prompt](./01-system-prompt/)
2. [05-context-management](./05-context-management/)
3. [06-prompt-caching](./06-prompt-caching/)
4. [09-startup-optimization](./09-startup-optimization/)
5. [10-feature-flags](./10-feature-flags/)
6. [11-security](./11-security/)

## 目录

| 章节 | 主题 | 这章解决什么问题 | 新手为什么要看 |
|------|------|------------------|----------------|
| [00-overview](./00-overview/) | 全局架构概览 | Claude Code 到底由哪些层组成？ | 建立全局图，避免一上来就陷进细节 |
| [01-system-prompt](./01-system-prompt/) | System Prompt 分层设计 | Prompt 不是一段字符串，而是一套装配系统，这意味着什么？ | 理解模型行为为什么可控 |
| [02-agentic-loop](./02-agentic-loop/) | Agent Loop 核心循环 | 一次用户请求如何变成多轮工具调用？ | 看懂整个产品的心脏 |
| [03-tool-system](./03-tool-system/) | 工具系统架构 | 工具如何注册、描述、执行、返回结果？ | 看懂 AI 为什么能操作本地环境 |
| [04-permission-model](./04-permission-model/) | 权限安全模型 | 工具调用为什么不是直接执行？ | 理解安全边界和确认机制 |
| [05-context-management](./05-context-management/) | 上下文管理与压缩 | 对话越来越长时，系统如何继续工作？ | 理解长上下文和压缩策略 |
| [06-prompt-caching](./06-prompt-caching/) | Prompt Cache 优化 | 为什么源码里到处都在想办法保持 prompt 稳定？ | 理解成本优化与架构约束 |
| [07-multi-agent](./07-multi-agent/) | 多 Agent 协作 | Claude Code 什么时候会拆分子 Agent？ | 理解并行化和任务隔离 |
| [08-mcp-integration](./08-mcp-integration/) | MCP 协议集成 | 外部能力如何无缝接进 Claude Code？ | 理解扩展性从哪里来 |
| [09-startup-optimization](./09-startup-optimization/) | 启动性能优化 | 一个 CLI 为什么也要抠启动毫秒？ | 理解产品级性能工程 |
| [10-feature-flags](./10-feature-flags/) | Feature Flag 体系 | 为什么代码里有这么多隐藏模块和条件导入？ | 学会从 Flag 读产品演进 |
| [11-security](./11-security/) | 安全机制深度分析 | Claude Code 如何避免把高权限 Agent 做成危险软件？ | 理解真实可落地的安全防线 |

## 怎样配合源码一起读

### 推荐方法

1. 先读本章 README，弄清楚本章的核心问题。
2. 再打开文中列出的源码入口文件，不要求一开始逐行读懂。
3. 重点看“函数之间如何协作”，不要一开始纠结每个细节。
4. 每章读完后，再回到总图里确认它在整个系统中的位置。

再补一个很有用的方法：

5. 先分清 **事实层** 和 **解释层**

这里的“事实层”，指的是：

- 具体源码入口
- 真实调用关系
- 明确的状态变化

“解释层”则是：

- 为什么这样设计
- 这样做换来了什么
- 还有哪些代价

如果把这两层分开读，源码会清楚很多。

### 不推荐的方法

- 一上来就全局搜索关键字，然后被大量结果淹没
- 把所有 `feature(...)` 分支都当成稳定公开功能
- 看到某个工具或某个 Hook 就立刻下结论，忽略前后的上下文

## 参考材料

### 源码与逆向资料

- [instructkr/claude-code](https://github.com/instructkr/claude-code)
- [hitmux/HitCC](https://github.com/hitmux/HitCC)
- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)
- [ghuntley/claude-code-source-code-deobfuscation](https://github.com/ghuntley/claude-code-source-code-deobfuscation)

### 分析文章

- [How Claude Code Actually Works (KaraxAI)](https://karaxai.com/posts/how-claude-code-works-systems-deep-dive/)
- [Under the Hood of Claude Code (Pierce Freeman)](https://pierce.dev/notes/under-the-hood-of-claude-code/)
- [Architecture & Internals (Bruniaux)](https://cc.bruniaux.com/guide/architecture/)
- [Digging into the Source (Dave Schumaker)](https://daveschumaker.net/digging-into-the-claude-code-source-saved-by-sublime-text/)

## 贡献

欢迎提交 PR 或 Issue，尤其欢迎这几类补充：

- 纠正文档中的技术细节错误
- 为章节补充流程图、时序图和示意图
- 增加适合初学者的例子、术语解释和阅读提示
- 补充某个具体模块的深挖章节

## 声明

本项目仅用于教育和技术研究。  
本文档不包含 Claude Code 原始源码，只包含对公开可得源码快照的结构分析、架构解读与工程说明。相关知识产权归原项目权利方所有。

---

<p align="center">
  <sub>如果这份文档对你有帮助，欢迎 Star。本仓库会继续把“源码能看见什么”讲得更清楚。</sub>
</p>

## 友情链接

https://linux.do
