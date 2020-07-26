//var jin   = require('./jinou_aa20.js');

if(1==1) var cl  = console.log;
else cl = function(){};

module.exports = {
  
  delay   : 200,
  state   : null,
  
  /* setval()  */
  address : null,
  setval  : null,
  
  knowns  : {},
  alive   : {},
  repeat  : true
  
}

const mex = module.exports;
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

function getchars(per,uid,cb){
  cl(`getchars(${uid})`,per.state);
  per.connect(function(error) {
  	cl('connecting..',per.state);
  	per.discoverServices(['aa20'], function(error, services) {
  		cl('services..',per.state);
  		var devsvc = services[0];
  		devsvc.discoverCharacteristics([uid], function(error, chrs) {
        cl('chars..',per.state);
        return cb(chrs);
  		})
  	})
  })  
}

async function connect(per,cb){
  
  //per.disconnect();
  var done;
  //noble.stopScanning();
  //await noble.stopScanningAsync();
  //per.connect();
  await per.connectAsync();
  cl('connected');
  return cb();

  per.on('connect',function(err) { 
    cl('connected');
    done = true;
    setTimeout(cb,mex.delay);  
  }) 

  cl('connecting..',per.state);
  per.connect();

  //await until(per.state,'connected');
  setTimeout(function(){
    if(!done) {
      cl('timeout');
      scanoff(cb);
    }
  },5000); 
  //cb();
  
  
}

function getchars(per,uid,cb){
  cl(`getchars(${uid})`,per.state);
  connect(per,function(err) {
  	per.discoverServices(['aa20'], function(error, services) {
  		cl('services..',per.state);
  		var devsvc = services[0];
  		devsvc.discoverCharacteristics([uid], function(error, chrs) {
        cl('chars..',per.state);
        return cb(chrs);
  		})
  	})
  });
}


function until(key,val) {
  const poll = resolve => {
    if(key == val) resolve();
    else setTimeout(resolve,200)
  }

  return new Promise(poll);
}

function rd(per,uid,cb){
  cl('rd',uid,per.state);
  getchars(per,uid,function(chrs){
    chrs[0].read(function(error, data) {
      var buffer = Buffer.from(data)
      var arr = Array.prototype.slice.call(buffer, 0);
      cb(arr[0] || false);
    });      
  })
}

function wr(per,uid,val,cb){
  getchars(per,uid,function(chrs){
    var buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(val);
    chrs[0].write(buf,false,function(err){
      return cb(err);
    });    
  })
}

function scanoff(cb){
  noble.on('scanStop',function(){
    setTimeout(cb,mex.delay);
  }); 
  
  noble.stopScanning();
}


async function scanon(repeat,cb){
  noble.on('scanStart', cb);
  await until(mex.state,'poweredOn');
  cl('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
  cl('Start scanning for JINOU AA20 devices.');
  noble.startScanning(['aa20'],repeat);
}

mex.data = function(){
  return module.exports.knowns;
}

////// EVENTS
process.on('SIGINT', function() {
 cl("Caught interrupt signal");
  noble.stopScanning();
  pers.map(function(per){
    per.disconnect();
  })
  process.exit();
});

noble.on('stateChange', (state) => {
  module.exports.state = state;
    cl('Noble adapter is %s', mex.state);
});


////// TESTS
function timeout(ms=10000){
  setTimeout(function(){
    cl('timeout');
    scanoff(function(){
      process.exit();  
    });  
  },ms)
}

function discover(per){
  var dev = readMfgData(per);
  if(dev.mac){
    if(mex.dbug) cl(per.address);

    if(!module.exports.knowns[dev.mac]){
      module.exports.knowns[dev.mac] = {
        first: dev
      };
    } 
    
    module.exports.alive[dev.mac] = dev;
    module.exports.knowns[dev.mac].last = dev;
    
    return dev;

  }
}

function run(){
  scanon(true,function(){
    noble.on('discover',function(per){
      var dev = discover(per);
      cl('Found New AA20 device:',dev.mac); 
    })    
  });
}

var pers = [];

function rw(cb,mac,uid,val){
  scanon(false,function(){
    noble.on('discover',function(per){
      pers.push(per);
      var dev = discover(per);
      cl(dev.mac,mac);
      if(dev.mac == mac){
        cl('found',mac);
        scanoff(function(){
          rd(per,uid,function(val){
            cl(val);
            per.disconnect(function(){
              process.exit();
              //rw(cb,mac,uid,val);  
            });
            //
          });
        })
      }
    })    
  });
}

//run();
//timeout(6000);
rw(cl,'cb:d0:c5:0c:27:bd','aa23',1);


/// ##########################
//jin.test('cd:d7:51:15:0f:7e',1);
//jin.test('cd:d7:51:15:0f:7e');

/*
jin.setfreq('c5:ac:70:b4:d1:20',200,function(ok){
  cl(ok);  
})
*/

