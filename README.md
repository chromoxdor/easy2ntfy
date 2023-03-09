If you like my work consider a donation: [![donate](https://img.shields.io/badge/donate-ko--fi-orange)](https://ko-fi.com/chromoxdor)

# easy2ntfy

A simple gateway for [ESPeasy](https://github.com/letscontrolit/ESPEasy) to receive commands through [ntfy](https://ntfy.sh/) and using [easyfetch](https://github.com/chromoxdor/easyfetch) trough the internet.

https://raw.githack.com/chromoxdor/easy2ntfy/main/fetch.html



<img width="952" alt="diagram" src="https://user-images.githubusercontent.com/33860956/224155251-bb047688-a6d8-4dc8-9ce0-833650998d95.png">


## **What is it for:**

I created easy2ntfy because i was in need to access my ESPeasy nodes via the internet since there was no easy way for me to use a VPN since my Provider uses CGN ([https://en.wikipedia.org/wiki/Carrier-grade_NAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT)). Although I have now solved this problem, I still wanted to work on esp2nfty because it is very easy to use.  
It is a combination of a gateway (esp8266) and a web application (derivative of easyfetch) which offers almost the same functionality as easyfetch.  
This gateway can also be used to send data from an ESPeasy device in a different location via PostToHttp.  

## **How it works (see diagram):**

The web-application sends a request with the title "send" on the command-channel every 60 seconds.  
easy2ntfy sends JSON data via the json-channel of an ESPeasy node to a ntfy server as long as it receives the "send" command.  
The web-application gets this data via SSE (server side events) and renders with the JSON data the easyfetch dashboard.  
If e.g. a button on the dashboard is pressed, this command will be send via the command-channel to a ntfy server and received by easy2ntfy through  
websocket. From there the message is parsed and send to the ESPeasy-node.  
 

## **Security concerns:**

The public instances of ntfy have no authentication, which means everyone can listen to a channel.  
Since the channel name is needed to read and send messages from and to ESPeasy it is important to choose a channel name which is not easy to guess. (the channel name acts as a kind of password)  
E.g.: bad channel name: "test"  
good channel name: "Test_123-456_tesT"  
For those who want to give it a try but suddenly feel uncomfortable with it, can enter the read-only mode by long pressing the channel in the web-application. Easy2ntfy will now block any command until it is restarted (the channel is now displayed in red):

<img width="250" alt="readonly0" src="https://user-images.githubusercontent.com/33860956/224155545-500d587c-1db5-42c7-95f4-aa1cc09ec0d2.png">


## **Limitations:**

Public ntfy server (at least ntfy.sh) have limitations: [https://docs.ntfy.sh/publish/?h=limit#limitations](https://docs.ntfy.sh/publish/?h=limit#limitations)  
The total number of messages per day is 1000 and the rate of requests is one per 5 seconds.  
That's why easy2ntfy only sends JSON updates once every 10 seconds.  
Only when a command is issued (e.g. button is pressed), the node is changed or the site is refreshed, easy2ntfy will send an update immediately.  
And since easy2ntfy uses two channels it is unlikely to hit at least the daily message limit.  
If the rate of requests limit is exceeded the web application will show an alert and stops sending for 10 seconds  
If the message length exceeds 4,096 bytes the content will be treated as an attachment and can no longer be parsed.  
Filtering out unnecessary JSON by esasy2ntfy shortens the output but a node (especially esp32) with a lot of enabled devices could hit this limit and will not be displayed.  
  
  
# **Todo:**

 show amount of daily send messages  
- authentication options for self hosted server  
- add notification when JSON message gets to long  
- ~~display saved parameters in WiFiManager if available (instead of default values)~~
  
  

## **Known issues:**

  
Sometimes easy2ntfy hangs and with it the serial connection which makes it hard for me to debug. For now a reboot solves the issue.  


## **How to use:**

1. Compile and upload Arduino sketch or flash binary file to an esp8266.  
2. Connect to Access Point "easy2ntfy" (password: "configesp") and open 192.168.4.1 in a browser.  
3. Enter your WiFi network credentials .  
4. Enter ntfy-channel, ntfy-server, default-node-IP (other public ntfy server can be found here: [https://docs.ntfy.sh/integrations/] 
 - Unfortunately there are only two public server that work with easy2ntfy so far: ntfy.envs.net	and ntfy.mzte.de
 - the WiFiManager is always running. By entering the local ip you can always access and change the credentials and parameter
5. Add a channel to easyfetch: [https://raw.githack.com/chromoxdor/easy ... fetch.html](https://raw.githack.com/chromoxdor/easy2ntfy/main/fetch.html)  
  
**Setting up a channel:**


<img width="325" alt="config_wifi" src="https://user-images.githubusercontent.com/33860956/224155821-10224a8e-aa1e-441b-b980-1a5fa1b5f7a3.png">

**Adding a channel in the web application:**

![config web](https://user-images.githubusercontent.com/33860956/224155843-41506f23-23c0-45be-bc61-223ff99cbbe0.gif)


