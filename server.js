#!/usr/bin/env nodejs

// content of index.js
const request = require('request');
const http = require('http');
const port = process.env.PORT || 3000;
const childProcess = require('child_process');
const cl = console.log;
const jin = require('./jinou_aa20.js');

jin.dbug = true;

const requestHandler = (req, res) => {
  req.ip = req.connection.remoteAddress.replace('::ffff:','')
  
  var bits = req.url.split('?'); //  url: '/?_cmd=xxxxx',
  if(bits.length==2){
    req.query={}
    var pairs = bits[1].split('&');
    pairs.map(function(pair){
      var pb = pair.split('=');
      req.query[pb[0]]=pb[1];
    })
  }
  
  // ::ffff:192.168.0.130
  // cl(req.ip,req.url,req.method);
  
  var address = '*';
  var bits = req.url.split('/');
  if(bits.length == 2) address = bits[1];
  if(address == '' || address == '*') var data = jin.alive;
  else data = jin.alive[address] || {};
  data.name = this.name;
  res.end(JSON.stringify(data));
  
}

const server = http.createServer(requestHandler)
server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})