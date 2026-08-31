import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
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

interface ApprovalRouteFormProps {
  onSaved: () => void;
}

export function ApprovalRouteForm({ onSaved }: ApprovalRouteFormProps) {
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
      { onSuccess: onSaved },
    );
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">Nueva ruta de aprobación</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          A partir de qué monto se necesita aprobación, y en qué orden debe pasar por cada persona.
        </p>

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
              <div className="flex-1">
                <Combobox
                  options={availableAccounts}
                  value={nextAccount}
                  onChange={setNextAccount}
                  getOptionValue={(account) => account.id}
                  getOptionLabel={(account) => `${account.code} · ${account.name}`}
                  placeholder="Selecciona una cuenta"
                  searchPlaceholder="Buscar por código o nombre..."
                />
              </div>
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
              <div className="flex-1">
                <Combobox
                  options={availableUsers}
                  value={nextApprover}
                  onChange={setNextApprover}
                  getOptionValue={(user) => user.id}
                  getOptionLabel={(user) => `${user.firstName} ${user.lastName}`}
                  placeholder="Selecciona una persona"
                  searchPlaceholder="Buscar por nombre..."
                />
              </div>
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

          <div className="flex justify-end">
            <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
