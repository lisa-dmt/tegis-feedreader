function PreferencesAssistant() {
	this.prefs = FeedReader.prefs;
}

PreferencesAssistant.prototype.setup = function() {
	this.controller.get("prefs-title").update($L("FeedReader Preferences"));
	this.controller.get("prefs-group-title").update($L("Automatic updating"));
	
	this.controller.get("notify-title").update($L("Show notification"));
	this.controller.get("wake-device-title").update($L("Wake device"));
	
	this.controller.setupWidget("notificationEnabled",
    							{ property: "value", trueLabel: $L("Yes"), falseLabel: $L("No")}, 
         						this.notificationModel = {value: this.prefs.notificationEnabled, disabled: false});
	this.controller.setupWidget("wakingEnabled",
    							{ property: "value", trueLabel: $L("Yes"), falseLabel: $L("No")}, 
         						this.wakingModel = {value: this.prefs.wakingEnabled, disabled: false});
	this.controller.setupWidget("updateInterval", {
		label: $L("Interval"),
		choices: [
			{ label: $L("Manual Updates"),	value: 0},
			{ label: $L("5 Minutes"),		value: 5},    
			{ label: $L("15 Minutes"),		value: 15},
			{ label: $L("30 Minutes"),		value: 30},    
			{ label: $L("1 Hour"),			value: 60},    
			{ label: $L("4 Hours"),			value: 240},
			{ label: $L("1 Day"),			value: 1440}
		]    
	}, this.updateIntervalModel = { value : this.prefs.updateInterval });
};

PreferencesAssistant.prototype.cleanup = function(event) {
	this.prefs.notificationEnabled = this.notificationModel.value;
	this.prefs.wakingEnabled = this.wakingModel.value;
	this.prefs.updateInterval = this.updateIntervalModel.value;
	
	this.prefs.save();
};
