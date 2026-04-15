export class ExistsResultEntry {
  id: string;
  exists: boolean;
  location: 'hot' | 'archive' | null;
}

export class ExistsResponseDto {
  type: string;
  results: ExistsResultEntry[];
}
