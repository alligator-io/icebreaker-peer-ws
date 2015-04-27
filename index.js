var _ = require('icebreaker')
if(!_.peer)require('icebreaker-peer')
var ws = require('ws')
var pws = require('pull-ws')
var EventEmitter = require('events').EventEmitter
var http = require('http')
var url = require('url')
var net = require('net')
var dns = require('dns')
var fs = require('fs')
var path = require('path')

function isPath(p) {
  return isString(p) && isNaN(p)
}

function isString(obj){
  return typeof obj === 'string'
}

if (!_.peers) _.mixin({ peers : {} })

_.mixin({
  ws : _.peer({
    name : 'ws',
    auto : true,
    start : function() {
      var self = this

      this.server = http.createServer(function(res){
        res.end(self.name)
      })

      this.server.on('error', function (err) {
        if (isPath(self.port) && err.code === 'EADDRINUSE') {
          var socket = net.Socket()

          socket.on('error', function (err) {
            if (err.code === 'ECONNREFUSED') {
              fs.unlink(self.port, function (err) {
                if (err)
                  _(
                    'cannot remove unix socket ' + self.port,
                    _.log(process.exit.bind(null, 1), 'emerg')
                  )
                listen()
              })
            }
            else if (err.code==='ENOENT') {
              listen()
            }
          })

          socket.connect(self.port, function () {
            _(
              'peer ' + self.name + ' port ' + self.port +
              ' is already in use by another process.',
              _.log(process.exit.bind(null, 1), 'emerg')
            )
          })

          return
        }

        _(
        ['cannot start peer' + self.name + ' on port ' + self.port, err],
          _.log(process.exit.bind(null, 1), 'emerg')
        )
      })

      var listen = function (onListening) {
        self.server.listen(
          self.port, isPath(self.port) ? null :
          self.address, onListening
        )
      }

      listen(function () {
        if (isPath(self.port)) fs.chmod(path.join(process.cwd(),self.port), 0777)
        self.wsServer = ws.createServer({server:self.server})
        self.wsServer.on('connection',function(o){
          var c = pws(o)
          c.address = o.remoteAddress
          c.port = o.remotePort
          self.connection(c)
        })
        self.emit('started')
      })
    },

    connect : function(params) {
      var self = this
      var address = {
        protocol:isPath(params.port)?'ws+unix':'ws',
        slashes:true
      }
      if(!isPath(params.port)){
        address.hostname = params.address
        address.port = params.port
      }
      else address.pathname = path.join(process.cwd(),params.port)

      function connect(){
        var c = pws(ws.connect(url.format(address)))
        c.address = params.address
        c.port = params.port
        c.direction = params.direction
        if(params.hostname)c.hostname = params.hostname
        self.connection(c)
      }

      if(isString(params.address) && !net.isIP(params.address)){
        dns.lookup(params.address,function(err,ip){
          address.hostname=params.address=err?params.address:ip
          connect()
        })
      }
      else connect()
    },

    stop: function stop() {
      var self = this
      try {
        this.wsServer.close()
        self.server.close(function close() {
          if (Object.keys(self.connections).length > 0) {
            process.nextTick(function () {
              close.call(self)
            })
            return
          }
          else self.emit('stopped')
        })
      }
      catch (e) {
        _([e], _.log(function () {
          self.emit('stopped')
        }), 'error')
      }
    }
  })
}, _.peers)
