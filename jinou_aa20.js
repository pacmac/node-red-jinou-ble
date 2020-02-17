module.exports = {
  
  knowns: {},
  
  alive   : {}
  
}

const cl = console.log;
const noble = require('@abandonware/noble');

function buf2arr(bufdata){
  var buffer = Buffer.from(bufdata)
  return Array.prototype.slice.call(buffer, 0)  
}

function toHex(d) {
  return  ("0"+(Number(d).toString(16))).slice(-2);
}

function mac(data){
  macdat=[];
  for(var i in data){
    macdat.push(toHex(data[i]));  
  }
  return macdat.join(':');  
}

// use manufacturer data, no connect.
function readMfgData(peripheral) {

  /*
    
    <Buffer 4c 00 02 15 e2 c5 6d b5 df fb 48 d2 b0 60 d0 f5 a7 10 96 e0 00 00 00 00 ba>
    <Buffer 4c 00 02 15 e2 c5 6d b5 df fb 48 d2 b0 60 d0 f5 a7 10 96 e0 00 00 00 00 ba>
    <Buffer 4c 00 02 15 e2 c5 6d b5 df fb 48 d2 b0 60 d0 f5 a7 10 96 e0 00 00 00 00 ba>
    
  */

  /*
    tempdata: [0,26,6,0,71,3]
    mfgdata:  [
      {0,26,6,0,71,3},
      {23},
      {205,215,81,21,15,126}
    ]
  */  

	const result = {
  	id        : peripheral.id,
  	mac       : peripheral.address,
  	raw       : peripheral.advertisement.manufacturerData,
  	mfgdata   : buf2arr(peripheral.advertisement.manufacturerData),
	};
	
	result.tmphum = result.mfgdata.slice(0,6);
	result.mac = mac(result.mfgdata.slice(7,13));
	
	return {
    mac     : peripheral.address,
    batt    : result.mfgdata[6],
    rssi    : peripheral.rssi,
    sig     : 101+peripheral.rssi,
    tmp     : result.tmphum[1]+result.tmphum[2]/10,
    hum     : result.tmphum[4]+result.tmphum[5]/10,
    stamp   : new Date().getTime()
  }
}

noble.on('stateChange', (state) => {
  console.log('Noble adapter is %s', state);

  if (state === 'poweredOn') {
    cl('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    cl('Start scanning for JINOU AA20 devices.');
    noble.startScanning(['aa20'], true);
  }
});

process.on('SIGINT', function() {
 cl("Caught interrupt signal");
  noble.stopScanning()
  process.exit();
});


noble.on('discover', function(per) {
  var dev = readMfgData(per);
  //cl(dev);
  if(dev.mac){
    if(!module.exports.knowns[dev.mac]){
      module.exports.knowns[dev.mac] = {
        first: dev
      };
      cl('Found New AA20 device:',dev.mac); 
    } 
    module.exports.alive[dev.mac] = dev;
    module.exports.knowns[dev.mac].last = dev;
  }
});

