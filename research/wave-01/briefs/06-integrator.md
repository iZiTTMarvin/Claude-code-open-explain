# Wave 1 Brief 06: Integrator

## Role

你不是额外探索者，你是 **收束者**。  
只有在 analysis briefs 之间出现冲突、缺口或术语漂移时，才允许做最小必要 reread。

## Inputs

- `research/effective-decisions.md`
- `research/flow-map.md`
- `research/chapter-matrix.yml`
- `research/glossary.yml`
- 所有 Wave 1 evidence JSON

## Must Produce

1. main flow evidence coverage table
2. chapter backfill ready list
3. conflict list
4. unresolved questions list
5. glossary drift list

## Truth Chain Rules

- 没过 validator 的 evidence 不能进入整合
- 有 `conflictFlag=true` 的 evidence 不能直接回填章节
- 章节解释层可以润色，但事实层必须保留 `evidence_id`

## Allowed Reread

只允许在这些场景下做 targeted reread：

- 两条 evidence 对同一行为得出冲突结论
- 术语在两个 brief 中不一致
- 某个 `MF-*` 完全没有可用 evidence

## Output Gate

只有同时满足下面条件，才标记某章 `ready`：

- 必需 evidence 齐全
- 无未解决核心冲突
- glossary 一致
- validator 通过
