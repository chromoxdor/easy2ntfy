
#include <FS.h>  //this needs to be first, or it all crashes and burns...
#include <SPIFFS.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h>          // https://github.com/tzapu/WiFiManager
#include <ArduinoJson.h>          // https://github.com/bblanchon/ArduinoJson
#include <WebSockets2_Generic.h>  // https://github.com/khoih-prog/WebSockets2_Generic
#include <base64.h>


#include "minilzo.h"              // https://www.oberhumer.com/opensource/lzo/
lzo_uint compressedSize;
// Define compression working memory size
#define WORK_MEM_SIZE (LZO1X_1_MEM_COMPRESS)
// Define input and output buffer sizes
#define INPUT_BUFFER_SIZE 20000
#define OUTPUT_BUFFER_SIZE (INPUT_BUFFER_SIZE + INPUT_BUFFER_SIZE / 16 + 64 + 3)

// Working memory for MiniLZO
static uint8_t workMem[WORK_MEM_SIZE];

// Buffers for compression and decompression
uint8_t inputBuffer[INPUT_BUFFER_SIZE];
uint8_t compressedBuffer[OUTPUT_BUFFER_SIZE];
uint8_t decompressedBuffer[INPUT_BUFFER_SIZE];


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
WebServer server(80);
String newHostname = "Easy2Ntfy";
//String payload;
String minifiedPayload;
String hexString;
//String minifiedPayload2;
String sendOKStr;
String toESPcommandStr;


uint32_t heartbeatTime = 0;

uint32_t previous_time = 0;

uint32_t lastTime = 0;
uint32_t timerDelay = 10000;

uint32_t lastUpdate = 0;
uint32_t timerDelay2 = 70000;

String ESPeasyIPchanged;
const char* sendOK;
const char* toESPcommand;
uint32_t receiveTime;
bool receiveLoop = false;
bool connected = false;
bool notkilled = true;
bool doingItOnce = true;
// flag for saving data
bool shouldSaveConfig = false;
String websockeMsg;
String topic2 = "_json";  // add this to the ntfy topic to create an extra channel for receiving messages

const int ledPin = 8;         // the number of the LED pin
int ledState = LOW;           // ledState used to set the LED
uint32_t previousMillis = 0;  // will store last time LED was updated
const long interval = 1000;   // interval at which to blink (milliseconds)
bool blinkLed = false;

//############################################# GET TIME #########################################

//Define NTP Client to get time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Variable to save current epoch time
uint32_t epochTime;

// Function that gets current epoch time
uint32_t getTime() {
  timeClient.update();
  uint32_t now = timeClient.getEpochTime();
  return now;
}

//############################################# CUSTOM PARAMETERS FOR THE WIFI MANAGER #########################################

//Assign output variables to GPIO pins
char ESPeasyIP[16] = "0.0.0.0";
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
  //analogWriteRange(1023); //needs to set after release 3.0 otherwise Arduino core default is 256
  Serial.begin(115200);
  delay(3000);
  Serial.println("Setup mode...");
  pinMode(ledPin, OUTPUT);
  analogWriteResolution(10);
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
  //Serial.println(sendOKStr.indexOf("send"));

  if (sendOKStr.indexOf("send") != -1) {
    analogWrite(ledPin, 0);
    Serial.println("sending data...");
    receiveLoop = true;
    lastUpdate = millis();
    if (sendOKStr == "send1") {
      lastTime = millis() - (timerDelay - 1000);
      ESPeasyIPchanged = ESPeasyIP;
    }  //sending json immediately and set ip to default
    else if (sendOKStr == "send2") {
      lastTime = millis() - (timerDelay - 1000);
    }  //sending json immediately

  } else if (sendOKStr == "stop") {
    //lastUpdate = millis() - (timerDelay2 - 1000);
    receiveLoop = false;
    analogWrite(ledPin, 1000);

  } else if (sendOKStr == "change_node") {
    Serial.println("changing node...");
    ESPeasyIPchanged = toESPcommandStr;
    lastTime = millis() - (timerDelay - 1000);  //sending json immediately

  } else if (sendOKStr == "kill") {
    notkilled = false;
    //lastTime = millis() - (timerDelay - 1000);  //sending json immediately
    GetJson();
    lastTime = millis();

  } else if ((sendOKStr == "command" || sendOKStr == "dualcommand") && receiveLoop && notkilled) {
    Serial.print("time deviation: ");
    Serial.println(abs(static_cast<long>(getTime()) - static_cast<long>(receiveTime)));
    if (abs(static_cast<long>(getTime()) - static_cast<long>(receiveTime)) <= 2) {
      if (sendOKStr == "command") {
        Command2ESP(toESPcommandStr);
      } else
        splitCommand(toESPcommandStr);
    } else {
      Serial.println("discarded command..took to long!!!");
    }
  }
  Serial.print("readonly:");
  Serial.println(!notkilled);
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
    Serial.println("inital heartbeat");
    ws.send("H");
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

  // checking for WIFI connection
  if ((WiFi.status() != WL_CONNECTED) && (millis() - previous_time >= 30000)) {
    Serial.println("Reconnecting to WIFI network");
    WiFi.reconnect();
    previous_time = millis();
  }

  // let the websockets client check for incoming messages
  if (ws.available()) {
    ws.poll();  // necessary for WEBSOCKETS

    // Send heartbeat in order to avoid disconnections during ISP resetting IPs over night.
    if ((millis() - heartbeatTime) > 60000) {
      Serial.println("heartbeat");
      heartbeatTime = millis();
      ws.send("H");
    }
  }
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
  String ESPeasyPath2 = "http://" + ESPeasyIPchanged + "/" + toESPcommand;
  Serial.println(ESPeasyPath2);
  http3.begin(client, ESPeasyPath2);
  // GET json from ESPeasyIP----------------------------
  int httpResponseCode = http3.GET();
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code GET: ");
    Serial.println(httpResponseCode);
    Serial.println();
    Serial.println("----------------------sending update...----------------------");
    lastTime = millis() - (timerDelay - 1000);  //sending json almost immediately after the last command is received
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
  Serial.println(ESPeasyIPchanged);
  //String ESPeasyPath = "http://" + ESPeasyIPchanged + "/json";

  // Send request
  http.useHTTP10(true);
  http.begin(client, "http://" + ESPeasyIPchanged + "/json");
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
    //if (strcmp_P("EmptyInput", error.f_str()) == 0 || strcmp_P("IncompleteInput", error.f_str()) == 0) {
    if (strcmp_P("EmptyInput", reinterpret_cast<const char*>(error.f_str())) == 0 || strcmp_P("IncompleteInput", reinterpret_cast<const char*>(error.f_str())) == 0) {
      ESPeasyIPchanged = ESPeasyIP;
      Serial.println("problems with getting json from ESPeasy node");
      Serial.print("trying again...");
      http.end();
      lastTime = millis() - (timerDelay - 2000);
      //Serial.print("setting IP back to:");
      //Serial.println(ESPeasyIPchanged);
    }
    return;
  } else {
    // Disconnect
    http.end();
    serializeJson(doc, minifiedPayload);

//----------------- ...compression... ------------------

    if (lzo_init() != LZO_E_OK) {
      Serial.println("LZO initialization failed!");
      while (1)
        ;  // Halt execution
    }
    Serial.println("LZO initialized successfully.");

    // Example input string
    String inputData = "This is an example input string for compression using MiniLZO.";
    size_t inputSize = minifiedPayload.length();

    // Copy input data to buffer
    memcpy(inputBuffer, minifiedPayload.c_str(), inputSize);

    // Compress the input data
    compressedSize = 0;
    int compressResult = lzo1x_1_compress(
      inputBuffer, inputSize,             // Input data and size
      compressedBuffer, &compressedSize,  // Output buffer and compressed size
      workMem                             // Working memory
    );

    if (compressResult == LZO_E_OK) {
      Serial.println("Compression successful!");
      Serial.println("Original size: " + String(inputSize));
      Serial.println("Compressed size: " + String(compressedSize));
      for (int i = 0; i < compressedSize; i++) {
        Serial.print(compressedBuffer[i]);  // Print as decimal
        Serial.print(" ");
      }
      Serial.println();  // Print new line after the array
    } else {
      Serial.println("Compression failed!");
    }
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

  if (minifiedPayload.isEmpty() || minifiedPayload == "null") {
    Serial.println("payload empty");
    minifiedPayload = "";
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

    
    String base64Encoded = base64::encode(compressedBuffer, compressedSize);
    //Serial.println(base64Encoded);
    

    int httpResponseCode2 = http2.POST(base64Encoded);
    minifiedPayload = "";
    Serial.print("HTTP Response code POST: ");
    Serial.println(httpResponseCode2);
    if (httpResponseCode2 == 200) {
      timerDelay = 10000;
    } else if (httpResponseCode2 == 429) {
      timerDelay = 60000;
    }
    http2.end();
  }
}
