var ComicalPromise = function () {
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

    /**
     * @param {any} value
     */
    function _fulfill(value) {
        if (_state === PENDING) {
            _value = value;
            _state = FULFILLED; 

            _onFulfilledCallbacks.forEach(function(cb) {
                callLater(function() { cb(_value) });
            });
        }
    }

    /**
     * @param {any} reason
     */
    function _reject(reason) {
        if (_state === PENDING) {
            _reason = reason;
            _state = REJECTED; 

            _onRejectedCallbacks.forEach(function(cb) {
                callLater(function() { cb(_reason) });
            });
        }
    }

    /**
     * @param {string} callbackType
     * @param {function} callback
     */
    function _queueResolutionCallback(callbackType, callback) {
        // About `callLater`: Used to execute the callback at a time when
        // the execution stack contains only platform code.

        if (_state === PENDING) {
            if (callbackType === "onFulfilled") {
                _onFulfilledCallbacks.push(function(result) {
                    callLater(function() {
                        callback(result);
                    });
                });
            }
            else if (callbackType === "onRejected") {
                _onRejectedCallbacks.push(function(result) {
                    callLater(function() {
                        callback(result);
                    });
                });
            }
            else {
                throw new Error("Unrecognized callback type");
            }
        }
        else if (_state === FULFILLED) {
            if (callbackType === "onFulfilled") {
                callLater(function() {
                    callback(_value);
                });
            }
        }
        else if (_state === REJECTED) {
            if (callbackType === "onRejected") {
                callLater(function() {
                    callback(_reason);
                });
            }
        }
        else {
            throw new Error("Unrecognized state" + _state);
        }
    }


    /**
     * @param {function} onFulfilled
     * @param {function} onRejected
     */
    function _then(onFulfilled, onRejected) {
        var promise2 = ComicalPromise();
    
        if (!isFunction(onFulfilled)) {
            // If `onFulfilled` is not a function and `promise1` is fulfilled,
            // `promise2` must be fulfilled with the same value as `promise1`.
            _queueResolutionCallback("onFulfilled", function(value) {
                promise2.fulfill(value);
            });
        }
        else {
            _queueResolutionCallback("onFulfilled", function(value) {
                try {
                    // If either `onFulfilled` or `onRejected` returns a value `x`, 
                    // run the Promise Resolution Procedure [[Resolve]](promise2, x).
                    resolve(promise2, onFulfilled(value));
                }
                catch (e) {
                    // If either `onFulfilled` or `onRejected` throws an exception `e`, 
                    // `promise2` must be rejected with `e` as the reason.
                    promise2.reject(e);
                }
            });
        }

        if (!isFunction(onRejected)) {
            // If `onRejected` is not a function and `promise1` is rejected, 
            // `promise2` must be rejected with the same reason as `promise1`.
            _queueResolutionCallback("onRejected", function(reason) {
                promise2.reject(reason);
            });
        }
        else { 
            _queueResolutionCallback("onRejected", function(reason) {
                try {
                    // If either `onFulfilled` or `onRejected` returns a value `x`, 
                    // run the Promise Resolution Procedure [[Resolve]](promise2, x).
                    resolve(promise2, onRejected(reason));
                }
                catch (e) {
                    // If either `onFulfilled` or `onRejected` throws an exception `e`, 
                    // `promise2` must be rejected with `e` as the reason.
                    promise2.reject(e);
                }
            });
        }

        // `then` must return a promise
        return promise2;
    }

    return {
        fulfill: _fulfill,
        reject: _reject,
        then: _then,
        comical: true // sentinel to signal that this is a indeed a comical promise
    };
};

/**
 * Promise Resolution Procedure
 *
 * @param {ComicalPromise} promise
 * @param {any} x
 */
function resolve(promise, x) {
    // If `promise` and `x` refer to the same object, 
    // reject `promise` with a TypeError as the reason.
    if (promise === x) {
        promise.reject(TypeError("Cannot resolve a promsie with iteself"));
    }
    // If `x` is a promise, adopt its state
    else if (isPromise(x)) {
        x.then(function(value) {
            promise.fulfill(value);
        }, function(reason) {
            promise.reject(reason);
        });
    }
    // Otherwise, if `x` is an object or function
    else if (isObject(x) || isFunction(x)) {
        var then;

        try {
            // let `then` be `x.then`
            then = x.then
        } catch (e) {
            // If retrieving the property `x.then` results in a thrown exception `e`, 
            // reject promise with `e` as the reason.
            promise.reject(e);
            return;
        }

        // if `then` is a function, call it with `x` as `this`, 
        // first argument `resolvePromise`, and second argument `rejectPromise`  
        if (isFunction(then)) {
            // If both `resolvePromise` and `rejectPromise` are called, 
            // or multiple calls to the same argument are made, 
            // the first call takes precedence, and any further calls are ignored.
            var handlerHasBeenCalled = false;

            try {
                then.call(
                    x,
                    function resolvePromise(y) {
                        if (!handlerHasBeenCalled) {
                            // If/when `resolvePromise` is called with a value `y`, 
                            // run [[Resolve]](promise, y).
                            handlerHasBeenCalled = true;
                            resolve(promise, y);
                        }
                    },
                    function rejectPromise(r) {
                        if (!handlerHasBeenCalled) {
                            // If/when `rejectPromise` is called with a reason `r`, 
                            // reject promise with r.
                            handlerHasBeenCalled = true;
                            promise.reject(r);
                        }
                    }
                );
            }
            // If calling then throws an exception e, 
            catch (e) {
                // If `resolvePromise` or `rejectPromise` have been called, ignore it.
                if (!handlerHasBeenCalled) {
                    // Otherwise, reject promise with `e` as the reason.
                    promise.reject(e);
                }
            }
        }
        else {
            // If `then` is not a function, fulfill promise with `x`.
            promise.fulfill(x);
        }
    }
    else {
        // If `x` is not an object or function, fulfill promise with `x`.
        promise.fulfill(x)
    }
}

ComicalPromise.resolve = resolve;

var test = ComicalPromise();
console.log(test);

test.then(function(res) {
    console.log(res);
});

test.fulfill("Hello");

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

module.exports.deferred = function() {
    var p = ComicalPromise();
    return {
        promise: p,
        resolve: function(value) {
            ComicalPromise.resolve(p, value);
        },
        reject: function(reason) {
            p.reject(reason);
        }
    };
};
