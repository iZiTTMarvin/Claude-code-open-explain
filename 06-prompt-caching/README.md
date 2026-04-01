# 06 — Prompt Cache 优化

> Claude Code 不只是“会调用模型”，它还在认真优化每一轮调用到底要不要重算

## 为什么这一章值得单独讲

很多人看到 Prompt Cache，第一反应是：**”这不就是 API 层的一个小优化吗？”**

如果你也这样想，那你会错过 Claude Code 设计中最精妙的一个部分。

**Prompt Cache 在 Claude Code 里不是”最后顺手加一下”，而是”从一开始就影响架构设计”的核心约束。**

让我们先理解一个现实问题：

### 每次调用模型都要花钱，而且不便宜

假设你和 Claude Code 协作一个小时，可能会产生：
- 50 轮对话
- 每轮平均 10000 token 的上下文
- 总共 500000 token 的输入

如果每次都要重新计算这些 token，成本会非常高。但如果大部分 token 可以复用缓存，成本可能降低 90%。

**这不是小优化，而是决定产品能不能商业化的关键因素。**

### 但缓存有一个致命要求：内容必须稳定

Prompt Cache 的工作原理很简单：

```text
第 1 次调用：
  输入：[System Prompt] + [历史消息] + [新消息]
  API：没有缓存，全部重新计算
  成本：高

第 2 次调用：
  输入：[System Prompt] + [历史消息] + [新消息]
  API：发现 [System Prompt] 和上次一样，复用缓存
  成本：低
```

**但如果 System Prompt 变了哪怕一个字符，缓存就全部失效。**

这就带来一个矛盾：

**一方面**，你希望 Prompt 稳定，这样可以复用缓存。

**另一方面**，Prompt 又必须包含一些会变化的信息：
- 当前会话的语言偏好
- 用户的输出风格设置
- MCP 服务器的动态指令
- 某些环境相关的提示

**如果把这些动态信息直接混进 Prompt，会发生什么？**

每次这些信息变化，整个 Prompt 就变了，缓存就失效了。这就像你每次打开冰箱都要重新制冷一样——明明大部分东西没变，却要全部重来。

### 这个矛盾如何解决？

**答案是：让缓存需求反向塑造架构。**

Claude Code 没有把缓存当成”写完代码后再优化”的事情，而是从一开始就让缓存约束影响设计决策：

**决策 1：Prompt 必须分层**

不能把所有内容混在一起，必须明确区分”稳定区”和”动态区”。这就是 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 存在的原因。

**决策 2：高波动信息要迁移**

像 MCP 指令这种频繁变化的内容，不能放在稳定 Prompt 里，要迁移到消息层（`mcp_instructions_delta`）。

**决策 3：上下文要分通道**

`systemPrompt`、`userContext`、`systemContext` 不能混在一起，要分开管理，这样可以更精细地控制缓存边界。

**决策 4：某些状态要在会话内锁定**

有些配置如果在会话中途来回变，会不断破坏缓存。所以某些值会在会话开始时”锁定”，直到会话结束才允许变化。

**这些决策都不是”为了代码好看”，而是”为了让缓存能真正发挥作用”。**

### 一个具体的例子：为什么 CLAUDE.md 不进稳定前缀

直觉上你可能会觉得：`CLAUDE.md` 是项目规则，应该放进 System Prompt 啊？

**但 Claude Code 没有这样做。**

原因很务实：
- `CLAUDE.md` 很重要，但它也很容易变化
- 每次用户修改项目规则，`CLAUDE.md` 就会变
- 如果它在稳定 Prompt 前缀里，每次变化都会破坏缓存

所以 Claude Code 把它放进了 `userContext` 这一侧——作为会话上下文参与，而不是污染稳定前缀。

**这就是”让缓存需求反向塑造数据放置方式”的典型案例。**

### 这种设计哲学的深层意义

很多系统的架构演进是这样的：

```text
1. 先实现功能
2. 发现性能问题
3. 加缓存优化
4. 发现缓存效果不好
5. 重构代码以适应缓存
```

**Claude Code 的做法是反过来的：**

```text
1. 先识别缓存约束
2. 让架构从一开始就适应缓存
3. 实现功能时遵守缓存友好的设计
4. 缓存自然就能发挥作用
```

这种”让约束塑造架构”的思维，不只适用于缓存，也适用于其他工程问题：
- 让安全需求塑造权限系统
- 让成本约束塑造上下文管理
- 让用户体验塑造错误恢复机制

**这才是 Claude Code 最值得学习的地方——不是某个具体技巧，而是这种成熟的工程思维。**

> 注：本章当前仍属于 **Wave 1 draft**。核心判断已经有证据支撑，但部分细节仍在继续补齐。

## 本章关键源码入口

| 文件 | 作用 |
|------|------|
| `src/constants/prompts.ts` | 定义静态/动态分界标记 |
| `src/utils/queryContext.ts` | 明确哪些内容属于 API cache-key 前缀 |
| `src/context.ts` | 生成会进入上下文前缀的系统/用户上下文 |
| `src/bootstrap/state.ts` | 保留某些会话级状态，避免无谓打爆缓存 |

## 新手先改掉一个过于简单的理解

很多文章会把 Claude Code 的缓存优化概括成：

> 它把 system prompt 分成静态和动态两部分。

这句话只说对了一半。

从 `src/utils/queryContext.ts` 的注释可以看出来，真正会参与 API 缓存前缀构建的，不只是 `systemPrompt`，还包括：

- `systemPrompt`
- `userContext`
- `systemContext`

所以 Claude Code 关心的并不是“System Prompt 要稳定”这么简单，而是：

> 整个请求前缀里，哪些内容必须稳定，哪些内容必须隔离。

这里还可以再更具体一点：

- `systemPrompt` 本身也不是单一来源
- 它是运行时按优先级装配出来的 effective system prompt
- query 前还会把 `userContext`、`systemContext` 和消息做一层整理

所以 cache 讨论的对象从来不是“一段 prompt”，而是“一段前缀结构”。

## `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 的意义

在 `src/constants/prompts.ts` 里，最醒目的标记之一就是：

```typescript
export const SYSTEM_PROMPT_DYNAMIC_BOUNDARY =
  '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'
```

它本质上是在做一件事：

> 给 System Prompt 的组装结果打一条分界线，告诉后续逻辑哪里之前尽量稳定，哪里之后允许变化。

这条边界非常重要，因为一旦把高波动内容混进前缀，缓存收益就会迅速下降。

这也是为什么要把系统提示词理解成“优先级树 + 边界线”，而不是一段固定模板：

- override
- coordinator
- agent
- custom
- default
- append

## 为什么 Claude Code 会对“动态内容泄漏”这么敏感

因为动态内容一旦混进稳定区域，就会引发连锁问题：

1. 这轮请求的前缀和上一轮不同
2. 缓存更难复用
3. 更容易发生 cache creation
4. 成本和延迟都上去

这也是为什么 Claude Code 源码里反复出现类似这种思路：

- 稳定内容尽量长期稳定
- 波动内容尽量移出稳定前缀
- 某些高波动内容甚至不要放进 System Prompt

从这轮拿到的 compact 证据再反看，会发现这不是“缓存团队自己的执念”，而是整条主链的约束：

- compact summary 要不要限制输出上限，会影响 cache key
- 某些 compact 路径宁可不显式设置 `maxOutputTokens`，也要保住缓存复用

## `CLAUDE.md` 为什么不进入稳定前缀

如果你已经看过上一章，就会更容易理解：

- `CLAUDE.md` 很重要
- 但它也很容易随着项目变化而变化

如果把它粗暴塞进稳定 prompt 前缀，会让本来可复用的部分变得更不稳定。

所以 Claude Code 更愿意把这类项目级规则放进 `userContext` 这一侧，由系统统一管理，而不是污染那条尽量稳定的前缀。

这和 query 前装配路径是能对上的：

- `getSystemPrompt(...)`
- `getUserContext()`
- `getSystemContext()`

它们是并发获取、分通道进入本轮请求的。

## MCP 指令为什么经常被“迁出” Prompt

MCP 是缓存优化里最典型的麻烦制造者之一。

原因很直白：

- MCP 服务器可能连上、断开、重载
- 每个服务器还可能带来自己的 `instructions`
- 这些内容本身就高波动

如果它们直接进入稳定 Prompt 前缀，那缓存几乎注定会频繁失效。

所以 Claude Code 源码才会特别强调：

- `mcp_instructions` 是危险的高波动段
- 更好的方案是把它迁移到 `mcp_instructions_delta` 这类消息级机制

这是一种非常典型的“为了缓存而重构数据放置位置”的工程思路。

## 为什么“工具描述”也会影响缓存

很多人只盯着 System Prompt，却忽略了工具描述同样会进入模型上下文。

这就带来一个新问题：

- 如果工具列表或工具描述常常变化
- 那模型侧看到的工具 schema 也会变化
- 这同样可能让缓存收益下降

所以 Claude Code 会尽量避免把高波动信息放进工具描述里，例如动态 agent 列表这类信息就不适合长期留在稳定 schema 中。

再结合工具系统那一章的证据，可以更准确地理解这句话：

- `getTools()` 给的是 built-in 层
- 真正执行的是组合后的工具池
- built-in 和 MCP tools 还会在运行时合并、过滤、刷新

## 为什么源码里会有很多“会话内锁定”的状态

你在 `src/bootstrap/state.ts` 里能看到不少类似“latched”或“session-stable”思路的注释。

这背后反映的是一个很现实的问题：

> 某些开关、头信息、行为参数如果在会话中途来回变，会不断破坏缓存前缀。

所以 Claude Code 并不总是追求“最新状态立刻生效”，而是会权衡：

- 现在切换会不会打断缓存收益
- 某个值是否应该在一段会话内保持稳定
- 某些变化是否更适合在下一轮或下一会话再生效

这其实是很成熟的产品工程思维。

你可以把它理解成一句更通俗的话：

> 有些值不是“越实时越好”，而是“在一段会话里尽量稳定更值钱”。

## 缓存优化为什么会反过来塑造架构

Claude Code 的一个很值得学习的地方在于：

它没有把缓存当成纯粹的底层实现细节，而是允许缓存需求反过来改变上层设计。

例如：

- Prompt 要分静态/动态
- `CLAUDE.md` 不适合直接塞进稳定 prompt
- MCP 指令要从 prompt 挪到 attachment
- 动态 agent 列表不能一直留在工具描述里

这说明缓存不是“后优化”，而是“前置约束”。

从这轮已有证据再补一句：

- compact summary 的生成路径
- prompt cache sharing 的保持方式
- query 前消息整形

这些也都在被 cache 约束反向塑形。

## 新手应该如何理解这件事

可以把 Prompt Cache 想成一个问题：

> 这轮请求里，哪些信息每次都差不多，值得复用；哪些信息变化太快，不该污染可复用区域？

Claude Code 的所有设计，几乎都在围绕这个问题不断做减法和隔离。

## 新手常见误区

### 误区 1：缓存优化就是加一个 API 参数

不对。它会影响 Prompt、上下文通道、工具 schema，甚至会影响状态管理方式。

### 误区 2：只要 System Prompt 稳定就够了

不对。真正的 cache-key 前缀比这更广，`userContext` 和 `systemContext` 也很重要。

### 误区 3：动态内容放哪都一样

不对。放在稳定前缀里和放在消息层里，缓存后果完全不同。

### 误区 4：Prompt Cache 只和 prompt 文本有关

不对。compact summary、消息整形、工具描述的波动性，也都会反过来影响缓存收益。

## 本章小结

Claude Code 的 Prompt Cache 优化告诉我们：

- 缓存是架构问题，不是纯 API 细节
- 稳定内容和高波动内容必须明确隔离
- Prompt、context、tool schema 都会影响缓存收益
- 真正成熟的系统会允许“缓存需求”反过来塑造数据放置方式
- compact 和 cache 不是两套平行优化，而是会互相牵制的两套机制

## 下一步

- [01 — System Prompt 分层设计](../01-system-prompt/)：回头再看静态/动态分层，会更能理解它为什么不是形式主义
- [09 — 启动性能优化](../09-startup-optimization/)：继续看 Claude Code 在缓存之外还做了哪些系统级性能优化
