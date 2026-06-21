/**
 * Member validation schemas.
 * Pure TypeScript validators – no external dependencies required.
 * These run client-side before Firebase writes; Firestore rules are the real gate.
 */
import type { Member, VoiceType, MemberType } from '../types';

const VALID_VOICE_TYPES: VoiceType[] = ['Soprano', 'Alto', 'Tenor', 'Bass', 'None'];
const VALID_MEMBER_TYPES: MemberType[] = ['Singer', 'Keyboard', 'Guitar', 'Violin', 'Flute', 'Tabla', 'Pad', 'Drums', 'Other'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMember(data: Partial<Member>): ValidationResult {
  const errors: string[] = [];

  if (!data.firstName?.trim()) errors.push('First name is required.');
  if (!data.lastName?.trim()) errors.push('Last name is required.');
  if (data.firstName && data.firstName.length > 80) errors.push('First name must be under 80 characters.');
  if (data.lastName && data.lastName.length > 80) errors.push('Last name must be under 80 characters.');

  if (!data.gender) errors.push('Gender is required.');

  if (!data.dob) {
    errors.push('Date of birth is required.');
  } else {
    const dobDate = new Date(data.dob);
    const now = new Date();
    const age = (now.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 5 || age > 120) errors.push('Please enter a valid date of birth.');
  }

  if (!data.mobile?.trim()) {
    errors.push('Mobile number is required.');
  } else if (!/^[\d\s+\-()]{6,20}$/.test(data.mobile)) {
    errors.push('Enter a valid mobile number.');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Enter a valid email address.');
  }

  if (!data.parish?.trim()) errors.push('Parish name is required.');

  if (data.voiceType && !VALID_VOICE_TYPES.includes(data.voiceType)) {
    errors.push(`Voice type must be one of: ${VALID_VOICE_TYPES.join(', ')}.`);
  }

  if (data.memberType && !VALID_MEMBER_TYPES.includes(data.memberType)) {
    errors.push(`Member type must be one of: ${VALID_MEMBER_TYPES.join(', ')}.`);
  }

  if (data.experience !== undefined && (data.experience < 0 || data.experience > 70)) {
    errors.push('Experience must be between 0 and 70 years.');
  }

  return { valid: errors.length === 0, errors };
}
