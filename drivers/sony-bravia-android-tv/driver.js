const Homey = require('homey');

const SonyBraviaAndroidTvFinder = require('../../lib/sony-bravia-android-tv-finder');

class SonyBraviaAndroidTvDriver extends Homey.Driver {
  onPair(session) {
    session.setHandler('list_devices', async () => await this.fetchAvailableDevices(session));
    session.setHandler('manual_input', async (data) => await this.fetchDeviceDetails(data));
    session.setHandler('preshared_key', async (device) => await this.fetchExpandedDeviceDetails(device));
  }

  async fetchExpandedDeviceDetails(device) {
    try {
      const extendedDevice =
        await SonyBraviaAndroidTvFinder.fetchExtendDeviceDetails(device);

      this.log('Got extended Sony BRAVIA Android TV data: ', extendedDevice);

      return extendedDevice;
    } catch (err) {
      this.log("Error fetchExpandedDeviceDetails(): ",err.message);
      throw err;
    }

    // return null;
  }

  async fetchDeviceDetails(data) {
    let device = SonyBraviaAndroidTvFinder.populateDeviceData(
      data.name,
      null,
      data.ipAddress,
      data.macAddress
    );

    try {
      const basicDevice =
        await SonyBraviaAndroidTvFinder.fetchBasicDeviceDetails(device);

      this.log('Got basic Sony BRAVIA Android TV data: ', basicDevice);

      return basicDevice;
    } catch (err) {
      this.log("Error fetchDeviceDetails(): ",err);
      throw err;
    }

    // return null;
  }

  async fetchAvailableDevices(session) {
    let foundDevices = await SonyBraviaAndroidTvFinder.discoverDevices(this);
    let devices = [];

    this.log('Found Sony BRAVIA Android TV\'s: ', foundDevices);

    if (foundDevices.length < 1) {
      await session.showView('not_found');
    }

    let existingDevices = this.getDevices();
    for (let i=0; i<foundDevices.length; i++){
      // Filter existin devices by ID
      if (existingDevices.filter(e => e.getData().id === foundDevices[i].data.id).length <= 0){
        // Filter aldready added devices in case of HP23 and two active LAN ports (Wifi+LAN)
        if (devices.filter(e => e.data.id === foundDevices[i].data.id).length <= 0){
              devices.push(foundDevices[i]);
        }
      }
    }

    this.log('Filtered devices (prevent duplicated devices)\'s: ', foundDevices);

    return devices;
  }
}

module.exports = SonyBraviaAndroidTvDriver;
