const SonyBraviaAndroidTvCommunicator = require('./sony-bravia-android-tv-communicator');

module.exports = [
  {
    name: 'onoff',
    function: async (device, _value) => {
      device.log(`setting device power state to: `, _value );
      try{
        await SonyBraviaAndroidTvCommunicator.setDevicePowerState(device, _value);
      }
      catch(err){
        try{
          if (_value){
            await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'PowerOn');
          }
          else{
            await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'PowerOff');
          }
        }
        catch(err){
          try{
            await device.homey.app.wakeOnLan(device.getSettings().macAddress);
            await device.homey.app.checkDeviceAvailability(device);
            if (_value){
              await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'PowerOn');
            }
            else{
              await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'PowerOff');
            }
          }
          catch(err){
            throw new Error("Power on not possible.")
          }
          // throw new Error("Power on not possible.")
        }
      }

      if (_value != device.getCapabilityValue("onoff")){
        // state changed => check polling interval
        await device._clearIntervals();
        await device._checkDeviceInterval({onoff_state: _value});
      }
    }
  },
  {
    name: 'channel_up',
    function: async (device, _value) => {
      device.log(`turning channel up.`);
      await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'ChannelUp');
    }
  },
  {
    name: 'channel_down',
    function: async (device, _value) => {
      device.log(`turning channel down.`);
      await SonyBraviaAndroidTvCommunicator.sendCommand(device, 'ChannelDown');
    }
  },
  {
    name: 'volume_up',
    function: async (device, _value) => {
      device.log(`turn volume up.`);
      let volume = '+1';
      await SonyBraviaAndroidTvCommunicator.setVolume(device, volume);
    }
  },
  {
    name: 'volume_down',
    function: async (device, _value) => {
      device.log(`turn volume down.`);
      let volume = '-1';
      await SonyBraviaAndroidTvCommunicator.setVolume(device, volume);
    }
  },
  {
    name: 'volume_mute',
    function: async (device, _value) => {
      device.log(`Set mute: ${_value}`);
      await SonyBraviaAndroidTvCommunicator.setMute(device, _value);
    }
  },
  {
    name: 'volume_set',
    function: async (device, _value) => {
      device.log(`set volume of speaker to ${_value}.`);
      let volume = (_value * device.data.device.speaker.maxVolume).toString();
      await SonyBraviaAndroidTvCommunicator.setVolume(device, volume, 'speaker');
    }
  },
  {
    name: 'input',
    function: async (device, _value) => {
      device.log(`set input to ${_value}.`);
      await SonyBraviaAndroidTvCommunicator.selectInput(device, _value);
    }
  },
  {
    name: 'audio_output',
    function: async (device, _value) => {
      device.log(`set audio_output to ${_value}.`);
      await SonyBraviaAndroidTvCommunicator.setSoundSettings(device, _value);
    }
  },
  {
    name: 'screen_off',
    function: async (device, _value) => {
      device.log(`set screen_off to ${_value}.`);
      await device.screenOff(_value);
    }
  }

]
