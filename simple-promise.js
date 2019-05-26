function Promise() {
    var PENDING         = 0;
    var FULFILLED       = 1;
    var REJECTED        = 2;

    function _fulfill(promise, value) {
        if (promise.state === PENDING) {
            promise.value = value;
            promise.state = FULFILLED; 

            promise.onFulfilledCallbacks.forEach(function(cb) {
                callLater(function() { cb(value) });
            });
    
            promise.onFulfilledCallbacks = [];
            promise.onRejectedCallbacks = [];
        }
    }

    function _reject(promise, reason) {
        if (promise.state === PENDING) {
            promise.reason = reason;
            promise.state = REJECTED; 

            promise.onRejectedCallbacks.forEach(function(cb) {
                callLater(function() { cb(reason) });
            });

            promise.onFulfilledCallbacks = [];
            promise.onRejectedCallbacks = [];
        }
    }

    function _then(promise, onFulfilled, onRejected) {
        var returnedPromise = createNewPromiseObject();

        if (promise.state === PENDING) {
            if (onFulfilled && isFunction(onFulfilled)) {
                promise.onFulfilledCallbacks.push(onFulfilled);
            }

            if (onRejected && isFunction(onRejected)) {
                promise.onRejectedCallbacks.push(onRejected);
            }
        }
        else if (promise.state === FULFILLED) {
            if (onFulfilled && isFunction(onFulfilled)) {
                resolveWithFunction(returnedPromise, onFulfilled);
            }
            else if (onFulfilled) {
                returnedPromise.fulfill(promise.value);
            }
        }
        else if (promise.state === REJECTED){
            if (onRejected && isFunction(onRejected)) {
                resolveWithFunction(returnedPromise, onRejected);
            }
            else {
                returnedPromise.reject(promise.reason);
            }
        }
        else {
            throw "Something went very wrong. Unrecognized state";
        }

        return returnedPromise;
    }

    function resolveWithFunction(promise, func) {
        callLater(function() {
            try {
                var result = func();
                promiseResolutionProcedure(promise, result);
            }
            catch (e) {
                promise.reject(e);
            }
        });
    }

    function promiseResolutionProcedure(promise, x) {
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
            var then = undefined;

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
                                promiseResolutionProcedure(promise, y);
                                handlerHasBeenCalled = true;
                            }
                        },
                        function(r) {
                            if (!handerHasBeenCalled) {
                                promise.reject(r);
                                handlerHasBeenCalled = true;
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
                promise.fulfill(x)
            }
        }
        else {
            promise.fulfill(x);
        }
    }

    function isFunction(thing) {
        return typeof thing === "function";
    }


    function isPromise(thing) {
        return thing.then && thing.fulfill && thing.reject;
    }
    
    function isObject(thing) {
        return typeof thing === "object";
    }

    function callLater(func) {
        setTimeout(func, 0);
    }


    function createNewPromiseObject() {
        // Initial promise state
        var newPromise = {
            state:                      PENDING,
            value:                      undefined,
            reason:                     undefined,
            nextPromise:                undefined,
            onFulfilledCallbacks:       [],
            onRejectedCallbacks:        []
        };
        
        // Attach implementation
        return {
            fulfill: function(value) {
                _fulfill(newPromise, value);
            },
            reject: function(reason) {
                _reject(newPromise, reason);
            },
            then: function(onFulfilled, onRejected) {
                return _then(newPromise, onFulfilled, onRejected);
            }
        };
    }

    return createNewPromiseObject(); 
}


module.exports.resolved = function(value) {
    var p = Promise();
    p.fulfill(value);
    return p;
};

module.exports.rejected = function(reason) {
    var p = Promise();
    p.reject(reason);
    return p;
};

module.exports.deferred = function() {
    var p = Promise();
    return {
        promise: p,
        resolve: function(value) {
            p.fulfill(value);
        },
        reject: function(reason) {
            p.reject(reason);
        }
    };
};

var tests = require("promises-tests/promises-aplus-tests");

console.log(tests);
