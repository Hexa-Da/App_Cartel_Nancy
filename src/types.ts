export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  type: 'venue';
  matches: Match[];
}

export interface Match {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  type: 'match';
  teams: string;
  time: string;
  endTime?: string;
  result?: string;
  venueId: string;
}

export interface PlanningFile {
  id: string;
  name: string;
  type: 'pdf' | 'excel';
  url: string;
  uploadDate: number;
  description?: string;
  uploadedBy: string;
} 