import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { AttendanceTag } from '@isai/shared-types';

export interface CreateAttendanceTagInput {
  code: string;
  name: string;
  /** Solo para superadmin — a qué tenant pertenece la etiqueta nueva. */
  tenantId?: string;
}

export function useCreateAttendanceTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, ...dto }: CreateAttendanceTagInput) => {
      const { data } = await apiClient.post<AttendanceTag>('/attendance-tags', dto, {
        params: tenantId ? { tenantId } : undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-tags'] });
      toast.success('Etiqueta de asistencia creada.');
    },
  });
}
