#!/usr/bin/env node

// node.js用サーバスクリプト
// viewlog.ejsをテンプレートファイルとして必要します。
// CentOS 6だったらEPEL有効にして、
// yum --enablerepo=epel install nodejs npm
// npm install ws ejs
// node viewlog.js

// Common

var os = require('os');
var httpPort = 3000;
var wsPort   = 3001;
var wsHost   = os.hostname();
var logList = [
  '/var/log/httpd/access_log',
  '/var/log/httpd/error_log',
  '/var/log/nginx/access.log',
  '/var/log/nginx/error.log',
  'dummy' // ケツカンマハック
]; logList.pop(); // ケツカンマハックその2
// HTTP
var ejs  = require('ejs');
var http = require('http');

// HTTP server を作る
http.createServer( function (req, res) {
  res.writeHead( 200, { 'content-type': 'text/html' });
  // ejs fileをレンダリング
  ejs.renderFile(
    __dirname + '/viewlog.ejs',
    {  
      wsHost: wsHost,
      wsPort: wsPort,
      logList: logList
    },
    function(err, result) {
      // render on success
      if (!err) {
        res.end(result);
      }
      // render or error
      else {
        res.end('An error occurred');
        console.log(err);
      }
    }
  );
}).listen(httpPort);

// WebSocket
var exec     = require('child_process').exec;
var fs       = require('fs');
var path     = require('path');
var WsServer = require('ws').Server;

var cp = {};
var connections = [];

// WebSocketサーバを作成する
var wss = new WsServer( { port: wsPort });
// 監視するログファイル
var file = logList[0];

// 接続時に発生するイベントをセットする （d.interceptで例外捕捉）
wss.on('connection', function(ws) {
  connections.push(ws);

  ws.on('close', function () {
    stopWatch(ws);
    connections = connections.filter(function (conn, i) {
      return (conn === ws) ? false : true;
    });
  });


  // ファイルを監視して変更があれば readAndSendを実行する
  startWatch(ws, file);

  // クライアントからメッセージが来たら監視するログファイルを変更する
  ws.on('message', function(msg) {
    // ログファイルをクライアントから直接指定できるのはセキュリティリスク高いので
    // リスト番号で
    var order;
    order = msg.replace(/[^0-9]/g, ''); // ブラウザから送信されるはずなのは数字のみ
    order = parseInt(order);
    file = logList[order];
    if ( path.existsSync( file ) ) {
      startWatch(ws, file);
    }
    else {
      sendLog( ws, 'not found: ' + file );
      startWatch(ws, undefined);
    }
  });


});

// $ tail -1 で末行を取得
function readAndSend( ws, file ) {
  exec('tail -1 ' + file, function( err, stdout, stderr ) {
    if ( err ) throw err;
    sendLog( ws, stdout );
  });
}

// WebSocketを送信する
function sendLog( ws, data ) {
  if ( ws.readyState === 1 ) 
    ws.send( JSON.stringify ( data ) ); // WebSocketでデータを送信する
}

function startWatch(ws, file) {
  // 現在存在するwatcherから、wsを外す
  stopWatch( ws );
  if ( typeof file == 'undefined' ) {
    return;
  }
  // まだwatcherが作られていない場合
  if (! ( file in cp ) ) {
    cp[file] = { socket: [], };
    cp[file].watcher = fs.watch( file, function( eventName, filename ) {
      for ( var i = 0; i < cp[file].socket.length; i++ ) {
        readAndSend( cp[file].socket[i], file);
      }
    });
  }
  // watcherからコールバックでkickされるsockを追加
  cp[file].socket.push(ws);
  // console.log( cp ); // 今相手しているwsクライアント情報
}

function stopWatch(sock) {
  // 現在存在するwatcherから、sockを外す
  for ( var key in cp ) {
    cp[key].socket = cp[key].socket.filter( function( a, b ) {
      return ( a === sock ) ? false : true; 
    });
    if ( cp[key].socket.length == 0 ) { // watcherにsocketがなくなった
      cp[key].watcher.close(); // watcherを止める
      delete cp[key]; // 消す
    }
  }
}
