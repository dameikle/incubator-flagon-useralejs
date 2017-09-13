/*
 eslint-disable
 */

import * as globals from './globals';
import * as MessageTypes from './messageTypes.js';

// inherent dependency on globals.js, loaded by the webext

// browser is defined in firefox, but not in chrome. In chrome, they use
// the 'chrome' global instead. Let's map it to browser so we don't have
// to have if-conditions all over the place.

var browser = browser || chrome;
        
function onError(error) {
  console.log(error);
}

browser.runtime.onMessage.addListener(function (message) {
  switch (message.type) {
    case MessageTypes.CONFIG_CHANGE:
      console.log('got config ', message.payload);
      break;
    default:
      console.log('got unknown message type ', message);
  }
});

/*
 eslint-enable
 */