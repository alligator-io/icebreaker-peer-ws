var _ = require('icebreaker')
if(!_.peer)require('icebreaker-peer')
var ws = require('pull-ws-server')
var WebSocket = require('ws')
var pws = require('pull-ws')
var EventEmitter = require('events').EventEmitter
var url = require('url')

var connection = function(original) {
  var address = this.address
  var port  = this.port

  if(typeof original.address ==='object'){
    if (original.address.port != null) {
      port = original.address.port
    }
    if (original.address.host != null) {
      address = original.address.host
    }
  }

  if (original.remoteAddress) {
    if (original.remoteAddress.port != null) {
      port = original.remoteAddress.port
    }
    if (original.remoteAddress.host != null) {
      address = original.remoteAddress.host
    }
  }

  var stream = {
    source:original.source,
    sink:original.sink,
    address:address,
    port:port
  }

  if(original.headers)stream.headers=original.headers

  this.connection(stream)
}

if (!_.peers) _.mixin({ peers : {} })

ws.connect = function (address, options) {
  var socket = new WebSocket(
      typeof address === 'string'? address
      : url.format({
          protocol: 'ws', slashes: true,
          hostname: address.host || address.hostname,
          port: address.port,
          pathname: address.pathname
        })
      ,options)

  var stream = pws(socket)
  stream.address=address

  return stream
}

_.mixin({
  ws : _.peer({
    name : 'ws',
    auto : true,
    start : function() {
      this.server = ws.createServer(connection.bind(this))
      this.server.on('request', function(req, res) {
        res.end(this.name)
      }.bind(this))

      this.server.listen(typeof this.port === 'string' ? this.port : {
        port : this.port,
        host : this.address
      },
      function() {
        this.emit('started')
      }.bind(this))
    },

    connect : function(params) {
      if (!params.address) params.address = this.address
      process.nextTick(function() {
        connection.call(this,
          ws.connect(typeof params.port === 'string' ? params.port : {
            port : params.port,
            host : params.address
          })
        )
      }.bind(this))
    },

    stop : function() {
      try {
        this.server.close(function() { this.emit('stopped') }.bind(this))
      }
      catch (e) {
        _([ e ], _.log(function() { this.emit('stopped') }.bind(this)), 'error')
      }
    }
  })
}, _.peers)
