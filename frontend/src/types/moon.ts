import type { MissionDefinition, StationDefinition } from './game';

export interface OutpostOption {
  site: MoonSite;
  station: StationDefinition;
  mission: MissionDefinition;
}

export interface MoonSite {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  kind: 'historical_landing_site';
  landing_date: string;
  eva_hours: number;
  sample_return_kg: number;
  mission: { name: string; theme: string; objective: string; source_url: string };
  training_station_id: string;
  training_mission_id: string;
}

export interface MoonCatalog {
  schema_version: 2;
  retrieved_at: string;
  coordinate_frame: string;
  sources: { id: string; title: string; url: string; credit: string; usage: string }[];
  texture: { path: string; source_url: string; credit: string; sha256: string; bytes: number; note: string };
  sites: MoonSite[];
}
