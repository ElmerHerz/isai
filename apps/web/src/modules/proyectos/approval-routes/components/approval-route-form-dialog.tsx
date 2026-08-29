import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Trash2, Plus, X } from 'lucide-react';
import { useInstitutionsQuery, useBranchesQuery } from '@/modules/general';
import { useUsersQuery } from '@/modules/security';
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateApprovalRouteMutation } from '../use-create-approval-route.mutation';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';

// Mismo criterio que WHOLE_INSTITUTION_SENTINEL en budget-form-dialog.tsx —
// Radix Select no admite value="", así que "todo el tenant"/"toda la
// institución" necesitan un valor propio.
const ALL_TENANT_SENTINEL = '__all_tenant__';
const WHOLE_INSTITUTION_SENTINEL = '__whole_institution__';

interface ApprovalRouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprovalRouteFormDialog({ open, onOpenChange }: ApprovalRouteFormDialogProps) {
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewUsers = permissions.includes('security.user.view');
  const canViewAccounts = permissions.includes('finance.account.view');
  const canViewBranches = permissions.includes('core.branch.view');

  const { data: institutions } = useInstitutionsQuery();
  const { data: users } = useUsersQuery(canViewUsers);
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const mutation = useCreateApprovalRouteMutation();

  const [name, setName] = useState('');
  const [institutionId, setInstitutionId] = useState(ALL_TENANT_SENTINEL);
  const [branchId, setBranchId] = useState(WHOLE_INSTITUTION_SENTINEL);
  const [minAmount, setMinAmount] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [nextApprover, setNextApprover] = useState('');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [nextAccount, setNextAccount] = useState('');

  const { data: branches } = useBranchesQuery(
    institutionId === ALL_TENANT_SENTINEL ? '' : institutionId,
    canViewBranches,
  );

  useEffect(() => {
    if (open) {
      setName('');
      setInstitutionId(ALL_TENANT_SENTINEL);
      setBranchId(WHOLE_INSTITUTION_SENTINEL);
      setMinAmount('');
      setSteps([]);
      setNextApprover('');
      setAccountIds([]);
      setNextAccount('');
    }
  }, [open]);

  const availableUsers = users?.filter((u) => u.isActive && !steps.includes(u.id)) ?? [];
  const usersById = new Map((users ?? []).map((u) => [u.id, u]));

  const expenseAccounts =
    accounts?.filter((a) => a.accountType.code === 'EXPENSE' && a.allowsTransactions) ?? [];
  const availableAccounts = expenseAccounts.filter((a) => !accountIds.includes(a.id));
  const accountsById = new Map(expenseAccounts.map((a) => [a.id, a]));

  const addAccount = () => {
    if (!nextAccount) return;
    setAccountIds((prev) => [...prev, nextAccount]);
    setNextAccount('');
  };

  const removeAccount = (accountId: string) => setAccountIds((prev) => prev.filter((id) => id !== accountId));

  const addStep = () => {
    if (!nextApprover) return;
    setSteps((prev) => [...prev, nextApprover]);
    setNextApprover('');
  };

  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const parsedAmount = Number(minAmount);
  const isAmountValid = minAmount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const canSubmit = name.trim() !== '' && isAmountValid && steps.length > 0 && accountIds.length > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      {
        name: name.trim(),
        institutionId: institutionId === ALL_TENANT_SENTINEL ? undefined : institutionId,
        branchId:
          institutionId === ALL_TENANT_SENTINEL || branchId === WHOLE_INSTITUTION_SENTINEL ? undefined : branchId,
        minAmount: parsedAmount,
        approverUserIds: steps,
        accountIds,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva ruta de aprobación</DialogTitle>
          <DialogDescription>
            A partir de qué monto se necesita aprobación, y en qué orden debe pasar por cada persona.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval-route-name">Nombre</Label>
            <Input id="approval-route-name" placeholder="Gastos grandes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="approval-route-institution">Institución</Label>
              <Select
                value={institutionId}
                onValueChange={(value) => {
                  setInstitutionId(value);
                  setBranchId(WHOLE_INSTITUTION_SENTINEL);
                }}
              >
                <SelectTrigger id="approval-route-institution">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TENANT_SENTINEL}>Todo el tenant</SelectItem>
                  {institutions?.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-route-branch">Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={institutionId === ALL_TENANT_SENTINEL}>
                <SelectTrigger id="approval-route-branch">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WHOLE_INSTITUTION_SENTINEL}>Toda la institución</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approval-route-amount">Monto mínimo</Label>
            <Input
              id="approval-route-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="500.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cuentas</Label>
            <p className="text-xs text-muted-foreground">
              A qué cuenta(s) de gasto aplica esta ruta (ej. "Cuenta Músicos"). Elige al menos una.
            </p>

            {accountIds.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {accountIds.map((accountId) => {
                  const account = accountsById.get(accountId);
                  return (
                    <li
                      key={accountId}
                      className="flex items-center gap-1 rounded-full border bg-muted/30 py-1 pl-2.5 pr-1 text-xs"
                    >
                      {account ? `${account.code} · ${account.name}` : 'Cuenta'}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => removeAccount(accountId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <Select value={nextAccount} onValueChange={setNextAccount}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" disabled={!nextAccount} onClick={addAccount}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pasos de aprobación (en orden)</Label>

            {steps.length > 0 && (
              <ul className="space-y-1.5">
                {steps.map((userId, index) => {
                  const user = usersById.get(userId);
                  return (
                    <li
                      key={userId}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1 truncate">
                        {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <Select value={nextApprover} onValueChange={setNextApprover}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecciona una persona" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" disabled={!nextApprover} onClick={addStep}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
