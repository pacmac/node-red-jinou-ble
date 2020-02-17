module.exports = function(RED) {

  var jin = require('./jinou_aa20.js');
  const cl = console.log;
  
  function jinouMain(config) {
    RED.nodes.createNode(this,config);
    this.address = config.address;
    var node = this;
    
    node.on('input', function(msg) {
      // cl(this);
      if(this.address == '' || this.address == '*') var data = jin.alive;
      else data = jin.alive[this.address] || {};
      data.name = this.name;
      
      node.send({
        payload : data,
        topic   : msg.payload,
        _msgid  : new Date().getTime()
      });
    });
  
  }
  
  RED.nodes.registerType("jinou-ble",jinouMain);
}

