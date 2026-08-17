import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useInstitutionsQuery } from '@/modules/general';
import { personsQueryKey } from './use-persons.query';

export interface ConfirmPersonsImportInput {
  institutionId: string;
  branchId?: string;
  personTypeId: string;
  rows: { firstName: string; lastName: string }[];
}

export function useConfirmPersonsImportMutation() {
  const queryClient = useQueryClient();
  // Mismo motivo que use-create-person.mutation.ts: Person tiene tenant_id
  // propio, un superadmin necesita ?tenantId= — se resuelve del institutions
  // cache.
  const { data: institutions } = useInstitutionsQuery();

  return useMutation({
    mutationFn: async (dto: ConfirmPersonsImportInput) => {
      const tenantId = institutions?.find((i) => i.id === dto.institutionId)?.tenantId;
      const { data } = await apiClient.post<{ created: number }>('/persons/import/confirm', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: personsQueryKey(variables.institutionId) });
      toast.success(
        data.created === 1 ? '1 persona importada.' : `${data.created} personas importadas.`,
      );
    },
  });
}
