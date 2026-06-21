/**
 * MemberService – business logic layer for Member operations.
 * All member mutations go through this service rather than directly
 * calling repositories from components.
 */
import { memberRepository } from '../repositories';
import { createRecordMetadata } from './recordMetadata';
import type { Member, MemberStatus, Role } from '../types';

export const MemberService = {
  /**
   * Submit a new member registration.
   * Always creates with "Pending" status regardless of what the caller passes.
   * The admin must explicitly approve.
   */
  async submitRegistration(member: Member, submittedByUid: string): Promise<void> {
    const meta = createRecordMetadata(submittedByUid);
    await memberRepository.upsert(
      { ...member, ...meta, status: 'Pending' as const },
      submittedByUid,
    );
  },

  /**
   * Approve / update a member's status.
   * Only callable by admin roles; the caller must enforce the role guard
   * before calling this (Firestore rules enforce it server-side as well).
   */
  async updateStatus(
    memberId: string,
    status: MemberStatus,
    correctionNote: string,
    adminUid: string,
    adminRole: Role,
  ): Promise<void> {
    const adminRoles: Role[] = ['choir_admin', 'parish_admin', 'diocese_admin', 'super_admin'];
    if (!adminRoles.includes(adminRole)) {
      throw new Error('Insufficient role to update member status.');
    }
    await memberRepository.patch(memberId, { status, correctionNote }, adminUid);
  },

  /**
   * Update member profile details (own record only or admin).
   */
  async updateProfile(member: Member, uid: string): Promise<void> {
    const meta = createRecordMetadata(uid);
    await memberRepository.upsert(
      { ...member, ...meta, status: member.status },
      uid,
    );
  },
};
