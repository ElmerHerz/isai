import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  FileCheck,
  FileText,
  HeartHandshake,
  KeyRound,
  Landmark,
  LayoutGrid,
  List,
  ListTree,
  MapPin,
  Settings,
  Shield,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// Mapea los strings guardados en general.menus.icon (sembrados por SQL) a
// componentes reales de lucide-react. Se mantiene sincronizado a mano con
// cada SQL de menús que se corre — si un ícono nuevo cae al fallback
// genérico, es que falta agregarlo acá.
const ICON_MAP: Record<string, LucideIcon> = {
  shield: Shield,
  users: Users,
  key: KeyRound,
  'file-text': FileText,
  settings: Settings,
  building: Building2,
  'map-pin': MapPin,
  list: List,
  award: Award,
  calendar: Calendar,
  'clipboard-check': ClipboardCheck,
  'file-check': FileCheck,
  'heart-handshake': HeartHandshake,
  'layout-grid': LayoutGrid,
  wallet: Wallet,
  'list-tree': ListTree,
  'book-open': BookOpen,
  'bar-chart': BarChart3,
  target: Target,
  landmark: Landmark,
};

const FALLBACK_ICON: LucideIcon = LayoutGrid;

export function resolveIcon(icon: string | null): LucideIcon {
  if (icon && ICON_MAP[icon]) {
    return ICON_MAP[icon];
  }
  return FALLBACK_ICON;
}
