
/*#if !defined(ESP8266)
  #error This code is intended to run only on the ESP8266 boards ! Please check your Tools->Board setting.
#endif*/

#include <FS.h>  //this needs to be first, or it all crashes and burns...
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // https://github.com/tzapu/WiFiManager
#include <ArduinoJson.h>          // https://github.com/bblanchon/ArduinoJson
#include <WebSockets2_Generic.h>  // https://github.com/khoih-prog/WebSockets2_Generic
#define DEBUG_WEBSOCKETS_PORT Serial
// Debug Level from 0 to 4
#define _WEBSOCKETS_LOGLEVEL_ 4
using namespace websockets2_generic;

WebsocketsClient ws;
WiFiManager wm;
WiFiClient client;
HTTPClient http;
HTTPClient http2;
HTTPClient http3;
ESP8266WebServer server(80);
String newHostname = "Easy2Ntfy";
String payload;
String minifiedPayload;
String minifiedPayload2;
String sendOKStr;
String toESPcommandStr;


unsigned long lastTime = 0;
unsigned long timerDelay = 10000;

unsigned long lastUpdate = 0;
unsigned long timerDelay2 = 70000;

String ESPeasyIPchanged;
const char* sendOK;
const char* toESPcommand;
unsigned long receiveTime;
bool receiveLoop = false;
bool connected = false;
bool notkilled = true;
bool doingItOnce = true;
// flag for saving data
bool shouldSaveConfig = false;
String websockeMsg;
String topic2 = "_json";  // add this to the ntfy topic to create an extra channel for receiving messages

const int ledPin = LED_BUILTIN;    // the number of the LED pin
int ledState = LOW;                // ledState used to set the LED
unsigned long previousMillis = 0;  // will store last time LED was updated
const long interval = 1000;        // interval at which to blink (milliseconds)
bool blinkLed = false;

//############################################# GET TIME #########################################

//Define NTP Client to get time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Variable to save current epoch time
unsigned long epochTime;

// Function that gets current epoch time
unsigned long getTime() {
  timeClient.update();
  unsigned long now = timeClient.getEpochTime();
  return now;
}

//############################################# CUSTOM PARAMETERS FOR THE WIFI MANAGER #########################################

//Assign output variables to GPIO pins
char* ESPeasyIP = "0.0.0.0";
char ntfyUrl[80] = "ntfy.envs.net";
char ntfyTopic[80] = "";
//char ntfyTag[80] = "1234";
//char output[2] = "5";

WiFiManagerParameter custom_ESPeasyIP("ESPeasyIP", "ESPeasyIP", ESPeasyIP, 40);
WiFiManagerParameter custom_ntfyUrl("ntfyUrl", "Url to ntfy server", ntfyUrl, 80);
WiFiManagerParameter custom_ntfyTopic("ntfyTopic", "Topic", ntfyTopic, 80);
//WiFiManagerParameter custom_ntfyTag("ntfyTag", "Shared Secret", ntfyTag, 80);

//###############################################################################################################################

//################################################### GENERAL VARIABLES #########################################################
bool blockWM = false;  // Change this to false if you want your code to continue to run on the loop void even if you are not conected to any wifi.
//###############################################################################################################################

//############################################# SETUP ##########################################
void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println("Setup mode...");
  // --------clear Wifi settings---------
  // wifiManager.resetSettings();
  //---------------------------------------
  // --------clean FS, for testing---------
  // SPIFFS.format();
  //---------------------------------------
  // read configuration from FS json
  Serial.println("mounting FS...");
  if (SPIFFS.begin()) {
    Serial.println("mounted file system");
    if (SPIFFS.exists("/config.json")) {
      // file exists, reading and loading
      Serial.println("reading config file");
      File configFile = SPIFFS.open("/config.json", "r");
      if (configFile) {
        Serial.println("opened config file");
        size_t size = configFile.size();
        // Allocate a buffer to store contents of the file.
        std::unique_ptr<char[]> buf(new char[size]);
        configFile.readBytes(buf.get(), size);
        DynamicJsonDocument json(1024);
        deserializeJson(json, buf.get(), DeserializationOption::NestingLimit(20));
        serializeJson(json, Serial);
        if (!json.isNull()) {
          Serial.println("\nparsed json");
          strcpy(ESPeasyIP, json["ESPeasyIP"]);
          strcpy(ntfyUrl, json["ntfyUrl"]);
          strcpy(ntfyTopic, json["ntfyTopic"]);
          //strcpy(ntfyTag, json["ntfyTag"]);
        } else {
          Serial.println("failed to load json config");
        }
      }
    }
  } else {
    Serial.println("failed to mount FS");
  }
  ESPeasyIPchanged = ESPeasyIP;
  //server.begin();  // declare this at the beggining of the code => ESP8266WebServer server(80);
  setupDeviceWM();

  /*while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }*/

  ws.onMessage(onMessageCallback);  // run callback when messages are received
  ws.onEvent(onEventsCallback);     // run callback when events are occuring
  // try to connect to Websockets server
  // bool connected = ws.connect("ntfy.sh", 80, "/test2323/ws");
  String receiveTopic = ntfyTopic;
  Serial.println(receiveTopic);
  bool connected = ws.connect(ntfyUrl, 80, "/" + receiveTopic + "/ws");
  if (connected) {
    Serial.println("Connected!");
    // String WS_msg = String("Hello to Server from ");
    // ws.send(WS_msg);
  } else {
    Serial.println("Not Connected!");
  }
  ws.ping();
}

//############################################# WEBSOCKETS ##########################################
void onMessageCallback(WebsocketsMessage message) {
  websockeMsg = message.data();
  Serial.println();
  Serial.println("----------------------Websockets message received---------------------");
  Serial.println(message.data());
  parseWsMessage();
}

void parseWsMessage() {
  DynamicJsonDocument Jcommand(1024);
  deserializeJson(Jcommand, websockeMsg);
  sendOK = Jcommand["title"];
  toESPcommand = Jcommand["message"];
  receiveTime = Jcommand["time"];
  Serial.print("Title:");
  Serial.println(sendOK);
  Serial.print("Message:");
  Serial.println(toESPcommand);
  Serial.print("time:");
  Serial.println(receiveTime);
  Serial.print("unix time:");
  Serial.println(getTime());
  sendOKStr = sendOK;
  toESPcommandStr = toESPcommand;

  if (sendOKStr == "send" || sendOKStr == "send1") {
    digitalWrite(ledPin, LOW);
    Serial.println("sending data...");
    receiveLoop = true;
    lastUpdate = millis();
    if (sendOKStr == "send1") {
      lastTime = millis() - (timerDelay - 1000);
      ESPeasyIPchanged = ESPeasyIP;
    }  //sending json immediately

  } else if (sendOKStr == "stop") {
    //lastUpdate = millis() - (timerDelay2 - 1000);
    receiveLoop = false;
    analogWrite(ledPin, 1000);

  } else if (sendOKStr == "change_node") {
    ESPeasyIPchanged = toESPcommandStr;
    lastTime = millis() - (timerDelay - 1000);  //sending json immediately

  } else if (sendOKStr == "kill") {
    notkilled = false;
    lastTime = millis() - (timerDelay - 1000);  //sending json immediately

  } else if (sendOKStr == "command" || sendOKStr == "dualcommand" && receiveLoop && notkilled) {
    if (abs(getTime() - receiveTime) <= 2) {
      if (sendOKStr == "command") {
        Command2ESP(toESPcommandStr);
      } else
        splitCommand(toESPcommandStr);
    } else {
      Serial.println("discarded command..took to long!!!");
    }
  }
  Serial.println("----------------------------------------------------------------------");
}

void splitCommand(const String& command) {
  int index = command.indexOf(' ');
  int length = command.length();
  String commandStr1 = command.substring(0, index);
  String commandStr2 = command.substring(index + 1, length);
  Command2ESP(commandStr1);
  //maybe we should wait a little with sending the second command
  Command2ESP(commandStr2);
  Serial.println(commandStr1);
  Serial.println(commandStr2);
}

void onEventsCallback(WebsocketsEvent event, String data) {
  (void)data;

  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("Connnection Opened");
    analogWrite(ledPin, 1000);
    blinkLed = false;
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("Connnection Closed");
    blinkLed = true;
  } else if (event == WebsocketsEvent::GotPing) {
    Serial.println("Got a Ping!");
  } else if (event == WebsocketsEvent::GotPong) {
    Serial.println("Got a Pong!");
  }
}
//#####################################################################################################

//############################################# WIFI MANAGER ##########################################
//Needs to be called only in the setup void.
void setupDeviceWM() {
  wm.setConfigPortalBlocking(blockWM);
  // wifiManager.resetSettings();
  wm.addParameter(&custom_ESPeasyIP);
  wm.addParameter(&custom_ntfyUrl);
  wm.addParameter(&custom_ntfyTopic);
  //wm.addParameter(&custom_ntfyTag);
  wm.setPreSaveConfigCallback(saveConfigCallback);
  if (wm.autoConnect("easy2ntfy", "configesp")) {
    // if you get here you have connected to the WiFi
    Serial.println("Connected to wifi network!");
    //wm.setPreSaveConfigCallback(saveConfigCallback);
    WiFi.mode(WIFI_STA);
    WiFi.hostname(newHostname.c_str());
    wm.startWebPortal();
  } else {
    Serial.println("Non blocking config portal running!");
  }
  // call the code down to activate wifi so users can configure the device, event if it's connected to the local network
  // wm.startConfigPortal("IOT_Device");
  //
  server.onNotFound(handleNotFound);
}

void handleNotFound() {
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  server.send(404, "text/plain", message);
}

// callback notifying us of the need to save config
void saveConfigCallback() {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}

// This void needs to be called in the loop void so it can handle the WM and the webportal.
void loopDeviceWM() {  
  wm.startWebPortal();
  wm.process();
  server.handleClient();
  // save the custom parameters to FS
  if (shouldSaveConfig) {
    strcpy(ESPeasyIP, custom_ESPeasyIP.getValue());
    strcpy(ntfyUrl, custom_ntfyUrl.getValue());
    strcpy(ntfyTopic, custom_ntfyTopic.getValue());
    //strcpy(ntfyTag, custom_ntfyTag.getValue());
    Serial.print("IP:");
    Serial.println(ESPeasyIP);
    Serial.print("Url:");
    Serial.println(ntfyUrl);
    Serial.print("topic:");
    Serial.println(ntfyTopic);
    //Serial.print("tag:");
    //Serial.println(ntfyTag);
    Serial.println("saving config");
    DynamicJsonDocument json(1024);
    json["ESPeasyIP"] = ESPeasyIP;
    json["ntfyUrl"] = ntfyUrl;
    json["ntfyTopic"] = ntfyTopic;
    //json["ntfyTag"] = ntfyTag;
    File configFile = SPIFFS.open("/config.json", "w");
    if (!configFile) {
      Serial.println("failed to open config file for writing");
    }
    serializeJson(json, Serial);
    serializeJson(json, configFile);
    configFile.close();
    shouldSaveConfig = false;
    ESPeasyIPchanged = ESPeasyIP;
    String receiveTopic = ntfyTopic;
    ws.connect(ntfyUrl, 80, "/" + receiveTopic + "/ws");
    // end save
  }
}

//#####################################################################################################

//############################################# LOOP ##################################################
void loop() {
  loopDeviceWM();  // necessary for WIFI MANAGER
  ws.poll();       // necessary for WEBSOCKETS

  //------------------update values of paramaters in WiFiManager--------------------------------
  wm.getParameters()[0]->setValue(ESPeasyIP, 40);
  wm.getParameters()[1]->setValue(ntfyUrl, 80);
  wm.getParameters()[2]->setValue(ntfyTopic, 80);

  //------------------LED--------------------------------
  if (blinkLed) {
    if (millis() - previousMillis >= interval) {
      // save the last time you blinked the LED
      // Serial.println("Connection issue");
      previousMillis = millis();
      String receiveTopic = ntfyTopic;
      ws.connect(ntfyUrl, 80, "/" + receiveTopic + "/ws");
      // if the LED is off turn it on and vice-versa:
      if (ledState == 900) {
        ledState = 1024;
      } else {
        ledState = 900;
      }
      // set the LED with the ledState of the variable:
      analogWrite(ledPin, ledState);
    }
  }
  //------------------timeout client--------------------------------
  if ((millis() - lastUpdate) > timerDelay2 && receiveLoop) {
    receiveLoop = false;
    ESPeasyIPchanged = ESPeasyIP;
    analogWrite(ledPin, 1000);
    Serial.println("");
    Serial.println("----------------------------------------------------------------------");
    Serial.println("client timed out...no json will be send anymore");
    Serial.print("setting IP back to:");
    Serial.println(ESPeasyIPchanged);
  }

  //------------------timer for getting JSON--------------------------------

  if ((millis() - lastTime) > timerDelay && receiveLoop) {
    GetJson();
    lastTime = millis();
  }
  //--------------------------------------------------------------
}

//################################### Command 2 ESPeasyIP ##############################################
void Command2ESP(const String& toESPcommand) {
  Serial.println();
  Serial.println("----------------------sending command to ESP...---------------------");
  String ESPeasyPath2 = ESPeasyIPchanged;
  ESPeasyPath2 = "http://" + ESPeasyPath2 + "/" + toESPcommand;
  Serial.println(ESPeasyPath2);
  http3.begin(client, ESPeasyPath2);
  // GET json from ESPeasyIP----------------------------
  int httpResponseCode = http3.GET();
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code GET: ");
    Serial.println(httpResponseCode);
    Serial.println();
    Serial.println("----------------------sending update...----------------------");
    lastTime = millis() - (timerDelay - 1000);  //sending json almost immediately
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http3.end();
}

//################################### GET json from ESPeasyIP... ###########################################
void GetJson() {
  Serial.println();
  Serial.println("----------------------getting JSON from ESP...----------------------");
  String ESPeasyPath = ESPeasyIPchanged;
  Serial.println(ESPeasyIPchanged);
  ESPeasyPath = "http://" + ESPeasyPath + "/json";
  // http.begin(client, ESPeasyPath);

  // Send request
  http.useHTTP10(true);
  http.begin(client, ESPeasyPath);
  http.GET();

  // Parse response
  DynamicJsonDocument filter(3500);
  filter["Sensors"][0]["TaskValues"][0]["ValueNumber"] = true;
  filter["Sensors"][0]["TaskValues"][0]["Value"] = true;
  filter["Sensors"][0]["TaskValues"][0]["NrDecimals"] = true;
  filter["Sensors"][0]["TaskValues"][0]["Name"] = true;
  filter["Sensors"][0]["TaskEnabled"] = true;
  filter["Sensors"][0]["TaskNumber"] = true;
  filter["Sensors"][0]["Type"] = true;
  filter["Sensors"][0]["TaskDeviceNumber"] = true;
  filter["Sensors"][0]["TaskName"] = true;
  filter["Sensors"][0]["TaskDeviceGPIO1"] = true;
  filter["nodes"][0]["ip"] = true;
  filter["nodes"][0]["nr"] = true;
  filter["nodes"][0]["name"] = true;
  filter["WiFi"]["IP Address"] = true;
  filter["WiFi"]["RSSI"] = true;
  filter["WiFi"]["Hostname"] = true;
  filter["System"]["Hostname"] = true;
  filter["System"]["Local Time"] = true;
  filter["System"]["Uptime"] = true;
  filter["System"]["Free RAM"] = true;
  filter["System"]["Free Stack"] = true;
  filter["System"]["Build"] = true;
  filter["System"]["CPU Eco Mode"] = true;
  filter["System"]["Unit Number"] = true;
  filter["System"]["Load"] = true;

  DynamicJsonDocument doc(20000);

  // deserializeJson(doc, http.getStream());
  http.setTimeout(2000);
  DeserializationError error = deserializeJson(doc, http.getStream(), DeserializationOption::Filter(filter));
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    if (strcmp_P("EmptyInput", error.f_str()) == 0 || strcmp_P("IncompleteInput", error.f_str()) == 0) {
      ESPeasyIPchanged = ESPeasyIP;
      Serial.println("problems with getting json from ESPeasy node");
      Serial.print("trying again...");
      http.end();
      GetJson();
      //Serial.print("setting IP back to:");
      //Serial.println(ESPeasyIPchanged);
    }
    return;
  } else {
    // Disconnect
    http.end();
    serializeJson(doc, minifiedPayload);
    PostToNtfy();
  }
}

//################################## ...and POST it to Ntfy ##################################################
void PostToNtfy() {
  Serial.println();
  Serial.println("----------------------...sending JSON to client----------------------");
  String ntfyUrlStr = ntfyUrl;
  String ntfyTopicStr = ntfyTopic;
  ntfyUrlStr = "http://" + ntfyUrlStr + "/" + ntfyTopicStr + topic2;

  if (minifiedPayload.isEmpty()) {
    Serial.println("payload empty");
  } else {
    if (!notkilled && doingItOnce) {
      minifiedPayload = "killed";
      doingItOnce = false;
    }
    Serial.println(ntfyUrlStr);
    http2.begin(client, ntfyUrlStr);
    http2.addHeader("Content-Type", "application/json");
    if (!notkilled && !doingItOnce) { http2.addHeader("Title", "readonly"); }
    http2.addHeader("Tags", "json");
    http2.addHeader("Cache", "no");
    int httpResponseCode2 = http2.POST(minifiedPayload);
    minifiedPayload = "";
    Serial.print("HTTP Response code POST: ");
    Serial.println(httpResponseCode2);
    // some issues with receiving json from a node
    // cause post to fail constantly with -2 or -5 error
    if (httpResponseCode2 <= 0) {}
    http2.end();
  }
}
