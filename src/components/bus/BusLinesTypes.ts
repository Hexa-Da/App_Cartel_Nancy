/**
 * Shared types for tram / bus map layers (BusLines feature).
 */

export interface TramLine {
  id: string;
  name: string;
  description: string;
  color: string;
  coordinates: [number, number][];
  stops: {
    name: string;
    coords: [number, number];
    googleMapsUrl?: string;
    googleMapsUrls?: Array<{
      direction: string;
      url: string;
    }>;
  }[];
  coordinatesVandeouvre?: [number, number][];
  coordinatesMaxeville?: [number, number][];
  coordinatesLaxou?: [number, number][];
  coordinatesHoudemont?: [number, number][];
  coordinatesLaneuville?: [number, number][];
  coordinatesVillers?: [number, number][];
  coordinatesSeichamps?: [number, number][];
}

export interface BusLinesProps {
  visibleLines: string[];
}
