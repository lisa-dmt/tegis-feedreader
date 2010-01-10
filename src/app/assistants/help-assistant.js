function HelpAssistant() {
}

HelpAssistant.prototype.setup = function() {
	this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, { visible: false });

	this.controller.get("help-title").update($LL("Help"));
	this.controller.get("appname").update(FeedReader.appName);
	this.controller.get("appdetails").update("v" + FeedReader.versionString + $L(" by ") + FeedReader.appAuthor);
	this.controller.get("copyright").update("&copy; Copyright " + FeedReader.appAuthor);

    this.controller.listen("web-contact", Mojo.Event.tap,
        				   this.supportWebTap.bindAsEventListener(this));
    this.controller.listen("email-contact", Mojo.Event.tap,
        				   this.supportEMailTap.bindAsEventListener(this));
};

HelpAssistant.prototype.cleanup = function(event) {
};

HelpAssistant.prototype.supportWebTap = function(event) {
	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters: {
			id: "com.palm.app.browser",
			params: {
				target: "http://www.tegi-stuff.de"
			}
		}
	});
};

HelpAssistant.prototype.supportEMailTap = function(event) {
	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: "open",
		parameters: {
			target: "mailto:timo@tegi-stuff.de?subject=FeedReader"
		}
	});	
};
