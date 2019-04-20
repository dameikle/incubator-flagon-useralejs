/* eslint-disable */

// these are default values, which can be overridden by the user on the options page
var userAleHost = 'http://localhost:8000';
var userAleScript = 'userale-0.2.1.min.js';
var toolUser = 'nobody';
var toolName = 'test_app';
var toolVersion = '0.1.0';

/* eslint-enable */

var prefix = 'USERALE_';

var CONFIG_CHANGE = prefix + 'CONFIG_CHANGE';
var ADD_LOG = prefix + 'ADD_LOG';

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Creates a function to normalize the timestamp of the provided event.
 * @param  {Object} e An event containing a timeStamp property.
 * @return {timeStampScale~tsScaler}   The timestamp normalizing function.
 */
function timeStampScale(e) {
  if (e.timeStamp && e.timeStamp > 0) {
    var delta = Date.now() - e.timeStamp;
    /**
     * Returns a timestamp depending on various browser quirks.
     * @param  {?Number} ts A timestamp to use for normalization.
     * @return {Number} A normalized timestamp.
     */
    var tsScaler;

    if (delta < 0) {
      tsScaler = function () {
        return e.timeStamp / 1000;
      };
    } else if (delta > e.timeStamp) {
      var navStart = performance.timing.navigationStart;
      tsScaler = function (ts) {
        return ts + navStart;
      };
    } else {
      tsScaler = function (ts) {
        return ts;
      };
    }
  } else {
    tsScaler = function () { return Date.now(); };
  }

  return tsScaler;
}

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Extract the millisecond and microsecond portions of a timestamp.
 * @param  {Number} timeStamp The timestamp to split into millisecond and microsecond fields.
 * @return {Object}           An object containing the millisecond
 *                            and microsecond portions of the timestamp.
 */
function extractTimeFields(timeStamp) {
  return {
    milli: Math.floor(timeStamp),
    micro: Number((timeStamp % 1).toFixed(3)),
  };
}

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var sendIntervalId = null;

/**
 * Initializes the log queue processors.
 * @param  {Array} logs   Array of logs to append to.
 * @param  {Object} config Configuration object to use when logging.
 */
function initSender(logs, config) {
  if (sendIntervalId !== null) {
    clearInterval(sendIntervalId);
  }

  sendIntervalId = sendOnInterval(logs, config);
  sendOnClose(logs, config);
}

/**
 * Checks the provided log array on an interval, flushing the logs
 * if the queue has reached the threshold specified by the provided config.
 * @param  {Array} logs   Array of logs to read from.
 * @param  {Object} config Configuration object to be read from.
 * @return {Number}        The newly created interval id.
 */
function sendOnInterval(logs, config) {
  return setInterval(function() {
    if (!config.on) {
      return;
    }

    if (logs.length >= config.logCountThreshold) {
      sendLogs(logs.slice(0), config.url, 0); // Send a copy
      logs.splice(0); // Clear array reference (no reassignment)
    }
  }, config.transmitInterval);
}

/**
 * Attempts to flush the remaining logs when the window is closed.
 * @param  {Array} logs   Array of logs to be flushed.
 * @param  {Object} config Configuration object to be read from.
 */
function sendOnClose(logs, config) {
  if (!config.on) {
    return;
  }

  if (navigator.sendBeacon) {
    window.addEventListener('unload', function() {
      navigator.sendBeacon(config.url, JSON.stringify(logs));
    });
  } else {
    window.addEventListener('beforeunload', function() {
      if (logs.length > 0) {
        sendLogs(logs, config.url, 1);
      }
    });
  }
}

/**
 * Sends the provided array of logs to the specified url,
 * retrying the request up to the specified number of retries.
 * @param  {Array} logs    Array of logs to send.
 * @param  {string} url     URL to send the POST request to.
 * @param  {Number} retries Maximum number of attempts to send the logs.
 */
function sendLogs(logs, url, retries) {
  var req = new XMLHttpRequest();

  var data = JSON.stringify(logs);

  req.open('POST', url);
  req.setRequestHeader('Content-type', 'application/json;charset=UTF-8');

  req.onreadystatechange = function() {
    if (req.readyState === 4 && req.status !== 200) {
      if (retries > 0) {
        sendLogs(logs, url, retries--);
      }
    }
  };

  req.send(data);
}

/*
 eslint-disable
 */

// inherent dependency on globals.js, loaded by the webext

// browser is defined in firefox, but not in chrome. In chrome, they use
// the 'chrome' global instead. Let's map it to browser so we don't have
// to have if-conditions all over the place.

var browser = browser || chrome;
var logs = [];
var config = {
  autostart: true,
  url: 'http://localhost:8000',
  transmitInterval: 5000,
  logCountThreshold: 5,
  userId: null,
  version: null,
  resolution: 500,
  time: timeStampScale({}),
  on: true,
};
var sessionId = 'session_' + Date.now();

var getTimestamp = ((typeof performance !== 'undefined') && (typeof performance.now !== 'undefined'))
  ? function () { return performance.now() + performance.timing.navigationStart; }
  : Date.now;

browser.storage.local.set({ sessionId: sessionId });

var store = browser.storage.local.get({
  userAleHost: userAleHost,
  userAleScript: userAleScript,
  toolUser: toolUser,
  toolName: toolName,
  toolVersion: toolVersion,
}, storeCallback);
        
function storeCallback(item) {
  config = Object.assign({}, config, {
    url: item.userAleHost,
    userId: item.toolUser,
    sessionID: sessionId,
    toolName: item.toolName,
    toolVersion: item.toolVersion
  });
  initSender(logs, config);
}

function dispatchTabMessage(message) {
  browser.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      browser.tabs.sendMessage(tab.id, message);
    });
  });
}

function packageBrowserLog(type, logDetail) {
  var timeFields = extractTimeFields(getTimestamp());

  logs.push({
    'target' : null,
    'path' : null,
    'clientTime' : timeFields.milli,
    'microTime' : timeFields.micro,
    'location' : null,
    'type' : 'browser.' + type,
    'logType': 'raw',
    'userAction' : true,
    'details' : logDetail,
    'userId' : toolUser,
    'toolVersion': null,
    'toolName': null,
    'useraleVersion': null,
    'sessionID': sessionId,
  });
}

browser.runtime.onMessage.addListener(function (message) {
  switch (message.type) {
    case CONFIG_CHANGE:
      (function () {
        var updatedConfig = Object.assign({}, config, {
          url: message.payload.userAleHost,
          userId: message.payload.toolUser,
          toolName: message.payload.toolName,
          toolVersion: message.payload.toolVersion
        });
        initSender(logs, updatedConfig);
        dispatchTabMessage(message);
      })();
      break;

    case ADD_LOG:
      (function () {
        logs.push(message.payload);
      })();
      break;

    default:
      console.log('got unknown message type ', message);
  }
});

function getTabDetailById(tabId, onReady) {
  browser.tabs.get(tabId, function (tab) {
    onReady({
      active: tab.active,
      audible: tab.audible,
      incognito: tab.incognito,
      index: tab.index,
      muted: tab.mutedInfo ? tab.mutedInfo.muted : null,
      pinned: tab.pinned,
      selected: tab.selected,
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId,
    });
  });
}

browser.tabs.onActivated.addListener(function (e) {
  getTabDetailById(e.tabId, function (detail) {
    packageBrowserLog('tabs.onActivated', detail);
  });
});

browser.tabs.onCreated.addListener(function (tab, e) {
  packageBrowserLog('tabs.onCreated', {
    active: tab.active,
    audible: tab.audible,
    incognito: tab.incognito,
    index: tab.index,
    muted: tab.mutedInfo ? tab.mutedInfo.muted : null,
    pinned: tab.pinned,
    selected: tab.selected,
    tabId: tab.id,
    title: tab.title,
    url: tab.url,
    windowId: tab.windowId,
  });
});

browser.tabs.onDetached.addListener(function (tabId) {
  getTabDetailById(tabId, function (detail) {
    packageBrowserLog('tabs.onDetached', detail);
  });
});

browser.tabs.onMoved.addListener(function (tabId) {
  getTabDetailById(tabId, function (detail) {
    packageBrowserLog('tabs.onMoved', detail);
  });
});

browser.tabs.onRemoved.addListener(function (tabId) {
  packageBrowserLog('tabs.onRemoved', { tabId: tabId });
});

browser.tabs.onZoomChange.addListener(function (e) {
  getTabDetailById(e.tabId, function (detail) {
    packageBrowserLog('tabs.onZoomChange', Object.assign({}, {
      oldZoomFactor: e.oldZoomFactor,
      newZoomFactor: e.newZoomFactor,
    }, detail));
  });
});

/*
 eslint-enable
 */
