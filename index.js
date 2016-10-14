const app = require('express')()
require('express-ws')(app)
const http = require('http').Server(app)
const port = process.env.PORT || 3000
const ChildProcess = require('child_process')
const Wav = require('wav')
const fs = require('fs')

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.ws('/transcribe', function(socket, req) {
  
  console.log('connection')
  var writer = new Wav.FileWriter('/tmp/testing.wav', {
    channels: 1,
    sampleRate: 44100,
    bitDepth: 16
  })
  var resampler = ChildProcess.spawn('sox', ['-t', 'wav', '-c', '1', '-r', '44.1k', '-', '-r', '16k', '-t', 'wav', '-'])
  var transcriber = ChildProcess.spawn('java', ['-cp', __dirname + '/../speech_transcriber/build/libs/speech_transcriber.jar', 'com.arosscohen.speech_transcriber.SpeechTranscriber'])
  
  socket.on('message', function(data) {
    writer.write(data)
  })
  writer.on('data', function(data) {
    resampler.stdin.write(data)
  })
  resampler.stdout.on('data', function(data) {
    transcriber.stdin.write(data)
  })
  transcriber.stdout.on('data', function(data) {
    console.log('result', data.toString())
    try {
      socket.send(data.toString())
    } catch (e) {
      console.log(e);
    }
  })
  
  socket.on('close', function() {
    console.log('close')
    writer.end()
    transcriber.kill('SIGINT')
    resampler.kill('SIGINT')
  })
  
  socket.on('error', function() {
    writer.end()
    transcriber.kill('SIGINT')
    resampler.kill('SIGINT')
  })
  
  resampler.stderr.on('data', function(data) {
    console.log('resampler >>>', data.toString())
  })
  transcriber.stderr.on('data', function(data) {
    console.log('transcriber >>>', data.toString())
  })
  
})

app.listen(port, function() {
  console.log('listening')
})
