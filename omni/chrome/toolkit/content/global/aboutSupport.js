//@line 38 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

const ELLIPSIS = Services.prefs.getComplexValue("intl.ellipsis",
                                                Ci.nsIPrefLocalizedString).data;

// We use a preferences whitelist to make sure we only show preferences that
// are useful for support and won't compromise the user's privacy.  Note that
// entries are *prefixes*: for example, "accessibility." applies to all prefs
// under the "accessibility.*" branch.
const PREFS_WHITELIST = [
  "accessibility.",
  "browser.display.",
  "browser.fixup.",
  "browser.history_expire_",
  "browser.link.open_newwindow",
  "browser.places.",
  "browser.startup.homepage",
  "browser.tabs.",
  "browser.zoom.",
  "dom.",
  "extensions.checkCompatibility",
  "extensions.lastAppVersion",
  "font.",
  "general.autoScroll",
  "general.useragent.",
  "gfx.",
  "html5.",
  "layers.",
  "javascript.",
  "keyword.",
  "layout.css.dpi",
  "mousewheel.",
  "network.",
  "permissions.default.image",
  "places.",
  "plugin.",
  "plugins.",
  "print.",
  "privacy.",
  "security.",
  "webgl."
];

// The blacklist, unlike the whitelist, is a list of regular expressions.
const PREFS_BLACKLIST = [
  /^network[.]proxy[.]/,
  /[.]print_to_filename$/,
];

window.onload = function () {
  // Get the support URL.
  let urlFormatter = Cc["@mozilla.org/toolkit/URLFormatterService;1"]
                       .getService(Ci.nsIURLFormatter);
  let supportUrl = urlFormatter.formatURLPref("app.support.baseURL");

  // Update the application basics section.
  document.getElementById("application-box").textContent = Services.appinfo.name;
  document.getElementById("useragent-box").textContent = navigator.userAgent;
  document.getElementById("supportLink").href = supportUrl;
  let version = Services.appinfo.version;
  try {
    version += " (" + Services.prefs.getCharPref("app.support.vendor") + ")";
  } catch (e) {
  }
  document.getElementById("version-box").textContent = version;

  // Update the other sections.
  populatePreferencesSection();
  populateExtensionsSection();
  populateGraphicsSection();
}

function populateExtensionsSection() {
  AddonManager.getAddonsByTypes(["extension"], function(extensions) {
    extensions.sort(function(a,b) {
      if (a.isActive != b.isActive)
        return b.isActive ? 1 : -1;
      let lc = a.name.localeCompare(b.name);
      if (lc != 0)
        return lc;
      if (a.version != b.version)
        return a.version > b.version ? 1 : -1;
      return 0;
    });
    let trExtensions = [];
    for (let i = 0; i < extensions.length; i++) {
      let extension = extensions[i];
      let tr = createParentElement("tr", [
        createElement("td", extension.name),
        createElement("td", extension.version),
        createElement("td", extension.isActive),
        createElement("td", extension.id),
      ]);
      trExtensions.push(tr);
    }
    appendChildren(document.getElementById("extensions-tbody"), trExtensions);
  });
}

function populatePreferencesSection() {
  let modifiedPrefs = getModifiedPrefs();

  function comparePrefs(pref1, pref2) {
    if (pref1.name < pref2.name)
      return -1;
    if (pref1.name > pref2.name)
      return 1;
    return 0;
  }

  let sortedPrefs = modifiedPrefs.sort(comparePrefs);

  let trPrefs = [];
  sortedPrefs.forEach(function (pref) {
    let tdName = createElement("td", pref.name, "pref-name");
    let tdValue = createElement("td", formatPrefValue(pref.value), "pref-value");
    let tr = createParentElement("tr", [tdName, tdValue]);
    trPrefs.push(tr);
  });

  appendChildren(document.getElementById("prefs-tbody"), trPrefs);
}

function populateGraphicsSection() {
  function createHeader(name)
  {
    let elem = createElement("th", name);
    elem.className = "column";
    return elem;
  }

  function pushInfoRow(table, name, value)
  {
    if(value) {
      table.push(createParentElement("tr", [
        createHeader(bundle.GetStringFromName(name)),
        createElement("td", value),
      ]));
    }
  }

  function errorMessageForFeature(feature) {
    var errorMessage;
    var status;
    try {
      status = gfxInfo.getFeatureStatus(feature);
    } catch(e) {}
    switch (status) {
      case gfxInfo.FEATURE_BLOCKED_DEVICE:
      case gfxInfo.FEATURE_DISCOURAGED:
        errorMessage = bundle.GetStringFromName("blockedGfxCard");
        break;
      case gfxInfo.FEATURE_BLOCKED_OS_VERSION:
        errorMessage = bundle.GetStringFromName("blockedOSVersion");
        break;
      case gfxInfo.FEATURE_BLOCKED_DRIVER_VERSION:
        var suggestedDriverVersion;
        try {
          suggestedDriverVersion = gfxInfo.getFeatureSuggestedDriverVersion(feature);
        } catch(e) {}
        if (suggestedDriverVersion)
          errorMessage = bundle.formatStringFromName("tryNewerDriver", [suggestedDriverVersion], 1);
        else
          errorMessage = bundle.GetStringFromName("blockedDriver");
        break;
    }
    return errorMessage;
  }

  function pushFeatureInfoRow(table, name, feature, isEnabled, message) {
    message = message || isEnabled;
    if (!isEnabled) {
      var errorMessage = errorMessageForFeature(feature);
      if (errorMessage)
        message = errorMessage;
    }
    table.push(createParentElement("tr", [
      createHeader(bundle.GetStringFromName(name)),
      createElement("td", message),
    ]));
  }

  function hexValueToString(value)
  {
    return value
           ? String('0000' + value.toString(16)).slice(-4)
           : null;
  }

  let bundle = Services.strings.createBundle("chrome://global/locale/aboutSupport.properties");
  let graphics_tbody = document.getElementById("graphics-tbody");

  var gfxInfo = null;
  try {
    // nsIGfxInfo is currently only implemented on Windows
    gfxInfo = Cc["@mozilla.org/gfx/info;1"].getService(Ci.nsIGfxInfo);
  } catch(e) {}

  if (gfxInfo) {
    let trGraphics = [];
    pushInfoRow(trGraphics, "adapterDescription", gfxInfo.adapterDescription);
    pushInfoRow(trGraphics, "adapterVendorID", hexValueToString(gfxInfo.adapterVendorID));
    pushInfoRow(trGraphics, "adapterDeviceID", hexValueToString(gfxInfo.adapterDeviceID));
    pushInfoRow(trGraphics, "adapterRAM", gfxInfo.adapterRAM);
    pushInfoRow(trGraphics, "adapterDrivers", gfxInfo.adapterDriver);
    pushInfoRow(trGraphics, "driverVersion", gfxInfo.adapterDriverVersion);
    pushInfoRow(trGraphics, "driverDate", gfxInfo.adapterDriverDate);

//@line 288 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"

    var webglrenderer;
    var webglenabled;
    try {
      webglrenderer = gfxInfo.getWebGLParameter("full-renderer");
      webglenabled = true;
    } catch (e) {
      webglrenderer = false;
      webglenabled = false;
    }
//@line 306 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"
    var webglfeature = gfxInfo.FEATURE_WEBGL_OPENGL;
//@line 308 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"
    pushFeatureInfoRow(trGraphics, "webglRenderer", webglfeature, webglenabled, webglrenderer);

    appendChildren(graphics_tbody, trGraphics);
   
    // display any failures that have occurred
    let graphics_failures_tbody = document.getElementById("graphics-failures-tbody");
    let trGraphicsFailures = gfxInfo.getFailures().map(function (value)
        createParentElement("tr", [
            createElement("td", value)
        ])
    );
    appendChildren(graphics_failures_tbody, trGraphicsFailures);

  } // end if (gfxInfo)

  let windows = Services.ww.getWindowEnumerator();
  let acceleratedWindows = 0;
  let totalWindows = 0;
  let mgrType;
  while (windows.hasMoreElements()) {
    totalWindows++;

    let awindow = windows.getNext().QueryInterface(Ci.nsIInterfaceRequestor);
    let windowutils = awindow.getInterface(Ci.nsIDOMWindowUtils);
    if (windowutils.layerManagerType != "Basic") {
      acceleratedWindows++;
      mgrType = windowutils.layerManagerType;
    }
  }

  let msg = acceleratedWindows + "/" + totalWindows;
  if (acceleratedWindows) {
    msg += " " + mgrType;
  } else {
//@line 345 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"
    var feature = gfxInfo.FEATURE_OPENGL_LAYERS;
//@line 347 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"
    var errMsg = errorMessageForFeature(feature);
    if (errMsg)
      msg += ". " + errMsg;
  }

  appendChildren(graphics_tbody, [
    createParentElement("tr", [
      createHeader(bundle.GetStringFromName("acceleratedWindows")),
      createElement("td", msg),
    ])
  ]);
}

function getPrefValue(aName) {
  let value = "";
  let type = Services.prefs.getPrefType(aName);
  switch (type) {
    case Ci.nsIPrefBranch2.PREF_STRING:
      value = Services.prefs.getComplexValue(aName, Ci.nsISupportsString).data;
      break;
    case Ci.nsIPrefBranch2.PREF_BOOL:
      value = Services.prefs.getBoolPref(aName);
      break;
    case Ci.nsIPrefBranch2.PREF_INT:
      value = Services.prefs.getIntPref(aName);
      break;
  }

  return { name: aName, value: value };
}

function formatPrefValue(prefValue) {
  // Some pref values are really long and don't have spaces.  This can cause
  // problems when copying and pasting into some WYSIWYG editors.  In general
  // the exact contents of really long pref values aren't particularly useful,
  // so we truncate them to some reasonable length.
  let maxPrefValueLen = 120;
  let text = "" + prefValue;
  if (text.length > maxPrefValueLen)
    text = text.substring(0, maxPrefValueLen) + ELLIPSIS;
  return text;
}

function getModifiedPrefs() {
  // We use the low-level prefs API to identify prefs that have been
  // modified, rather that Application.prefs.all since the latter is
  // much, much slower.  Application.prefs.all also gets slower each
  // time it's called.  See bug 517312.
  let prefNames = getWhitelistedPrefNames();
  let prefs = [getPrefValue(prefName)
                      for each (prefName in prefNames)
                          if (Services.prefs.prefHasUserValue(prefName)
                            && !isBlacklisted(prefName))];
  return prefs;
}

function getWhitelistedPrefNames() {
  let results = [];
  PREFS_WHITELIST.forEach(function (prefStem) {
    let prefNames = Services.prefs.getChildList(prefStem);
    results = results.concat(prefNames);
  });
  return results;
}

function isBlacklisted(prefName) {
  return PREFS_BLACKLIST.some(function (re) re.test(prefName));
}

function createParentElement(tagName, childElems) {
  let elem = document.createElement(tagName);
  appendChildren(elem, childElems);
  return elem;
}

function createElement(tagName, textContent, opt_class) {
  let elem = document.createElement(tagName);
  elem.textContent = textContent;
  elem.className = opt_class || "";
  return elem;
}

function appendChildren(parentElem, childNodes) {
  for (let i = 0; i < childNodes.length; i++)
    parentElem.appendChild(childNodes[i]);
}

function copyContentsToClipboard() {
  // Get the HTML and text representations for the important part of the page.
  let contentsDiv = document.getElementById("contents");
  let dataHtml = contentsDiv.innerHTML;
  let dataText = createTextForElement(contentsDiv);

  // We can't use plain strings, we have to use nsSupportsString.
  let supportsStringClass = Cc["@mozilla.org/supports-string;1"];
  let ssHtml = supportsStringClass.createInstance(Ci.nsISupportsString);
  let ssText = supportsStringClass.createInstance(Ci.nsISupportsString);

  let transferable = Cc["@mozilla.org/widget/transferable;1"]
                       .createInstance(Ci.nsITransferable);

  // Add the HTML flavor.
  transferable.addDataFlavor("text/html");
  ssHtml.data = dataHtml;
  transferable.setTransferData("text/html", ssHtml, dataHtml.length * 2);

  // Add the plain text flavor.
  transferable.addDataFlavor("text/unicode");
  ssText.data = dataText;
  transferable.setTransferData("text/unicode", ssText, dataText.length * 2);

  // Store the data into the clipboard.
  let clipboard = Cc["@mozilla.org/widget/clipboard;1"]
                    .getService(Ci.nsIClipboard);
  clipboard.setData(transferable, null, clipboard.kGlobalClipboard);
}

// Return the plain text representation of an element.  Do a little bit
// of pretty-printing to make it human-readable.
function createTextForElement(elem) {
  // Generate the initial text.
  let textFragmentAccumulator = [];
  generateTextForElement(elem, "", textFragmentAccumulator);
  let text = textFragmentAccumulator.join("");

  // Trim extraneous whitespace before newlines, then squash extraneous
  // blank lines.
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n\n\n+/g, "\n\n");

  // Actual CR/LF pairs are needed for some Windows text editors.
//@line 481 "/builds/slave/rel-m-esr10-lnx-bld/build/toolkit/content/aboutSupport.js"

  return text;
}

function generateTextForElement(elem, indent, textFragmentAccumulator) {
  // Add a little extra spacing around most elements.
  if (elem.tagName != "td")
    textFragmentAccumulator.push("\n");

  // Generate the text representation for each child node.
  let node = elem.firstChild;
  while (node) {

    if (node.nodeType == Node.TEXT_NODE) {
      // Text belonging to this element uses its indentation level.
      generateTextForTextNode(node, indent, textFragmentAccumulator);
    }
    else if (node.nodeType == Node.ELEMENT_NODE) {
      // Recurse on the child element with an extra level of indentation.
      generateTextForElement(node, indent + "  ", textFragmentAccumulator);
    }

    // Advance!
    node = node.nextSibling;
  }
}

function generateTextForTextNode(node, indent, textFragmentAccumulator) {
  // If the text node is the first of a run of text nodes, then start
  // a new line and add the initial indentation.
  let prevNode = node.previousSibling;
  if (!prevNode || prevNode.nodeType == Node.TEXT_NODE)
    textFragmentAccumulator.push("\n" + indent);

  // Trim the text node's text content and add proper indentation after
  // any internal line breaks.
  let text = node.textContent.trim().replace("\n", "\n" + indent, "g");
  textFragmentAccumulator.push(text);
}

function openProfileDirectory() {
  // Get the profile directory.
  let currProfD = Services.dirsvc.get("ProfD", Ci.nsIFile);
  let profileDir = currProfD.path;

  // Show the profile directory.
  let nsLocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                           "nsILocalFile", "initWithPath");
  new nsLocalFile(profileDir).reveal();
}
