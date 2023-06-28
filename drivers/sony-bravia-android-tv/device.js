const Homey = require('homey');
const SonyBraviaAndroidTvCommunicator = require('../../lib/sony-bravia-android-tv-communicator');
const SonyBraviaCapabilities = require('../../lib/capabilities');

class SonyBraviaAndroidTvDevice extends Homey.Device {
  async onInit() {
    await this._checkCapabilities();
    this.data = this._generateDeviceObject();

    this.log(`${this.data.name} initialized.`);

    this._setCapabilityListeners();
    this._setFlowTrigger();
    this._checkDeviceInterval();
  }

  async _checkCapabilities(){
    if (!this.hasCapability("volume_set")){
      this.addCapability("volume_set");
    }
    if (!this.hasCapability("input")){
      this.addCapability("input");
    }
    if (!this.hasCapability("playing_content")){
      this.addCapability("playing_content");
    }
  }

  onUninit(){
    this._clearIntervals();

    this.data = this._generateDeviceObject();
    this.log(`${this.this.getName()} unInit().`);
  }

  onDeleted() {
    this._clearIntervals();

    this.data = this._generateDeviceObject();
    this.log(`${this.this.getName()} deleting.`);
  }

    /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`[Device] ${this.getName()}: ${this.getData().id} settings where changed: ${changedKeys}`);
    this.data.settings = newSettings;
    this._clearIntervals();
    this._checkDeviceInterval({
      interval: newSettings.polling, 
      unit: newSettings.polling_unit, 
      interval_off: newSettings.polling_off, 
      interval_off_active: newSettings.polling_off_active
    });
  }
  
  _generateDeviceObject() {
    return {
      name: this.getName(),
      data: this.getData(),
      state: this.getState(),
      settings: this.getSettings(),
      capabilities: this.getCapabilities(),
      device: {
        speaker:{
          maxVolume: 100,
          minVolume: 0
        },
        headphone:{
          maxVolume: 100,
          minVolume: 0
        }
      }
    }
  }

  async _setCapabilityListeners() {
    // Register all capability listener
    // Handler functions are defined in capabilities.js for every capability.
    SonyBraviaCapabilities.forEach(capability => {
      this.registerCapabilityListener(capability.name, async value => {
        try {
          await capability.function(this, value);
        } catch (err) {
          this.log(`${this.data.name} capability listener ${capability.name} could not be executed: `, err.message);
          throw new Error("Error message from TV: "+err.message);
        }
        this.homey.setTimeout(() => 
          this.checkDevice(),  1000 );
        return true;
      });
    });
  }

  async _setFlowTrigger(){
    this._flowTriggerInputChanged = this.homey.flow.getDeviceTriggerCard('input_changed');
    this._flowTriggerPlayingContentChanged = this.homey.flow.getDeviceTriggerCard('playing_content_changed');
  }

  async _checkDeviceInterval({
      interval = this.data.settings.polling, 
      unit = this.data.settings.polling_unit,
      interval_off = this.data.settings.polling_off,
      interval_off_active = this.data.settings.polling_off_active,
      onoff_state = undefined } = {}) {

    if (onoff_state == undefined){
      onoff_state = this.getCapabilityValue('onoff');
    } 
    // Interval settings is in minutes, convert to milliseconds.
    interval = interval * 1000;
    if (unit == 'min'){
      interval = interval * 60;
    }
    // different interval when TV is off and setting is active
    if (!onoff_state && interval_off_active){
      interval = interval_off * 1000 * 60;
    }
    try {
      this.log(`[Device] ${this.getName()}: onPollInterval =>`, interval);
      this.onPollInterval =  this.homey.setInterval(() => this.checkDevice(), interval);
      // Update device after command action
      this.checkDevice();
    } catch (error) {
      this.log(error);
    }
  }

  async _clearIntervals() {
    try {
      this.log(`[Device] ${this.getName()}: clearIntervals`);
      this.homey.clearInterval(this.onPollInterval);
    } catch (error) {
      this.log(error);
    }
  }

  async checkDevice() {
    // this.log("Check device state...");
    await this._checkDeviceAvailability();
    if (this.getAvailable()){
      await this._checkDevicePowerState();
      await this._checkDeviceVolume();
      await this._checkPlayingContent();
    }
  }

  async _checkDeviceAvailability() {
    try {
      await SonyBraviaAndroidTvCommunicator.getDevicePowerState(this);
      return this.setAvailable();
    } catch (err) {
      return this.setUnavailable();
    }
  }

  async _checkDevicePowerState() {
    try {
      let state = await SonyBraviaAndroidTvCommunicator.getDevicePowerState(this);
      // this.log(`[Device] ${this.getName()}: current power state: `, state);
      let value = state === 'active' ? true : false;
      if (value != this.getCapabilityValue('onoff')){
        // state changed => check polling interval
        this._clearIntervals();
        this._checkDeviceInterval({onoff_state: value});
      }
      return this.setCapabilityValue('onoff', state === 'active' ? true : false);
    } 
    catch (err) {
      this.setCapabilityValue('onoff', false);
    }
  }

  async _checkDeviceVolume() {
    try {
      let state = await SonyBraviaAndroidTvCommunicator.getVolume(this, 'speaker');
      // this.log(`[Device] ${this.getName()}: current volume state: `, state);
      this.data.device.speaker.maxVolume = state.maxVolume;
      this.data.device.speaker.minVolume = state.minVolume;
      let volume = state.volume / state.maxVolume;
      this.setCapabilityValue('volume_set', volume);
      this.setCapabilityValue('volume_mute', state.mute);
    }
    catch (err) {
      // this.log(`[Device] ${this.getName()}: getVolume error: ${err.message}`);
    }
  }

  async _checkPlayingContent() {
    let input = await this.getPlayingContentInfoInput();
    if (this.getCapabilityValue("input") != input.input_capability_value){
      // this.log(`[Device] ${this.getName()}: checkPlayingContent new input: `, input);
      this.setCapabilityValue('input', input.input_capability_value);

      await this._flowTriggerInputChanged.trigger(
        this,
        {
          input: input.input_uri,
          input_text: input.input_title
        },
        { }
      );
    }

    let playing_content;
    let playing_content_string = '';
    try {
      playing_content = await SonyBraviaAndroidTvCommunicator.getPlayingContentInfo(this);
    }
    catch (err) {
      // this.log(`[Device] ${this.getName()}: checkPlayingContent error: ${err.message}`);
      playing_content = '{}';
    }

    playing_content_string = JSON.stringify(playing_content);

    if (this.getCapabilityValue("playing_content") != playing_content_string){
      // this.log(`[Device] ${this.getName()}: checkPlayingContent new input: `, input);
      this.setCapabilityValue('playing_content', playing_content_string);

      let playing_content_tokens = {
        uri: '',
        source: '',
        title: '',
        disp_num: '',
        triplet_str: '',
        program_title: '',
        start_date_time: '',
        duration: 0
      }
      if (playing_content && playing_content.uri){
        playing_content_tokens.uri = playing_content.uri;
      }
      if (playing_content && playing_content.source){
        playing_content_tokens.source = playing_content.source;
      }
      if (playing_content && playing_content.title){
        playing_content_tokens.title = playing_content.title;
      }
      if (playing_content && playing_content.disp_num){
        playing_content_tokens.disp_num = playing_content.disp_num;
      }
      if (playing_content && playing_content.triplet_str){
        playing_content_tokens.triplet_str = playing_content.triplet_str;
      }
      if (playing_content && playing_content.program_title){
        playing_content_tokens.program_title = playing_content.program_title;
      }
      if (playing_content && playing_content.start_date_time){
        playing_content_tokens.start_date_time = playing_content.start_date_time;
      }
      if (playing_content && playing_content.duration){
        playing_content_tokens.duration = playing_content.duration;
      }
      await this._flowTriggerPlayingContentChanged.trigger(
        this,
        playing_content_tokens,
        { }
      );
    }

  }

  async getPlayingContentInfoInput(){
    let input = {
      input_uri: '',
      input_title: '',
      input_capability_value: null
    };

    let state = undefined;
    try {
      state = await SonyBraviaAndroidTvCommunicator.getPlayingContentInfo(this);
    }
    catch (err) {
      // this.log(`[Device] ${this.getName()}: checkPlayingContent error: ${err.message}`);
    }

    if (!state){
      return input;
    }
    try{
      if (state.source.startsWith('tv:')){
        input.input_uri = state.source;
      }
      else{
        input.input_uri = state.uri;
      }

      let title = this.homey.app.manifest.capabilities.input.values.filter(e => e.id === input.input_uri)[0].title;
      // check is title i sfound and input is one of the mode IDs
      if (title != undefined){
        input.input_title = title;
        input.input_capability_value = input.input_uri; 
      }
      else{
        input.input_title = '';
        input.uri = '';
        input.input_capability_value = null; 
      }
    }
    catch(err){

    }
    return input;
  }

  // Flow actions ===========================================================================================
  async getAutocompleteAppList(){
    let result = [];
    let apps = await SonyBraviaAndroidTvCommunicator.getApps(this);
    for (let i=0; i<apps.length; i++){
      result.push(
        {
          name: apps[i].title,
          uri: apps[i].uri,
          image: apps[i].icon
        }
      );
    }
    result.sort(function(a, b){
      if (a.name < b.name){ 
        return -1
      }
      else{
        return 1;
      }
    });
    return result;
  }

  async getAutocompleteInputList(){
    let result = [];

    let sources = await SonyBraviaAndroidTvCommunicator.getSourcess(this, 'tv');
    for (let i=0; i<sources.length; i++){
      result.push(
        {
          name: sources[i].source.toUpperCase(),
          uri: sources[i].source
        }
      );
    }

    let inputs = await SonyBraviaAndroidTvCommunicator.getCurrentExternalInputs(this);
    for (let i=0; i<inputs.length; i++){
      result.push(
        {
          name: inputs[i].title,
          uri: inputs[i].uri
        }
      );
    }

    result.sort(function(a, b){
      if (a.index < b.index){ 
        return -1
      }
      else{
        return 1;
      }
    });
    return result;
  }

  async getAutocompleteTvSourceList(){
    let result = [];

    let sources = await SonyBraviaAndroidTvCommunicator.getSourcess(this, 'tv');
    for (let i=0; i<sources.length; i++){
      result.push(
        {
          name: sources[i].source.toUpperCase(),
          uri: sources[i].source
        }
      );
    }

    result.sort(function(a, b){
      if (a.index < b.index){ 
        return -1
      }
      else{
        return 1;
      }
    });
    return result;
  }

  async getAutocompleteTvChannelList(source){
    let result = [];

    // let sources = await SonyBraviaAndroidTvCommunicator.getSourcess(this, 'tv');
    // for (let i=0; i<sources.length; i++){
    //   result.push(
    //     {
    //       name: sources[i].source.toUpperCase(),
    //       uri: sources[i].source.toUpperCase()
    //     }
    //   );
    // }

    let inputs = await SonyBraviaAndroidTvCommunicator.getInputs(this, source);
    for (let i=0; i<inputs.length; i++){
      result.push(
        {
          name: inputs[i].title,
          uri: inputs[i].uri
        }
      );
    }

    result.sort(function(a, b){
      if (a.index < b.index){ 
        return -1
      }
      else{
        return 1;
      }
    });
    return result;
  }

  async getAutocompleteIrccList(){
    let result = [];
    let list = await SonyBraviaAndroidTvCommunicator.getIrccCommands(this);
    for (let i=0; i<list.length; i++){
      result.push(
        {
          name: list[i].name,
          ircc: list[i].value
        }
      );
    }
    result.sort(function(a, b){
      if (a.name < b.name){ 
        return -1
      }
      else{
        return 1;
      }
    });
    return result;
  }

}

module.exports = SonyBraviaAndroidTvDevice;