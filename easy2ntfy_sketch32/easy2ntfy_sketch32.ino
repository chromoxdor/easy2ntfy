// Required Libraries
#include <FS.h>  // Needs to be included first to avoid crashes
#include <SPIFFS.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h>          // WiFi Manager: https://github.com/tzapu/WiFiManager
#include <ArduinoJson.h>          // JSON Handling: https://github.com/bblanchon/ArduinoJson
#include <WebSockets2_Generic.h>  // WebSocket Library: https://github.com/khoih-prog/WebSockets2_Generic
#include <base64.h>
#include "minilzo.h"  // MiniLZO Compression: https://www.oberhumer.com/opensource/lzo/

// Compression Parameters
#define WORK_MEM_SIZE (LZO1X_1_MEM_COMPRESS)                                      // Compression working memory size
#define INPUT_BUFFER_SIZE 20000                                                   // Input buffer size
#define OUTPUT_BUFFER_SIZE (INPUT_BUFFER_SIZE + INPUT_BUFFER_SIZE / 16 + 64 + 3)  // Output buffer size

// Working memory for MiniLZO
static uint8_t workMem[WORK_MEM_SIZE];
lzo_uint compressedSize;
// Buffers for Compression and Decompression
#ifdef CONFIG_IDF_TARGET_ESP32
#pragma message("Compiling for ESP32 Classic")
uint8_t* inputBuffer = (uint8_t*)malloc(INPUT_BUFFER_SIZE);
uint8_t* compressedBuffer = (uint8_t*)malloc(OUTPUT_BUFFER_SIZE);
#else
#pragma message("Compiling for other ESP32 Variants")
uint8_t inputBuffer[INPUT_BUFFER_SIZE];
uint8_t compressedBuffer[OUTPUT_BUFFER_SIZE];
#endif

// Debugging Settings for WebSockets
#define DEBUG_WEBSOCKETS_PORT Serial  // Set debug port
#define _WEBSOCKETS_LOGLEVEL_ 4       // Debug Level (0 to 4)

// Using WebSockets2_Generic Namespace
using namespace websockets2_generic;

// WebSocket and Network Components
WebsocketsClient ws;
WiFiManager wm;
WiFiClient client;
HTTPClient http;
WebServer server(80);

// General Variables
const char* newHostname = "Easy2Ntfy";
String minifiedPayload;
String hexString;
String sendOKStr;
String toESPcommandStr;

// Timing Variables
uint32_t heartbeatTime = 0;
uint32_t previous_time = 0;
uint32_t lastTime = 0;
uint32_t timerDelay = 10000;
uint32_t lastUpdate = 0;
uint32_t timerDelay2 = 70000;

// Miscellaneous Variables
String ESPeasyIPchanged;
const char* sendOK;
const char* toESPcommand;
uint32_t receiveTime;
bool receiveLoop = false;
bool connected = false;
bool notkilled = true;
bool doingItOnce = true;

// Flag for Saving Data
bool shouldSaveConfig = false;

// WebSocket Messages
String websockeMsg;
String topic2 = "_json";  // Add this to the ntfy topic to create an extra channel for receiving messages

// LED Variables
const int ledPin = 8;         // LED pin number
int ledState = LOW;           // LED state
uint32_t previousMillis = 0;  // Last time LED was updated
const long interval = 1000;   // Blink interval (milliseconds)
bool blinkLed = false;

//############################################# GET TIME #########################################

// NTP Client to Get Time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Variable to Save Current Epoch Time
uint32_t epochTime;

// Function to Get Current Epoch Time
uint32_t getTime() {
  timeClient.update();
  uint32_t now = timeClient.getEpochTime();
  return now;
}

//############################################# CUSTOM PARAMETERS FOR THE WIFI MANAGER #########################################

// Assign Output Variables to GPIO Pins
char ESPeasyIP[16] = "0.0.0.0";
char ntfyUrl[80] = "ntfy.envs.net";
char ntfyTopic[80] = "";
//char ntfyTag[80] = "1234";
//char output[2] = "5";

// WiFiManager Custom Parameters
WiFiManagerParameter custom_ESPeasyIP("ESPeasyIP", "ESPeasyIP", ESPeasyIP, 40);
WiFiManagerParameter custom_ntfyUrl("ntfyUrl", "Url to ntfy server", ntfyUrl, 80);
WiFiManagerParameter custom_ntfyTopic("ntfyTopic", "Topic", ntfyTopic, 80);
//WiFiManagerParameter custom_ntfyTag("ntfyTag", "Shared Secret", ntfyTag, 80);

//###############################################################################################################################

//################################################### GENERAL VARIABLES #########################################################

// Block WiFi Manager Loop Behavior
bool blockWM = false;  // Set to false to continue code execution even without WiFi connection

//###############################################################################################################################

//############################################# SETUP ##########################################
void setup() {
  // Initialize Serial Communication
  Serial.begin(115200);
  delay(3000);  // Wait for 3 seconds
  Serial.println("Setup mode...");

  // Initialize LED pin
  pinMode(ledPin, OUTPUT);
  analogWriteResolution(10);  // Set analog write resolution to 10 bits

  // Initialize LZO Compression
  if (lzo_init() != LZO_E_OK) {
    Serial.println("LZO initialization failed!");
    while (1)
      ;  // Halt execution if initialization fails
  }
  Serial.println("LZO initialized successfully.");

  // Mount the SPIFFS file system and load configuration
  Serial.println("Mounting file system...");
  if (SPIFFS.begin()) {
    Serial.println("File system mounted");

    // Check if configuration file exists
    if (SPIFFS.exists("/config.json")) {
      Serial.println("Reading config file...");
      File configFile = SPIFFS.open("/config.json", "r");

      if (configFile) {
        Serial.println("Opened config file");

        // Read the contents of the config file
        size_t size = configFile.size();
        std::unique_ptr<char[]> buf(new char[size]);
        configFile.readBytes(buf.get(), size);

        // Parse JSON configuration
        DynamicJsonDocument json(1024);
        DeserializationError error = deserializeJson(json, buf.get(), DeserializationOption::NestingLimit(20));

        if (error) {
          Serial.println("Failed to parse config JSON");
        } else {
          // Print and load configuration values
          serializeJson(json, Serial);
          strcpy(ESPeasyIP, json["ESPeasyIP"]);
          strcpy(ntfyUrl, json["ntfyUrl"]);
          strcpy(ntfyTopic, json["ntfyTopic"]);
          //strcpy(ntfyTag, json["ntfyTag"]);
          Serial.println("\nConfiguration loaded successfully.");
        }
      } else {
        Serial.println("Failed to open config file");
      }
    } else {
      Serial.println("Config file does not exist");
    }
  } else {
    // Handle file system mount failure
    Serial.println("Failed to mount file system, formatting...");
    SPIFFS.format();
  }

  // Store current IP address in a string
  ESPeasyIPchanged = ESPeasyIP;

  // Initialize WebSockets
  setupDeviceWM();  // Custom WiFiManager setup

  // Connect to WebSocket server
  String receiveTopic = ntfyTopic;
  Serial.println("Connecting to WebSocket on topic: " + receiveTopic);

  ws.onMessage(onMessageCallback);  // Set up message handler callback
  ws.onEvent(onEventsCallback);     // Set up event handler callback

  bool connected = ws.connect(ntfyUrl, 80, "/" + receiveTopic + "/ws");
  if (connected) {
    Serial.println("WebSocket Connected!");
    // Optionally send a message after connecting
    // String WS_msg = String("Hello to Server from ");
    // ws.send(WS_msg);
  } else {
    Serial.println("WebSocket Connection Failed!");
  }

  // Send WebSocket Ping
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
  // Create a JSON document to hold the parsed message
  DynamicJsonDocument Jcommand(1024);

  // Deserialize the WebSocket message into the JSON document
  deserializeJson(Jcommand, websockeMsg);

  // Extract relevant fields from the JSON message
  sendOK = Jcommand["title"];
  toESPcommand = Jcommand["message"];
  receiveTime = Jcommand["time"];

  // Print extracted values for debugging
  Serial.print("Title: ");
  Serial.println(sendOK);
  Serial.print("Message: ");
  Serial.println(toESPcommand);
  Serial.print("Time: ");
  Serial.println(receiveTime);
  Serial.print("Unix Time: ");
  Serial.println(getTime());

  // Store values as strings for easier comparison
  sendOKStr = sendOK;
  toESPcommandStr = toESPcommand;

  // Check if the message is a "send" command
  if (sendOKStr.indexOf("send") != -1) {
    analogWrite(ledPin, 0);  // Turn off the LED
    Serial.println("Sending data...");
    receiveLoop = true;
    lastUpdate = millis();

    // Handle specific send commands
    if (sendOKStr == "send1") {
      lastTime = millis() - (timerDelay - 1000);  // Send JSON immediately
      ESPeasyIPchanged = ESPeasyIP;               // Set default IP
    } else if (sendOKStr == "send2") {
      lastTime = millis() - (timerDelay - 1000);  // Send JSON immediately
    }

  } else if (sendOKStr == "stop") {
    // Stop sending data and turn on the LED
    receiveLoop = false;
    analogWrite(ledPin, 1000);  // Turn on the LED

  } else if (sendOKStr == "change_node") {
    // Change the node IP address
    Serial.println("Changing node...");
    ESPeasyIPchanged = toESPcommandStr;
    lastTime = millis() - (timerDelay - 1000);  // Send JSON immediately

  } else if (sendOKStr == "kill") {
    // Handle the kill command
    notkilled = false;
    GetJson();  // Retrieve JSON
    lastTime = millis();

  } else if ((sendOKStr == "command" || sendOKStr == "dualcommand") && receiveLoop && notkilled) {
    // Handle command or dualcommand if conditions are met
    Serial.print("Time deviation: ");
    long timeDeviation = abs(static_cast<long>(getTime()) - static_cast<long>(receiveTime));
    Serial.println(timeDeviation);

    // If the time deviation is acceptable, execute the command
    if (timeDeviation <= 2) {
      if (sendOKStr == "command") {
        Command2ESP(toESPcommandStr);  // Send single command to ESP
      } else {
        splitCommand(toESPcommandStr);  // Split and execute dual command
      }
    } else {
      Serial.println("Command discarded. Took too long!");
    }
  }

  // Print readonly status for debugging
  Serial.print("Readonly: ");
  Serial.println(!notkilled);

  // Print separator for debugging
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
  WiFi.setHostname(newHostname);
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
  // Necessary for WiFi Manager to handle WiFi connection management
  loopDeviceWM();

  // Check for WiFi connection every 30 seconds
  if (WiFi.status() != WL_CONNECTED && (millis() - previous_time >= 30000)) {
    Serial.println("Reconnecting to WiFi network");
    WiFi.reconnect();
    previous_time = millis();  // Update the previous time for reconnection
  }

  // WebSockets - Poll for incoming messages if available
  if (ws.available()) {
    ws.poll();  // Necessary to process incoming WebSocket messages

    // Send heartbeat every 60 seconds to keep the connection alive
    if (millis() - heartbeatTime >= 60000) {
      Serial.println("Sending heartbeat");
      heartbeatTime = millis();  // Update the last heartbeat time
      ws.send("H");              // Send heartbeat message
    }
  }

  //------------------update values of paramaters in WiFiManager--------------------------------
  wm.getParameters()[0]->setValue(ESPeasyIP, 40);
  wm.getParameters()[1]->setValue(ntfyUrl, 80);
  wm.getParameters()[2]->setValue(ntfyTopic, 80);

  //------------------LED--------------------------------
  // Handle LED blinking if there's a connection issue (blinkLed is true)
  if (blinkLed) {
    if (millis() - previousMillis >= interval) {
      previousMillis = millis();  // Update the previous time of LED blink

      // Attempt to reconnect WebSocket if LED is blinking
      String receiveTopic = ntfyTopic;
      if (!ws.connect(ntfyUrl, 80, "/" + receiveTopic + "/ws")) {
        Serial.println("Failed to reconnect WebSocket");
      }

      // Toggle LED state (blink LED on/off)
      ledState = (ledState == 900) ? 1024 : 900;  // Alternate between two states
      analogWrite(ledPin, ledState);              // Update LED state
    }
  }

  //------------------timeout client--------------------------------
  if ((millis() - lastUpdate) > timerDelay2 && receiveLoop) {
    receiveLoop = false;
    ESPeasyIPchanged = ESPeasyIP;  // Save current IP to revert later
    analogWrite(ledPin, 1000);     // Turn on the LED indicating timeout
    Serial.println("----------------------------------------------------------------------");
    Serial.println("Client timed out. No more JSON will be sent.");
    Serial.print("Setting IP back to: ");
    Serial.println(ESPeasyIPchanged);  // Show the reverted IP
  }

  //------------------timer for getting JSON--------------------------------
  // Timer for fetching new JSON data: Runs every `timerDelay`
  if ((millis() - lastTime) > timerDelay && receiveLoop) {
    GetJson();            // Function to get JSON data
    lastTime = millis();  // Update the last time JSON was fetched
  }

  //--------------------------------------------------------------
}

//################################### Command 2 ESPeasyIP ##############################################
void Command2ESP(const String& toESPcommand) {
  Serial.println();
  Serial.println("----------------------sending command to ESP...---------------------");
  String ESPeasyPath2 = "http://" + ESPeasyIPchanged + "/" + toESPcommand;
  Serial.println(ESPeasyPath2);
  http.begin(client, ESPeasyPath2);
  // GET json from ESPeasyIP----------------------------
  int httpResponseCode = http.GET();
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
  http.end();
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
    // Handle JSON deserialization errors
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());

    // Special case for EmptyInput or IncompleteInput errors, retry the request
    if (strcmp_P("EmptyInput", reinterpret_cast<const char*>(error.f_str())) == 0 || strcmp_P("IncompleteInput", reinterpret_cast<const char*>(error.f_str())) == 0) {
      ESPeasyIPchanged = ESPeasyIP;  // Reset the IP address
      Serial.println("Problems with getting JSON from ESPeasy node. Retrying...");
      http.end();                                 // Close the HTTP connection
      lastTime = millis() - (timerDelay - 2000);  // Adjust the lastTime to retry soon
    }
    return;
  }

  // Disconnect
  http.end();
  serializeJson(doc, minifiedPayload);

  if (minifiedPayload.isEmpty() || minifiedPayload == "null") {
    Serial.println("payload empty");
    minifiedPayload = "";
  } else {
    if (!notkilled && doingItOnce) {
      minifiedPayload = "killed";
      doingItOnce = false;
    }
    //------------------compression section--------------------------------
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
      // for (int i = 0; i < compressedSize; i++) {
      //   Serial.print(compressedBuffer[i]);  // Print as decimal
      //   Serial.print(" ");
      // }
      // Serial.println();  // Print new line after the array
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

  String ntfyUrlStr = "http://" + String(ntfyUrl) + "/" + String(ntfyTopic) + topic2;
  Serial.println(ntfyUrlStr);

  http.begin(client, ntfyUrlStr);
  http.addHeader("Content-Type", "application/json");

  if (!notkilled && !doingItOnce) {
    http.addHeader("Title", "readonly");
  }

  http.addHeader("Tags", "json");
  http.addHeader("Cache", "no");

  String base64Encoded = base64::encode(compressedBuffer, compressedSize);

  int httpResponseCode2 = http.POST(base64Encoded);
  minifiedPayload = "";

  Serial.print("HTTP Response code POST: ");
  Serial.println(httpResponseCode2);

  if (httpResponseCode2 == 200) {
    timerDelay = 10000;
  } else if (httpResponseCode2 == 429) {
    timerDelay = 60000;
  }

  http.end();
}
