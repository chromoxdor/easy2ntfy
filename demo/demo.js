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
var nIV; //nodeinterval
var iIV; //InputInterV
var isOpen = 0;
var navOpen;
var myParam;
var hasParams = 1;
var dataT = [];
var dataT2 = [];
var isittime = 1;
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
    if (!chanServer) { chanServer = "ntfy.sh" }
    if (chanName && chanNumber) {
        //console.log('ntfy_' + chanName, chanNumber);
        //Cookies.set('ntfy_' + chanName, chanNumber, { expires: 99999})
        document.cookie = "ntfy_" + chanName + "=" + chanServer + '/' + chanNumber + "; expires=Fri, 31 Dec 9999 23:59:59 GMT;";
        document.getElementById("inputChannel").style.height = "0";
    }
    generateChan()
    closeAddChan()
}
function generateChan() {
    cookieObj = str_obj(document.cookie);
    let html5 = '';
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") { selectVal = value };
    });
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key.includes("ntfy_")) {
            newkey = key.split("_")[1];
            if (selectVal && value == selectVal) { btnselect = "chanBtnSelect" } else { btnselect = "" }
            html5 += '<div class="channelItem"><button class="buttonUnit ' + btnselect + '" style="text-align: center;" onclick="setChannel(this);"><div class="chanName" id="' + newkey + '">' + newkey + '</div><div class="channelName">' + value + '</div></button><button class="remove" onclick="delChan(\'' + key + '\',\'' + value + '\')">-</button></div>';
        }
    });
    document.getElementById('channelList').innerHTML = html5;
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
    cookieObj = str_obj(document.cookie);
    Object.entries(cookieObj).forEach(entry => {
        const [key, value] = entry;
        if (key == "*selectedChannel") { ntfyChannel = value };
    });
    if (ntfyChannel) {
        sendReady();
        setInterval(sendReady, 60000);
        console.log("sending something")
        const eventSource = new EventSource('https://' + ntfyChannel + '_json/sse');
        eventSource.onmessage = (e) => {
            if (JSON.parse(e.data).message) {
                //ntfyJson = IP1;
                ntfyJson = JSON.parse(e.data).message;
                fetchJson(ntfyJson)
                console.log("yes");
            } else console.log("no");
        };
    }
}

async function sendReady() {
    console.log("ready")
    fetch('https://' + ntfyChannel, {
        method: 'POST',
        headers: {
            'Title': 'send',
            'Cache': 'no'
        },
    })
}

//------------------------------------------------------------------------------------------------------

function fetchJson(ntfyJson) {
    urlParams = new URLSearchParams(window.location.search);
    myParam = urlParams.get('unit');
    if (myParam == null) { hasParams = 0; }
    someoneEn = 0;
    if (!jsonPath) { jsonPath = ntfyJson; }
    //if (!jsonPath) { jsonPath = IP1; }
    //myJson = jsonPath
    myJson = JSON.parse(ntfyJson);
    //myJson = ntfyJson;
    isittime = 1;
    if (isittime) {
        console.log(myJson);
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
                if (sensor.TaskEnabled === "true" && sensor.TaskValues && !utton.includes("XX") && exC && exC2 && !hasParams) {
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
                else if (sensor.TaskEnabled === "true" && !utton.includes("XX") && exC && exC2 && !hasParams) { html += '<div  class="sensorset clickables" onclick="buttonClick(\'' + utton + '\')"><div class="sensors" style="font-weight:bold;">' + utton + '</div><div></div><div></div></div>'; someoneEn = 1; document.getElementById('sensorList').innerHTML = html; }
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
            longPressS();
            //longPressN();
            unitNr1 = myJson.System['Unit Number'];
            /*nP2 = 'http://' + myJson.WiFi['IP Address'] + '/devices';
            nP = 'http://' + myJson.WiFi['IP Address'] + '/tools';*/
            firstRun = 0;
        }
        /*if (unitNr === unitNr1) { styleU = "&#8858;"; }
        else { styleU = ""; }*/
        if (!hasParams) {
            document.getElementById('unitId').innerHTML = unit + '<span class="numberUnit"> (' + myJson.WiFi.RSSI + ')</span>';
            document.getElementById('unitT').innerHTML = unit;
        }
        getNodes();
        paramS();
        changeCss();
        resizeText();
        longPressB();
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
    if (unitNr === unitNr1) { if (slider.id == slTName.id + "L") { getUrl(tvSet + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0")); } else { getUrl(tvSet + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0")); }; getUrl(evnT + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1]) }
    else { if (slider.id == slTName.id + "L") { getUrl(sndTo + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + event.target.value + '.' + secVal.value.toString().padStart(4, "0") + '"'); } else { getUrl(sndTo + nNr + ',"taskvalueset,' + slTName.classList[2] + ',' + secVal.value + '.' + event.target.value.toString().padStart(4, "0") + '"'); }; getUrl(sndTo + nNr + ',"event,' + slTName.classList[1] + 'Event=' + slTName.classList[2].split(",")[1] + '"') }
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
        getUrl(tvSet + slider.classList[2] + ',' + slA);
        if (slider.classList[1] != 'npSl') { getUrl(evnT + sliderId + 'Event=' + slA + OnOff); }
        else { getUrl(evnT + sliderId + 'Event=' + gesVal) }
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
    console.log(on);
    if (on) {
        clearTimeout(nodeUpdate);
        nodeUpdate = setTimeout(getUrl.bind(null, '', 'update'), 800);
    }
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
    console.log(myJson.nodes);
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
        setTimeout(fetchJson, 3000);
    }
    //else { if (!nIV) { setTimeout(fetchJson, 1000); } }
}

function nodeChange(event) {
    console.log("event:", event, "ninf:", nInf)
    nInf = nInf[event];
    if (nInf) {
        nNr = nInf.nr;
        nN = nInf.name;
        console.log(nInf.ip);
        /*nP = `http://${nInf.ip}/tools`;
        nP2 = `http://${nInf.ip}/devices`;*/
        jsonPath = window[nInf.ip];
        console.log(jsonPath);
        window.history.replaceState(null, null, '?unit=' + nNr);
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
        console.log("open")
    } else { document.getElementById("framie").style.right = "-280px"; isOpen = 0; closeAddChan(); console.log("close"); }
}

//function iFr() { if (isOpen === 1) { document.getElementById('framie').innerHTML = '<iframe src="' + nP2 + '"></iframe>'; closeNav(); } }
function topF() { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }
function longPressN() { document.getElementById('mOpen').addEventListener('long-press', function (e) { window.location.href = nP; }); }
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
    if (!title) title = "command"
    let controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    try {
        console.log('https://' + ntfyChannel + '?title=' + title + '&message=' + url)
        response = await fetch('https://' + ntfyChannel + '?title=' + title + '&message=' + url, {
            method: 'POST',
            //mode:'no-cors',
            headers: {
                'Cache': 'no'
            }
        })
        //response = await fetch(url, {
        //  signal: controller.signal
        //});
    } catch { }
    return response;
}

!function (e, n) { "use strict"; var t = null, a = "PointerEvent" in e || e.navigator && "msPointerEnabled" in e.navigator, i = "ontouchstart" in e || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0, o = 0, r = 0; function m(e) { var t; u(), e = void 0 !== (t = e).changedTouches ? t.changedTouches[0] : t, this.dispatchEvent(new CustomEvent("long-press", { bubbles: !0, cancelable: !0, detail: { clientX: e.clientX, clientY: e.clientY }, clientX: e.clientX, clientY: e.clientY, offsetX: e.offsetX, offsetY: e.offsetY, pageX: e.pageX, pageY: e.pageY, screenX: e.screenX, screenY: e.screenY })) || n.addEventListener("click", function e(t) { var a; n.removeEventListener("click", e, !0), (a = t).stopImmediatePropagation(), a.preventDefault(), a.stopPropagation() }, !0) } function u(n) { var a; (a = t) && (e.cancelAnimationFrame ? e.cancelAnimationFrame(a.value) : e.webkitCancelAnimationFrame ? e.webkitCancelAnimationFrame(a.value) : e.webkitCancelRequestAnimationFrame ? e.webkitCancelRequestAnimationFrame(a.value) : e.mozCancelRequestAnimationFrame ? e.mozCancelRequestAnimationFrame(a.value) : e.oCancelRequestAnimationFrame ? e.oCancelRequestAnimationFrame(a.value) : e.msCancelRequestAnimationFrame ? e.msCancelRequestAnimationFrame(a.value) : clearTimeout(a)), t = null } "function" != typeof e.CustomEvent && (e.CustomEvent = function (e, t) { t = t || { bubbles: !1, cancelable: !1, detail: void 0 }; var a = n.createEvent("CustomEvent"); return a.initCustomEvent(e, t.bubbles, t.cancelable, t.detail), a }, e.CustomEvent.prototype = e.Event.prototype), e.requestAnimFrame = e.requestAnimationFrame || e.webkitRequestAnimationFrame || e.mozRequestAnimationFrame || e.oRequestAnimationFrame || e.msRequestAnimationFrame || function (n) { e.setTimeout(n, 1e3 / 60) }, n.addEventListener(a ? "pointerup" : i ? "touchend" : "mouseup", u, !0), n.addEventListener(a ? "pointermove" : i ? "touchmove" : "mousemove", function e(n) { var t = Math.abs(o - n.clientX), a = Math.abs(r - n.clientY); (t >= 10 || a >= 10) && u(n) }, !0), n.addEventListener("wheel", u, !0), n.addEventListener("scroll", u, !0), n.addEventListener(a ? "pointerdown" : i ? "touchstart" : "mousedown", function a(i) { var s, c, l; o = i.clientX, r = i.clientY, u(s = i), l = parseInt(function e(t, a, i) { for (; t && t !== n.documentElement;) { var o = t.getAttribute(a); if (o) return o; t = t.parentNode } return "600" }(c = s.target, "data-long-press-delay", "600"), 10), t = function n(t, a) { if (!e.requestAnimationFrame && !e.webkitRequestAnimationFrame && !(e.mozRequestAnimationFrame && e.mozCancelRequestAnimationFrame) && !e.oRequestAnimationFrame && !e.msRequestAnimationFrame) return e.setTimeout(t, a); var i = new Date().getTime(), o = {}, r = function () { new Date().getTime() - i >= a ? t.call() : o.value = requestAnimFrame(r) }; return o.value = requestAnimFrame(r), o }(m.bind(c, s), l) }, !0) }(window, document);

var IP1 = {
    "System": {
        "Load": 23.18,
        "Load LC": 8320,
        "Build": 20221105,
        "Git Build": "mega-20221105",
        "System Libraries": "ESP82xx Core 2843a5ac, NONOS SDK 2.2.2-dev(c0eb301), LWIP: 2.1.2 PUYA support",
        "Plugin Count": 47,
        "Plugin Description": "[Normal]",
        "Build Time": "Nov  5 2022 15:50:49",
        "Binary Filename": "ESP_Easy_mega_20221105_normal_ESP8266_4M1M",
        "Local Time": "2023-01-27 09:15:12",
        "UTC time stored in RTC": "-",
        "Time Source": "NTP",
        "Time Wander": -4.2,
        "Use NTP": "true",
        "Unit Number": 1,
        "Unit Name": "Main",
        "Uptime": 1492,
        "Uptime (ms)": 89507818,
        "Last Boot Cause": "Exception",
        "Reset Reason": "Exception",
        "CPU Eco Mode": "false",
        "Heap Max Free Block": 8360,
        "Heap Fragmentation": 31,
        "Free RAM": 12336,
        "Free Stack": 3536,
        "ESP Chip Model": "ESP8266",
        "Sunrise": "7:54",
        "Sunset": "16:42",
        "Timezone Offset": 60,
        "Latitude": 52.53,
        "Longitude": 13.40,
        "Syslog Log Level": "None",
        "Serial Log Level": "None",
        "Web Log Level": "None"
    },
    "WiFi": {
        "Hostname": "Main",
        "IP Address": "IP1",
        "RSSI": -43
    },
    "nodes": [
        {
            "nr": 1,
            "name": "Main",
            "ip": "IP1",
        }, {
            "nr": 2,
            "name": "Heating",
            "ip": "IP2",
        }, {
            "nr": 3,
            "name": "Bedroom",
            "ip": "IP3",
        }, {
            "nr": 4,
            "name": "NeoPixel",
            "ip": "IP4",
        }],
    "Sensors": [
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "State",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch input - Switch",
            "TaskName": "ButtonXX",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 1
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "btnState?12",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch input - Switch",
            "TaskName": "Light1",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 2
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Bathroom&5",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 2,
                    "Name": "TV&7",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "TV_Bedroom&3",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 4,
                    "Name": "Coffee&6",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "dButtons",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 3
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Countdown?0?60?1?min",
                    "NrDecimals": 0,
                    "Value": 30
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "vSlider",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "false",
            "TaskNumber": 4
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "BedLight&8",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "dButtons2",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 5
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Inside&984590&5?°C",
                    "NrDecimals": 1,
                    "Value": 0.0
                },
                {
                    "ValueNumber": 2,
                    "Name": "Outside&143789&5?°C",
                    "NrDecimals": 1,
                    "Value": 0.0
                },
                {
                    "ValueNumber": 3,
                    "Name": "noVal",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "bigVal",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 7
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "?°C",
                    "NrDecimals": 1,
                    "Value": 19.9
                },
                {
                    "ValueNumber": 2,
                    "Name": "?H",
                    "NrDecimals": 0,
                    "Value": 43
                },
                {
                    "ValueNumber": 3,
                    "Name": "PressureXX",
                    "NrDecimals": 2,
                    "Value": 1024.11
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Environment - BMx280",
            "TaskName": "Livingroom",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "true",
            "TaskNumber": 8
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Analog",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Analog input - internal",
            "TaskName": "",
            "TaskDeviceNumber": 2,
            "TaskEnabled": "false",
            "TaskNumber": 9
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature",
                    "NrDecimals": 2,
                    "Value": 24.43
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "Pressure",
                    "NrDecimals": 2,
                    "Value": 1016.75
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "true"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 10,
            "Type": "Environment - BMx280",
            "TaskName": "SensorXX",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "true",
            "TaskNumber": 10
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "?°C",
                    "NrDecimals": 1,
                    "Value": 19.8
                },
                {
                    "ValueNumber": 2,
                    "Name": "?H",
                    "NrDecimals": 0,
                    "Value": 57
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Environment - DHT11/12/22  SONOFF2301/7021",
            "TaskName": "Bedroom",
            "TaskDeviceNumber": 5,
            "TaskEnabled": "true",
            "TaskNumber": 11
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "?°C",
                    "NrDecimals": 1,
                    "Value": 23.6
                },
                {
                    "ValueNumber": 2,
                    "Name": "?H",
                    "NrDecimals": 0,
                    "Value": 43
                },
                {
                    "ValueNumber": 3,
                    "Name": "PressureXX",
                    "NrDecimals": 2,
                    "Value": 1023.42
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Environment - BMx280",
            "TaskName": "Bathroom",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "true",
            "TaskNumber": 12
        }
    ],
    "TTL": 1000
}
var IP2 = {
    "System": {
        "Load": 9.01,
        "Load LC": 440,
        "Build": 20221015,
        "Git Build": "My Build: Oct 15 2022 14:57:52",
        "System Libraries": "ESP82xx Core 2843a5ac, NONOS SDK 2.2.2-dev(38a443e), LWIP: 2.1.2 PUYA support",
        "Plugin Count": 8,
        "Plugin Description": "[No Debug Log]",
        "Build Time": "Oct 15 2022 14:57:48",
        "Binary Filename": "ESP_Easy_mega_20221015_custom_ESP8266_4M1M",
        "Local Time": "2023-01-27 11:08:01",
        "Time Source": "NTP",
        "Time Wander": -0.008,
        "Use NTP": "true",
        "Unit Number": 2,
        "Unit Name": "Junkers",
        "Uptime": 48289,
        "Uptime (ms)": 2898014684,
        "Last Boot Cause": "Exception",
        "Reset Reason": "Exception",
        "CPU Eco Mode": "true",
        "Heap Max Free Block": 6960,
        "Heap Fragmentation": 38,
        "Free RAM": 11288,
        "Free Stack": 3520,
        "ESP Chip Model": "ESP8266",
        "Sunrise": "7:08",
        "Sunset": "19:15",
        "Timezone Offset": 60,
        "Latitude": 0.00,
        "Longitude": 0.00,
        "Syslog Log Level": "None",
        "Serial Log Level": "None",
        "Web Log Level": "None"
    },
    "WiFi": {
        "Hostname": "Heating",
        "IP Address": "IP2",
        "RSSI": -26
    },
    "nodes": [
        {
            "nr": 1,
            "name": "Main",
            "ip": "IP1",
        }, {
            "nr": 2,
            "name": "Heating",
            "ip": "IP2",
        }, {
            "nr": 3,
            "name": "Bedroom",
            "ip": "IP3",
        }, {
            "nr": 4,
            "name": "NeoPixel",
            "ip": "IP4",
        }],
    "Sensors": [
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "setpoint",
                    "NrDecimals": 1,
                    "Value": 20.5
                },
                {
                    "ValueNumber": 2,
                    "Name": "heating",
                    "NrDecimals": 0,
                    "Value": 1
                },
                {
                    "ValueNumber": 3,
                    "Name": "mode",
                    "NrDecimals": 0,
                    "Value": 1
                },
                {
                    "ValueNumber": 4,
                    "Name": "timeout",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 30,
            "Type": "Display - OLED SSD1306/SH1106 Thermo",
            "TaskName": "Day",
            "TaskDeviceNumber": 109,
            "TaskEnabled": "true",
            "TaskNumber": 1
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "setpoint",
                    "NrDecimals": 1,
                    "Value": 18.5
                },
                {
                    "ValueNumber": 2,
                    "Name": "heating",
                    "NrDecimals": 0,
                    "Value": 0
                },
                {
                    "ValueNumber": 3,
                    "Name": "mode",
                    "NrDecimals": 0,
                    "Value": 1
                },
                {
                    "ValueNumber": 4,
                    "Name": "timeout",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 30,
            "Type": "Display - OLED SSD1306/SH1106 Thermo",
            "TaskName": "Night",
            "TaskDeviceNumber": 109,
            "TaskEnabled": "false",
            "TaskNumber": 2
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "⇩?C",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 2,
                    "Name": "⇧?C",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "Boost",
                    "NrDecimals": 0,
                    "Value": 0
                },
                {
                    "ValueNumber": 4,
                    "Name": "Day",
                    "NrDecimals": 0,
                    "Value": 1
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "dButtons",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 3
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "btnState",
                    "NrDecimals": 0,
                    "Value": 1
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch input - Switch",
            "TaskName": "RelayXX",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 4
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Value",
                    "NrDecimals": 0,
                    "Value": 29
                },
                {
                    "ValueNumber": 2,
                    "Name": "Result",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "countXX",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 5
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Counter",
                    "NrDecimals": 0,
                    "Value": 29
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch Input - Rotary Encoder",
            "TaskName": "RotaryXX",
            "TaskDeviceNumber": 59,
            "TaskEnabled": "true",
            "TaskNumber": 6
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature?°C",
                    "NrDecimals": 1,
                    "Value": 20.1
                },
                {
                    "ValueNumber": 2,
                    "Name": "Setpoint?°C",
                    "NrDecimals": 1,
                    "Value": 20.5
                },
                {
                    "ValueNumber": 3,
                    "Name": "Humidity?H",
                    "NrDecimals": 0,
                    "Value": 43
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "bigValC",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 7
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature",
                    "NrDecimals": 1,
                    "Value": 20.1
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity",
                    "NrDecimals": 0,
                    "Value": 43
                },
                {
                    "ValueNumber": 3,
                    "Name": "Pressure",
                    "NrDecimals": 2,
                    "Value": 1024.84
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "true"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 10,
            "Type": "Environment - BMx280",
            "TaskName": "sensorXX",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "true",
            "TaskNumber": 8
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "State",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch input - Switch",
            "TaskName": "ButtonXX",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 9
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "DayMode",
                    "NrDecimals": 4,
                    "Value": 430.1280
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "tSlider",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 10
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Output",
                    "NrDecimals": 0,
                    "Value": 1
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Regulator - Level Control",
            "TaskName": "timekeepXX",
            "TaskDeviceNumber": 21,
            "TaskEnabled": "true",
            "TaskNumber": 11
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature",
                    "NrDecimals": 2,
                    "Value": 23.41
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity",
                    "NrDecimals": 2,
                    "Value": 43.24
                },
                {
                    "ValueNumber": 3,
                    "Name": "Pressure",
                    "NrDecimals": 2,
                    "Value": 1024.19
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Environment - BMx280",
            "TaskName": "Sensor",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "false",
            "TaskNumber": 12
        }
    ],
    "TTL": 1000
}
var IP3 = {
    "System": {
        "Load": 5.06,
        "Load LC": 488,
        "Build": 20116,
        "Git Build": "My Build: Jul 18 2022 17:46:16",
        "System Libraries": "ESP82xx Core 2843a5ac, NONOS SDK 2.2.2-dev(38a443e), LWIP: 2.1.2 PUYA support",
        "Plugin Count": 10,
        "Plugin Description": "[IR]",
        "Local Time": "2023-01-27 11:15:38",
        "Time Source": "NTP",
        "Time Wander": 0.004,
        "Use NTP": "true",
        "Unit Number": 3,
        "Unit Name": "Bedroom",
        "Uptime": 12830,
        "Uptime (ms)": 769912219,
        "Last Boot Cause": "Cold Boot",
        "Reset Reason": "Power On",
        "CPU Eco Mode": "true",
        "Free RAM": 14448,
        "Free Stack": 3568,
        "Sunrise": "7:08",
        "Sunset": "19:15",
        "Timezone Offset": 60,
        "Latitude": 0.00,
        "Longitude": 0.00
    },
    "WiFi": {
        "Hostname": "Bedroom",
        "IP Address": "IP3",
        "RSSI": -47
    },
    "nodes": [
        {
            "nr": 1,
            "name": "Main",
            "ip": "IP1",
        }, {
            "nr": 2,
            "name": "Heating",
            "ip": "IP2",
        }, {
            "nr": 3,
            "name": "Bedroom",
            "ip": "IP3",
        }, {
            "nr": 4,
            "name": "NeoPixel",
            "ip": "IP4",
        }],
    "Sensors": [
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "State",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Switch input - Switch",
            "TaskName": "ButtonXX",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 1
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "btnState",
                    "NrDecimals": 0,
                    "Value": 0
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 2,
            "Type": "Switch input - Switch",
            "TaskName": "Relay",
            "TaskDeviceNumber": 1,
            "TaskEnabled": "true",
            "TaskNumber": 2
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "IR",
                    "NrDecimals": 0,
                    "Value": 2104
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Communication - IR Receive (TSOP4838)",
            "TaskName": "irXX",
            "TaskDeviceNumber": 16,
            "TaskEnabled": "true",
            "TaskNumber": 4
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "Pressure",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Environment - BMx280",
            "TaskName": "sensor",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "false",
            "TaskNumber": 8
        },
        {
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "Sensor",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "false",
            "TaskNumber": 9
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature?°C",
                    "NrDecimals": 1,
                    "Value": 19.7
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity?H",
                    "NrDecimals": 0,
                    "Value": 55
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "true"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Environment - DHT11/12/22  SONOFF2301/7021",
            "TaskName": "bigVal",
            "TaskDeviceNumber": 5,
            "TaskEnabled": "true",
            "TaskNumber": 11
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Temperature",
                    "NrDecimals": 2,
                    "Value": 23.36
                },
                {
                    "ValueNumber": 2,
                    "Name": "Humidity",
                    "NrDecimals": 2,
                    "Value": 43.19
                },
                {
                    "ValueNumber": 3,
                    "Name": "Pressure",
                    "NrDecimals": 2,
                    "Value": 1024.21
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Environment - BMx280",
            "TaskName": "Sensor",
            "TaskDeviceNumber": 28,
            "TaskEnabled": "false",
            "TaskNumber": 12
        }
    ],
    "TTL": 1000
}
var IP4 = {
    "System": {
        "Load": 3.63,
        "Load LC": 9026,
        "Build": 20230126,
        "Git Build": "pygit2_not_installed",
        "System Libraries": "ESP82xx Core 2843a5ac, NONOS SDK 2.2.2-dev(38a443e), LWIP: 2.1.2 PUYA support",
        "Plugin Count": 52,
        "Plugin Description": "[Normal][NeoPixel][No Debug Log]",
        "Build Time": "Jan 26 2023 21:33:24",
        "Binary Filename": "ESP_Easy_mega_20230126_neopixel_ESP8266_4M1M",
        "Local Time": "2023-01-27 08:05:20",
        "Time Source": "ESPEasy p2p (66)",
        "Time Wander": 38.6,
        "Use NTP": "false",
        "Unit Number": 4,
        "Unit Name": "NeoPixel",
        "Uptime": 543,
        "Uptime (ms)": 32620313,
        "Last Boot Cause": "Soft Reboot",
        "Reset Reason": "Software/System restart",
        "CPU Eco Mode": "false",
        "Free RAM": 11864,
        "Free Stack": 3552,
        "ESP Chip Model": "ESP8266",
        "Sunrise": "6:08",
        "Sunset": "18:15",
        "Timezone Offset": 0,
        "Latitude": 0.00,
        "Longitude": 0.00,
        "Syslog Log Level": "None",
        "Serial Log Level": "Info",
        "Web Log Level": "None"
    },
    "WiFi": {
        "Hostname": "NeoPixel",
        "IP Address": "IP4",
        "RSSI": -61
    },
    "nodes": [
        {
            "nr": 1,
            "name": "Main",
            "ip": "IP1",
        }, {
            "nr": 2,
            "name": "Heating",
            "ip": "IP2",
        }, {
            "nr": 3,
            "name": "Bedroom",
            "ip": "IP3",
        }, {
            "nr": 4,
            "name": "NeoPixel",
            "ip": "IP4",
        }],
    "Sensors": [
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Mode",
                    "NrDecimals": 0,
                    "Value": 0
                },
                {
                    "ValueNumber": 2,
                    "Name": "Lastmode",
                    "NrDecimals": 0,
                    "Value": 0
                },
                {
                    "ValueNumber": 3,
                    "Name": "Fadetime",
                    "NrDecimals": 0,
                    "Value": 1000
                },
                {
                    "ValueNumber": 4,
                    "Name": "Fadedelay",
                    "NrDecimals": 0,
                    "Value": 20
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Output - NeoPixel (BusFX)",
            "TaskName": "rXX",
            "TaskDeviceNumber": 128,
            "TaskEnabled": "true",
            "TaskNumber": 1
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "h",
                    "NrDecimals": 2,
                    "Value": 306.00
                },
                {
                    "ValueNumber": 2,
                    "Name": "s",
                    "NrDecimals": 2,
                    "Value": 21.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "v",
                    "NrDecimals": 2,
                    "Value": 56.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "neoPixel",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 2
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Enable",
                    "NrDecimals": 2,
                    "Value": 1.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "dButtons",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 3
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Task1",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 2,
                    "Name": "Task2",
                    "NrDecimals": 2,
                    "Value": 0.00
                },
                {
                    "ValueNumber": 3,
                    "Name": "Task3",
                    "NrDecimals": 2,
                    "Value": 0.00
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 0,
            "Type": "Generic - Dummy Device",
            "TaskName": "dButtons2",
            "TaskDeviceNumber": 33,
            "TaskEnabled": "true",
            "TaskNumber": 4
        },
        {
            "TaskValues": [
                {
                    "ValueNumber": 1,
                    "Name": "Color",
                    "NrDecimals": 0,
                    "Value": 16666624
                },
                {
                    "ValueNumber": 2,
                    "Name": "Brightness",
                    "NrDecimals": 0,
                    "Value": 255
                },
                {
                    "ValueNumber": 3,
                    "Name": "Type",
                    "NrDecimals": 0,
                    "Value": 2
                }],
            "DataAcquisition": [
                {
                    "Controller": 1,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 2,
                    "IDX": 0,
                    "Enabled": "false"
                },
                {
                    "Controller": 3,
                    "IDX": 0,
                    "Enabled": "false"
                }],
            "TaskInterval": 60,
            "Type": "Output - NeoPixel (Candle)",
            "TaskName": "zXX",
            "TaskDeviceNumber": 42,
            "TaskDeviceGPIO1": 2,
            "TaskEnabled": "false",
            "TaskNumber": 5
        }
    ],
    "TTL": 1000
}