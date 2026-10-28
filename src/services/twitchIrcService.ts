export interface ParsedTwitchMessage {
  raw: string;
  command: string;
  channel: string;
  username: string;
  displayName: string;
  message: string;
  isMod: boolean;
  isSub: boolean;
  isVip: boolean;
  isBroadcaster: boolean;
  bits?: number;
  tags: Record<string, string>;
  timestamp: number;
}

export class TwitchIrcClient {
  private ws: WebSocket | null = null;
  private channel = '';
  private isConnected = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageListeners: ((msg: ParsedTwitchMessage) => void)[] = [];
  private statusListeners: ((status: 'connected' | 'connecting' | 'disconnected', error?: string) => void)[] = [];

  constructor() {}

  public connect(channelName: string) {
    this.disconnect();

    const cleanChannel = channelName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanChannel) return;

    this.channel = cleanChannel;
    this.notifyStatus('connecting');

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        if (!this.ws) return;
        // Request Twitch tags & commands capabilities
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        // Anonymous login (read-only)
        const anonymousNick = `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
        this.ws.send('PASS SCHMOOPIE');
        this.ws.send(`NICK ${anonymousNick}`);
        this.ws.send(`JOIN #${this.channel}`);

        this.isConnected = true;
        this.notifyStatus('connected');

        // Twitch IRC Ping/Pong heartbeat
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send('PING :tmi.twitch.tv');
          }
        }, 60000);
      };

      this.ws.onmessage = (event) => {
        const data = event.data as string;
        const lines = data.split('\r\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // Respond to server PING to keep connection alive
          if (line.startsWith('PING')) {
            this.ws?.send('PONG :tmi.twitch.tv');
            continue;
          }

          const parsed = this.parseIrcLine(line);
          if (parsed && parsed.command === 'PRIVMSG') {
            this.messageListeners.forEach((fn) => fn(parsed));
          }
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Twitch IRC error:', err);
        this.notifyStatus('disconnected', 'Failed to connect to Twitch chat.');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyStatus('disconnected');
        if (this.pingInterval) clearInterval(this.pingInterval);
      };
    } catch (e: unknown) {
      this.notifyStatus('disconnected', e instanceof Error ? e.message : 'Connection failed');
    }
  }

  public disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      try {
        if (this.channel && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(`PART #${this.channel}`);
        }
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.channel = '';
    this.notifyStatus('disconnected');
  }

  public getChannel(): string {
    return this.channel;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public onMessage(cb: (msg: ParsedTwitchMessage) => void) {
    this.messageListeners.push(cb);
    return () => {
      this.messageListeners = this.messageListeners.filter((fn) => fn !== cb);
    };
  }

  public onStatus(cb: (status: 'connected' | 'connecting' | 'disconnected', error?: string) => void) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((fn) => fn !== cb);
    };
  }

  private notifyStatus(status: 'connected' | 'connecting' | 'disconnected', error?: string) {
    this.statusListeners.forEach((fn) => fn(status, error));
  }

  private parseIrcLine(rawLine: string): ParsedTwitchMessage | null {
    try {
      let line = rawLine;
      const tags: Record<string, string> = {};

      if (line.startsWith('@')) {
        const spaceIdx = line.indexOf(' ');
        const tagStr = line.slice(1, spaceIdx);
        line = line.slice(spaceIdx + 1);

        const rawTags = tagStr.split(';');
        for (const t of rawTags) {
          const [key, val] = t.split('=');
          if (key) tags[key] = val || '';
        }
      }

      // Format: :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
      let prefix = '';
      if (line.startsWith(':')) {
        const spaceIdx = line.indexOf(' ');
        prefix = line.slice(1, spaceIdx);
        line = line.slice(spaceIdx + 1);
      }

      const parts = line.split(' ');
      const command = parts[0];
      const target = parts[1] || '';
      const trailingIdx = line.indexOf(' :');
      const text = trailingIdx !== -1 ? line.slice(trailingIdx + 2) : '';

      const userMatch = prefix.match(/^([^!]+)!/);
      const username = userMatch ? userMatch[1] : tags['login'] || 'anonymous';
      const displayName = tags['display-name'] || username;

      const badges = tags['badges'] || '';
      const isMod = badges.includes('moderator') || tags['mod'] === '1';
      const isSub = badges.includes('subscriber') || badges.includes('founder');
      const isVip = badges.includes('vip');
      const isBroadcaster = badges.includes('broadcaster');

      let bits: number | undefined;
      if (tags['bits']) {
        bits = parseInt(tags['bits'], 10);
      }

      return {
        raw: rawLine,
        command,
        channel: target.replace(/^#/, ''),
        username,
        displayName,
        message: text,
        isMod,
        isSub,
        isVip,
        isBroadcaster,
        bits,
        tags,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }
}

export const twitchClient = new TwitchIrcClient();
