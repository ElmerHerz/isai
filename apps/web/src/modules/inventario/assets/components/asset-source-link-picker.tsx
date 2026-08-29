import { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useProjectsQuery, useProjectExpensesQuery } from '@/modules/proyectos';
import { useGroupsQuery } from '@/modules/membresia';
import { useGroupFundMovementsQuery } from '@/modules/finanzas';

function formatAmount(value: string) {
  return `$${Number(value).toFixed(2)}`;
}

const SOURCE_TYPE_NONE = '__none__';

interface AssetSourceLinkPickerProps {
  institutionId: string;
  sourceType: 'project_expense' | 'group_fund_expense' | undefined;
  sourceId: string | undefined;
  onChange: (value: { sourceType?: 'project_expense' | 'group_fund_expense'; sourceId?: string }) => void;
}

// Enlace liviano y opcional a "de qué gasto salió" (docs/comercio-mejoras-propuestas.md §6) —
// reusa hooks ya existentes de Proyectos/Membresía/Finanzas, sin endpoints nuevos.
// Nunca toca la contabilidad, solo arma sourceType/sourceId para mostrar la
// referencia en el detalle del activo.
export function AssetSourceLinkPicker({ institutionId, sourceType, sourceId, onChange }: AssetSourceLinkPickerProps) {
  const [projectId, setProjectId] = useState('');
  const [groupId, setGroupId] = useState('');

  const { data: projects } = useProjectsQuery(sourceType === 'project_expense' ? institutionId : '');
  const { data: projectExpenses } = useProjectExpensesQuery(projectId);
  const { data: groups } = useGroupsQuery(sourceType === 'group_fund_expense' ? institutionId : '', sourceType === 'group_fund_expense');
  const { data: groupMovements } = useGroupFundMovementsQuery(groupId, !!groupId);
  const groupExpenses = groupMovements?.filter((m) => m.type === 'expense') ?? [];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select
          value={sourceType ?? SOURCE_TYPE_NONE}
          onValueChange={(v) => {
            setProjectId('');
            setGroupId('');
            if (v === SOURCE_TYPE_NONE) onChange({ sourceType: undefined, sourceId: undefined });
            else onChange({ sourceType: v as 'project_expense' | 'group_fund_expense', sourceId: undefined });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SOURCE_TYPE_NONE}>Ninguno</SelectItem>
            <SelectItem value="project_expense">Gasto de Proyecto</SelectItem>
            <SelectItem value="group_fund_expense">Gasto de Fondo de Grupo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sourceType === 'project_expense' && (
        <>
          <div className="space-y-1.5">
            <Label>Proyecto</Label>
            <Select value={projectId} onValueChange={(v) => { setProjectId(v); onChange({ sourceType, sourceId: undefined }); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
              <SelectContent>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gasto</Label>
            <Select value={sourceId ?? ''} onValueChange={(v) => onChange({ sourceType, sourceId: v })} disabled={!projectId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un gasto" /></SelectTrigger>
              <SelectContent>
                {projectExpenses?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.incurredAt.slice(0, 10)} — {formatAmount(e.amount)} — {e.notes ?? e.account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {sourceType === 'group_fund_expense' && (
        <>
          <div className="space-y-1.5">
            <Label>Grupo</Label>
            <Select value={groupId} onValueChange={(v) => { setGroupId(v); onChange({ sourceType, sourceId: undefined }); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona un grupo" /></SelectTrigger>
              <SelectContent>
                {groups?.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gasto</Label>
            <Select value={sourceId ?? ''} onValueChange={(v) => onChange({ sourceType, sourceId: v })} disabled={!groupId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un gasto" /></SelectTrigger>
              <SelectContent>
                {groupExpenses.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.entryDate.slice(0, 10)} — {formatAmount(e.amount)} — {e.notes ?? e.account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
