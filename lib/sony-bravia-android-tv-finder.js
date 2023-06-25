const Homey = require('homey');
const simpleSSDP = require('simple-ssdp');
const http = require('./http')

const SSDP_TIMEOUT = 10000;

const BaseName = 'Sony BRAVIA Android TV';

class SonyBraviaAndroidTvFinder extends Homey.SimpleClass {

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
				reject('error in ssdp', e);
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

  async discoverDevices(driver) {
    let devices = [];
    let discovered = await this.discoverSSDP();

    driver.log("SSDP discovered devices:");
    driver.log(discovered);
    
    for (let i=0; i<discovered.length; i++){
      let device = this.validateDeviceHeaders(discovered[i], driver);
      if (device){
        let validatedDevice = await this.fetchBasicDeviceDetails(device, driver);
        if (validatedDevice){
          devices.push(validatedDevice);
        }
      }
    }
    driver.log("Filtered devices:");
    driver.log(devices);
    return devices;
  }

  validateDeviceHeaders(headers, driver) {
    if (
      ( headers.usn.indexOf('SONY') > 0 || headers.usn.indexOf('sony') > 0 )
      &&
      ( headers.usn.indexOf('BRAVIA') > 0 || headers.usn.indexOf('bravia') > 0 )
    ) {
      driver.log('Sony BRAVIA Android TV found on: ', headers.address);
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

      if (parsedResponse.modelName.substring(2, 0) !== 'KD') {
        return;
      }

      console.log('Sony BRAVIA Android TV basic details found: ', parsedResponse);

      let name = device.name === BaseName ? `Sony ${parsedResponse.productName} ${parsedResponse.modelName}` : device.name;

      device.name = name;
      device.data.valid = true;
      return device;
    } 
    catch (err) {
      console.log('An error occured fetching basic device details: ', err);
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

      console.log('Sony BRAVIA Android TV extended details found: ', parsedResponse);

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

    } catch (err) {
      console.log('An error occured fetching extended device details: ', err);
      throw err;
    }
  }
}

module.exports = new SonyBraviaAndroidTvFinder();
