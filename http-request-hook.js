'use strict';

var http = require('http');
var https = require('https');
const url = require('url');
const util         = require("util");
const EventEmitter = require("events").EventEmitter;
var NodeDefaultMethods = {};
class MyEmitter extends EventEmitter {}
const noop = function () {};


var verify = {
    method: function (fn) {
        if (!util.isFunction(fn)) {
            throw new Error('method should be a function, have ' + fn);
        }
    },
    string: function (str) {
        if (!util.isString(str)) {
            throw new Error('expected string value, have ' + str);
        }
    }
};


var options = function () {

    EventEmitter.call(this);
    var thisObject = this;

    this.requestQuery = function(options, callback) {
        return true;
    }

    this.timeout = 120000;
    this.resCallback = true;
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
util.inherits(options, EventEmitter);


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
        var requsetQueryResult = userOptions.requestQuery(options, callback);

        if (requsetQueryResult === 5) {  // 5 --> throw error
            throw new Error('request not allowed');
        } else if (!requsetQueryResult) {  // false --> just exit with empty object
            const fakeReq = new MyEmitter();
            fakeReq.abort = noop;
            fakeReq.end = noop;
            fakeReq.flushHeaders = noop;
            fakeReq.setNoDelay = noop;
            fakeReq.setSocketKeepAlive = noop;
            fakeReq.setTimeout = noop;
            fakeReq.write = noop;
            return fakeReq;
        }

        //BlackList Control
        var myPath = options;
        if (util.isString(options)) {
            myPath = url.Parse(options);
            if (useroptions.Blacklist.indexOf(options) >= 0) return {ErrorMessage: options + ' is restricted'};
        }
        if (userOptions.Blacklist.indexOf(myPath.host) >= 0) return {ErrorMessage: options + ' is restricted'};
        if (userOptions.Blacklist.indexOf(myPath.hostname) >= 0) return {ErrorMessage: options + ' is restricted'};
        if (userOptions.Blacklist.indexOf(myPath.pathname) >= 0) return {ErrorMessage: options + ' is restricted'};

        //WhiteList Control
        if (userOptions.Whitelist.length > 0) {
            if (util.isString(options)) {
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

            if (callback && userOptions.resCallback) callback.apply(this, arguments);

            res.on('end', function() {
                userOptions.emit('afterResponse', req, res);
            });

        }


        // do the request and emmit onRequest event
        var req = originalRequest(options, newCallback);
        req.setTimeout(userOptions.timeout);

        req.on('error', function (e) {
            userOptions.emit('error', req, e);
        });

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
