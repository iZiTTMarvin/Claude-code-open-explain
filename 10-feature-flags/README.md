# 10 — Feature Flag 体系

> 在 Claude Code 里，Feature Flag 不只是开关，它还是产品实验、构建裁剪和架构演进的入口

## 为什么这一章不只是”列几个 Flag”

想象你是 Claude Code 的开发者，面临这样一个困境：

**场景 1：新功能上线的风险**
你开发了一个新的”主动模式”功能，让 Claude Code 可以主动发现问题并提出建议。这个功能很强大，但也可能有 bug。如果直接发布给所有用户，一旦出问题，影响面会很大。

**场景 2：实验性功能的取舍**
你想尝试一个”语音模式”功能，但不确定用户是否喜欢。如果把代码直接合并到主分支，即使功能没开启，这些代码也会增加包体积、拖慢启动速度。

**场景 3：不同用户的不同需求**
内部团队需要一些调试功能，但这些功能不应该暴露给普通用户。如果用简单的 if-else 判断，代码会变得很乱，而且容易出错。

**Feature Flag 就是为了解决这些问题而存在的。**

但在 Claude Code 里，Feature Flag 不只是”开关”这么简单。它至少承担了 3 种角色：

1. **产品发布控制**：决定哪些功能对外可见，支持灰度发布和 A/B 测试
2. **构建优化工具**：在构建时直接删除未启用的代码，减小包体积、加快启动速度
3. **架构演进信号**：通过 Flag 名字，可以看出 Claude Code 正在探索哪些未来方向

所以读 Flag，不是在读琐碎开关，而是在读 Claude Code 的演进轨迹和工程智慧。

## 本章关键源码入口

| 文件 | 作用 |
|------|------|
| `src/main.tsx` | 顶层 `feature()` 条件导入，以及运行期 gate 对主链行为的影响 |
| `src/tools.ts` | `getAllBaseTools()`：工具池如何被 feature gate 改写 |
| `src/tools/AgentTool/builtInAgents.ts` | `areExplorePlanAgentsEnabled()`：构建时 gate 与 GrowthBook gate 叠加控制 agent 能力 |
| `src/services/analytics/growthbook.ts` | 运行时 Flag 获取逻辑 |

## 先分清两类 Flag

Claude Code 的 Flag 大体可以分成两层：

### 1. 构建时 Flag

典型形式：

```typescript
feature('KAIROS')
```

这一类 Flag 的重点不只是“运行时是否启用”，更重要的是：

> 如果构建时就知道这个分支不会用，构建器可以直接把整段代码删掉。

### 2. 运行时 Flag

典型形式会和 GrowthBook 配合，例如：

```typescript
getFeatureValue_CACHED_MAY_BE_STALE(...)
```

这一类 Flag 更偏向：

- 灰度发布
- A/B 测试
- 会话内行为控制

### 但真实代码里经常是两层一起叠

例如某些能力的出现并不是只看 `feature('...')`，也不是只看 GrowthBook，而是：

```text
先看构建时 feature gate 在不在
  ->
再看运行时 GrowthBook / cached gate 是不是打开
  ->
最后才决定当前会话里是否真的出现这个能力
```

## 为什么构建时 Flag 这么重要

如果没有构建时 Flag，很多实验性模块即使“没开”，也仍可能：

- 被打进包里
- 参与模块解析
- 增加启动负担
- 影响依赖关系

Claude Code 选择让一部分 Flag 在构建期就产生作用，本质上是在做一件事：

> 不只是把功能藏起来，而是让不用的功能根本不存在于这份构建里。

这对大型 CLI 来说非常关键。

这点在 `main.tsx` 顶层的条件 `require(...)` 上非常直观：

- `COORDINATOR_MODE`
- `KAIROS`
- 其他一些只在特定构建里存在的模块

这些代码不是“隐藏起来”，而是在构建阶段就有机会被删掉。

## 为什么运行时 Flag 也不能少

构建时 Flag 很强，但它解决不了所有问题。

真实产品还需要：

- 对部分功能先给少量用户
- 做实验对比
- 在不同用户群体里逐步放量
- 允许某些行为在不重新发版的情况下调整

这就是运行时 Flag 的价值。

所以 Claude Code 实际采用的是：

> 构建期裁掉一批，运行期再细调一批。

拿内置 agent 来说，这个模式非常典型：

- `BUILTIN_EXPLORE_PLAN_AGENTS` 控制是否存在这一整支分支
- `tengu_amber_stoat` 再决定 Explore / Plan agents 是否在当前会话真正可用

## 从源码能看出哪些产品方向

只看 Flag 名字，就能看到很多线索，例如：

- `KAIROS`
- `PROACTIVE`
- `COORDINATOR_MODE`
- `VOICE_MODE`
- `HISTORY_SNIP`
- `KAIROS_BRIEF`
- `KAIROS_GITHUB_WEBHOOKS`
- `EXPERIMENTAL_SKILL_SEARCH`

即使你还没读完整个实现，也能先推断出 Claude Code 正在探索：

- 更主动的 agent 行为
- 更强的多 Agent 协调
- 语音和通知类能力
- 更细的上下文压缩手段
- 更丰富的技能与自动化工作流

再补一个更工程化的观察角度：

有些 Flag 不是在决定“给不给用户看”，而是在决定：

- 工具池长什么样
- agent 列表长什么样
- prompt 里会不会插进某段提示
- 某些执行分支是不是连 import 都不发生

## 但读 Flag 时一定要避免一个误区

> 有 Flag 不等于功能已经稳定，也不等于对外公开。

源码里能看到某个能力存在，并不代表：

- 当前构建一定带上了它
- 普通用户一定能触发它
- 它已经达到正式发布标准

所以 Flag 更适合作为“产品演进信号”，而不是“功能清单”。

## 为什么 `feature()` 和性能优化强相关

这一点很多人一开始不会想到。

当 `feature()` 参与构建期裁剪时，它直接影响：

- 包体大小
- 模块加载数量
- 启动时间
- 初始化时依赖图复杂度

也就是说，在 Claude Code 里，Feature Flag 不只是产品实验工具，还是性能工程工具。

在 `tools.ts` 里尤其明显：

- 很多工具模块只有 gate 开着才会 require
- `getAllBaseTools()` 返回的基础工具池也会随 gate 变化

这意味着 flag 会直接改变模型可见的工具边界，而不只是改变 UI 上的按钮。

## 为什么运行时 Flag 常常带着“可能过时缓存”语义

源码里常见的名字像 `getFeatureValue_CACHED_MAY_BE_STALE(...)`，这个命名本身就很有信息量。

它传达了一个务实立场：

> 有些 Flag 值不需要每秒都绝对新鲜，允许在一段会话内保持稳定，反而更利于系统整体行为稳定。

这和 Prompt Cache 一章是相通的。  
Claude Code 很清楚：不是所有状态都值得实时抖动。

换句话说，某些运行时 flag 的价值不是“越新越好”，而是“在一段会话里足够稳定更好”。  
这是一种典型的产品化工程取舍。

## 用户类型为什么也像一层隐式 Flag

源码里除了显式的 `feature('...')`，还经常会看到类似：

- `process.env.USER_TYPE === 'ant'`

这说明 Claude Code 的功能暴露不仅由产品 Flag 控制，还和用户分层、内部外部环境相关。

从架构上看，这等于又加了一层能力门控：

- 某些逻辑只在内部环境出现
- 某些提示词或行为只对内部实验开放
- 某些模式即使代码存在，也不会对外走到

## 新手应该怎样用这一章辅助读源码

一个很实用的方法是：

### 先看 Flag 名，再看它包住了什么

这样你更容易分辨：

- 这是核心主链路
- 这是实验性分支
- 这是未来方向预留

再补一个方法：

### 再看它到底影响的是“存在性”还是“行为”

- 有些 flag 影响代码是否存在
- 有些 flag 影响当前会话的行为
- 有些 flag 两者都影响

### 再判断它影响的是哪一层

- 启动层
- 命令层
- 工具层
- Prompt 层
- 多 Agent 层
- MCP 层

这样你会比单纯“搜关键字”更容易建立结构感。

## 新手常见误区

### 误区 1：Feature Flag 只是产品经理开关

不对。在 Claude Code 里，它还承担构建裁剪和架构隔离职责。

### 误区 2：看到 Flag 就等于看到了可用功能

不对。很多 Flag 只是说明能力存在，不代表当前构建或当前用户可用。

### 误区 3：Flag 越多说明架构越乱

不一定。关键要看 Flag 是否帮助隔离实验、控制发布和降低主路径负担。

### 误区 4：Flag 只影响产品，不影响模型看到的世界

不对。工具池、agent 列表、prompt 片段都会因为 flag 改变。

## 本章小结

Claude Code 的 Feature Flag 体系说明：

- Flag 既是产品发布机制，也是工程裁剪机制
- 构建时 Flag 影响最终代码形态
- 运行时 Flag 影响灰度与实验
- Flag 名字本身就能透露产品方向
- 理解 Flag，等于理解 Claude Code 的一部分演进路线图
- 很多关键能力实际上受“构建时 gate + 运行时 gate”双层控制

## 下一步

- [09 — 启动性能优化](../09-startup-optimization/)：回头再看，你会更明白 Feature Flag 为什么能直接影响启动表现
- [01 — System Prompt 分层设计](../01-system-prompt/)：很多 Prompt 差异和能力差异也会受到用户类型与功能开关影响
