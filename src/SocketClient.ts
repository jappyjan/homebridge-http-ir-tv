import {client as WssClient, connection as WssConnection} from 'websocket';
import {Logger} from 'homebridge';
import EventEmitter from 'events';

export default class SocketClient {
    private client: WssClient | null = null;
    private connection: WssConnection | null = null;
    private listeners: Array<{id: string; callback: (msg: string) => any}> = [];

    constructor(
        private readonly sockeHost: string,
        private readonly socketPort: number,
        private readonly irCodeType: string,
        private readonly logger: Logger,
    ) {
      this.logger.debug('Inside SocketClient Class');
      this.connect();
    }

    private connect() {
      this.client = new WssClient();

      this.client.on('connect', (connection: WssConnection) => {
        this.logger.debug('Socket Connection established!');
        this.connection = connection;

        this.logger.debug('Adding connection listeners...');

        this.connection.on('error', (error) => {
          this.logger.error('WSS Connection Error');
          throw error;
        });

        this.connection.on('close', () => {
          this.logger.debug('Socket Connection closed by Server');
          this.connect();
        });

        this.connection.on('message', (message) => {
          if (message.type !== 'utf8') {
            throw new Error('Cannot handle binary WebSocket messages...');
          }

          this.handleMessage(message.utf8Data as string);
        });
      });

      this.client.on('connectFailed', (err) => {
        this.logger.error('WSS Connection failed!');
        throw err;
      });

      this.logger.debug('Connecting to Socket Server...');
      const wssServerAddress = `ws://${this.sockeHost}:${this.socketPort}`;
      this.logger.debug(`Server: ${wssServerAddress}`);

      this.client.connect(wssServerAddress);
    }

    public addMessageListener(listenerId: string, callback: (msg: string) => any) {
      this.listeners.push({id: listenerId, callback});
    }

    public removeMessageListener(listenerId: string) {
      this.listeners = this.listeners.filter(
        (listener) => listener.id !== listenerId,
      );
    }

    private handleMessage(msg: string) {
      const [command, payload] = msg.split(';');
      this.logger.debug('received message: ' + JSON.stringify({command, payload}));
      this.listeners.forEach((listener) => listener.callback(msg));
    }

    public sendCommand(command: string, payload = '') {
      if (command === 'IR-SEND') {
        command = 'IR-SEND:' + this.irCodeType;
      }
      this.logger.debug(`SENDING SOCKET MESSAGE: ${JSON.stringify({command, payload})}`);

      return new Promise((resolve, reject) => {
        if (!this.connection) {
          throw new Error('No connection available...');
        }

        this.connection.send(`${command};${payload}`, (err) => {
          if (err) {
            this.logger.debug('Sending failed!');
            this.logger.error(err!.message);
            reject(err);
          } else {
            this.logger.debug('Sending succeeded!');
            resolve();
          }
        });
      });
    }
}
