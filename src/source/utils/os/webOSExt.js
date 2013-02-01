enyo.webOS = {};

enyo.requiresWindow(function() {
	if (window.PalmSystem) {
		PalmSystem.stageReady();
		enyo.webOS = {
			identifier: function(){
				var tokens = PalmSystem.identifier.split(" ");
				return {
					appID: tokens[0],
					process: tokens[1],
				};
			},
			launchParams: function() {
				return enyo.json.parse(PalmSystem.launchParams) || {};
			},
			deviceInfo: function(){
				return enyo.json.parse(PalmSystem.deviceInfo);
			},
			localeInfo: function(){
				return {
					locale: PalmSystem.locale,
					localeRegion: PalmSystem.localeRegion,
					phoneRegion: PalmSystem.phoneRegion
				};
			},
			isTwelveHourFormat: function(){
				return (PalmSystem.timeFormat === "HH12");
			},
			pasteClipboard: function(){
				PalmSystem.paste();
			},
			getWindowOrientation: function() {
				//Returns one of 'up', 'down', 'left' or 'right'.
				return PalmSystem.screenOrientation;
			},
			setWindowOrientation: function(inOrientation) {
				//inOrientation is one of 'up', 'down', 'left', 'right', or 'free'
				PalmSystem.setWindowOrientation(inOrientation);
			},
			setFullScreen: function(inMode) {
				PalmSystem.enableFullScreenMode(inMode);
			},
			indicateNewContent: function(hasNew) {
				if(enyo.webOS._throbId) {
					PalmSystem.removeNewContentIndicator(enyo.webOS._throbId);
					enyo.webOS._throbId = undefined;
				}
				if(hasNew) {
					enyo.webOS._throbId = PalmSystem.addNewContentIndicator();
				}		
			},
			isActivated: function(inWindow) {
				inWindow = inWindow || window;
				if(inWindow.PalmSystem) {
					return inWindow.PalmSystem.isActivated
				}
				return false;
			},
			activate: function(inWindow) {
				inWindow = inWindow || window;
				if(inWindow.PalmSystem) {
					inWindow.PalmSystem.activate();
				}
			},
			deactivate: function(inWindow) {
				inWindow = inWindow || window;
				if(inWindow.PalmSystem) {
					inWindow.PalmSystem.deactivate();
				}
			},
			addBannerMessage: function() {
				return PalmSystem.addBannerMessage.apply(PalmSystem, arguments);
			},
			removeBannerMessage: function(inId) {
				PalmSystem.removeBannerMessage.apply(PalmSystem, arguments);
			},
			setWindowProperties: function(inWindow, inProps) {
				if(arguments.length==1) {
					inProps = inWindow;
					inWindow = window;
				}
				if(inWindow.PalmSystem) {
					inWindow.PalmSystem.setWindowProperties(inProps);
				}
			},
	
			/** Searches _inText_ for URLs (web and mailto) and emoticons (if supported),
			 * and returns a new string with those entities replaced by HTML links and images
			 * (respectively).
			 *
			 * Passing false for an  _inOptions_ field will prevent LunaSysMgr from HTML-izing
			 * that text type.
			 *
			 * Default option values:
			 * 	{
			 * 		phoneNumber: true,
			 * 		emailAddress: true,
			 * 		webLink: true,
			 * 		schemalessWebLink: true,
			 * 		emoticon: true
			 * 	}
			 **/
			runTextIndexer: function(inText, inOptions){
				if (inText && inText.length > 0 && PalmSystem.runTextIndexer) {
					return PalmSystem.runTextIndexer(inText, inOptions);
				}
				return inText;
			},
			keyboard: undefined, //undefined unless a virtual keyboard is present
		};
		
		if(true) { //if device has a virtual keyboard, add functions
			Mojo = window.Mojo || {};
			Mojo.keyboardShown = function (inKeyboardShowing) {
				enyo.webOS.keyboard._isShowing = inKeyboardShowing;
				enyo.dispatch({type: "keyboardShown", showing: inKeyboardShowing});
			}

			enyo.webOS.keyboard = {
				types: {
					text: 0,
					password: 1,
					search: 2,
					range: 3,
					email: 4,
					number: 5,
					phone: 6,
					url: 7,
					color: 8
				},
				isShowing: function() {
					return enyo.webOS.keyboard._isShowing || false;
				},
				show: function(type){
					if(enyo.webOS.keyboard.isManualMode()) {
						PalmSystem.keyboardShow(type || 0);
					}
				},
				hide: function(){
					if(enyo.webOS.keyboard.isManualMode()) {
						PalmSystem.keyboardHide();
					}
				},
				setManualMode: function(mode){
					enyo.webOS.keyboard._manual = mode;
					PalmSystem.setManualKeyboardEnabled(mode);
				},
				isManualMode: function(){
					return enyo.webOS.keyboard._manual || false;
				},
				forceShow: function(type){
					enyo.webOS.keyboard.setManualMode(true);
					PalmSystem.keyboardShow(inType || 0);
				},
				forceHide: function(){
					enyo.webOS.keyboard.setManualMode(true);
					PalmSystem.keyboardHide();
				}
			};
		}
	}
	enyo.webos = enyo.webOS; //For those who prefer lowercase		
});

enyo.kind({
	name: "enyo.webOS.ServiceRequest",
	kind: enyo.Async,
	resubscribeDelay: 10000,
	published: {
		service:"",
		method:"",
		subscribe: false,
		resubscribe: false
	},
	constructor: function(inParams) {
		enyo.mixin(this, inParams);
		this.inherited(arguments);
		if(enyo.webOS._serviceCounter == undefined) {
			enyo.webOS._serviceCounter = 1;
		} else {
			enyo.webOS._serviceCounter++;
		}
		this.id = enyo.webOS._serviceCounter;
	},
	go: function(inParams) {
		if(!PalmServiceBridge) {
			this.fail({
				errorCode: -1,
				errorText: "Invalid device for Palm services. PalmServiceBridge not found."
			});
			return undefined;
		}
		this.params = inParams || {};
		this.bridge = new PalmServiceBridge();
		this.bridge.onservicecallback = this.clientCallback = enyo.bind(this, "serviceCallback");
		var fullUrl = this.service;
		if(this.method.length>0) {
			if(fullUrl.charAt(fullUrl.length-1) != "/") {
				fullUrl += "/";
			}
			fullUrl += this.method;
		}
		if(this.subscribe) {
			this.params.subscribe = this.subscribe;
		}
		this.bridge.call(fullUrl, enyo.json.stringify(this.params));
		return this;
	},
	cancel: function() {
		this.cancelled = true;
		this.responders = [];
		this.errorHandlers = [];
		if(this.resubscribeJob) {
			enyo.job.stop(this.resubscribeJob);
		}
		if(this.bridge) {
			this.bridge.cancel();
			this.bridge = undefined;
		}
	},
	serviceCallback: function(respMsg) {
		var parsedMsg, error;
		if(this.cancelled) {
			return;
		}
		try {
			parsedMsg = enyo.json.parse(respMsg);
		} catch(err) {
			var error = {
				errorCode: -1,
				errorText: respMsg
			};
			this.serviceFailure(error);
			return;
		}
		if (parsedMsg.errorCode || parsedMsg.returnValue === false) {
			this.serviceFailure(parsedMsg);
		} else {
			this.serviceSuccess(parsedMsg);
		}
	},
	serviceSuccess: function(inResponse) {
		var successCallback = undefined;
		if(this.responders.length>0) {
			successCallback = this.responders[0];
		}
		this.respond(inResponse);
		if(this.subscribe && successCallback) {
			this.response(successCallback);
		}
	},
	serviceFailure: function(inError) {
		var failureCallback = undefined;
		if(this.errorHandlers.length>0) {
			failureCallback = this.errorHandlers[0];
		}
		this.fail(inError);
		if(this.resubscribe && this.subscribe) {
			if(failureCallback) {
				this.error(failureCallback);
			}
			this.resubscribeJob = this.id + "resubscribe";
			enyo.job(this.resubscribeJob, enyo.bind(this, "goAgain"), this.resubscribeDelay);
		}
	},
	resubscribeIfNeeded: function() {
		
	},
	goAgain: function() {
		this.go(this.params);
		
	},
});
