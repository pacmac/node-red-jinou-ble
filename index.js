module.exports = function(RED) {

  const url       = require('url');
  const request   = require('request');
  var jin         = require('./jinou_aa20.js');
  const cl        = console.log;
  
  function jinouMain(config) {
    RED.nodes.createNode(this,config);
    this.config = config;
    var node = this;
    
    function get(server,cb=cl){
      var host = new URL(server);
      request({
        headers   : {
          'Content-Type': 'application/json'
        },
        json      : true,
        url       : host,
        method    : 'get',
        timeout   : 2000
        
      }, (err, res, body) => {
        if (err) { return cb({error:true,msg:err.message}); }
        cb({error:false, data:body});
      });
    }
    
    node.on('input', function(msg) {

      // switch for using payload.
      if(node.config.argsrc == 'payload') {
        var name    = msg.payload.name;
        var mac     = msg.payload.mac || msg.payload.mac;
        var server  = msg.payload.server || null;
        var cache   = msg.payload.cache || null; 
      } else {
        name    = node.config.name;
        mac = node.config.mac;
        server  = node.config.server || null;
        cache   = node.config.cache || null;         
      }
    
      if(msg.debug) cl(`name:${name},mac:${mac},server:${server},cache:${cache}`)
    
      function go(idata,src){
        if(msg.debug) cl('mac:',mac)
        if(mac == '' || mac == '*') var odata = idata;
        else odata = idata[mac] || {};
        odata.name = name;
        if(msg.debug) cl(`go(${src})`,odata);
        
        node.send({
          payload : odata,
          topic   : msg.payload,
          _msgid  : new Date().getTime()
        });
      }
      
      if(server) get(server,function(data){
        if(!data.error && data.data) {
          
          // Single device - age in msecs
          if(('temp' in data.data)) {
            if(('age' in data.data)) data.data.stamp = (new Date().getTime() - data.data.age);   
          }
          
          // multiple devices - age in msecs
          else {
            for(var mac in data.data){
              if(('age' in data.data[mac])) data.data[mac].stamp = (new Date().getTime() - data.data[mac].age);  
            }
          }

          // cache http data locally.
          if(cache){
            jin.alive = Object.assign(jin.alive,data.data);
            go(jin.alive,'http-cache');
          } else go(data.data,'http-live');
        }
        else cl(data);
      });
      
      else go(jin.alive,'bt');
      
    });
  
  }
  
  RED.nodes.registerType("jinou-ble",jinouMain);
}

