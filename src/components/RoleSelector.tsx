import React from 'react';
import { Role } from '../types';
import { Building2, Church, ChevronDown, ShieldCheck, Users, UserRound, Globe2 } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: Role;
  setRole: (role: Role) => void;
}

const roles = [
  { id: 'super_admin' as Role, name: 'Super Admin', icon: ShieldCheck },
  { id: 'diocese_admin' as Role, name: 'Diocese Admin', icon: Building2 },
  { id: 'parish_admin' as Role, name: 'Parish Admin', icon: Church },
  { id: 'choir_admin' as Role, name: 'Choir Admin', icon: Users },
  { id: 'choir_member' as Role, name: 'Choir Member', icon: UserRound },
  { id: 'public_user' as Role, name: 'Public User', icon: Globe2 },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, setRole }) => {
  const current = roles.find((role) => role.id === currentRole) ?? roles[0];
  const Icon = current.icon;

  return (
    <label className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white transition hover:bg-white/12">
      <Icon className="h-4 w-4 text-amber-300" />
      <span className="hidden text-left sm:block">
        <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">View as</span>
        <span className="block font-semibold leading-tight">{current.name}</span>
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      <select
        aria-label="Select active role"
        value={currentRole}
        onChange={(event) => setRole(event.target.value as Role)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>
    </label>
  );
};
