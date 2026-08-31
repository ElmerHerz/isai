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
import { useCreateProjectPledgeMutation } from '@/modules/proyectos';
import { useAuthStore } from '@/lib/auth-store';
import { getErrorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/lib/normalize-text';
import type { PersonWithRelations } from '@isai/shared-types';

interface AddPledgePanelProps {
  projectId: string;
  institutionId: string;
  onDone: () => void;
}

const FREQUENCY_LABELS: Record<'once' | 'monthly' | 'weekly', string> = {
  once: 'Única vez',
  monthly: 'Mensual',
  weekly: 'Semanal',
};

// Promete una Person (miembro o externo) O un Group ("prometió el grupo X")
// — nunca ambos. Mismo patrón de buscador que AddContributionPanel, sin paso
// de "Contabilizar" (una promesa nunca genera asiento contable).
export function AddPledgePanel({ projectId, institutionId, onDone }: AddPledgePanelProps) {
  const [contributorType, setContributorType] = useState<'person' | 'group'>('person');
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canViewPersons = permissions.includes('membership.person.view');
  const canViewGroups = permissions.includes('membership.group.view');
  const { data: persons, isLoading: isPersonsLoading } = usePersonsQuery(institutionId, canViewPersons);
  const { data: groups } = useGroupsQuery(institutionId, canViewGroups);
  const mutation = useCreateProjectPledgeMutation(projectId);

  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'monthly' | 'weekly'>('once');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const available = useMemo(() => {
    const term = normalizeText(search.trim());
    return (persons ?? []).filter((p) => !term || normalizeText(`${p.firstName} ${p.lastName}`).includes(term));
  }, [persons, search]);

  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasContributor = contributorType === 'person' ? !!personId : !!groupId;
  const canSubmit = hasContributor && isAmountValid;

  const onSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      {
        personId: contributorType === 'person' ? personId : undefined,
        groupId: contributorType === 'group' ? groupId : undefined,
        amount: parsedAmount,
        frequency,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Registrar compromiso</h3>
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
                    <Label htmlFor="pledge-person-search">Buscar persona</Label>
                    <Input
                      id="pledge-person-search"
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
              <Label htmlFor="pledge-group">Grupo</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="pledge-group">
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
            <Label htmlFor="pledge-amount">Monto</Label>
            <Input
              id="pledge-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="200.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pledge-frequency">Frecuencia</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger id="pledge-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_LABELS) as (keyof typeof FREQUENCY_LABELS)[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FREQUENCY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pledge-expected-date">Fecha esperada (opcional)</Label>
          <DateInput id="pledge-expected-date" value={expectedDate} onChange={setExpectedDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pledge-notes">Notas (opcional)</Label>
          <Input id="pledge-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
