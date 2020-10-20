"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("websocket");
class SocketClient {
    constructor(sockeHost, socketPort, irCodeType, logger) {
        this.sockeHost = sockeHost;
        this.socketPort = socketPort;
        this.irCodeType = irCodeType;
        this.logger = logger;
        this.client = null;
        this.connection = null;
        this.listeners = [];
        this.logger.debug('Inside SocketClient Class');
        this.connect();
    }
    connect() {
        this.client = new websocket_1.client();
        this.client.on('connect', (connection) => {
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
                this.handleMessage(message.utf8Data);
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
    addMessageListener(listenerId, callback) {
        this.listeners.push({ id: listenerId, callback });
    }
    removeMessageListener(listenerId) {
        this.listeners = this.listeners.filter((listener) => listener.id !== listenerId);
    }
    handleMessage(msg) {
        const [command, payload] = msg.split(';');
        this.logger.debug('received message: ' + JSON.stringify({ command, payload }));
        this.listeners.forEach((listener) => listener.callback(msg));
    }
    sendCommand(command, payload = '') {
        if (command === 'IR-SEND') {
            command = 'IR-SEND:' + this.irCodeType;
        }
        this.logger.debug(`SENDING SOCKET MESSAGE: ${JSON.stringify({ command, payload })}`);
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                throw new Error('No connection available...');
            }
            this.connection.send(`${command};${payload}`, (err) => {
                if (err) {
                    this.logger.debug('Sending failed!');
                    this.logger.error(err.message);
                    reject(err);
                }
                else {
                    this.logger.debug('Sending succeeded!');
                    resolve();
                }
            });
        });
    }
}
exports.default = SocketClient;
//# sourceMappingURL=SocketClient.js.map