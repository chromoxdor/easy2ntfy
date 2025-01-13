var userAgent = window.navigator.userAgent;
var firstRun = 1;
//var wasUsed;
//var slA; //sliderAmount
var bigLength = 0;
var jsonPath;
var nNr; //nodeNr
var nP; //nodePath
var nP2;
var nN; //nodeName
var unitNr;
var unitNr1;
var unitNrdefault;
var nIV; //nodeinterval
var iIV; //InputInterV
var isOpen = 0;
var navOpen;
var myParam;
var hasParams = 1;
var dataT = [];
var dataT2 = [];
var isittime = 1;
var isittime2 = 1;
var NrofSlides = 0;
var currVal;
var html;
var tsX = 0; //startx
var teX = 0; //endx
var tsY = 0;
var teY = 0;
var msTs = 0; //start time
var msTe = 0;
var manNav;
var cooK = document.cookie;
var gesVal;
var ntfyJson;
var ntfyChannel = '';
var selectVal;
var myJson;
var nodeUpdate;
var responseStatus;
var responseTime = 0;
var responseTime2 = 0;
var isSSE = false;
var html5;
var selectedChan = false;
var eventSource;
var readyIV;
var jsonAlarmIV;
var tryconnectIV;
var redSelection;
var invisible = false;
var switchLocal = true;
var initalRun = true;
var keyString = '';
var notencrypted = false;

//#################################### channel & cookie handling ####################################
function addChan() {
    if (document.getElementById('inputChannel').offsetHeight === 0) {
        document.getElementById("inputChannel").style.height = "200px";
        document.getElementById('addBtn').classList.add("change");
        enterOnInputs()
    } else { closeAddChan() }
}
function closeAddChan() {
    document.getElementById("inputChannel").style.height = "0";
    document.getElementById('addBtn').classList.remove("change");
    document.getElementById("channelNa").value = "";
    document.getElementById("channelNr").value = "";
    document.getElementById("passWord").value = "";
}
function submitChan() {
    chanName = document.getElementById("channelNa").value;
    chanNumber = document.getElementById("channelNr").value;
    chanServer = document.getElementById("channelSrv").value;
    password = document.getElementById("passWord").value;
    if (!chanServer) { chanServer = "ntfy.envs.net" }
    if (chanName && chanNumber) {
        //document.cookie = "ntfy_" + chanName + "=" + chanServer + '/' + chanNumber + "; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
        localStorage.setItem("ntfy_" + chanName, chanServer + '/' + chanNumber + ':' + password);
        document.getElementById("inputChannel").style.height = "0";
    }
    generateChan();
    closeAddChan();
}
function generateChan() {
    selectedChan = false;
    html5 = '';
    Object.entries(localStorage).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") { selectVal = value };
    });
    Object.entries(localStorage).forEach(entry => {
        const [key, value] = entry;
        valueSplit = value.split(":")[0];
        if (key.includes("ntfy_")) {
            newkey = key.split("_")[1]
            if (selectVal && value == selectVal) {
                if (redSelection) {
                    btnselect = "chanBtnSelectRed"
                } else {
                    btnselect = "chanBtnSelect";
                }
                selectedChan = true;
                console.log("selectedChan: true for:" + newkey);
            } else {
                btnselect = "";
            }
            html5 += '<div class="channelItem"><button class="buttonUnit ' + btnselect + '" style="text-align: center;" onclick="setChannel(this,\'' + value + '\');"><div class="chanName" id="' + newkey + '">' + newkey + '</div><div class="channelName">' + valueSplit + '</div></button><button class="remove" onclick="delChan(\'' + key + '\',\'' + value + '\')">-</button></div>';
        }
    });
    if (html5) {
        document.getElementById('channelList').innerHTML = html5;
        if (!localStorage.getItem("*selectedChannel") || !selectedChan) {
            clearHtml();
            document.getElementById('sensorList').innerHTML = '<pre class="noChan">Please select a channel.<pre>';
            if (!selectedChan) {
                clearTimeout(readyIV);
                clearTimeout(tryconnectIV);
                //document.cookie = "*selectedChannel=" + ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
                localStorage.setItem("*selectedChannel", "");
                console.log("stopping sse...");
                eventSource?.close();
            }
        }
    } else {
        clearTimeout(tryconnectIV);
        clearTimeout(readyIV);
        clearHtml();
        document.getElementById('channelList').innerHTML = "no channels added...";
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">Add a channel...\n(Click on the house symbol.)<pre>';
    };
    document.getElementById("channelNr").addEventListener("input", function () {
        this.value = this.value.replace(/[.:]/g, ""); // Remove . and :
    });
    longPressB();
}
function str_obj(str) {
    str = str.split('; ');
    var result = {};
    for (var i = 0; i < str.length; i++) {
        var cur = str[i].split('=');
        result[cur[0]] = cur[1];
    }
    return result;
}
function setChannel(data, value) {
    console.log("Data:" + value);
    if (isittime) {
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">trying to connect...<pre>';
        ntfyChannel = value
        console.log(ntfyChannel);
        //document.cookie = "*selectedChannel=" + ntfyChannel + "; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
        localStorage.setItem("*selectedChannel", ntfyChannel);
        chanBtns = document.querySelectorAll(".buttonUnit");
        chanBtns.forEach(chanBtn => {
            chanBtn.classList.remove("chanBtnSelect");
        });
        data.classList.add("chanBtnSelect");
        openChanSelection()
        fetchNtfy()
    }
}

function delChan(name, value) {
    console.log(name, value);
    if (localStorage.getItem(name)) {
        //document.cookie = name + "=" + ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
        localStorage.removeItem(name);
    }
    if (value == selectVal) {
        //document.cookie = "*selectedChannel=" + ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
        localStorage.removeItem("*selectedChannel");
    }
    generateChan()
}

function checkChange() {
    var decider = document.getElementById('localCheck');
    console.log(decider.checked)
    if (decider.checked) {
        switchLocal = true;
        console.log(document.cookie)
        document.cookie = "localCheck=1; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
    } else {
        switchLocal = false;
        document.cookie = "localCheck=0; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
    }
}
function check() {
    if (cooK.includes("localCheck=1")) {
        switchLocal = true;
        document.getElementById("localCheck").checked = true;
    }
    else {
        switchLocal = false;
        document.getElementById("localCheck").checked = false;
    }
}
function enterOnInputs() {
    document.getElementById("channelNr").addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            submitChan();
        }
    });
    document.getElementById("channelSrv").addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            submitChan();
        }
    });
}
//#################################### ntfy handling ####################################


async function fetchNtfy() {
    check();
    responseTime2 = Date.now();
    document.getElementById('unitInf').innerHTML = 'connecting...';
    if (localStorage.getItem("*selectedChannel") && Object.keys(localStorage).some(key => key.startsWith("ntfy_"))) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">trying to connect...<pre>';
        tryconnectIV = setInterval(connectionIssues, 10000);
    }
    //cookieObj = str_obj(document.cookie);
    Object.entries(localStorage).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") {
            ntfyChannel = value.split(":")[0]; keyString = value.split(":")[1]
            if (keyString) {
                //console.log(keyString);
                keyString = convertPassphraseToKey(keyString);
            } else {
                if (selectedChan) {
                    alert("Please enter a password for the selected channel");
                }
            }
        }
    });
    //console.log(ntfyChannel);
    clearTimeout(readyIV);
    if (ntfyChannel) {
        sendReady(1);
        readyIV = setInterval(sendReady, 60000);
        if (isSSE) {
            console.log("restarting sse...");
            eventSource.close();
        } else { console.log("starting sse..."); }
        eventSource = new EventSource('https://' + ntfyChannel + '_json/sse');
        isSSE = true;
        eventSource.onmessage = (e) => {
            if (e.data.includes(ntfyChannel.split("/")[0] + "/file")) { alert("The json-message has become too long \nntfy can only handle messages <= 4096byte") }
            dataNtfy = JSON.parse(e.data);
            dataNtfy = JSON.parse(e.data);

            let dataNtfydeCompressed;


            //check if input is compressed or not
            if (dataNtfy.message.includes("System")) {
                console.log("Data is uncompressed...");
                dataNtfydeCompressed = dataNtfy.message;
                notencrypted = true;
            } else {
                //Decode AES -> Decode Base64 -> decompress LZH--------------------------------------------------

                console.log("Data is compressed...");

                // Decrypt the binary data
                const decryptedData = decryptData(dataNtfy.message, keyString);
                let decryptedUint8Array = new Uint8Array(decryptedData);
                let anObject = {
                    inputBuffer: decryptedUint8Array,
                    outputBuffer: null
                }

                try {
                    lzo1x.decompress(anObject);
                    dataNtfydeCompressed = new TextDecoder().decode(anObject.outputBuffer);
                } catch (e) {
                    localStorage.setItem("*selectedChannel", "");
                    selectedChan = false;
                    eventSource.close();
                    alert('Decompression failed! \nPlease check your password.');
                    location.reload();
                }
                notencrypted = true;
            }
            if (dataNtfydeCompressed) {
                clearTimeout(tryconnectIV);
                //clearHtml();
                document.getElementById('receiveNote').style.opacity = 1;
                if (dataNtfy.message == "killed") {
                    alert(newkey + " has been set to read only. Please reset device for full functionality");
                } else {
                    if (dataNtfy.title == "readonly") {
                        redSelection = 1;
                        generateChan();
                        document.getElementById('receiveNote').style.background = "yellow";
                    } else {
                        document.getElementById('receiveNote').style.background = "limegreen";
                        redSelection = 0;
                        generateChan();
                    }
                    try {
                        myJson = JSON.parse(dataNtfydeCompressed);
                        if (initalRun) {
                            fWiFi = myJson.WiFi['IP Address']
                            fHost = myJson.WiFi.Hostname
                            initalRun = false;
                        }
                        if (switchLocal) {
                            testlocal(fWiFi, fHost);
                        }
                        else fetchJson()
                        responseTime2 = Date.now();
                        //console.log("received valid json data...");
                        clearTimeout(jsonAlarmIV);
                        jsonAlarmIV = setTimeout(jsonLimit, 90000);
                    } catch (e) {
                        console.log(e);
                        document.getElementById('receiveNote').style.background = "red";
                    }
                };
            } else {
                console.log("no json data received");
            }
            setTimeout(receiveNote, 500);
        };
    }
    generateChan();
    longPressS();
}

async function sendReady(x) {
    if (!invisible) {
        console.log("ready")
        if (x == 1) { getUrl("", "send1"); }
        else if (x == 2) { getUrl("", "send2"); }
        else getUrl("", "send");
    }
    isittime2 = 1;
}

function jsonLimit() {
    if (!invisible) {
        clearTimeout(jsonAlarmIV);
        clearTimeout(readyIV);
        readyIV = setInterval(sendReady, 60000);
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">This page will refresh in a minute...<pre>';
        alert("Either easy2nfty became unavailable \nor you reached the limit of json updates \n(https://docs.ntfy.sh/publish/#limitations) \n...please wait a moment...")
    }
}

function receiveNote() {
    document.getElementById('receiveNote').style.opacity = 0;
    document.getElementById('receiveNote').style.background = "none"
}

//#################################### TEST IF WE ARE IN THE SAME NETWORK THAN THE NODES ####################################
//the worst and only way right now to somehow detect if we are in the same network
// is to determine whenever a request through fetch is refused or timed out.
//therefore the request points to an server without https capabilities (espeasy) and gets refused 
async function testlocal(URL, hostN) {
    let controller = new AbortController();
    setTimeout(() => controller.abort(), 500);
    try {
        response = await fetch('https://' + URL, {
            signal: controller.signal,
        });
        console.log(response.status)
    } catch (error) {
        console.error(error.toString());
        if (!error.toString().includes("aborted")) { window.open("http://" + URL, "_self") }
        else { fetchJson() }
    }
}
//#################################### PARSE JSON DATA ####################################

function fetchJson() {
    if (!document.cookie.includes("Snd=")) { mC("Snd") }
    //invert color scheme----------
    try {
        for (Array of document.styleSheets) {
            for (e of Array.cssRules) {
                if (e.conditionText?.includes("prefers-color-scheme")) {
                    if (document.cookie.includes("Col=1")) { e.media.mediaText = "(prefers-color-scheme: light)" }
                    else { e.media.mediaText = "(prefers-color-scheme: dark)" }
                };
            }
        }
    }
    catch (err) {
        //console.log(err); // or just pass/continue/return true/any way of doing nothing
    }
    //-----------------------
    urlParams = new URLSearchParams(window.location.search);
    myParam = urlParams.get('unit');
    if (myParam == null) { hasParams = 0; }
    someoneEn = 0;
    //if (!jsonPath) { jsonPath = ntfyJson; }
    //myJson = jsonPath
    //isittime = 1;
    if (isittime2) {
        document.getElementById('allList').style.filter = "blur(0)";
    }
    html = '';
    html1 = '';
    html2 = '';
    html3 = '';
    let i = -1;
    unit = myJson.WiFi.Hostname;
    unitNr = myJson.System['Unit Number'];
    sysInfo = myJson.System
    let syshtml = `
                        <div class="syspair"><div>Sysinfo</div><div>${unit}</div></div>
                        <div class="syspair"><div>Local Time:</div><div>${sysInfo['Local Time']}</div></div>
                        <div class="syspair"><div>Uptime:</div><div>${minutesToDhm(sysInfo['Uptime'])}</div></div>
                        <div class="syspair"><div>Load:</div><div>${sysInfo['Load']}%</div></div>
                        ${sysInfo['Internal Temperature']
            ? `<div class="syspair">
                                <div>Temp:</div>
                                <div style="color: ${sysInfo['Internal Temperature'] > 65 ? 'red' : 'inherit'};">
                                    ${sysInfo['Internal Temperature']}°C
                                </div>
                                </div>`
            : ''
        }
                        <div class="syspair"><div>Free Ram:</div><div>${sysInfo['Free RAM']}</div></div>
                        <div class="syspair"><div>Free Stack:</div><div>${sysInfo['Free Stack']}</div></div>
                        <div class="syspair"><div>IP Address:</div><div>${myJson.WiFi['IP Address']}</div></div>
                        <div class="syspair"><div>RSSI:</div><div>${myJson.WiFi['RSSI']} dBm</div></div>
                        <div class="syspair"><div>Build:</div><div>${sysInfo['Build']}</div></div>
                        <div class="syspair"><div>Eco Mode:</div><div>${sysInfo['CPU Eco Mode'] === "true" ? 'on' : 'off'}</div></div>
                        `;

    let [dateBig, clockBig] = myJson.System['Local Time'].split(" ");
    clockBig = clockBig.split(':').slice(0, -1).join(':');
    let [dateY, dateM, dateD] = dateBig.split('-');

    if (!myJson.Sensors.length) {
        html += '<div class="sensorset clickables"><div  class="sensors" style="font-weight:bold;">no tasks configured...</div>';
    }
    else {
        for (const sensor of myJson.Sensors) {
            //myJson.Sensors.forEach(sensor => {
            var bigSpan = "";
            sensorName = sensor.TaskName;
            if (sensorName.includes("?")) { //if a tile has a custom color
                const [, bgColor] = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                tBG = `background:#${sensorName.split("?")[1]}${bgColor === "0" ? "80" : ""}`;
                sensorName = sensorName.split("?")[0];
            } else {
                tBG = "";
            }
            //this is a bit to confusing when creating events for now
            var sensorName3 = changeNN(sensorName) //replace "_" and "." in device and "BigValue" names

            htS1 = ' sensorset clickables" style="' + tBG + '" onclick="playSound(3000), ';
            htS2 = '<div  class="sensors" style="font-weight:bold;">' + sensorName3 + '</div>'
            exC = [87, 38, 41, 42].includes(sensor.TaskDeviceNumber); //all PluginNR in an array that need to be excluded 
            exC2 = !sensor.Type?.includes("Display")
            taskEnabled = sensor.TaskEnabled.toString();

            if (taskEnabled === "true" && !sensorName.includes("XX") && !exC && exC2 && !hasParams) {
                if (sensor.TaskValues) {
                    someoneEn = 1;
                    firstItem = true;
                    for (const item of sensor.TaskValues) {
                        //sensor.TaskValues.forEach(item => {
                        wasUsed = false;
                        if (item.Value == "nan") { item.Value = 0; item.NrDecimals = 0; }
                        if (typeof item.Value == 'number') {
                            num2Value = item.Value.toFixed(item.NrDecimals);
                        }
                        else { num2Value = item.Value; }
                        iN = item.Name.toString();
                        //replace "_" and "." in value names
                        //this is a bit to confusing when creating events for now
                        /*const index = iN.indexOf('?') === -1 ? iN.indexOf('&') : iN.indexOf('?');
                        index === -1 ? iN.length : index;
                        iN = iN.slice(0, index).replace(/_/g, " ").replace(/\./g, "<br>") + iN.slice(index);;*/

                        //split name into name and unit of measurement 
                        itemN = iN.split("?")[0];
                        kindN = iN.split("?")[1];
                        if (!kindN) { kindN = ""; }
                        if (kindN == "H") { kindN = "%"; }
                        if (kindN == "T") {

                            num2Value = num2Value.toString();
                            num2Value = num2Value.replace('.', ':');
                            if (item.NrDecimals == 4) {
                                num2Value = num2Value.replace(/(.*)(.)(.)/, '$1.$2$3');
                            }
                            kindN = "";
                        }

                        slMax = 1023;
                        slMin = 0;
                        slStep = 1;
                        //empty button State
                        bS = "";
                        //buttons = html; sensor tiles = html1; slider = html2; big values = html3
                        //switch---------------------------------------------------------
                        if (sensor.TaskDeviceNumber == 1) {
                            wasUsed = true;
                            if ((iN === "btnStateC" && item.Value < 2) || item.Value === 1) { bS = "on"; }
                            else if (item.Value === 2) { bS = "alert"; }
                            if (sensor.TaskDeviceGPIO1 && iN === "State" || iN === "iState") {
                                if (iN === "iState") { item.Value = item.Value == 1 ? 0 : 1 };
                                uttonGP = sensorName + "|" + sensor.TaskDeviceGPIO1;
                                html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + uttonGP + '\', \'' + item.Value + '\')">' + htS2;
                            }
                            //needs an extra plugin in espeasy
                            /*else if (sensor.TaskDeviceGPIO1 && iN === "ledState") {
                                html2 += '<div class="sensorset"><input type="range" min="' + slMin + '" max="' + slMax + '"  step="' + slStep + '" value="' + num2Value + '" id="' + sensorName + '"class="slider ' + sensor.TaskNumber + ',' + item.ValueNumber;
                                html2 += ' noVal"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + sensorName + '</div></div></div>';
                            }*/
                            else if (iN === "pState") {
                                if (sensor.TaskDeviceGPIO1) {
                                    uttonGP = sensorName + "?" + sensor.TaskDeviceGPIO1;
                                    html += '<div class="' + bS + ' btnTile push sensorset" onpointerdown="playSound(3000), pushClick(\'' + uttonGP + '\',1)" onpointerup="pushClick(\'' + uttonGP + '\',0)"><div id="' + sensorName + '" class="sensors" style="font-weight:bold;">' + sensorName + '</div></div>';
                                }
                            }
                            else if (itemN.includes("btnState")) {
                                if (itemN === "ibtnState") { item.Value = item.Value == 1 ? 0 : 1 };
                                if (kindN) { sensorName = sensorName + "|" + kindN };
                                html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + sensorName + '\', \'' + item.Value + '\')">' + htS2;
                            }
                            else if (itemN.includes("XI")) {
                                html += '<div class="btnTile sensorset clickables ' + bS + '">' + htS2;
                            }                            else { wasUsed = false; }
                        }
                        //dummy---------------------------------------------------------
                        if (sensor.TaskDeviceNumber == 33 && !(iN).includes("XX") && !(sensorName).includes("bigVal")) {
                            wasUsed = true;
                            //button coloring
                            if ((kindN === "C" && item.Value < 2) || item.Value === 1) { bS = "on"; }
                            else if (item.Value === 2) { bS = "alert"; }
                            //handle tile hiding of dummy tiles
                            if (["dButtons", "vInput", "pButtons"].some(v => (sensor.TaskName).includes(v)) && item.Name.includes("noVal")) {
                                if (item.Name.includes("noValAuto")) {
                                    if (window.innerWidth >= 450 && document.cookie.includes("Two=1")) {
                                        html += '<div class="sensorset btnTile"></div>';
                                    }
                                }
                                else { html += '<div class="sensorset btnTile"></div>'; }
                            }
                            //virtual buttons
                            else if ((sensorName).includes("dButtons")) {
                                if (item.Value > -1) {
                                    itemNB = itemN.split("&")[0];
                                    itemNB2 = changeNN(itemNB);
                                    if (itemN.split(">")[1]) getRemoteGPIOState(sensor.TaskNumber, itemN.split("&")[1].split(">")[0], itemN.split(">")[1], myJson.System['Unit Number'], item.ValueNumber);
                                    if (itemN.split("&")[1] == "A") { html += '<div class="btnTile ' + bS + htS1 + 'getNodes(\'' + itemNB + '\')"><div  class="sensors nodes" style="font-weight:bold;">' + itemNB2 + '</div></div>'; }
                                    else { html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + itemN + '\')"><div id="' + itemN + '" class="sensors" style="font-weight:bold;">' + itemNB2 + '</div></div>'; }
                                }
                            }
                            //push buttons
                            else if ((sensorName).includes("pButtons")) {
                                if (item.Value > -1) {
                                    itemNB = itemN.split("&")[0];
                                    itemNB2 = changeNN(itemNB);
                                    html += '<div class="' + bS + ' btnTile push sensorset" onpointerdown="playSound(3000), pushClick(\'' + itemN + '\',1)" onpointerup="pushClick(\'' + itemN + '\',0)"><div id="' + itemN + '" class="sensors" style="font-weight:bold;">' + itemNB2 + '</div></div>';
                                }
                            }
                            //number input
                            else if ((sensorName).includes("vInput")) {
                                if (!itemN) { itemN = "&nbsp;" }
                                html += '<div class="sensorset clickables"><div class="sensors" style="font-weight:bold" onclick="getInput(this.nextElementSibling.firstChild)">' + itemN + '</div><div class="valWrap"><input type="number" class="vInputs ' + sensor.TaskNumber + ',' + item.ValueNumber + '" id="' + itemN + '"name="' + sensorName + '" placeholder="' + num2Value + '" onkeydown="getInput(this)" onclick="getInput(this,1)"> <div class="kindInput">' + kindN + '</div></div></div>';
                            }
                            //normal slider
                            else if ((sensorName).includes("vSlider")) {
                                slName = iN;
                                slKind = "";
                                if ((iN.match(/\?/g) || []).length >= 3) {
                                    [slName, slMin, slMax, slStep, slKind] = iN.split("?");
                                }
                                slName = changeNN(slName);
                                num2Value = Number(num2Value).toFixed((slStep.toString().split('.')[1] || '').length);
                                if (slName == "noVal") slName = "&nbsp;";
                                if (!slKind) { slKind = ""; } if (slKind == "H") { slKind = "%"; }
                                html2 += '<div class="sensorset"><input type="range" min="' + slMin + '" max="' + slMax + '"  step="' + slStep + '" value="' + num2Value + '" id="' + iN + '"class="slider sL ' + sensor.TaskNumber + ',' + item.ValueNumber;
                                if ((sensorName).includes("vSliderSw")) { html2 += " swSlider"; } // add switch functionality 
                                if ((sensorName).includes("nvSlider")) { html2 += ' noVal"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + slName + '</div></div></div>'; }
                                else { html2 += '"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + slName + '</div><div class="sliderAmount" style="text-align: right;">' + num2Value + slKind + '</div></div></div>'; }
                            }
                            //time slider
                            else if ((sensorName).includes("tSlider")) {
                                if (item.NrDecimals !== 4) iN = "For the Time slider the value must have<br>4 decimals!";
                                slT1 = item.Value.toFixed(4);
                                slT2 = (slT1 + "").split(".")[1];
                                slT1 = Math.floor(slT1);
                                hour1 = Math.floor(slT1 / 60);
                                minute1 = slT1 % 60;
                                const padded1 = minute1.toString().padStart(2, "0");
                                hour2 = Math.floor(slT2 / 60);
                                minute2 = slT2 % 60;
                                const padded2 = minute2.toString().padStart(2, "0");
                                iN = changeNN(iN);
                                htmlSlider1 = '<input class="slTS" type="range" min="0" max="1440" step="5" value="';
                                html2 += '<div id="' + iN + '" class="slTimeSetWrap ' + sensorName + ' ' + sensor.TaskNumber + ',' + item.ValueNumber + '" style="font-weight:bold;">' + iN + '<div class="slTimeText"> <span class="hAmount1">' + hour1 + '</span><span>:</span><span class="mAmount1">' + padded1 + '</span><span>-</span><span class="hAmount2">' + hour2 + '</span><span>:</span><span class="mAmount2">' + padded2 + '</span></div><div class="slTimeSet">' + htmlSlider1 + slT1 + '" id="' + iN + 'L">' + htmlSlider1 + slT2 + '" id="' + iN + 'R"></div></div>';
                            }
                            //neopixel slider
                            else if (sensorName.includes("neoPixel")) {
                                // Determine the type of the range based on the value of iN
                                const rangeType = iN === 'h' ? '?H' : iN === 's' ? '?S' : iN === 'v' ? '?V' : '';

                                // Create the HTML element with a range input, depending on the type
                                html2 += `<input type="range" max="${iN === 'h' ? 359 : 100}" min="0" value="${num2Value}" id="${sensorName}${rangeType}" class="sL npSl ${sensor.TaskNumber},${item.ValueNumber} np${iN.toUpperCase()} noVal">`;
                            }
                            else { wasUsed = false; }
                        }
                        //big values---------------------------------------------------------
                        if ((sensorName).includes("bigVal")) {
                            wasUsed = true;
                            let htmlBig1 = '<div class="valuesBig" style="font-weight:bold;text-align:left;">';
                            if (firstItem == true) {
                                html3 += '<div class="bigNum">';
                                if (bigLength < sensor.TaskValues.length) { bigLength = sensor.TaskValues.length };
                            }
                            htmlBig2 = '<div style="' + tBG + '" class="bigNumWrap '
                            if (!(iN).includes("XX")) {
                                if (sensor.TaskValues.length === 3 && !(sensor.TaskValues).some(item => iN === 'XX')) { if (window.innerWidth < 450 || document.cookie.includes("Two=1")) { bigSpan = "bigSpan" } }
                                if ((sensorName).includes("bigValC")) {
                                    html3 += htmlBig2 + 'bigC ' + bigSpan + '">';
                                }
                                else {
                                    html3 += htmlBig2 + bigSpan + '">';
                                }
                                htS3 = htmlBig1 + iN + '</div><div id="'
                                if (["Clock", "Uhr", "Zeit", "Time"].some(v => (iN).includes(v))) { //(item.Name).toLowerCase().includes(v)
                                    html3 += htS3 + 'clock" class="valueBig">' + clockBig + '</div></div>';
                                }
                                else if ((iN).toLowerCase().includes("datum")) {
                                    html3 += htS3 + 'date" class="valueBig">' + dateD + '.' + dateM.toString() + '</div></div>';
                                }
                                else if ((iN).toLowerCase().includes("date")) {
                                    html3 += htS3 + 'date" class="valueBig">' + dateM + '-' + dateD.toString() + '</div></div>';
                                }
                                else if (["year", "jahr"].some(v => (iN).toLowerCase().includes(v))) {
                                    html3 += htS3 + 'year" class="valueBig">' + dateY + '</div></div>';
                                }
                                else if (iN.includes("noVal")) { html3 += htmlBig1 + '</div><div class="valueBig"></span></div></div>'; }
                                else {
                                    itemN = changeNN(itemN);
                                    html3 += htmlBig1 + itemN + '</div><div class="valueBig">' + num2Value + '<span style="background:none;padding-right: 1%;">' + kindN + '</span></div></div>';
                                }
                            }
                        }
                        // if all items with a specific declaration are processed do the rest---------------------------------------------------------
                        if (!wasUsed) {
                            //itemN = itemN.replace(/_/g, " ").replace(/\./g, "<br>"); //replace "_" and "." in value names of sensor tiles
                            if (sensor.TaskDeviceNumber == 43) {
                                if (firstItem) {
                                    if (item.Value === 1) { bS = "on"; } html += '<div class="btnTile ' + bS + ' sensorset clickables" onclick="playSound(3000); splitOn(' + sensor.TaskNumber + '); topF()""><div class="sensors" style="font-weight:bold;">' + sensorName + '</div><div class=even style="font-size: 20pt;">&#x23F2;&#xFE0E;</div></div></div>'
                                }
                            }
                            else {
                                if (firstItem == true) { html1 += '<div class="' + htS1 + 'buttonClick(\'' + sensorName + '\')">' + htS2; }
                                if (!item.Name.toString().includes("XX")) {
                                    //else if (iN.includes("noVal")) { html += '<div class="values therest"><div>&nbsp;</div><div></div></div>'; }
                                    if (sensor.TaskDeviceNumber == 81) { html1 += '<div class="cron"><div>' + itemN + '</div><div style="font-size: 10pt;">' + item.Value + '</div></div>'; }
                                    else { html1 += '<div class=row><div class=odd>' + itemN + '</div><div class=even>' + num2Value + ' ' + kindN + '</div></div>'; }
                                }
                            }
                        }
                        firstItem = false;

                    };
                    html += '</div>';
                    html1 += '</div>';
                    html3 += '</div>';
                    if (!document.cookie.includes("Sort=1")) {
                        html += html1;
                        html1 = '';
                    }
                }
                else { html1 += '<div  class="sensorset clickables" onclick="buttonClick(\'' + sensorName + '\')"><div class="sensors" style="font-weight:bold;">' + sensorName + '</div><div></div><div></div></div>'; someoneEn = 1; document.getElementById('sensorList').innerHTML = html; }
            }
        };
        if (!someoneEn && !hasParams) {
            html += '<div class="sensorset clickables" onclick="splitOn(); topF()"> <div class="sensors" style="font-weight:bold;">no tasks enabled or visible...</div>';
        }
    }
    html += html1;

    document.getElementById('sysInfo').innerHTML = syshtml;
    document.getElementById('sensorList').innerHTML = html;
    document.getElementById('sliderList').innerHTML = html2;
    document.getElementById('bigNumber').innerHTML = html3;
    //Things that only need to run once
    if (firstRun) {
        if (userAgent.match(/iPhone/i)) {
            document.body.style.height = "101vh";
        }
        //setInterval(fetchJson, 2000);
        getNodes();
        //longPressS();
        //longPressN();
        addEonce()
        unitNrdefault = myJson.System['Unit Number'];
        /*nP2 = 'http://' + myJson.WiFi['IP Address'] + '/devices';
        nP = 'http://' + myJson.WiFi['IP Address'] + '/tools';*/
        firstRun = 0;
    }
    /*if (unitNr === unitNr1) { styleU = "&#8858;"; }
    else { styleU = ""; }*/
    unitNr1 = myJson.System['Unit Number'];
    if (!hasParams) {
        document.getElementById('unitInf').innerHTML = unit + '<span class="numberUnit"> (' + myJson.WiFi.RSSI + ')</span>';
        document.getElementById('unitT').innerHTML = unit;
    }
    getNodes();
    paramS();
    changeCss();
    resizeText();
    longPressB();

}

async function getRemoteGPIOState(taskNum, unitToNum, gpioNum, unitFromNum, valueNum) {
    console.log(taskNum, unitToNum, gpioNum, unitFromNum, valueNum);
    const gState = (await getUrl(`control?cmd=SendTo,${unitToNum},"SendTo,${unitFromNum},'taskvalueset,${taskNum},${valueNum},%5BPlugin%23GPIO%23Pinstate%23${gpioNum}%5D'"`))
    return gState;
}

//##############################################################################################################
//      replace _ and .
//##############################################################################################################

function changeNN(nn) {
    return nn.replace(/_/g, " ").replace(/\./g, "<br>"); //replace "_" and "." in device and "BigValue" names
}

//##############################################################################################################
//      ADJUST THE STYLING
//##############################################################################################################
function changeCss() {
    let x = "auto ";
    let m = null;
    let coloumnSet, y, z;
    var numSl = document.querySelectorAll('input[type=range]').length;
    if (!numSl) { document.getElementById("allList").classList.add('allExtra'); }
    else { document.getElementById("allList").classList.remove('allExtra'); }
    var list3 = document.querySelectorAll(".bigNum");
    var sList = document.getElementById("sensorList");
    var numSet = sList.getElementsByClassName('sensorset').length;
    z = 0;
    if (!list3.length) z = numSet; //if there are no big values orient on number of "normal" tiles
    if (bigLength == 4 || z > 9) {
        y = x + x + x + x;
        coloumnSet = 4;
    }
    else if (bigLength == 3 || z > 4) {
        y = x + x + x;
        coloumnSet = 3;
    }
    else if (bigLength == 2 || z > 1) {
        y = x + x;
        coloumnSet = 2;
    }
    else if (bigLength == 1 || z < 2) {
        y = x;
        m = "important"
        if (list3.length) { for (let i = 0; i < list3.length; ++i) { list3[i].classList.add('bigNumOne'); } }
        coloumnSet = 1;
    }
    else {
        y = x + x;
        coloumnSet = 2;
    }
    widthLimit = coloumnSet * 150 + (coloumnSet * (window.innerHeight / 100));
    if (window.innerWidth < widthLimit || document.cookie.includes("Two=1")) {
        if (list3.length) { for (let i = 0; i < list3.length; ++i) { list3[i].style.cssText = "display: grid; grid-template-columns: auto auto;"; } }
        if (bigLength == 1 || (bigLength == 0 && numSet == 1)) {
            coloumnSet = 1
            y = x;
            m = "important"
        }
        else { coloumnSet = 2; y = x + x }
    };

    sList.style.setProperty('grid-template-columns', y, m);

    //calculate and add extra tiles
    if (numSet % coloumnSet != 0 && coloumnSet != 1) {
        calcTile = coloumnSet - (numSet - coloumnSet * Math.floor(numSet / coloumnSet));
        for (let i = 1; i <= calcTile; i++) {
            html += '<div class="sensorset"></div>'
        }
    }
    document.getElementById('sensorList').innerHTML = html;
    bigLength = 0;
}

//##############################################################################################################
//      ADD ADDITIONAL STUFF
//##############################################################################################################
function paramS() {
    var sliders = document.querySelectorAll(".slTS");
    sliders.forEach(slider => {
        slider.addEventListener("input", updateSlTS);
        slider.addEventListener('change', sliderChTS);
        slider.addEventListener("pointerup", (event) => { iIV = setTimeout(blurInput, 1000) });
    });
    var sliders = document.querySelectorAll(".sL");
    sliders.forEach(slider => {
        slider.addEventListener('input', updateSlider);
        slider.addEventListener('change', sliderChange);
        slider.addEventListener("pointerup", (event) => { iIV = setTimeout(blurInput, 1000) });
    });
    neoS = document.querySelectorAll(".npS");
    neoS.forEach(sID => {
        hVal = document.getElementById(sID.id.split("?")[0] + '?H')?.value;
        vVal = document.getElementById(sID.id.split("?")[0] + '?V')?.value || 20;
        if (vVal < 20) vVal = 20;
        sID.style.backgroundImage = 'linear-gradient(to right, hsl(0,0%,' + vVal + '%),hsl(' + hVal + ',100%,50%))';
    });
}

//##############################################################################################################
//      EVENTLISTENERS THAT NEED TO BE ADDED ONCE
//##############################################################################################################
function addEonce() {
    document.addEventListener('touchstart', e => {
        msTs = Date.now();
        tsX = e.changedTouches[0].screenX
        tsY = e.changedTouches[0].screenY
    })
    document.addEventListener('touchend', e => {
        msTe = Date.now();
        teX = e.changedTouches[0].screenX
        teY = e.changedTouches[0].screenY
        checkDirection()
    })
    document.addEventListener('mousemove', e => {
        if (!manNav && !navOpen) {
            if (e.clientX < 10 && document.getElementById('mySidenav').offsetLeft === -280) openNav()
            //if (e.clientX >280 && document.getElementById('sysInfo').offsetHeight === 0) closeNav()
        }
    })
    document.getElementById('mySidenav').addEventListener('mouseleave', e => {
        if (!manNav) {
            closeNav()
        }
    })
}

//##############################################################################################################
//      TOUCHSLIDE TO OPEN SIDENAV
//##############################################################################################################
function checkDirection() {
    touchtime = msTe - msTs
    touchDistX = teX - tsX
    touchDistY = teY - tsY
    if (teX < tsX && navOpen) {
        if (Math.abs(touchDistX) > 40 && Math.abs(touchDistY) < 30 && touchtime < 250) closeNav()
    }
    if (teX > tsX && !navOpen) {
        if (Math.abs(touchDistX) > 40 && Math.abs(touchDistY) < 30 && touchtime < 250) openNav()
    }
}

//##############################################################################################################
//      TIMESLIDER UPDATE VALUES
//##############################################################################################################
function updateSlTS(event) {
    isittime = 0;
    slider = event.target;
    if (slider.id.slice(-1) == "L") { nuM = 1 } else { nuM = 2 }
    const amount = slider.parentElement.closest(".slTimeSetWrap").firstElementChild.querySelector(".hAmount" + nuM);
    const amount2 = slider.parentElement.closest(".slTimeSetWrap").firstElementChild.querySelector(".mAmount" + nuM);
    var hours = Math.floor(slider.value / 60);
    var minutes = slider.value % 60;
    const padded = minutes.toString().padStart(2, "0");
    amount.textContent = hours;
    amount2.textContent = padded;
}

//##############################################################################################################
//      NORMAL SLIDER UPDATE VALUES
//##############################################################################################################
function updateSlider(event) {
    NrofSlides++;
    isittime = 0;
    slider = event.target;
    currVal = slider.attributes.value.nodeValue;
    slKind = slider.id.split("?")[4];
    if (!slider.className.includes("noVal")) {
        const amount = slider.closest('div.sensorset').querySelector('.sliderAmount');
        if (!slKind) { slKind = ""; } if (slKind == "H") { slKind = "%"; }
        slA = Number(event.target.value).toFixed(undefined !== event.target.step.split('.')[1] && event.target.step.split('.')[1].length) + slKind;
        amount.textContent = slA;
    }
    if (slider.classList[1] == 'npSl') {
        sliderId = slider.id.split("?")[0];
        hVal = document.getElementById(sliderId + '?H')?.value;
        sVal = document.getElementById(sliderId + '?S')?.value;
        vVal = document.getElementById(sliderId + '?V')?.value;
        gesVal = [hVal, sVal, vVal];
        vVal = vVal ?? 0;
        if (sVal && hVal) {
            if (vVal < 20) vVal = 20;
            sGrad = document.getElementById(sliderId + '?S');
            sGrad.style.backgroundImage = 'linear-gradient(to right, hsl(0,0%,' + vVal + '%),hsl(' + hVal + ',100%,50%))';
        }
    }
}

//##############################################################################################################
//      TIMESLIDER SEND EVENT ON CHANGE
//##############################################################################################################
function sliderChTS(event) {
    playSound(4000);
    slider = event.target;
    const slTName = slider.parentNode.parentNode;
    if (slider.id == slTName.id + "L") { var secVal = document.getElementById(slTName.id + "R"); }
    else { var secVal = document.getElementById(slTName.id + "L"); }
    if (unitNr === unitNr1) {
        if (slider.id == slTName.id + "L") {
            getUrl('control?cmd=taskvalueset,' + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0") + ' ' + 'control?cmd=event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1], "dualcommand");
        } else { getUrl('control?cmd=taskvalueset,' + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0") + ' ' + 'control?cmd=event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1], "dualcommand"); }
        //getUrl('control?cmd=event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1])
    }
    else {
        if (slider.id == slTName.id + "L") {
            getUrl('control?cmd=SendTo,' + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0") + '"');
        } else {
            getUrl('control?cmd=SendTo,' + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0") + '"');
        }
        getUrl('control?cmd=SendTo,' + nNr + ',"event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1] + '"')
    }

}

//##############################################################################################################
//      NORMAL SLIDER SEND EVENT ON CHANGE
//##############################################################################################################
function sliderChange(event) {
    playSound(4000);
    slider = event.target;
    maxVal = parseFloat(slider.attributes.max.nodeValue);
    minVal = parseFloat(slider.attributes.min.nodeValue);
    OnOff = "";
    //parseFloat(event.target.value).toFixed(undefined !== event.target.step.split('.')[1] && event.target.step.split('.')[1].length);
    slA = event.target.value;
    if (NrofSlides == 1 && slider.classList[3] == 'swSlider') {
        df = (maxVal - minVal) * 1 / 10;
        if (slA > (maxVal - df) && currVal !== maxVal) { slA = maxVal; OnOff = ",1"; isittime = 1;; setTimeout(fetchJson, 500); }
        if (slA < (minVal + df) && currVal !== minVal) { slA = minVal; OnOff = ",0"; isittime = 1;; setTimeout(fetchJson, 500); }
    }
    if ((slider.id.match(/\?/g) || []).length >= 3 || slider.classList[1] == 'npSl') { sliderId = slider.id.split("?")[0]; } else { sliderId = slider.id; }
    if (gesVal) gesVal = gesVal.filter(n => n)
    if (unitNr === unitNr1) {
        //getUrl('control?cmd=taskvalueset,' + slider.classList[2] + ',' + slA);
        if (slider.classList[1] != 'npSl') { getUrl('control?cmd=taskvalueset,' + slider.classList[2] + ',' + slA + ' ' + 'control?cmd=event,' + sliderId + 'Event=' + slA + OnOff, "dualcommand"); }
        else { getUrl('control?cmd=taskvalueset,' + slider.classList[2] + ',' + slA + ' ' + 'control?cmd=event,' + sliderId + 'Event=' + gesVal, "dualcommand") }
    }
    else {
        getUrl('control?cmd=SendTo,' + nNr + ',"taskvalueset,' + slider.classList[2] + ',' + slA + '"');
        if (slider.classList[1] != 'npSl') { getUrl('control?cmd=SendTo,' + nNr + ',"event,' + sliderId + 'Event=' + slA + OnOff + '"'); }
        else { getUrl('control?cmd=SendTo,' + nNr + ',"event,' + sliderId + 'Event=' + gesVal + '"'); }
    }
    clearTimeout(iIV);
    iIV = setTimeout(blurInput, 1000);
    NrofSlides = 0;
}

//##############################################################################################################
//      NORMAL BUTTON EVENT
//##############################################################################################################
function buttonClick(sensorName, gState) {
    console.log(sensorName, gState);
    //send to other nodes by "dButtons"
    if (sensorName.split("&")[1]) {
        utton2 = sensorName.split("&")[0];
        nNr2 = sensorName.split("&")[1].split(">")[0];
        console.log(sensorName.split(">")[1])
        if (sensorName.split(">")[1] && !sensorName.split(">")[1].endsWith('L')) {
            getUrl('control?cmd=SendTo,' + nNr2 + ',"GPIOToggle,' + sensorName.split(">")[1] + '"');
        }
        else getUrl('control?cmd=SendTo,' + nNr2 + ',"event,' + utton2 + 'Event"');
    }
    //button event by "switch plugin"
    else if (sensorName.split("|")[1]) {
        gpioNr = sensorName.split("|")[1];
        uN = sensorName.split("|")[0];
        gS = gState == 1 ? 0 : 1
        if (unitNr === unitNr1) { getUrl('control?cmd=gpio,' + gpioNr + ',' + gS + ' ' + 'control?cmd=event,' + uN + 'Event', "dualcommand"); }
        else { getUrl('control?cmd=SendTo,' + nNr + ',"gpio,' + gpioNr + ',' + gS + '"' + ' ' + 'control?cmd=SendTo,' + nNr + ',"event,' + uN + 'Event"', "dualcommand"); }
    }
    //normal button event by "dButtons"
    else {
        if (unitNr === unitNr1) { getUrl('control?cmd=event,' + sensorName + 'Event'); }
        else { getUrl('control?cmd=SendTo,' + nNr + ',"event,' + sensorName + 'Event"'); }
    }
    setTimeout(fetchJson, 400);
}

//##############################################################################################################
//      PUSH BUTTON EVENT
//##############################################################################################################

function pushClick(sensorName, b) {
    if (b == 0) { isittime = 1; playSound(1000); }
    else { isittime = 0 }
    if (sensorName.split("&")[1]) {
        utton2 = sensorName.split("&")[0];
        nNr2 = sensorName.split("&")[1];
        getUrl('control?cmd=SendTo,' + nNr2 + ',"event,' + utton2 + 'Event=' + b + '"');
    }
    else {
        if (unitNr === unitNr1) { getUrl('control?cmd=event,' + sensorName + 'Event=' + b); }
        else { getUrl('control?cmd=SendTo,' + nNr + ',"event,' + sensorName + 'Event=' + b + '"'); }
    }
}

function getInput(ele, initalCLick) {
    if (event.type === 'click') {
        isittime = 0;
        iIV = setTimeout(blurInput, 8000);
        ele.addEventListener('blur', (event) => {
            clearTimeout(iIV)
            isittime = 1;
            //setTimeout(fetchUpdate, 400);
        });
    }
    if (ele.value.length > 12) { ele.value = ele.value.slice(0, 12); }
    if (event.key === 'Enter' || event.type === 'click' && !initalCLick) {
        isittime = 1;
        if (ele.value) {
            playSound(4000);
            if (unitNr === unitNr1) { getUrl('control?cmd=taskvalueset,' + ele.classList[1] + ',' + ele.value); }
            else { getUrl('control?cmd=SendTo,' + nNr + ',"taskvalueset,' + ele.classList[1] + ',' + ele.value + '"'); }
            buttonClick(ele.id);
        }
        else { setTimeout(fetchJson, 400); }
        clearTimeout(iIV);
    }
    else if (event.key === 'Escape') { document.getElementById(ele.id).value = ""; }
    else { clearTimeout(iIV); iIV = setTimeout(blurInput, 5000); }
}

function blurInput(on) {
    isittime = 1;
    /*if (on) {
        clearTimeout(nodeUpdate);
        nodeUpdate = setTimeout(getUrl.bind(null, '', 'update'), 1000);
    }*/
}

//##############################################################################################################
//      OPEN THE SIDENAV
//##############################################################################################################
function openNav(whatisit) {
    navOpen = 1;
    if (whatisit) manNav = 1;
    if (document.getElementById('mySidenav').offsetLeft === -280) {
        document.getElementById("mySidenav").style.left = "0";
    } else { closeNav(); }
}
//##############################################################################################################
//      CLOSE THE SIDENAV
//##############################################################################################################
function closeNav() {
    manNav = 0;
    navOpen = 0;
    clearInterval(nIV);
    document.getElementById("mySidenav").style.left = "-280px";
}

//##############################################################################################################
//      OPEN SYTEM INFO
//##############################################################################################################
function openSys() {
    if (document.getElementById('sysInfo').offsetHeight === 0) {
        document.getElementById('menueWrap1').style.flexShrink = "0";
        document.getElementById('sysInfo').style.height = "180px";
    } else {
        document.getElementById('sysInfo').style.height = "0";
        document.getElementById('menueWrap1').style.flexShrink = "999";
    }
}

//##############################################################################################################
//      NODES - MAKE A LIST FOR THE SIDENAV
//##############################################################################################################
function getNodes(sensorName, allNodes, hasIt) {
    let html4 = '';
    nInf = myJson.nodes;
    let i = -1;
    myJson.nodes.forEach(node => {
        i++
        if (node.nr == myParam) { if (hasParams) { nodeChange(i); hasParams = 0; } }
        //if (node.nr === unitNr1) { if (node.nr === unitNr) { styleN = "&#8857;&#xFE0E;"; } else { styleN = "&#8858;&#xFE0E;"; } }
        if (node.nr === unitNr) { styleN = "&#183;&#xFE0E;"; } else { styleN = ""; }
        html4 += '<div class="menueItem"><div class="serverUnit" style="text-align: center;">' + styleN + '</div><div id="' + node.name + '" class="nc" onclick="nodeChange(' + i + ');">' + node.name + '<span class="numberUnit">' + node.nr + '</span></div></div>';
        if (sensorName || allNodes) {
            if (allNodes) {
                if (node.nr === unitNr1) { fetch('control?cmd=event,' + sensorName + 'Long'); }
                else { getUrl('control?cmd=SendTo,' + node.nr + ',"event,' + sensorName + 'Long"'); }
            }
            else if (isittime) {
                if (node.nr === unitNr1) { fetch('control?cmd=event,' + sensorName + 'Event'); }
                else { getUrl('control?cmd=SendTo,' + node.nr + ',"event,' + sensorName + 'Event"'); }
            }
        }
    })
    i = 0
    document.getElementById('menueList').innerHTML = html4;
    if (hasParams) {
        let html = '<div class="sensorset clickables"><div  class="sensors" style="font-weight:bold;">can not find node # ' + myParam + '...</div></div>';
        document.getElementById('sensorList').innerHTML = html;
        changeCss()
        hasParams = 0;
        //setTimeout(fetchJson, 3000);
    }
    //else { if (!nIV) { setTimeout(fetchJson, 1000); } }
}

//##############################################################################################################
//      CHANGE THE ADDRESS ACCORDING TO THE SELECTED NODE
//##############################################################################################################
function nodeChange(event) {
    nInf = nInf[event];
    if (nInf) {
        nNr = nInf.nr;
        nN = nInf.name;
        console.log(nInf.ip);
        /*nP = `http://${nInf.ip}/tools`;
        nP2 = `http://${nInf.ip}/devices`;*/
        jsonPath = window[nInf.ip];
        console.log(`Switching from unitNrdefault: ${unitNrdefault} to nNr: ${nNr}`);
        if (unitNrdefault == nNr) {
            console.log("replace");
            var url = document.location.href;
            window.history.pushState({}, "", url.split("?")[0]);
        }
        else {
            window.history.replaceState(null, null, '?unit=' + nNr);
        }
        //setTimeout(fetchJson, 1000);
        //setTimeout(getNodes, 500);
        getUrl(nInf.ip, "change_node")
        dataT2 = [];
    }
    if (window.innerWidth < 450 && document.getElementById('sysInfo').offsetHeight === 0) { closeNav(); }
}

//##############################################################################################################
//      RESIZE THE TEXT FOR "BIG VALUES"
//##############################################################################################################
function resizeText() {
    const isOverflown = ({ clientWidth, clientHeight, scrollWidth, scrollHeight }) => (scrollWidth > clientWidth) || (scrollHeight > clientHeight)
    const resizeText = ({ element, elements, minSize = 10, maxSize = 115, step = 1, unit = 'pt' }) => {
        (elements || [element]).forEach(el => {
            let i = minSize
            let overflow = false
            const parent = el.parentNode
            while (!overflow && i < maxSize) {
                el.style.fontSize = `${i}${unit}`
                overflow = isOverflown(parent)
                if (!overflow) i += step
            }
            el.style.fontSize = `${i - step - 1}${unit}`
            el.style.lineHeight = "0.75"
        })
    }
    resizeText({ elements: document.querySelectorAll('.valueBig'), step: 1 })
}

//##############################################################################################################
//      FULLSCREEN
//##############################################################################################################function launchFs(element) {
function launchFs(element) {
    element.requestFullscreen();
}

function openChanSelection() {
    if (!isOpen) {
        document.getElementById('framie').style.right = "0";
        isOpen = 1;
    } else { document.getElementById("framie").style.right = "-280px"; isOpen = 0; closeAddChan(); }
}

//function iFr() { if (isOpen === 1) { document.getElementById('framie').innerHTML = '<iframe src="' + nP2 + '"></iframe>'; closeNav(); } }
//##############################################################################################################
//      SCROLL TO THE TOP
//##############################################################################################################
function topF() { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }

//##############################################################################################################
//      LONGPRESS AND COOCKIE SECTION
//##############################################################################################################
//function longPressN() { document.getElementById('mOpen').addEventListener('long-press', function (e) { window.location.href = nP; }); }

function longPressS() {
    document.getElementById('closeBtn').addEventListener('long-press', function (e) {
        e.preventDefault();
        mC("Snd")
    });
    document.getElementById('nOpen').addEventListener('long-press', function (e) {
        e.preventDefault();
        mC("Sort")
    });
    document.getElementById('openSys').addEventListener('long-press', function (e) {
        e.preventDefault();
        mC("Two")
    });
    document.getElementById('unitId').addEventListener('long-press', function (e) {
        e.preventDefault();
        mC("Col")
    });
}

//make cockies
function mC(y) {
    const currentValue = (document.cookie.match(`(^|;)\\s*${y}\\s*=\\s*([^;]+)`)?.pop() || '') == 1;
    playSound(currentValue ? 500 : 900);
    document.cookie = `${y}=${currentValue ? 0 : 1}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/; SameSite=Lax;`;
    //document.cookie = `Snd=1; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/; SameSite=Lax;`
}

function longPressB() {
    let executed = false;
    const longButtons = document.querySelectorAll(".clickables");
    longButtons.forEach(longButton => {
        longButton.addEventListener('long-press', function (e) {
            e.preventDefault();
            const lBName = longButton.querySelector(".sensors");
            const lBNode = longButton.querySelector(".nodes");
            if (lBNode) {
                getNodes(lBNode.textContent, "1");
            }
            else {
                if ((lBName.id).split("&")[1]) {
                    utton2 = (lBName.id).split("&")[0];
                    nNr2 = (lBName.id).split("&")[1].split(">")[0];
                    if ((lBName.id).split(">")[1].endsWith('L')) {
                        getUrl('control?cmd=SendTo,' + nNr2 + ',"GPIOToggle,' + (lBName.id).split(">")[1].split('L')[0] + '"');
                    }
                    else { getUrl('control?cmd=SendTo,' + nNr2 + ',"event,' + utton2 + 'Long"'); }
                    setTimeout(fetchJson, 400);
                } else {
                    if (unitNr === unitNr1 && !executed) { getUrl('control?cmd=event,' + lBName.textContent + 'Long'); executed = true; }
                    else { getUrl('control?cmd=SendTo,' + nNr + ',"event,' + lBName.textContent + 'Long"'); executed = true; }
                    setTimeout(fetchJson, 400);
                }
            }
            playSound(1000);
            isittime = 0;
            iIV = setTimeout(blurInput, 600);
        });
    });
}
//##############################################################################################################
//      HELPER
//##############################################################################################################
function minutesToDhm(min) {
    const d = Math.floor(min / (60 * 24));
    const h = Math.floor((min % (60 * 24)) / 60);
    const m = min % 60;

    const format = (value, unit) => value > 0 ? `${value} ${unit}${value === 1 ? '' : 's'} ` : '';

    const dDis = format(d, 'day');
    const hDis = format(h, 'hour');
    const mDis = format(m, 'minute');

    return dDis + hDis + mDis;
}

function playSound(freQ) {
    if ((document.cookie.includes("Snd=1") || freQ < 1000) && (isittime || freQ !== 3000)) {
        c = new AudioContext()
        o = c.createOscillator()
        g = c.createGain()
        frequency = freQ
        o.frequency.value = frequency
        o.type = "sawtooth"
        o.connect(g)
        g.connect(c.destination)
        g.gain.setValueAtTime(0.05, 0)
        o.start(0)
        g.gain.exponentialRampToValueAtTime(0.00001, c.currentTime + 0.01)
        o.stop(c.currentTime + 0.01)
    }
}

//timeout fetch requests
async function getUrl(url, title) {
    if (Date.now() - responseTime > 10000) {
        if (!title) title = "command"
        let controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        try {

            // Do not encode the base URL
            if (url && !notencrypted) {url = encryptData(url);}    
            message = 'https://' + ntfyChannel +
                '?title=' + encodeURIComponent(title) +
                '&message=' + (url ? encodeURIComponent(url) : '');
            console.log(encryptData(url));
            response = await fetch(message, {
                signal: controller.signal,
                method: 'POST',
                //mode:'no-cors',
                headers: {
                    'Cache': 'no'
                }
            });
            if (response.status == 429) {
                clearTimeout(readyIV);
                readyIV = setInterval(sendReady, 60000);
                isittime2 = 0
                if (!firstRun) { document.getElementById('allList').style.filter = "blur(5px)"; }
                alert("You reached the limit of commands, please wait a moment... \n(https://docs.ntfy.sh/publish/#limitations)");
                document.getElementById('receiveNote').style.opacity = 1;
                document.getElementById('receiveNote').style.background = "red";
                setTimeout(receiveNote, 500);
            } else if (response.status == 200) {
                isittime2 = 1
                document.getElementById('receiveNote').style.opacity = 1;
                document.getElementById('receiveNote').style.background = "blue";
                setTimeout(receiveNote, 500);
            }
        } catch (error) {
            console.error(error);
            clearHtml();
            document.getElementById('sensorList').innerHTML = '<pre class="noChan">Connection error!\nDid you enter the correct server?\nIs your Server online and reachable?\nTry to reload this page<pre>';
        }
        //return response;
    }
}

function connectionIssues() {
    sendReady(1);
    if (Date.now() - responseTime2 > 80000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<img src="https://legendofmi.com/images/animatedgifs/threeheaded.gif" style="box-shadow: none; image-rendering: pixelated" width="80" height="80" alt="Three-headed Monkey">';
    }
    else if (Date.now() - responseTime2 > 70000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">If you are still here reading this you should probably give up and enjoy a walk in the park.<pre>';
    }
    else if (Date.now() - responseTime2 > 60000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">Ok...enough of this!\nDevelopers for good software are hard to find these days.\nInsert disk #22 to start another program.<pre>';
    }
    else if (Date.now() - responseTime2 > 50000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">I was joking. :)<pre>';
    }
    else if (Date.now() - responseTime2 > 40000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">Look behind you!\nA three headed monkey!<pre>';
    }
    else if (Date.now() - responseTime2 > 30000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">...or a cup of grog...<pre>';
    }
    else if (Date.now() - responseTime2 > 20000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">...hmmmm...\nStill no word from easy2ntfy.\nMaybe you should go and get yourself a coffee...<pre>';
    }
    else if (Date.now() - responseTime2 > 10000) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">...still trying to connect...\nIs easy2ntfy actually running?\nIt is also possible, that you hit the message limit. \n(if so easy2ntfy will be back in a minute)<pre>';
    }
}

function clearHtml() {
    document.getElementById('sensorList').innerHTML = ""
    document.getElementById('sliderList').innerHTML = "";
    document.getElementById('bigNumber').innerHTML = "";
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("visible");
        invisible = false;
        if (isittime2) {
            clearTimeout(readyIV);
            readyIV = setInterval(sendReady, 60000);
            sendReady(2);
        }
    } else {
        console.log("invisible");
        invisible = true;
        clearTimeout(jsonAlarmIV);
        if (isittime2) { getUrl("", "stop"); }
    }
});

//----------------------------------------------------------------
//----------------------------------------------------------------AES


// Function to convert a string to a byte array
function strToByteArray(str) {
    const byteArray = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        byteArray[i] = str.charCodeAt(i);
    }
    return byteArray;
}

//  ----------------------------------------------------------------AES encrypt
function encryptData(inputText) {

    // Convert input text to byte array
    const inputByteArray = strToByteArray(inputText);

    // Generate a random Initialization Vector (IV) for security
    const iv2 = CryptoJS.lib.WordArray.random(16);

    // const ivHex = iv2.toString(CryptoJS.enc.Hex);
    // console.log("IV (Hex):", ivHex);

    // Encrypt the text using AES with CBC mode and the secret key
    const encrypted = CryptoJS.AES.encrypt(
        inputText,
        CryptoJS.enc.Utf8.parse(keyString),
        {
            iv: iv2,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC,
        }
    );
    // Concatenate IV and ciphertext and encode in Base64 format
    const encryptedBase64 = CryptoJS.enc.Base64.stringify(
        iv2.concat(encrypted.ciphertext)
    );
    return encryptedBase64;
};
// ----------------------------------------------------------------AES decrypt
function decryptData(inputText, keyString) {
    try {
        // Convert the input text from Base64 to a WordArray
        let wordArray = CryptoJS.enc.Base64.parse(inputText);
        let key = CryptoJS.enc.Utf8.parse(keyString);

        // Slice the first 16 bytes for the IV
        let iv = CryptoJS.lib.WordArray.create(wordArray.words.slice(0, 4), 16);
        let cipherText = CryptoJS.lib.WordArray.create(wordArray.words.slice(4));

        // Convert IV to byte array and print as string
        // let ivByteArray = [];
        // for (let i = 0; i < iv.words.length; i++) {
        //     let word = iv.words[i];
        //     ivByteArray.push((word >>> 24) & 0xFF);
        //     ivByteArray.push((word >>> 16) & 0xFF);
        //     ivByteArray.push((word >>> 8) & 0xFF);
        //     ivByteArray.push(word & 0xFF);
        // }
        // ivByteArray = ivByteArray.slice(0, 16).map(byte => String.fromCharCode(byte)).join('');
        // console.log('IV (Byte Array String):', ivByteArray);

        // Decrypt the binary data
        let decrypted = CryptoJS.AES.decrypt({ ciphertext: cipherText }, key, {
            iv: iv
        });

        // Convert decrypted data to a Uint8Array
        let byteArray = new Uint8Array(decrypted.sigBytes);
        for (let i = 0; i < decrypted.sigBytes; i++) {
            byteArray[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        // Print the byte array as a hexadecimal string
        //console.log('Decrypted Byte Array Length:', byteArray.length);

        return byteArray;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw error;
    }
}

function convertPassphraseToKey(passphrase) {
    let key = '';

    if (passphrase.length < 16) {
        // Repeat the passphrase to fill the key
        while (key.length < 16) {
            key += passphrase;
        }
        key = key.substring(0, 16); // Ensure the key is exactly 16 characters long
    } else {
        // Truncate or use the first 16 characters of the passphrase
        key = passphrase.substring(0, 16);
    }
    return key;
}





var lzo1x = function () { "use strict"; var t = new function () { this.blockSize = 131072, this.minNewSize = this.blockSize, this.maxSize = 0, this.OK = 0, this.INPUT_OVERRUN = -4, this.OUTPUT_OVERRUN = -5, this.LOOKBEHIND_OVERRUN = -6, this.EOF_FOUND = -999, this.ret = 0, this.buf = null, this.buf32 = null, this.out = new Uint8Array(262144), this.cbl = 0, this.ip_end = 0, this.op_end = 0, this.t = 0, this.ip = 0, this.op = 0, this.m_pos = 0, this.m_len = 0, this.m_off = 0, this.dv_hi = 0, this.dv_lo = 0, this.dindex = 0, this.ii = 0, this.jj = 0, this.tt = 0, this.v = 0, this.dict = new Uint32Array(16384), this.emptyDict = new Uint32Array(16384), this.skipToFirstLiteralFun = !1, this.returnNewBuffers = !0, this.setBlockSize = function (t) { return "number" == typeof t && !isNaN(t) && parseInt(t) > 0 && (this.blockSize = parseInt(t), !0) }, this.setOutputSize = function (t) { return "number" == typeof t && !isNaN(t) && parseInt(t) > 0 && (this.out = new Uint8Array(parseInt(t)), !0) }, this.setReturnNewBuffers = function (t) { this.returnNewBuffers = !!t }, this.applyConfig = function (i) { void 0 !== i && (void 0 !== i.outputSize && t.setOutputSize(i.outputSize), void 0 !== i.blockSize && t.setBlockSize(i.blockSize)) }, this.ctzl = function (t) { var i; return 1 & t ? i = 0 : (i = 1, 0 == (65535 & t) && (t >>= 16, i += 16), 0 == (255 & t) && (t >>= 8, i += 8), 0 == (15 & t) && (t >>= 4, i += 4), 0 == (3 & t) && (t >>= 2, i += 2), i -= 1 & t), i }, this.extendBuffer = function () { var t = new Uint8Array(this.minNewSize + (this.blockSize - this.minNewSize % this.blockSize)); t.set(this.out), this.out = t, this.cbl = this.out.length }, this.match_next = function () { this.minNewSize = this.op + 3, this.minNewSize > this.cbl && this.extendBuffer(), this.out[this.op++] = this.buf[this.ip++], this.t > 1 && (this.out[this.op++] = this.buf[this.ip++], this.t > 2 && (this.out[this.op++] = this.buf[this.ip++])), this.t = this.buf[this.ip++] }, this.match_done = function () { return this.t = 3 & this.buf[this.ip - 2], this.t }, this.copy_match = function () { this.t += 2, this.minNewSize = this.op + this.t, this.minNewSize > this.cbl && this.extendBuffer(); do { this.out[this.op++] = this.out[this.m_pos++] } while (--this.t > 0) }, this.copy_from_buf = function () { this.minNewSize = this.op + this.t, this.minNewSize > this.cbl && this.extendBuffer(); do { this.out[this.op++] = this.buf[this.ip++] } while (--this.t > 0) }, this.match = function () { for (; ;) { if (this.t >= 64) this.m_pos = this.op - 1 - (this.t >> 2 & 7) - (this.buf[this.ip++] << 3), this.t = (this.t >> 5) - 1, this.copy_match(); else if (this.t >= 32) { if (this.t &= 31, 0 === this.t) { for (; 0 === this.buf[this.ip];)this.t += 255, this.ip++; this.t += 31 + this.buf[this.ip++] } this.m_pos = this.op - 1 - (this.buf[this.ip] >> 2) - (this.buf[this.ip + 1] << 6), this.ip += 2, this.copy_match() } else if (this.t >= 16) { if (this.m_pos = this.op - ((8 & this.t) << 11), this.t &= 7, 0 === this.t) { for (; 0 === this.buf[this.ip];)this.t += 255, this.ip++; this.t += 7 + this.buf[this.ip++] } if (this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6), this.ip += 2, this.m_pos === this.op) return this.state.outputBuffer = !0 === this.returnNewBuffers ? new Uint8Array(this.out.subarray(0, this.op)) : this.out.subarray(0, this.op), this.EOF_FOUND; this.m_pos -= 16384, this.copy_match() } else this.m_pos = this.op - 1 - (this.t >> 2) - (this.buf[this.ip++] << 2), this.minNewSize = this.op + 2, this.minNewSize > this.cbl && this.extendBuffer(), this.out[this.op++] = this.out[this.m_pos++], this.out[this.op++] = this.out[this.m_pos]; if (0 === this.match_done()) return this.OK; this.match_next() } }, this.decompress = function (t) { const i = Date.now(); if (this.state = t, this.buf = this.state.inputBuffer, this.cbl = this.out.length, this.ip_end = this.buf.length, this.t = 0, this.ip = 0, this.op = 0, this.m_pos = 0, this.skipToFirstLiteralFun = !1, this.buf[this.ip] > 17) if (this.t = this.buf[this.ip++] - 17, this.t < 4) { if (this.match_next(), this.ret = this.match(), this.ret !== this.OK) return this.ret === this.EOF_FOUND ? this.OK : this.ret } else this.copy_from_buf(), this.skipToFirstLiteralFun = !0; for (; ;) { if (Date.now() - i > 1e3) throw new Error("Decompression timed out"); if (this.skipToFirstLiteralFun) this.skipToFirstLiteralFun = !1; else { if (this.t = this.buf[this.ip++], this.t >= 16) { if (this.ret = this.match(), this.ret !== this.OK) return this.ret === this.EOF_FOUND ? this.OK : this.ret; continue } if (0 === this.t) { for (; 0 === this.buf[this.ip];)this.t += 255, this.ip++; this.t += 15 + this.buf[this.ip++] } this.t += 3, this.copy_from_buf() } if (this.t = this.buf[this.ip++], this.t < 16) { if (this.m_pos = this.op - 2049, this.m_pos -= this.t >> 2, this.m_pos -= this.buf[this.ip++] << 2, this.minNewSize = this.op + 3, this.minNewSize > this.cbl && this.extendBuffer(), this.out[this.op++] = this.out[this.m_pos++], this.out[this.op++] = this.out[this.m_pos++], this.out[this.op++] = this.out[this.m_pos], 0 === this.match_done()) continue; this.match_next() } if (this.ret = this.match(), this.ret !== this.OK) return this.ret === this.EOF_FOUND ? this.OK : this.ret } return this.OK }, this._compressCore = function () { for (this.ip_start = this.ip, this.ip_end = this.ip + this.ll - 20, this.jj = this.ip, this.ti = this.t, this.ip += this.ti < 4 ? 4 - this.ti : 0, this.ip += 1 + (this.ip - this.jj >> 5); !(this.ip >= this.ip_end);)if (this.dv_lo = this.buf[this.ip] | this.buf[this.ip + 1] << 8, this.dv_hi = this.buf[this.ip + 2] | this.buf[this.ip + 3] << 8, this.dindex = ((17053 * this.dv_lo >>> 16) + 17053 * this.dv_hi + 6180 * this.dv_lo & 65535) >>> 2, this.m_pos = this.ip_start + this.dict[this.dindex], this.dict[this.dindex] = this.ip - this.ip_start, (this.dv_hi << 16) + this.dv_lo == (this.buf[this.m_pos] | this.buf[this.m_pos + 1] << 8 | this.buf[this.m_pos + 2] << 16 | this.buf[this.m_pos + 3] << 24)) { if (this.jj -= this.ti, this.ti = 0, this.v = this.ip - this.jj, 0 !== this.v) if (this.v <= 3) { this.out[this.op - 2] |= this.v; do { this.out[this.op++] = this.buf[this.jj++] } while (--this.v > 0) } else { if (this.v <= 18) this.out[this.op++] = this.v - 3; else { for (this.tt = this.v - 18, this.out[this.op++] = 0; this.tt > 255;)this.tt -= 255, this.out[this.op++] = 0; this.out[this.op++] = this.tt } do { this.out[this.op++] = this.buf[this.jj++] } while (--this.v > 0) } if (this.m_len = 4, this.buf[this.ip + this.m_len] === this.buf[this.m_pos + this.m_len]) do { if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.m_len += 1, this.buf[this.ip + this.m_len] !== this.buf[this.m_pos + this.m_len]) break; if (this.ip + this.m_len >= this.ip_end) break } while (this.buf[this.ip + this.m_len] === this.buf[this.m_pos + this.m_len]); if (this.m_off = this.ip - this.m_pos, this.ip += this.m_len, this.jj = this.ip, this.m_len <= 8 && this.m_off <= 2048) this.m_off -= 1, this.out[this.op++] = this.m_len - 1 << 5 | (7 & this.m_off) << 2, this.out[this.op++] = this.m_off >> 3; else if (this.m_off <= 16384) { if (this.m_off -= 1, this.m_len <= 33) this.out[this.op++] = 32 | this.m_len - 2; else { for (this.m_len -= 33, this.out[this.op++] = 32; this.m_len > 255;)this.m_len -= 255, this.out[this.op++] = 0; this.out[this.op++] = this.m_len } this.out[this.op++] = this.m_off << 2, this.out[this.op++] = this.m_off >> 6 } else { if (this.m_off -= 16384, this.m_len <= 9) this.out[this.op++] = 16 | this.m_off >> 11 & 8 | this.m_len - 2; else { for (this.m_len -= 9, this.out[this.op++] = 16 | this.m_off >> 11 & 8; this.m_len > 255;)this.m_len -= 255, this.out[this.op++] = 0; this.out[this.op++] = this.m_len } this.out[this.op++] = this.m_off << 2, this.out[this.op++] = this.m_off >> 6 } } else this.ip += 1 + (this.ip - this.jj >> 5); this.t = this.ll - (this.jj - this.ip_start - this.ti) }, this.compress = function (t) { for (this.state = t, this.ip = 0, this.buf = this.state.inputBuffer, this.maxSize = this.buf.length + Math.ceil(this.buf.length / 16) + 64 + 3, this.maxSize > this.out.length && (this.out = new Uint8Array(this.maxSize)), this.op = 0, this.l = this.buf.length, this.t = 0; this.l > 20 && (this.ll = this.l <= 49152 ? this.l : 49152, !(this.t + this.ll >> 5 <= 0));)this.dict.set(this.emptyDict), this.prev_ip = this.ip, this._compressCore(), this.ip = this.prev_ip + this.ll, this.l -= this.ll; if (this.t += this.l, this.t > 0) { if (this.ii = this.buf.length - this.t, 0 === this.op && this.t <= 238) this.out[this.op++] = 17 + this.t; else if (this.t <= 3) this.out[this.op - 2] |= this.t; else if (this.t <= 18) this.out[this.op++] = this.t - 3; else { for (this.tt = this.t - 18, this.out[this.op++] = 0; this.tt > 255;)this.tt -= 255, this.out[this.op++] = 0; this.out[this.op++] = this.tt } do { this.out[this.op++] = this.buf[this.ii++] } while (--this.t > 0) } return this.out[this.op++] = 17, this.out[this.op++] = 0, this.out[this.op++] = 0, this.state.outputBuffer = !0 === this.returnNewBuffers ? new Uint8Array(this.out.subarray(0, this.op)) : this.out.subarray(0, this.op), this.OK } }; return { setBlockSize: function (i) { return t.setBlockSize(i) }, setOutputEstimate: function (i) { return t.setOutputSize(i) }, setReturnNewBuffers: function (i) { t.setReturnNewBuffers(i) }, compress: function (i, s) { return void 0 !== s && t.applyConfig(s), t.compress(i) }, decompress: function (i, s) { return void 0 !== s && t.applyConfig(s), t.decompress(i) } } }();
!function (e, t) { "use strict"; var n = null, a = "PointerEvent" in e || e.navigator && "msPointerEnabled" in e.navigator, i = "ontouchstart" in e || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0, o = a ? "pointerdown" : i ? "touchstart" : "mousedown", r = a ? "pointerup" : i ? "touchend" : "mouseup", m = a ? "pointermove" : i ? "touchmove" : "mousemove", u = a ? "pointerleave" : i ? "touchleave" : "mouseleave", s = 0, c = 0, l = 10, v = 10; function f(e) { p(), e = function (e) { if (void 0 !== e.changedTouches) return e.changedTouches[0]; return e }(e), this.dispatchEvent(new CustomEvent("long-press", { bubbles: !0, cancelable: !0, detail: { clientX: e.clientX, clientY: e.clientY, offsetX: e.offsetX, offsetY: e.offsetY, pageX: e.pageX, pageY: e.pageY }, clientX: e.clientX, clientY: e.clientY, offsetX: e.offsetX, offsetY: e.offsetY, pageX: e.pageX, pageY: e.pageY, screenX: e.screenX, screenY: e.screenY })) || t.addEventListener("click", function e(n) { t.removeEventListener("click", e, !0), function (e) { e.stopImmediatePropagation(), e.preventDefault(), e.stopPropagation() }(n) }, !0) } function d(a) { p(a); var i = a.target, o = parseInt(function (e, n, a) { for (; e && e !== t.documentElement;) { var i = e.getAttribute(n); if (i) return i; e = e.parentNode } return a }(i, "data-long-press-delay", "600"), 10); n = function (t, n) { if (!(e.requestAnimationFrame || e.webkitRequestAnimationFrame || e.mozRequestAnimationFrame && e.mozCancelRequestAnimationFrame || e.oRequestAnimationFrame || e.msRequestAnimationFrame)) return e.setTimeout(t, n); var a = (new Date).getTime(), i = {}, o = function () { (new Date).getTime() - a >= n ? t.call() : i.value = requestAnimFrame(o) }; return i.value = requestAnimFrame(o), i }(f.bind(i, a), o) } function p(t) { var a; (a = n) && (e.cancelAnimationFrame ? e.cancelAnimationFrame(a.value) : e.webkitCancelAnimationFrame ? e.webkitCancelAnimationFrame(a.value) : e.webkitCancelRequestAnimationFrame ? e.webkitCancelRequestAnimationFrame(a.value) : e.mozCancelRequestAnimationFrame ? e.mozCancelRequestAnimationFrame(a.value) : e.oCancelRequestAnimationFrame ? e.oCancelRequestAnimationFrame(a.value) : e.msCancelRequestAnimationFrame ? e.msCancelRequestAnimationFrame(a.value) : clearTimeout(a)), n = null } "function" != typeof e.CustomEvent && (e.CustomEvent = function (e, n) { n = n || { bubbles: !1, cancelable: !1, detail: void 0 }; var a = t.createEvent("CustomEvent"); return a.initCustomEvent(e, n.bubbles, n.cancelable, n.detail), a }, e.CustomEvent.prototype = e.Event.prototype), e.requestAnimFrame = e.requestAnimationFrame || e.webkitRequestAnimationFrame || e.mozRequestAnimationFrame || e.oRequestAnimationFrame || e.msRequestAnimationFrame || function (t) { e.setTimeout(t, 1e3 / 60) }, t.addEventListener(r, p, !0), t.addEventListener(u, p, !0), t.addEventListener(m, function (e) { var t = Math.abs(s - e.clientX), n = Math.abs(c - e.clientY); (t >= l || n >= v) && p() }, !0), t.addEventListener("wheel", p, !0), t.addEventListener("scroll", p, !0), t.addEventListener(o, function (e) { s = e.clientX, c = e.clientY, d(e) }, !0) }(window, document);