# viewlog.js （node.js用サーバログWebSocket表示）

node.js用習作。

Linuxサーバに設置して、リアルタイムログをWebブラウザで表示します。

ログの漏洩はセキュリティリスクとなりますので、テストとして、または公開範囲を制限したうえでご利用ください。

## 特徴

* node.js＋WebSocketサーバ＋WebSocket対応ブラウザによるリアルタイム表示、他クライアント対応
* 表示の一時停止もできます（ログ上マウスカーソルホバー、または一時停止チェックボックスで）。
* 監視するログを選択、切り替えできます（`/var/log/httpd/access_log`、`/var/log/httpd/error_log`など選択ボックスで切り替え）
* Portを2つ利用します（HTTP用・WebSocket用）。

## 設置

CentOS 6だと、

インストール

    $ su -
    password: ********
    # rpm -ivh http://ftp.riken.jp/Linux/fedora/epel/6/x86_64/epel-release-6-8.noarch.rpm
    # yum --enablerepo=epel install nodejs npm
    # git clone https://github.com/CLCL/viewlog
    # cd viewlog
    # npm install ws ejs
    # iptables -I INPUT -p tcp -m tcp --dport 3000 -j ACCEPT
    # iptables -I INPUT -p tcp -m tcp --dport 3001 -j ACCEPT

起動（rootユーザが読めるログを表示させたいのなら、rootユーザで実行）

    # node viewlog.js &

停止

    # killall node

※他のnode.jsで動いているサービスも停止します

自動起動

* CentOS 6ならば標準では `upstart` デーモンで制御します。
* ディストリビューション依存にしたくないなら、最近ならば `Supervisor` デーモンを使ってみるのはどうでしょうか。

## 表示

設置したサーバのホスト名が `localhost.localdomain` だとしたら、Webブラウザで `http://localhost.localdomain:3000/`  にアクセスすると、WebSocket接続（Port 3001/TCP）とリアルタイム表示JavaScriptが組み込まれたHTMLが得られますので、ブラウザでWebSocketに対応しているとリアルタイムにログが更新されます。

## セキュリティリスク

あらかじめスクリプト側で指定したログファイルのリストにあるファイルにアクセスできる権限を第三者に開放していることになりますので、ログ取得に関するセキュリティレベルをあえて下げている行為にほかなりません。

また、node.jsを動かすユーザを安易にrootにすることは推奨されません。

よって、閉じられた環境下で、公開範囲を充分制限した上で設置することが望ましいです。

iptablesでのIPアドレスによるアクセス制限は以下の通り（自分自身と、192.168.0.1～192.168.0.255からのアクセスを許可する）。

    # iptables -I INPUT -p tcp -m tcp --dport 3000 -j DROP 
    # iptables -I INPUT -p tcp -m tcp --dport 3001 -j DROP 
    # iptables -I INPUT -s 127.0.0.1 -p tcp -m tcp --dport 3000 -j ACCEPT 
    # iptables -I INPUT -s 127.0.0.1 -p tcp -m tcp --dport 3001 -j ACCEPT 
    # iptables -I INPUT -s 192.168.0.0/24 -p tcp -m tcp --dport 3000 -j ACCEPT 
    # iptables -I INPUT -s 192.168.0.0/24 -p tcp -m tcp --dport 3001 -j ACCEPT 

##changes

* ver 0.0.1 first commit

