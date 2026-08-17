import {
  Building2,
  FileText,
  KeyRound,
  LayoutGrid,
  List,
  MapPin,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Mapea los strings guardados en general.menus.icon (sembrados en el SQL)
// a componentes reales de lucide-react.
const ICON_MAP: Record<string, LucideIcon> = {
  shield: Shield,
  users: Users,
  key: KeyRound,
  'file-text': FileText,
  settings: Settings,
  building: Building2,
  'map-pin': MapPin,
  list: List,
};

const FALLBACK_ICON: LucideIcon = LayoutGrid;

export function resolveIcon(icon: string | null): LucideIcon {
  if (icon && ICON_MAP[icon]) {
    return ICON_MAP[icon];
  }
  return FALLBACK_ICON;
}
