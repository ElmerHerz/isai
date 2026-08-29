import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ProjectPledge } from '@isai/shared-types';
import { projectPledgesKey } from './use-project-pledges.query';

export interface CreateProjectPledgeInput {
  personId?: string;
  groupId?: string;
  amount: number;
  frequency?: 'once' | 'monthly' | 'weekly';
  expectedDate?: string;
  notes?: string;
}

export function useCreateProjectPledgeMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectPledgeInput) => {
      const { data } = await apiClient.post<ProjectPledge>(`/projects/${projectId}/pledges`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectPledgesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Compromiso registrado.');
    },
  });
}
