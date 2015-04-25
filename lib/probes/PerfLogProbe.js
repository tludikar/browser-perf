var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:PerfLogProbe');

function PerfLogProbe() {
	events.EventEmitter.call(this);
}

util.inherits(PerfLogProbe, events.EventEmitter);

PerfLogProbe.prototype.id = 'PerfLogProbe';

PerfLogProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			loggingPrefs: {
				performance: 'ALL'
			}
		});
		return browser;
	});
	return Q(cfg);
};

PerfLogProbe.prototype.start = function(browser) {
	var me = this;
	return browser.logTypes().then(function(logs) {
		debug('Supported log types', logs);
		me.enabled = (logs.indexOf('performance') !== -1);
	}).then(function() {
		if (me.enabled) {
			return browser.log('performance');
		}
	});
};

PerfLogProbe.prototype.teardown = function(browser) {
	if (this.enabled) {
		var me = this;
		return browser.log('performance').then(function(events) {
			//require('fs').writeFileSync(__dirname + '/../../perflog.json', JSON.stringify(arg));
			debug('Got Performance log results');
			events.forEach(function(event, index) {
				if (typeof event.message !== 'undefined') { // From ChromeDriver
					events[index] = JSON.parse(event.message).message;
				} else { // From Appium
					events[index] = {
						method: 'Timeline.eventRecorded',
						params: {
							record: event
						}
					}
				}
			});
			
			me.emit('data', {
				type: 'perfLog',
				value: events
			});
		});
	}
};

module.exports = PerfLogProbe;