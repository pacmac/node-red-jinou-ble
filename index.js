module.exports = function(RED) {

  const url       = require('url');
  const request   = require('request');
  const jin       = require('./jinou_aa20.js');
  const cl        = console.log;
  
  function jinouMain(config) {
    RED.nodes.createNode(this,config);
    this.address = config.address;
    this.server = config.server;
    var node = this;
    
    function get(cb=cl){
      var host = new URL(node.server);
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
        
        if(node.address == '' || node.address == '*') var odata = idata;
        else odata = idata[node.address] || {};
        odata.name = node.name;
        
        //cl(`go(${src})`,odata);
        
        node.send({
          payload : odata,
          topic   : msg.payload,
          _msgid  : new Date().getTime()
        });
      }
      
      if(node.server) get(function(data){
        if(!data.error) {
          go(data.data,'http');
        }
        else cl(data);
      });
      
      else go(jin.alive,'bt');
      
    });
  
  }
  
  RED.nodes.registerType("jinou-ble",jinouMain);
}
