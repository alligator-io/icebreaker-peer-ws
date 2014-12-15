var _ = require('icebreaker')
require('icebreaker-peer')
var ws = require('pull-ws-server')
var EventEmitter = require('events').EventEmitter

var connection = function(original) {
  if (original.socket.upgradeReq) {
    if (original.socket.upgradeReq.connection.remotePort != null) {
      original.port = original.socket.upgradeReq.connection.remotePort
    }
    if (original.socket.upgradeReq.connection.remoteAddress != null) {
      original.address = original.socket.upgradeReq.connection.remoteAddress
    }
  }

  this.connection(original)
}

if (!_.peers) _.mixin({ peers : {} })

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