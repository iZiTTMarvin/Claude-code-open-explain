# Effective Decisions For Wave 1

## 目标不改

Wave 1 继续服务这两个目标：

- 你自己真正看懂 `Claude Code` 开源源码
- 以开源方式，把深度解读做成系统教程给别人学习

这不是商业化验证项目。  
后续评审里关于增长、市场、商业化 framing 的讨论，只保留其中对工程执行有帮助的部分，不反向改写项目目标。

## 已冻结的硬决策

### 1. 最终公开结构继续使用 `00-11`

- `00-overview` 到 `11-security` 仍然是最终教程结构
- 不新造第二套外部章节壳
- `README.md` 继续承担入口和导读职责

### 2. Wave 1 主链路继续采用“带权限确认的修改任务”

这是 hero flow，不是唯一 flow。  
Wave 1 的主任务仍然围绕它展开，但在索引层保留两个对照流：

- read-only analysis
- long-context compact / resume

### 3. 研究流程继续按重型 evidence factory 方向走

但是必须先满足基础治理条件：

- 执行基线唯一
- 证据 schema 可机检
- truth chain 唯一
- Open Questions 先收口

### 4. Open Questions 在 Wave 1 前变成硬决策

本仓库现在直接采用下面这组路径和方式：

- 主链路母文档：`research/flow-map.md`
- 证据目录：`research/evidence/`
- section manifest 目录：`research/section-manifests/`
- Wave 1 编排方式：**manual-first**
- Wave 1 brief 目录：`research/wave-01/briefs/`

### 5. 真相链固定

```text
snapshot -> evidence -> section manifest -> chapter
```

补充规则：

- facts 只能从 evidence 往后流，不允许反向从章节“写回”事实层
- 章节里没有 `evidence_id` 支撑的内容，只能算解释层，不能冒充事实层

### 6. 证据 registry 是唯一事实索引入口

唯一事实索引文件：

- `research/evidence/registry.json`

后续要求：

- 只有 `verified / published / stale / superseded` 这些状态的证据才能进入 registry
- example 文件不进入 registry

### 7. 双语策略先保守，不取消

Wave 1 仍然保留双语方向，但先把 repo 级术语表固定下来，再往章节里扩散。

当前强制项：

- repo 级 `glossary.yml`
- 章节标题允许逐步双语化
- 证据和 brief 必须使用统一英文术语

当前不强制：

- 立刻把所有章节做逐段中英对照

## Wave 1 前置条件

下面四条没做完，不要开第一波子代理：

1. `research/` bootstrap 包齐全
2. `scripts/validate-evidence.js` 可跑通
3. example evidence 能通过校验
4. Wave 1 briefs 已冻结

## 子代理输入约束

Wave 1 子代理的直接输入 **只允许** 包含：

- `research/effective-decisions.md`
- `research/flow-map.md`
- `research/chapter-matrix.yml`
- `research/glossary.yml`
- 自己对应的 `research/wave-01/briefs/*.md`

默认 **不要** 把 `.gstack` 里的整份评审归档文件直接喂给子代理。

## 本地最小门禁

Wave 1 当前至少要过这几个本地检查：

- schema 字段齐全
- `evidence_id` 唯一
- `source_anchor.file_path` 存在
- `main_flow_step_id` 合法
- `status` 合法
- `confidence` 合法

完整 CI 可以后补，但这套最小门禁不能后补。
