module.exports = function(RED) {

  const url       = require('url');
  const request   = require('request');
  var jin         = require('./jinou_aa20.js');
  const cl        = console.log;
  
  function jinouMain(config) {
    RED.nodes.createNode(this,config);
    this.config = config;
    var node = this;
    
    function get(cb=cl){
      var host = new URL(node.config.server);
      request({
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

      function go(idata,src){
        
        if(node.config.address == '' || node.config.address == '*') var odata = idata;
        else odata = idata[node.config.address] || {};
        odata.name = node.name;
        
        if(msg.debug) cl(`go(${src})`,odata);
        
        node.send({
          payload : odata,
          topic   : msg.payload,
          _msgid  : new Date().getTime()
        });
      }
      
      if(node.config.server) get(function(data){
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
          if(node.config.cache){
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

