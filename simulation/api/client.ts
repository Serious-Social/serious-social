import { SimLogger } from '../logger';

export class ApiClient {
  constructor(
    private baseUrl: string,
    private logger: SimLogger,
  ) {}

  async storeCastMapping(data: {
    postId: string;
    castHash: string;
    authorFid: number;
    text: string;
    authorUsername: string;
    authorDisplayName: string;
    authorPfpUrl?: string;
  }): Promise<void> {
    await this.post('/api/cast-mapping', data);
  }

  async recordParticipant(data: {
    postId: string;
    fid: number;
    side: 'support' | 'challenge';
    amount: string;
  }): Promise<void> {
    await this.post('/api/market-participants', data);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn('api', `${path} failed (${res.status}): ${text}`);
        return null;
      }

      return res.json();
    } catch (err) {
      this.logger.warn('api', `${path} request error: ${(err as Error).message}`);
      return null;
    }
  }
}
