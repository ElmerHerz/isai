import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableSearch } from '@/components/ui/table-search';
import { useCatalogItemsQuery } from '@/modules/general';
import {
  useEventRosterQuery,
  eventRosterQueryKey,
  useRecordAttendanceMutation,
  useCreatePersonMutation,
  useAddGroupMembersMutation,
  useAttendanceTagsQuery,
} from '@/modules/membresia';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/toast';
import { normalizeText } from '@/lib/normalize-text';
import type { EventWithRelations } from '@isai/shared-types';

const ATTENDANCE_STATUS_CATALOG_CODE = 'attendance_status';
const PERSON_TYPE_CATALOG_CODE = 'person_type';
const VISITOR_CODE = 'VISITOR';
const PRESENT_CODE = 'PRESENT';

interface AttendanceEditorProps {
  event: EventWithRelations;
}

// Contenido de "tomar asistencia" sin envoltorio de Dialog — se usa directo
// dentro de la página de detalle del evento (más espacio, sin scroll
// anidado, mejor en móvil que un modal chico). Antes vivía como
// AttendanceDialog; se extrajo para poder incrustarlo en la página.
export function AttendanceEditor({ event }: AttendanceEditorProps) {
  const queryClient = useQueryClient();
  const { data: roster, isLoading } = useEventRosterQuery(event.id);
  const { data: statuses } = useCatalogItemsQuery(ATTENDANCE_STATUS_CATALOG_CODE);
  const { data: tags } = useAttendanceTagsQuery();
  const { data: personTypes } = useCatalogItemsQuery(PERSON_TYPE_CATALOG_CODE);
  const recordMutation = useRecordAttendanceMutation(event.id);
  const createPersonMutation = useCreatePersonMutation();
  const addMemberMutation = useAddGroupMembersMutation(event.groupId ?? '');

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [tagSelection, setTagSelection] = useState<Record<string, Set<string>>>({});
  const [search, setSearch] = useState('');
  const [visitorFirstName, setVisitorFirstName] = useState('');
  const [visitorLastName, setVisitorLastName] = useState('');

  useEffect(() => {
    if (!roster) return;
    setSelection((prev) => {
      const next = { ...prev };
      for (const entry of roster) {
        if (entry.attendance && !(entry.person.id in next)) {
          next[entry.person.id] = entry.attendance.statusId;
        }
      }
      return next;
    });
    setTagSelection((prev) => {
      const next = { ...prev };
      for (const entry of roster) {
        const savedTags = entry.attendance?.extraData?.tags;
        if (savedTags && savedTags.length > 0 && !(entry.person.id in next)) {
          next[entry.person.id] = new Set(savedTags);
        }
      }
      return next;
    });
  }, [roster]);

  const toggleTag = (personId: string, code: string) => {
    setTagSelection((prev) => {
      const next = { ...prev };
      const current = new Set(next[personId] ?? []);
      if (current.has(code)) current.delete(code);
      else current.add(code);
      next[personId] = current;
      return next;
    });
  };

  const visitorTypeId = useMemo(
    () => personTypes?.find((t) => t.code === VISITOR_CODE)?.id,
    [personTypes],
  );
  const presentStatusId = useMemo(
    () => statuses?.find((s) => s.code === PRESENT_CODE)?.id,
    [statuses],
  );

  const filteredRoster = useMemo(() => {
    const term = normalizeText(search.trim());
    if (!term) return roster ?? [];
    return (roster ?? []).filter((entry) =>
      normalizeText(`${entry.person.firstName} ${entry.person.lastName}`).includes(term),
    );
  }, [roster, search]);

  // Resumen por estado — el "detalle" a simple vista sin tener que contar
  // filas a mano: cuántos Presentes/Ausentes/etc. y cuántos siguen sin
  // marcar dentro del roster completo.
  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const statusId of Object.values(selection)) {
      counts.set(statusId, (counts.get(statusId) ?? 0) + 1);
    }
    const total = roster?.length ?? 0;
    const marked = Object.keys(selection).length;
    return {
      total,
      marked,
      pending: total - marked,
      byStatus: (statuses ?? []).map((status) => ({ status, count: counts.get(status.id) ?? 0 })),
    };
  }, [selection, roster, statuses]);

  // La forma rápida de tomar asistencia: la mayoría asiste, así que se
  // marcan todos como Presente de una vez (todo el roster, no solo lo que
  // el buscador esté mostrando) y solo queda buscar y corregir las
  // excepciones (ausentes, tarde, justificados) una por una.
  const onMarkAllPresent = () => {
    if (!presentStatusId || !roster) return;
    setSelection(Object.fromEntries(roster.map((entry) => [entry.person.id, presentStatusId])));
  };

  const onClearAll = () => setSelection({});

  const onAddVisitor = () => {
    if (!visitorFirstName.trim() || !visitorLastName.trim() || !visitorTypeId) return;

    createPersonMutation.mutate(
      {
        institutionId: event.institutionId,
        branchId: event.branchId ?? undefined,
        personTypeId: visitorTypeId,
        firstName: visitorFirstName.trim(),
        lastName: visitorLastName.trim(),
      },
      {
        onSuccess: (person) => {
          setVisitorFirstName('');
          setVisitorLastName('');
          const afterRoster = () => queryClient.invalidateQueries({ queryKey: eventRosterQueryKey(event.id) });
          if (event.groupId) {
            addMemberMutation.mutate([{ personId: person.id }], { onSuccess: afterRoster });
          } else {
            afterRoster();
          }
        },
      },
    );
  };

  const onSubmit = () => {
    // Si una etiqueta que alguien tenía marcada se borró del catálogo desde
    // que se cargó el roster, no reenviarla — el backend la rechazaría por
    // no reconocerla, y ya no tiene forma de mostrarse en este selector.
    const activeTagCodes = new Set(tags?.map((t) => t.code) ?? []);
    const records = Object.entries(selection).map(([personId, statusId]) => {
      const personTags = tagSelection[personId];
      const validTags = personTags ? Array.from(personTags).filter((code) => activeTagCodes.has(code)) : [];
      return {
        personId,
        statusId,
        tags: validTags.length > 0 ? validTags : undefined,
      };
    });
    recordMutation.mutate(records);
  };

  return (
    <div className="space-y-4">
      {(roster?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.byStatus.map(({ status, count }) => (
            <span
              key={status.id}
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {status.name}: <span className="font-semibold text-foreground">{count}</span>
            </span>
          ))}
          <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Sin registrar: <span className="font-semibold text-foreground">{summary.pending}</span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="space-y-1">
          <Label htmlFor="visitor-first-name" className="text-xs">Nombre</Label>
          <Input
            id="visitor-first-name"
            className="h-9 w-full sm:w-36"
            value={visitorFirstName}
            onChange={(e) => setVisitorFirstName(e.target.value)}
            placeholder="Nombre"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="visitor-last-name" className="text-xs">Apellido</Label>
          <Input
            id="visitor-last-name"
            className="h-9 w-full sm:w-36"
            value={visitorLastName}
            onChange={(e) => setVisitorLastName(e.target.value)}
            placeholder="Apellido"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAddVisitor}
          disabled={
            !visitorFirstName.trim() ||
            !visitorLastName.trim() ||
            createPersonMutation.isPending ||
            addMemberMutation.isPending
          }
          className="w-full sm:w-auto"
        >
          + Agregar visitante
        </Button>
      </div>

      {(roster?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <TableSearch value={search} onChange={setSearch} placeholder="Buscar persona..." />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {summary.marked} de {summary.total} marcados
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onMarkAllPresent}
              disabled={!presentStatusId}
              className="flex-1 sm:flex-none"
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Marcar todos presentes
            </Button>
            {summary.marked > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={onClearAll}>
                <X className="mr-1 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* En móvil el roster crece con la página en vez de tener su propio
          scroll interno — dos scrolls anidados (el de la página y el de
          esta lista) es incómodo con el pulgar en una pantalla chica. En
          escritorio sí conviene el scroll interno para no perder de vista
          los contadores/buscador de arriba. */}
      <div className="overflow-y-auto rounded-lg border sm:max-h-[28rem]">
        {isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando...</p>}
        {!isLoading && (roster?.length ?? 0) === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No hay personas elegibles para este evento.</p>
        )}
        {!isLoading && (roster?.length ?? 0) > 0 && filteredRoster.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Nadie coincide con esa búsqueda.</p>
        )}
        {filteredRoster.map((entry) => (
          <div key={entry.person.id} className="border-b px-3 py-3 text-sm last:border-b-0 sm:py-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="min-w-0 truncate font-medium sm:flex-1 sm:font-normal">
                {entry.person.firstName} {entry.person.lastName}
              </span>
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:shrink-0 sm:items-center">
                {statuses?.map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    title={status.name}
                    onClick={() => setSelection((prev) => ({ ...prev, [entry.person.id]: status.id }))}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition-colors sm:h-8 sm:w-8 sm:rounded-full',
                      selection[entry.person.id] === status.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {status.name.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {tags && tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const active = tagSelection[entry.person.id]?.has(tag.code) ?? false;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(entry.person.id, tag.code)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {recordMutation.isError && (
        <p className="text-sm text-destructive">
          {getErrorMessage(recordMutation.error, 'No se pudo guardar la asistencia. Intenta de nuevo.')}
        </p>
      )}

      <div className="flex sm:justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={summary.marked === 0 || recordMutation.isPending}
          className="w-full sm:w-auto"
        >
          {recordMutation.isPending ? 'Guardando...' : 'Guardar asistencia'}
        </Button>
      </div>
    </div>
  );
}
