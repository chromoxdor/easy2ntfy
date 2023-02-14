/*********
  Rui Santos
  Complete project details at http://randomnerdtutorials.com  
*********/

#include <FS.h>  //this needs to be first, or it all crashes and burns...
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>  // https://github.com/tzapu/WiFiManager
#include <ArduinoJson.h>  // https://github.com/bblanchon/ArduinoJson

WiFiManager wm;
WiFiClient client;
HTTPClient http;
HTTPClient http2;
ESP8266WebServer server(80);
String newHostname = "EasyToNtfy";
String payload;
String command;
unsigned long lastTime = 0;
unsigned long lastTime2 = 0;
// Timer set to 10 minutes (600000)
//unsigned long timerDelay = 600000;
// Set timer to 5 seconds (5000)
unsigned long receiveTimer = 1000;
unsigned long sendTimer = 10000;
int sendOK = 0;
//############################################# CUSTOM PARAMETERS FOR THE WIFI MANAGER ##########################################
char ESPeasyIP[40] = "0.0.0.0";
char ntfyUrl[80] = "ntfy.sh";
char ntfyTopic[80] = "test2323";
char ntfyTag[80] = "1234";
//char output[2] = "5";

WiFiManagerParameter custom_ESPeasyIP("ESPeasyIP", "ESPeasyIP", ESPeasyIP, 40);
WiFiManagerParameter custom_ntfyUrl("ntfyUrl", "Url to ntfy server", ntfyUrl, 80);
WiFiManagerParameter custom_ntfyTopic("ntfyTopic", "Topic", ntfyTopic, 80);
WiFiManagerParameter custom_ntfyTag("ntfyTag", "Shared Secret", ntfyTag, 80);



//###############################################################################################################################

//################################################### GENERAL VARIABLES #########################################################
bool blockWM = false;  // Change this to false if you want your code to continue to run on the loop void even if you are not conected to any wifi.
//###############################################################################################################################

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println("Setup mode...");
  //wifiManager.resetSettings();


  //clean FS, for testing

  //SPIFFS.format();

  //read configuration from FS json
  Serial.println("mounting FS...");


  if (SPIFFS.begin()) {
    Serial.println("mounted file system");
    if (SPIFFS.exists("/config.json")) {
      //file exists, reading and loading
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
          strcpy(ntfyTag, json["ntfyTag"]);

        } else {
          Serial.println("failed to load json config");
        }
      }
    }
  } else {
    Serial.println("failed to mount FS");
  }
  //end read
  //server.begin();  // declare this at the beggining of the code => ESP8266WebServer server(80);
  setupDeviceWM();
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

// Variable to store the HTTP request
String header;

//flag for saving data
bool shouldSaveConfig = false;

//callback notifying us of the need to save config
void saveConfigCallback() {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}
void saveConfigCallback2() {
  Serial.println("Should save config");
  shouldSaveConfig = true;
}
/*

This void sets the device with the WiFiManager from tzapu with custom parameters.
Needs to be called only in the setup void.
*/
void setupDeviceWM() {
  wm.setConfigPortalBlocking(blockWM);
  //wifiManager.resetSettings();
  wm.addParameter(&custom_ESPeasyIP);
  wm.addParameter(&custom_ntfyUrl);
  wm.addParameter(&custom_ntfyTopic);
  wm.addParameter(&custom_ntfyTag);
  if (wm.autoConnect("ESPfetch", "configesp")) {
    //if you get here you have connected to the WiFi
    Serial.println("Connected to wifi network!");
    wm.setPreSaveConfigCallback(saveConfigCallback2);
    wm.setSaveConfigCallback(saveConfigCallback);
    WiFi.mode(WIFI_STA);
    WiFi.hostname(newHostname.c_str());
    wm.startWebPortal();
  } else {
    Serial.println("Non blocking config portal running!");
  }
  // call the code down to activate wifi so users can configure the device, event if it's connected to the local network
  //wm.startConfigPortal("IOT_Device");
  //
  server.onNotFound(handleNotFound);
}

/*

This void needs to be called in the loop void so it can handle the WM and the webportal.
*/
void loopDeviceWM() {
  wm.process();
  server.handleClient();
  //save the custom parameters to FS
  if (shouldSaveConfig) {
    strcpy(ESPeasyIP, custom_ESPeasyIP.getValue());
    strcpy(ntfyUrl, custom_ntfyUrl.getValue());
    strcpy(ntfyTopic, custom_ntfyTopic.getValue());
    strcpy(ntfyTag, custom_ntfyTag.getValue());
    Serial.print("IP:");
    Serial.println(ESPeasyIP);
    Serial.print("Url:");
    Serial.println(ntfyUrl);
    Serial.print("topic:");
    Serial.println(ntfyTopic);
    Serial.print("tag:");
    Serial.println(ntfyTag);
    Serial.println("saving config");
    DynamicJsonDocument json(1024);

    json["ESPeasyIP"] = ESPeasyIP;
    json["ntfyUrl"] = ntfyUrl;
    json["ntfyTopic"] = ntfyTopic;
    json["ntfyTag"] = ntfyTag;

    File configFile = SPIFFS.open("/config.json", "w");
    if (!configFile) {
      Serial.println("failed to open config file for writing");
    }
    serializeJson(json, Serial);
    serializeJson(json, configFile);
    //json.printTo(configFile);
    configFile.close();
    shouldSaveConfig = false;
    //end save
  }
}

void loop() {
  loopDeviceWM();
  // websocket listen to ntfyUrl + ntfyChannel if (channelTopic = start and channelTag = pass)
  //run or reset timer 2 minutes
  //start sending json with ipDefault every 2 min
  //PostToNtfy()
  //(else if channelTopic=ip and channelTag=pass)
  //ESPeasyIP = channelTopic;
  //if timer ended
  //stop sending json
  if ((millis() - lastTime2) > receiveTimer) {
    GetCommands();
    lastTime2 = millis();
  }

  if ((millis() - lastTime) > sendTimer && sendOK) {
    GetJson();
    lastTime = millis();
  }
}
void GetCommands() {
  String ntfyUrlStr = ntfyUrl;
  String ntfyTopicStr = ntfyTopic;
  ntfyUrlStr = "http://" + ntfyUrlStr + "/" + ntfyTopicStr + "/json?poll=1&since=1s";

  // Your Domain name with URL path or IP address with path
  http.begin(client, ntfyUrlStr);

  //GET json from ESPeasyIP----------------------------
  int httpResponseCode = http.GET();
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code GET: ");
    Serial.println(httpResponseCode);
    command = http.getString();
    StaticJsonDocument<256> Jcommand;
    deserializeJson(Jcommand, command);
    sendOK = Jcommand[String("priority")];
    Serial.print(command);
    Serial.print(sendOK);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void GetJson() {
  String ESPeasyPath = ESPeasyIP;
  ESPeasyPath = "http://" + ESPeasyPath + "/json";

  // Your Domain name with URL path or IP address with path
  http.begin(client, ESPeasyPath);

  //GET json from ESPeasyIP----------------------------
  int httpResponseCode = http.GET();
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code GET: ");
    Serial.println(httpResponseCode);
    payload = http.getString();
    PostToNtfy();
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

void PostToNtfy() {
  delay(100);
  String ntfyUrlStr = ntfyUrl;
  String ntfyTopicStr = ntfyTopic;
  ntfyUrlStr = "http://" + ntfyUrlStr + "/" + ntfyTopicStr;

  if (payload.isEmpty()) {
    Serial.println("payload empty");
  } else {
    Serial.println(ntfyUrlStr);
    http2.begin(client, ntfyUrlStr);
    http2.addHeader("Content-Type", "application/json");
    http2.addHeader("Tags", "json");
    int httpResponseCode2 = http2.POST(payload);
    Serial.print("HTTP Response code POST: ");
    Serial.println(httpResponseCode2);
    // Free resources
    //http2.end();
  }
  //POST json with channelTopic=sendJson and channelTag=pass
}

JsonVariant findNestedKey(JsonObject obj, const char* key) {
  JsonVariant foundObject = obj[key];
  if (!foundObject.isNull())
    return foundObject;

  for (JsonPair pair : obj) {
    JsonVariant nestedObject = findNestedKey(pair.value(), key);
    if (!nestedObject.isNull())
      return nestedObject;
  }

  return JsonVariant();
}
