
export type Region = 'Asia' | 'Europe' | 'US' | 'Canada' | 'Africa' | 'Oceania' | 'Middle East' | 'Latin America' | 'None of Above';
export type Referral = 'Linkedin' | 'Website' | 'News' | 'An acquaintance' | 'Etc.';
export type Room = 'Room1' | 'Room2';
export type Purpose = 'General Visit' | 'To attend the meeting';

// Column definition for spreadsheet data structures
export interface Column {
  key: string;
  label: string;
  type: 'string' | 'number';
}

// Row definition for spreadsheet data structures
export interface Row {
  id: string;
  [key: string]: any;
}

export interface Reservation {
  id: string;
  timestamp: string;
  name: string;
  companyName: string;
  region: Region;
  referral: Referral;
  attendees: number;
  purpose: Purpose;
  date: string; // e.g., 'Jan 6'
  room: Room;
  timeSlot: string; // e.g., '08:00 - 08:30'
}

export interface AdminLog {
  id: string;
  timestamp: string;
  action: 'IMPORT' | 'MANUAL_ENTRY' | 'DELETE' | 'EXPORT' | 'LOGIN';
  details: string;
}

export const TIME_SLOTS = [
  '08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
  '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00',
  '12:00 - 12:30', '12:30 - 13:00', '13:00 - 13:30', '13:30 - 14:00',
  '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', '15:30 - 16:00',
  '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30', '17:30 - 18:00',
  '18:00 - 18:30'
];

export const DATES = ['Jan 6', 'Jan 7', 'Jan 8', 'Jan 9'];
