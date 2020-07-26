const cl        = console.log;
const noble     = require('@abandonware/noble');
const repeat    = false;
const uuid      = 'aa20';
                 
const _batt     = '2a19';
const _int      = 'aa23';
const _onoff    = 'aa22';

var _idx = 0;

module.exports = {
  dbug    : true,
  knowns  : {},
  alive   : {},
  
  timeout : 10000
}

const mex = module.exports;

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

function dbug(str){
  if(!mex.dbug) return;
  _idx++;
  cl(_idx,str);
}

function until(val) {
  const poll = resolve => {
    if(val) resolve();
    else setTimeout(resolve,200)
  }
  return new Promise(poll);
}

function sleep(ms) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < ms);
}

noble.on('stateChange', async function(state){
  if (state === 'poweredOn') {
    dbug(state);
    await scanon(repeat);
  }
});

async function scanon(repeat){
  dbug('scanon()');
  await noble.startScanningAsync([uuid],repeat);
}

async function scanoff(){
  dbug('scanoff()');
  dbug(noble._bindings._gap._scanState);
  await noble.stopScanningAsync();
  dbug(noble._bindings._gap._scanState);
  sleep(2000);
}

async function discon(per){
  dbug('discon()');
  await per.disconnectAsync();
}

async function connect(per){
  dbug('connect()');
  if(per.state=='connected') return true;
  await per.connectAsync();
  return true;
}

// get first char
async function getChr(per,sid){
  dbug('getChr()');
  const {characteristics} = await per.discoverSomeServicesAndCharacteristicsAsync([uuid], [sid]);
  return characteristics[0]; 
}

// char read-write.
async function chrRW(per,sid,val){
  dbug('chrRW()');
  const chr = await getChr(per,sid);
  
  // Read.
  if(!val) return (await chr.readAsync())[0]; 
  
  // Write.
  var buf = Buffer.allocUnsafe(1);
  buf.writeUInt8(val);
  var ok = await chr.write(buf,false);
  return chrRW(per,sid);
}

mex.run = async function(){
  await scanon(true);
  
  noble.on('discover', async function(per){
    _idx = 0;
    const dev = readMfgData(per);
    if(!dev.mac) return;
    
    if(!mex.knowns[dev.mac]){
      mex.knowns[dev.mac] = {
        first: dev
      };
      if(mex.dbug) cl('Found New AA20 device:',dev.mac); 
    } 
    
    mex.alive[dev.mac] = dev;
    mex.knowns[dev.mac].last = dev;
  })
}

const rw = async function(mac,uid,val,cb){
  
  var per,val, done,tout = setTimeout(async function(){
    done = true;
    await per.disconnectAsync();
    cb();
  },mex.timeout);
  
  //noble.removeListener('discover',cl);
    //dbug(noble)
    noble.on('discover', async function(_per){
      _idx = 0;
      per = _per;
      if(per.address != mac) return;
      
      await scanoff();
      await connect(per);
    
      val = await chrRW(per,uid,val);
      clearTimeout(tout);
      discon(per);
      if(!done) return cb(val);
    
    });
  //})
}

mex.data = function(key){
  if(key) return mex.knowns[key];
  return mex.knowns;
}

mex.rw = function(mac,sid,val,cb){
  dbug('mex.rw()');
  rw(mac,sid,val,function(val){
    cb(val);
    mex.run();
  })     
}

// set interval and read the updated value.
function testwr(){
  mex.rw('cb:d0:c5:0c:27:bd',_int,10,function(val){
    dbug(val*250/1000);
    //process.exit(0);  
  })  
}

// run mode.
function testrun(){
  mex.run();
  setInterval(function(){
    cl(mex.data());
  },5000);  
}


testwr();
//testrun();

