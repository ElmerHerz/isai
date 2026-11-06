import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Project } from '@isai/shared-types';
import { projectsQueryKey } from './use-projects.query';

export interface CreateProjectInput {
  institutionId: string;
  branchId: string;
  name: string;
  description?: string;
  goalAmount: number;
  targetDate?: string;
  incomeAccountId?: string;
  cashAccountId?: string;
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectInput) => {
      const { data } = await apiClient.post<Project>('/projects', dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey(data.institutionId) });
      toast.success('Proyecto creado.');
    },
  });
}
