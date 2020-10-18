import { Logger } from 'homebridge';
export default class SocketClient {
    private readonly sockeHost;
    private readonly socketPort;
    private readonly socketPath;
    private readonly irCodeType;
    private readonly logger;
    private client;
    private connection;
    constructor(sockeHost: string, socketPort: number, socketPath: string, irCodeType: string, logger: Logger);
    private connect;
    private handleMessage;
    sendCommand(command: string, payload?: string): Promise<unknown>;
}
//# sourceMappingURL=SocketClient.d.ts.map