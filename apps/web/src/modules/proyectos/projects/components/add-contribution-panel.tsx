import { useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateInput } from '@/components/ui/date-input';
import { usePersonsQuery, useGroupsQuery } from '@/modules/membresia';
import { PersonForm } from '@/modules/membresia/persons/components/person-form';
import { useCreateProjectContributionMutation } from '@/modules/proyectos';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';
import { todayLocalDateInput } from '@/lib/format-date';
import type { PersonWithRelations } from '@isai/shared-types';

interface AddContributionPanelProps {
  projectId: string;
  institutionId: string;
  onDone: () => void;
}

// Aporta una Person (miembro o externo, ej. personType='Visitante") O un
// Group ("aportó el grupo X") — nunca ambos, el toggle decide cuál campo se
// manda. Mismo patrón de buscador que add-family-relationship-panel.tsx
// para el lado de personas.
export function AddContributionPanel({ projectId, institutionId, onDone }: AddContributionPanelProps) {
  const [contributorType, setContributorType] = useState<'person' | 'group'>('person');
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const canViewGroups = permissions.includes('membership.group.view');
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId, canViewPersons);
  const { data: groups } = useGroupsQuery(institutionId, canViewGroups);
  const mutation = useCreateProjectContributionMutation(projectId);

  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [contributedAt, setContributedAt] = useState(todayLocalDateInput());
  const [notes, setNotes] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const available = useMemo(() => {
    const term = normalizeText(search.trim());
    return (persons ?? []).filter((p) => !term || normalizeText(`${p.firstName} ${p.lastName}`).includes(term));
  }, [persons, search]);

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasContributor = contributorType === 'person' ? !!personId : !!groupId;
  const canSubmit = hasContributor && isAmountValid && !!contributedAt;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      {
        personId: contributorType === 'person' ? personId : undefined,
        groupId: contributorType === 'group' ? groupId : undefined,
        amount: parsedAmount,
        contributedAt,
        notes: notes || undefined,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Registrar aporte</h3>
        <Button variant="ghost" size="icon" onClick={onDone} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <Tabs value={contributorType} onValueChange={(v) => setContributorType(v as 'person' | 'group')}>
          <TabsList>
            <TabsTrigger value="person">Persona</TabsTrigger>
            <TabsTrigger value="group">Grupo</TabsTrigger>
          </TabsList>

          <TabsContent value="person">
            {quickAddOpen ? (
              <PersonForm
                institutionId={institutionId}
                onCancel={() => setQuickAddOpen(false)}
                onSaved={(created: PersonWithRelations) => {
                  setContributorType('person');
                  setPersonId(created.id);
                  setSelectedPersonName(`${created.firstName} ${created.lastName}`);
                  setSearch('');
                  setQuickAddOpen(false);
                }}
              />
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="contribution-person-search">Buscar persona</Label>
                    <Input
                      id="contribution-person-search"
                      placeholder="Buscar por nombre..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={() => setQuickAddOpen(true)} className="shrink-0">
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Nueva
                  </Button>
                </div>

                {personId && !available.some((p) => p.id === personId) && (
                  <p className="mt-2 rounded-lg border bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                    Seleccionado: {selectedPersonName}
                  </p>
                )}

                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border">
                  {!canViewPersons && (
                    <p className="p-3 text-sm text-muted-foreground">No tienes permiso para ver personas.</p>
                  )}
                  {canViewPersons && isPersonsLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
                  {canViewPersons && !isPersonsLoading && available.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">
                      Nadie coincide con esa búsqueda. Si es alguien externo, usa "Nueva" arriba para registrarlo rápido.
                    </p>
                  )}
                  {canViewPersons && !isPersonsLoading &&
                    available.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPersonId(p.id);
                          setSelectedPersonName(`${p.firstName} ${p.lastName}`);
                        }}
                        className={cn(
                          'flex w-full items-center border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50',
                          personId === p.id && 'bg-primary/10 font-medium text-primary',
                        )}
                      >
                        {p.firstName} {p.lastName}
                      </button>
                    ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="group">
            <div className="space-y-2">
              <Label htmlFor="contribution-group">Grupo</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="contribution-group">
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contribution-amount">Monto</Label>
            <Input
              id="contribution-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="200.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-date">Fecha</Label>
            <DateInput id="contribution-date" value={contributedAt} onChange={setContributedAt} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contribution-notes">Notas (opcional)</Label>
          <Input id="contribution-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error, 'No se pudo registrar. Verifica los datos e intenta de nuevo.')}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
