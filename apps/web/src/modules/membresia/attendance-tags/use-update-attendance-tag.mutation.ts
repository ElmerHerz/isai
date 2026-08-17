import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { AttendanceTag } from '@isai/shared-types';

export interface UpdateAttendanceTagInput {
  name?: string;
  isActive?: boolean;
}

export function useUpdateAttendanceTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateAttendanceTagInput }) => {
      const { data } = await apiClient.patch<AttendanceTag>(`/attendance-tags/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-tags'] });
      toast.success('Etiqueta de asistencia actualizada.');
    },
  });
}
