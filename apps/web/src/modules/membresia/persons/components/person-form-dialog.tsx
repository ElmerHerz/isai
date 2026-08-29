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
import { DateInput } from '@/components/ui/date-input';
import { useCatalogItemsQuery, useBranchesQuery } from '@/modules/general';
import { useCreatePersonMutation, useUpdatePersonMutation } from '@/modules/membresia';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import type { PersonWithRelations } from '@isai/shared-types';

const personSchema = z.object({
  personTypeId: z.string().min(1, 'Selecciona un tipo'),
  branchId: z.string().optional(),
  firstName: z.string().min(1, 'El nombre es requerido').max(100),
  lastName: z.string().min(1, 'El apellido es requerido').max(100),
  birthDate: z.string().optional(),
  gender: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Correo inválido').max(255).optional().or(z.literal('')),
  identityDocument: z.string().max(30).optional(),
  addressLine: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  joinDate: z.string().optional(),
  notes: z.string().optional(),
});

type PersonFormValues = z.infer<typeof personSchema>;

const EMPTY_VALUES: PersonFormValues = {
  personTypeId: '',
  branchId: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  phone: '',
  email: '',
  identityDocument: '',
  addressLine: '',
  city: '',
  joinDate: '',
  notes: '',
};

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  person?: PersonWithRelations;
  /** Se dispara solo al CREAR (no al editar) — para flujos que necesitan la
   * persona recién creada de inmediato, ej. quick-add de un aportante
   * externo dentro de otro diálogo (ver add-contribution-dialog.tsx). */
  onCreated?: (person: PersonWithRelations) => void;
}

export function PersonFormDialog({ open, onOpenChange, institutionId, person, onCreated }: PersonFormDialogProps) {
  const isEditing = !!person;
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewBranches = permissions.includes('core.branch.view');
  const { data: personTypes } = useCatalogItemsQuery('person_type');
  const { data: branches } = useBranchesQuery(institutionId, canViewBranches);
  const createMutation = useCreatePersonMutation();
  const updateMutation = useUpdatePersonMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        person
          ? {
              personTypeId: person.personTypeId,
              branchId: person.branchId ?? '',
              firstName: person.firstName,
              lastName: person.lastName,
              birthDate: person.birthDate?.slice(0, 10) ?? '',
              gender: person.gender ?? '',
              phone: person.phone ?? '',
              email: person.email ?? '',
              identityDocument: person.identityDocument ?? '',
              addressLine: person.addressLine ?? '',
              city: person.city ?? '',
              joinDate: person.joinDate?.slice(0, 10) ?? '',
              notes: person.notes ?? '',
            }
          : EMPTY_VALUES,
      );
    }
  }, [open, person, reset]);

  const onSubmit = (values: PersonFormValues) => {
    const onSuccess = () => onOpenChange(false);
    const dto = {
      ...values,
      branchId: values.branchId || undefined,
      birthDate: values.birthDate || undefined,
      gender: values.gender || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      identityDocument: values.identityDocument || undefined,
      addressLine: values.addressLine || undefined,
      city: values.city || undefined,
      joinDate: values.joinDate || undefined,
      notes: values.notes || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: person.id, dto }, { onSuccess });
    } else {
      createMutation.mutate(
        { ...dto, institutionId },
        {
          onSuccess: (created) => {
            onSuccess();
            onCreated?.(created);
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar persona' : 'Nueva persona'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos de la persona.' : 'Registra una persona en esta institución.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" placeholder="María" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" placeholder="González" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personTypeId">Tipo</Label>
            <Controller
              name="personTypeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="personTypeId">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {personTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.personTypeId && <p className="text-sm text-destructive">{errors.personTypeId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal (opcional)</Label>
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Toda la institución" />
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" placeholder="+503 7000-0000" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo (opcional)</Label>
              <Input id="email" type="email" placeholder="maria@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento (opcional)</Label>
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => <DateInput id="birthDate" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDate">Fecha de ingreso (opcional)</Label>
              <Controller
                name="joinDate"
                control={control}
                render={({ field }) => <DateInput id="joinDate" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="identityDocument">Documento (opcional)</Label>
              <Input id="identityDocument" placeholder="DUI, cédula..." {...register('identityDocument')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad (opcional)</Label>
              <Input id="city" placeholder="San Salvador" {...register('city')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine">Dirección (opcional)</Label>
            <Input id="addressLine" placeholder="5a avenida 10-25, zona 1" {...register('addressLine')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register('notes')} />
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
