import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { JournalEntry } from '@isai/shared-types';

export function useVoidJournalEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post<JournalEntry>(`/journal-entries/${id}/void`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Asiento anulado — se generó la reversa correspondiente.');
    },
  });
}
