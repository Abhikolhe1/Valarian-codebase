import {createClient, RedisClientType} from 'redis';

/** Owns one socket client; requests never create clients during reconnection. */
export class RedisConnection {
  client?: RedisClientType;
  private connecting?: Promise<void>;
  private stopped = false;

  constructor(
    private readonly url: string | undefined,
    private readonly label: string,
    private readonly timeout = Number(process.env.REDIS_CONNECT_TIMEOUT ?? 2000),
    private readonly factory: typeof createClient = createClient,
  ) {}

  async ready(): Promise<boolean> {
    if (this.stopped || !this.url) return false;
    if (this.client?.isReady) return true;
    if (!this.client) {
      const client: RedisClientType = this.factory({
        url: this.url,
        disableOfflineQueue: true,
        socket: {
          connectTimeout: this.timeout,
          // Keep retrying on the same client, with a capped delay.
          reconnectStrategy: retries => Math.min(100 * 2 ** Math.min(retries, 6), 5000),
        },
      });
      this.client = client;
      client.on('error', error => console.error(`[${this.label}] Redis error:`, error.message));
      this.connecting = client.connect().then(() => {}).catch(() => {
        if (client.isOpen) client.destroy();
        if (this.client === client) this.client = undefined;
      });
    }
    // Redis may be down indefinitely. Bound the request wait, not the lifetime
    // of the reconnecting client; do not discard a still-running connection.
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.connecting,
        new Promise<void>(resolve => {timer = setTimeout(resolve, this.timeout);}),
      ]);
      return this.client?.isReady === true;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.client?.isOpen) this.client.destroy();
    this.client = undefined;
  }
}
