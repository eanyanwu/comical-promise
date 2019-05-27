var Promise = function () {
    // Valid Promise states
    var PENDING         = 0;
    var FULFILLED       = 1;
    var REJECTED        = 2;

    // Promise data
    var _state                      = PENDING;
    var _value                      = undefined;
    var _reason                     = undefined;
    var _onFulfilledCallbacks       = [];
    var _onRejectedCallbacks        = [];

    function _fulfill(value) {
        if (_state === PENDING) {
            _value = value;
            _state = FULFILLED; 

            _onFulfilledCallbacks.forEach(function(cb) {
                callLater(function() { cb(_value) });
            });
    
            _onFulfilledCallbacks = [];
            _onRejectedCallbacks = [];
        }
    }

    function _reject(reason) {
        if (_state === PENDING) {
            _reason = reason;
            _state = REJECTED; 

            _onRejectedCallbacks.forEach(function(cb) {
                callLater(function() { cb(_reason) });
            });

            _onFulfilledCallbacks = [];
            _onRejectedCallbacks = [];
        }
    }

    function _then(onFulfilled, onRejected) {
        var promise2 = Promise();

        if (_state === PENDING) {
            if (isFunction(onFulfilled)) {
                _onFulfilledCallbacks.push(function(value) {
                    callLater(function() {
                        try {
                            var result = onFulfilled(value);
                            resolve(promise2, result);
                        }
                        catch (e) {
                            promise2.reject(e);
                        }
                    });
                });
            }
            else {
                _onFulfilledCallbacks.push(function(value) {
                    promise2.fulfill(value);
                });
            }

            if (isFunction(onRejected)) {
                _onRejectedCallbacks.push(function(reason) {
                    callLater(function() {
                        try {
                            var result = onRejected(reason);
                            resolve(promise2, result);
                        }
                        catch (e) {
                            promise2.reject(e);
                        }
                    });
                });
            }
            else {
                _onRejectedCallbacks.push(function(reason) {
                    promise2.reject(reason);
                });
            }
        }
        else if (_state === FULFILLED) {
            if (isFunction(onFulfilled)) {
                callLater(function() {
                    try {
                        var result = onFulfilled(_value);
                        resolve(promise2, result);
                    }
                    catch (e) {
                        promise2.reject(e);
                    }
                });
            }
            else {
                promise2.fulfill(_value);
            }
        }
        else if (_state === REJECTED){
            if (isFunction(onRejected)) {
                callLater(function() {
                    try {
                        var result = onRejected(_reason);
                        resolve(promise2, result);
                    }
                    catch (e) {
                        promise2.reject(e);
                    }
                });
            }
            else {
                promise2.reject(_reason);
            }
        }
        else {
            console.log("Something went very wrong. Unrecognized state", promise1.state);
        }

        return promise2;
    }

    return {
        fulfill: _fulfill,
        reject: _reject,
        then: _then,
        comical: true
    };
};

function resolve(promise, x) {
    if (promise === x) {
        promise.reject(TypeError("Cannot resolve a promsie with iteself"));
    }
    else if (isPromise(x)) {
        x.then(function(value) {
            promise.fulfill(value);
        }, function(reason) {
            promise.reject(reason);
        });
    }
    else if (isObject(x) || isFunction(x)) {
        var then;

        try {
            then = x.then
        } catch (e) {
            promise.reject(e);
            return;
        }

        if (isFunction(then)) {
            var handlerHasBeenCalled = false;
            try {
                then.call(
                    x,
                    function(y) {
                        if (!handlerHasBeenCalled) {
                            handlerHasBeenCalled = true;
                            resolve(promise, y);
                        }
                    },
                    function(r) {
                        if (!handlerHasBeenCalled) {
                            handlerHasBeenCalled = true;
                            promise.reject(r);
                        }
                    }
                );
            }
            catch (e) {
                if (!handlerHasBeenCalled) {
                    promise.reject(e);
                }
            }
        }
        else {
            promise.fulfill(x);
        }
    }
    else {
        promise.fulfill(x)
    }
}

// Helpers 

function isTruthy(thing) {
    return !!(thing);
}

function isFunction(thing) {
    return isTruthy(thing) && typeof thing === "function";
}

function isObject(thing) {
    return isTruthy(thing) && typeof thing === "object";
}

function isUndefined(thing) {
    return typeof thing === "undefined";
}

function isPromise(thing) {
    return isTruthy(thing) && isTruthy(thing.comical);
}

function callLater(func) {
    setTimeout(func, 0);
}

var test = Promise();
resolve(test, undefined);

test.then(console.log);


Promise.resolve = resolve;


module.exports.deferred = function() {
    var p = Promise();
    return {
        promise: p,
        resolve: function(value) {
            Promise.resolve(p, value);
        },
        reject: function(reason) {
            p.reject(reason);
        }
    };
};
