/**
 * MassService – business logic for Mass and Payment operations.
 */
import { massRepository, paymentRepository } from '../repositories';
import { createRecordMetadata } from './recordMetadata';
import type { Mass, Payment, Role } from '../types';

export const MassService = {
  async addMass(mass: Mass, adminUid: string, adminRole: Role): Promise<void> {
    const adminRoles: Role[] = ['choir_admin', 'parish_admin', 'diocese_admin', 'super_admin'];
    if (!adminRoles.includes(adminRole)) throw new Error('Insufficient role to add a Mass.');
    await massRepository.upsert(
      { ...mass, ...createRecordMetadata(adminUid, 'active') },
      adminUid,
    );
  },
};

export const PaymentService = {
  async recordPayment(
    paymentId: string,
    receivedAmount: number,
    status: Payment['status'],
    promisedAmount: number,
    adminUid: string,
    adminRole: Role,
  ): Promise<void> {
    const adminRoles: Role[] = ['choir_admin', 'parish_admin', 'diocese_admin', 'super_admin'];
    if (!adminRoles.includes(adminRole)) throw new Error('Insufficient role to update payment.');

    const pendingAmount = Math.max(promisedAmount - receivedAmount, 0);
    await paymentRepository.patch(paymentId, { receivedAmount, pendingAmount, status }, adminUid);
  },
};
