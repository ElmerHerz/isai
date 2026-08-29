import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { useCatalogItemsQuery } from '@/modules/general';
import { useAccountsQuery, useCreateAccountMutation } from '@/modules/finanzas';
import { getErrorMessage } from '@/lib/toast';
import type { Account } from '@isai/shared-types';

const ACCOUNT_TYPE_CATALOG_CODE = 'account_type';

// El usuario no debería tener que saber de memoria qué código sigue — se
// calcula solo a partir de la cuenta padre elegida: si "4000" ya tiene hijos
// 4001/4002/4003, sugiere 4004; si no tiene hijos todavía, sugiere padre+1.
// Igual que el resto de catálogos de la app (código autocompletado desde
// otro campo), queda editable — no es un valor forzado.
function suggestNextCode(parentAccountId: string, accounts: Account[]): string {
  const parent = accounts.find((a) => a.id === parentAccountId);
  if (!parent) return '';

  const siblingCodes = accounts
    .filter((a) => a.parentAccountId === parentAccountId)
    .map((a) => Number(a.code))
    .filter(Number.isFinite);

  if (siblingCodes.length > 0) {
    return String(Math.max(...siblingCodes) + 1);
  }

  const parentNum = Number(parent.code);
  return Number.isFinite(parentNum) ? String(parentNum + 1) : '';
}

const accountSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(20)
    .regex(/^[0-9.]+$/, 'Solo números y puntos (ej. "4004")'),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  accountTypeId: z.string().min(1, 'Selecciona un tipo'),
  parentAccountId: z.string().optional(),
  isGrouping: z.boolean(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

const EMPTY_VALUES: AccountFormValues = { code: '', name: '', accountTypeId: '', parentAccountId: '', isGrouping: false };

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Solo para superadmin: a qué tenant pertenece la cuenta nueva. */
  tenantId?: string;
}

// Solo alta — sin edición todavía (ver plan de sesión, recorte 1 de
// finanzas). El signo (débito/crédito) lo deriva el backend del tipo
// elegido, no se pide acá. Transaccionable por defecto; "Cuenta de
// agrupación" la deja como encabezado sin movimientos propios (ej. "4000
// Ingresos"), ver docs/finanzas-mejoras-propuestas.md §4.
export function AccountFormDialog({ open, onOpenChange, tenantId }: AccountFormDialogProps) {
  const { data: accountTypes } = useCatalogItemsQuery(ACCOUNT_TYPE_CATALOG_CODE);
  const { data: accounts } = useAccountsQuery(tenantId);
  const mutation = useCreateAccountMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
  }, [open, reset]);

  const parentAccountId = watch('parentAccountId');
  useEffect(() => {
    if (!parentAccountId || dirtyFields.code || !accounts) return;
    const suggested = suggestNextCode(parentAccountId, accounts);
    if (suggested) setValue('code', suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentAccountId, accounts]);

  const onSubmit = (values: AccountFormValues) => {
    mutation.mutate(
      {
        code: values.code,
        name: values.name,
        accountTypeId: values.accountTypeId,
        parentAccountId: values.parentAccountId || undefined,
        allowsTransactions: !values.isGrouping,
        tenantId,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
          <DialogDescription>Se agrega solo para tu organización — otros tenants no la verán.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountTypeId">Tipo</Label>
            <Controller
              name="accountTypeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="accountTypeId">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountTypeId && <p className="text-sm text-destructive">{errors.accountTypeId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentAccountId">Cuenta padre (opcional)</Label>
            <Controller
              name="parentAccountId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="parentAccountId">
                    <SelectValue placeholder="Sin padre — cuenta de primer nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Ej. bajo "4000 Ingresos" para que quede agrupada junto a Ofrendas/Diezmos/Talentos. Al elegirla, el código de abajo se sugiere solo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="code">
                Código{' '}
                <span className="font-normal text-muted-foreground">
                  {parentAccountId ? '(sugerido, editable)' : '(elige cuenta padre para sugerirlo)'}
                </span>
              </Label>
              <Input id="code" placeholder="4004" {...register('code')} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Proyecto: Equipo de Sonido" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="isGrouping">Cuenta de agrupación</Label>
              <p className="text-xs text-muted-foreground">
                Solo para organizar (ej. "4000 Ingresos" como encabezado) — no admite movimientos propios.
              </p>
            </div>
            <Controller
              name="isGrouping"
              control={control}
              render={({ field }) => (
                <Switch id="isGrouping" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
