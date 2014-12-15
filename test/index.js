var test = require('tape')
var _ = require('icebreaker')
require('../index.js')

test('_.peers.ws',function(t){
  var p = _.peers.ws({port:8989})

  p.on('connect',function(params){
    console.log('connecting to ',params.address ,':', params.port)
  })

  var c =0
  p.on('connection',function(connection){
    console.log('connection ',connection.address,':',connection.port)
    ++c
    connection.c=c
    _(['test'],connection,_.drain(function(msg){
      t.equal(msg,'test')
    },function(err){
      t.equal(err,null)
      if(connection.c==2)p.stop()
    }))
  })

  p.on('start',function(){
    console.log('starting peer',this.name,' on ',this.address,':',this.port)
  })

  p.on('started',function(){
    console.log('peer',this.name,' on ',this.address,':',this.port ,' started')
    p.connect(p)
  })

  p.on('stop',function(){
    console.log('stopping peer',this.name,' on ',this.address,':',this.port ,'')
  })

  p.on('stopped',function(){
    console.log('peer',this.name,' on ',this.address,':',this.port ,' stopped')
    t.equal(this.port,8989)
    console.log(this.port)
    t.equal(this.name,'ws')
    console.log(this.name)
    console.log('stopped')
    t.equal(Object.keys(p.connections).length,0)
    console.log('end')
    t.end()
  })

  p.start()
})