const Homey = require('homey');
const simpleSSDP = require('simple-ssdp');
const http = require('./http')

const SSDP_TIMEOUT = 8000;

const BaseName = 'Sony BRAVIA Android TV';

class SonyBraviaAndroidTvFinder extends Homey.SimpleClass {

  constructor(driver){
    super();
    this._driver = driver;
  }

	async discoverSSDP(timeout) {
		let p = new Promise(async function(resolve, reject) {
			let devices = [];
			// Create and configure simpleSSDP object
			const ssdp = new simpleSSDP({
        // Example from MusicCast devices:
				// device_name: 'MusicCast NodeJS Interface',
				// port: 8000,
				// location: '/xml/description.xml',
				// product: 'Musiccast',
				// product_version: '2.0'
			});
			// Start
			ssdp.start();
			// Event: service discovered
			ssdp.on('discover', (data) => {
				if (data['st'] == 'upnp:rootdevice') {
					//console.log('got data', data['address']);

          if (devices.filter(e => e.address === data.address).length <= 0){
            devices.push(data);
          }
				}
			});
			// Event: error
			ssdp.on('error', (err) => {
				console.log(err);
				reject('error in ssdp', err);
				return;
			});
			// Discover all services on the local network
			ssdp.discover();
			// Stop after 6 seconds
			await new Promise((cb) => setTimeout(cb, SSDP_TIMEOUT ));
			// console.table(devices);
			ssdp.stop(() => {
				console.log('SSDP stopped');
			});
			resolve(devices);
		});
		return await p;
	}

  async discoverDevices() {
    let devices = [];
    let discovered = await this.discoverSSDP();

    this._driver.log("SSDP discovered devices:", discovered);
    
    for (let i=0; i<discovered.length; i++){
      let device = this.validateDeviceHeaders(discovered[i]);
      if (device){
        try{
          let validatedDevice = await this.fetchBasicDeviceDetails(device);
          if (validatedDevice){
            devices.push(validatedDevice);
          }
        }
        catch(err){
          // device is not a BRAVIA TV
        }
      }
    }
    this._driver.log("Filtered devices:", devices);
    return devices;
  }

  validateDeviceHeaders(headers) {
    if (
      // Bravia TV series KD
      (
        ( headers.usn.indexOf('SONY') > -1 || headers.usn.indexOf('sony') > -1 )
        &&
        ( headers.usn.indexOf('BRAVIA') > -1 || headers.usn.indexOf('bravia') > -1 )
      )
      ||
      // Bravia TV series XR seem to show only Chromecast on SSDP
      (    headers.st && headers.st == 'upnp:rootdevice' 
        && headers.server && headers.server.indexOf('Chromecast') > -1 
        && headers["x-user-agent"] && headers["x-user-agent"].indexOf('redsonic') > -1 )
    ) {
      this._driver.log('Sony BRAVIA Android TV found on: ', headers.address);
      let device = this.populateDeviceData(null, headers.usn, headers.address, null);
      return device;
    }

    return null;
  }

  populateDeviceData(name, id, ipAddress, macAddress) {
    return {
      name: name || BaseName,
      data: {
        id: id || '',
        type: 'device',
        class: 'tv',
        product: '',
        region: '',
        language: '',
        model: '',
        serial: '',
        generation: '',
        name: '',
        area: '',
        cid: '',
        valid: false,
      },
      state: {
        onoff: false
      },
      settings: {
        ip: ipAddress,
        psk: '',
        polling: 1,
        macAddress: macAddress || '',
      }
    }
  }

  async fetchBasicDeviceDetails(device) {
    try {
      let body = JSON.stringify({
        method: 'getInterfaceInformation',
        params: [],
        id: 2,
        version: '1.0'
      });

      let response = await http.request( 
        'POST', 
        `http://${device.settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': device.settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );
  
      let parsedResponse = response.result[0]; 

      this._driver.log('Sony BRAVIA Android TV basic details found: ', parsedResponse);

      if ( ! (parsedResponse.productCategory == 'tv' && parsedResponse.productName == 'BRAVIA' )) {
        // this._driver.log('Manual defined IP is not a BRAVIA device.');
        throw new Error('The device is not a Sony BRAVIA TV.');
      }

      this._driver.log('Sony BRAVIA Android TV basic details found after check modelName startswith "KD": ', parsedResponse);

      let name = device.name === BaseName ? `Sony ${parsedResponse.productName} ${parsedResponse.modelName}` : device.name;

      device.name = name;
      device.data.valid = true;
      return device;
    } 
    catch (err) {
      this._driver.log('An error occured fetching basic device details: ', err.message);
      throw err;
    }
  }

  async fetchExtendDeviceDetails(device) {
    try {
      let body = JSON.stringify({
        method: 'getSystemInformation',
        params: [],
        id: 5,
        version: '1.0'
      });

      let response = await http.request( 
        'POST', 
        `http://${device.settings.ip}/sony/system`,
        {
          cache: 'no-cache',
          headers: {
            'X-Auth-PSK': device.settings.psk,
            'Content-Type': 'application/json',
            'cache-control': 'no-cache'
          }
        },
        body
      );

      let parsedResponse = response.result[0];

      this._driver.log('Sony BRAVIA Android TV extended details found: ', parsedResponse);

      let macAddress = device.settings.macAddress ? device.settings.macAddress : parsedResponse.macAddr;

      device.data.product = parsedResponse.product;
      device.data.region = parsedResponse.region;
      device.data.language = parsedResponse.language;
      device.data.model = parsedResponse.model;
      device.data.serial = parsedResponse.serial;
      device.data.generation = parsedResponse.generation;
      device.data.name = parsedResponse.name;
      device.data.area = parsedResponse.area;
      device.data.cid = parsedResponse.cid;
      device.settings.macAddress = macAddress;

      return device;

    } 
    catch (err) {
      this._driver.log('An error occured fetching extended device details: ', err);
      throw err;
    }
  }
}

module.exports = SonyBraviaAndroidTvFinder;
