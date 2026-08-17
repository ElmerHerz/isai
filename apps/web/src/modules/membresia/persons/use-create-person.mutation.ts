import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useInstitutionsQuery } from '@/modules/general';
import type { PersonWithRelations } from '@isai/shared-types';
import { personsQueryKey } from './use-persons.query';

export interface CreatePersonInput {
  institutionId: string;
  branchId?: string;
  personTypeId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  identityDocument?: string;
  addressLine?: string;
  city?: string;
  joinDate?: string;
  notes?: string;
}

export function useCreatePersonMutation() {
  const queryClient = useQueryClient();
  // Person SÍ tiene columna tenant_id propia (a diferencia de Group/Event) —
  // un superadmin sin tenant en el JWT necesita mandar ?tenantId= o el
  // backend rechaza la creación. Se resuelve solo, del institutions cache
  // (misma query que ya cargó el selector de institución de la página) — no
  // afecta a un admin normal, cuyo tenant ya viene fijo en el JWT y gana
  // sobre el query param (ver resolveTenantId en el backend).
  const { data: institutions } = useInstitutionsQuery();

  return useMutation({
    mutationFn: async (dto: CreatePersonInput) => {
      const tenantId = institutions?.find((i) => i.id === dto.institutionId)?.tenantId;
      const { data } = await apiClient.post<PersonWithRelations>('/persons', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: personsQueryKey(data.institutionId) });
      toast.success('Persona creada.');
    },
  });
}
