// $Id$

"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://services-sync/async.js");
Components.utils.import("resource://services-sync/record.js");
Components.utils.import("resource://services-sync/main.js");

var EXPORTED_SYMBOLS = [ "SyncUtil", "SyncError", "SyncStringBundle" ];

var Logging = null;

function SyncError(txt, level) {
  if (level === undefined) level = 0
  this.message = txt;
  this.name    = "SyncError";
  let info = Logging.callerInfo(level+1);
  for (let p in info)
    this[p] = info[p];
}
SyncError.prototype = new Error();
SyncError.prototype.constructor = SyncError;

function SyncStringBundle(engname, rscname) {
  this.load(engname, rscname);
}

SyncStringBundle.prototype = {
  _bundle: null,
  load: function SSB_load(engname, rscname) {
    rscname = rscname || engname;
    this._bundle = Services.strings.createBundle("chrome://"+rscname+"/locale/"+engname+".properties");
  },
  
  get: function SSB_get(key) {
    return this._bundle.GetStringFromName(key);
  }
};

var SyncUtil = {
  setLogging: function SU_setLogging(obj) {
    Logging = obj;
  },
  
  sleep: function SU_sleep(time) {
    let cb = Async.makeSyncCallback();
    let timer = Components.classes["@mozilla.org/timer;1"]
                          .createInstance(Components.interfaces.nsITimer)
    timer.initWithCallback(cb, time, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    Async.waitForSyncCallback(cb);
  },

  yield: function SU_yield(storeObj) {
    this.sleep(0);
  },
  
  lockWeave: function SU_lockWeave(timeout) {
    timeout = timeout || 0;
    let start  = Date.now();
    do {
      let locked = Weave.Service.lock();
      if (locked) return true;
      this.yield();
    } while (Date.now()-start < timeout);
    return false;
  },
  
  assert: function SU_assert(cond, txt)
  {
    if (!cond)
      throw new SyncError(txt||"Assertion Error", 1);
  },

  unique: function SU_unique(arr) {
   let seen = {};
   return arr.filter(function(elt) {
     let ok = !seen[elt]; if (ok) seen[elt] = true;
     return ok;
   });
  },
  
  reEscape: function SU_reEscape(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  },
  
  arrayEqual: function SU_arrayEqual(l,r) {
    return (l==r) || !(l<r || l>r);
  },

  makeBackupFile: function(bakdir, basename, ext, age) {
    let now = new Date();
    if (bakdir.exists()) { // otherwise, must be created by caller...
      // Clean up old backups
      let dir = bakdir.directoryEntries;
      let bnpatt = this.reEscape(basename||"backup");
      let expatt = this.reEscape(ext||".bak");
      let patt   = new RegExp("^"+bnpatt+"-\\d{4}-\\d\\d-\\d\\d"+expatt);
      
      while (dir.hasMoreElements()) { // clean up old backups
        let f = dir.getNext().QueryInterface(Components.interfaces.nsIFile);
        if (patt.test(f.leafName)) {
          if (now.getTime()-f.lastModifiedTime > age) {
            f.remove(false); Logging.debug("removed backup: "+f.leafName);
          }
        }
      }
    }
    let file = bakdir.clone();
    file.append(now.toLocaleFormat(basename+"-%Y-%m-%d"+ext));
    return file;        
  },
  
  loggedCatch: function SU_loggedCatch(proto) {
    return function SU_loggedWrapper() {
      try { return proto.apply(this, arguments); }
      catch (exc) { Logging.logException(exc); throw exc; }
    }
  },
  
  errorLoggedClass: function SU_errorLoggedClass(clazz) {
    for (let func in clazz.prototype) {
      if (typeof clazz.prototype[func] == "function") {
        let get = clazz.prototype.__lookupGetter__(func);
        let set = clazz.prototype.__lookupSetter__(func);
        if (get)
          clazz.prototype__defineGetter__(func, this.loggedCatch(get));
        else if (set)
          clazz.prototype__defineSetter__(func, this.loggedCatch(set));
        else
          clazz.prototype[func] = this.loggedCatch(clazz.prototype[func]);
      }
    }
    return clazz;
  },
  
  // Maybe we can re-use this if we write another sync engine :)
  promptAndSync: function SU_promptAndSync(parent, engine, startPrompt, mergePrompt) {
    let eng = Weave.Engines.get(engine);
    SyncUtil.assert(!!eng, "Engine '"+engine+"' not registered");
    
    let wasLocked = Weave.Service.locked;
    if (!wasLocked) Weave.Service.lock();
    
    let strings          = new SyncStringBundle(engine);
    let deferredSyncCall = null;

    try {
      startPrompt      = startPrompt || "firstStartPrompt";
      mergePrompt      = mergePrompt || "mergePrompt";
      let cancelPrompt = " ("+strings.get("sameAsCancel")+")";
      let cancelChoice = -1;
      
      let choices = [ strings.get(mergePrompt),
                      strings.get("wipeClientPrompt"),
                      strings.get("wipeServerPrompt"),
                      strings.get("disablePrompt")
                    ];
      let disableChoice = choices.length-1;

      if      (startPrompt == "firstStartPrompt") cancelChoice = disableChoice;
      else if (startPrompt == "restoredPrompt")   cancelChoice = 0;
      
      if (cancelChoice >= 0) choices[cancelChoice] += cancelPrompt;

      let selected = {value: 0};
      let ok = Services.prompt.select(parent, // may be null on first start
                                      strings.get(engine),
                                      strings.get(startPrompt),
                                      choices.length, choices, selected);

      if      (!ok && cancelChoice >= 0) selected.value = cancelChoice;
      else if (!ok) return true;

      eng.enabled = (selected.value != disableChoice);

      if (!eng.enabled) { Logging.debug("Disabling sync"); return true; }

      switch (selected.value) {
        case 0: deferredSyncCall = function _resetClient() {
            Logging.debug("Merging data (waiting for sync)");
            Weave.Service.resetClient([eng.name]);
          }; break;
        case 1: deferredSyncCall = function _wipeClient() {
            Logging.debug("Wiping client");
            Weave.Service.wipeClient([eng.name]);
          }; break;
        case 2: deferredSyncCall = function _wipeServer() {
            Logging.debug("Wiping server");
            Weave.Service.resetClient([eng.name]);
            Weave.Service.wipeServer([eng.name]);
            Weave.Clients.sendCommand("wipeEngine", [eng.name]);
          }; break;
      }
    } finally {
      if (!wasLocked) Weave.Service.unlock();
    }
    // Call sync service after unlocking it
    if (deferredSyncCall) {
      try {
        SyncUtil.yield();

        if (eng.trackerInstance) // try to sync as soon as possible
          eng.trackerInstance.score += Weave.SCORE_INCREMENT_XLARGE;

        deferredSyncCall();

      } catch (exc) {
        Logging.logException(exc);
        Services.prompt.alert(parent, strings.get(engine), strings.get("syncError"));
        return false;
      }
    }
    return true;
  },

  // Bind this to a Record object!
  fixDecryptBug: function ___FIXME___(keyBundle) { 
    // FIXME: seems to be a bug in sync. On startup we get called from
    // canDecrypt() without collection or keyBundle)
    if (!this.collection && !keyBundle) {
      try { throw new SyncError("Trace!"); }
      catch (exc) { Logging.debug("FIXME: No collection or keyBundle: "+exc.stack); }
      return;
    }
    CryptoWrapper.prototype.decrypt.call(this, keyBundle);
  }

};


var SimpleLogging = {
  PFX:   "synclog: ",
  DEBUG: false,
  
  log:   function SL_log(  txt) { Services.console.logStringMessage(this.PFX + txt); },
  info:  function SL_info( txt) { this.log(txt); },
  debug: function SL_debug(txt) { if (this.DEBUG) this.log("DEBUG: "+txt); },
  warn:  function SL_warn( txt) { this.log("WARNING: "+txt); },
  error: function SL_eror( txt) { this.log("ERROR: "  +txt); },
  
  logException: function SL_logException(exc) { Components.utils.reportError(exc); },
  callerInfo:   function SL_callerInfo() {
    try { this.undef() } catch (exc) { return { stack: exc.stack }; }
    return {}; // shouldn't happen
  }
};

Logging = SimpleLogging;