// Módulo General — Espejo del módulo backend general/
// Contiene: instituciones, sucursales (UI)

// Exporta queries y componentes del módulo
export { useTenantsQuery } from './tenants/use-tenants.query';
export { useCreateTenantMutation, type CreateTenantInput } from './tenants/use-create-tenant.mutation';
export { useTenantSettingsQuery } from './tenants/use-tenant-settings.query';
export {
  useUpdateTenantSettingsMutation,
  type UpdateTenantSettingsInput,
} from './tenants/use-update-tenant-settings.mutation';
export { useInstitutionsQuery, useInstitutionQuery } from './institutions/use-institutions.query';
export {
  useCreateInstitutionMutation,
  type CreateInstitutionInput,
} from './institutions/use-create-institution.mutation';
export {
  useUpdateInstitutionMutation,
  type UpdateInstitutionInput,
} from './institutions/use-update-institution.mutation';
export { useMyMenuQuery } from './menus/use-my-menu.query';
export { useBranchesQuery } from './branches/use-branches.query';
export { useAllBranchesQuery } from './branches/use-all-branches.query';
export {
  useCreateBranchMutation,
  type CreateBranchInput,
} from './branches/use-create-branch.mutation';
export {
  useUpdateBranchMutation,
  type UpdateBranchInput,
} from './branches/use-update-branch.mutation';
export { useUpdateBranchStatusMutation } from './branches/use-update-branch-status.mutation';
export { useBranchQuery } from './branches/use-branch.query';
export { useBranchAddressQuery } from './branches/use-branch-address.query';
export {
  useUpsertBranchAddressMutation,
  type UpsertBranchAddressInput,
} from './branches/use-upsert-branch-address.mutation';
export { useBranchSchedulesQuery } from './branches/use-branch-schedules.query';
export {
  useCreateBranchScheduleMutation,
  type CreateBranchScheduleInput,
} from './branches/use-create-branch-schedule.mutation';
export {
  useUpdateBranchScheduleMutation,
  type UpdateBranchScheduleInput,
} from './branches/use-update-branch-schedule.mutation';
export { useDeleteBranchScheduleMutation } from './branches/use-delete-branch-schedule.mutation';
export { useInstitutionTypesQuery } from './institution-types/use-institution-types.query';
export {
  useCreateInstitutionTypeMutation,
  type CreateInstitutionTypeInput,
} from './institution-types/use-create-institution-type.mutation';
export {
  useUpdateInstitutionTypeMutation,
  type UpdateInstitutionTypeInput,
} from './institution-types/use-update-institution-type.mutation';
export { useCurrenciesQuery } from './catalogs/use-currencies.query';
export {
  useCreateCurrencyMutation,
  type CreateCurrencyInput,
} from './catalogs/use-create-currency.mutation';
export {
  useUpdateCurrencyMutation,
  type UpdateCurrencyInput,
} from './catalogs/use-update-currency.mutation';
export { useCountriesQuery } from './catalogs/use-countries.query';
export {
  useCreateCountryMutation,
  type CreateCountryInput,
} from './catalogs/use-create-country.mutation';
export {
  useUpdateCountryMutation,
  type UpdateCountryInput,
} from './catalogs/use-update-country.mutation';
export { useLanguagesQuery } from './catalogs/use-languages.query';
export {
  useCreateLanguageMutation,
  type CreateLanguageInput,
} from './catalogs/use-create-language.mutation';
export {
  useUpdateLanguageMutation,
  type UpdateLanguageInput,
} from './catalogs/use-update-language.mutation';
export { useCatalogItemsQuery, catalogItemsQueryKey } from './catalogs/use-catalog-items.query';
export {
  useCreateCatalogItemMutation,
  type CreateCatalogItemInput,
} from './catalogs/use-create-catalog-item.mutation';
export {
  useUpdateCatalogItemMutation,
  type UpdateCatalogItemInput,
} from './catalogs/use-update-catalog-item.mutation';
