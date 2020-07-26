const cl        = console.log;
const noble     = require('@abandonware/noble');

const _uuid     = 'aa20';               
const _batt     = '2a19';
const _int      = 'aa23';
const _onoff    = 'aa22';

var _idx = 0;

module.exports = {
  dbug    : true,
  knowns  : {},
  alive   : {},
  
  timeout : 10000,
  
  //
  req     : {}
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

async function timeout(ms,fn) {
  //return new Promise(resolve => setTimeout(resolve, ms));
  await Promise.race([
    fn,
    new Promise(function(resolve) {
      setTimeout(function() {
        console.log('Timed out');
        resolve();
      },ms);
    }),
  ])
}

async function scanon(repeat){
  dbug('scanon()');
  await noble.startScanningAsync([_uuid],repeat);
}

async function scanoff(){
  dbug('scanoff()');
  await noble.stopScanningAsync();
}

async function discon(per){
  dbug('discon()');
  await per.disconnectAsync();
}

async function connect(per){
  dbug(`connect(${per.address})`);
  if(per.state=='connected') return true;
  //await per.connectAsync();
  //return true;

  await Promise.race([
    new Promise(resolve => setTimeout(resolve,10000)),
    per.connectAsync(),
  ])
}

// get first char
async function getChr(per,sid){
  dbug(`getChr(${sid})`);
  async function go(){
    const {characteristics} = await per.discoverSomeServicesAndCharacteristicsAsync([_uuid], [sid]);
    return characteristics[0];
  } 
  
  await Promise.race([
    new Promise(resolve => setTimeout(resolve,10000)),
    go(),
  ]);
}

// char read-write.
async function chrRW(per,sid,val){
  dbug('chrRW()');
  const chr = await getChr(per,sid);
  
  if(!chr) return;
  // Read.
  if(!val) return (await chr.readAsync())[0]; 
  
  // Write.
  var buf = Buffer.allocUnsafe(1);
  buf.writeUInt8(val);
  var ok = await chr.write(buf,false);
  return chrRW(per,sid);
}

mex.run = async function(per){
  dbug(`mex.run(${per._mac})`)
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

  if(mex.req.mac) {
    dbug(mex.req.mac);
    const val = await rw(per,mex.req.mac,mex.req.sid,mex.req.val)
    //clr();
    await scanon(true);
    //return (val);  
  }
}

const rw = async function(per,mac,sid,val){
  await scanoff();
  dbug(`${mac},${sid},${val}`);
  
  var per,val,done;
  /*
  tout = setTimeout(async function(){
    done = true;
    await per.disconnectAsync();
  },mex.timeout);
  */
  
  await connect(per);
  
  if(per.state != 'connected') {
    cl('xxxxx');
    return;
  }
  
  dbug('mex.rw(discover)')
  cl(per.address,mac);
  if(per.address != mac) return;
  
  
  //await connect(per);

  val = await chrRW(per,sid,val);
  dbug(val);
  discon(per);
  if(!done) return val;
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

// clear the request
function clr(){
  mex.req = {
    mac: null,
    sid: null,
    val: null
  }
}

noble.on('stateChange', async function(state){
  if (state === 'poweredOn') {
    dbug(state);
    clr();
    await scanon(true);
  }
});

noble.on('discover', async function(per){
  mex.run(per);  
})

setInterval(function(){
  mex.req = {
    mac: 'cb:d0:c5:0c:27:bd',
    sid: 'aa23',
    val: null
  }
},10000); 

//testwr();
//testrun();

