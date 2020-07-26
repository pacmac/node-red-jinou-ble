module.exports = {
  
  dbug    : true,
  
  /* setval()  */
  address : null,
  setval  : null,
  
  knowns  : {},
  alive   : {},
  repeat  : true
  
}

const mex = module.exports;
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

function getchars(per,cb){
  if(mex.dbug) cl('getchars()',per.state);
  per.connect(function(error) {
  	if(mex.dbug) cl('connecting..',per.state);
  	per.discoverServices(['aa20'], function(error, services) {
  		if(mex.dbug) cl('services..',per.state);
  		var devsvc = services[0];
  		devsvc.discoverCharacteristics(['aa23'], function(error, chrs) {
        if(mex.dbug) cl('chars..',per.state);
        return cb(chrs);
  		})
  	})
  })  
}

function until(val) {
  const poll = resolve => {
    if(val) resolve();
    else setTimeout(resolve,200)
  }

  return new Promise(poll);
}

function rd(per,cb){
  getchars(per,function(chrs){
    chrs[0].read(function(error, data) {
      var buffer = Buffer.from(data)
      var arr = Array.prototype.slice.call(buffer, 0);
      cb(arr[0] || false);
    });      
  })
}

function wr(per,val,cb){
  getchars(per,function(chrs){
    var buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(val);
    chrs[0].write(buf,false,function(err){
      return cb(err);
    });    
  })
}

mex.setfreq = async function(cb,mac,val){
  module.exports.address = mac;
  module.exports.setval = val;
  await until(!mex.address);
  cb(mex.setval);
}

mex.test = function(mac='c5:ac:70:b4:d1:20',ival){
  cl('updating update frequency...')
  mex.setfreq(function(oval){
    cl('values:',ival,oval);
    process.exit();  
  },mac,ival)
}

noble.on('stateChange', (state) => {
  console.log('Noble adapter is %s', state);
  if (state === 'poweredOn') {
    cl('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    cl('Start scanning for JINOU AA20 devices.');
    noble.startScanning(['aa20'],mex.repeat);
  }
});

process.on('SIGINT', function() {
 cl("Caught interrupt signal");
  noble.stopScanning();
  process.exit();
});

function discon(per,cb){
  per.disconnect(function(err){
    clear();
    setTimeout(function(){
      noble.startScanning(['aa20'],mex.repeat);
    });
    if(mex.dbug) cl('done');
    if(cb) cb();
  });
}

function clear(){
  module.exports.address  = null;
  module.exports.setval   = val; // set to read-value.
}

function wrrd(per,cid,val,cb){
  wr(per,cid,val,function(ok){
    rd(per,cid,function(val){
      if(mex.dbug) cl('value:',val);
      if(cb) cb(val);
    })
  });   
}

noble.on('discover', function(per) {
  var dev = readMfgData(per);
  if(dev.mac){
    
    if(mex.dbug) cl(per.address);

    noble.on('scanStop',function(err){
      cl('stop');
      if(!module.exports.address) return;
      if(mex.setval) wrrd(per,mex.setval,function(ok){
        discon();
      })
      
      else rd(per,cid,function(val){
        if(mex.dbug) cl('read-value:',val);
        if(cb) cb(val);
        discon();
      })
             
    })

    // set AA23 update frequency 1-255
    if(mex.address && mex.address == per.address) {
      cl('read-write',per.address);
      return noble.stopScanning();  
    }
    
    else if(!module.exports.knowns[dev.mac]){
      module.exports.knowns[dev.mac] = {
        first: dev
      };
      if(mex.dbug) cl('Found New AA20 device:',dev.mac); 
    } 
    
    module.exports.alive[dev.mac] = dev;
    module.exports.knowns[dev.mac].last = dev;
  }
});
