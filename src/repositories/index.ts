/**
 * Repository index – singleton repository instances.
 * Import from here; never instantiate directly.
 */
import { createRepository } from './BaseRepository';
import type { Member, Mass, Payment, ChoirEvent, Announcement, Song } from '../types';

export const memberRepository = createRepository<Member>('members');
export const massRepository = createRepository<Mass>('masses');
export const paymentRepository = createRepository<Payment>('payments');
export const eventRepository = createRepository<ChoirEvent>('events');
export const announcementRepository = createRepository<Announcement>('announcements');
export const songRepository = createRepository<Song>('songs');
