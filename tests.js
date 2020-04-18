const cl = console.log;
const jin = require('./jinou_aa20.js');

if(1==2) setTimeout(function(){
  cl(jin.perips);
},5000)

var per;

const noble = require('@abandonware/noble');

noble.on('stateChange', (state) => {
  console.log('Noble adapter is %s', state);

  if (state === 'poweredOn') {
    cl('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    cl('Start scanning for JINOU AA20 devices.');
    noble.startScanning(['aa20'], false);
  }
});

process.on('SIGINT', function() {
 cl("Caught interrupt signal");
  noble.stopScanning();
  per.disconnect(function(){
    process.exit();  
  });
});

module.exports.dev = {}

// Need to wait for device to be ready
function delay(cb=cl,ms=500){
  setTimeout(cb,ms)
}

function connectDiscover(peri,cb=cl,wait=250){
  peri.connect(function(error) {
    if(error) return cb({error:true,msg:error});
    cl('connected to: ' + peri.uuid);
    setTimeout(function(){
      peri.discoverServices('aa23', function(error, services) {
        if(error) return cb({errortrue,msg:error});
        //else cl(services)
        if(services[0]) {
          cl('discovered service');
          return cb(services[0]);
        }
      });
    },500);
  })
}

function read(peripheral,dsvc,dchr,cb){
  connect(peripheral,function(ok){
    peripheral.once('servicesDiscover', function(services){
      if(services.length) {
        var data = [];
        for(var idx in services){
          const service = services[idx];
          cl(`got-service ${dsvc}`)
          for(var sidx in service){
            service[sidx].once('characteristicsDiscover', function(devchr){
              //cl(`got-char ${dchr}`)
              data.push(devchr[0]);
              if(services.length==data.length) return cb(data);
              //return cb(devchr[0]); // buffer ??  
            });
            service[sidx].discoverCharacteristics(dchr);
          }
          
          
        }
      } 
      
      else {
        cl('@@@ error no-services');
      }
               
    });
    
    peripheral.discoverServices(dsvc);
  })      
}

// async-connect function
const connect = function(peripheral,cb){
  if(peripheral.connect && peripheral.state != 'connected'){
    peripheral.once('connect',function(error){;
      //cl(`@@ ${peripheral.id} ${peripheral.state} connected.`)
      return cb(peripheral.state=='connected');      
    });

    peripheral.connect();
  }
  
  else return cb(peripheral.state=='connected')
}

function disco(per){
  setTimeout(function(){
    per.disconnect(function(){
      cl(-1, per.state);
      process.exit();  
    })
  });  
}

function go(per){
  var debug = true;
  var count=1;
  if(debug) setInterval(function(){
    cl(count*500,per.state);
    count++  
  },500)
  
  cl('connecting...');
  connect(per,function(ok) {
    cl('mac: ' + per.address,per.state);
    if(debug) cl(1,per.state);
    connect(per,function(){
      if(debug) cl(2,per.state);
      per.discoverServices(['aa20'], function(error, services) {
        if(error) cl(error);
        var devsvc = services[0];
        if(debug) cl(3,per.state);
        if(devsvc) {
          connect(per,function(){
            devsvc.discoverCharacteristics(['aa23'], function(error, characteristics) {
              
              delay(function(){
                var cdata = characteristics[0];
                if(!cdata) return disco(per);
                cl(cdata);
                
                if(1==1) {
                  var buf = Buffer.allocUnsafe(1);
                  buf.writeUInt8(0xFF);
                  characteristics[0].write(buf,true,function(err){
                    disco(per);
                  });
                  return;
                }
   
                if(cdata) cdata.read(function(error, data) {
                  var buffer = Buffer.from(data)
                  var arr = Array.prototype.slice.call(buffer, 0)
                  console.log(arr[0]);
                  disco(per)
                });
              })
            })
          })
        } // if devsvc
      })
    })
  })

}

function _go(per){
  per.connect(function(error) {
  	cl(1,per.state)
  	//per.once('servicesDiscover', function(services){
  	per.discoverServices(['aa20'], function(error, services) {
    //per.once('DiscoverServices', ['aa20'],function(services){
  		cl(2,per.state)
  		var devsvc = services[0];
  		devsvc.discoverCharacteristics(['aa23'], function(error, characteristics) {
  		  cl(3,per.state)
  		  var cdata = characteristics[0];
  			var buf = Buffer.allocUnsafe(1);
  			buf.writeUInt8(0xFF);
  			characteristics[0].write(buf,true,function(err){
  			  cl(4,per.state)
  			  //disco(per);
  			  per.disconnect(cl);
  			});
  		})
  	})
  })
}



var done = false;
noble.on('discover', function(per) {
  var mac = per.address;
  if(mac == 'c5:ac:70:b4:d1:20'){
    noble.on('scanStop',function(){
      go(per);
    });
    noble.stopScanning();
  }

  //go();
  //connectDiscover(per);
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



