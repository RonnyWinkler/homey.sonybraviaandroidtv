'use strict';

const Homey = require('homey');
const SonyBraviaAndroidTvCommunicator = require('./lib/sony-bravia-android-tv-communicator');
const SonyBraviaFlowActions = require('./lib/flow-actions');

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

        // FLOW CONDITIONS ===============================================================================================
        this._flowConditionInput = this.homey.flow.getConditionCard('input')
		.registerRunListener(async (args, state) => {
            await args.device.checkDevice();
			return (args.device.getCapabilityValue('input') == args.input);
		})

    }

    
}

module.exports = SonyBraviaAndroidTvApp;
