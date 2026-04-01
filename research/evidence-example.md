# Evidence Example

这份文件不是 canonical evidence 本身，而是 **如何写 evidence** 的说明。

## canonical 位置

真实 evidence JSON 放在：

- `research/evidence/`

example 文件：

- [EV-W01-EXAMPLE-001.json](./evidence/examples/EV-W01-EXAMPLE-001.json)

## 写 evidence 时的硬规则

1. `observed` 只写能从代码直接看到的事实。
2. `evidenceSummary` 只写支撑事实的代码关系，不替作者脑补。
3. `inference` 才能写“为什么这样设计”的推断。
4. 没过校验的 evidence 不能进入 registry。
5. 没进入 truth chain 的 evidence 不能回填章节。

## 推荐流程

```text
读源码
  ->
写 evidence JSON
  ->
跑 validator
  ->
进入 registry / 等待 integrator
  ->
section manifest 引用
  ->
回填章节
```

## 本地校验

```powershell
node scripts/validate-evidence.js
```
