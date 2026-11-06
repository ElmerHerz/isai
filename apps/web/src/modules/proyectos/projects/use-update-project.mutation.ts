import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Project } from '@isai/shared-types';
import { projectsQueryKey } from './use-projects.query';
import { projectDetailKey } from './use-project.query';

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  goalAmount?: number;
  targetDate?: string;
  incomeAccountId?: string;
  cashAccountId?: string;
  status?: 'active' | 'completed' | 'cancelled';
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProjectInput }) => {
      const { data } = await apiClient.patch<Project>(`/projects/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(data.institutionId) });
      queryClient.invalidateQueries({ queryKey: projectDetailKey(data.id) });
      toast.success('Proyecto actualizado.');
    },
  });
}
