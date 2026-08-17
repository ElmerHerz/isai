import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { PersonWithRelations } from '@isai/shared-types';
import { personsQueryKey } from './use-persons.query';
import { personDetailKey } from './use-person.query';
import type { CreatePersonInput } from './use-create-person.mutation';

export type UpdatePersonInput = Partial<CreatePersonInput> & { isActive?: boolean };

export function useUpdatePersonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdatePersonInput }) => {
      const { data } = await apiClient.patch<PersonWithRelations>(`/persons/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: personsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: personDetailKey(data.id) });
      toast.success('Persona actualizada.');
    },
  });
}
