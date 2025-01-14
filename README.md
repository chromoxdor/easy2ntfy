If you like my work consider a donation: [![donate](https://img.shields.io/badge/donate-ko--fi-orange)](https://ko-fi.com/chromoxdor)

# easy2ntfy

A simple gateway for [ESPeasy](https://github.com/letscontrolit/ESPEasy) to receive commands through [ntfy](https://ntfy.sh/) and using [easyfetch](https://github.com/chromoxdor/easyfetch) trough the internet.

Open easy2ntfy: https://raw.githack.com/chromoxdor/easy2ntfy/main/fetch.html



<img width="952" alt="diagram" src="https://user-images.githubusercontent.com/33860956/224155251-bb047688-a6d8-4dc8-9ce0-833650998d95.png">


## **What is it for:**

I created easy2ntfy because i was in need to access my ESPeasy nodes via the internet since there was no easy way for me to use a VPN since my Provider uses CGN ([https://en.wikipedia.org/wiki/Carrier-grade_NAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT)). Although I have now solved this problem, I still wanted to work on esp2nfty because it is very easy to use.  
It is a combination of a gateway (ESP32) and a web application (derivative of easyfetch) which offers almost the same functionality as easyfetch.  
This gateway can also be used to send data from an ESPeasy device in a different location via PostToHttp.  

## **How it works (see diagram):**

The web-application sends a request with the title "send" on the command-channel every 60 seconds.  
easy2ntfy sends JSON data via the json-channel of an ESPeasy node to a ntfy server as long as it receives the "send" command.  
The web-application gets this data via SSE (server side events) and renders with the JSON data the easyfetch dashboard.  
If e.g. a button on the dashboard is pressed, this command will be send via the command-channel to a ntfy server and received by easy2ntfy through  
websocket. From there the message is parsed and send to the ESPeasy-node.  
 

## **Security concerns:**
The password is only there to encrypt the data so that no one can read or tamper with the application. It doesn't protect against sophisticated attacks such as cross-site scripting or physical access to your device where the password and channel data can be accessed.  
Since the channel name is needed to read and send messages to and from ESPeasy, it is important to choose a channel name that is not easy to guess. (The channel name also acts as a kind of password).  
A channel like "test" is likely to be selected more often and anyone can send or receive messages, which increases the total amount of messages that can be sent at any given time. (See **Limitations**)
E.g.: bad channel name: "test"  
good channel name: "Test_123-456_tesT"  


## **Limitations:**

Public ntfy server (at least ntfy.sh) have limitations: [https://docs.ntfy.sh/publish/?h=limit#limitations](https://docs.ntfy.sh/publish/?h=limit#limitations)  
The total number of messages per day is 1000 and the rate of requests is one per 5 seconds.  
That's why easy2ntfy only sends JSON updates once every 10 seconds.  
Only when a command is issued (e.g. button is pressed), the node is changed or the site is refreshed, easy2ntfy will send an update immediately.  
And since easy2ntfy uses two channels it is unlikely to hit at least the daily message limit.  
If the rate of requests limit is exceeded the web application will show an alert and stops sending for 10 seconds  
If the message length exceeds 4,096 bytes the content will be treated as an attachment and can no longer be parsed.  
Filtering out unnecessary JSON by esasy2ntfy shortens the output but a node (especially esp32) with a lot of enabled devices could hit this limit and will not be displayed.  
  
  
## **Todo:**

- maybe show amount of daily send messages  
  
  

## **Known issues:**

- none for now


## **How to use:**

1. Compile and upload Arduino sketch or flash the binaries file to an ESP32 Classic, ESP32 C3 or ESP32 S3.  
2. Connect to Access Point "easy2ntfy" (password: "configesp") and open 192.168.4.1 in a browser (if the captive portal doesn't open automatically).  
3. Enter your WiFi network credentials .
4. Open the "Setup" page
 -  Enter ntfy-channel, ntfy-server, default-node-IP (other public ntfy server can be found here: https://docs.ntfy.sh/integrations/)
 - Choose a password and your led pin. Hit save!
 - Unfortunately there are only two public server that work with easy2ntfy so far: ntfy.envs.net	and ntfy.mzte.de
 - the WiFiManager is always running. By entering the local ip you can always access and change the credentials and parameter
5. Add a channel to easyfetch here: [https://raw.githack.com/chromoxdor/easy ... fetch.html](https://raw.githack.com/chromoxdor/easy2ntfy/main/fetch.html)
 - use the same parameter you choose in the WiFiManager
  
**Setting up a channel:**

<img width="400" alt="Bildschirmfoto 2025-01-13 um 19 31 37" src="https://github.com/user-attachments/assets/29d58eeb-ba38-468a-9832-4b714efda337" />


**Adding a channel in the web application:**

![easy2ntfyApp](https://github.com/user-attachments/assets/f016e695-f71d-49ed-a1df-f14110422013)

