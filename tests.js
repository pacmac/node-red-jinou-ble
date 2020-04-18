
var _per;
const dbug = true;
const cl = console.log;
const jin = require('./jinou_aa20.js');

if(1==2) setTimeout(function(){
  cl(jin.perips);
},5000)

const noble = require('@abandonware/noble');

process.on('SIGINT', function() {
 cl("Caught interrupt signal");
  noble.stopScanning();
  _per.disconnect(function(){
    process.exit();  
  });
});

function getchars(per,cb){
  if(dbug) cl('getchars()',per.state);
  per.connect(function(error) {
  	if(dbug) cl('connecting..',per.state);
  	per.discoverServices(['aa20'], function(error, services) {
  		if(dbug) cl('services..',per.state);
  		var devsvc = services[0];
  		devsvc.discoverCharacteristics(['aa23'], function(error, chrs) {
        if(dbug) cl('chars..',per.state);
        return cb(chrs);
  		})
  	})
  })  
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

noble.on('stateChange', (state) => {
  console.log('Noble adapter is %s', state);

  if (state === 'poweredOn') {
    cl('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    cl('Start scanning for JINOU AA20 devices.');
    noble.startScanning(['aa20'], true);
  }
});

noble.on('discover', function(per) {
  
  return cl(per.address,new Date());
  
  
  var mac = per.address;
  if(mac == 'c5:ac:70:b4:d1:20'){
    noble.on('scanStop',function(){
      _per = per;
      
      if(1==2) rd(per,function(val){
        cl(val);
        per.disconnect(function(err){
          process.exit();
        });
      });
      
      wr(per,200,function(ok){
        rd(per,function(val){
          cl(val);
          per.disconnect(function(err){
            process.exit();
          });
        })
      });
      
      //wr(per,111,cl)
    });
    noble.stopScanning();
  }

});


var setfreq = function(mac,msec,cb=cl){

  tried = 0;
  function waitval(cb){
    if(tried < 50 && ! module.exports.perip) return setTimeout(function(){
      tried ++;
      return waitval(cb);
    },250);
    
    tried = 0;
    cb(module.exports.perip);
  }

  /*
    0XAA22(Read,Write):
      start/stop checking temp and humid. 0x01(start), 0x00(stop).
    
    0XAA23(Read,Write):
      checking frequency, unit(10ms), default is 100, that is checking every second.
  */  
  module.exports.macid = mac;
  waitval(function(per){
    if(!per) return false;
    setTimeout(function(){
      per.connect(function(err) {
        cl('error:',err);
        cl('connected to peripheral: ' + per.uuid);
        setTimeout(function(){
          per.discoverServices(null, function(error, services) {
            console.log('discovered the following services:');
            for (var i in services) {
              console.log('  ' + i + ' uuid: ' + services[i].uuid);
            }
            //per.disconnect();
          });
        },1000)
      });
    },500)
  });
  
  
  //var per = module.exports.knowns[mac];
  //if(!per) return;
  

}


/*
var msec = 2000;
var mac = 'c5:ac:70:b4:d1:20';
jin.setfreq(mac,msec,function(ok){
  cl('xxx',ok);
});
*/


/*

let meaningOfLife = false;
async function _wait(key,val){
  while(key != val){
    await null;
  }
}

setTimeout(function(){
  meaningOfLife=true;
  cl('set');
},5000);


tried = 0;
function waitval(key,val,cb){
  if(tried < 21 && key != val) return setTimeout(function(){
    tried ++;
    return waitval(key,val,cb);
  },250);
  
  tried = 0;
  cb(key==val);
}


waitval(meaningOfLife,true,function(val){
  cl(val);  
});
*/


/*
wait(meaningOfLife,true).then(function(res){
  cl(res);
  cl('done');
})
*/

//setTimeout(()=>meaningOfLife=true,420)



