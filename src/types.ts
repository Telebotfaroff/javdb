export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export interface Movie {
  code: string;
  title: string;
  link: string;
  poster: string | null;
  releaseDate?: string;
  studio?: string;
  actress?: string;
  plot?: string;
  dvdId?: string;
}

export interface MovieDetails {
  title: string;
  dvdId: string;
  contentId?: string;
  releaseDate: string;
  runtime: string;
  studio: string;
  director?: string;
  actress?: string;
  genres?: string[];
  plot: string;
  poster: string | null;
  screenshots?: string[];
  similarMovies: { code: string; title: string; link: string; poster: string | null }[];
  streamingLinks?: { site: string; url: string }[];
}

export interface QueueItem {
  id: string;
  mode: 'page' | 'sequential' | 'range';
  query: string;
  startNum: number;
  endPage?: number;
  padding?: number;
  rangeEndNum?: number;
}

export interface TrackedActress {
  name: string;
  profilePic?: string | null;
  movies?: { code: string; title: string; link: string; poster: string | null }[];
}
