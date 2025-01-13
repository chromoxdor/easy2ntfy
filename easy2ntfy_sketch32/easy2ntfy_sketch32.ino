
// Required Libraries
#define ESP2NTFY_VERSION "v1.0"
#include <FS.h>  // Needs to be included first to avoid crashes
#include <AESLib.h>
#include <SPIFFS.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h>       // WiFi Manager [2.0.17]: https://github.com/tzapu/WiFiManager
#include <ArduinoJson.h>       // [7.3.0] JSON Handling: https://github.com/bblanchon/ArduinoJson
#include <WebSocketsClient.h>  // [2.6.1] https://github.com/Links2004/arduinoWebSockets
#include <base64.h>
#include <minilzo.h>  //MiniLZO [2.10] Compression: https://www.oberhumer.com/opensource/lzo/


#include "esp_system.h"
#include "esp_task_wdt.h"

AESLib aesLib;
AESLib aesLib2;
byte aes_key[16];
byte aes_iv[16];
byte aes_iv2[16];

// Compression Parameters
#define WORK_MEM_SIZE (LZO1X_1_MEM_COMPRESS)  // Compression working memory size
#define INPUT_BUFFER_SIZE 15000               // Input buffer size
#define OUTPUT_BUFFER_SIZE 4500               //(INPUT_BUFFER_SIZE + INPUT_BUFFER_SIZE / 16 + 64 + 3)  // Output buffer size \
                                              // from ntfy docs: 	Each message can be up to 4,096 bytes long. Longer messages are treated as attachments.


uint8_t inputBuffer[INPUT_BUFFER_SIZE];
uint8_t compressedBuffer[OUTPUT_BUFFER_SIZE];  //This buffer is used for receiving data and for copmpressed data

#define ESP_BOARD "untested!"  // Default value

#ifdef CONFIG_IDF_TARGET_ESP32
#define ESP_BOARD "32Classic"
#pragma message("Compiling for ESP32 Classic")
uint8_t* workMem = nullptr;  // Pointer to the memory on the heap

#elif defined(CONFIG_IDF_TARGET_ESP32C3)
#define ESP_BOARD "32C3"
#pragma message("Compiling for ESP32 C3")

#elif defined(CONFIG_IDF_TARGET_ESP32S3)
#define ESP_BOARD "32S3"
#pragma message("Compiling for ESP32 S3")

#else
#pragma message("!!!!Compiling for an untested MCU!!! This can cause issues. Make sure you test with serial connection for debugging :)")
#endif

// Declare static workMem only for supported ESP32 variants
#if defined(CONFIG_IDF_TARGET_ESP32C3) || defined(CONFIG_IDF_TARGET_ESP32S3)
static uint8_t workMem[WORK_MEM_SIZE];  // Working memory for MiniLZO
#endif

// WebSocket and Network Components
WebSocketsClient webSocket;
WiFiManager wm;
WiFiClient client;
HTTPClient http;
WebServer server(80);

// General Variables
const char* newHostname = "Easy2Ntfy32AES";
String minifiedPayload;
String hexString;

// Timing Variables
uint32_t heartbeatTime = 0;
uint32_t previous_time = 0;
uint32_t lastTime = 0;
uint32_t timerDelay = 10000;
uint32_t lastUpdate = 0;
uint32_t timerDelay2 = 70000;

// Miscellaneous Variables
String ESPeasyIPchanged;
bool receiveLoop = false;
bool connectedToWS = false;
bool notkilled = true;
bool doingItOnce = true;
bool wasConnected = false;
StaticJsonDocument<1024> Jcommand;

// Flag for Saving Data
bool shouldSaveConfig = false;

// WebSocket Messages
String topic2 = "_json";  // Add this to the ntfy topic to create an extra channel for receiving messages

// LED Variables
int ledPin = 2;               // LED pin
bool invert = true;           // Set to true if the LED is active LOW
int ledState = LOW;           // LED state
uint32_t previousMillis = 0;  // Last time LED was updated
const long interval = 1000;   // Blink interval (milliseconds)
bool blinkLed = false;
String receiveTopic;

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

char ESPeasyIP[16] = "0.0.0.0";
char ntfyUrl[80] = "ntfy.envs.net";
char ntfyTopic[80] = "";
char ledPinStr[4] = "2";
char passWord[17] = "1234567890abcdef";

const char* version = "<p align=\"right\"><small>EASY2NTFY_" ESP_BOARD " " ESP2NTFY_VERSION "</small></p>";
//const char* version = "<p align=\"right\"><small>EASY2NTFY:" ESP2NTFY_VERSION "</small></p>";
char customHtml_checkbox_inverted[70] = "type=\"number\" min=\"0\" max=\"1\" step=\"1\" style=\"width: 5ch;\"";
char customHtml_checkbox_password[70] = "type=\"password\" maxlength=\"16\" placeholder=\"****************\"";

// WiFiManager Custom Parameters
WiFiManagerParameter custom_ESPeasyIP("ESPeasyIP", "ESPeasyIP", ESPeasyIP, 40);
WiFiManagerParameter custom_ntfyUrl("ntfyUrl", "URL to ntfy server", ntfyUrl, 80);
WiFiManagerParameter custom_ntfyTopic("ntfyTopic", "Topic", ntfyTopic, 80);
WiFiManagerParameter custom_passWord("passWord", "Password", passWord, 17, customHtml_checkbox_password);
WiFiManagerParameter custom_ledPinStr("ledPinStr", "LED pin", ledPinStr, 4);  // Use the char array
//WiFiManagerParameter custom_inverted_checkbox("invert", "Invert the LED", invertValue, 2, customHtml_checkbox_inverted, WFM_LABEL_AFTER);
WiFiManagerParameter custom_inverted_checkbox("invert", "Invert LED (0=default 1=inverted)", invert ? "1" : "0", 2, customHtml_checkbox_inverted);
WiFiManagerParameter custom_text(version);

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
  //delay(3000);  // Wait for 3 seconds
  //Serial.print(F("Version: EASY2NTFY_"));
  Serial.println(ESP_BOARD " " ESP2NTFY_VERSION);
  Serial.println();
  Serial.println(F("Setup mode..."));

  convertPassphraseToKey(passWord, aes_key);
  aes_init();
  // Initialize LED pin
  pinMode(ledPin, OUTPUT);
  //analogWriteResolution(10);  // Set analog write resolution to 10 bits

  // Initialize LZO Compression
  if (lzo_init() != LZO_E_OK) {
    Serial.println(F("LZO initialization failed!"));
    while (1)
      ;  // Halt execution if initialization fails
  }
  Serial.println(F("LZO initialized successfully."));

  // Mount the SPIFFS file system and load configuration
  Serial.println(F("Mounting file system..."));
  if (SPIFFS.begin()) {
    Serial.println(F("File system mounted"));

    // Check if configuration file exists
    if (SPIFFS.exists("/config.json")) {
      Serial.println(F("Reading config file..."));
      File configFile = SPIFFS.open("/config.json", "r");

      if (configFile) {
        Serial.println(F("Opened config file"));

        // Read the contents of the config file
        size_t size = configFile.size();
        std::unique_ptr<char[]> buf(new char[size]);
        configFile.readBytes(buf.get(), size);

        // Parse JSON configuration
        DynamicJsonDocument json(1024);

        DeserializationError error = deserializeJson(json, buf.get(), DeserializationOption::NestingLimit(2));

        if (error) {
          Serial.println(F("Failed to parse config JSON"));
        } else {
          // Print and load configuration values
          serializeJson(json, Serial);

          // Validate and extract ESPeasyIP
          if (json.containsKey("ESPeasyIP")) {
            strcpy(ESPeasyIP, json["ESPeasyIP"]);
          } else {
            Serial.println(F("Missing field: ESPeasyIP"));
          }

          // Validate and extract ntfyUrl
          if (json.containsKey("ntfyUrl")) {
            strcpy(ntfyUrl, json["ntfyUrl"]);
          } else {
            Serial.println(F("Missing field: ntfyUrl"));
          }

          // Validate and extract ntfyTopic
          if (json.containsKey("ntfyTopic")) {
            strcpy(ntfyTopic, json["ntfyTopic"]);
          } else {
            Serial.println(F("Missing field: ntfyTopic"));
          }

          // Validate and extract passWord
          if (json.containsKey("passWord")) {
            strcpy(passWord, json["passWord"]);
            convertPassphraseToKey(passWord, aes_key);
          } else {
            Serial.println(F("Missing field: passWord"));
          }


          //Validate and extract ledPin
          if (json.containsKey("ledPinStr")) {
            strcpy(ledPinStr, json["ledPinStr"]);
            ledPin = atoi(ledPinStr);
            if (ledPin == 0 && strcmp(ledPinStr, "0") != 0) {
              Serial.println(F("Invalid LED pin value"));
            }
          } else {
            Serial.println(F("Missing field: ledPinStr"));
          }

          if (json.containsKey("invert")) {
            invert = (strcmp(json["invert"], "1") == 0);
          } else {
            // If the key doesn't exist or is invalid, set a default
            invert = false;  // Default to false if the key doesn't exist or is invalid
          }

          Serial.println();
          Serial.print(F("IP:"));
          Serial.println(ESPeasyIP);
          Serial.print(F("Url:"));
          Serial.println(ntfyUrl);
          Serial.print(F("Topic:"));
          Serial.println(ntfyTopic);
          Serial.print(F("Password:"));
          Serial.println(passWord);
          Serial.print(F("LEDPin:"));
          Serial.println(ledPinStr);
          Serial.print(F("InvertedLED?:"));
          Serial.println(invert);

          Serial.println(F("\nConfiguration loaded successfully."));
        }
      } else {
        Serial.println(F("Failed to open config file"));
      }
    } else {
      Serial.println(F("Config file does not exist"));
    }
  } else {
    // Handle file system mount failure
    Serial.println(F("Failed to mount file system, formatting..."));
#if defined(CONFIG_IDF_TARGET_ESP32) || defined(CONFIG_IDF_TARGET_ESP32S3)
    //workaround for "esp_task_wdt_reset" on esp32 classic and s3 since formatting takes too long
    esp_task_wdt_config_t config = {
      .timeout_ms = 60000,
      .trigger_panic = true,
    };
    esp_err_t err = esp_task_wdt_reconfigure(&config);
#endif
    SPIFFS.format();
    ESP.restart();
  }

  // Store current IP address in a string
  ESPeasyIPchanged = ESPeasyIP;
  //Serial.setDebugOutput(true);

  // Initialize WebSockets
  setupDeviceWM();  // Custom WiFiManager setup

  // event handler
  webSocket.onEvent(webSocketEvent);
  // try ever 5000 again if connection has failed
  webSocket.setReconnectInterval(5000);
  // Connect to WebSocket server
  receiveTopic = ntfyTopic;
  Serial.print(F("Connecting to WebSocket on topic: "));
  Serial.println(receiveTopic);
  connectedToWS = false;
}


//############################################# WEBSOCKETS ##########################################
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {

  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      blinkLed = true;
      connectedToWS = false;
      break;

    case WStype_CONNECTED:
      Serial.print("[WSc] Connected to url: ");
      Serial.println((char*)payload);  // Cast payload to char* for proper display
      blinkLed = false;
      connectedToWS = true;
      // Send message to server when connected
      webSocket.sendTXT("Connected");
      break;

    case WStype_TEXT:
      Serial.println();
      Serial.println(F("---------------------- Websockets message received --------------------"));
      Serial.print("[WSc] get text: ");
      Serial.println((char*)payload);  // Cast payload to char* for proper display
      parseWsMessage((char*)payload);
      break;

    case WStype_BIN:
      Serial.print("[WSc] get binary length: ");
      Serial.println(length);
      // Uncomment if needed: hexdump(payload, length);
      break;

    case WStype_ERROR:
      Serial.print("[WSc] ERROR: ");
      Serial.println((char*)payload);  // Cast payload to char* for proper display
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      // These cases can remain empty unless you need specific handling
      break;
  }
}


void parseWsMessage(char* websockedMsg) {
  // Use StaticJsonDocument to avoid heap allocation
  //StaticJsonDocument<1024> Jcommand;
  // Deserialize the WebSocket message into the JSON document
  DeserializationError error = deserializeJson(Jcommand, websockedMsg);
  if (error) {
    Serial.println(F("JSON parsing failed!"));
    return;
  }
  // Extract relevant fields from the JSON message
  const char* sendOK = Jcommand["title"];
  const char* toESPcommand = Jcommand["message"];
  uint32_t receiveTime = Jcommand["time"];

  // Store values as strings for easier comparison
  String sendOKStr = sendOK;
  String toESPcommandStr;
  if (toESPcommand && strcmp(toESPcommand, "triggered") != 0) {
    Serial.println(F("Decode......"));
    const char* decodedMsg = decodeMsg(toESPcommand);
    if (decodedMsg) {
      toESPcommandStr = decodedMsg;
      //remove trailing spaces
      // !!! workaround since decryptedLen in the decryption function is always a bit longer than expected
      int len = toESPcommandStr.length();
      while (len > 0 && !isPrintable(toESPcommandStr[len - 1])) {
        toESPcommandStr.remove(len - 1);  // Remove the last character if it's a space
        len--;                            // Decrease the length of the string
      }
    } else {
      toESPcommandStr = toESPcommand;
    }
  }

  // Print extracted values for debugging
  Serial.print(F("Title: "));
  Serial.println(sendOK);
  Serial.print(F("Message: "));
  Serial.println(toESPcommandStr);
  Serial.print(F("Time: "));
  Serial.println(receiveTime);
  Serial.print(F("Unix Time: "));
  Serial.println(getTime());

  // Check if the message is a "send" command
  if (sendOKStr.indexOf("send") != -1) {
    analogWrite(ledPin, applyInversion(0));  // Turn off the LED
    Serial.println(F("Sending data..."));
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
    analogWrite(ledPin, applyInversion(1000));  // Turn on the LED

  } else if (sendOKStr == "change_node") {
    // Change the node IP address
    Serial.println(F("Changing node..."));
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
      Serial.println(F("Command discarded. Took too long!"));
    }
  }

  // Print readonly status for debugging
  Serial.print(F("Readonly: "));
  Serial.println(!notkilled);

  // Print separator for debugging
  Serial.println(F("---------------------------------------------------------------------"));
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


//#####################################################################################################

//############################################# Decryption ##########################################
const char* decodeMsg(const char* inputMsg) {

  // Decode Base64
  int base64DecodedLen = base64_dec_len(inputMsg, strlen(inputMsg));
  if (base64DecodedLen <= 16 || base64DecodedLen > OUTPUT_BUFFER_SIZE) {
    Serial.println(F("Invalid Base64-decoded length."));
    return nullptr;
  }

  memset(compressedBuffer, 0, OUTPUT_BUFFER_SIZE);  // Clear the buffer before decoding
  base64_decode((char*)compressedBuffer, inputMsg, strlen(inputMsg));

  // Extract the IV (first 16 bytes)
  memcpy(aes_iv2, compressedBuffer, 16);

  // Extract the ciphertext (remaining bytes)
  int ciphertextLen = base64DecodedLen - 16;
  byte* ciphertext = compressedBuffer + 16;

  // Copy only the ciphertext bytes from compressedBuffer + 16
  memcpy(ciphertext, compressedBuffer + 16, ciphertextLen);

  // Decrypt the ciphertext using AES
  int decryptedLen = aesLib2.decrypt(ciphertext, ciphertextLen, compressedBuffer, aes_key, sizeof(aes_key), aes_iv2);

  if (decryptedLen > 0) {
    compressedBuffer[decryptedLen] = '\0';  // Null-terminate the decrypted data
    // Serial.println(F("Decrypted message: "));
    // Serial.println((char*)compressedBuffer);  // Print the decrypted message for debugging
    return (char*)compressedBuffer;  // Return the pointer to the decrypted buffer
  } else {
    Serial.println(F("Decryption failed!"));
    return nullptr;
  }
}


//#####################################################################################################

//############################################# WIFI MANAGER ##########################################
//Needs to be called only in the setup void.
void setupDeviceWM() {
  Serial.println(F("setting up wifimanager"));
  WiFi.setHostname(newHostname);

  wm.addParameter(&custom_ESPeasyIP);
  wm.addParameter(&custom_ntfyUrl);
  wm.addParameter(&custom_ntfyTopic);
  wm.addParameter(&custom_passWord);
  wm.addParameter(&custom_ledPinStr);
  wm.addParameter(&custom_inverted_checkbox);
  wm.addParameter(&custom_text);

  wm.setSaveParamsCallback(saveConfigCallback);

  std::vector<const char*> menu = { "wifi", "info", "param", "sep", "restart", "exit" };
  wm.setMenu(menu);
  wm.setConfigPortalTimeout(180);
  wm.setConfigPortalBlocking(blockWM);
  wm.setClass("invert");
  wm.setWiFiAutoReconnect(true);

  if (wm.autoConnect("easy2ntfy", "configesp")) {
    // if you get here you have connected to the WiFi
    Serial.println(F("Connected to wifi network!"));
    //wm.setPreSaveConfigCallback(saveConfigCallback);
    WiFi.mode(WIFI_STA);
    wm.startWebPortal();
  } else {
    Serial.println(F("Non blocking config portal running!"));
  }

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
    strcpy(passWord, custom_passWord.getValue());
    convertPassphraseToKey(passWord, aes_key);
    strcpy(ledPinStr, custom_ledPinStr.getValue());
    ledPin = atoi(ledPinStr);
    invert = (strcmp(custom_inverted_checkbox.getValue(), "1") == 0);

    Serial.print(F("IP:"));
    Serial.println(ESPeasyIP);
    Serial.print(F("Url:"));
    Serial.println(ntfyUrl);
    Serial.print(F("Topic:"));
    Serial.println(ntfyTopic);
    Serial.print(F("Password:"));
    Serial.println(passWord);
    Serial.print(F("LEDPin:"));
    Serial.println(ledPin);
    Serial.print(F("InvertedLED?:"));
    Serial.println(invert);

    // Serial.println(ntfyTag);  // Keep this commented out if not in use
    Serial.println(F("saving config"));
    DynamicJsonDocument json(1024);
    json["ESPeasyIP"] = ESPeasyIP;
    json["ntfyUrl"] = ntfyUrl;
    json["ntfyTopic"] = ntfyTopic;
    json["passWord"] = passWord;
    json["ledPinStr"] = ledPinStr;
    json["invert"] = invert ? "1" : "0";

    File configFile = SPIFFS.open("/config.json", "w");
    if (!configFile) {
      Serial.println(F("failed to open config file for writing"));
    }
    //serializeJson(json, Serial);
    serializeJson(json, configFile);
    configFile.close();
    shouldSaveConfig = false;
    ESPeasyIPchanged = ESPeasyIP;
    receiveTopic = ntfyTopic;
    Serial.println(F("WSbegin"));
    webSocket.begin(ntfyUrl, 80, "/" + receiveTopic + "/ws");
    // end save
  }
}


//#####################################################################################################

//############################################# LOOP ##################################################

void loop() {
  // Necessary for WiFi Manager to handle WiFi connection management
  loopDeviceWM();

  //Check for WiFi connection and WS connection
  if (WiFi.status() != WL_CONNECTED && !wasConnected) {  // run only on boot once again when no ap is there
                                                         // (somehow autoreconnect only works when run twice and inital connect on boot was not successful)
    wasConnected = true;
    Serial.println();
    Serial.println(F("---booted and no WiFI? run WiFiManager once again for Autoreconnect---"));
    if (wm.autoConnect("easy2ntfy", "configesp")) {
      // if you get here you have connected to the WiFi
      Serial.println(F("Connected to wifi network!"));
      //wm.setPreSaveConfigCallback(saveConfigCallback);
      WiFi.mode(WIFI_STA);
      wm.startWebPortal();
    } else {
      Serial.println(F("Non blocking config portal running!"));
    }
  } else if (WiFi.status() == WL_CONNECTED) {
    wasConnected = true;
    if (!connectedToWS && (millis() - previous_time >= 5000)) {
      Serial.println(F("-----------------------connecting to WS..............................."));
      receiveTopic = ntfyTopic;
      webSocket.begin(ntfyUrl, 80, "/" + receiveTopic + "/ws");
      previous_time = millis();  // Update the previous time for reconnection
      if (connectedToWS) {
        Serial.println(F("WebSocket Connected!"));
      } else {
        Serial.println(F("WebSocket Connection Failed!"));
      }
    }
  }

  // WebSockets - Poll for incoming messages if available
  // if (ws.available()) {
  //   ws.poll();  // Necessary to process incoming WebSocket messages

  //   // Send heartbeat every 60 seconds to keep the connection alive
  //   if (millis() - heartbeatTime > 60000) {
  //     Serial.println(F("Sending heartbeat"));
  //     heartbeatTime = millis();  // Update the last heartbeat time
  //     ws.send("H");              // Send heartbeat message
  //   }
  // }
  webSocket.loop();
  //------------------update values of paramaters in WiFiManager--------------------------------
  wm.getParameters()[0]->setValue(ESPeasyIP, 40);
  wm.getParameters()[1]->setValue(ntfyUrl, 80);
  wm.getParameters()[2]->setValue(ntfyTopic, 80);
  wm.getParameters()[3]->setValue(passWord, 17);
  wm.getParameters()[4]->setValue(ledPinStr, 4);
  wm.getParameters()[5]->setValue(invert ? "1" : "0", 2);

  //------------------LED--------------------------------
  // Handle LED blinking if there's a connection issue (blinkLed is true)
  if (blinkLed) {
    if (millis() - previousMillis >= interval) {
      previousMillis = millis();  // Update the previous time of LED blink
      // Toggle LED state (blink LED on/off)
      ledState = (ledState == 1) ? 1024 : 1;          // Alternate between two states
      analogWrite(ledPin, applyInversion(ledState));  // Update LED state
    }
  }

  //------------------timeout client--------------------------------
  if ((millis() - lastUpdate) > timerDelay2 && receiveLoop) {
    receiveLoop = false;
    ESPeasyIPchanged = ESPeasyIP;               // Save current IP to revert later
    analogWrite(ledPin, applyInversion(1000));  // Turn on the LED indicating timeout
    Serial.println(F("--------------------------------timout-------------------------------"));
    Serial.println(F("Client timed out. No more JSON will be sent."));
    Serial.print(F("Setting IP back to: "));
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
  Serial.println(F("----------------------sending command to ESP...----------------------"));
  String ESPeasyPath2 = "http://" + ESPeasyIPchanged + "/" + toESPcommand;
  Serial.println(ESPeasyPath2);
  http.begin(client, ESPeasyPath2);
  // GET json from ESPeasyIP----------------------------
  int httpResponseCode = http.GET();
  if (httpResponseCode > 0) {
    Serial.print(F("HTTP Response code GET: "));
    Serial.println(httpResponseCode);
    Serial.println();
    Serial.println(F("----------------------sending update...------------------------------"));
    lastTime = millis() - (timerDelay - 1000);  //sending json almost immediately after the last command is received
  } else {
    Serial.print(F("Error code: "));
    Serial.println(httpResponseCode);
  }
  http.end();
}


//################################### GET json from ESPeasyIP... ###########################################

void GetJson() {
  Serial.println();
  Serial.println(F("----------------------getting JSON from ESP...-----------------------"));
  Serial.println(ESPeasyIPchanged);
  //String ESPeasyPath = "http://" + ESPeasyIPchanged + "/json";

  // Send request
  http.useHTTP10(true);
  http.begin(client, "http://" + ESPeasyIPchanged + "/json");
  http.GET();

  // Parse response
  //DynamicJsonDocument filter(2000);

  StaticJsonDocument<1000> filter;
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

  // Define the size of the DynamicJsonDocument (20 KB)
  const size_t jsonDocumentSize = INPUT_BUFFER_SIZE;  // 20 KB
  const size_t memoryThreshold = 5000;                // Threshold for available heap memory in bytes (5 KB)

  // Check if there is enough memory available
  if (ESP.getFreeHeap() < jsonDocumentSize + memoryThreshold) {
    // Not enough memory to allocate the DynamicJsonDocument
    Serial.print(F("Free_Heap: "));
    Serial.println(ESP.getFreeHeap());
    Serial.println(F("Not enough memory to deserialize JSON. Skipping deserialization."));
    return;  // Exit early if memory is insufficient
  }

  DynamicJsonDocument doc(jsonDocumentSize);

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
      Serial.println(F("Problems with getting JSON from ESPeasy node. Retrying..."));
      http.end();                                 // Close the HTTP connection
      lastTime = millis() - (timerDelay - 2000);  // Adjust the lastTime to retry soon
    }
    return;
  }

  // Disconnect
  http.end();
  serializeJson(doc, minifiedPayload);

  if (minifiedPayload.isEmpty() || minifiedPayload == "null") {
    Serial.println(F("payload empty"));
    minifiedPayload = "";
  } else {
    if (!notkilled && doingItOnce) {
      minifiedPayload = "killed";
      doingItOnce = false;
    }
    //------------------compression section--------------------------------
    // Call compression function
    compressData(minifiedPayload);
  }
  // Reset minifiedPayload to an empty string after its last use
  minifiedPayload = "";
}


//################################## ...compress the Data with LZO ##################################################

void compressData(const String& inputPayload) {
  Serial.println();
  Serial.println(F("----------------------...compressing...------------------------------"));

  memset(compressedBuffer, 0, OUTPUT_BUFFER_SIZE);
  lzo_uint compressedSize = 0;

// Buffers for Compression and Decompression
#ifdef CONFIG_IDF_TARGET_ESP32
  uint8_t* workMem = (uint8_t*)malloc(WORK_MEM_SIZE);

  // Check if malloc was successful
  if (workMem == NULL) {
    Serial.println(F("Memory allocation failed for inputBuffer or compressedBuffer."));
    return;  // Exit if there is not enough memory
  }
#endif
  const size_t inputSize = inputPayload.length();

  Serial.print(F("Total Memory Needed: "));
  Serial.println(inputSize + WORK_MEM_SIZE + OUTPUT_BUFFER_SIZE);
  Serial.print(F("          Free Heap: "));
  Serial.println(ESP.getFreeHeap());
  // Check if there is enough free memory to proceed with compression
  if (ESP.getFreeHeap() < (inputSize + WORK_MEM_SIZE + OUTPUT_BUFFER_SIZE)) {
    // Not enough memory for
    Serial.println(F("Not enough memory to compress the data. Skipping compression."));
#ifdef CONFIG_IDF_TARGET_ESP32
  if (inputBuffer) free(inputBuffer);
  if (compressedBuffer) free(compressedBuffer);
#endif
  }

  // Copy input data to buffer
  memcpy(inputBuffer, inputPayload.c_str(), inputSize);

  // Compress the input data
  int compressResult = lzo1x_1_compress(
    inputBuffer, inputSize,             // Input data and size
    compressedBuffer, &compressedSize,  // Output buffer and compressed size
    workMem                             // Working memory
  );

  if (compressResult == LZO_E_OK) {
    Serial.println(F("Compression successful!"));
    Serial.print(F("Original size: "));
    Serial.println(inputSize);
    Serial.print(F("Compressed size: "));
    Serial.println(compressedSize);
  } else {
    Serial.println(F("Compression failed!"));
#ifdef CONFIG_IDF_TARGET_ESP32
    if (workMem) free(workMem);
#endif
  }

  // Post the compressed data to Ntfy
  PostToNtfy(compressedBuffer, compressedSize);

  // Clear compressedBuffer to reset any old data
  memset(compressedBuffer, 0, compressedSize);

// Free dynamically allocated memory after compression if needed
#ifdef CONFIG_IDF_TARGET_ESP32
  if (workMem) free(workMem);
#endif
}


//################################## ...and POST it to Ntfy ##################################################

void PostToNtfy(uint8_t* compressedBuffer, lzo_uint compressedSize) {
  Serial.println();
  Serial.println(F("----------------------...sending JSON to client----------------------"));

  String ntfyUrlStr = "http://" + String(ntfyUrl) + "/" + String(ntfyTopic) + topic2;
  Serial.println(ntfyUrlStr);

  http.begin(client, ntfyUrlStr);
  http.addHeader("Content-Type", "application/json");

  if (!notkilled && !doingItOnce) {
    http.addHeader("Title", "readonly");
  }

  http.addHeader("Tags", "json");
  http.addHeader("Cache", "no");

  Serial.println(ESP.getFreeHeap());
  // Save a copy of the original IV before encryption
  byte original_iv[16];
  memcpy(original_iv, aes_iv, 16);  // Backup the original IV

  // Use integer casting and rounding if needed (e.g., ceil)
  int bufferSize = (int)(1.2 * compressedSize);  // Calculate size as an integer
  byte encryptedBuffer[bufferSize] = { 0 };      // Define the output buffer with the calculated size  // Encrypt the padded plaintext using AES-128

  uint16_t cipherlength = aesLib.encrypt(compressedBuffer, compressedSize, encryptedBuffer, aes_key, sizeof(aes_key), aes_iv);
  // Convert encrypted buffer to base64 string
  Serial.print(F("cipherlength size: "));
  Serial.println(cipherlength);
  //free(compressedBuffer);

  // // Combine IV and ciphertext
  byte combined[16 + cipherlength];
  memcpy(combined, original_iv, 16);                     // Prepend the IV
  memcpy(combined + 16, encryptedBuffer, cipherlength);  // Append the ciphertext

  String base64Encoded = base64::encode(combined, 16 + cipherlength);
  // Send the encrypted buffer as binary data
  int httpResponseCode2 = http.POST(base64Encoded);

  Serial.print(F("HTTP Response code POST: "));
  Serial.println(httpResponseCode2);

  if (httpResponseCode2 == 200) {
    timerDelay = 10000;
  } else if (httpResponseCode2 == 429) {
    timerDelay = 60000;
  }

  http.end();
}

// Function to apply inversion logic
int applyInversion(int value) {
  if (invert) {
    return 1024 - value;  // Invert the brightness
  }
  return value;  // Return brightness as is
}

void aes_init() {
  aesLib.gen_iv(aes_iv);
  aesLib.set_paddingmode((paddingMode)0);
}

void convertPassphraseToKey(char* passphrase, uint8_t* key) {
  int passphraseLength = strlen(passphrase);
  if (passphraseLength < 16) {
    // If passphrase is shorter than 16 bytes, repeat it to fill the key
    for (int i = 0; i < 16; i++) {
      key[i] = passphrase[i % passphraseLength];
    }
  } else if (passphraseLength == 16) {
    // If passphrase is exactly 16 bytes, copy it directly to the key
    memcpy(key, passphrase, 16);
  } else {
    // If passphrase is longer than 16 bytes, truncate it and issue a warning
    memcpy(key, passphrase, 16);
  }
  Serial.print(F("Password set!"));
}
