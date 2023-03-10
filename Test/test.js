var userAgent = window.navigator.userAgent;
var firstRun = 1;
var wasUsed;
var whichSl;
var slA; //sliderAmount
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
var sndTo = 'control?cmd=SendTo,';
var tvSet = 'control?cmd=taskvalueset,';
var evnT = 'control?cmd=event,';
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

//------------------------------------channel & cookie handling------------------------------------------------------
function addChan() {
    if (document.getElementById('inputChannel').offsetHeight === 0) {
        document.getElementById("inputChannel").style.height = "160px";
        document.getElementById('addBtn').classList.add("change");
        enterOnInputs()
    } else { closeAddChan() }
}
function closeAddChan() {
    document.getElementById("inputChannel").style.height = "0";
    document.getElementById('addBtn').classList.remove("change");
    document.getElementById("channelNa").value = "";
    document.getElementById("channelNr").value = "";
}
function submitChan() {
    chanName = document.getElementById("channelNa").value;
    chanNumber = document.getElementById("channelNr").value;
    chanServer = document.getElementById("channelSrv").value;
    if (!chanServer) { chanServer = "ntfy.envs.net" }
    if (chanName && chanNumber) {
        document.cookie = "ntfy_" + chanName + "=" + chanServer + '/' + chanNumber + "; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
        document.getElementById("inputChannel").style.height = "0";
    }
    generateChan();
    closeAddChan();
}
function generateChan() {
    selectedChan = false;
    cookieObj = str_obj(document.cookie);
    html5 = '';
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") { selectVal = value };
    });
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key.includes("ntfy_")) {
            newkey = key.split("_")[1];
            if (selectVal && value == selectVal) {
                if (redSelection) {
                    btnselect = "chanBtnSelectRed"
                } else {
                    btnselect = "chanBtnSelect";
                }
                selectedChan = true;
            } else {
                btnselect = "";
            }
            html5 += '<div class="channelItem"><button class="buttonUnit ' + btnselect + '" style="text-align: center;" onclick="setChannel(this);" onmouseup="setTimeout(blurInput.bind(null, \'1\',), 100);"><div class="chanName" id="' + newkey + '">' + newkey + '</div><div class="channelName">' + value + '</div></button><button class="remove" onclick="delChan(\'' + key + '\',\'' + value + '\')">-</button></div>';
        }
    });
    if (html5) {
        document.getElementById('channelList').innerHTML = html5;
        if (!document.cookie.includes("*selectedChannel") || !selectedChan) {
            clearHtml();
            document.getElementById('sensorList').innerHTML = '<pre class="noChan">Please select a channel.<pre>';
            if (!selectedChan) {
                clearTimeout(readyIV);
                clearTimeout(tryconnectIV);
                document.cookie = "*selectedChannel=" +
                    ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
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
function setChannel(data) {
    if (isittime) {
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">trying to connect...<pre>';
        ntfyChannel = data.children[1].textContent;
        document.cookie = "*selectedChannel=" + ntfyChannel + "; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
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
    if (get_cookie(name)) {
        document.cookie = name + "=" +
            ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }
    if (value == selectVal) {
        document.cookie = "*selectedChannel=" +
            ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }
    generateChan()
}
function get_cookie(name) {
    return document.cookie.split(';').some(c => {
        return c.trim().startsWith(name + '=');
    });
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
//----------------------------------ntfy handling--------------------------------------------------------------------

async function fetchNtfy() {
    responseTime2 = Date.now();
    document.getElementById('unitInf').innerHTML = 'connecting...';
    if (document.cookie.includes("*selectedChannel") && document.cookie.includes("ntfy_")) {
        clearHtml();
        document.getElementById('sensorList').innerHTML = '<pre class="noChan">trying to connect...<pre>';
        tryconnectIV = setInterval(connectionIssues, 10000);
    }
    cookieObj = str_obj(document.cookie);
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") { ntfyChannel = value };
    });
    console.log(ntfyChannel);
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
            if (e.data.includes(ntfyChannel.split("/")[0] + "/file")) { alert("json message has become too long \nntfy can only handle messages <= 4096byte") }
            dataNtfy = JSON.parse(e.data)
            if (dataNtfy) {
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
                    ntfyJson = dataNtfy.message;
                    try {
                        myJson = JSON.parse(ntfyJson);
                        fetchJson()
                        responseTime2 = Date.now();
                        console.log("received valid json data...");
                        clearTimeout(jsonAlarmIV);
                        jsonAlarmIV = setTimeout(jsonLimit, 60000);
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
        if (x) { getUrl("", "send1"); }
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

//------------------------------------------------------------------------------------------------------

function fetchJson() {
    urlParams = new URLSearchParams(window.location.search);
    myParam = urlParams.get('unit');
    if (myParam == null) { hasParams = 0; }
    someoneEn = 0;
    //if (!jsonPath) { jsonPath = ntfyJson; }
    //myJson = jsonPath
    //isittime = 1;
    if (isittime2) {
        document.getElementById('allList').style.filter = "blur(0)";
        html = '';
        html2 = '';
        html3 = '';
        dataT = [];
        let i = -1;
        unit = myJson.WiFi.Hostname;
        unitNr = myJson.System['Unit Number'];
        sysInfo = myJson.System
        htSys = '<div class="syspair"><div>';
        syshtml = (htSys + 'Sysinfo</div><div>' + unit + '</div></div>' +
            htSys + 'Local Time:</div><div>' + sysInfo['Local Time'] + '</div></div>' +
            htSys + 'Uptime:</div><div>' + minutesToDhm(sysInfo['Uptime']) + '</div></div>' +
            htSys + 'Load:</div><div>' + sysInfo['Load'] + '%</div></div>' +
            htSys + 'Free Ram:</div><div>' + sysInfo['Free RAM'] + '</div></div>' +
            htSys + 'Free Stack:</div><div>' + sysInfo['Free Stack'] + '</div></div>' +
            htSys + 'IP Address:</div><div>' + myJson.WiFi['IP Address'] + '</div></div>' +
            htSys + 'RSSI:</div><div>' + myJson.WiFi['RSSI'] + ' dBm</div></div>' +
            htSys + 'Build:</div><div>' + sysInfo['Build'] + '</div></div>' +
            htSys + 'Eco Mode:</div><div>' + (sysInfo['CPU Eco Mode'] == "true" ? 'on' : 'off') + '</div></div>')

        jsonT = myJson.System['Local Time'];
        clockBig = jsonT.split(" ")[1];
        clockBig = clockBig.split(':');
        clockBig.pop();
        clockBig = clockBig.join(':');
        dateBig = jsonT.split(" ")[0];
        dateD = dateBig.split('-')[2];
        dateM = dateBig.split('-')[1];
        dateY = dateBig.split('-')[0];

        if (!myJson.Sensors.length) {
            html += '<div class="sensorset clickables"><div  class="sensors" style="font-weight:bold;">no tasks configured...</div>';
        }
        else {
            myJson.Sensors.forEach(sensor => {
                utton = sensor.TaskName;
                htS1 = ' sensorset clickables" onmouseup="setTimeout(blurInput.bind(null, \'1\',), 100);" onclick="playSound(3000), ';
                htS2 = '<div  class="sensors" style="font-weight:bold;">' + utton + '</div>'
                exC = !![38].indexOf(sensor.TaskDeviceNumber); //all PluginNR in an array that need to be excluded 
                exC2 = !sensor.Type?.includes("Display")
                taskEnabled = sensor.TaskEnabled.toString();
                if (taskEnabled === "true" && sensor.TaskValues && !utton.includes("XX") && exC && exC2 && !hasParams) {
                    someoneEn = 1;
                    firstItem = true;
                    sensor.TaskValues.forEach(item => {
                        wasUsed = false;
                        if (item.Name.toString().includes("XX")) { wasUsed = true; }
                        if (item.Value == "nan") { item.Value = 0; item.NrDecimals = 0; }
                        if (typeof item.Value == 'number') {
                            num2Value = item.Value.toFixed(item.NrDecimals);
                        }
                        else { num2Value = item.Value; }
                        iN = item.Name.toString();
                        itemN = iN.split("?")[0];
                        kindN = iN.split("?")[1];
                        if (!kindN) { kindN = ""; }
                        if (kindN == "H") { kindN = "%"; }
                        slMax = 1023;
                        slMin = 0;
                        slStep = 1;
                        whichSl = 0;
                        //thingspeak check
                        if ((iN.match(/\&/g) || []).length >= 2) {
                            i++;
                            if (dataT2.length === 0) { itemTSName = 0; }
                            else { itemTSName = dataT2[i]; }
                            isTspeak = true;
                            itemN = iN.split("&")[0];
                            chanN = iN.split("&")[1];
                            fieldN = iN.split("&")[2];
                            if (fieldN.includes("?")) { fieldN = fieldN.split("?")[0]; }
                            dataT.push([chanN, fieldN, item.NrDecimals, i]);
                        }
                        else { isTspeak = false; }
                        //normal tiles = html; slider = html2; big values = html3
                        //switch---------------------------------------------------------
                        if (sensor.TaskDeviceNumber == 1) {
                            wasUsed = true;
                            if ((iN === "btnStateC" && item.Value < 2) || item.Value === 1) { bS = "on"; }
                            else if (item.Value === 2) { bS = "alert"; }
                            else { bS = ""; }
                            if (sensor.TaskDeviceGPIO1 && iN.includes("State")) {
                                if (iN === "iState") { item.Value = item.Value == 1 ? 0 : 1 };
                                utton = utton + "?" + sensor.TaskDeviceGPIO1;
                                html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + utton + '\', \'' + item.Value + '\')">' + htS2;
                            }
                            else if (sensor.TaskDeviceGPIO1 && iN === "ledState") {
                                html2 += '<div class="sensorset"><input type="range" min="' + slMin + '" max="' + slMax + '"  step="' + slStep + '" value="' + num2Value + '" id="' + utton + '"class="slider ' + sensor.TaskNumber + ',' + item.ValueNumber;
                                html2 += ' noVal"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + utton + '</div></div></div>';
                            }
                            else if (itemN.includes("btnState")) {
                                if (itemN === "ibtnState") { item.Value = item.Value == 1 ? 0 : 1 };
                                if (kindN) { utton = utton + "?" + kindN };
                                html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + utton + '\', \'' + item.Value + '\')">' + htS2;
                            }
                            else { wasUsed = false; }
                        }
                        //dummy---------------------------------------------------------
                        if (sensor.TaskDeviceNumber == 33 && !["noVal", "XX"].some(v => (iN).includes(v))) {
                            wasUsed = true;
                            //button coloring
                            if ((kindN === "C" && item.Value < 2) || item.Value === 1) { bS = "on"; }
                            else if (item.Value === 2) { bS = "alert"; }
                            else { bS = ""; }
                            //virtual buttons
                            if ((utton).includes("dButtons")) {
                                if (item.Value > -1) {
                                    itemNB = itemN.split("&")[0];
                                    if (itemN.split("&")[1] == "A") { html += '<div class="btnTile ' + bS + htS1 + 'getNodes(\'' + itemNB + '\')"><div  class="sensors nodes" style="font-weight:bold;">' + itemNB + '</div></div>'; }
                                    else { html += '<div class="btnTile ' + bS + htS1 + 'buttonClick(\'' + itemN + '\')"><div id="' + itemN + '" class="sensors" style="font-weight:bold;">' + itemNB + '</div></div>'; }
                                }
                            }
                            //push buttons
                            else if ((utton).includes("pButtons")) {
                                if (item.Value > -1) {
                                    itemNB = itemN.split("&")[0];
                                    html += '<div class="' + bS + ' btnTile push sensorset" onpointerdown="playSound(3000), pushClick(\'' + itemN + '\',1)" onpointerup="pushClick(\'' + itemN + '\',0)"><div id="' + itemN + '" class="sensors" style="font-weight:bold;">' + itemNB + '</div></div>';
                                }
                            }
                            //number input
                            else if ((utton).includes("vInput")) {
                                if (!itemN) { itemN = "&nbsp;" }
                                html += '<div class="sensorset clickables"><div class="sensors" style="font-weight:bold" onclick="getInput(this.nextElementSibling.firstChild)">' + itemN + '</div><div class="valWrap btnTile"><input type="number" class="vInputs ' + sensor.TaskNumber + ',' + item.ValueNumber + '" id="' + itemN + '"name="' + utton + '" placeholder="' + num2Value + '" onkeydown="getInput(this)" onclick="getInput(this,1)"> <div class="kindInput">' + kindN + '</div></div></div>';
                            }
                            //normal slider
                            else if ((utton).includes("vSlider")) {
                                slName = iN;
                                slKind = "";
                                if ((iN.match(/\?/g) || []).length >= 3) {
                                    slName = iN.split("?")[0];
                                    slMin = iN.split("?")[1];
                                    slMax = iN.split("?")[2];
                                    slStep = iN.split("?")[3];
                                    slKind = iN.split("?")[4];
                                }
                                if (!slKind) { slKind = ""; } if (slKind == "H") { slKind = "%"; }
                                html2 += '<div class="sensorset"><input type="range" min="' + slMin + '" max="' + slMax + '"  step="' + slStep + '" value="' + num2Value + '" id="' + iN + '"class="slider sL ' + sensor.TaskNumber + ',' + item.ValueNumber;
                                if ((utton).includes("nvSlider")) { html2 += ' noVal"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + slName + '</div></div></div>'; }
                                else { html2 += '"><div  class="sensors" style="align-items: flex-end;"><div style="font-weight:bold;">' + slName + '</div><div class="sliderAmount" style="text-align: right;">' + num2Value + slKind + '</div></div></div>'; }
                            }
                            //time slider
                            else if ((utton).includes("tSlider")) {
                                slT1 = item.Value.toFixed(4);
                                slT2 = (slT1 + "").split(".")[1];
                                slT1 = Math.floor(slT1);
                                hour1 = Math.floor(slT1 / 60);
                                minute1 = slT1 % 60;
                                const padded1 = minute1.toString().padStart(2, "0");
                                hour2 = Math.floor(slT2 / 60);
                                minute2 = slT2 % 60;
                                const padded2 = minute2.toString().padStart(2, "0");
                                htmlSlider1 = '<input class="slTS" type="range" min="0" max="1440" step="5" value="';
                                html2 += '<div id="' + iN + '" class="slTimeSetWrap ' + utton + ' ' + sensor.TaskNumber + ',' + item.ValueNumber + '" style="font-weight:bold;">' + iN + '<div class="slTimeText"> <span class="hAmount1">' + hour1 + '</span><span>:</span><span class="mAmount1">' + padded1 + '</span><span>-</span><span class="hAmount2">' + hour2 + '</span><span>:</span><span class="mAmount2">' + padded2 + '</span></div><div class="slTimeSet">' + htmlSlider1 + slT1 + '" id="' + iN + 'L">' + htmlSlider1 + slT2 + '" id="' + iN + 'R"></div></div>';

                            }
                            //neopixel slider
                            else if ((utton).includes("neoPixel")) {
                                html2 += '<input type="range"max="'
                                neo1 = 'min="0" value="' + num2Value + '" id="' + utton;
                                neo2 = '"class="sL npSl ' + sensor.TaskNumber + ',' + item.ValueNumber;
                                switch (iN) {
                                    case 'h':
                                        html2 += '359"' + neo1 + '?H' + neo2 + ' npH noVal">';
                                        break;
                                    case 's':
                                        html2 += '100"' + neo1 + '?S' + neo2 + ' npS noVal">';
                                        break;
                                    case 'v':
                                        html2 += '100"' + neo1 + '?V' + neo2 + ' npV noVal">';
                                        break;
                                    default:
                                }
                            }
                            //handle hiding of dummy tiles
                            else if (iN.includes("noValAuto")) {
                                if (window.innerWidth >= 450) {
                                    html += '<div class="sensorset"><div></div><div</div></div>';
                                }
                            }
                            else if (iN.includes("noVal")) { html += '<div class="sensorset"><div></div><div</div></div>'; }

                            else { wasUsed = false; }
                        }
                        //big values---------------------------------------------------------
                        if ((utton).includes("bigVal")) {
                            let htmlBig1 = `<div class="valuesBig" style="font-weight:bold;text-align:left;">`;
                            if (firstItem == true) {
                                html3 += '<div class="bigNum">';
                                if (bigLength < sensor.TaskValues.length) { bigLength = sensor.TaskValues.length };
                            }
                            if (!(iN).includes("XX")) {
                                if ((utton).includes("bigValC")) {
                                    if (sensor.TaskValues.length === 3 && !(sensor.TaskValues).some(item => iN === 'XX')) { html3 += '<div class="bigNumWrap bigC bigSpan">'; }
                                    else { html3 += '<div class="bigNumWrap bigC">'; }
                                }
                                else {
                                    if (sensor.TaskValues.length === 3 && !(sensor.TaskValues).some(item => iN === 'XX')) { html3 += '<div class="bigNumWrap bigSpan">'; }
                                    else { html3 += '<div class="bigNumWrap">'; }
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
                                    if (isTspeak) { html3 += htmlBig1 + itemN + '</div><div id="' + itemN + 'TS" class="valueBig">' + itemTSName + '<span style="background:none;padding-right: 1%;">' + kindN + '</span></div></div>'; }
                                    else { html3 += htmlBig1 + itemN + '</div><div class="valueBig">' + num2Value + '<span style="background:none;padding-right: 1%;">' + kindN + '</span></div></div>'; }
                                }
                            }
                            wasUsed = true;
                        }
                        // if all items with a specific delaration are processed do the rest---------------------------------------------------------
                        if (!wasUsed) {
                            if (firstItem == true) { html += '<div class="' + htS1 + 'buttonClick(\'' + utton + '\')">' + htS2; }
                            if (isTspeak) { html += '<div class="values thingspeak"><div>' + itemN + '</div><div id="' + itemN + 'TS">' + itemTSName + kindN + '</div></div>'; }
                            else if (iN.includes("noVal")) { html += '<div class="values therest"><div>&nbsp;</div><div></div></div>'; }
                            else if (sensor.TaskDeviceNumber == 81) { html += '<div class="cron"><div>' + itemN + '</div><div style="font-size: 10pt;">' + item.Value + '</div></div>'; }
                            else { html += '<div class="values therest"><div>' + itemN + '</div><div>' + num2Value + kindN + '</div></div>'; }
                        }
                        firstItem = false;
                    });
                    html += '</div>';
                    html3 += '</div>';
                }
                else if (taskEnabled === "true" && !utton.includes("XX") && exC && exC2 && !hasParams) { html += '<div  class="sensorset clickables" onclick="buttonClick(\'' + utton + '\')"><div class="sensors" style="font-weight:bold;">' + utton + '</div><div></div><div></div></div>'; someoneEn = 1; document.getElementById('sensorList').innerHTML = html; }
            });
            if (!someoneEn && !hasParams) {
                html += '<div class="sensorset clickables" onclick="splitOn(); topF()"> <div class="sensors" style="font-weight:bold;">no tasks enabled or visible...</div>';
            }
        }

        document.getElementById('sysInfo').innerHTML = syshtml;
        document.getElementById('sensorList').innerHTML = html;
        document.getElementById('sliderList').innerHTML = html2;
        document.getElementById('bigNumber').innerHTML = html3;

        if (firstRun) {
            if (userAgent.match(/iPhone/i)) {
                document.body.style.height = "101vh";
            }
            //setInterval(fetchJson, 2000);
            setInterval(getTS, 10000);
            getTS();
            getNodes();
            //longPressS();
            //longPressN();
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
        longPressS();
        if (event && dataT.length) { dataT2 = []; getTS(); }
    }
}

async function getTS() {
    if (dataT) {
        for (Array of dataT) {
            responseTS = await fetch('https://api.thingspeak.com/channels/' + Array[0] + '/fields/' + Array[1] + '/last')
            myTS = await responseTS.json();
            if (responseTS.ok) { dataT2[Array[3]] = myTS.toFixed(Array[2]); }
            else { dataT2.push('error'); }
        }
    }
}

function changeCss() {
    var numSl = document.querySelectorAll('input[type=range]').length;
    if (!numSl) { document.getElementById("allList").classList.add('allExtra'); }
    else { document.getElementById("allList").classList.remove('allExtra'); }
    var list3 = document.querySelectorAll(".bigNum");
    var numBigger = document.getElementsByClassName('bigNum').length;
    var numBig = document.getElementsByClassName('valuesBig').length;
    var element = document.getElementById("sensorList");
    var numSet = element.getElementsByClassName('sensorset').length;
    if (bigLength === 1 || (!numBigger && numSet < 2)) {
        element.classList.add('sensorL1');
        element.classList.remove('sensorL2', 'sensorL3', 'sensorL4');
        if (list3.length) { for (var i = 0; i < list3.length; ++i) { list3[i].classList.add('bigNumOne'); } }
        coloumnSet = 1;
    }
    else if (bigLength === 2 || (!numBigger && numSet < 5 && numSet > 1)) {
        element.classList.remove('sensorL1', 'sensorL3', 'sensorL4');
        element.classList.add('sensorL2');
        coloumnSet = 2;
    }
    else if (bigLength === 3 || (!numBigger && numSet < 10 && numSet > 4)) {
        element.classList.remove('sensorL1', 'sensorL2', 'sensorL4');
        element.classList.add('sensorL3');
        coloumnSet = 3;
    }
    else if (bigLength === 4 || (!numBigger && numSet > 9)) {
        element.classList.remove('sensorL1', 'sensorL2', 'sensorL3');
        element.classList.add('sensorL4');
        coloumnSet = 4;
    }
    else {
        element.classList.remove('sensorL1', 'sensorL3', 'sensorL4');
        element.classList.add('sensorL2');
        coloumnSet = 2;
    }
    if (bigLength > 1) {
        if (list3.length) { for (var i = 0; i < list3.length; ++i) { list3[i].classList.remove('bigNumOne'); } }
    }
    //calculate and add extra tiles
    if (window.innerWidth < 450) { if (bigLength === 1 && !numBigger || bigLength === 0 && numSet === 1) { coloumnSet = 1 } else { coloumnSet = 2 } };
    if (numSet % coloumnSet != 0) {
        calcTile = coloumnSet - (numSet - coloumnSet * Math.floor(numSet / coloumnSet));
        for (let i = 1; i <= calcTile; i++) {
            html += '<div class="sensorset"><div></div><div</div></div>'
        }
    }
    document.getElementById('sensorList').innerHTML = html;
    bigLength = 0;
}
function paramS() {
    var sliders = document.querySelectorAll(".slTS");
    sliders.forEach(slider => {
        slider.addEventListener("input", updateSlTS);
        slider.addEventListener('change', sliderChTS);
    });
    var sliders = document.querySelectorAll(".sL");
    sliders.forEach(slider => {
        slider.addEventListener('input', updateSlider);
        slider.addEventListener('change', sliderChange);
    });
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
    neoS = document.querySelectorAll(".npS");
    neoS.forEach(sID => {
        hVal = document.getElementById(sID.id.split("?")[0] + '?H')?.value;
        vVal = document.getElementById(sID.id.split("?")[0] + '?V')?.value || 20;
        if (vVal < 20) vVal = 20;
        sID.style.backgroundImage = 'linear-gradient(to right, hsl(0,0%,' + vVal + '%),hsl(' + hVal + ',100%,50%))';
    });
}

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

function sliderChTS(event) {
    playSound(4000);
    slider = event.target;
    const slTName = slider.parentNode.parentNode;
    if (slider.id == slTName.id + "L") { var secVal = document.getElementById(slTName.id + "R"); }
    else { var secVal = document.getElementById(slTName.id + "L"); }
    if (unitNr === unitNr1) {
        if (slider.id == slTName.id + "L") {
            getUrl(tvSet + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0") + ' ' + evnT + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1], "dualcommand");
        } else { getUrl(tvSet + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0") + ' ' + evnT + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1], "dualcommand"); }
        //getUrl(evnT + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1])
    }
    else {
        if (slider.id == slTName.id + "L") {
            getUrl(sndTo + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0") + '"');
        } else {
            getUrl(sndTo + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0") + '"');
        }
        getUrl(sndTo + nNr + ',"event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1] + '"')
    }
    clearTimeout(iIV);
    iIV = setTimeout(blurInput, 1000);
}

function sliderChange(event) {
    playSound(4000);
    slider = event.target;
    maxVal = slider.attributes.max.nodeValue;
    minVal = slider.attributes.min.nodeValue;
    OnOff = "";
    parseFloat(event.target.value).toFixed(undefined !== event.target.step.split('.')[1] && event.target.step.split('.')[1].length);
    slA = event.target.value;
    if (NrofSlides == 1 && slider.classList[1] != 'npSl') {
        if (slA > maxVal * 5 / 6 && currVal !== maxVal) { slA = maxVal; OnOff = ",1"; isittime = 1;; setTimeout(fetchJson, 500); }
        if (slA < maxVal / 6 && currVal !== minVal) { slA = minVal; OnOff = ",0"; isittime = 1;; setTimeout(fetchJson, 500); }
    }
    if ((slider.id.match(/\?/g) || []).length >= 3 || slider.classList[1] == 'npSl') { sliderId = slider.id.split("?")[0]; } else { sliderId = slider.id; }
    if (gesVal) gesVal = gesVal.filter(n => n)
    if (unitNr === unitNr1) {
        //getUrl(tvSet + slider.classList[2] + ',' + slA);
        if (slider.classList[1] != 'npSl') { getUrl(tvSet + slider.classList[2] + ',' + slA + ' ' + evnT + sliderId + 'Event=' + slA + OnOff, "dualcommand"); }
        else { getUrl(tvSet + slider.classList[2] + ',' + slA + ' ' + evnT + sliderId + 'Event=' + gesVal, "dualcommand") }
    }
    else {
        getUrl(sndTo + nNr + ',"taskvalueset,' + slider.classList[2] + ',' + slA + '"');
        if (slider.classList[1] != 'npSl') { getUrl(sndTo + nNr + ',"event,' + sliderId + 'Event=' + slA + OnOff + '"'); }
        else { getUrl(sndTo + nNr + ',"event,' + sliderId + 'Event=' + gesVal + '"'); }
    }
    clearTimeout(iIV);
    iIV = setTimeout(blurInput, 1000);
    NrofSlides = 0;
}

function buttonClick(utton, gState) {
    if (isittime) {
        if (utton.split("&")[1]) {
            utton2 = utton.split("&")[0];
            nNr2 = utton.split("&")[1];
            getUrl(sndTo + nNr2 + ',"event,' + utton2 + 'Event"');
        }
        else if (utton.split("?")[1]) {
            gpioNr = utton.split("?")[1];
            gS = gState == 1 ? 0 : 1
            if (unitNr === unitNr1) { getUrl('control?cmd=gpio,' + gpioNr + ',' + gS); }
            else { getUrl(sndTo + nNr + ',"gpio,' + gpioNr + ',' + gS + '"'); }
        }
        else {
            if (unitNr === unitNr1) { getUrl(evnT + utton + 'Event'); }
            else { getUrl(sndTo + nNr + ',"event,' + utton + 'Event"'); }
        }
    }
}

function pushClick(utton, b) {
    if (b == 0) { isittime = 1; playSound(1000); }
    else { isittime = 0 }
    if (utton.split("&")[1]) {
        utton2 = utton.split("&")[0];
        nNr2 = utton.split("&")[1];
        getUrl(sndTo + nNr2 + ',"event,' + utton2 + 'Event=' + b + '"');
    }
    else {
        if (unitNr === unitNr1) { getUrl(evnT + utton + 'Event=' + b); }
        else { getUrl(sndTo + nNr + ',"event,' + utton + 'Event=,' + b + '"'); }
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
            if (unitNr === unitNr1) { getUrl(tvSet + ele.classList[1] + ',' + ele.value); }
            else { getUrl(sndTo + nNr + ',"taskvalueset,' + ele.classList[1] + ',' + ele.value + '"'); }
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

function openNav(whatisit) {
    navOpen = 1;
    if (whatisit) manNav = 1;
    if (document.getElementById('mySidenav').offsetLeft === -280) {
        document.getElementById("mySidenav").style.left = "0";
    } else { closeNav(); }
}
function closeNav() {
    manNav = 0;
    navOpen = 0;
    clearInterval(nIV);
    document.getElementById("mySidenav").style.left = "-280px";
}

function openSys() {
    if (document.getElementById('sysInfo').offsetHeight === 0) {
        document.getElementById('menueWrap1').style.flexShrink = "0";
        document.getElementById('sysInfo').style.height = "180px";
    } else {
        document.getElementById('sysInfo').style.height = "0";
        document.getElementById('menueWrap1').style.flexShrink = "999";
    }
}

function getNodes(utton, allNodes, hasIt) {
    let html4 = '';
    nInf = myJson.nodes;
    let i = -1;
    myJson.nodes.forEach(node => {
        i++
        if (node.nr == myParam) { if (hasParams) { nodeChange(i); hasParams = 0; } }
        //if (node.nr === unitNr1) { if (node.nr === unitNr) { styleN = "&#8857;&#xFE0E;"; } else { styleN = "&#8858;&#xFE0E;"; } }
        if (node.nr === unitNr) { styleN = "&#183;&#xFE0E;"; } else { styleN = ""; }
        html4 += '<div class="menueItem"><div class="serverUnit" style="text-align: center;">' + styleN + '</div><div id="' + node.name + '" class="nc" onclick="nodeChange(' + i + ');">' + node.name + '<span class="numberUnit">' + node.nr + '</span></div></div>';
        if (utton || allNodes) {
            if (allNodes) {
                if (node.nr === unitNr1) { fetch(evnT + utton + 'Long'); }
                else { getUrl(sndTo + node.nr + ',"event,' + utton + 'Long"'); }
            }
            else if (isittime) {
                if (node.nr === unitNr1) { fetch(evnT + utton + 'Event'); }
                else { getUrl(sndTo + node.nr + ',"event,' + utton + 'Event"'); }
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

function nodeChange(event) {
    nInf = nInf[event];
    if (nInf) {
        nNr = nInf.nr;
        nN = nInf.name;
        console.log(nInf.ip);
        /*nP = `http://${nInf.ip}/tools`;
        nP2 = `http://${nInf.ip}/devices`;*/
        jsonPath = window[nInf.ip];
        console.log(unitNrdefault, nNr);
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
    }
    if (window.innerWidth < 450 && document.getElementById('sysInfo').offsetHeight === 0) { closeNav(); }
}

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
            el.style.fontSize = `${i - step}${unit}`
            el.style.lineHeight = "0.75"
        })
    }
    resizeText({ elements: document.querySelectorAll('.valueBig'), step: 1 })
}

function launchFs(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function openChanSelection() {
    if (!isOpen) {
        document.getElementById('framie').style.right = "0";
        isOpen = 1;
    } else { document.getElementById("framie").style.right = "-280px"; isOpen = 0; closeAddChan(); }
}

//function iFr() { if (isOpen === 1) { document.getElementById('framie').innerHTML = '<iframe src="' + nP2 + '"></iframe>'; closeNav(); } }
function topF() { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }
//function longPressN() { document.getElementById('mOpen').addEventListener('long-press', function (e) { window.location.href = nP; }); }
function longPressS() {
    document.getElementById('closeBtn').addEventListener('long-press', function (e) {
        if (cooK.includes("Snd=1")) { playSound(500); document.cookie = "Snd=0; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/;" }
        else { playSound(900); document.cookie = "Snd=1; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/;" }
        cooK = document.cookie;
    });
}

function longPressB() {
    var executed = false;
    const longButtons = document.querySelectorAll(".clickables");
    const longButtonChans = document.querySelectorAll(".channelItem");
    longButtonChans.forEach(longButtonChan => {
        longButtonChan.addEventListener('long-press', function (e) {
            getUrl("", "kill");
            playSound(1000);
            isittime = 0;
        });
    });
    longButtons.forEach(longButton => {
        longButton.addEventListener('long-press', function (e) {
            const lBName = longButton.querySelector(".sensors");
            const lBNode = longButton.querySelector(".nodes");
            if (lBNode) {
                getNodes(lBNode.textContent, "1");
            }
            else {
                if ((lBName.id).split("&")[1]) {
                    utton2 = (lBName.id).split("&")[0];
                    nNr2 = (lBName.id).split("&")[1];
                    getUrl(sndTo + nNr2 + ',"event,' + utton2 + 'Long"');
                } else {
                    if (unitNr === unitNr1 && !executed) { getUrl(evnT + lBName.textContent + 'Long'); executed = true; }
                    else { getUrl(sndTo + nNr + ',"event,' + lBName.textContent + 'Long"'); executed = true; }
                }
            }
            playSound(1000);
            isittime = 0;
        });
    });
}

function minutesToDhm(minutes) {
    var d = Math.floor(minutes / (60 * 24));
    var h = Math.floor(minutes % (60 * 24) / 60);
    var m = Math.floor(minutes % 60);

    var dDisplay = d > 0 ? d + (d == 1 ? " day " : " days ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
    return dDisplay + hDisplay + mDisplay;
}

function playSound(freQ) {
    if ((cooK.includes("Snd=1") || freQ < 1000) && (isittime || freQ != 3000)) {
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
            console.log('https://' + ntfyChannel + '?title=' + title + '&message=' + url)
            response = await fetch('https://' + ntfyChannel + '?title=' + title + '&message=' + url, {
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
            sendReady();
        }
    } else {
        console.log("invisible");
        invisible = true;
        clearTimeout(jsonAlarmIV);
        if (isittime2) { getUrl("", "stop"); }
    }
});



!function (e, n) { "use strict"; var t = null, a = "PointerEvent" in e || e.navigator && "msPointerEnabled" in e.navigator, i = "ontouchstart" in e || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0, o = 0, r = 0; function m(e) { var t; u(), e = void 0 !== (t = e).changedTouches ? t.changedTouches[0] : t, this.dispatchEvent(new CustomEvent("long-press", { bubbles: !0, cancelable: !0, detail: { clientX: e.clientX, clientY: e.clientY }, clientX: e.clientX, clientY: e.clientY, offsetX: e.offsetX, offsetY: e.offsetY, pageX: e.pageX, pageY: e.pageY, screenX: e.screenX, screenY: e.screenY })) || n.addEventListener("click", function e(t) { var a; n.removeEventListener("click", e, !0), (a = t).stopImmediatePropagation(), a.preventDefault(), a.stopPropagation() }, !0) } function u(n) { var a; (a = t) && (e.cancelAnimationFrame ? e.cancelAnimationFrame(a.value) : e.webkitCancelAnimationFrame ? e.webkitCancelAnimationFrame(a.value) : e.webkitCancelRequestAnimationFrame ? e.webkitCancelRequestAnimationFrame(a.value) : e.mozCancelRequestAnimationFrame ? e.mozCancelRequestAnimationFrame(a.value) : e.oCancelRequestAnimationFrame ? e.oCancelRequestAnimationFrame(a.value) : e.msCancelRequestAnimationFrame ? e.msCancelRequestAnimationFrame(a.value) : clearTimeout(a)), t = null } "function" != typeof e.CustomEvent && (e.CustomEvent = function (e, t) { t = t || { bubbles: !1, cancelable: !1, detail: void 0 }; var a = n.createEvent("CustomEvent"); return a.initCustomEvent(e, t.bubbles, t.cancelable, t.detail), a }, e.CustomEvent.prototype = e.Event.prototype), e.requestAnimFrame = e.requestAnimationFrame || e.webkitRequestAnimationFrame || e.mozRequestAnimationFrame || e.oRequestAnimationFrame || e.msRequestAnimationFrame || function (n) { e.setTimeout(n, 1e3 / 60) }, n.addEventListener(a ? "pointerup" : i ? "touchend" : "mouseup", u, !0), n.addEventListener(a ? "pointermove" : i ? "touchmove" : "mousemove", function e(n) { var t = Math.abs(o - n.clientX), a = Math.abs(r - n.clientY); (t >= 10 || a >= 10) && u(n) }, !0), n.addEventListener("wheel", u, !0), n.addEventListener("scroll", u, !0), n.addEventListener(a ? "pointerdown" : i ? "touchstart" : "mousedown", function a(i) { var s, c, l; o = i.clientX, r = i.clientY, u(s = i), l = parseInt(function e(t, a, i) { for (; t && t !== n.documentElement;) { var o = t.getAttribute(a); if (o) return o; t = t.parentNode } return "600" }(c = s.target, "data-long-press-delay", "600"), 10), t = function n(t, a) { if (!e.requestAnimationFrame && !e.webkitRequestAnimationFrame && !(e.mozRequestAnimationFrame && e.mozCancelRequestAnimationFrame) && !e.oRequestAnimationFrame && !e.msRequestAnimationFrame) return e.setTimeout(t, a); var i = new Date().getTime(), o = {}, r = function () { new Date().getTime() - i >= a ? t.call() : o.value = requestAnimFrame(r) }; return o.value = requestAnimFrame(r), o }(m.bind(c, s), l) }, !0) }(window, document);
