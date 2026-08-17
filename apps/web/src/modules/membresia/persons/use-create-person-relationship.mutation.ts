import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { PersonRelationshipItem } from '@isai/shared-types';
import { personRelationshipsKey } from './use-person-relationships.query';

export interface CreatePersonRelationshipInput {
  relatedPersonId: string;
  relationshipTypeId: string;
  notes?: string;
}

export function useCreatePersonRelationshipMutation(personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePersonRelationshipInput) => {
      const { data } = await apiClient.post<PersonRelationshipItem[]>(`/persons/${personId}/relationships`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personRelationshipsKey(personId) });
      toast.success('Familiar agregado.');
    },
  });
}
