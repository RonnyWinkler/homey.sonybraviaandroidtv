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
        device._clearIntervals();
        device._checkDeviceInterval({onoff_state: _value});
      }
    }
  },
  {
    name: 'channel_up',
    function: (device, _value) => {
      device.log(`turning channel up.`);
      return SonyBraviaAndroidTvCommunicator.sendCommand(device, 'ChannelUp');
    }
  },
  {
    name: 'channel_down',
    function: (device, _value) => {
      device.log(`turning channel down.`);
      return SonyBraviaAndroidTvCommunicator.sendCommand(device, 'ChannelDown');
    }
  },
  {
    name: 'volume_up',
    function: (device, _value) => {
      device.log(`turn volume up.`);
      let volume = '+1';
      return SonyBraviaAndroidTvCommunicator.setVolume(device, volume);
    }
  },
  {
    name: 'volume_down',
    function: (device, _value) => {
      device.log(`turn volume down.`);
      let volume = '-1';
      return SonyBraviaAndroidTvCommunicator.setVolume(device, volume);
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
    function: (device, _value) => {
      try{
        device.log(`set volume of speaker to ${_value}.`);
        let volume = (_value * device.data.device.speaker.maxVolume).toString();
        return SonyBraviaAndroidTvCommunicator.setVolume(device, volume, 'speaker');
      }
      catch(err){
        return;
      }
    }
  },
  {
    name: 'input',
    function: (device, _value) => {
      try{
        device.log(`set input to ${_value}.`);
        return SonyBraviaAndroidTvCommunicator.selectInput(device, _value);
      }
      catch(err){
        return;
      }
    }
  },
  {
    name: 'audio_output',
    function: (device, _value) => {
      try{
        device.log(`set audio_output to ${_value}.`);
        return SonyBraviaAndroidTvCommunicator.setSoundSettings(device, _value);
      }
      catch(err){
        return;
      }
    }
  },
  {
    name: 'screen_off',
    function: async (device, _value) => {
      try{
        device.screenOff(_value);
      }
      catch(err){
        return;
      }
    }
  }

]
