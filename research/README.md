# Wave 1 Research Bootstrap

这套目录是 `Claude-code-open-explain` 的 **Wave 1 唯一执行基线包**。

它解决两个问题：

1. 后续子代理不能再直接把 `.gstack` 里的评审附录当成执行输入。
2. Wave 1 开始前，必须先把主链路、章节矩阵、术语、证据格式和派工 brief 固定下来。

## 目录约定

```text
research/
  README.md
  effective-decisions.md
  flow-map.md
  chapter-matrix.yml
  glossary.yml
  evidence.schema.json
  evidence-example.md
  evidence/
    registry.json
    examples/
      EV-W01-EXAMPLE-001.json
  section-manifests/
    00-overview.yml
  wave-01/
    briefs/
      01-context-assembly.md
      02-query-loop.md
      03-tool-execution.md
      04-permission-boundary.md
      05-context-compaction.md
      06-integrator.md
```

## 权威顺序

Wave 1 执行时，按这个顺序读取：

1. `research/effective-decisions.md`
2. `research/flow-map.md`
3. `research/chapter-matrix.yml`
4. `research/glossary.yml`
5. `research/wave-01/briefs/*.md`

`.gstack/projects/...` 下的 `office-hours` / `autoplan` 归档文件是背景资料，不是 Wave 1 子代理的直接输入。

## 真相链

Wave 1 的事实层必须遵守这条链：

```text
source snapshot
  -> evidence artifact
  -> section manifest
  -> chapter markdown
```

解释性文字可以出现在章节里，但事实层必须能回指到 `evidence_id`。

## 校验命令

```powershell
node scripts/validate-evidence.js
```

这一步当前会校验：

- `research/evidence/` 下的 JSON 证据文件字段是否齐全
- `evidence_id` 是否重复
- `source_anchor.file_path` 在 `../Claude-code-open` 中是否存在
- `main_flow_step_id`、`status`、`confidence` 是否在允许范围内

它现在是 **最小本地门禁**，不是完整 CI。

## Wave 1 启动条件

只有下面这些都成立，才应该开第一波子代理：

- `effective-decisions.md` 已冻结
- 主链路图已冻结到 `flow-map.md`
- `chapter-matrix.yml` 已确认
- `glossary.yml` 已确认
- `evidence.schema.json` 已确认
- `wave-01/briefs/*.md` 已写完
- `node scripts/validate-evidence.js` 通过

## 当前源码快照

当前默认分析快照：

- Source repo: `D:\visual_ProgrammingSoftware\毕设and简历Projects\Claude-code-open`
- Branch: `main`
- Commit: `33bf4acc3b902ce607d93f069578666d82743e58`

后续如果切换快照，先更新：

- `research/effective-decisions.md`
- `research/flow-map.md`
- `research/glossary.yml`
- `research/evidence/registry.json`
