// Módulo Membresía — Espejo del módulo backend membresia/
// v1 completo: Personas + Grupos (con pertenencia con historial) +
// Directivas (cargos con vigencia) + Eventos y Asistencia (roster por scope).

export { usePersonsQuery, personsQueryKey } from './persons/use-persons.query';
export { usePersonQuery, personDetailKey } from './persons/use-person.query';
export { usePersonGroupsQuery, personGroupsKey } from './persons/use-person-groups.query';
export { usePersonPositionsQuery, personPositionsKey } from './persons/use-person-positions.query';
export { usePersonRelationshipsQuery, personRelationshipsKey } from './persons/use-person-relationships.query';
export {
  useCreatePersonRelationshipMutation,
  type CreatePersonRelationshipInput,
} from './persons/use-create-person-relationship.mutation';
export { useRemovePersonRelationshipMutation } from './persons/use-remove-person-relationship.mutation';
export { usePersonMilestonesQuery, personMilestonesKey } from './persons/use-person-milestones.query';
export {
  useCreatePersonMilestoneMutation,
  type CreatePersonMilestoneInput,
} from './persons/use-create-person-milestone.mutation';
export { useRemovePersonMilestoneMutation } from './persons/use-remove-person-milestone.mutation';

export { useMilestoneTypesQuery, milestoneTypesQueryKey } from './milestone-types/use-milestone-types.query';
export {
  useCreateMilestoneTypeMutation,
  type CreateMilestoneTypeInput,
} from './milestone-types/use-create-milestone-type.mutation';
export {
  useUpdateMilestoneTypeMutation,
  type UpdateMilestoneTypeInput,
} from './milestone-types/use-update-milestone-type.mutation';
export { useDeleteMilestoneTypeMutation } from './milestone-types/use-delete-milestone-type.mutation';
export {
  useCreatePersonMutation,
  type CreatePersonInput,
} from './persons/use-create-person.mutation';
export {
  useUpdatePersonMutation,
  type UpdatePersonInput,
} from './persons/use-update-person.mutation';
export {
  usePreviewPersonsImportMutation,
  type PreviewPersonsImportInput,
} from './persons/use-preview-persons-import.mutation';
export {
  useConfirmPersonsImportMutation,
  type ConfirmPersonsImportInput,
} from './persons/use-confirm-persons-import.mutation';
export { downloadPersonsImportTemplate } from './persons/download-persons-import-template';

export { useGroupsQuery, groupsQueryKey } from './groups/use-groups.query';
export { useGroupQuery, groupDetailKey } from './groups/use-group.query';
export {
  useCreateGroupMutation,
  type CreateGroupInput,
} from './groups/use-create-group.mutation';
export {
  useUpdateGroupMutation,
  type UpdateGroupInput,
} from './groups/use-update-group.mutation';
export { useGroupMembersQuery, groupMembersQueryKey } from './groups/use-group-members.query';
export {
  useAddGroupMembersMutation,
  type AddGroupMemberInput,
} from './groups/use-add-group-members.mutation';
export { useRemoveGroupMemberMutation } from './groups/use-remove-group-member.mutation';

export { usePositionsQuery, positionsQueryKey } from './positions/use-positions.query';
export {
  useCreatePositionMutation,
  type CreatePositionInput,
} from './positions/use-create-position.mutation';
export {
  useUpdatePositionMutation,
  type UpdatePositionInput,
} from './positions/use-update-position.mutation';

export { useEventsQuery, eventsQueryKey } from './events/use-events.query';
export { useEventQuery, eventDetailKey } from './events/use-event.query';
export {
  useCreateEventMutation,
  type CreateEventInput,
} from './events/use-create-event.mutation';
export {
  useUpdateEventMutation,
  type UpdateEventInput,
} from './events/use-update-event.mutation';
export { useDeleteEventMutation } from './events/use-delete-event.mutation';
export { useEventRosterQuery, eventRosterQueryKey } from './events/use-event-roster.query';
export {
  useRecordAttendanceMutation,
  type AttendanceRecordInput,
} from './events/use-record-attendance.mutation';

export { useAttendanceTagsQuery, attendanceTagsQueryKey } from './attendance-tags/use-attendance-tags.query';
export {
  useCreateAttendanceTagMutation,
  type CreateAttendanceTagInput,
} from './attendance-tags/use-create-attendance-tag.mutation';
export {
  useUpdateAttendanceTagMutation,
  type UpdateAttendanceTagInput,
} from './attendance-tags/use-update-attendance-tag.mutation';
export { useDeleteAttendanceTagMutation } from './attendance-tags/use-delete-attendance-tag.mutation';

export { usePrivilegeTypesQuery, privilegeTypesQueryKey } from './privilege-types/use-privilege-types.query';
export {
  useCreatePrivilegeTypeMutation,
  type CreatePrivilegeTypeInput,
} from './privilege-types/use-create-privilege-type.mutation';
export {
  useUpdatePrivilegeTypeMutation,
  type UpdatePrivilegeTypeInput,
} from './privilege-types/use-update-privilege-type.mutation';
export { useDeletePrivilegeTypeMutation } from './privilege-types/use-delete-privilege-type.mutation';

export { useFundTypesQuery, fundTypesQueryKey } from './fund-types/use-fund-types.query';
export {
  useCreateFundTypeMutation,
  type CreateFundTypeInput,
} from './fund-types/use-create-fund-type.mutation';
export {
  useUpdateFundTypeMutation,
  type UpdateFundTypeInput,
} from './fund-types/use-update-fund-type.mutation';
export { useDeleteFundTypeMutation } from './fund-types/use-delete-fund-type.mutation';

export { useEventPrivilegesQuery, eventPrivilegesKey } from './events/use-event-privileges.query';
export {
  useCreateEventPrivilegeMutation,
  type CreateEventPrivilegeInput,
} from './events/use-create-event-privilege.mutation';
export { useRemoveEventPrivilegeMutation } from './events/use-remove-event-privilege.mutation';

export { useEventFundCollectionsQuery, eventFundCollectionsKey } from './events/use-event-fund-collections.query';
export {
  useCreateEventFundCollectionMutation,
  type CreateEventFundCollectionInput,
} from './events/use-create-event-fund-collection.mutation';
export { useRemoveEventFundCollectionMutation } from './events/use-remove-event-fund-collection.mutation';
export { usePostFundCollectionToLedgerMutation } from './events/use-post-fund-collection-to-ledger.mutation';
