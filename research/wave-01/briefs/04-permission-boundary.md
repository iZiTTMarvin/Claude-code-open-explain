# Wave 1 Brief 04: Permission Boundary

## Role

负责 `MF-06` 中的权限模式、规则匹配、危险动作过滤与路径边界。

## Must Cover

- `src/utils/permissions/PermissionMode.ts`
- `src/utils/permissions/permissionSetup.ts`
- `src/utils/permissions/permissions.ts`
- 必要时补看 `src/utils/permissions/pathValidation.ts`

## Chapter Targets

- `04-permission-model`
- `11-security`

## Must Answer

1. CLI 启动时权限模式是怎么初始化的？
2. 权限规则如何影响具体工具执行？
3. Bash / PowerShell 类危险规则是怎么被识别的？
4. 路径边界和权限边界如何叠加？
5. 哪些结论必须写成“事实”，哪些只能写成“推断”？

## Out Of Scope

- 不负责 compact
- 不负责消息归一化

## Output

- 至少 4 条 evidence
- 至少覆盖 `MF-06`
