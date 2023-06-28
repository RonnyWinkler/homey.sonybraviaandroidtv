'use strict';

const Homey = require('homey');
const SonyBraviaAndroidTvCommunicator = require('./lib/sony-bravia-android-tv-communicator');
const SonyBraviaFlowActions = require('./lib/flow-actions');
const wol = require('./lib/wol');

class SonyBraviaAndroidTvApp extends Homey.App {

    async onInit() {

        if (process.env.DEBUG === '1'){
			if (this.homey.platform == "local"){
				try{ 
					require('inspector').waitForDebugger();
				}
				catch(error){
					require('inspector').open(9229, '0.0.0.0', true);
				}
			}
		}

        this.log('SonyBraviaAndroidTvApp is running...');
        await this.registerFlowListeners();
    }

    async registerFlowListeners() {

        // FLOW ACTIONS ===============================================================================================

        // Flow Listener for IRCC calls. 
        // Mappings flow action => IR code are defined in flow-actions.js. 
        // Flow cards with selection list are providing IR code as selection is (args.value).
        // These flow card wil be marked as "deprecated" because all is selectable with autocomplete 
        // list in new IRCC flow card.
        SonyBraviaFlowActions.forEach(flow => {
            try {
                let flowCard = this.homey.flow.getActionCard(flow.action);

                flowCard.registerRunListener(async (args, state) => {
                    try {
                        flow.parsedCommand = flow.command;

                        if (flow.command instanceof Function) {
                            flow.parsedCommand = flow.command(args, state)
                        }

                        this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version}: starting flow: ${flow.action} and sending command: `, flow.parsedCommand);

                        return await SonyBraviaAndroidTvCommunicator.sendCommand(args.device, flow.parsedCommand);
                    } catch (err) {
                        this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version}: flow command could not be executed: `, flow, err);
                        throw err;
                    }
                });
            } catch (err) {
                this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version}: flow command could not be registered: `, flow, err);
            }
        });

        // Flow Listener for REST-API and IRCC calls
        // These are "new" flow actions and "replacing" actions to replace deprecated IRCC flow action with only one autocomplete card.

        this._flowActionStartApp = this.homey.flow.getActionCard('app_start')
        this._flowActionStartApp.registerRunListener(async (args, state) => {
          try{
            await SonyBraviaAndroidTvCommunicator.startApp(args.device, args.app.uri );
            return true;
          }
          catch(error){
            this.error("Error executing flowAction 'app_start': "+  error.message);
            throw new Error(error.message);
          }
        });
        this._flowActionStartApp.registerArgumentAutocompleteListener('app', async (query, args) => {
            this._autocompleteAppList = await args.device.getAutocompleteAppList();
            return this._autocompleteAppList.filter((result) => { 
                return result.name.toLowerCase().includes(query.toLowerCase());
            });
        });

        this._flowActionSelectInput = this.homey.flow.getActionCard('input_select')
        this._flowActionSelectInput.registerRunListener(async (args, state) => {
          try{
            await SonyBraviaAndroidTvCommunicator.selectInput(args.device, args.input.uri );
            return true;
          }
          catch(error){
            this.error("Error executing flowAction 'input_select': "+  error.message);
            throw new Error(error.message);
          }
        });
        this._flowActionSelectInput.registerArgumentAutocompleteListener('input', async (query, args) => {
            this._autocompleteInputList = await args.device.getAutocompleteInputList();
            return this._autocompleteInputList.filter((result) => { 
                return result.name.toLowerCase().includes(query.toLowerCase());
            });
        });

        this._flowActionSelectTvChannel = this.homey.flow.getActionCard('tv_channel_select')
        this._flowActionSelectTvChannel.registerRunListener(async (args, state) => {
          try{
            await SonyBraviaAndroidTvCommunicator.selectInput(args.device, args.channel.uri );
            return true;
          }
          catch(error){
            this.error("Error executing flowAction 'input_tv_channel': "+  error.message);
            throw new Error(error.message);
          }
        });
        this._flowActionSelectTvChannel.registerArgumentAutocompleteListener('source', async (query, args) => {
          this._autocompleteTvSourceList = await args.device.getAutocompleteTvSourceList();
          return this._autocompleteTvSourceList.filter((result) => { 
              return result.name.toLowerCase().includes(query.toLowerCase());
          });
        });
        this._flowActionSelectTvChannel.registerArgumentAutocompleteListener('channel', async (query, args) => {
          try{
            if (args && args.source && args.source.uri){
              this._autocompleteTvChannelList = await args.device.getAutocompleteTvChannelList(args.source.uri);
              return this._autocompleteTvChannelList.filter((result) => { 
                return result.name.toLowerCase().includes(query.toLowerCase());
              });
            }
            else{
              return [];
            }
          }
          catch{
            return [];
          }
        });

        this._flowActionIrccCommand = this.homey.flow.getActionCard('ircc_command')
        this._flowActionIrccCommand.registerRunListener(async (args, state) => {
          try{
            await SonyBraviaAndroidTvCommunicator.sendCommand(args.device, args.ircc.ircc );
            return true;
          }
          catch(error){
            this.error("Error executing flowAction 'ircc_command': "+  error.message);
            throw new Error(error.message);
          }
        });
        this._flowActionIrccCommand.registerArgumentAutocompleteListener('ircc', async (query, args) => {
            this._autocompleteIrccList = await args.device.getAutocompleteIrccList();
            return this._autocompleteIrccList.filter((result) => { 
                return result.name.toLowerCase().includes(query.toLowerCase());
            });
        });

        // APP FLOW ACTIONS =========================================================================================
        this._flowActionWakeOnLan = this.homey.flow.getActionCard('wake_on_lan');
        // wakeOnLanAction.registerRunListener(async (args, state) => {
        //         return args.device.wakeOnLan();
        // });
        this._flowActionWakeOnLan.registerRunListener(async (args, state) => {
                return await this._wakeOnLanAction(args, state);
        });
        this._flowActionWakeOnLan.registerArgumentAutocompleteListener('device', async (query, args) => {
          let results = [];
          let devices = this.homey.drivers.getDriver('sony-bravia-android-tv').getDevices();
          for (let i=0; i<devices.length; i++){
            results.push( 
              {
                name: devices[i].getName(),
                id: devices[i].getData().id
              }
            );
          }
    
          // filter based on the query
          return results.filter((result) => {
            return result.name.toLowerCase().includes(query.toLowerCase());
          });
        });
    

        // FLOW CONDITIONS ===============================================================================================
        this._flowConditionInput = this.homey.flow.getConditionCard('input').registerRunListener(async (args, state) => {
          await args.device.checkDevice();
          return (args.device.getCapabilityValue('input') == args.input);
        })

        this._flowConditionAvailable = this.homey.flow.getConditionCard('available').registerRunListener(async (args, state) => {
          await args.device.checkDevice();
          return (args.device.getAvailable());
        })

    }

    async _wakeOnLanAction(args, state){
      let devices = this.homey.drivers.getDriver('sony-bravia-android-tv').getDevices();
      for (let i=0; i<devices.length; i++){
        if (devices[i].getData().id == args.device.id){
          await this.wakeOnLan(devices[i].getSettings().macAddress);
          await this.checkDeviceAvailability(devices[i]);
        }
      }
    }
  
    async wakeOnLan(mac){
      const self = this;
      return new Promise( ( resolve, reject ) =>
      {
        try
        {
          wol.wake(mac, ( response ) =>{
            self.log("WakeOnLan request sent.");
            resolve(response);
          });
        }
        catch ( err )
        {
          self.log("WakeOnLan Error:"+err.message);
          // DiagnosticLog
          self.writeLog("WakeOnLan Error:"+err.message);
          reject( new Error( "WakeOnLan error: " + err.message ) );
        }
      });        
    }

    async checkDeviceAvailability(device){
      for (let i=1; i<=10; i++){
        this.log("Check device availability #", (i));
        await device.checkDevice();
        if (device.getAvailable()){
          this.log("Device is available.");
          return true;
        }
        if (i<10){
          await this.sleep(2000);
        }
      }
      this.log("WoL sent, but device is still unavailable.");
      throw new Error("WoL sent, but device is still unavailable.");
  }

    sleep(time) {
      return new Promise(resolve => setTimeout(resolve, time));
    } 
}

module.exports = SonyBraviaAndroidTvApp;
