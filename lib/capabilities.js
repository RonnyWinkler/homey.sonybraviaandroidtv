const SonyBraviaAndroidTvCommunicator = require('./sony-bravia-android-tv-communicator');

module.exports = [
  {
    name: 'onoff',
    function: (device, _value) => {
      device.log(`setting device power state to: `, _value );
      if (_value != device.getCapabilityValue("onoff")){
        // state changed => check polling interval
        device._clearIntervals();
        device._checkDeviceInterval({onoff_state: _value});
      }
      return SonyBraviaAndroidTvCommunicator.setDevicePowerState(device, _value);
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
    function: (device, _value) => {
      device.log(`Set mute: ${_value}`);
      return SonyBraviaAndroidTvCommunicator.setMute(device, _value);
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
    name: 'mode_input',
    function: (device, _value) => {
      try{
        device.log(`set input to ${_value}.`);
        return SonyBraviaAndroidTvCommunicator.selectInput(device, _value);
      }
      catch(err){
        return;
      }
    }
  }

]
