'use strict';

var _ = require('lodash');
var http = require('http');
var https = require('https');
var url = require('url');
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

    this.timeout = 120000;

    var onBeforeRequest = [];
    this.addOnBeforeRequest = function (method) {
        if (!method) return;
        if (!Array.isArray(method)) method = [method];
        method.forEach(function (method) {
            if (_.isFunction(method) && onBeforeRequest.indexOf(method) < 0)
                onBeforeRequest.push(method);
        });
    }
    this._getOnBeforeRequest = function () {
        return onBeforeRequest;
    }


    var onRequest = [];
    this.addOnRequest = function (method) {
        if (!method) return;
        if (!Array.isArray(method)) method = [method];
        method.forEach(function (method) {
            if (_.isFunction(method) && onRequest.indexOf(method) < 0)
                onRequest.push(method);
        });
    }
    this._getOnRequest = function () {
        return onRequest;
    }

    var onResponse = [];
    this.addOnResponse = function (method) {
        if (!method) return;
        if (!Array.isArray(method)) method = [method];
        method.forEach(function (method) {
            if (_.isFunction(method) && onResponse.indexOf(method) < 0)
                onResponse.push(method);
        });
    }
    this._getOnResponse = function () {
        return onResponse;
    }

    this.on = function (eventName, method) {
        if (!method) return;
        if (!_.isFunction(method)) return;
        if (_.toUpper(eventName) === 'ONREQUEST') this.addOnRequest(method);
        else if (_.toUpper(eventName) === 'ONRESPONSE') this.addOnResponse(method);
    }


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

        // run onBeforeRequest event listeners
        userOptions._getOnBeforeRequest().forEach(function (method) {
            method.call(this, options);
        });


        // Create the callback function for response
        var newCallback = function () {

            var res = arguments[0];
            // run onResponse event listeners
            userOptions._getOnResponse().forEach(function (method) {
                method.call(this, req, res);
            });

            if (callback) callback.apply(this, arguments);
        }


        // do the request and emmit onRequest event
        var req = originalRequest(options, newCallback);
        req.setTimeout(userOptions.timeout);
        // run onResponse event listeners
        userOptions._getOnRequest().forEach(function (method) {
            method.call(this, req, options);
        });

        return req;
    }


    moduleObj.upgradedToAdvanced = true;
}


function restoreDefault() {

    if (http.upgradedToAdvanced) {
        http.request = NodeDefaultMethods.httpRequest;
        delete http.upgradedToAdvanced;
    }
    if (https.upgradedToAdvanced) {
        https.request = NodeDefaultMethods.httpsRequest;
        delete https.upgradedToAdvanced;
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
