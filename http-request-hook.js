'use strict';

var _ = require('lodash');
var http = require('http');
var https = require('https');
var url = require('url');
var util         = require("util");
var EventEmitter = require("events").EventEmitter;
var NodeDefaultMethods = {};

var verify = {
    method: function (fn) {
        if (!_.isFunction(fn)) {
            throw new Error('method should be a function, have ' + fn);
        }
    },
    string: function (str) {
        if (!_.isString(str)) {
            throw new Error('expected string value, have ' + str);
        }
    }
};


var options = function () {

    EventEmitter.call(this);
    var thisObject = this;

    this.timeout = 120000;

    this.Blacklist = [];
    this.addBlacklist = function (address) {

        verify.string(address);
        this.Blacklist.push(address);
    };
    this.removeBlacklist = function (address) {

        verify.string(address);
        if (this.Blacklist.indexOf(address) >= 0)
            this.Blacklist.splice(this.Blacklist.indexOf(address), 1);
    };


    this.Whitelist = [];
    this.addWhitelist = function (address) {

        verify.string(address);
        this.Whitelist.push(address);
    };
    this.removeWhitelist = function (address) {

        verify.string(address);
        if (this.Whitelist.indexOf(address) >= 0)
            this.Whitelist.splice(this.Blacklist.indexOf(address), 1);
    };

}  // options


function saveNodeDefaults() {

    if (!http.upgradedToAdvanced) NodeDefaultMethods.httpRequest = http.request;
    if (!https.upgradedToAdvanced) NodeDefaultMethods.httpsRequest = https.request;
}

function ApplyAdvanceOptions(moduleObj, userOptions) {

    if (moduleObj.upgradedToAdvanced) return;
    if (moduleObj === http || moduleObj === https) saveNodeDefaults();


    var originalRequest = moduleObj.request;

    // We proxy the request method
    moduleObj.request = function (options, callback) {

        userOptions.emit('beforeRequest', options, callback);

        //BlackList Control
        var myPath = options;
        if (_.isString(options)) {
            myPath = url.Parse(options);
            if (useroptions.Blacklist.indexOf(options) >= 0) return {ErrorMessage: options + ' is restricted'};
        }
        if (userOptions.Blacklist.indexOf(myPath.host) >= 0) return {ErrorMessage: options + ' is restricted'};
        if (userOptions.Blacklist.indexOf(myPath.hostname) >= 0) return {ErrorMessage: options + ' is restricted'};
        if (userOptions.Blacklist.indexOf(myPath.pathname) >= 0) return {ErrorMessage: options + ' is restricted'};

        //WhiteList Control
        if (userOptions.Whitelist.length > 0) {
            if (_.isString(options)) {
                myPath = url.Parse(options);
                if (useroptions.Whitelist.indexOf(options) < 0) return {ErrorMessage: options + ' is restricted'};
            }
            if (!(userOptions.Whitelist.indexOf(myPath.host) >= 0 || userOptions.Whitelist.indexOf(myPath.hostname) >= 0 ||
                userOptions.Whitelist.indexOf(myPath.pathname) >= 0)) return {ErrorMessage: options + ' is restricted'};
        }

        // Create the callback function for response
        var newCallback = function () {

            var res = arguments[0];

            userOptions.emit('response', req, res);

            if (callback) callback.apply(this, arguments);

            res.on('end', function() {
                userOptions.emit('afterResponse', req, res);
                userOptions.emit('responseEnd', req, res);
            })


        }


        // do the request and emmit onRequest event
        var req = originalRequest(options, newCallback);
        req.setTimeout(userOptions.timeout);

        userOptions.emit('request', req, options);

        return req;
    }


    moduleObj.upgradedToAdvanced = true;
}


function restoreDefault() {

    if (http.upgradedToAdvanced) {
        delete http.upgradedToAdvanced;
        http.request = NodeDefaultMethods.httpRequest;
    }
    if (https.upgradedToAdvanced) {
        delete https.upgradedToAdvanced;
        https.request = NodeDefaultMethods.httpsRequest;
    }
}


util.inherits(options, EventEmitter);


module.exports.options = options;

module.exports.applyRequestOptions = function (userOptions, httpModule) {

    if (!userOptions) userOptions = new options();
    else if (!userOptions instanceof options) userOptions = new options();
    if (!httpModule) {
        ApplyAdvanceOptions(http, userOptions);
        ApplyAdvanceOptions(https, userOptions);
    } else {
        ApplyAdvanceOptions(httpModule, userOptions);
    }
}

module.exports.restoreDefaultRequest = function () {
    restoreDefault();
}
