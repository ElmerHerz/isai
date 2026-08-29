import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  useProductCategoriesQuery,
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
} from '@/modules/inventario';

interface CategoriesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Categorías nunca se borran (mismo criterio que el resto del sistema) — se
// renombran o se desactivan con el switch, que además las oculta del select
// del formulario de producto.
export function CategoriesManagerDialog({ open, onOpenChange }: CategoriesManagerDialogProps) {
  const { data: categories } = useProductCategoriesQuery();
  const createMutation = useCreateProductCategoryMutation();
  const updateMutation = useUpdateProductCategoryMutation();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim(), { onSuccess: () => setNewName('') });
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const saveEditing = () => {
    if (!editingId || !editingName.trim()) return;
    updateMutation.mutate({ id: editingId, dto: { name: editingName.trim() } }, { onSuccess: () => setEditingId(null) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorías de producto</DialogTitle>
          <DialogDescription>
            Agrega, renombra o desactiva categorías — desactivar deja de mostrarlas al crear un
            producto, no borra las que ya la tienen asignada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Nombre de la categoría nueva"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button type="button" size="icon" variant="outline" onClick={handleCreate} disabled={createMutation.isPending || !newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {categories?.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Todavía no hay categorías.</p>
          )}

          {categories?.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              {editingId === category.id ? (
                <Input
                  autoFocus
                  className="h-8"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEditing();
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={saveEditing}
                />
              ) : (
                <button
                  type="button"
                  className={`truncate text-left text-sm ${category.isActive ? '' : 'text-muted-foreground line-through'}`}
                  onClick={() => startEditing(category.id, category.name)}
                >
                  {category.name}
                </button>
              )}

              <Switch
                checked={category.isActive}
                onCheckedChange={(checked) => updateMutation.mutate({ id: category.id, dto: { isActive: checked } })}
                aria-label={category.isActive ? 'Desactivar categoría' : 'Activar categoría'}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
