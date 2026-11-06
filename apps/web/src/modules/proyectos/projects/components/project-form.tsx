import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { DateInput } from '@/components/ui/date-input';
import { useBranchesQuery } from '@/modules/general';
import { useAccountsQuery } from '@/modules/finanzas';
import { useCreateProjectMutation, useUpdateProjectMutation } from '@/modules/proyectos';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { Project } from '@isai/shared-types';

const INCOME_ACCOUNT_TYPE = 'INCOME';
const ASSET_ACCOUNT_TYPE = 'ASSET';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  description: z.string().optional(),
  branchId: z.string().min(1, 'Selecciona la sucursal cuya caja recibe el dinero'),
  goalAmount: z.string().min(1, 'La meta es requerida'),
  targetDate: z.string().optional(),
  incomeAccountId: z.string().optional(),
  cashAccountId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const EMPTY_VALUES: ProjectFormValues = {
  name: '',
  description: '',
  branchId: '',
  goalAmount: '',
  targetDate: '',
  incomeAccountId: '',
  cashAccountId: '',
};

interface ProjectFormProps {
  institutionId: string;
  project?: Project;
  onSaved: (project: Project) => void;
}

export function ProjectForm({ institutionId, project, onSaved }: ProjectFormProps) {
  const isEditing = !!project;
  const currentUser = useAuthStore((state) => state.user);
  const isSuperadmin = !!currentUser && !currentUser.tenantId;
  const permissions = currentUser?.permissions ?? [];
  const canViewBranches = isSuperadmin || permissions.includes('core.branch.view');
  const canViewAccounts = isSuperadmin || permissions.includes('finance.account.view');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const { data: accounts } = useAccountsQuery(undefined, canViewAccounts);
  const incomeAccounts = accounts?.filter((a) => a.accountType.code === INCOME_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const cashAccounts = accounts?.filter((a) => a.accountType.code === ASSET_ACCOUNT_TYPE && a.allowsTransactions) ?? [];
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description ?? '',
          branchId: project.branchId,
          goalAmount: project.goalAmount,
          targetDate: project.targetDate?.slice(0, 10) ?? '',
          incomeAccountId: project.incomeAccountId ?? '',
          cashAccountId: project.cashAccountId ?? '',
        }
      : EMPTY_VALUES,
  });

  const onSubmit = (values: ProjectFormValues) => {
    const dto = {
      name: values.name,
      description: values.description || undefined,
      goalAmount: Number(values.goalAmount),
      targetDate: values.targetDate || undefined,
      incomeAccountId: values.incomeAccountId || undefined,
      cashAccountId: values.cashAccountId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: project.id, dto }, { onSuccess: onSaved });
    } else {
      createMutation.mutate({ ...dto, institutionId, branchId: values.branchId }, { onSuccess: onSaved });
    }
  };

  return (
    <Card className="mt-4 rounded-2xl">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold">{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEditing ? 'Actualiza los datos de la campaña.' : 'Crea una campaña de recaudación con meta y fecha.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Equipo de sonido" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" {...register('description')} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                La sucursal cuya Caja recibe el dinero — aunque el proyecto sea para toda la iglesia.
              </p>
              {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goalAmount">Meta</Label>
              <Input id="goalAmount" type="number" min="0" step="0.01" placeholder="13000" {...register('goalAmount')} />
              {errors.goalAmount && <p className="text-sm text-destructive">{errors.goalAmount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Fecha objetivo (opcional)</Label>
              <Controller
                name="targetDate"
                control={control}
                render={({ field }) => <DateInput id="targetDate" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeAccountId">Cuenta de ingreso (opcional)</Label>
            <Controller
              name="incomeAccountId"
              control={control}
              render={({ field }) => (
                <Combobox
                  id="incomeAccountId"
                  options={incomeAccounts}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  getOptionValue={(account) => account.id}
                  getOptionLabel={(account) => `${account.code} · ${account.name}`}
                  placeholder="Sin configurar — bloquea Contabilizar hasta que se elija"
                  searchPlaceholder="Buscar por código o nombre..."
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              A qué cuenta se contabilizan los aportes de este proyecto. Se puede configurar después.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashAccountId">Caja propia del proyecto (opcional)</Label>
            <Controller
              name="cashAccountId"
              control={control}
              render={({ field }) => (
                <Combobox
                  id="cashAccountId"
                  options={cashAccounts}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  getOptionValue={(account) => account.id}
                  getOptionLabel={(account) => `${account.code} · ${account.name}`}
                  placeholder="Sin configurar — usa la caja de la sucursal"
                  searchPlaceholder="Buscar por código o nombre..."
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Si el dinero de este proyecto se guarda en una caja distinta a la general (ej. la de un grupo), elígela
              aquí. Si no, Contabilizar usa la caja por defecto de la sucursal.
            </p>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error, 'No se pudo guardar. Verifica los datos e intenta de nuevo.')}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
