import { Activity, Building2, CalendarDays, ClipboardList, GraduationCap, ShieldCheck, type LucideIcon } from 'lucide-react';

export type DashboardView = 'dashboard' | 'staff' | 'students' | 'venues' | 'events' | 'audit';

const ITEMS: { view: DashboardView; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Live dashboard', icon: Activity },
  { view: 'staff', label: 'Security staff', icon: ShieldCheck },
  { view: 'students', label: 'Students', icon: GraduationCap },
  { view: 'venues', label: 'Venues', icon: Building2 },
  { view: 'events', label: 'Events & gates', icon: CalendarDays },
  { view: 'audit', label: 'Audit log', icon: ClipboardList },
];

interface SidebarNavProps {
  activeView: DashboardView;
  onChange: (view: DashboardView) => void;
}

export function SidebarNav({ activeView, onChange }: SidebarNavProps) {
  return (
    <nav className="sidebar-nav" aria-label="Administrator navigation">
      {ITEMS.map(({ view, label, icon: Icon }) => (
        <button key={view} type="button" className={activeView === view ? 'nav-item nav-item--active' : 'nav-item'}
          onClick={() => onChange(view)} aria-current={activeView === view ? 'page' : undefined}>
          <Icon size={19} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
