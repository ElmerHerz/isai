import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { donorStatementKey } from './use-donor-statement.query';

export function useRegisterDonorStatementReceiptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, year }: { personId: string; year: number }) => {
      const { data } = await apiClient.post<{ documentNumber: string; generatedAt: string }>(
        '/reports/donor-statement/receipts',
        { personId, year },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: donorStatementKey(variables.personId, variables.year) });
      toast.success('Comprobante registrado.');
    },
  });
}
