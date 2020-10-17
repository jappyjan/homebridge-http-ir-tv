import {
  Categories,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
  CharacteristicGetCallback,
} from 'homebridge';

import {HttpIrTvPlugin} from './HttpIrTvPlugin';

interface TelevisionDevice {
    'name': string;
    'tv-manufacturer': string;
    'tv-model': string;
    'tv-serial': string;
    'ip': string;
    'port': number;
    'codeType': string;
    'codes': {
        'power': string;
        'volume': {
            'up': string;
            'down': string;
            'mute': string;
        };
        'keys': {
            'REWIND': string;
            'FAST_FORWARD': string;
            'NEXT_TRACK': string;
            'PREVIOUS_TRACK': string;
            'ARROW_UP': string;
            'ARROW_DOWN': string;
            'ARROW_LEFT': string;
            'ARROW_RIGHT': string;
            'SELECT': string;
            'BACK': string;
            'EXIT': string;
            'PLAY_PAUSE': string;
            'INFORMATION': string;
        };
    };
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HttpIrTvAccessory {
    private readonly televisionService: Service;
    private speakerService?: Service;
    private configuredRemoteKeys: number[] = [];
    private readonly device: TelevisionDevice;

    private state = {
      mute: false,
    };

    constructor(
        private readonly platform: HttpIrTvPlugin,
        private readonly accessory: PlatformAccessory,
    ) {
      accessory.category = Categories.TELEVISION;

      this.device = accessory.context.device;
      this.televisionService = this.accessory.getService(this.platform.Service.Television) ||
        this.accessory.addService(this.platform.Service.Television, 'Television', 'Television');

      this.configureMetaCharacteristics();

      this.televisionService.getCharacteristic(this.platform.Characteristic.Active)
        .on('set', this.onPowerTogglePress.bind(this));

      this.configureRemoteKeys();

      if (this.device.codes.volume.up && this.device.codes.volume.down) {
        this.configureVolumeKeys();
      }

      this.televisionService
        .getCharacteristic(this.platform.Characteristic.ActiveIdentifier)!
        .on('set', (newValue: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.platform.log.debug('set Active Identifier => setNewValue: ' + newValue);
          callback(null);
        });

      let isActive = false;
      setInterval(() => {
        isActive = !isActive;

        this.platform.log.debug('Triggering television active state:', isActive);
        this.televisionService.updateCharacteristic(this.platform.Characteristic.Active, isActive);
      }, 10000);
    }

    configureMetaCharacteristics() {
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(
            this.platform.Characteristic.Manufacturer,
                this.platform.config['tv-manufacturer'] as string || 'Default-Manufacturer',
          )
          .setCharacteristic(
            this.platform.Characteristic.Model,
                this.platform.config['tv-model'] as string || 'Default-Model',
          )
          .setCharacteristic(
            this.platform.Characteristic.SerialNumber,
                this.platform.config['tv-serial'] as string || 'Default-Serial',
          );

        this.televisionService
          .setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

        this.televisionService.setCharacteristic(
          this.platform.Characteristic.ConfiguredName,
          this.accessory.context.device.name,
        );

        this.televisionService.setCharacteristic(
          this.platform.Characteristic.SleepDiscoveryMode,
          this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
        );

        this.televisionService.setCharacteristic(
          this.platform.Characteristic.Name,
          this.accessory.context.device.name,
        );
    }

    configureRemoteKeys() {
      this.televisionService.getCharacteristic(this.platform.Characteristic.RemoteKey)
        .on('set', this.onRemoteKeyPress.bind(this));

      const configuredRemoteKeyStrings = this.device.codes.keys ? Object.keys(this.device.codes.keys) : [];
      configuredRemoteKeyStrings.forEach(key => {
        this.platform.log.debug('Configuring Remote-Key: ' + key);
        this.configuredRemoteKeys.push(
          (this.platform.Characteristic.RemoteKey as unknown as { [key: string]: number })[key],
        );
      });
    }

    configureVolumeKeys() {
      this.platform.log.debug('Adding speaker service');
      this.speakerService =
            this.accessory.getService(this.platform.Service.TelevisionSpeaker) ??
            this.accessory.addService(this.platform.Service.TelevisionSpeaker);

      // set the volume control type
      this.speakerService
        .setCharacteristic(
          this.platform.Characteristic.Active,
          this.platform.Characteristic.Active.ACTIVE,
        )
        .setCharacteristic(
          this.platform.Characteristic.VolumeControlType,
          this.platform.Characteristic.VolumeControlType.RELATIVE,
        );

      if (this.device.codes.volume.mute) {
        this.speakerService
          .getCharacteristic(this.platform.Characteristic.Mute)
          .on('set', this.setMute.bind(this))
          .on('get', this.getMute.bind(this));
      }

      this.speakerService
        .getCharacteristic(this.platform.Characteristic.VolumeSelector)
        .on('set', this.setVolume.bind(this));

      // Link the service
      this.televisionService.addLinkedService(this.speakerService);
    }

    setMute(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback,
    ): void {
      this.platform.log.debug('setMute called with: ' + value);
      this.state.mute = !this.state.mute;
      callback(null);
    }

    getMute(
      callback: CharacteristicGetCallback,
    ): void {
      this.platform.log.debug('getMute called');

      callback(null, this.state.mute);
    }

    setVolume(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback,
    ): void {
      this.platform.log.debug('setVolume called with: ' + value);

      let command = this.device.codes.volume.up;
      if (value === this.platform.Characteristic.VolumeSelector.DECREMENT) {
        command = this.device.codes.volume.down;
      }

      this.platform.log.debug('Sending code: ' + command);
      callback(null);
    }

    onPowerTogglePress(value: CharacteristicValue, callback: CharacteristicSetCallback) {
      this.platform.log.debug('Set Characteristic On ->', value);

      // you must call the callback function
      callback(null);
    }

    onRemoteKeyPress(value: CharacteristicValue, callback: CharacteristicSetCallback) {
      this.platform.log.debug('Remote Key Pressed ' + value);

      if (
        !this.device.codes.keys ||
          !((value as string) in this.configuredRemoteKeys)
      ) {
        callback(new Error(`Remote-Key "${value}" not configured`));
      }

      this.platform.log.debug('Remote-Key is configured!');

      callback(null);
    }
}
