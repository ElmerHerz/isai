import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { EventRosterEntry } from '@isai/shared-types';
import { eventRosterQueryKey } from './use-event-roster.query';

export interface AttendanceRecordInput {
  personId: string;
  statusId: string;
  notes?: string;
  tags?: string[];
}

export function useRecordAttendanceMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: AttendanceRecordInput[]) => {
      const { data } = await apiClient.put<EventRosterEntry[]>(`/events/${eventId}/attendance`, { records });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventRosterQueryKey(eventId) });
      // Prefijo sin institutionId a propósito: invalida la lista de eventos
      // de CUALQUIER institución en cache — es la que trae el conteo
      // "_count.attendances" que muestran Eventos y Asistencia.
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Asistencia guardada.');
    },
  });
}
