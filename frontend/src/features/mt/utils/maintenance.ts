import type { MaintenanceTicket } from '../types';

export const terminal = (ticket: MaintenanceTicket) =>
  ticket.progress === 'DONE' || ticket.progress === 'UNREPAIRABLE';
