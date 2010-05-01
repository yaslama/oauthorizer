
const wpl = Components.interfaces.nsIWebProgressListener;

function closeWindow ()
{
  window.arguments[1].call(null, null);		
  window.close();
}

function doneAuthorizing(oauth_verifier)
{
  window.arguments[1].call(null, oauth_verifier);		
  window.close();
}

var reporterListener = {
  _isBusy: false,
  get statusMeter() {
    delete this.statusMeter;
    return this.statusMeter = document.getElementById("statusbar-icon");
  },
  get securityButton() {
    delete this.securityButton;
    return this.securityButton = document.getElementById("security-button");
  },
  get securityLabel() {
    delete this.securityLabel;
    return this.securityLabel = document.getElementById("security-status");
  },
  get securityDisplay() {
    delete this.securityDisplay;
    return this.securityDisplay = document.getElementById("security-display");
  },
  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener)   ||
        aIID.equals(Components.interfaces.nsIWebProgressListener2)  ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },
  onStateChange: function(/*in nsIWebProgress*/ aWebProgress,
                     /*in nsIRequest*/ aRequest,
                     /*in unsigned long*/ aStateFlags,
                     /*in nsresult*/ aStatus) {
    if (aStateFlags & wpl.STATE_START &&
        aStateFlags & wpl.STATE_IS_NETWORK) {
      this.statusMeter.value = 0;
      this.statusMeter.parentNode.collapsed = false;
      this.securityLabel.collapsed = true;
    }
    else if (aStateFlags & wpl.STATE_STOP &&
             aStateFlags & wpl.STATE_IS_NETWORK) {
      this.statusMeter.parentNode.collapsed = true;
      this.securityLabel.collapsed = false;
    }
  },

  onProgressChange: function(/*in nsIWebProgress*/ aWebProgress,
                        /*in nsIRequest*/ aRequest,
                        /*in long*/ aCurSelfProgress,
                        /*in long */aMaxSelfProgress,
                        /*in long */aCurTotalProgress,
                        /*in long */aMaxTotalProgress) {
    if (aMaxTotalProgress > 0) {
      let percentage = (aCurTotalProgress * 100) / aMaxTotalProgress;
      this.statusMeter.value = percentage;
    }
  },

  onLocationChange: function(/*in nsIWebProgress*/ aWebProgress,
                        /*in nsIRequest*/ aRequest,
                        /*in nsIURI*/ aLocation) {
    // XXX this needs to be cleaned up to handle differences better, the
    // callback url should be configurable as well
    this.securityDisplay.setAttribute('label', aLocation.host);
    if (aLocation.host.indexOf('oauthcallback.local') >= 0) {
      // OAuth 1.0
      var oauth_verifier = /oauth_verifier=([^&]*)/gi.exec(aLocation.spec);
      if (oauth_verifier) {
        doneAuthorizing(oauth_verifier[1]);
      }
      // OAuth 2.0
      var oauth_code = /#access_token=([^&]*)/gi.exec(aLocation.spec);
      if (oauth_code) {
        doneAuthorizing(oauth_code[1]);
      }
    }
  },

  onStatusChange: function(/*in nsIWebProgress*/ aWebProgress,
                      /*in nsIRequest*/ aRequest,
                      /*in nsresult*/ aStatus,
                      /*in wstring*/ aMessage) {
  },

  onSecurityChange: function(/*in nsIWebProgress*/ aWebProgress,
                        /*in nsIRequest*/ aRequest,
                        /*in unsigned long*/ aState) {
    const wpl_security_bits = wpl.STATE_IS_SECURE |
                              wpl.STATE_IS_BROKEN |
                              wpl.STATE_IS_INSECURE |
                              wpl.STATE_SECURE_HIGH |
                              wpl.STATE_SECURE_MED |
                              wpl.STATE_SECURE_LOW;
    var browser = document.getElementById("oauth_loginFrame");
    var level;
    
    switch (aState & wpl_security_bits) {
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_HIGH:
        level = "high";
        break;
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_MED:
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_LOW:
        level = "low";
        break;
      case wpl.STATE_IS_BROKEN:
        level = "broken";
        break;
    }
    if (level) {
      this.securityButton.setAttribute("level", level);
      this.securityButton.hidden = false;
      this.securityLabel.setAttribute("label", browser.securityUI.tooltipText);
    } else {
      this.securityButton.hidden = true;
      this.securityButton.removeAttribute("level");
    }
    this.securityButton.setAttribute("tooltiptext", browser.securityUI.tooltipText);
  },
  onProgressChange64: function() {
    return this.onProgressChange(aWebProgress, aRequest,
      aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress,
      aMaxTotalProgress);
  },
  onRefreshAttempted: function() {
    return true;
  }
}


function loadLoginFrame()
{
  var browser = document.getElementById("oauth_loginFrame");
  browser.addProgressListener(reporterListener, wpl.NOTIFY_ALL);
  var url = window.arguments[0];
  if (url != "") {
    window.setTimeout(function(url) {
          browser.setAttribute("src", url);
    }, 2000, url);
  }
}
