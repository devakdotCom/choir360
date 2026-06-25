import { useMemo } from 'react';
import { useSyncedCollection } from './useSyncedCollection';
import { TenantContext } from '../services/recordMetadata';
import { Member, TenantScopedRecord } from '../types';

/**
 * Fields that must never live in the broadly tenant-readable `members`
 * collection. They are stored in a separate `privateMembers/{memberId}`
 * document instead, readable only by the member themself or an admin
 * (see firestore.rules). Everything else stays in `members` so choir
 * rosters, voice-part lists, attendance, etc. keep working off a single
 * cheap read.
 */
const PRIVATE_FIELD_KEYS = ['dob', 'mobile', 'whatsapp', 'email', 'address', 'emergencyContact'] as const;
type PrivateFieldKey = typeof PRIVATE_FIELD_KEYS[number];
type PrivateFields = Pick<Member, PrivateFieldKey>;
type PublicMember = Omit<Member, PrivateFieldKey>;

const EMPTY_PRIVATE_FIELDS: PrivateFields = {
  dob: '',
  mobile: '',
  whatsapp: '',
  email: '',
  address: '',
  emergencyContact: { name: '', relationship: '', phone: '' },
};

function splitMember(member: Member): { publicPart: PublicMember; privatePart: PrivateFields & { id: string } } {
  const { dob, mobile, whatsapp, email, address, emergencyContact, ...publicPart } = member;
  return {
    publicPart,
    privatePart: { id: member.id, dob, mobile, whatsapp, email, address, emergencyContact },
  };
}

function mergeMember(pub: PublicMember, priv: PrivateFields | undefined): Member {
  return { ...pub, ...(priv ?? EMPTY_PRIVATE_FIELDS) } as Member;
}

/**
 * Drop-in replacement for `useSyncedCollection<Member>('members', ...)` that
 * transparently keeps DOB/mobile/whatsapp/email/address/emergency-contact in
 * a separate, tightly-scoped `privateMembers` collection while still handing
 * callers a fully-merged `Member[]` — no other component needs to change.
 */
export function useMembersWithPrivateData(
  fallbackRecords: Member[],
  syncEnabled = true,
  tenantContext?: TenantContext,
) {
  const fallbackPublic = useMemo(
    () => fallbackRecords.map((m) => splitMember(m).publicPart),
    [fallbackRecords],
  );
  const fallbackPrivate = useMemo(
    () => fallbackRecords.map((m) => splitMember(m).privatePart),
    [fallbackRecords],
  );

  const publicCollection = useSyncedCollection<PublicMember>('members', fallbackPublic, syncEnabled, tenantContext);
  const privateCollection = useSyncedCollection<PrivateFields & { id: string }>(
    'privateMembers',
    fallbackPrivate,
    syncEnabled,
    tenantContext,
  );

  const records = useMemo<Member[]>(() => {
    const privateById = new Map<string, PrivateFields & { id: string }>(
      privateCollection.records.map((p) => [p.id, p] as const),
    );
    return publicCollection.records.map((pub) => mergeMember(pub, privateById.get(pub.id)));
  }, [publicCollection.records, privateCollection.records]);

  const upsert = async (member: Member, userId?: string) => {
    const { publicPart, privatePart } = splitMember(member);
    await Promise.all([
      publicCollection.actions.upsert(publicPart, userId),
      privateCollection.actions.upsert(privatePart, userId),
    ]);
  };

  const patch = async (
    id: string,
    patchData: Partial<Member & TenantScopedRecord>,
    userId?: string,
  ) => {
    const privatePatch: Record<string, unknown> = {};
    const publicPatch: Record<string, unknown> = {};
    const privateKeySet: readonly string[] = PRIVATE_FIELD_KEYS;

    for (const [key, value] of Object.entries(patchData)) {
      if (privateKeySet.includes(key)) {
        privatePatch[key] = value;
      } else {
        publicPatch[key] = value;
      }
    }

    await Promise.all([
      Object.keys(publicPatch).length
        ? publicCollection.actions.patch(id, publicPatch as Partial<PublicMember & TenantScopedRecord>, userId)
        : Promise.resolve(),
      Object.keys(privatePatch).length
        ? privateCollection.actions.patch(id, privatePatch as Partial<PrivateFields & TenantScopedRecord>, userId)
        : Promise.resolve(),
    ]);
  };

  return {
    records,
    isLive: publicCollection.isLive,
    syncError: publicCollection.syncError || privateCollection.syncError,
    actions: { upsert, patch },
  };
}
