const Homey = require('homey');

const RemoteControlCodes = require('./remote-control-codes');
const http = require('./http')

class SonyBraviaAndroidTVCommunicator extends Homey.SimpleClass {
  constructor() {
    super();
  }

  // async getDeviceAvailability(device) {
  //   const settings = device.getSettings();

  //   try {
  //     let body = JSON.stringify({
  //       method: 'getPowerStatus',
  //       params: [],
  //       id: 2,
  //       version: '1.0'
  //     });

  //     let response = await http.request( 
  //       'POST', 
  //       `http://${settings.ip}/sony/system`,
  //       {
  //         cache: 'no-cache',
  //         headers: {
  //           'X-Auth-PSK': settings.psk,
  //           'Content-Type': 'application/json',
  //           'cache-control': 'no-cache'
  //         }
  //       },
  //       body
  //     );
  //     return response.result[0].status;

  //   } 
  //   catch (err) {
  //     console.error(`An error occured fetching availability: `, err);
  //     throw err;
  //   }
  // }

  // IRCC API ===================================================================================================================

  // async setDevicePowerState(device, state) {
  //   if (!state) {
  //     return await this.sendCommand(device, 'PowerOff');
  //   }
  //   return await this.sendCommand(device, 'PowerOn');
  // }

  async sendCommand(device, command) {
    const settings = device.getSettings();
    let body;
    // console.log(settings);
    if (RemoteControlCodes[command]){
      body = this.generateCommandRequest(RemoteControlCodes[command]);
    }
    else{
      body = this.generateCommandRequest(command);
    }
    try {
      let response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/IRCC`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'SOAPACTION': '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
            'cache-control': 'no-cache'
          }
        },
        body
      );
      return response;

    } 
    catch (err) {
      device.log(`An error occured sending command: `, err.message);
      throw err;
    }
  }

  generateCommandRequest(code) {
    return `<?xml version="1.0"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>
          <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
            <IRCCCode>${code}</IRCCCode>
          </u:X_SendIRCC>
        </s:Body>
      </s:Envelope>`;
  }

  // REST API ===================================================================================================================
  async getDevicePowerState(device) {
    const settings = device.getSettings();
    try {
      let body = JSON.stringify({
        method: 'getPowerStatus',
        params: [],
        id: 2,
        version: '1.0'
      });

      let response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
      if (response.error){
        throw new Error(response.error);
      }  
      return response.result[0].status;

    } 
    catch (err) {
      device.log(`An error occured fetching power state: `, err.message);
      throw err;
    }
  }

  async setDevicePowerState(device, value) {
    const settings = device.getSettings();
    try {
      let body = JSON.stringify({
        method: 'setPowerStatus',
        "id": 55,
        "params": [
          {"status": value}
        ],
        "version": "1.0"
      });

      let response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
      if (response.error){
        throw new Error(response.error);
      }  
      return response.result[0];

    } 
    catch (err) {
      // console.error(`An error occured fetching power state: `, err);
      throw err;
    }
  }

  async getVolume(device, target='speaker') {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getVolumeInformation",
        "id": 33,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/audio`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setVolume: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    // let state = response.result[0].filter((e => e.target === target))[0];
    let state = response.result[0][0];
    if (state){ 
      return state;
    }
    else{
      throw new Error("Volume not available");
    }
  }

  async setVolume(device, value, target='speaker') {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        method: 'setAudioVolume',
        "id": 98,
        "params": [{
            "volume": value,
            // "ui": "on",
            "target": target
        }],
        "version": "1.2"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/audio`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setVolume: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    return response.result[0];

  }

  async setMute(device, value) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "setAudioMute",
        "id": 601,
        "params": [
          {"status": value}
        ],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/audio`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      device.log(`An error occured on setVolume: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    return response.result[0];
  }

  async getApps(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getApplicationList",
        "id": 60,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/appControl`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getApps: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let apps = response.result[0];
    if (apps){ 
      return apps;
    }
    else{
      throw new Error("Apps not available");
    }
  }

  async startApp(device, uri) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "setActiveApp",
        "id": 601,
        "params": [{
            "uri": uri
        }],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/appControl`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setApp: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    return response;
  }

  async getCurrentExternalInputs(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getCurrentExternalInputsStatus",
        "id": 105,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/avContent`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getInputs: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let inputs = response.result[0];
    if (inputs){ 
      return inputs;
    }
    else{
      throw new Error("Inputs not available");
    }
  }

  async getSourcess(device, scheme) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getSourceList",
        "id": 1,
        "params": [{"scheme": scheme}],
        // {"scheme": "extInput"}, => ext input sources (extInput:hdmi, extInput:composite)
        // {"scheme": "tv"} => tv sources (tv:dvbs...)
        // {"scheme": "fav"} => favourites lists
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/avContent`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getInputs: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let inputs = response.result[0];
    if (inputs){ 
      return inputs;
    }
    else{
      throw new Error("Inputs not available");
    }
  }

  async getInputs(device, source) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getContentList",
        "id": 88,
        "params": [{
            "stIdx": 0,
            "cnt": 50,
            "uri": source
            // "uri": "extInput:hdmi" => HDMI list (extInput:hdmi?port=1...)
            // "uri": "extInput:composite" => AV list (extInput:composite?port=1...)
            // "uri": "tv:dvbs" => channel list
        }],
        "version": "1.5"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/avContent`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getInputs: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let inputs = response.result[0];
    if (inputs){ 
      return inputs;
    }
    else{
      throw new Error("Inputs not available");
    }
  }

  async selectInput(device, uri) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "setPlayContent",
        "id": 101,
        "params": [{"uri": uri}],
        // extInput:composite?port=1
        // extInput:hdmi?port=1
        // tv:dvbs
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/avContent`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setApp: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    return response;
  }

  async getPlayingContentInfo(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getPlayingContentInfo",
        "id": 103,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/avContent`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getInputs: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let inputs = response.result[0];
    if (inputs){ 
      return inputs;
    }
    else{
      throw new Error("PlayingContentInfo not available");
    }
  }

  async getIrccCommands(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getRemoteControllerInfo",
        "id": 54,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on getInputs: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let result = response.result[1];
    if (result){ 
      return result;
    }
    else{
      throw new Error("IRCC-Codes not available");
    }
  }

  async getSoundSettings(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getSoundSettings",
        "id": 73,
        "params": [{"target": "outputTerminal"}],
        "version": "1.1"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/audio`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setVolume: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let state = response.result[0][0];
    if (state){ 
      return state;
    }
    else{
      throw new Error("SoundSettings not available");
    }
  }

  async setSoundSettings(device, value) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "setSoundSettings",
        "id": 5,
        "params": [{"settings": [{
            "value": value,
            "target": "outputTerminal"
        }]}],
        "version": "1.1"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/audio`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setSoundSettings: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    return response.result[0];

  }

  async getPowerSavingMode(device) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "getPowerSavingMode",
        "id": 51,
        "params": [],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setVolume: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error(response.error);
    }
    let state = response.result[0];
    if (state){ 
      return state;
    }
    else{
      throw new Error("PowerSavingMode not available");
    }
  }

  async setPowerSavingMode(device, value) {
    const settings = device.getSettings();
    let response;
    try {
      let body = JSON.stringify({
        "method": "setPowerSavingMode",
        "id": 52,
        "params": [{"mode": value}],
        "version": "1.0"
      });

      response = await http.request( 
        'POST', 
        `http://${settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
    } 
    catch (err) {
      // device.log(`An error occured on setPowerSavingMode: `, err.message);
      throw err;
    }
    if (response.error){
      throw new Error("Audio output not available");
    }
    return response.result[0];

  }
}

module.exports = new SonyBraviaAndroidTVCommunicator()