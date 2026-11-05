// Módulo Security — Espejo del módulo backend security/
// Contiene: login, usuarios, roles, permisos (UI)

export { useLoginMutation } from './auth/use-login.mutation';
export { useLogoutMutation } from './auth/use-logout.mutation';
export { useMeQuery } from './auth/use-me.query';
export { useChangePasswordMutation } from './auth/use-change-password.mutation';
export { useRolesQuery } from './roles/use-roles.query';
export { useCreateRoleMutation, type CreateRoleInput } from './roles/use-create-role.mutation';
export { useUpdateRoleMutation, type UpdateRoleInput } from './roles/use-update-role.mutation';
export { useAssignPermissionsMutation } from './roles/use-assign-permissions.mutation';
export { useDeleteRoleMutation } from './roles/use-delete-role.mutation';
export { usePermissionsQuery } from './permissions/use-permissions.query';
export { useUsersQuery } from './users/use-users.query';
export { useCreateUserMutation, type CreateUserInput } from './users/use-create-user.mutation';
export { useAssignRoleMutation, type AssignRoleInput } from './users/use-assign-role.mutation';
export { useResetUserPasswordMutation } from './users/use-reset-user-password.mutation';
export {
  useAuditLogsQuery,
  auditLogsQueryKey,
  type AuditLogsFilters,
} from './audit/use-audit-logs.query';
export { useAuditEntityTypesQuery } from './audit/use-audit-entity-types.query';
