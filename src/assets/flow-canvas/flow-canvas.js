var Kg = Object.defineProperty;
var Gg = (e, t, n) => t in e ? Kg(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var ht = (e, t, n) => Gg(e, typeof t != "symbol" ? t + "" : t, n);
function qa(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Sd = { exports: {} }, zs = {}, kd = { exports: {} }, J = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Qo = Symbol.for("react.element"), qg = Symbol.for("react.portal"), Qg = Symbol.for("react.fragment"), Zg = Symbol.for("react.strict_mode"), Jg = Symbol.for("react.profiler"), e0 = Symbol.for("react.provider"), t0 = Symbol.for("react.context"), n0 = Symbol.for("react.forward_ref"), r0 = Symbol.for("react.suspense"), o0 = Symbol.for("react.memo"), i0 = Symbol.for("react.lazy"), mc = Symbol.iterator;
function s0(e) {
  return e === null || typeof e != "object" ? null : (e = mc && e[mc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var Ed = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Nd = Object.assign, Cd = {};
function Br(e, t, n) {
  this.props = e, this.context = t, this.refs = Cd, this.updater = n || Ed;
}
Br.prototype.isReactComponent = {};
Br.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Br.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function zd() {
}
zd.prototype = Br.prototype;
function Qa(e, t, n) {
  this.props = e, this.context = t, this.refs = Cd, this.updater = n || Ed;
}
var Za = Qa.prototype = new zd();
Za.constructor = Qa;
Nd(Za, Br.prototype);
Za.isPureReactComponent = !0;
var gc = Array.isArray, Pd = Object.prototype.hasOwnProperty, Ja = { current: null }, Md = { key: !0, ref: !0, __self: !0, __source: !0 };
function Td(e, t, n) {
  var r, o = {}, i = null, s = null;
  if (t != null) for (r in t.ref !== void 0 && (s = t.ref), t.key !== void 0 && (i = "" + t.key), t) Pd.call(t, r) && !Md.hasOwnProperty(r) && (o[r] = t[r]);
  var l = arguments.length - 2;
  if (l === 1) o.children = n;
  else if (1 < l) {
    for (var a = Array(l), u = 0; u < l; u++) a[u] = arguments[u + 2];
    o.children = a;
  }
  if (e && e.defaultProps) for (r in l = e.defaultProps, l) o[r] === void 0 && (o[r] = l[r]);
  return { $$typeof: Qo, type: e, key: i, ref: s, props: o, _owner: Ja.current };
}
function l0(e, t) {
  return { $$typeof: Qo, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function eu(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Qo;
}
function a0(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var yc = /\/+/g;
function tl(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? a0("" + e.key) : t.toString(36);
}
function ji(e, t, n, r, o) {
  var i = typeof e;
  (i === "undefined" || i === "boolean") && (e = null);
  var s = !1;
  if (e === null) s = !0;
  else switch (i) {
    case "string":
    case "number":
      s = !0;
      break;
    case "object":
      switch (e.$$typeof) {
        case Qo:
        case qg:
          s = !0;
      }
  }
  if (s) return s = e, o = o(s), e = r === "" ? "." + tl(s, 0) : r, gc(o) ? (n = "", e != null && (n = e.replace(yc, "$&/") + "/"), ji(o, t, n, "", function(u) {
    return u;
  })) : o != null && (eu(o) && (o = l0(o, n + (!o.key || s && s.key === o.key ? "" : ("" + o.key).replace(yc, "$&/") + "/") + e)), t.push(o)), 1;
  if (s = 0, r = r === "" ? "." : r + ":", gc(e)) for (var l = 0; l < e.length; l++) {
    i = e[l];
    var a = r + tl(i, l);
    s += ji(i, t, n, a, o);
  }
  else if (a = s0(e), typeof a == "function") for (e = a.call(e), l = 0; !(i = e.next()).done; ) i = i.value, a = r + tl(i, l++), s += ji(i, t, n, a, o);
  else if (i === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return s;
}
function ii(e, t, n) {
  if (e == null) return e;
  var r = [], o = 0;
  return ji(e, r, "", "", function(i) {
    return t.call(n, i, o++);
  }), r;
}
function u0(e) {
  if (e._status === -1) {
    var t = e._result;
    t = t(), t.then(function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 1, e._result = n);
    }, function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 2, e._result = n);
    }), e._status === -1 && (e._status = 0, e._result = t);
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var Ve = { current: null }, Ai = { transition: null }, c0 = { ReactCurrentDispatcher: Ve, ReactCurrentBatchConfig: Ai, ReactCurrentOwner: Ja };
function jd() {
  throw Error("act(...) is not supported in production builds of React.");
}
J.Children = { map: ii, forEach: function(e, t, n) {
  ii(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return ii(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return ii(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!eu(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
J.Component = Br;
J.Fragment = Qg;
J.Profiler = Jg;
J.PureComponent = Qa;
J.StrictMode = Zg;
J.Suspense = r0;
J.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = c0;
J.act = jd;
J.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Nd({}, e.props), o = e.key, i = e.ref, s = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (i = t.ref, s = Ja.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps) var l = e.type.defaultProps;
    for (a in t) Pd.call(t, a) && !Md.hasOwnProperty(a) && (r[a] = t[a] === void 0 && l !== void 0 ? l[a] : t[a]);
  }
  var a = arguments.length - 2;
  if (a === 1) r.children = n;
  else if (1 < a) {
    l = Array(a);
    for (var u = 0; u < a; u++) l[u] = arguments[u + 2];
    r.children = l;
  }
  return { $$typeof: Qo, type: e.type, key: o, ref: i, props: r, _owner: s };
};
J.createContext = function(e) {
  return e = { $$typeof: t0, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: e0, _context: e }, e.Consumer = e;
};
J.createElement = Td;
J.createFactory = function(e) {
  var t = Td.bind(null, e);
  return t.type = e, t;
};
J.createRef = function() {
  return { current: null };
};
J.forwardRef = function(e) {
  return { $$typeof: n0, render: e };
};
J.isValidElement = eu;
J.lazy = function(e) {
  return { $$typeof: i0, _payload: { _status: -1, _result: e }, _init: u0 };
};
J.memo = function(e, t) {
  return { $$typeof: o0, type: e, compare: t === void 0 ? null : t };
};
J.startTransition = function(e) {
  var t = Ai.transition;
  Ai.transition = {};
  try {
    e();
  } finally {
    Ai.transition = t;
  }
};
J.unstable_act = jd;
J.useCallback = function(e, t) {
  return Ve.current.useCallback(e, t);
};
J.useContext = function(e) {
  return Ve.current.useContext(e);
};
J.useDebugValue = function() {
};
J.useDeferredValue = function(e) {
  return Ve.current.useDeferredValue(e);
};
J.useEffect = function(e, t) {
  return Ve.current.useEffect(e, t);
};
J.useId = function() {
  return Ve.current.useId();
};
J.useImperativeHandle = function(e, t, n) {
  return Ve.current.useImperativeHandle(e, t, n);
};
J.useInsertionEffect = function(e, t) {
  return Ve.current.useInsertionEffect(e, t);
};
J.useLayoutEffect = function(e, t) {
  return Ve.current.useLayoutEffect(e, t);
};
J.useMemo = function(e, t) {
  return Ve.current.useMemo(e, t);
};
J.useReducer = function(e, t, n) {
  return Ve.current.useReducer(e, t, n);
};
J.useRef = function(e) {
  return Ve.current.useRef(e);
};
J.useState = function(e) {
  return Ve.current.useState(e);
};
J.useSyncExternalStore = function(e, t, n) {
  return Ve.current.useSyncExternalStore(e, t, n);
};
J.useTransition = function() {
  return Ve.current.useTransition();
};
J.version = "18.3.1";
kd.exports = J;
var C = kd.exports;
const I = /* @__PURE__ */ qa(C);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f0 = C, d0 = Symbol.for("react.element"), p0 = Symbol.for("react.fragment"), h0 = Object.prototype.hasOwnProperty, m0 = f0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, g0 = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ad(e, t, n) {
  var r, o = {}, i = null, s = null;
  n !== void 0 && (i = "" + n), t.key !== void 0 && (i = "" + t.key), t.ref !== void 0 && (s = t.ref);
  for (r in t) h0.call(t, r) && !g0.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: d0, type: e, key: i, ref: s, props: o, _owner: m0.current };
}
zs.Fragment = p0;
zs.jsx = Ad;
zs.jsxs = Ad;
Sd.exports = zs;
var v = Sd.exports, Rd = { exports: {} }, nt = {}, $d = { exports: {} }, Id = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(e) {
  function t(j, S) {
    var R = j.length;
    j.push(S);
    e: for (; 0 < R; ) {
      var D = R - 1 >>> 1, b = j[D];
      if (0 < o(b, S)) j[D] = S, j[R] = b, R = D;
      else break e;
    }
  }
  function n(j) {
    return j.length === 0 ? null : j[0];
  }
  function r(j) {
    if (j.length === 0) return null;
    var S = j[0], R = j.pop();
    if (R !== S) {
      j[0] = R;
      e: for (var D = 0, b = j.length, B = b >>> 1; D < B; ) {
        var U = 2 * (D + 1) - 1, Y = j[U], q = U + 1, Q = j[q];
        if (0 > o(Y, R)) q < b && 0 > o(Q, Y) ? (j[D] = Q, j[q] = R, D = q) : (j[D] = Y, j[U] = R, D = U);
        else if (q < b && 0 > o(Q, R)) j[D] = Q, j[q] = R, D = q;
        else break e;
      }
    }
    return S;
  }
  function o(j, S) {
    var R = j.sortIndex - S.sortIndex;
    return R !== 0 ? R : j.id - S.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var i = performance;
    e.unstable_now = function() {
      return i.now();
    };
  } else {
    var s = Date, l = s.now();
    e.unstable_now = function() {
      return s.now() - l;
    };
  }
  var a = [], u = [], c = 1, f = null, d = 3, p = !1, x = !1, y = !1, E = typeof setTimeout == "function" ? setTimeout : null, h = typeof clearTimeout == "function" ? clearTimeout : null, m = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function g(j) {
    for (var S = n(u); S !== null; ) {
      if (S.callback === null) r(u);
      else if (S.startTime <= j) r(u), S.sortIndex = S.expirationTime, t(a, S);
      else break;
      S = n(u);
    }
  }
  function w(j) {
    if (y = !1, g(j), !x) if (n(a) !== null) x = !0, z(N);
    else {
      var S = n(u);
      S !== null && L(w, S.startTime - j);
    }
  }
  function N(j, S) {
    x = !1, y && (y = !1, h(M), M = -1), p = !0;
    var R = d;
    try {
      for (g(S), f = n(a); f !== null && (!(f.expirationTime > S) || j && !F()); ) {
        var D = f.callback;
        if (typeof D == "function") {
          f.callback = null, d = f.priorityLevel;
          var b = D(f.expirationTime <= S);
          S = e.unstable_now(), typeof b == "function" ? f.callback = b : f === n(a) && r(a), g(S);
        } else r(a);
        f = n(a);
      }
      if (f !== null) var B = !0;
      else {
        var U = n(u);
        U !== null && L(w, U.startTime - S), B = !1;
      }
      return B;
    } finally {
      f = null, d = R, p = !1;
    }
  }
  var P = !1, T = null, M = -1, k = 5, A = -1;
  function F() {
    return !(e.unstable_now() - A < k);
  }
  function O() {
    if (T !== null) {
      var j = e.unstable_now();
      A = j;
      var S = !0;
      try {
        S = T(!0, j);
      } finally {
        S ? H() : (P = !1, T = null);
      }
    } else P = !1;
  }
  var H;
  if (typeof m == "function") H = function() {
    m(O);
  };
  else if (typeof MessageChannel < "u") {
    var _ = new MessageChannel(), $ = _.port2;
    _.port1.onmessage = O, H = function() {
      $.postMessage(null);
    };
  } else H = function() {
    E(O, 0);
  };
  function z(j) {
    T = j, P || (P = !0, H());
  }
  function L(j, S) {
    M = E(function() {
      j(e.unstable_now());
    }, S);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(j) {
    j.callback = null;
  }, e.unstable_continueExecution = function() {
    x || p || (x = !0, z(N));
  }, e.unstable_forceFrameRate = function(j) {
    0 > j || 125 < j ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : k = 0 < j ? Math.floor(1e3 / j) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return d;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(a);
  }, e.unstable_next = function(j) {
    switch (d) {
      case 1:
      case 2:
      case 3:
        var S = 3;
        break;
      default:
        S = d;
    }
    var R = d;
    d = S;
    try {
      return j();
    } finally {
      d = R;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(j, S) {
    switch (j) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        j = 3;
    }
    var R = d;
    d = j;
    try {
      return S();
    } finally {
      d = R;
    }
  }, e.unstable_scheduleCallback = function(j, S, R) {
    var D = e.unstable_now();
    switch (typeof R == "object" && R !== null ? (R = R.delay, R = typeof R == "number" && 0 < R ? D + R : D) : R = D, j) {
      case 1:
        var b = -1;
        break;
      case 2:
        b = 250;
        break;
      case 5:
        b = 1073741823;
        break;
      case 4:
        b = 1e4;
        break;
      default:
        b = 5e3;
    }
    return b = R + b, j = { id: c++, callback: S, priorityLevel: j, startTime: R, expirationTime: b, sortIndex: -1 }, R > D ? (j.sortIndex = R, t(u, j), n(a) === null && j === n(u) && (y ? (h(M), M = -1) : y = !0, L(w, R - D))) : (j.sortIndex = b, t(a, j), x || p || (x = !0, z(N))), j;
  }, e.unstable_shouldYield = F, e.unstable_wrapCallback = function(j) {
    var S = d;
    return function() {
      var R = d;
      d = S;
      try {
        return j.apply(this, arguments);
      } finally {
        d = R;
      }
    };
  };
})(Id);
$d.exports = Id;
var y0 = $d.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var v0 = C, et = y0;
function V(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Dd = /* @__PURE__ */ new Set(), Co = {};
function qn(e, t) {
  jr(e, t), jr(e + "Capture", t);
}
function jr(e, t) {
  for (Co[e] = t, e = 0; e < t.length; e++) Dd.add(t[e]);
}
var Ut = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), bl = Object.prototype.hasOwnProperty, w0 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, vc = {}, wc = {};
function x0(e) {
  return bl.call(wc, e) ? !0 : bl.call(vc, e) ? !1 : w0.test(e) ? wc[e] = !0 : (vc[e] = !0, !1);
}
function _0(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case "function":
    case "symbol":
      return !0;
    case "boolean":
      return r ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
    default:
      return !1;
  }
}
function S0(e, t, n, r) {
  if (t === null || typeof t > "u" || _0(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null) switch (n.type) {
    case 3:
      return !t;
    case 4:
      return t === !1;
    case 5:
      return isNaN(t);
    case 6:
      return isNaN(t) || 1 > t;
  }
  return !1;
}
function Be(e, t, n, r, o, i, s) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = o, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = i, this.removeEmptyString = s;
}
var Te = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  Te[e] = new Be(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  Te[t] = new Be(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  Te[e] = new Be(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  Te[e] = new Be(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  Te[e] = new Be(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  Te[e] = new Be(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  Te[e] = new Be(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  Te[e] = new Be(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  Te[e] = new Be(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var tu = /[\-:]([a-z])/g;
function nu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    tu,
    nu
  );
  Te[t] = new Be(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(tu, nu);
  Te[t] = new Be(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(tu, nu);
  Te[t] = new Be(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  Te[e] = new Be(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
Te.xlinkHref = new Be("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  Te[e] = new Be(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function ru(e, t, n, r) {
  var o = Te.hasOwnProperty(t) ? Te[t] : null;
  (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (S0(t, n, o, r) && (n = null), r || o === null ? x0(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName, r = o.attributeNamespace, n === null ? e.removeAttribute(t) : (o = o.type, n = o === 3 || o === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var qt = v0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, si = Symbol.for("react.element"), ur = Symbol.for("react.portal"), cr = Symbol.for("react.fragment"), ou = Symbol.for("react.strict_mode"), Hl = Symbol.for("react.profiler"), Ld = Symbol.for("react.provider"), Od = Symbol.for("react.context"), iu = Symbol.for("react.forward_ref"), Vl = Symbol.for("react.suspense"), Bl = Symbol.for("react.suspense_list"), su = Symbol.for("react.memo"), en = Symbol.for("react.lazy"), Fd = Symbol.for("react.offscreen"), xc = Symbol.iterator;
function qr(e) {
  return e === null || typeof e != "object" ? null : (e = xc && e[xc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var pe = Object.assign, nl;
function uo(e) {
  if (nl === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    nl = t && t[1] || "";
  }
  return `
` + nl + e;
}
var rl = !1;
function ol(e, t) {
  if (!e || rl) return "";
  rl = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t) if (t = function() {
      throw Error();
    }, Object.defineProperty(t.prototype, "props", { set: function() {
      throw Error();
    } }), typeof Reflect == "object" && Reflect.construct) {
      try {
        Reflect.construct(t, []);
      } catch (u) {
        var r = u;
      }
      Reflect.construct(e, [], t);
    } else {
      try {
        t.call();
      } catch (u) {
        r = u;
      }
      e.call(t.prototype);
    }
    else {
      try {
        throw Error();
      } catch (u) {
        r = u;
      }
      e();
    }
  } catch (u) {
    if (u && r && typeof u.stack == "string") {
      for (var o = u.stack.split(`
`), i = r.stack.split(`
`), s = o.length - 1, l = i.length - 1; 1 <= s && 0 <= l && o[s] !== i[l]; ) l--;
      for (; 1 <= s && 0 <= l; s--, l--) if (o[s] !== i[l]) {
        if (s !== 1 || l !== 1)
          do
            if (s--, l--, 0 > l || o[s] !== i[l]) {
              var a = `
` + o[s].replace(" at new ", " at ");
              return e.displayName && a.includes("<anonymous>") && (a = a.replace("<anonymous>", e.displayName)), a;
            }
          while (1 <= s && 0 <= l);
        break;
      }
    }
  } finally {
    rl = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? uo(e) : "";
}
function k0(e) {
  switch (e.tag) {
    case 5:
      return uo(e.type);
    case 16:
      return uo("Lazy");
    case 13:
      return uo("Suspense");
    case 19:
      return uo("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = ol(e.type, !1), e;
    case 11:
      return e = ol(e.type.render, !1), e;
    case 1:
      return e = ol(e.type, !0), e;
    default:
      return "";
  }
}
function Ul(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case cr:
      return "Fragment";
    case ur:
      return "Portal";
    case Hl:
      return "Profiler";
    case ou:
      return "StrictMode";
    case Vl:
      return "Suspense";
    case Bl:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case Od:
      return (e.displayName || "Context") + ".Consumer";
    case Ld:
      return (e._context.displayName || "Context") + ".Provider";
    case iu:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case su:
      return t = e.displayName || null, t !== null ? t : Ul(e.type) || "Memo";
    case en:
      t = e._payload, e = e._init;
      try {
        return Ul(e(t));
      } catch {
      }
  }
  return null;
}
function E0(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return "Cache";
    case 9:
      return (t.displayName || "Context") + ".Consumer";
    case 10:
      return (t._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return e = t.render, e = e.displayName || e.name || "", t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return t;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Ul(t);
    case 8:
      return t === ou ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == "function") return t.displayName || t.name || null;
      if (typeof t == "string") return t;
  }
  return null;
}
function xn(e) {
  switch (typeof e) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return e;
    case "object":
      return e;
    default:
      return "";
  }
}
function bd(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function N0(e) {
  var t = bd(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
  if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
    var o = n.get, i = n.set;
    return Object.defineProperty(e, t, { configurable: !0, get: function() {
      return o.call(this);
    }, set: function(s) {
      r = "" + s, i.call(this, s);
    } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
      return r;
    }, setValue: function(s) {
      r = "" + s;
    }, stopTracking: function() {
      e._valueTracker = null, delete e[t];
    } };
  }
}
function li(e) {
  e._valueTracker || (e._valueTracker = N0(e));
}
function Hd(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = bd(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function Xi(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Wl(e, t) {
  var n = t.checked;
  return pe({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function _c(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = xn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Vd(e, t) {
  t = t.checked, t != null && ru(e, "checked", t, !1);
}
function Yl(e, t) {
  Vd(e, t);
  var n = xn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? Xl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Xl(e, t.type, xn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function Sc(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function Xl(e, t, n) {
  (t !== "number" || Xi(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var co = Array.isArray;
function Sr(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var o = 0; o < n.length; o++) t["$" + n[o]] = !0;
    for (n = 0; n < e.length; n++) o = t.hasOwnProperty("$" + e[n].value), e[n].selected !== o && (e[n].selected = o), o && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + xn(n), t = null, o = 0; o < e.length; o++) {
      if (e[o].value === n) {
        e[o].selected = !0, r && (e[o].defaultSelected = !0);
        return;
      }
      t !== null || e[o].disabled || (t = e[o]);
    }
    t !== null && (t.selected = !0);
  }
}
function Kl(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(V(91));
  return pe({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function kc(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(V(92));
      if (co(n)) {
        if (1 < n.length) throw Error(V(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: xn(n) };
}
function Bd(e, t) {
  var n = xn(t.value), r = xn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function Ec(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Ud(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Gl(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Ud(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var ai, Wd = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, o) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, o);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (ai = ai || document.createElement("div"), ai.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = ai.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function zo(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var yo = {
  animationIterationCount: !0,
  aspectRatio: !0,
  borderImageOutset: !0,
  borderImageSlice: !0,
  borderImageWidth: !0,
  boxFlex: !0,
  boxFlexGroup: !0,
  boxOrdinalGroup: !0,
  columnCount: !0,
  columns: !0,
  flex: !0,
  flexGrow: !0,
  flexPositive: !0,
  flexShrink: !0,
  flexNegative: !0,
  flexOrder: !0,
  gridArea: !0,
  gridRow: !0,
  gridRowEnd: !0,
  gridRowSpan: !0,
  gridRowStart: !0,
  gridColumn: !0,
  gridColumnEnd: !0,
  gridColumnSpan: !0,
  gridColumnStart: !0,
  fontWeight: !0,
  lineClamp: !0,
  lineHeight: !0,
  opacity: !0,
  order: !0,
  orphans: !0,
  tabSize: !0,
  widows: !0,
  zIndex: !0,
  zoom: !0,
  fillOpacity: !0,
  floodOpacity: !0,
  stopOpacity: !0,
  strokeDasharray: !0,
  strokeDashoffset: !0,
  strokeMiterlimit: !0,
  strokeOpacity: !0,
  strokeWidth: !0
}, C0 = ["Webkit", "ms", "Moz", "O"];
Object.keys(yo).forEach(function(e) {
  C0.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), yo[t] = yo[e];
  });
});
function Yd(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || yo.hasOwnProperty(e) && yo[e] ? ("" + t).trim() : t + "px";
}
function Xd(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, o = Yd(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : e[n] = o;
  }
}
var z0 = pe({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function ql(e, t) {
  if (t) {
    if (z0[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(V(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(V(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(V(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(V(62));
  }
}
function Ql(e, t) {
  if (e.indexOf("-") === -1) return typeof t.is == "string";
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var Zl = null;
function lu(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Jl = null, kr = null, Er = null;
function Nc(e) {
  if (e = ei(e)) {
    if (typeof Jl != "function") throw Error(V(280));
    var t = e.stateNode;
    t && (t = As(t), Jl(e.stateNode, e.type, t));
  }
}
function Kd(e) {
  kr ? Er ? Er.push(e) : Er = [e] : kr = e;
}
function Gd() {
  if (kr) {
    var e = kr, t = Er;
    if (Er = kr = null, Nc(e), t) for (e = 0; e < t.length; e++) Nc(t[e]);
  }
}
function qd(e, t) {
  return e(t);
}
function Qd() {
}
var il = !1;
function Zd(e, t, n) {
  if (il) return e(t, n);
  il = !0;
  try {
    return qd(e, t, n);
  } finally {
    il = !1, (kr !== null || Er !== null) && (Qd(), Gd());
  }
}
function Po(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = As(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (r = !r.disabled) || (e = e.type, r = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !r;
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != "function") throw Error(V(231, t, typeof n));
  return n;
}
var ea = !1;
if (Ut) try {
  var Qr = {};
  Object.defineProperty(Qr, "passive", { get: function() {
    ea = !0;
  } }), window.addEventListener("test", Qr, Qr), window.removeEventListener("test", Qr, Qr);
} catch {
  ea = !1;
}
function P0(e, t, n, r, o, i, s, l, a) {
  var u = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, u);
  } catch (c) {
    this.onError(c);
  }
}
var vo = !1, Ki = null, Gi = !1, ta = null, M0 = { onError: function(e) {
  vo = !0, Ki = e;
} };
function T0(e, t, n, r, o, i, s, l, a) {
  vo = !1, Ki = null, P0.apply(M0, arguments);
}
function j0(e, t, n, r, o, i, s, l, a) {
  if (T0.apply(this, arguments), vo) {
    if (vo) {
      var u = Ki;
      vo = !1, Ki = null;
    } else throw Error(V(198));
    Gi || (Gi = !0, ta = u);
  }
}
function Qn(e) {
  var t = e, n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do
      t = e, t.flags & 4098 && (n = t.return), e = t.return;
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function Jd(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function Cc(e) {
  if (Qn(e) !== e) throw Error(V(188));
}
function A0(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Qn(e), t === null) throw Error(V(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var o = n.return;
    if (o === null) break;
    var i = o.alternate;
    if (i === null) {
      if (r = o.return, r !== null) {
        n = r;
        continue;
      }
      break;
    }
    if (o.child === i.child) {
      for (i = o.child; i; ) {
        if (i === n) return Cc(o), e;
        if (i === r) return Cc(o), t;
        i = i.sibling;
      }
      throw Error(V(188));
    }
    if (n.return !== r.return) n = o, r = i;
    else {
      for (var s = !1, l = o.child; l; ) {
        if (l === n) {
          s = !0, n = o, r = i;
          break;
        }
        if (l === r) {
          s = !0, r = o, n = i;
          break;
        }
        l = l.sibling;
      }
      if (!s) {
        for (l = i.child; l; ) {
          if (l === n) {
            s = !0, n = i, r = o;
            break;
          }
          if (l === r) {
            s = !0, r = i, n = o;
            break;
          }
          l = l.sibling;
        }
        if (!s) throw Error(V(189));
      }
    }
    if (n.alternate !== r) throw Error(V(190));
  }
  if (n.tag !== 3) throw Error(V(188));
  return n.stateNode.current === n ? e : t;
}
function ep(e) {
  return e = A0(e), e !== null ? tp(e) : null;
}
function tp(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = tp(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var np = et.unstable_scheduleCallback, zc = et.unstable_cancelCallback, R0 = et.unstable_shouldYield, $0 = et.unstable_requestPaint, ye = et.unstable_now, I0 = et.unstable_getCurrentPriorityLevel, au = et.unstable_ImmediatePriority, rp = et.unstable_UserBlockingPriority, qi = et.unstable_NormalPriority, D0 = et.unstable_LowPriority, op = et.unstable_IdlePriority, Ps = null, Mt = null;
function L0(e) {
  if (Mt && typeof Mt.onCommitFiberRoot == "function") try {
    Mt.onCommitFiberRoot(Ps, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var _t = Math.clz32 ? Math.clz32 : b0, O0 = Math.log, F0 = Math.LN2;
function b0(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (O0(e) / F0 | 0) | 0;
}
var ui = 64, ci = 4194304;
function fo(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function Qi(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, o = e.suspendedLanes, i = e.pingedLanes, s = n & 268435455;
  if (s !== 0) {
    var l = s & ~o;
    l !== 0 ? r = fo(l) : (i &= s, i !== 0 && (r = fo(i)));
  } else s = n & ~o, s !== 0 ? r = fo(s) : i !== 0 && (r = fo(i));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & o) && (o = r & -r, i = t & -t, o >= i || o === 16 && (i & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - _t(t), o = 1 << n, r |= e[n], t &= ~o;
  return r;
}
function H0(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function V0(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
    var s = 31 - _t(i), l = 1 << s, a = o[s];
    a === -1 ? (!(l & n) || l & r) && (o[s] = H0(l, t)) : a <= t && (e.expiredLanes |= l), i &= ~l;
  }
}
function na(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function ip() {
  var e = ui;
  return ui <<= 1, !(ui & 4194240) && (ui = 64), e;
}
function sl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function Zo(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - _t(t), e[t] = n;
}
function B0(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var o = 31 - _t(n), i = 1 << o;
    t[o] = 0, r[o] = -1, e[o] = -1, n &= ~i;
  }
}
function uu(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - _t(n), o = 1 << r;
    o & t | e[r] & t && (e[r] |= t), n &= ~o;
  }
}
var oe = 0;
function sp(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var lp, cu, ap, up, cp, ra = !1, fi = [], fn = null, dn = null, pn = null, Mo = /* @__PURE__ */ new Map(), To = /* @__PURE__ */ new Map(), on = [], U0 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Pc(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      fn = null;
      break;
    case "dragenter":
    case "dragleave":
      dn = null;
      break;
    case "mouseover":
    case "mouseout":
      pn = null;
      break;
    case "pointerover":
    case "pointerout":
      Mo.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      To.delete(t.pointerId);
  }
}
function Zr(e, t, n, r, o, i) {
  return e === null || e.nativeEvent !== i ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: i, targetContainers: [o] }, t !== null && (t = ei(t), t !== null && cu(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e);
}
function W0(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return fn = Zr(fn, e, t, n, r, o), !0;
    case "dragenter":
      return dn = Zr(dn, e, t, n, r, o), !0;
    case "mouseover":
      return pn = Zr(pn, e, t, n, r, o), !0;
    case "pointerover":
      var i = o.pointerId;
      return Mo.set(i, Zr(Mo.get(i) || null, e, t, n, r, o)), !0;
    case "gotpointercapture":
      return i = o.pointerId, To.set(i, Zr(To.get(i) || null, e, t, n, r, o)), !0;
  }
  return !1;
}
function fp(e) {
  var t = $n(e.target);
  if (t !== null) {
    var n = Qn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Jd(n), t !== null) {
          e.blockedOn = t, cp(e.priority, function() {
            ap(n);
          });
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function Ri(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = oa(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      Zl = r, n.target.dispatchEvent(r), Zl = null;
    } else return t = ei(n), t !== null && cu(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function Mc(e, t, n) {
  Ri(e) && n.delete(t);
}
function Y0() {
  ra = !1, fn !== null && Ri(fn) && (fn = null), dn !== null && Ri(dn) && (dn = null), pn !== null && Ri(pn) && (pn = null), Mo.forEach(Mc), To.forEach(Mc);
}
function Jr(e, t) {
  e.blockedOn === t && (e.blockedOn = null, ra || (ra = !0, et.unstable_scheduleCallback(et.unstable_NormalPriority, Y0)));
}
function jo(e) {
  function t(o) {
    return Jr(o, e);
  }
  if (0 < fi.length) {
    Jr(fi[0], e);
    for (var n = 1; n < fi.length; n++) {
      var r = fi[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (fn !== null && Jr(fn, e), dn !== null && Jr(dn, e), pn !== null && Jr(pn, e), Mo.forEach(t), To.forEach(t), n = 0; n < on.length; n++) r = on[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < on.length && (n = on[0], n.blockedOn === null); ) fp(n), n.blockedOn === null && on.shift();
}
var Nr = qt.ReactCurrentBatchConfig, Zi = !0;
function X0(e, t, n, r) {
  var o = oe, i = Nr.transition;
  Nr.transition = null;
  try {
    oe = 1, fu(e, t, n, r);
  } finally {
    oe = o, Nr.transition = i;
  }
}
function K0(e, t, n, r) {
  var o = oe, i = Nr.transition;
  Nr.transition = null;
  try {
    oe = 4, fu(e, t, n, r);
  } finally {
    oe = o, Nr.transition = i;
  }
}
function fu(e, t, n, r) {
  if (Zi) {
    var o = oa(e, t, n, r);
    if (o === null) gl(e, t, r, Ji, n), Pc(e, r);
    else if (W0(o, e, t, n, r)) r.stopPropagation();
    else if (Pc(e, r), t & 4 && -1 < U0.indexOf(e)) {
      for (; o !== null; ) {
        var i = ei(o);
        if (i !== null && lp(i), i = oa(e, t, n, r), i === null && gl(e, t, r, Ji, n), i === o) break;
        o = i;
      }
      o !== null && r.stopPropagation();
    } else gl(e, t, r, null, n);
  }
}
var Ji = null;
function oa(e, t, n, r) {
  if (Ji = null, e = lu(r), e = $n(e), e !== null) if (t = Qn(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Jd(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return Ji = e, null;
}
function dp(e) {
  switch (e) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (I0()) {
        case au:
          return 1;
        case rp:
          return 4;
        case qi:
        case D0:
          return 16;
        case op:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var un = null, du = null, $i = null;
function pp() {
  if ($i) return $i;
  var e, t = du, n = t.length, r, o = "value" in un ? un.value : un.textContent, i = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++) ;
  var s = n - e;
  for (r = 1; r <= s && t[n - r] === o[i - r]; r++) ;
  return $i = o.slice(e, 1 < r ? 1 - r : void 0);
}
function Ii(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function di() {
  return !0;
}
function Tc() {
  return !1;
}
function rt(e) {
  function t(n, r, o, i, s) {
    this._reactName = n, this._targetInst = o, this.type = r, this.nativeEvent = i, this.target = s, this.currentTarget = null;
    for (var l in e) e.hasOwnProperty(l) && (n = e[l], this[l] = n ? n(i) : i[l]);
    return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? di : Tc, this.isPropagationStopped = Tc, this;
  }
  return pe(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = di);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = di);
  }, persist: function() {
  }, isPersistent: di }), t;
}
var Ur = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, pu = rt(Ur), Jo = pe({}, Ur, { view: 0, detail: 0 }), G0 = rt(Jo), ll, al, eo, Ms = pe({}, Jo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: hu, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== eo && (eo && e.type === "mousemove" ? (ll = e.screenX - eo.screenX, al = e.screenY - eo.screenY) : al = ll = 0, eo = e), ll);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : al;
} }), jc = rt(Ms), q0 = pe({}, Ms, { dataTransfer: 0 }), Q0 = rt(q0), Z0 = pe({}, Jo, { relatedTarget: 0 }), ul = rt(Z0), J0 = pe({}, Ur, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), ey = rt(J0), ty = pe({}, Ur, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), ny = rt(ty), ry = pe({}, Ur, { data: 0 }), Ac = rt(ry), oy = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, iy = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, sy = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function ly(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = sy[e]) ? !!t[e] : !1;
}
function hu() {
  return ly;
}
var ay = pe({}, Jo, { key: function(e) {
  if (e.key) {
    var t = oy[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Ii(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? iy[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: hu, charCode: function(e) {
  return e.type === "keypress" ? Ii(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Ii(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), uy = rt(ay), cy = pe({}, Ms, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Rc = rt(cy), fy = pe({}, Jo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: hu }), dy = rt(fy), py = pe({}, Ur, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), hy = rt(py), my = pe({}, Ms, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), gy = rt(my), yy = [9, 13, 27, 32], mu = Ut && "CompositionEvent" in window, wo = null;
Ut && "documentMode" in document && (wo = document.documentMode);
var vy = Ut && "TextEvent" in window && !wo, hp = Ut && (!mu || wo && 8 < wo && 11 >= wo), $c = " ", Ic = !1;
function mp(e, t) {
  switch (e) {
    case "keyup":
      return yy.indexOf(t.keyCode) !== -1;
    case "keydown":
      return t.keyCode !== 229;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function gp(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var fr = !1;
function wy(e, t) {
  switch (e) {
    case "compositionend":
      return gp(t);
    case "keypress":
      return t.which !== 32 ? null : (Ic = !0, $c);
    case "textInput":
      return e = t.data, e === $c && Ic ? null : e;
    default:
      return null;
  }
}
function xy(e, t) {
  if (fr) return e === "compositionend" || !mu && mp(e, t) ? (e = pp(), $i = du = un = null, fr = !1, e) : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return hp && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var _y = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function Dc(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!_y[e.type] : t === "textarea";
}
function yp(e, t, n, r) {
  Kd(r), t = es(t, "onChange"), 0 < t.length && (n = new pu("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var xo = null, Ao = null;
function Sy(e) {
  Pp(e, 0);
}
function Ts(e) {
  var t = hr(e);
  if (Hd(t)) return e;
}
function ky(e, t) {
  if (e === "change") return t;
}
var vp = !1;
if (Ut) {
  var cl;
  if (Ut) {
    var fl = "oninput" in document;
    if (!fl) {
      var Lc = document.createElement("div");
      Lc.setAttribute("oninput", "return;"), fl = typeof Lc.oninput == "function";
    }
    cl = fl;
  } else cl = !1;
  vp = cl && (!document.documentMode || 9 < document.documentMode);
}
function Oc() {
  xo && (xo.detachEvent("onpropertychange", wp), Ao = xo = null);
}
function wp(e) {
  if (e.propertyName === "value" && Ts(Ao)) {
    var t = [];
    yp(t, Ao, e, lu(e)), Zd(Sy, t);
  }
}
function Ey(e, t, n) {
  e === "focusin" ? (Oc(), xo = t, Ao = n, xo.attachEvent("onpropertychange", wp)) : e === "focusout" && Oc();
}
function Ny(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ts(Ao);
}
function Cy(e, t) {
  if (e === "click") return Ts(t);
}
function zy(e, t) {
  if (e === "input" || e === "change") return Ts(t);
}
function Py(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var kt = typeof Object.is == "function" ? Object.is : Py;
function Ro(e, t) {
  if (kt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!bl.call(t, o) || !kt(e[o], t[o])) return !1;
  }
  return !0;
}
function Fc(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function bc(e, t) {
  var n = Fc(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (r = e + n.textContent.length, e <= t && r >= t) return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = Fc(n);
  }
}
function xp(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? xp(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function _p() {
  for (var e = window, t = Xi(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Xi(e.document);
  }
  return t;
}
function gu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function My(e) {
  var t = _p(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && xp(n.ownerDocument.documentElement, n)) {
    if (r !== null && gu(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var o = n.textContent.length, i = Math.min(r.start, o);
        r = r.end === void 0 ? i : Math.min(r.end, o), !e.extend && i > r && (o = r, r = i, i = o), o = bc(n, i);
        var s = bc(
          n,
          r
        );
        o && s && (e.rangeCount !== 1 || e.anchorNode !== o.node || e.anchorOffset !== o.offset || e.focusNode !== s.node || e.focusOffset !== s.offset) && (t = t.createRange(), t.setStart(o.node, o.offset), e.removeAllRanges(), i > r ? (e.addRange(t), e.extend(s.node, s.offset)) : (t.setEnd(s.node, s.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
  }
}
var Ty = Ut && "documentMode" in document && 11 >= document.documentMode, dr = null, ia = null, _o = null, sa = !1;
function Hc(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  sa || dr == null || dr !== Xi(r) || (r = dr, "selectionStart" in r && gu(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), _o && Ro(_o, r) || (_o = r, r = es(ia, "onSelect"), 0 < r.length && (t = new pu("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = dr)));
}
function pi(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var pr = { animationend: pi("Animation", "AnimationEnd"), animationiteration: pi("Animation", "AnimationIteration"), animationstart: pi("Animation", "AnimationStart"), transitionend: pi("Transition", "TransitionEnd") }, dl = {}, Sp = {};
Ut && (Sp = document.createElement("div").style, "AnimationEvent" in window || (delete pr.animationend.animation, delete pr.animationiteration.animation, delete pr.animationstart.animation), "TransitionEvent" in window || delete pr.transitionend.transition);
function js(e) {
  if (dl[e]) return dl[e];
  if (!pr[e]) return e;
  var t = pr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in Sp) return dl[e] = t[n];
  return e;
}
var kp = js("animationend"), Ep = js("animationiteration"), Np = js("animationstart"), Cp = js("transitionend"), zp = /* @__PURE__ */ new Map(), Vc = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function Sn(e, t) {
  zp.set(e, t), qn(t, [e]);
}
for (var pl = 0; pl < Vc.length; pl++) {
  var hl = Vc[pl], jy = hl.toLowerCase(), Ay = hl[0].toUpperCase() + hl.slice(1);
  Sn(jy, "on" + Ay);
}
Sn(kp, "onAnimationEnd");
Sn(Ep, "onAnimationIteration");
Sn(Np, "onAnimationStart");
Sn("dblclick", "onDoubleClick");
Sn("focusin", "onFocus");
Sn("focusout", "onBlur");
Sn(Cp, "onTransitionEnd");
jr("onMouseEnter", ["mouseout", "mouseover"]);
jr("onMouseLeave", ["mouseout", "mouseover"]);
jr("onPointerEnter", ["pointerout", "pointerover"]);
jr("onPointerLeave", ["pointerout", "pointerover"]);
qn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
qn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
qn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
qn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
qn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
qn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var po = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Ry = new Set("cancel close invalid load scroll toggle".split(" ").concat(po));
function Bc(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, j0(r, t, void 0, e), e.currentTarget = null;
}
function Pp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], o = r.event;
    r = r.listeners;
    e: {
      var i = void 0;
      if (t) for (var s = r.length - 1; 0 <= s; s--) {
        var l = r[s], a = l.instance, u = l.currentTarget;
        if (l = l.listener, a !== i && o.isPropagationStopped()) break e;
        Bc(o, l, u), i = a;
      }
      else for (s = 0; s < r.length; s++) {
        if (l = r[s], a = l.instance, u = l.currentTarget, l = l.listener, a !== i && o.isPropagationStopped()) break e;
        Bc(o, l, u), i = a;
      }
    }
  }
  if (Gi) throw e = ta, Gi = !1, ta = null, e;
}
function ae(e, t) {
  var n = t[fa];
  n === void 0 && (n = t[fa] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (Mp(t, e, 2, !1), n.add(r));
}
function ml(e, t, n) {
  var r = 0;
  t && (r |= 4), Mp(n, e, r, t);
}
var hi = "_reactListening" + Math.random().toString(36).slice(2);
function $o(e) {
  if (!e[hi]) {
    e[hi] = !0, Dd.forEach(function(n) {
      n !== "selectionchange" && (Ry.has(n) || ml(n, !1, e), ml(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[hi] || (t[hi] = !0, ml("selectionchange", !1, t));
  }
}
function Mp(e, t, n, r) {
  switch (dp(t)) {
    case 1:
      var o = X0;
      break;
    case 4:
      o = K0;
      break;
    default:
      o = fu;
  }
  n = o.bind(null, t, n, e), o = void 0, !ea || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), r ? o !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: o }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, { passive: o }) : e.addEventListener(t, n, !1);
}
function gl(e, t, n, r, o) {
  var i = r;
  if (!(t & 1) && !(t & 2) && r !== null) e: for (; ; ) {
    if (r === null) return;
    var s = r.tag;
    if (s === 3 || s === 4) {
      var l = r.stateNode.containerInfo;
      if (l === o || l.nodeType === 8 && l.parentNode === o) break;
      if (s === 4) for (s = r.return; s !== null; ) {
        var a = s.tag;
        if ((a === 3 || a === 4) && (a = s.stateNode.containerInfo, a === o || a.nodeType === 8 && a.parentNode === o)) return;
        s = s.return;
      }
      for (; l !== null; ) {
        if (s = $n(l), s === null) return;
        if (a = s.tag, a === 5 || a === 6) {
          r = i = s;
          continue e;
        }
        l = l.parentNode;
      }
    }
    r = r.return;
  }
  Zd(function() {
    var u = i, c = lu(n), f = [];
    e: {
      var d = zp.get(e);
      if (d !== void 0) {
        var p = pu, x = e;
        switch (e) {
          case "keypress":
            if (Ii(n) === 0) break e;
          case "keydown":
          case "keyup":
            p = uy;
            break;
          case "focusin":
            x = "focus", p = ul;
            break;
          case "focusout":
            x = "blur", p = ul;
            break;
          case "beforeblur":
          case "afterblur":
            p = ul;
            break;
          case "click":
            if (n.button === 2) break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            p = jc;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            p = Q0;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            p = dy;
            break;
          case kp:
          case Ep:
          case Np:
            p = ey;
            break;
          case Cp:
            p = hy;
            break;
          case "scroll":
            p = G0;
            break;
          case "wheel":
            p = gy;
            break;
          case "copy":
          case "cut":
          case "paste":
            p = ny;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            p = Rc;
        }
        var y = (t & 4) !== 0, E = !y && e === "scroll", h = y ? d !== null ? d + "Capture" : null : d;
        y = [];
        for (var m = u, g; m !== null; ) {
          g = m;
          var w = g.stateNode;
          if (g.tag === 5 && w !== null && (g = w, h !== null && (w = Po(m, h), w != null && y.push(Io(m, w, g)))), E) break;
          m = m.return;
        }
        0 < y.length && (d = new p(d, x, null, n, c), f.push({ event: d, listeners: y }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (d = e === "mouseover" || e === "pointerover", p = e === "mouseout" || e === "pointerout", d && n !== Zl && (x = n.relatedTarget || n.fromElement) && ($n(x) || x[Wt])) break e;
        if ((p || d) && (d = c.window === c ? c : (d = c.ownerDocument) ? d.defaultView || d.parentWindow : window, p ? (x = n.relatedTarget || n.toElement, p = u, x = x ? $n(x) : null, x !== null && (E = Qn(x), x !== E || x.tag !== 5 && x.tag !== 6) && (x = null)) : (p = null, x = u), p !== x)) {
          if (y = jc, w = "onMouseLeave", h = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (y = Rc, w = "onPointerLeave", h = "onPointerEnter", m = "pointer"), E = p == null ? d : hr(p), g = x == null ? d : hr(x), d = new y(w, m + "leave", p, n, c), d.target = E, d.relatedTarget = g, w = null, $n(c) === u && (y = new y(h, m + "enter", x, n, c), y.target = g, y.relatedTarget = E, w = y), E = w, p && x) t: {
            for (y = p, h = x, m = 0, g = y; g; g = rr(g)) m++;
            for (g = 0, w = h; w; w = rr(w)) g++;
            for (; 0 < m - g; ) y = rr(y), m--;
            for (; 0 < g - m; ) h = rr(h), g--;
            for (; m--; ) {
              if (y === h || h !== null && y === h.alternate) break t;
              y = rr(y), h = rr(h);
            }
            y = null;
          }
          else y = null;
          p !== null && Uc(f, d, p, y, !1), x !== null && E !== null && Uc(f, E, x, y, !0);
        }
      }
      e: {
        if (d = u ? hr(u) : window, p = d.nodeName && d.nodeName.toLowerCase(), p === "select" || p === "input" && d.type === "file") var N = ky;
        else if (Dc(d)) if (vp) N = zy;
        else {
          N = Ny;
          var P = Ey;
        }
        else (p = d.nodeName) && p.toLowerCase() === "input" && (d.type === "checkbox" || d.type === "radio") && (N = Cy);
        if (N && (N = N(e, u))) {
          yp(f, N, n, c);
          break e;
        }
        P && P(e, d, u), e === "focusout" && (P = d._wrapperState) && P.controlled && d.type === "number" && Xl(d, "number", d.value);
      }
      switch (P = u ? hr(u) : window, e) {
        case "focusin":
          (Dc(P) || P.contentEditable === "true") && (dr = P, ia = u, _o = null);
          break;
        case "focusout":
          _o = ia = dr = null;
          break;
        case "mousedown":
          sa = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          sa = !1, Hc(f, n, c);
          break;
        case "selectionchange":
          if (Ty) break;
        case "keydown":
        case "keyup":
          Hc(f, n, c);
      }
      var T;
      if (mu) e: {
        switch (e) {
          case "compositionstart":
            var M = "onCompositionStart";
            break e;
          case "compositionend":
            M = "onCompositionEnd";
            break e;
          case "compositionupdate":
            M = "onCompositionUpdate";
            break e;
        }
        M = void 0;
      }
      else fr ? mp(e, n) && (M = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (M = "onCompositionStart");
      M && (hp && n.locale !== "ko" && (fr || M !== "onCompositionStart" ? M === "onCompositionEnd" && fr && (T = pp()) : (un = c, du = "value" in un ? un.value : un.textContent, fr = !0)), P = es(u, M), 0 < P.length && (M = new Ac(M, e, null, n, c), f.push({ event: M, listeners: P }), T ? M.data = T : (T = gp(n), T !== null && (M.data = T)))), (T = vy ? wy(e, n) : xy(e, n)) && (u = es(u, "onBeforeInput"), 0 < u.length && (c = new Ac("onBeforeInput", "beforeinput", null, n, c), f.push({ event: c, listeners: u }), c.data = T));
    }
    Pp(f, t);
  });
}
function Io(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function es(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var o = e, i = o.stateNode;
    o.tag === 5 && i !== null && (o = i, i = Po(e, n), i != null && r.unshift(Io(e, i, o)), i = Po(e, t), i != null && r.push(Io(e, i, o))), e = e.return;
  }
  return r;
}
function rr(e) {
  if (e === null) return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function Uc(e, t, n, r, o) {
  for (var i = t._reactName, s = []; n !== null && n !== r; ) {
    var l = n, a = l.alternate, u = l.stateNode;
    if (a !== null && a === r) break;
    l.tag === 5 && u !== null && (l = u, o ? (a = Po(n, i), a != null && s.unshift(Io(n, a, l))) : o || (a = Po(n, i), a != null && s.push(Io(n, a, l)))), n = n.return;
  }
  s.length !== 0 && e.push({ event: t, listeners: s });
}
var $y = /\r\n?/g, Iy = /\u0000|\uFFFD/g;
function Wc(e) {
  return (typeof e == "string" ? e : "" + e).replace($y, `
`).replace(Iy, "");
}
function mi(e, t, n) {
  if (t = Wc(t), Wc(e) !== t && n) throw Error(V(425));
}
function ts() {
}
var la = null, aa = null;
function ua(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var ca = typeof setTimeout == "function" ? setTimeout : void 0, Dy = typeof clearTimeout == "function" ? clearTimeout : void 0, Yc = typeof Promise == "function" ? Promise : void 0, Ly = typeof queueMicrotask == "function" ? queueMicrotask : typeof Yc < "u" ? function(e) {
  return Yc.resolve(null).then(e).catch(Oy);
} : ca;
function Oy(e) {
  setTimeout(function() {
    throw e;
  });
}
function yl(e, t) {
  var n = t, r = 0;
  do {
    var o = n.nextSibling;
    if (e.removeChild(n), o && o.nodeType === 8) if (n = o.data, n === "/$") {
      if (r === 0) {
        e.removeChild(o), jo(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = o;
  } while (n);
  jo(t);
}
function hn(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
      if (t === "/$") return null;
    }
  }
  return e;
}
function Xc(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0) return e;
        t--;
      } else n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var Wr = Math.random().toString(36).slice(2), Pt = "__reactFiber$" + Wr, Do = "__reactProps$" + Wr, Wt = "__reactContainer$" + Wr, fa = "__reactEvents$" + Wr, Fy = "__reactListeners$" + Wr, by = "__reactHandles$" + Wr;
function $n(e) {
  var t = e[Pt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Wt] || n[Pt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = Xc(e); e !== null; ) {
        if (n = e[Pt]) return n;
        e = Xc(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function ei(e) {
  return e = e[Pt] || e[Wt], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function hr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(V(33));
}
function As(e) {
  return e[Do] || null;
}
var da = [], mr = -1;
function kn(e) {
  return { current: e };
}
function ue(e) {
  0 > mr || (e.current = da[mr], da[mr] = null, mr--);
}
function se(e, t) {
  mr++, da[mr] = e.current, e.current = t;
}
var _n = {}, Le = kn(_n), Xe = kn(!1), Bn = _n;
function Ar(e, t) {
  var n = e.type.contextTypes;
  if (!n) return _n;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var o = {}, i;
  for (i in n) o[i] = t[i];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = o), o;
}
function Ke(e) {
  return e = e.childContextTypes, e != null;
}
function ns() {
  ue(Xe), ue(Le);
}
function Kc(e, t, n) {
  if (Le.current !== _n) throw Error(V(168));
  se(Le, t), se(Xe, n);
}
function Tp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(V(108, E0(e) || "Unknown", o));
  return pe({}, n, r);
}
function rs(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || _n, Bn = Le.current, se(Le, e), se(Xe, Xe.current), !0;
}
function Gc(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(V(169));
  n ? (e = Tp(e, t, Bn), r.__reactInternalMemoizedMergedChildContext = e, ue(Xe), ue(Le), se(Le, e)) : ue(Xe), se(Xe, n);
}
var Ot = null, Rs = !1, vl = !1;
function jp(e) {
  Ot === null ? Ot = [e] : Ot.push(e);
}
function Hy(e) {
  Rs = !0, jp(e);
}
function En() {
  if (!vl && Ot !== null) {
    vl = !0;
    var e = 0, t = oe;
    try {
      var n = Ot;
      for (oe = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      Ot = null, Rs = !1;
    } catch (o) {
      throw Ot !== null && (Ot = Ot.slice(e + 1)), np(au, En), o;
    } finally {
      oe = t, vl = !1;
    }
  }
  return null;
}
var gr = [], yr = 0, os = null, is = 0, ot = [], it = 0, Un = null, Ft = 1, bt = "";
function jn(e, t) {
  gr[yr++] = is, gr[yr++] = os, os = e, is = t;
}
function Ap(e, t, n) {
  ot[it++] = Ft, ot[it++] = bt, ot[it++] = Un, Un = e;
  var r = Ft;
  e = bt;
  var o = 32 - _t(r) - 1;
  r &= ~(1 << o), n += 1;
  var i = 32 - _t(t) + o;
  if (30 < i) {
    var s = o - o % 5;
    i = (r & (1 << s) - 1).toString(32), r >>= s, o -= s, Ft = 1 << 32 - _t(t) + o | n << o | r, bt = i + e;
  } else Ft = 1 << i | n << o | r, bt = e;
}
function yu(e) {
  e.return !== null && (jn(e, 1), Ap(e, 1, 0));
}
function vu(e) {
  for (; e === os; ) os = gr[--yr], gr[yr] = null, is = gr[--yr], gr[yr] = null;
  for (; e === Un; ) Un = ot[--it], ot[it] = null, bt = ot[--it], ot[it] = null, Ft = ot[--it], ot[it] = null;
}
var Je = null, Ze = null, ce = !1, wt = null;
function Rp(e, t) {
  var n = lt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function qc(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, Je = e, Ze = hn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, Je = e, Ze = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Un !== null ? { id: Ft, overflow: bt } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = lt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Je = e, Ze = null, !0) : !1;
    default:
      return !1;
  }
}
function pa(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function ha(e) {
  if (ce) {
    var t = Ze;
    if (t) {
      var n = t;
      if (!qc(e, t)) {
        if (pa(e)) throw Error(V(418));
        t = hn(n.nextSibling);
        var r = Je;
        t && qc(e, t) ? Rp(r, n) : (e.flags = e.flags & -4097 | 2, ce = !1, Je = e);
      }
    } else {
      if (pa(e)) throw Error(V(418));
      e.flags = e.flags & -4097 | 2, ce = !1, Je = e;
    }
  }
}
function Qc(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  Je = e;
}
function gi(e) {
  if (e !== Je) return !1;
  if (!ce) return Qc(e), ce = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !ua(e.type, e.memoizedProps)), t && (t = Ze)) {
    if (pa(e)) throw $p(), Error(V(418));
    for (; t; ) Rp(e, t), t = hn(t.nextSibling);
  }
  if (Qc(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(V(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              Ze = hn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      Ze = null;
    }
  } else Ze = Je ? hn(e.stateNode.nextSibling) : null;
  return !0;
}
function $p() {
  for (var e = Ze; e; ) e = hn(e.nextSibling);
}
function Rr() {
  Ze = Je = null, ce = !1;
}
function wu(e) {
  wt === null ? wt = [e] : wt.push(e);
}
var Vy = qt.ReactCurrentBatchConfig;
function to(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(V(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(V(147, e));
      var o = r, i = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === i ? t.ref : (t = function(s) {
        var l = o.refs;
        s === null ? delete l[i] : l[i] = s;
      }, t._stringRef = i, t);
    }
    if (typeof e != "string") throw Error(V(284));
    if (!n._owner) throw Error(V(290, e));
  }
  return e;
}
function yi(e, t) {
  throw e = Object.prototype.toString.call(t), Error(V(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function Zc(e) {
  var t = e._init;
  return t(e._payload);
}
function Ip(e) {
  function t(h, m) {
    if (e) {
      var g = h.deletions;
      g === null ? (h.deletions = [m], h.flags |= 16) : g.push(m);
    }
  }
  function n(h, m) {
    if (!e) return null;
    for (; m !== null; ) t(h, m), m = m.sibling;
    return null;
  }
  function r(h, m) {
    for (h = /* @__PURE__ */ new Map(); m !== null; ) m.key !== null ? h.set(m.key, m) : h.set(m.index, m), m = m.sibling;
    return h;
  }
  function o(h, m) {
    return h = vn(h, m), h.index = 0, h.sibling = null, h;
  }
  function i(h, m, g) {
    return h.index = g, e ? (g = h.alternate, g !== null ? (g = g.index, g < m ? (h.flags |= 2, m) : g) : (h.flags |= 2, m)) : (h.flags |= 1048576, m);
  }
  function s(h) {
    return e && h.alternate === null && (h.flags |= 2), h;
  }
  function l(h, m, g, w) {
    return m === null || m.tag !== 6 ? (m = Nl(g, h.mode, w), m.return = h, m) : (m = o(m, g), m.return = h, m);
  }
  function a(h, m, g, w) {
    var N = g.type;
    return N === cr ? c(h, m, g.props.children, w, g.key) : m !== null && (m.elementType === N || typeof N == "object" && N !== null && N.$$typeof === en && Zc(N) === m.type) ? (w = o(m, g.props), w.ref = to(h, m, g), w.return = h, w) : (w = Vi(g.type, g.key, g.props, null, h.mode, w), w.ref = to(h, m, g), w.return = h, w);
  }
  function u(h, m, g, w) {
    return m === null || m.tag !== 4 || m.stateNode.containerInfo !== g.containerInfo || m.stateNode.implementation !== g.implementation ? (m = Cl(g, h.mode, w), m.return = h, m) : (m = o(m, g.children || []), m.return = h, m);
  }
  function c(h, m, g, w, N) {
    return m === null || m.tag !== 7 ? (m = bn(g, h.mode, w, N), m.return = h, m) : (m = o(m, g), m.return = h, m);
  }
  function f(h, m, g) {
    if (typeof m == "string" && m !== "" || typeof m == "number") return m = Nl("" + m, h.mode, g), m.return = h, m;
    if (typeof m == "object" && m !== null) {
      switch (m.$$typeof) {
        case si:
          return g = Vi(m.type, m.key, m.props, null, h.mode, g), g.ref = to(h, null, m), g.return = h, g;
        case ur:
          return m = Cl(m, h.mode, g), m.return = h, m;
        case en:
          var w = m._init;
          return f(h, w(m._payload), g);
      }
      if (co(m) || qr(m)) return m = bn(m, h.mode, g, null), m.return = h, m;
      yi(h, m);
    }
    return null;
  }
  function d(h, m, g, w) {
    var N = m !== null ? m.key : null;
    if (typeof g == "string" && g !== "" || typeof g == "number") return N !== null ? null : l(h, m, "" + g, w);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case si:
          return g.key === N ? a(h, m, g, w) : null;
        case ur:
          return g.key === N ? u(h, m, g, w) : null;
        case en:
          return N = g._init, d(
            h,
            m,
            N(g._payload),
            w
          );
      }
      if (co(g) || qr(g)) return N !== null ? null : c(h, m, g, w, null);
      yi(h, g);
    }
    return null;
  }
  function p(h, m, g, w, N) {
    if (typeof w == "string" && w !== "" || typeof w == "number") return h = h.get(g) || null, l(m, h, "" + w, N);
    if (typeof w == "object" && w !== null) {
      switch (w.$$typeof) {
        case si:
          return h = h.get(w.key === null ? g : w.key) || null, a(m, h, w, N);
        case ur:
          return h = h.get(w.key === null ? g : w.key) || null, u(m, h, w, N);
        case en:
          var P = w._init;
          return p(h, m, g, P(w._payload), N);
      }
      if (co(w) || qr(w)) return h = h.get(g) || null, c(m, h, w, N, null);
      yi(m, w);
    }
    return null;
  }
  function x(h, m, g, w) {
    for (var N = null, P = null, T = m, M = m = 0, k = null; T !== null && M < g.length; M++) {
      T.index > M ? (k = T, T = null) : k = T.sibling;
      var A = d(h, T, g[M], w);
      if (A === null) {
        T === null && (T = k);
        break;
      }
      e && T && A.alternate === null && t(h, T), m = i(A, m, M), P === null ? N = A : P.sibling = A, P = A, T = k;
    }
    if (M === g.length) return n(h, T), ce && jn(h, M), N;
    if (T === null) {
      for (; M < g.length; M++) T = f(h, g[M], w), T !== null && (m = i(T, m, M), P === null ? N = T : P.sibling = T, P = T);
      return ce && jn(h, M), N;
    }
    for (T = r(h, T); M < g.length; M++) k = p(T, h, M, g[M], w), k !== null && (e && k.alternate !== null && T.delete(k.key === null ? M : k.key), m = i(k, m, M), P === null ? N = k : P.sibling = k, P = k);
    return e && T.forEach(function(F) {
      return t(h, F);
    }), ce && jn(h, M), N;
  }
  function y(h, m, g, w) {
    var N = qr(g);
    if (typeof N != "function") throw Error(V(150));
    if (g = N.call(g), g == null) throw Error(V(151));
    for (var P = N = null, T = m, M = m = 0, k = null, A = g.next(); T !== null && !A.done; M++, A = g.next()) {
      T.index > M ? (k = T, T = null) : k = T.sibling;
      var F = d(h, T, A.value, w);
      if (F === null) {
        T === null && (T = k);
        break;
      }
      e && T && F.alternate === null && t(h, T), m = i(F, m, M), P === null ? N = F : P.sibling = F, P = F, T = k;
    }
    if (A.done) return n(
      h,
      T
    ), ce && jn(h, M), N;
    if (T === null) {
      for (; !A.done; M++, A = g.next()) A = f(h, A.value, w), A !== null && (m = i(A, m, M), P === null ? N = A : P.sibling = A, P = A);
      return ce && jn(h, M), N;
    }
    for (T = r(h, T); !A.done; M++, A = g.next()) A = p(T, h, M, A.value, w), A !== null && (e && A.alternate !== null && T.delete(A.key === null ? M : A.key), m = i(A, m, M), P === null ? N = A : P.sibling = A, P = A);
    return e && T.forEach(function(O) {
      return t(h, O);
    }), ce && jn(h, M), N;
  }
  function E(h, m, g, w) {
    if (typeof g == "object" && g !== null && g.type === cr && g.key === null && (g = g.props.children), typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case si:
          e: {
            for (var N = g.key, P = m; P !== null; ) {
              if (P.key === N) {
                if (N = g.type, N === cr) {
                  if (P.tag === 7) {
                    n(h, P.sibling), m = o(P, g.props.children), m.return = h, h = m;
                    break e;
                  }
                } else if (P.elementType === N || typeof N == "object" && N !== null && N.$$typeof === en && Zc(N) === P.type) {
                  n(h, P.sibling), m = o(P, g.props), m.ref = to(h, P, g), m.return = h, h = m;
                  break e;
                }
                n(h, P);
                break;
              } else t(h, P);
              P = P.sibling;
            }
            g.type === cr ? (m = bn(g.props.children, h.mode, w, g.key), m.return = h, h = m) : (w = Vi(g.type, g.key, g.props, null, h.mode, w), w.ref = to(h, m, g), w.return = h, h = w);
          }
          return s(h);
        case ur:
          e: {
            for (P = g.key; m !== null; ) {
              if (m.key === P) if (m.tag === 4 && m.stateNode.containerInfo === g.containerInfo && m.stateNode.implementation === g.implementation) {
                n(h, m.sibling), m = o(m, g.children || []), m.return = h, h = m;
                break e;
              } else {
                n(h, m);
                break;
              }
              else t(h, m);
              m = m.sibling;
            }
            m = Cl(g, h.mode, w), m.return = h, h = m;
          }
          return s(h);
        case en:
          return P = g._init, E(h, m, P(g._payload), w);
      }
      if (co(g)) return x(h, m, g, w);
      if (qr(g)) return y(h, m, g, w);
      yi(h, g);
    }
    return typeof g == "string" && g !== "" || typeof g == "number" ? (g = "" + g, m !== null && m.tag === 6 ? (n(h, m.sibling), m = o(m, g), m.return = h, h = m) : (n(h, m), m = Nl(g, h.mode, w), m.return = h, h = m), s(h)) : n(h, m);
  }
  return E;
}
var $r = Ip(!0), Dp = Ip(!1), ss = kn(null), ls = null, vr = null, xu = null;
function _u() {
  xu = vr = ls = null;
}
function Su(e) {
  var t = ss.current;
  ue(ss), e._currentValue = t;
}
function ma(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Cr(e, t) {
  ls = e, xu = vr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (We = !0), e.firstContext = null);
}
function ft(e) {
  var t = e._currentValue;
  if (xu !== e) if (e = { context: e, memoizedValue: t, next: null }, vr === null) {
    if (ls === null) throw Error(V(308));
    vr = e, ls.dependencies = { lanes: 0, firstContext: e };
  } else vr = vr.next = e;
  return t;
}
var In = null;
function ku(e) {
  In === null ? In = [e] : In.push(e);
}
function Lp(e, t, n, r) {
  var o = t.interleaved;
  return o === null ? (n.next = n, ku(t)) : (n.next = o.next, o.next = n), t.interleaved = n, Yt(e, r);
}
function Yt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var tn = !1;
function Eu(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function Op(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function Vt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function mn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, ee & 2) {
    var o = r.pending;
    return o === null ? t.next = t : (t.next = o.next, o.next = t), r.pending = t, Yt(e, n);
  }
  return o = r.interleaved, o === null ? (t.next = t, ku(r)) : (t.next = o.next, o.next = t), r.interleaved = t, Yt(e, n);
}
function Di(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, uu(e, n);
  }
}
function Jc(e, t) {
  var n = e.updateQueue, r = e.alternate;
  if (r !== null && (r = r.updateQueue, n === r)) {
    var o = null, i = null;
    if (n = n.firstBaseUpdate, n !== null) {
      do {
        var s = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
        i === null ? o = i = s : i = i.next = s, n = n.next;
      } while (n !== null);
      i === null ? o = i = t : i = i.next = t;
    } else o = i = t;
    n = { baseState: r.baseState, firstBaseUpdate: o, lastBaseUpdate: i, shared: r.shared, effects: r.effects }, e.updateQueue = n;
    return;
  }
  e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
}
function as(e, t, n, r) {
  var o = e.updateQueue;
  tn = !1;
  var i = o.firstBaseUpdate, s = o.lastBaseUpdate, l = o.shared.pending;
  if (l !== null) {
    o.shared.pending = null;
    var a = l, u = a.next;
    a.next = null, s === null ? i = u : s.next = u, s = a;
    var c = e.alternate;
    c !== null && (c = c.updateQueue, l = c.lastBaseUpdate, l !== s && (l === null ? c.firstBaseUpdate = u : l.next = u, c.lastBaseUpdate = a));
  }
  if (i !== null) {
    var f = o.baseState;
    s = 0, c = u = a = null, l = i;
    do {
      var d = l.lane, p = l.eventTime;
      if ((r & d) === d) {
        c !== null && (c = c.next = {
          eventTime: p,
          lane: 0,
          tag: l.tag,
          payload: l.payload,
          callback: l.callback,
          next: null
        });
        e: {
          var x = e, y = l;
          switch (d = t, p = n, y.tag) {
            case 1:
              if (x = y.payload, typeof x == "function") {
                f = x.call(p, f, d);
                break e;
              }
              f = x;
              break e;
            case 3:
              x.flags = x.flags & -65537 | 128;
            case 0:
              if (x = y.payload, d = typeof x == "function" ? x.call(p, f, d) : x, d == null) break e;
              f = pe({}, f, d);
              break e;
            case 2:
              tn = !0;
          }
        }
        l.callback !== null && l.lane !== 0 && (e.flags |= 64, d = o.effects, d === null ? o.effects = [l] : d.push(l));
      } else p = { eventTime: p, lane: d, tag: l.tag, payload: l.payload, callback: l.callback, next: null }, c === null ? (u = c = p, a = f) : c = c.next = p, s |= d;
      if (l = l.next, l === null) {
        if (l = o.shared.pending, l === null) break;
        d = l, l = d.next, d.next = null, o.lastBaseUpdate = d, o.shared.pending = null;
      }
    } while (!0);
    if (c === null && (a = f), o.baseState = a, o.firstBaseUpdate = u, o.lastBaseUpdate = c, t = o.shared.interleaved, t !== null) {
      o = t;
      do
        s |= o.lane, o = o.next;
      while (o !== t);
    } else i === null && (o.shared.lanes = 0);
    Yn |= s, e.lanes = s, e.memoizedState = f;
  }
}
function ef(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], o = r.callback;
    if (o !== null) {
      if (r.callback = null, r = n, typeof o != "function") throw Error(V(191, o));
      o.call(r);
    }
  }
}
var ti = {}, Tt = kn(ti), Lo = kn(ti), Oo = kn(ti);
function Dn(e) {
  if (e === ti) throw Error(V(174));
  return e;
}
function Nu(e, t) {
  switch (se(Oo, t), se(Lo, e), se(Tt, ti), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Gl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Gl(t, e);
  }
  ue(Tt), se(Tt, t);
}
function Ir() {
  ue(Tt), ue(Lo), ue(Oo);
}
function Fp(e) {
  Dn(Oo.current);
  var t = Dn(Tt.current), n = Gl(t, e.type);
  t !== n && (se(Lo, e), se(Tt, n));
}
function Cu(e) {
  Lo.current === e && (ue(Tt), ue(Lo));
}
var fe = kn(0);
function us(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      t.child.return = t, t = t.child;
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    t.sibling.return = t.return, t = t.sibling;
  }
  return null;
}
var wl = [];
function zu() {
  for (var e = 0; e < wl.length; e++) wl[e]._workInProgressVersionPrimary = null;
  wl.length = 0;
}
var Li = qt.ReactCurrentDispatcher, xl = qt.ReactCurrentBatchConfig, Wn = 0, de = null, xe = null, Ee = null, cs = !1, So = !1, Fo = 0, By = 0;
function $e() {
  throw Error(V(321));
}
function Pu(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!kt(e[n], t[n])) return !1;
  return !0;
}
function Mu(e, t, n, r, o, i) {
  if (Wn = i, de = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Li.current = e === null || e.memoizedState === null ? Xy : Ky, e = n(r, o), So) {
    i = 0;
    do {
      if (So = !1, Fo = 0, 25 <= i) throw Error(V(301));
      i += 1, Ee = xe = null, t.updateQueue = null, Li.current = Gy, e = n(r, o);
    } while (So);
  }
  if (Li.current = fs, t = xe !== null && xe.next !== null, Wn = 0, Ee = xe = de = null, cs = !1, t) throw Error(V(300));
  return e;
}
function Tu() {
  var e = Fo !== 0;
  return Fo = 0, e;
}
function zt() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return Ee === null ? de.memoizedState = Ee = e : Ee = Ee.next = e, Ee;
}
function dt() {
  if (xe === null) {
    var e = de.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = xe.next;
  var t = Ee === null ? de.memoizedState : Ee.next;
  if (t !== null) Ee = t, xe = e;
  else {
    if (e === null) throw Error(V(310));
    xe = e, e = { memoizedState: xe.memoizedState, baseState: xe.baseState, baseQueue: xe.baseQueue, queue: xe.queue, next: null }, Ee === null ? de.memoizedState = Ee = e : Ee = Ee.next = e;
  }
  return Ee;
}
function bo(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function _l(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(V(311));
  n.lastRenderedReducer = e;
  var r = xe, o = r.baseQueue, i = n.pending;
  if (i !== null) {
    if (o !== null) {
      var s = o.next;
      o.next = i.next, i.next = s;
    }
    r.baseQueue = o = i, n.pending = null;
  }
  if (o !== null) {
    i = o.next, r = r.baseState;
    var l = s = null, a = null, u = i;
    do {
      var c = u.lane;
      if ((Wn & c) === c) a !== null && (a = a.next = { lane: 0, action: u.action, hasEagerState: u.hasEagerState, eagerState: u.eagerState, next: null }), r = u.hasEagerState ? u.eagerState : e(r, u.action);
      else {
        var f = {
          lane: c,
          action: u.action,
          hasEagerState: u.hasEagerState,
          eagerState: u.eagerState,
          next: null
        };
        a === null ? (l = a = f, s = r) : a = a.next = f, de.lanes |= c, Yn |= c;
      }
      u = u.next;
    } while (u !== null && u !== i);
    a === null ? s = r : a.next = l, kt(r, t.memoizedState) || (We = !0), t.memoizedState = r, t.baseState = s, t.baseQueue = a, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    o = e;
    do
      i = o.lane, de.lanes |= i, Yn |= i, o = o.next;
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Sl(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(V(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, o = n.pending, i = t.memoizedState;
  if (o !== null) {
    n.pending = null;
    var s = o = o.next;
    do
      i = e(i, s.action), s = s.next;
    while (s !== o);
    kt(i, t.memoizedState) || (We = !0), t.memoizedState = i, t.baseQueue === null && (t.baseState = i), n.lastRenderedState = i;
  }
  return [i, r];
}
function bp() {
}
function Hp(e, t) {
  var n = de, r = dt(), o = t(), i = !kt(r.memoizedState, o);
  if (i && (r.memoizedState = o, We = !0), r = r.queue, ju(Up.bind(null, n, r, e), [e]), r.getSnapshot !== t || i || Ee !== null && Ee.memoizedState.tag & 1) {
    if (n.flags |= 2048, Ho(9, Bp.bind(null, n, r, o, t), void 0, null), Ne === null) throw Error(V(349));
    Wn & 30 || Vp(n, t, o);
  }
  return o;
}
function Vp(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Bp(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Wp(t) && Yp(e);
}
function Up(e, t, n) {
  return n(function() {
    Wp(t) && Yp(e);
  });
}
function Wp(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !kt(e, n);
  } catch {
    return !0;
  }
}
function Yp(e) {
  var t = Yt(e, 1);
  t !== null && St(t, e, 1, -1);
}
function tf(e) {
  var t = zt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: bo, lastRenderedState: e }, t.queue = e, e = e.dispatch = Yy.bind(null, de, e), [t.memoizedState, e];
}
function Ho(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Xp() {
  return dt().memoizedState;
}
function Oi(e, t, n, r) {
  var o = zt();
  de.flags |= e, o.memoizedState = Ho(1 | t, n, void 0, r === void 0 ? null : r);
}
function $s(e, t, n, r) {
  var o = dt();
  r = r === void 0 ? null : r;
  var i = void 0;
  if (xe !== null) {
    var s = xe.memoizedState;
    if (i = s.destroy, r !== null && Pu(r, s.deps)) {
      o.memoizedState = Ho(t, n, i, r);
      return;
    }
  }
  de.flags |= e, o.memoizedState = Ho(1 | t, n, i, r);
}
function nf(e, t) {
  return Oi(8390656, 8, e, t);
}
function ju(e, t) {
  return $s(2048, 8, e, t);
}
function Kp(e, t) {
  return $s(4, 2, e, t);
}
function Gp(e, t) {
  return $s(4, 4, e, t);
}
function qp(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Qp(e, t, n) {
  return n = n != null ? n.concat([e]) : null, $s(4, 4, qp.bind(null, t, e), n);
}
function Au() {
}
function Zp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Pu(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Jp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Pu(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function eh(e, t, n) {
  return Wn & 21 ? (kt(n, t) || (n = ip(), de.lanes |= n, Yn |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, We = !0), e.memoizedState = n);
}
function Uy(e, t) {
  var n = oe;
  oe = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = xl.transition;
  xl.transition = {};
  try {
    e(!1), t();
  } finally {
    oe = n, xl.transition = r;
  }
}
function th() {
  return dt().memoizedState;
}
function Wy(e, t, n) {
  var r = yn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, nh(e)) rh(t, n);
  else if (n = Lp(e, t, n, r), n !== null) {
    var o = He();
    St(n, e, r, o), oh(n, t, r);
  }
}
function Yy(e, t, n) {
  var r = yn(e), o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (nh(e)) rh(t, o);
  else {
    var i = e.alternate;
    if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer, i !== null)) try {
      var s = t.lastRenderedState, l = i(s, n);
      if (o.hasEagerState = !0, o.eagerState = l, kt(l, s)) {
        var a = t.interleaved;
        a === null ? (o.next = o, ku(t)) : (o.next = a.next, a.next = o), t.interleaved = o;
        return;
      }
    } catch {
    } finally {
    }
    n = Lp(e, t, o, r), n !== null && (o = He(), St(n, e, r, o), oh(n, t, r));
  }
}
function nh(e) {
  var t = e.alternate;
  return e === de || t !== null && t === de;
}
function rh(e, t) {
  So = cs = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function oh(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, uu(e, n);
  }
}
var fs = { readContext: ft, useCallback: $e, useContext: $e, useEffect: $e, useImperativeHandle: $e, useInsertionEffect: $e, useLayoutEffect: $e, useMemo: $e, useReducer: $e, useRef: $e, useState: $e, useDebugValue: $e, useDeferredValue: $e, useTransition: $e, useMutableSource: $e, useSyncExternalStore: $e, useId: $e, unstable_isNewReconciler: !1 }, Xy = { readContext: ft, useCallback: function(e, t) {
  return zt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: ft, useEffect: nf, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Oi(
    4194308,
    4,
    qp.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return Oi(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return Oi(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = zt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = zt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = Wy.bind(null, de, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = zt();
  return e = { current: e }, t.memoizedState = e;
}, useState: tf, useDebugValue: Au, useDeferredValue: function(e) {
  return zt().memoizedState = e;
}, useTransition: function() {
  var e = tf(!1), t = e[0];
  return e = Uy.bind(null, e[1]), zt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = de, o = zt();
  if (ce) {
    if (n === void 0) throw Error(V(407));
    n = n();
  } else {
    if (n = t(), Ne === null) throw Error(V(349));
    Wn & 30 || Vp(r, t, n);
  }
  o.memoizedState = n;
  var i = { value: n, getSnapshot: t };
  return o.queue = i, nf(Up.bind(
    null,
    r,
    i,
    e
  ), [e]), r.flags |= 2048, Ho(9, Bp.bind(null, r, i, n, t), void 0, null), n;
}, useId: function() {
  var e = zt(), t = Ne.identifierPrefix;
  if (ce) {
    var n = bt, r = Ft;
    n = (r & ~(1 << 32 - _t(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Fo++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = By++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, Ky = {
  readContext: ft,
  useCallback: Zp,
  useContext: ft,
  useEffect: ju,
  useImperativeHandle: Qp,
  useInsertionEffect: Kp,
  useLayoutEffect: Gp,
  useMemo: Jp,
  useReducer: _l,
  useRef: Xp,
  useState: function() {
    return _l(bo);
  },
  useDebugValue: Au,
  useDeferredValue: function(e) {
    var t = dt();
    return eh(t, xe.memoizedState, e);
  },
  useTransition: function() {
    var e = _l(bo)[0], t = dt().memoizedState;
    return [e, t];
  },
  useMutableSource: bp,
  useSyncExternalStore: Hp,
  useId: th,
  unstable_isNewReconciler: !1
}, Gy = { readContext: ft, useCallback: Zp, useContext: ft, useEffect: ju, useImperativeHandle: Qp, useInsertionEffect: Kp, useLayoutEffect: Gp, useMemo: Jp, useReducer: Sl, useRef: Xp, useState: function() {
  return Sl(bo);
}, useDebugValue: Au, useDeferredValue: function(e) {
  var t = dt();
  return xe === null ? t.memoizedState = e : eh(t, xe.memoizedState, e);
}, useTransition: function() {
  var e = Sl(bo)[0], t = dt().memoizedState;
  return [e, t];
}, useMutableSource: bp, useSyncExternalStore: Hp, useId: th, unstable_isNewReconciler: !1 };
function gt(e, t) {
  if (e && e.defaultProps) {
    t = pe({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function ga(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : pe({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var Is = { isMounted: function(e) {
  return (e = e._reactInternals) ? Qn(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = He(), o = yn(e), i = Vt(r, o);
  i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (St(t, e, o, r), Di(t, e, o));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = He(), o = yn(e), i = Vt(r, o);
  i.tag = 1, i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (St(t, e, o, r), Di(t, e, o));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = He(), r = yn(e), o = Vt(n, r);
  o.tag = 2, t != null && (o.callback = t), t = mn(e, o, r), t !== null && (St(t, e, r, n), Di(t, e, r));
} };
function rf(e, t, n, r, o, i, s) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, s) : t.prototype && t.prototype.isPureReactComponent ? !Ro(n, r) || !Ro(o, i) : !0;
}
function ih(e, t, n) {
  var r = !1, o = _n, i = t.contextType;
  return typeof i == "object" && i !== null ? i = ft(i) : (o = Ke(t) ? Bn : Le.current, r = t.contextTypes, i = (r = r != null) ? Ar(e, o) : _n), t = new t(n, i), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = Is, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = o, e.__reactInternalMemoizedMaskedChildContext = i), t;
}
function of(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Is.enqueueReplaceState(t, t.state, null);
}
function ya(e, t, n, r) {
  var o = e.stateNode;
  o.props = n, o.state = e.memoizedState, o.refs = {}, Eu(e);
  var i = t.contextType;
  typeof i == "object" && i !== null ? o.context = ft(i) : (i = Ke(t) ? Bn : Le.current, o.context = Ar(e, i)), o.state = e.memoizedState, i = t.getDerivedStateFromProps, typeof i == "function" && (ga(e, t, i, n), o.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state, typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(), t !== o.state && Is.enqueueReplaceState(o, o.state, null), as(e, n, o, r), o.state = e.memoizedState), typeof o.componentDidMount == "function" && (e.flags |= 4194308);
}
function Dr(e, t) {
  try {
    var n = "", r = t;
    do
      n += k0(r), r = r.return;
    while (r);
    var o = n;
  } catch (i) {
    o = `
Error generating stack: ` + i.message + `
` + i.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function kl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function va(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var qy = typeof WeakMap == "function" ? WeakMap : Map;
function sh(e, t, n) {
  n = Vt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    ps || (ps = !0, Pa = r), va(e, t);
  }, n;
}
function lh(e, t, n) {
  n = Vt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    n.payload = function() {
      return r(o);
    }, n.callback = function() {
      va(e, t);
    };
  }
  var i = e.stateNode;
  return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function() {
    va(e, t), typeof r != "function" && (gn === null ? gn = /* @__PURE__ */ new Set([this]) : gn.add(this));
    var s = t.stack;
    this.componentDidCatch(t.value, { componentStack: s !== null ? s : "" });
  }), n;
}
function sf(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new qy();
    var o = /* @__PURE__ */ new Set();
    r.set(t, o);
  } else o = r.get(t), o === void 0 && (o = /* @__PURE__ */ new Set(), r.set(t, o));
  o.has(n) || (o.add(n), e = cv.bind(null, e, t, n), t.then(e, e));
}
function lf(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function af(e, t, n, r, o) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = o, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Vt(-1, 1), t.tag = 2, mn(n, t, 1))), n.lanes |= 1), e);
}
var Qy = qt.ReactCurrentOwner, We = !1;
function be(e, t, n, r) {
  t.child = e === null ? Dp(t, null, n, r) : $r(t, e.child, n, r);
}
function uf(e, t, n, r, o) {
  n = n.render;
  var i = t.ref;
  return Cr(t, o), r = Mu(e, t, n, r, i, o), n = Tu(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && n && yu(t), t.flags |= 1, be(e, t, r, o), t.child);
}
function cf(e, t, n, r, o) {
  if (e === null) {
    var i = n.type;
    return typeof i == "function" && !bu(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = i, ah(e, t, i, r, o)) : (e = Vi(n.type, null, r, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (i = e.child, !(e.lanes & o)) {
    var s = i.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Ro, n(s, r) && e.ref === t.ref) return Xt(e, t, o);
  }
  return t.flags |= 1, e = vn(i, r), e.ref = t.ref, e.return = t, t.child = e;
}
function ah(e, t, n, r, o) {
  if (e !== null) {
    var i = e.memoizedProps;
    if (Ro(i, r) && e.ref === t.ref) if (We = !1, t.pendingProps = r = i, (e.lanes & o) !== 0) e.flags & 131072 && (We = !0);
    else return t.lanes = e.lanes, Xt(e, t, o);
  }
  return wa(e, t, n, r, o);
}
function uh(e, t, n) {
  var r = t.pendingProps, o = r.children, i = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, se(xr, Qe), Qe |= n;
  else {
    if (!(n & 1073741824)) return e = i !== null ? i.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, se(xr, Qe), Qe |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = i !== null ? i.baseLanes : n, se(xr, Qe), Qe |= r;
  }
  else i !== null ? (r = i.baseLanes | n, t.memoizedState = null) : r = n, se(xr, Qe), Qe |= r;
  return be(e, t, o, n), t.child;
}
function ch(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function wa(e, t, n, r, o) {
  var i = Ke(n) ? Bn : Le.current;
  return i = Ar(t, i), Cr(t, o), n = Mu(e, t, n, r, i, o), r = Tu(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && r && yu(t), t.flags |= 1, be(e, t, n, o), t.child);
}
function ff(e, t, n, r, o) {
  if (Ke(n)) {
    var i = !0;
    rs(t);
  } else i = !1;
  if (Cr(t, o), t.stateNode === null) Fi(e, t), ih(t, n, r), ya(t, n, r, o), r = !0;
  else if (e === null) {
    var s = t.stateNode, l = t.memoizedProps;
    s.props = l;
    var a = s.context, u = n.contextType;
    typeof u == "object" && u !== null ? u = ft(u) : (u = Ke(n) ? Bn : Le.current, u = Ar(t, u));
    var c = n.getDerivedStateFromProps, f = typeof c == "function" || typeof s.getSnapshotBeforeUpdate == "function";
    f || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== r || a !== u) && of(t, s, r, u), tn = !1;
    var d = t.memoizedState;
    s.state = d, as(t, r, s, o), a = t.memoizedState, l !== r || d !== a || Xe.current || tn ? (typeof c == "function" && (ga(t, n, c, r), a = t.memoizedState), (l = tn || rf(t, n, l, r, d, a, u)) ? (f || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount()), typeof s.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = a), s.props = r, s.state = a, s.context = u, r = l) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    s = t.stateNode, Op(e, t), l = t.memoizedProps, u = t.type === t.elementType ? l : gt(t.type, l), s.props = u, f = t.pendingProps, d = s.context, a = n.contextType, typeof a == "object" && a !== null ? a = ft(a) : (a = Ke(n) ? Bn : Le.current, a = Ar(t, a));
    var p = n.getDerivedStateFromProps;
    (c = typeof p == "function" || typeof s.getSnapshotBeforeUpdate == "function") || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== f || d !== a) && of(t, s, r, a), tn = !1, d = t.memoizedState, s.state = d, as(t, r, s, o);
    var x = t.memoizedState;
    l !== f || d !== x || Xe.current || tn ? (typeof p == "function" && (ga(t, n, p, r), x = t.memoizedState), (u = tn || rf(t, n, u, r, d, x, a) || !1) ? (c || typeof s.UNSAFE_componentWillUpdate != "function" && typeof s.componentWillUpdate != "function" || (typeof s.componentWillUpdate == "function" && s.componentWillUpdate(r, x, a), typeof s.UNSAFE_componentWillUpdate == "function" && s.UNSAFE_componentWillUpdate(r, x, a)), typeof s.componentDidUpdate == "function" && (t.flags |= 4), typeof s.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = x), s.props = r, s.state = x, s.context = a, r = u) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return xa(e, t, n, r, i, o);
}
function xa(e, t, n, r, o, i) {
  ch(e, t);
  var s = (t.flags & 128) !== 0;
  if (!r && !s) return o && Gc(t, n, !1), Xt(e, t, i);
  r = t.stateNode, Qy.current = t;
  var l = s && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && s ? (t.child = $r(t, e.child, null, i), t.child = $r(t, null, l, i)) : be(e, t, l, i), t.memoizedState = r.state, o && Gc(t, n, !0), t.child;
}
function fh(e) {
  var t = e.stateNode;
  t.pendingContext ? Kc(e, t.pendingContext, t.pendingContext !== t.context) : t.context && Kc(e, t.context, !1), Nu(e, t.containerInfo);
}
function df(e, t, n, r, o) {
  return Rr(), wu(o), t.flags |= 256, be(e, t, n, r), t.child;
}
var _a = { dehydrated: null, treeContext: null, retryLane: 0 };
function Sa(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function dh(e, t, n) {
  var r = t.pendingProps, o = fe.current, i = !1, s = (t.flags & 128) !== 0, l;
  if ((l = s) || (l = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0), l ? (i = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1), se(fe, o & 1), e === null)
    return ha(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (s = r.children, e = r.fallback, i ? (r = t.mode, i = t.child, s = { mode: "hidden", children: s }, !(r & 1) && i !== null ? (i.childLanes = 0, i.pendingProps = s) : i = Os(s, r, 0, null), e = bn(e, r, n, null), i.return = t, e.return = t, i.sibling = e, t.child = i, t.child.memoizedState = Sa(n), t.memoizedState = _a, e) : Ru(t, s));
  if (o = e.memoizedState, o !== null && (l = o.dehydrated, l !== null)) return Zy(e, t, s, r, l, o, n);
  if (i) {
    i = r.fallback, s = t.mode, o = e.child, l = o.sibling;
    var a = { mode: "hidden", children: r.children };
    return !(s & 1) && t.child !== o ? (r = t.child, r.childLanes = 0, r.pendingProps = a, t.deletions = null) : (r = vn(o, a), r.subtreeFlags = o.subtreeFlags & 14680064), l !== null ? i = vn(l, i) : (i = bn(i, s, n, null), i.flags |= 2), i.return = t, r.return = t, r.sibling = i, t.child = r, r = i, i = t.child, s = e.child.memoizedState, s = s === null ? Sa(n) : { baseLanes: s.baseLanes | n, cachePool: null, transitions: s.transitions }, i.memoizedState = s, i.childLanes = e.childLanes & ~n, t.memoizedState = _a, r;
  }
  return i = e.child, e = i.sibling, r = vn(i, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Ru(e, t) {
  return t = Os({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function vi(e, t, n, r) {
  return r !== null && wu(r), $r(t, e.child, null, n), e = Ru(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function Zy(e, t, n, r, o, i, s) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = kl(Error(V(422))), vi(e, t, s, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (i = r.fallback, o = t.mode, r = Os({ mode: "visible", children: r.children }, o, 0, null), i = bn(i, o, s, null), i.flags |= 2, r.return = t, i.return = t, r.sibling = i, t.child = r, t.mode & 1 && $r(t, e.child, null, s), t.child.memoizedState = Sa(s), t.memoizedState = _a, i);
  if (!(t.mode & 1)) return vi(e, t, s, null);
  if (o.data === "$!") {
    if (r = o.nextSibling && o.nextSibling.dataset, r) var l = r.dgst;
    return r = l, i = Error(V(419)), r = kl(i, r, void 0), vi(e, t, s, r);
  }
  if (l = (s & e.childLanes) !== 0, We || l) {
    if (r = Ne, r !== null) {
      switch (s & -s) {
        case 4:
          o = 2;
          break;
        case 16:
          o = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          o = 32;
          break;
        case 536870912:
          o = 268435456;
          break;
        default:
          o = 0;
      }
      o = o & (r.suspendedLanes | s) ? 0 : o, o !== 0 && o !== i.retryLane && (i.retryLane = o, Yt(e, o), St(r, e, o, -1));
    }
    return Fu(), r = kl(Error(V(421))), vi(e, t, s, r);
  }
  return o.data === "$?" ? (t.flags |= 128, t.child = e.child, t = fv.bind(null, e), o._reactRetry = t, null) : (e = i.treeContext, Ze = hn(o.nextSibling), Je = t, ce = !0, wt = null, e !== null && (ot[it++] = Ft, ot[it++] = bt, ot[it++] = Un, Ft = e.id, bt = e.overflow, Un = t), t = Ru(t, r.children), t.flags |= 4096, t);
}
function pf(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), ma(e.return, t, n);
}
function El(e, t, n, r, o) {
  var i = e.memoizedState;
  i === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: o } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = r, i.tail = n, i.tailMode = o);
}
function ph(e, t, n) {
  var r = t.pendingProps, o = r.revealOrder, i = r.tail;
  if (be(e, t, r.children, n), r = fe.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && pf(e, n, t);
      else if (e.tag === 19) pf(e, n, t);
      else if (e.child !== null) {
        e.child.return = e, e = e.child;
        continue;
      }
      if (e === t) break e;
      for (; e.sibling === null; ) {
        if (e.return === null || e.return === t) break e;
        e = e.return;
      }
      e.sibling.return = e.return, e = e.sibling;
    }
    r &= 1;
  }
  if (se(fe, r), !(t.mode & 1)) t.memoizedState = null;
  else switch (o) {
    case "forwards":
      for (n = t.child, o = null; n !== null; ) e = n.alternate, e !== null && us(e) === null && (o = n), n = n.sibling;
      n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), El(t, !1, o, n, i);
      break;
    case "backwards":
      for (n = null, o = t.child, t.child = null; o !== null; ) {
        if (e = o.alternate, e !== null && us(e) === null) {
          t.child = o;
          break;
        }
        e = o.sibling, o.sibling = n, n = o, o = e;
      }
      El(t, !0, n, null, i);
      break;
    case "together":
      El(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function Fi(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function Xt(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), Yn |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(V(153));
  if (t.child !== null) {
    for (e = t.child, n = vn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = vn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function Jy(e, t, n) {
  switch (t.tag) {
    case 3:
      fh(t), Rr();
      break;
    case 5:
      Fp(t);
      break;
    case 1:
      Ke(t.type) && rs(t);
      break;
    case 4:
      Nu(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, o = t.memoizedProps.value;
      se(ss, r._currentValue), r._currentValue = o;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (se(fe, fe.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? dh(e, t, n) : (se(fe, fe.current & 1), e = Xt(e, t, n), e !== null ? e.sibling : null);
      se(fe, fe.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return ph(e, t, n);
        t.flags |= 128;
      }
      if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), se(fe, fe.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, uh(e, t, n);
  }
  return Xt(e, t, n);
}
var hh, ka, mh, gh;
hh = function(e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      n.child.return = n, n = n.child;
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    n.sibling.return = n.return, n = n.sibling;
  }
};
ka = function() {
};
mh = function(e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    e = t.stateNode, Dn(Tt.current);
    var i = null;
    switch (n) {
      case "input":
        o = Wl(e, o), r = Wl(e, r), i = [];
        break;
      case "select":
        o = pe({}, o, { value: void 0 }), r = pe({}, r, { value: void 0 }), i = [];
        break;
      case "textarea":
        o = Kl(e, o), r = Kl(e, r), i = [];
        break;
      default:
        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = ts);
    }
    ql(n, r);
    var s;
    n = null;
    for (u in o) if (!r.hasOwnProperty(u) && o.hasOwnProperty(u) && o[u] != null) if (u === "style") {
      var l = o[u];
      for (s in l) l.hasOwnProperty(s) && (n || (n = {}), n[s] = "");
    } else u !== "dangerouslySetInnerHTML" && u !== "children" && u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (Co.hasOwnProperty(u) ? i || (i = []) : (i = i || []).push(u, null));
    for (u in r) {
      var a = r[u];
      if (l = o != null ? o[u] : void 0, r.hasOwnProperty(u) && a !== l && (a != null || l != null)) if (u === "style") if (l) {
        for (s in l) !l.hasOwnProperty(s) || a && a.hasOwnProperty(s) || (n || (n = {}), n[s] = "");
        for (s in a) a.hasOwnProperty(s) && l[s] !== a[s] && (n || (n = {}), n[s] = a[s]);
      } else n || (i || (i = []), i.push(
        u,
        n
      )), n = a;
      else u === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, l = l ? l.__html : void 0, a != null && l !== a && (i = i || []).push(u, a)) : u === "children" ? typeof a != "string" && typeof a != "number" || (i = i || []).push(u, "" + a) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (Co.hasOwnProperty(u) ? (a != null && u === "onScroll" && ae("scroll", e), i || l === a || (i = [])) : (i = i || []).push(u, a));
    }
    n && (i = i || []).push("style", n);
    var u = i;
    (t.updateQueue = u) && (t.flags |= 4);
  }
};
gh = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function no(e, t) {
  if (!ce) switch (e.tailMode) {
    case "hidden":
      t = e.tail;
      for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
      n === null ? e.tail = null : n.sibling = null;
      break;
    case "collapsed":
      n = e.tail;
      for (var r = null; n !== null; ) n.alternate !== null && (r = n), n = n.sibling;
      r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
  }
}
function Ie(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t) for (var o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags & 14680064, r |= o.flags & 14680064, o.return = e, o = o.sibling;
  else for (o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags, r |= o.flags, o.return = e, o = o.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function ev(e, t, n) {
  var r = t.pendingProps;
  switch (vu(t), t.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return Ie(t), null;
    case 1:
      return Ke(t.type) && ns(), Ie(t), null;
    case 3:
      return r = t.stateNode, Ir(), ue(Xe), ue(Le), zu(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (gi(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, wt !== null && (ja(wt), wt = null))), ka(e, t), Ie(t), null;
    case 5:
      Cu(t);
      var o = Dn(Oo.current);
      if (n = t.type, e !== null && t.stateNode != null) mh(e, t, n, r, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(V(166));
          return Ie(t), null;
        }
        if (e = Dn(Tt.current), gi(t)) {
          r = t.stateNode, n = t.type;
          var i = t.memoizedProps;
          switch (r[Pt] = t, r[Do] = i, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              ae("cancel", r), ae("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              ae("load", r);
              break;
            case "video":
            case "audio":
              for (o = 0; o < po.length; o++) ae(po[o], r);
              break;
            case "source":
              ae("error", r);
              break;
            case "img":
            case "image":
            case "link":
              ae(
                "error",
                r
              ), ae("load", r);
              break;
            case "details":
              ae("toggle", r);
              break;
            case "input":
              _c(r, i), ae("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!i.multiple }, ae("invalid", r);
              break;
            case "textarea":
              kc(r, i), ae("invalid", r);
          }
          ql(n, i), o = null;
          for (var s in i) if (i.hasOwnProperty(s)) {
            var l = i[s];
            s === "children" ? typeof l == "string" ? r.textContent !== l && (i.suppressHydrationWarning !== !0 && mi(r.textContent, l, e), o = ["children", l]) : typeof l == "number" && r.textContent !== "" + l && (i.suppressHydrationWarning !== !0 && mi(
              r.textContent,
              l,
              e
            ), o = ["children", "" + l]) : Co.hasOwnProperty(s) && l != null && s === "onScroll" && ae("scroll", r);
          }
          switch (n) {
            case "input":
              li(r), Sc(r, i, !0);
              break;
            case "textarea":
              li(r), Ec(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof i.onClick == "function" && (r.onclick = ts);
          }
          r = o, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          s = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Ud(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = s.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = s.createElement(n, { is: r.is }) : (e = s.createElement(n), n === "select" && (s = e, r.multiple ? s.multiple = !0 : r.size && (s.size = r.size))) : e = s.createElementNS(e, n), e[Pt] = t, e[Do] = r, hh(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (s = Ql(n, r), n) {
              case "dialog":
                ae("cancel", e), ae("close", e), o = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                ae("load", e), o = r;
                break;
              case "video":
              case "audio":
                for (o = 0; o < po.length; o++) ae(po[o], e);
                o = r;
                break;
              case "source":
                ae("error", e), o = r;
                break;
              case "img":
              case "image":
              case "link":
                ae(
                  "error",
                  e
                ), ae("load", e), o = r;
                break;
              case "details":
                ae("toggle", e), o = r;
                break;
              case "input":
                _c(e, r), o = Wl(e, r), ae("invalid", e);
                break;
              case "option":
                o = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, o = pe({}, r, { value: void 0 }), ae("invalid", e);
                break;
              case "textarea":
                kc(e, r), o = Kl(e, r), ae("invalid", e);
                break;
              default:
                o = r;
            }
            ql(n, o), l = o;
            for (i in l) if (l.hasOwnProperty(i)) {
              var a = l[i];
              i === "style" ? Xd(e, a) : i === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, a != null && Wd(e, a)) : i === "children" ? typeof a == "string" ? (n !== "textarea" || a !== "") && zo(e, a) : typeof a == "number" && zo(e, "" + a) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (Co.hasOwnProperty(i) ? a != null && i === "onScroll" && ae("scroll", e) : a != null && ru(e, i, a, s));
            }
            switch (n) {
              case "input":
                li(e), Sc(e, r, !1);
                break;
              case "textarea":
                li(e), Ec(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + xn(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, i = r.value, i != null ? Sr(e, !!r.multiple, i, !1) : r.defaultValue != null && Sr(
                  e,
                  !!r.multiple,
                  r.defaultValue,
                  !0
                );
                break;
              default:
                typeof o.onClick == "function" && (e.onclick = ts);
            }
            switch (n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                r = !!r.autoFocus;
                break e;
              case "img":
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
      }
      return Ie(t), null;
    case 6:
      if (e && t.stateNode != null) gh(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(V(166));
        if (n = Dn(Oo.current), Dn(Tt.current), gi(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[Pt] = t, (i = r.nodeValue !== n) && (e = Je, e !== null)) switch (e.tag) {
            case 3:
              mi(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && mi(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          i && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[Pt] = t, t.stateNode = r;
      }
      return Ie(t), null;
    case 13:
      if (ue(fe), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (ce && Ze !== null && t.mode & 1 && !(t.flags & 128)) $p(), Rr(), t.flags |= 98560, i = !1;
        else if (i = gi(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!i) throw Error(V(318));
            if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(V(317));
            i[Pt] = t;
          } else Rr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Ie(t), i = !1;
        } else wt !== null && (ja(wt), wt = null), i = !0;
        if (!i) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || fe.current & 1 ? Se === 0 && (Se = 3) : Fu())), t.updateQueue !== null && (t.flags |= 4), Ie(t), null);
    case 4:
      return Ir(), ka(e, t), e === null && $o(t.stateNode.containerInfo), Ie(t), null;
    case 10:
      return Su(t.type._context), Ie(t), null;
    case 17:
      return Ke(t.type) && ns(), Ie(t), null;
    case 19:
      if (ue(fe), i = t.memoizedState, i === null) return Ie(t), null;
      if (r = (t.flags & 128) !== 0, s = i.rendering, s === null) if (r) no(i, !1);
      else {
        if (Se !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (s = us(e), s !== null) {
            for (t.flags |= 128, no(i, !1), r = s.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) i = n, e = r, i.flags &= 14680066, s = i.alternate, s === null ? (i.childLanes = 0, i.lanes = e, i.child = null, i.subtreeFlags = 0, i.memoizedProps = null, i.memoizedState = null, i.updateQueue = null, i.dependencies = null, i.stateNode = null) : (i.childLanes = s.childLanes, i.lanes = s.lanes, i.child = s.child, i.subtreeFlags = 0, i.deletions = null, i.memoizedProps = s.memoizedProps, i.memoizedState = s.memoizedState, i.updateQueue = s.updateQueue, i.type = s.type, e = s.dependencies, i.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return se(fe, fe.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        i.tail !== null && ye() > Lr && (t.flags |= 128, r = !0, no(i, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = us(s), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), no(i, !0), i.tail === null && i.tailMode === "hidden" && !s.alternate && !ce) return Ie(t), null;
        } else 2 * ye() - i.renderingStartTime > Lr && n !== 1073741824 && (t.flags |= 128, r = !0, no(i, !1), t.lanes = 4194304);
        i.isBackwards ? (s.sibling = t.child, t.child = s) : (n = i.last, n !== null ? n.sibling = s : t.child = s, i.last = s);
      }
      return i.tail !== null ? (t = i.tail, i.rendering = t, i.tail = t.sibling, i.renderingStartTime = ye(), t.sibling = null, n = fe.current, se(fe, r ? n & 1 | 2 : n & 1), t) : (Ie(t), null);
    case 22:
    case 23:
      return Ou(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? Qe & 1073741824 && (Ie(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ie(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(V(156, t.tag));
}
function tv(e, t) {
  switch (vu(t), t.tag) {
    case 1:
      return Ke(t.type) && ns(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Ir(), ue(Xe), ue(Le), zu(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Cu(t), null;
    case 13:
      if (ue(fe), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(V(340));
        Rr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return ue(fe), null;
    case 4:
      return Ir(), null;
    case 10:
      return Su(t.type._context), null;
    case 22:
    case 23:
      return Ou(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var wi = !1, De = !1, nv = typeof WeakSet == "function" ? WeakSet : Set, W = null;
function wr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    he(e, t, r);
  }
  else n.current = null;
}
function Ea(e, t, n) {
  try {
    n();
  } catch (r) {
    he(e, t, r);
  }
}
var hf = !1;
function rv(e, t) {
  if (la = Zi, e = _p(), gu(e)) {
    if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else e: {
      n = (n = e.ownerDocument) && n.defaultView || window;
      var r = n.getSelection && n.getSelection();
      if (r && r.rangeCount !== 0) {
        n = r.anchorNode;
        var o = r.anchorOffset, i = r.focusNode;
        r = r.focusOffset;
        try {
          n.nodeType, i.nodeType;
        } catch {
          n = null;
          break e;
        }
        var s = 0, l = -1, a = -1, u = 0, c = 0, f = e, d = null;
        t: for (; ; ) {
          for (var p; f !== n || o !== 0 && f.nodeType !== 3 || (l = s + o), f !== i || r !== 0 && f.nodeType !== 3 || (a = s + r), f.nodeType === 3 && (s += f.nodeValue.length), (p = f.firstChild) !== null; )
            d = f, f = p;
          for (; ; ) {
            if (f === e) break t;
            if (d === n && ++u === o && (l = s), d === i && ++c === r && (a = s), (p = f.nextSibling) !== null) break;
            f = d, d = f.parentNode;
          }
          f = p;
        }
        n = l === -1 || a === -1 ? null : { start: l, end: a };
      } else n = null;
    }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (aa = { focusedElem: e, selectionRange: n }, Zi = !1, W = t; W !== null; ) if (t = W, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, W = e;
  else for (; W !== null; ) {
    t = W;
    try {
      var x = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (x !== null) {
            var y = x.memoizedProps, E = x.memoizedState, h = t.stateNode, m = h.getSnapshotBeforeUpdate(t.elementType === t.type ? y : gt(t.type, y), E);
            h.__reactInternalSnapshotBeforeUpdate = m;
          }
          break;
        case 3:
          var g = t.stateNode.containerInfo;
          g.nodeType === 1 ? g.textContent = "" : g.nodeType === 9 && g.documentElement && g.removeChild(g.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(V(163));
      }
    } catch (w) {
      he(t, t.return, w);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, W = e;
      break;
    }
    W = t.return;
  }
  return x = hf, hf = !1, x;
}
function ko(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var o = r = r.next;
    do {
      if ((o.tag & e) === e) {
        var i = o.destroy;
        o.destroy = void 0, i !== void 0 && Ea(t, n, i);
      }
      o = o.next;
    } while (o !== r);
  }
}
function Ds(e, t) {
  if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
    var n = t = t.next;
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function Na(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == "function" ? t(e) : t.current = e;
  }
}
function yh(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, yh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Pt], delete t[Do], delete t[fa], delete t[Fy], delete t[by])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function vh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function mf(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || vh(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Ca(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = ts));
  else if (r !== 4 && (e = e.child, e !== null)) for (Ca(e, t, n), e = e.sibling; e !== null; ) Ca(e, t, n), e = e.sibling;
}
function za(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (za(e, t, n), e = e.sibling; e !== null; ) za(e, t, n), e = e.sibling;
}
var Pe = null, yt = !1;
function Qt(e, t, n) {
  for (n = n.child; n !== null; ) wh(e, t, n), n = n.sibling;
}
function wh(e, t, n) {
  if (Mt && typeof Mt.onCommitFiberUnmount == "function") try {
    Mt.onCommitFiberUnmount(Ps, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      De || wr(n, t);
    case 6:
      var r = Pe, o = yt;
      Pe = null, Qt(e, t, n), Pe = r, yt = o, Pe !== null && (yt ? (e = Pe, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Pe.removeChild(n.stateNode));
      break;
    case 18:
      Pe !== null && (yt ? (e = Pe, n = n.stateNode, e.nodeType === 8 ? yl(e.parentNode, n) : e.nodeType === 1 && yl(e, n), jo(e)) : yl(Pe, n.stateNode));
      break;
    case 4:
      r = Pe, o = yt, Pe = n.stateNode.containerInfo, yt = !0, Qt(e, t, n), Pe = r, yt = o;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!De && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        o = r = r.next;
        do {
          var i = o, s = i.destroy;
          i = i.tag, s !== void 0 && (i & 2 || i & 4) && Ea(n, t, s), o = o.next;
        } while (o !== r);
      }
      Qt(e, t, n);
      break;
    case 1:
      if (!De && (wr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (l) {
        he(n, t, l);
      }
      Qt(e, t, n);
      break;
    case 21:
      Qt(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (De = (r = De) || n.memoizedState !== null, Qt(e, t, n), De = r) : Qt(e, t, n);
      break;
    default:
      Qt(e, t, n);
  }
}
function gf(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new nv()), t.forEach(function(r) {
      var o = dv.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(o, o));
    });
  }
}
function mt(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var o = n[r];
    try {
      var i = e, s = t, l = s;
      e: for (; l !== null; ) {
        switch (l.tag) {
          case 5:
            Pe = l.stateNode, yt = !1;
            break e;
          case 3:
            Pe = l.stateNode.containerInfo, yt = !0;
            break e;
          case 4:
            Pe = l.stateNode.containerInfo, yt = !0;
            break e;
        }
        l = l.return;
      }
      if (Pe === null) throw Error(V(160));
      wh(i, s, o), Pe = null, yt = !1;
      var a = o.alternate;
      a !== null && (a.return = null), o.return = null;
    } catch (u) {
      he(o, t, u);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) xh(t, e), t = t.sibling;
}
function xh(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (mt(t, e), Ct(e), r & 4) {
        try {
          ko(3, e, e.return), Ds(3, e);
        } catch (y) {
          he(e, e.return, y);
        }
        try {
          ko(5, e, e.return);
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 1:
      mt(t, e), Ct(e), r & 512 && n !== null && wr(n, n.return);
      break;
    case 5:
      if (mt(t, e), Ct(e), r & 512 && n !== null && wr(n, n.return), e.flags & 32) {
        var o = e.stateNode;
        try {
          zo(o, "");
        } catch (y) {
          he(e, e.return, y);
        }
      }
      if (r & 4 && (o = e.stateNode, o != null)) {
        var i = e.memoizedProps, s = n !== null ? n.memoizedProps : i, l = e.type, a = e.updateQueue;
        if (e.updateQueue = null, a !== null) try {
          l === "input" && i.type === "radio" && i.name != null && Vd(o, i), Ql(l, s);
          var u = Ql(l, i);
          for (s = 0; s < a.length; s += 2) {
            var c = a[s], f = a[s + 1];
            c === "style" ? Xd(o, f) : c === "dangerouslySetInnerHTML" ? Wd(o, f) : c === "children" ? zo(o, f) : ru(o, c, f, u);
          }
          switch (l) {
            case "input":
              Yl(o, i);
              break;
            case "textarea":
              Bd(o, i);
              break;
            case "select":
              var d = o._wrapperState.wasMultiple;
              o._wrapperState.wasMultiple = !!i.multiple;
              var p = i.value;
              p != null ? Sr(o, !!i.multiple, p, !1) : d !== !!i.multiple && (i.defaultValue != null ? Sr(
                o,
                !!i.multiple,
                i.defaultValue,
                !0
              ) : Sr(o, !!i.multiple, i.multiple ? [] : "", !1));
          }
          o[Do] = i;
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 6:
      if (mt(t, e), Ct(e), r & 4) {
        if (e.stateNode === null) throw Error(V(162));
        o = e.stateNode, i = e.memoizedProps;
        try {
          o.nodeValue = i;
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 3:
      if (mt(t, e), Ct(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        jo(t.containerInfo);
      } catch (y) {
        he(e, e.return, y);
      }
      break;
    case 4:
      mt(t, e), Ct(e);
      break;
    case 13:
      mt(t, e), Ct(e), o = e.child, o.flags & 8192 && (i = o.memoizedState !== null, o.stateNode.isHidden = i, !i || o.alternate !== null && o.alternate.memoizedState !== null || (Du = ye())), r & 4 && gf(e);
      break;
    case 22:
      if (c = n !== null && n.memoizedState !== null, e.mode & 1 ? (De = (u = De) || c, mt(t, e), De = u) : mt(t, e), Ct(e), r & 8192) {
        if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !c && e.mode & 1) for (W = e, c = e.child; c !== null; ) {
          for (f = W = c; W !== null; ) {
            switch (d = W, p = d.child, d.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                ko(4, d, d.return);
                break;
              case 1:
                wr(d, d.return);
                var x = d.stateNode;
                if (typeof x.componentWillUnmount == "function") {
                  r = d, n = d.return;
                  try {
                    t = r, x.props = t.memoizedProps, x.state = t.memoizedState, x.componentWillUnmount();
                  } catch (y) {
                    he(r, n, y);
                  }
                }
                break;
              case 5:
                wr(d, d.return);
                break;
              case 22:
                if (d.memoizedState !== null) {
                  vf(f);
                  continue;
                }
            }
            p !== null ? (p.return = d, W = p) : vf(f);
          }
          c = c.sibling;
        }
        e: for (c = null, f = e; ; ) {
          if (f.tag === 5) {
            if (c === null) {
              c = f;
              try {
                o = f.stateNode, u ? (i = o.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (l = f.stateNode, a = f.memoizedProps.style, s = a != null && a.hasOwnProperty("display") ? a.display : null, l.style.display = Yd("display", s));
              } catch (y) {
                he(e, e.return, y);
              }
            }
          } else if (f.tag === 6) {
            if (c === null) try {
              f.stateNode.nodeValue = u ? "" : f.memoizedProps;
            } catch (y) {
              he(e, e.return, y);
            }
          } else if ((f.tag !== 22 && f.tag !== 23 || f.memoizedState === null || f === e) && f.child !== null) {
            f.child.return = f, f = f.child;
            continue;
          }
          if (f === e) break e;
          for (; f.sibling === null; ) {
            if (f.return === null || f.return === e) break e;
            c === f && (c = null), f = f.return;
          }
          c === f && (c = null), f.sibling.return = f.return, f = f.sibling;
        }
      }
      break;
    case 19:
      mt(t, e), Ct(e), r & 4 && gf(e);
      break;
    case 21:
      break;
    default:
      mt(
        t,
        e
      ), Ct(e);
  }
}
function Ct(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (vh(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(V(160));
      }
      switch (r.tag) {
        case 5:
          var o = r.stateNode;
          r.flags & 32 && (zo(o, ""), r.flags &= -33);
          var i = mf(e);
          za(e, i, o);
          break;
        case 3:
        case 4:
          var s = r.stateNode.containerInfo, l = mf(e);
          Ca(e, l, s);
          break;
        default:
          throw Error(V(161));
      }
    } catch (a) {
      he(e, e.return, a);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function ov(e, t, n) {
  W = e, _h(e);
}
function _h(e, t, n) {
  for (var r = (e.mode & 1) !== 0; W !== null; ) {
    var o = W, i = o.child;
    if (o.tag === 22 && r) {
      var s = o.memoizedState !== null || wi;
      if (!s) {
        var l = o.alternate, a = l !== null && l.memoizedState !== null || De;
        l = wi;
        var u = De;
        if (wi = s, (De = a) && !u) for (W = o; W !== null; ) s = W, a = s.child, s.tag === 22 && s.memoizedState !== null ? wf(o) : a !== null ? (a.return = s, W = a) : wf(o);
        for (; i !== null; ) W = i, _h(i), i = i.sibling;
        W = o, wi = l, De = u;
      }
      yf(e);
    } else o.subtreeFlags & 8772 && i !== null ? (i.return = o, W = i) : yf(e);
  }
}
function yf(e) {
  for (; W !== null; ) {
    var t = W;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            De || Ds(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !De) if (n === null) r.componentDidMount();
            else {
              var o = t.elementType === t.type ? n.memoizedProps : gt(t.type, n.memoizedProps);
              r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var i = t.updateQueue;
            i !== null && ef(t, i, r);
            break;
          case 3:
            var s = t.updateQueue;
            if (s !== null) {
              if (n = null, t.child !== null) switch (t.child.tag) {
                case 5:
                  n = t.child.stateNode;
                  break;
                case 1:
                  n = t.child.stateNode;
              }
              ef(t, s, n);
            }
            break;
          case 5:
            var l = t.stateNode;
            if (n === null && t.flags & 4) {
              n = l;
              var a = t.memoizedProps;
              switch (t.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  a.autoFocus && n.focus();
                  break;
                case "img":
                  a.src && (n.src = a.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (t.memoizedState === null) {
              var u = t.alternate;
              if (u !== null) {
                var c = u.memoizedState;
                if (c !== null) {
                  var f = c.dehydrated;
                  f !== null && jo(f);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(V(163));
        }
        De || t.flags & 512 && Na(t);
      } catch (d) {
        he(t, t.return, d);
      }
    }
    if (t === e) {
      W = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, W = n;
      break;
    }
    W = t.return;
  }
}
function vf(e) {
  for (; W !== null; ) {
    var t = W;
    if (t === e) {
      W = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, W = n;
      break;
    }
    W = t.return;
  }
}
function wf(e) {
  for (; W !== null; ) {
    var t = W;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Ds(4, t);
          } catch (a) {
            he(t, n, a);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var o = t.return;
            try {
              r.componentDidMount();
            } catch (a) {
              he(t, o, a);
            }
          }
          var i = t.return;
          try {
            Na(t);
          } catch (a) {
            he(t, i, a);
          }
          break;
        case 5:
          var s = t.return;
          try {
            Na(t);
          } catch (a) {
            he(t, s, a);
          }
      }
    } catch (a) {
      he(t, t.return, a);
    }
    if (t === e) {
      W = null;
      break;
    }
    var l = t.sibling;
    if (l !== null) {
      l.return = t.return, W = l;
      break;
    }
    W = t.return;
  }
}
var iv = Math.ceil, ds = qt.ReactCurrentDispatcher, $u = qt.ReactCurrentOwner, ut = qt.ReactCurrentBatchConfig, ee = 0, Ne = null, ve = null, Me = 0, Qe = 0, xr = kn(0), Se = 0, Vo = null, Yn = 0, Ls = 0, Iu = 0, Eo = null, Ue = null, Du = 0, Lr = 1 / 0, Lt = null, ps = !1, Pa = null, gn = null, xi = !1, cn = null, hs = 0, No = 0, Ma = null, bi = -1, Hi = 0;
function He() {
  return ee & 6 ? ye() : bi !== -1 ? bi : bi = ye();
}
function yn(e) {
  return e.mode & 1 ? ee & 2 && Me !== 0 ? Me & -Me : Vy.transition !== null ? (Hi === 0 && (Hi = ip()), Hi) : (e = oe, e !== 0 || (e = window.event, e = e === void 0 ? 16 : dp(e.type)), e) : 1;
}
function St(e, t, n, r) {
  if (50 < No) throw No = 0, Ma = null, Error(V(185));
  Zo(e, n, r), (!(ee & 2) || e !== Ne) && (e === Ne && (!(ee & 2) && (Ls |= n), Se === 4 && sn(e, Me)), Ge(e, r), n === 1 && ee === 0 && !(t.mode & 1) && (Lr = ye() + 500, Rs && En()));
}
function Ge(e, t) {
  var n = e.callbackNode;
  V0(e, t);
  var r = Qi(e, e === Ne ? Me : 0);
  if (r === 0) n !== null && zc(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && zc(n), t === 1) e.tag === 0 ? Hy(xf.bind(null, e)) : jp(xf.bind(null, e)), Ly(function() {
      !(ee & 6) && En();
    }), n = null;
    else {
      switch (sp(r)) {
        case 1:
          n = au;
          break;
        case 4:
          n = rp;
          break;
        case 16:
          n = qi;
          break;
        case 536870912:
          n = op;
          break;
        default:
          n = qi;
      }
      n = Mh(n, Sh.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function Sh(e, t) {
  if (bi = -1, Hi = 0, ee & 6) throw Error(V(327));
  var n = e.callbackNode;
  if (zr() && e.callbackNode !== n) return null;
  var r = Qi(e, e === Ne ? Me : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = ms(e, r);
  else {
    t = r;
    var o = ee;
    ee |= 2;
    var i = Eh();
    (Ne !== e || Me !== t) && (Lt = null, Lr = ye() + 500, Fn(e, t));
    do
      try {
        av();
        break;
      } catch (l) {
        kh(e, l);
      }
    while (!0);
    _u(), ds.current = i, ee = o, ve !== null ? t = 0 : (Ne = null, Me = 0, t = Se);
  }
  if (t !== 0) {
    if (t === 2 && (o = na(e), o !== 0 && (r = o, t = Ta(e, o))), t === 1) throw n = Vo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
    if (t === 6) sn(e, r);
    else {
      if (o = e.current.alternate, !(r & 30) && !sv(o) && (t = ms(e, r), t === 2 && (i = na(e), i !== 0 && (r = i, t = Ta(e, i))), t === 1)) throw n = Vo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
      switch (e.finishedWork = o, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(V(345));
        case 2:
          An(e, Ue, Lt);
          break;
        case 3:
          if (sn(e, r), (r & 130023424) === r && (t = Du + 500 - ye(), 10 < t)) {
            if (Qi(e, 0) !== 0) break;
            if (o = e.suspendedLanes, (o & r) !== r) {
              He(), e.pingedLanes |= e.suspendedLanes & o;
              break;
            }
            e.timeoutHandle = ca(An.bind(null, e, Ue, Lt), t);
            break;
          }
          An(e, Ue, Lt);
          break;
        case 4:
          if (sn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, o = -1; 0 < r; ) {
            var s = 31 - _t(r);
            i = 1 << s, s = t[s], s > o && (o = s), r &= ~i;
          }
          if (r = o, r = ye() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * iv(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = ca(An.bind(null, e, Ue, Lt), r);
            break;
          }
          An(e, Ue, Lt);
          break;
        case 5:
          An(e, Ue, Lt);
          break;
        default:
          throw Error(V(329));
      }
    }
  }
  return Ge(e, ye()), e.callbackNode === n ? Sh.bind(null, e) : null;
}
function Ta(e, t) {
  var n = Eo;
  return e.current.memoizedState.isDehydrated && (Fn(e, t).flags |= 256), e = ms(e, t), e !== 2 && (t = Ue, Ue = n, t !== null && ja(t)), e;
}
function ja(e) {
  Ue === null ? Ue = e : Ue.push.apply(Ue, e);
}
function sv(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var o = n[r], i = o.getSnapshot;
        o = o.value;
        try {
          if (!kt(i(), o)) return !1;
        } catch {
          return !1;
        }
      }
    }
    if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
  }
  return !0;
}
function sn(e, t) {
  for (t &= ~Iu, t &= ~Ls, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - _t(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function xf(e) {
  if (ee & 6) throw Error(V(327));
  zr();
  var t = Qi(e, 0);
  if (!(t & 1)) return Ge(e, ye()), null;
  var n = ms(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = na(e);
    r !== 0 && (t = r, n = Ta(e, r));
  }
  if (n === 1) throw n = Vo, Fn(e, 0), sn(e, t), Ge(e, ye()), n;
  if (n === 6) throw Error(V(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, An(e, Ue, Lt), Ge(e, ye()), null;
}
function Lu(e, t) {
  var n = ee;
  ee |= 1;
  try {
    return e(t);
  } finally {
    ee = n, ee === 0 && (Lr = ye() + 500, Rs && En());
  }
}
function Xn(e) {
  cn !== null && cn.tag === 0 && !(ee & 6) && zr();
  var t = ee;
  ee |= 1;
  var n = ut.transition, r = oe;
  try {
    if (ut.transition = null, oe = 1, e) return e();
  } finally {
    oe = r, ut.transition = n, ee = t, !(ee & 6) && En();
  }
}
function Ou() {
  Qe = xr.current, ue(xr);
}
function Fn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, Dy(n)), ve !== null) for (n = ve.return; n !== null; ) {
    var r = n;
    switch (vu(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && ns();
        break;
      case 3:
        Ir(), ue(Xe), ue(Le), zu();
        break;
      case 5:
        Cu(r);
        break;
      case 4:
        Ir();
        break;
      case 13:
        ue(fe);
        break;
      case 19:
        ue(fe);
        break;
      case 10:
        Su(r.type._context);
        break;
      case 22:
      case 23:
        Ou();
    }
    n = n.return;
  }
  if (Ne = e, ve = e = vn(e.current, null), Me = Qe = t, Se = 0, Vo = null, Iu = Ls = Yn = 0, Ue = Eo = null, In !== null) {
    for (t = 0; t < In.length; t++) if (n = In[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var o = r.next, i = n.pending;
      if (i !== null) {
        var s = i.next;
        i.next = o, r.next = s;
      }
      n.pending = r;
    }
    In = null;
  }
  return e;
}
function kh(e, t) {
  do {
    var n = ve;
    try {
      if (_u(), Li.current = fs, cs) {
        for (var r = de.memoizedState; r !== null; ) {
          var o = r.queue;
          o !== null && (o.pending = null), r = r.next;
        }
        cs = !1;
      }
      if (Wn = 0, Ee = xe = de = null, So = !1, Fo = 0, $u.current = null, n === null || n.return === null) {
        Se = 1, Vo = t, ve = null;
        break;
      }
      e: {
        var i = e, s = n.return, l = n, a = t;
        if (t = Me, l.flags |= 32768, a !== null && typeof a == "object" && typeof a.then == "function") {
          var u = a, c = l, f = c.tag;
          if (!(c.mode & 1) && (f === 0 || f === 11 || f === 15)) {
            var d = c.alternate;
            d ? (c.updateQueue = d.updateQueue, c.memoizedState = d.memoizedState, c.lanes = d.lanes) : (c.updateQueue = null, c.memoizedState = null);
          }
          var p = lf(s);
          if (p !== null) {
            p.flags &= -257, af(p, s, l, i, t), p.mode & 1 && sf(i, u, t), t = p, a = u;
            var x = t.updateQueue;
            if (x === null) {
              var y = /* @__PURE__ */ new Set();
              y.add(a), t.updateQueue = y;
            } else x.add(a);
            break e;
          } else {
            if (!(t & 1)) {
              sf(i, u, t), Fu();
              break e;
            }
            a = Error(V(426));
          }
        } else if (ce && l.mode & 1) {
          var E = lf(s);
          if (E !== null) {
            !(E.flags & 65536) && (E.flags |= 256), af(E, s, l, i, t), wu(Dr(a, l));
            break e;
          }
        }
        i = a = Dr(a, l), Se !== 4 && (Se = 2), Eo === null ? Eo = [i] : Eo.push(i), i = s;
        do {
          switch (i.tag) {
            case 3:
              i.flags |= 65536, t &= -t, i.lanes |= t;
              var h = sh(i, a, t);
              Jc(i, h);
              break e;
            case 1:
              l = a;
              var m = i.type, g = i.stateNode;
              if (!(i.flags & 128) && (typeof m.getDerivedStateFromError == "function" || g !== null && typeof g.componentDidCatch == "function" && (gn === null || !gn.has(g)))) {
                i.flags |= 65536, t &= -t, i.lanes |= t;
                var w = lh(i, l, t);
                Jc(i, w);
                break e;
              }
          }
          i = i.return;
        } while (i !== null);
      }
      Ch(n);
    } catch (N) {
      t = N, ve === n && n !== null && (ve = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function Eh() {
  var e = ds.current;
  return ds.current = fs, e === null ? fs : e;
}
function Fu() {
  (Se === 0 || Se === 3 || Se === 2) && (Se = 4), Ne === null || !(Yn & 268435455) && !(Ls & 268435455) || sn(Ne, Me);
}
function ms(e, t) {
  var n = ee;
  ee |= 2;
  var r = Eh();
  (Ne !== e || Me !== t) && (Lt = null, Fn(e, t));
  do
    try {
      lv();
      break;
    } catch (o) {
      kh(e, o);
    }
  while (!0);
  if (_u(), ee = n, ds.current = r, ve !== null) throw Error(V(261));
  return Ne = null, Me = 0, Se;
}
function lv() {
  for (; ve !== null; ) Nh(ve);
}
function av() {
  for (; ve !== null && !R0(); ) Nh(ve);
}
function Nh(e) {
  var t = Ph(e.alternate, e, Qe);
  e.memoizedProps = e.pendingProps, t === null ? Ch(e) : ve = t, $u.current = null;
}
function Ch(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = tv(n, t), n !== null) {
        n.flags &= 32767, ve = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        Se = 6, ve = null;
        return;
      }
    } else if (n = ev(n, t, Qe), n !== null) {
      ve = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ve = t;
      return;
    }
    ve = t = e;
  } while (t !== null);
  Se === 0 && (Se = 5);
}
function An(e, t, n) {
  var r = oe, o = ut.transition;
  try {
    ut.transition = null, oe = 1, uv(e, t, n, r);
  } finally {
    ut.transition = o, oe = r;
  }
  return null;
}
function uv(e, t, n, r) {
  do
    zr();
  while (cn !== null);
  if (ee & 6) throw Error(V(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(V(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var i = n.lanes | n.childLanes;
  if (B0(e, i), e === Ne && (ve = Ne = null, Me = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || xi || (xi = !0, Mh(qi, function() {
    return zr(), null;
  })), i = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || i) {
    i = ut.transition, ut.transition = null;
    var s = oe;
    oe = 1;
    var l = ee;
    ee |= 4, $u.current = null, rv(e, n), xh(n, e), My(aa), Zi = !!la, aa = la = null, e.current = n, ov(n), $0(), ee = l, oe = s, ut.transition = i;
  } else e.current = n;
  if (xi && (xi = !1, cn = e, hs = o), i = e.pendingLanes, i === 0 && (gn = null), L0(n.stateNode), Ge(e, ye()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) o = t[n], r(o.value, { componentStack: o.stack, digest: o.digest });
  if (ps) throw ps = !1, e = Pa, Pa = null, e;
  return hs & 1 && e.tag !== 0 && zr(), i = e.pendingLanes, i & 1 ? e === Ma ? No++ : (No = 0, Ma = e) : No = 0, En(), null;
}
function zr() {
  if (cn !== null) {
    var e = sp(hs), t = ut.transition, n = oe;
    try {
      if (ut.transition = null, oe = 16 > e ? 16 : e, cn === null) var r = !1;
      else {
        if (e = cn, cn = null, hs = 0, ee & 6) throw Error(V(331));
        var o = ee;
        for (ee |= 4, W = e.current; W !== null; ) {
          var i = W, s = i.child;
          if (W.flags & 16) {
            var l = i.deletions;
            if (l !== null) {
              for (var a = 0; a < l.length; a++) {
                var u = l[a];
                for (W = u; W !== null; ) {
                  var c = W;
                  switch (c.tag) {
                    case 0:
                    case 11:
                    case 15:
                      ko(8, c, i);
                  }
                  var f = c.child;
                  if (f !== null) f.return = c, W = f;
                  else for (; W !== null; ) {
                    c = W;
                    var d = c.sibling, p = c.return;
                    if (yh(c), c === u) {
                      W = null;
                      break;
                    }
                    if (d !== null) {
                      d.return = p, W = d;
                      break;
                    }
                    W = p;
                  }
                }
              }
              var x = i.alternate;
              if (x !== null) {
                var y = x.child;
                if (y !== null) {
                  x.child = null;
                  do {
                    var E = y.sibling;
                    y.sibling = null, y = E;
                  } while (y !== null);
                }
              }
              W = i;
            }
          }
          if (i.subtreeFlags & 2064 && s !== null) s.return = i, W = s;
          else e: for (; W !== null; ) {
            if (i = W, i.flags & 2048) switch (i.tag) {
              case 0:
              case 11:
              case 15:
                ko(9, i, i.return);
            }
            var h = i.sibling;
            if (h !== null) {
              h.return = i.return, W = h;
              break e;
            }
            W = i.return;
          }
        }
        var m = e.current;
        for (W = m; W !== null; ) {
          s = W;
          var g = s.child;
          if (s.subtreeFlags & 2064 && g !== null) g.return = s, W = g;
          else e: for (s = m; W !== null; ) {
            if (l = W, l.flags & 2048) try {
              switch (l.tag) {
                case 0:
                case 11:
                case 15:
                  Ds(9, l);
              }
            } catch (N) {
              he(l, l.return, N);
            }
            if (l === s) {
              W = null;
              break e;
            }
            var w = l.sibling;
            if (w !== null) {
              w.return = l.return, W = w;
              break e;
            }
            W = l.return;
          }
        }
        if (ee = o, En(), Mt && typeof Mt.onPostCommitFiberRoot == "function") try {
          Mt.onPostCommitFiberRoot(Ps, e);
        } catch {
        }
        r = !0;
      }
      return r;
    } finally {
      oe = n, ut.transition = t;
    }
  }
  return !1;
}
function _f(e, t, n) {
  t = Dr(n, t), t = sh(e, t, 1), e = mn(e, t, 1), t = He(), e !== null && (Zo(e, 1, t), Ge(e, t));
}
function he(e, t, n) {
  if (e.tag === 3) _f(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      _f(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (gn === null || !gn.has(r))) {
        e = Dr(n, e), e = lh(t, e, 1), t = mn(t, e, 1), e = He(), t !== null && (Zo(t, 1, e), Ge(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function cv(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = He(), e.pingedLanes |= e.suspendedLanes & n, Ne === e && (Me & n) === n && (Se === 4 || Se === 3 && (Me & 130023424) === Me && 500 > ye() - Du ? Fn(e, 0) : Iu |= n), Ge(e, t);
}
function zh(e, t) {
  t === 0 && (e.mode & 1 ? (t = ci, ci <<= 1, !(ci & 130023424) && (ci = 4194304)) : t = 1);
  var n = He();
  e = Yt(e, t), e !== null && (Zo(e, t, n), Ge(e, n));
}
function fv(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), zh(e, n);
}
function dv(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode, o = e.memoizedState;
      o !== null && (n = o.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(V(314));
  }
  r !== null && r.delete(t), zh(e, n);
}
var Ph;
Ph = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) We = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return We = !1, Jy(e, t, n);
    We = !!(e.flags & 131072);
  }
  else We = !1, ce && t.flags & 1048576 && Ap(t, is, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      Fi(e, t), e = t.pendingProps;
      var o = Ar(t, Le.current);
      Cr(t, n), o = Mu(null, t, r, e, o, n);
      var i = Tu();
      return t.flags |= 1, typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ke(r) ? (i = !0, rs(t)) : i = !1, t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null, Eu(t), o.updater = Is, t.stateNode = o, o._reactInternals = t, ya(t, r, e, n), t = xa(null, t, r, !0, i, n)) : (t.tag = 0, ce && i && yu(t), be(null, t, o, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (Fi(e, t), e = t.pendingProps, o = r._init, r = o(r._payload), t.type = r, o = t.tag = hv(r), e = gt(r, e), o) {
          case 0:
            t = wa(null, t, r, e, n);
            break e;
          case 1:
            t = ff(null, t, r, e, n);
            break e;
          case 11:
            t = uf(null, t, r, e, n);
            break e;
          case 14:
            t = cf(null, t, r, gt(r.type, e), n);
            break e;
        }
        throw Error(V(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), wa(e, t, r, o, n);
    case 1:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), ff(e, t, r, o, n);
    case 3:
      e: {
        if (fh(t), e === null) throw Error(V(387));
        r = t.pendingProps, i = t.memoizedState, o = i.element, Op(e, t), as(t, r, null, n);
        var s = t.memoizedState;
        if (r = s.element, i.isDehydrated) if (i = { element: r, isDehydrated: !1, cache: s.cache, pendingSuspenseBoundaries: s.pendingSuspenseBoundaries, transitions: s.transitions }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
          o = Dr(Error(V(423)), t), t = df(e, t, r, n, o);
          break e;
        } else if (r !== o) {
          o = Dr(Error(V(424)), t), t = df(e, t, r, n, o);
          break e;
        } else for (Ze = hn(t.stateNode.containerInfo.firstChild), Je = t, ce = !0, wt = null, n = Dp(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (Rr(), r === o) {
            t = Xt(e, t, n);
            break e;
          }
          be(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Fp(t), e === null && ha(t), r = t.type, o = t.pendingProps, i = e !== null ? e.memoizedProps : null, s = o.children, ua(r, o) ? s = null : i !== null && ua(r, i) && (t.flags |= 32), ch(e, t), be(e, t, s, n), t.child;
    case 6:
      return e === null && ha(t), null;
    case 13:
      return dh(e, t, n);
    case 4:
      return Nu(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = $r(t, null, r, n) : be(e, t, r, n), t.child;
    case 11:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), uf(e, t, r, o, n);
    case 7:
      return be(e, t, t.pendingProps, n), t.child;
    case 8:
      return be(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return be(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, o = t.pendingProps, i = t.memoizedProps, s = o.value, se(ss, r._currentValue), r._currentValue = s, i !== null) if (kt(i.value, s)) {
          if (i.children === o.children && !Xe.current) {
            t = Xt(e, t, n);
            break e;
          }
        } else for (i = t.child, i !== null && (i.return = t); i !== null; ) {
          var l = i.dependencies;
          if (l !== null) {
            s = i.child;
            for (var a = l.firstContext; a !== null; ) {
              if (a.context === r) {
                if (i.tag === 1) {
                  a = Vt(-1, n & -n), a.tag = 2;
                  var u = i.updateQueue;
                  if (u !== null) {
                    u = u.shared;
                    var c = u.pending;
                    c === null ? a.next = a : (a.next = c.next, c.next = a), u.pending = a;
                  }
                }
                i.lanes |= n, a = i.alternate, a !== null && (a.lanes |= n), ma(
                  i.return,
                  n,
                  t
                ), l.lanes |= n;
                break;
              }
              a = a.next;
            }
          } else if (i.tag === 10) s = i.type === t.type ? null : i.child;
          else if (i.tag === 18) {
            if (s = i.return, s === null) throw Error(V(341));
            s.lanes |= n, l = s.alternate, l !== null && (l.lanes |= n), ma(s, n, t), s = i.sibling;
          } else s = i.child;
          if (s !== null) s.return = i;
          else for (s = i; s !== null; ) {
            if (s === t) {
              s = null;
              break;
            }
            if (i = s.sibling, i !== null) {
              i.return = s.return, s = i;
              break;
            }
            s = s.return;
          }
          i = s;
        }
        be(e, t, o.children, n), t = t.child;
      }
      return t;
    case 9:
      return o = t.type, r = t.pendingProps.children, Cr(t, n), o = ft(o), r = r(o), t.flags |= 1, be(e, t, r, n), t.child;
    case 14:
      return r = t.type, o = gt(r, t.pendingProps), o = gt(r.type, o), cf(e, t, r, o, n);
    case 15:
      return ah(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), Fi(e, t), t.tag = 1, Ke(r) ? (e = !0, rs(t)) : e = !1, Cr(t, n), ih(t, r, o), ya(t, r, o, n), xa(null, t, r, !0, e, n);
    case 19:
      return ph(e, t, n);
    case 22:
      return uh(e, t, n);
  }
  throw Error(V(156, t.tag));
};
function Mh(e, t) {
  return np(e, t);
}
function pv(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function lt(e, t, n, r) {
  return new pv(e, t, n, r);
}
function bu(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function hv(e) {
  if (typeof e == "function") return bu(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === iu) return 11;
    if (e === su) return 14;
  }
  return 2;
}
function vn(e, t) {
  var n = e.alternate;
  return n === null ? (n = lt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function Vi(e, t, n, r, o, i) {
  var s = 2;
  if (r = e, typeof e == "function") bu(e) && (s = 1);
  else if (typeof e == "string") s = 5;
  else e: switch (e) {
    case cr:
      return bn(n.children, o, i, t);
    case ou:
      s = 8, o |= 8;
      break;
    case Hl:
      return e = lt(12, n, t, o | 2), e.elementType = Hl, e.lanes = i, e;
    case Vl:
      return e = lt(13, n, t, o), e.elementType = Vl, e.lanes = i, e;
    case Bl:
      return e = lt(19, n, t, o), e.elementType = Bl, e.lanes = i, e;
    case Fd:
      return Os(n, o, i, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Ld:
          s = 10;
          break e;
        case Od:
          s = 9;
          break e;
        case iu:
          s = 11;
          break e;
        case su:
          s = 14;
          break e;
        case en:
          s = 16, r = null;
          break e;
      }
      throw Error(V(130, e == null ? e : typeof e, ""));
  }
  return t = lt(s, n, t, o), t.elementType = e, t.type = r, t.lanes = i, t;
}
function bn(e, t, n, r) {
  return e = lt(7, e, r, t), e.lanes = n, e;
}
function Os(e, t, n, r) {
  return e = lt(22, e, r, t), e.elementType = Fd, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Nl(e, t, n) {
  return e = lt(6, e, null, t), e.lanes = n, e;
}
function Cl(e, t, n) {
  return t = lt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function mv(e, t, n, r, o) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = sl(0), this.expirationTimes = sl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = sl(0), this.identifierPrefix = r, this.onRecoverableError = o, this.mutableSourceEagerHydrationData = null;
}
function Hu(e, t, n, r, o, i, s, l, a) {
  return e = new mv(e, t, n, l, a), t === 1 ? (t = 1, i === !0 && (t |= 8)) : t = 0, i = lt(3, null, null, t), e.current = i, i.stateNode = e, i.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Eu(i), e;
}
function gv(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: ur, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function Th(e) {
  if (!e) return _n;
  e = e._reactInternals;
  e: {
    if (Qn(e) !== e || e.tag !== 1) throw Error(V(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Ke(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(V(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Ke(n)) return Tp(e, n, t);
  }
  return t;
}
function jh(e, t, n, r, o, i, s, l, a) {
  return e = Hu(n, r, !0, e, o, i, s, l, a), e.context = Th(null), n = e.current, r = He(), o = yn(n), i = Vt(r, o), i.callback = t ?? null, mn(n, i, o), e.current.lanes = o, Zo(e, o, r), Ge(e, r), e;
}
function Fs(e, t, n, r) {
  var o = t.current, i = He(), s = yn(o);
  return n = Th(n), t.context === null ? t.context = n : t.pendingContext = n, t = Vt(i, s), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = mn(o, t, s), e !== null && (St(e, o, s, i), Di(e, o, s)), s;
}
function gs(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Sf(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Vu(e, t) {
  Sf(e, t), (e = e.alternate) && Sf(e, t);
}
function yv() {
  return null;
}
var Ah = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function Bu(e) {
  this._internalRoot = e;
}
bs.prototype.render = Bu.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(V(409));
  Fs(e, t, null, null);
};
bs.prototype.unmount = Bu.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    Xn(function() {
      Fs(null, e, null, null);
    }), t[Wt] = null;
  }
};
function bs(e) {
  this._internalRoot = e;
}
bs.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = up();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < on.length && t !== 0 && t < on[n].priority; n++) ;
    on.splice(n, 0, e), n === 0 && fp(e);
  }
};
function Uu(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Hs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function kf() {
}
function vv(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var i = r;
      r = function() {
        var u = gs(s);
        i.call(u);
      };
    }
    var s = jh(t, r, e, 0, null, !1, !1, "", kf);
    return e._reactRootContainer = s, e[Wt] = s.current, $o(e.nodeType === 8 ? e.parentNode : e), Xn(), s;
  }
  for (; o = e.lastChild; ) e.removeChild(o);
  if (typeof r == "function") {
    var l = r;
    r = function() {
      var u = gs(a);
      l.call(u);
    };
  }
  var a = Hu(e, 0, !1, null, null, !1, !1, "", kf);
  return e._reactRootContainer = a, e[Wt] = a.current, $o(e.nodeType === 8 ? e.parentNode : e), Xn(function() {
    Fs(t, a, n, r);
  }), a;
}
function Vs(e, t, n, r, o) {
  var i = n._reactRootContainer;
  if (i) {
    var s = i;
    if (typeof o == "function") {
      var l = o;
      o = function() {
        var a = gs(s);
        l.call(a);
      };
    }
    Fs(t, s, e, o);
  } else s = vv(n, t, e, o, r);
  return gs(s);
}
lp = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = fo(t.pendingLanes);
        n !== 0 && (uu(t, n | 1), Ge(t, ye()), !(ee & 6) && (Lr = ye() + 500, En()));
      }
      break;
    case 13:
      Xn(function() {
        var r = Yt(e, 1);
        if (r !== null) {
          var o = He();
          St(r, e, 1, o);
        }
      }), Vu(e, 1);
  }
};
cu = function(e) {
  if (e.tag === 13) {
    var t = Yt(e, 134217728);
    if (t !== null) {
      var n = He();
      St(t, e, 134217728, n);
    }
    Vu(e, 134217728);
  }
};
ap = function(e) {
  if (e.tag === 13) {
    var t = yn(e), n = Yt(e, t);
    if (n !== null) {
      var r = He();
      St(n, e, t, r);
    }
    Vu(e, t);
  }
};
up = function() {
  return oe;
};
cp = function(e, t) {
  var n = oe;
  try {
    return oe = e, t();
  } finally {
    oe = n;
  }
};
Jl = function(e, t, n) {
  switch (t) {
    case "input":
      if (Yl(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = As(r);
            if (!o) throw Error(V(90));
            Hd(r), Yl(r, o);
          }
        }
      }
      break;
    case "textarea":
      Bd(e, n);
      break;
    case "select":
      t = n.value, t != null && Sr(e, !!n.multiple, t, !1);
  }
};
qd = Lu;
Qd = Xn;
var wv = { usingClientEntryPoint: !1, Events: [ei, hr, As, Kd, Gd, Lu] }, ro = { findFiberByHostInstance: $n, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, xv = { bundleType: ro.bundleType, version: ro.version, rendererPackageName: ro.rendererPackageName, rendererConfig: ro.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: qt.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = ep(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: ro.findFiberByHostInstance || yv, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var _i = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!_i.isDisabled && _i.supportsFiber) try {
    Ps = _i.inject(xv), Mt = _i;
  } catch {
  }
}
nt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = wv;
nt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Uu(t)) throw Error(V(200));
  return gv(e, t, null, n);
};
nt.createRoot = function(e, t) {
  if (!Uu(e)) throw Error(V(299));
  var n = !1, r = "", o = Ah;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = Hu(e, 1, !1, null, null, n, !1, r, o), e[Wt] = t.current, $o(e.nodeType === 8 ? e.parentNode : e), new Bu(t);
};
nt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(V(188)) : (e = Object.keys(e).join(","), Error(V(268, e)));
  return e = ep(t), e = e === null ? null : e.stateNode, e;
};
nt.flushSync = function(e) {
  return Xn(e);
};
nt.hydrate = function(e, t, n) {
  if (!Hs(t)) throw Error(V(200));
  return Vs(null, e, t, !0, n);
};
nt.hydrateRoot = function(e, t, n) {
  if (!Uu(e)) throw Error(V(405));
  var r = n != null && n.hydratedSources || null, o = !1, i = "", s = Ah;
  if (n != null && (n.unstable_strictMode === !0 && (o = !0), n.identifierPrefix !== void 0 && (i = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = jh(t, null, e, 1, n ?? null, o, !1, i, s), e[Wt] = t.current, $o(e), r) for (e = 0; e < r.length; e++) n = r[e], o = n._getVersion, o = o(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(
    n,
    o
  );
  return new bs(t);
};
nt.render = function(e, t, n) {
  if (!Hs(t)) throw Error(V(200));
  return Vs(null, e, t, !1, n);
};
nt.unmountComponentAtNode = function(e) {
  if (!Hs(e)) throw Error(V(40));
  return e._reactRootContainer ? (Xn(function() {
    Vs(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Wt] = null;
    });
  }), !0) : !1;
};
nt.unstable_batchedUpdates = Lu;
nt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Hs(n)) throw Error(V(200));
  if (e == null || e._reactInternals === void 0) throw Error(V(38));
  return Vs(e, t, n, !1, r);
};
nt.version = "18.3.1-next-f1338f8080-20240426";
function Rh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Rh);
    } catch (e) {
      console.error(e);
    }
}
Rh(), Rd.exports = nt;
var _v = Rd.exports, $h, Ef = _v;
$h = Ef.createRoot, Ef.hydrateRoot;
function je(e) {
  if (typeof e == "string" || typeof e == "number") return "" + e;
  let t = "";
  if (Array.isArray(e))
    for (let n = 0, r; n < e.length; n++)
      (r = je(e[n])) !== "" && (t += (t && " ") + r);
  else
    for (let n in e)
      e[n] && (t += (t && " ") + n);
  return t;
}
var Ih = { exports: {} }, Dh = {}, Lh = { exports: {} }, Oh = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Or = C;
function Sv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var kv = typeof Object.is == "function" ? Object.is : Sv, Ev = Or.useState, Nv = Or.useEffect, Cv = Or.useLayoutEffect, zv = Or.useDebugValue;
function Pv(e, t) {
  var n = t(), r = Ev({ inst: { value: n, getSnapshot: t } }), o = r[0].inst, i = r[1];
  return Cv(
    function() {
      o.value = n, o.getSnapshot = t, zl(o) && i({ inst: o });
    },
    [e, n, t]
  ), Nv(
    function() {
      return zl(o) && i({ inst: o }), e(function() {
        zl(o) && i({ inst: o });
      });
    },
    [e]
  ), zv(n), n;
}
function zl(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !kv(e, n);
  } catch {
    return !0;
  }
}
function Mv(e, t) {
  return t();
}
var Tv = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? Mv : Pv;
Oh.useSyncExternalStore = Or.useSyncExternalStore !== void 0 ? Or.useSyncExternalStore : Tv;
Lh.exports = Oh;
var jv = Lh.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Bs = C, Av = jv;
function Rv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var $v = typeof Object.is == "function" ? Object.is : Rv, Iv = Av.useSyncExternalStore, Dv = Bs.useRef, Lv = Bs.useEffect, Ov = Bs.useMemo, Fv = Bs.useDebugValue;
Dh.useSyncExternalStoreWithSelector = function(e, t, n, r, o) {
  var i = Dv(null);
  if (i.current === null) {
    var s = { hasValue: !1, value: null };
    i.current = s;
  } else s = i.current;
  i = Ov(
    function() {
      function a(p) {
        if (!u) {
          if (u = !0, c = p, p = r(p), o !== void 0 && s.hasValue) {
            var x = s.value;
            if (o(x, p))
              return f = x;
          }
          return f = p;
        }
        if (x = f, $v(c, p)) return x;
        var y = r(p);
        return o !== void 0 && o(x, y) ? (c = p, x) : (c = p, f = y);
      }
      var u = !1, c, f, d = n === void 0 ? null : n;
      return [
        function() {
          return a(t());
        },
        d === null ? void 0 : function() {
          return a(d());
        }
      ];
    },
    [t, n, r, o]
  );
  var l = Iv(e, i[0], i[1]);
  return Lv(
    function() {
      s.hasValue = !0, s.value = l;
    },
    [l]
  ), Fv(l), l;
};
Ih.exports = Dh;
var bv = Ih.exports;
const Fh = /* @__PURE__ */ qa(bv), Hv = {}, Nf = (e) => {
  let t;
  const n = /* @__PURE__ */ new Set(), r = (c, f) => {
    const d = typeof c == "function" ? c(t) : c;
    if (!Object.is(d, t)) {
      const p = t;
      t = f ?? (typeof d != "object" || d === null) ? d : Object.assign({}, t, d), n.forEach((x) => x(t, p));
    }
  }, o = () => t, a = { setState: r, getState: o, getInitialState: () => u, subscribe: (c) => (n.add(c), () => n.delete(c)), destroy: () => {
    (Hv ? "production" : void 0) !== "production" && console.warn(
      "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
    ), n.clear();
  } }, u = t = e(r, o, a);
  return a;
}, bh = (e) => e ? Nf(e) : Nf, { useDebugValue: Vv } = I, { useSyncExternalStoreWithSelector: Bv } = Fh, Uv = (e) => e;
function Hh(e, t = Uv, n) {
  const r = Bv(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return Vv(r), r;
}
const Cf = (e, t) => {
  const n = bh(e), r = (o, i = t) => Hh(n, o, i);
  return Object.assign(r, n), r;
}, Wv = (e, t) => e ? Cf(e, t) : Cf;
function Ce(e, t) {
  if (Object.is(e, t))
    return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  if (e instanceof Map && t instanceof Map) {
    if (e.size !== t.size) return !1;
    for (const [r, o] of e)
      if (!Object.is(o, t.get(r)))
        return !1;
    return !0;
  }
  if (e instanceof Set && t instanceof Set) {
    if (e.size !== t.size) return !1;
    for (const r of e)
      if (!t.has(r))
        return !1;
    return !0;
  }
  const n = Object.keys(e);
  if (n.length !== Object.keys(t).length)
    return !1;
  for (const r of n)
    if (!Object.prototype.hasOwnProperty.call(t, r) || !Object.is(e[r], t[r]))
      return !1;
  return !0;
}
var Yv = { value: () => {
} };
function Us() {
  for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
    if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
    n[r] = [];
  }
  return new Bi(n);
}
function Bi(e) {
  this._ = e;
}
function Xv(e, t) {
  return e.trim().split(/^|\s+/).map(function(n) {
    var r = "", o = n.indexOf(".");
    if (o >= 0 && (r = n.slice(o + 1), n = n.slice(0, o)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
    return { type: n, name: r };
  });
}
Bi.prototype = Us.prototype = {
  constructor: Bi,
  on: function(e, t) {
    var n = this._, r = Xv(e + "", n), o, i = -1, s = r.length;
    if (arguments.length < 2) {
      for (; ++i < s; ) if ((o = (e = r[i]).type) && (o = Kv(n[o], e.name))) return o;
      return;
    }
    if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
    for (; ++i < s; )
      if (o = (e = r[i]).type) n[o] = zf(n[o], e.name, t);
      else if (t == null) for (o in n) n[o] = zf(n[o], e.name, null);
    return this;
  },
  copy: function() {
    var e = {}, t = this._;
    for (var n in t) e[n] = t[n].slice();
    return new Bi(e);
  },
  call: function(e, t) {
    if ((o = arguments.length - 2) > 0) for (var n = new Array(o), r = 0, o, i; r < o; ++r) n[r] = arguments[r + 2];
    if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
    for (i = this._[e], r = 0, o = i.length; r < o; ++r) i[r].value.apply(t, n);
  },
  apply: function(e, t, n) {
    if (!this._.hasOwnProperty(e)) throw new Error("unknown type: " + e);
    for (var r = this._[e], o = 0, i = r.length; o < i; ++o) r[o].value.apply(t, n);
  }
};
function Kv(e, t) {
  for (var n = 0, r = e.length, o; n < r; ++n)
    if ((o = e[n]).name === t)
      return o.value;
}
function zf(e, t, n) {
  for (var r = 0, o = e.length; r < o; ++r)
    if (e[r].name === t) {
      e[r] = Yv, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
  return n != null && e.push({ name: t, value: n }), e;
}
var Aa = "http://www.w3.org/1999/xhtml";
const Pf = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: Aa,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function Ws(e) {
  var t = e += "", n = t.indexOf(":");
  return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Pf.hasOwnProperty(t) ? { space: Pf[t], local: e } : e;
}
function Gv(e) {
  return function() {
    var t = this.ownerDocument, n = this.namespaceURI;
    return n === Aa && t.documentElement.namespaceURI === Aa ? t.createElement(e) : t.createElementNS(n, e);
  };
}
function qv(e) {
  return function() {
    return this.ownerDocument.createElementNS(e.space, e.local);
  };
}
function Vh(e) {
  var t = Ws(e);
  return (t.local ? qv : Gv)(t);
}
function Qv() {
}
function Wu(e) {
  return e == null ? Qv : function() {
    return this.querySelector(e);
  };
}
function Zv(e) {
  typeof e != "function" && (e = Wu(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = new Array(s), a, u, c = 0; c < s; ++c)
      (a = i[c]) && (u = e.call(a, a.__data__, c, i)) && ("__data__" in a && (u.__data__ = a.__data__), l[c] = u);
  return new tt(r, this._parents);
}
function Jv(e) {
  return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
}
function ew() {
  return [];
}
function Bh(e) {
  return e == null ? ew : function() {
    return this.querySelectorAll(e);
  };
}
function tw(e) {
  return function() {
    return Jv(e.apply(this, arguments));
  };
}
function nw(e) {
  typeof e == "function" ? e = tw(e) : e = Bh(e);
  for (var t = this._groups, n = t.length, r = [], o = [], i = 0; i < n; ++i)
    for (var s = t[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && (r.push(e.call(a, a.__data__, u, s)), o.push(a));
  return new tt(r, o);
}
function Uh(e) {
  return function() {
    return this.matches(e);
  };
}
function Wh(e) {
  return function(t) {
    return t.matches(e);
  };
}
var rw = Array.prototype.find;
function ow(e) {
  return function() {
    return rw.call(this.children, e);
  };
}
function iw() {
  return this.firstElementChild;
}
function sw(e) {
  return this.select(e == null ? iw : ow(typeof e == "function" ? e : Wh(e)));
}
var lw = Array.prototype.filter;
function aw() {
  return Array.from(this.children);
}
function uw(e) {
  return function() {
    return lw.call(this.children, e);
  };
}
function cw(e) {
  return this.selectAll(e == null ? aw : uw(typeof e == "function" ? e : Wh(e)));
}
function fw(e) {
  typeof e != "function" && (e = Uh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new tt(r, this._parents);
}
function Yh(e) {
  return new Array(e.length);
}
function dw() {
  return new tt(this._enter || this._groups.map(Yh), this._parents);
}
function ys(e, t) {
  this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
}
ys.prototype = {
  constructor: ys,
  appendChild: function(e) {
    return this._parent.insertBefore(e, this._next);
  },
  insertBefore: function(e, t) {
    return this._parent.insertBefore(e, t);
  },
  querySelector: function(e) {
    return this._parent.querySelector(e);
  },
  querySelectorAll: function(e) {
    return this._parent.querySelectorAll(e);
  }
};
function pw(e) {
  return function() {
    return e;
  };
}
function hw(e, t, n, r, o, i) {
  for (var s = 0, l, a = t.length, u = i.length; s < u; ++s)
    (l = t[s]) ? (l.__data__ = i[s], r[s] = l) : n[s] = new ys(e, i[s]);
  for (; s < a; ++s)
    (l = t[s]) && (o[s] = l);
}
function mw(e, t, n, r, o, i, s) {
  var l, a, u = /* @__PURE__ */ new Map(), c = t.length, f = i.length, d = new Array(c), p;
  for (l = 0; l < c; ++l)
    (a = t[l]) && (d[l] = p = s.call(a, a.__data__, l, t) + "", u.has(p) ? o[l] = a : u.set(p, a));
  for (l = 0; l < f; ++l)
    p = s.call(e, i[l], l, i) + "", (a = u.get(p)) ? (r[l] = a, a.__data__ = i[l], u.delete(p)) : n[l] = new ys(e, i[l]);
  for (l = 0; l < c; ++l)
    (a = t[l]) && u.get(d[l]) === a && (o[l] = a);
}
function gw(e) {
  return e.__data__;
}
function yw(e, t) {
  if (!arguments.length) return Array.from(this, gw);
  var n = t ? mw : hw, r = this._parents, o = this._groups;
  typeof e != "function" && (e = pw(e));
  for (var i = o.length, s = new Array(i), l = new Array(i), a = new Array(i), u = 0; u < i; ++u) {
    var c = r[u], f = o[u], d = f.length, p = vw(e.call(c, c && c.__data__, u, r)), x = p.length, y = l[u] = new Array(x), E = s[u] = new Array(x), h = a[u] = new Array(d);
    n(c, f, y, E, h, p, t);
    for (var m = 0, g = 0, w, N; m < x; ++m)
      if (w = y[m]) {
        for (m >= g && (g = m + 1); !(N = E[g]) && ++g < x; ) ;
        w._next = N || null;
      }
  }
  return s = new tt(s, r), s._enter = l, s._exit = a, s;
}
function vw(e) {
  return typeof e == "object" && "length" in e ? e : Array.from(e);
}
function ww() {
  return new tt(this._exit || this._groups.map(Yh), this._parents);
}
function xw(e, t, n) {
  var r = this.enter(), o = this, i = this.exit();
  return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (o = t(o), o && (o = o.selection())), n == null ? i.remove() : n(i), r && o ? r.merge(o).order() : o;
}
function _w(e) {
  for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, o = n.length, i = r.length, s = Math.min(o, i), l = new Array(o), a = 0; a < s; ++a)
    for (var u = n[a], c = r[a], f = u.length, d = l[a] = new Array(f), p, x = 0; x < f; ++x)
      (p = u[x] || c[x]) && (d[x] = p);
  for (; a < o; ++a)
    l[a] = n[a];
  return new tt(l, this._parents);
}
function Sw() {
  for (var e = this._groups, t = -1, n = e.length; ++t < n; )
    for (var r = e[t], o = r.length - 1, i = r[o], s; --o >= 0; )
      (s = r[o]) && (i && s.compareDocumentPosition(i) ^ 4 && i.parentNode.insertBefore(s, i), i = s);
  return this;
}
function kw(e) {
  e || (e = Ew);
  function t(f, d) {
    return f && d ? e(f.__data__, d.__data__) : !f - !d;
  }
  for (var n = this._groups, r = n.length, o = new Array(r), i = 0; i < r; ++i) {
    for (var s = n[i], l = s.length, a = o[i] = new Array(l), u, c = 0; c < l; ++c)
      (u = s[c]) && (a[c] = u);
    a.sort(t);
  }
  return new tt(o, this._parents).order();
}
function Ew(e, t) {
  return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function Nw() {
  var e = arguments[0];
  return arguments[0] = this, e.apply(null, arguments), this;
}
function Cw() {
  return Array.from(this);
}
function zw() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length; o < i; ++o) {
      var s = r[o];
      if (s) return s;
    }
  return null;
}
function Pw() {
  let e = 0;
  for (const t of this) ++e;
  return e;
}
function Mw() {
  return !this.node();
}
function Tw(e) {
  for (var t = this._groups, n = 0, r = t.length; n < r; ++n)
    for (var o = t[n], i = 0, s = o.length, l; i < s; ++i)
      (l = o[i]) && e.call(l, l.__data__, i, o);
  return this;
}
function jw(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function Aw(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function Rw(e, t) {
  return function() {
    this.setAttribute(e, t);
  };
}
function $w(e, t) {
  return function() {
    this.setAttributeNS(e.space, e.local, t);
  };
}
function Iw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
  };
}
function Dw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
  };
}
function Lw(e, t) {
  var n = Ws(e);
  if (arguments.length < 2) {
    var r = this.node();
    return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
  }
  return this.each((t == null ? n.local ? Aw : jw : typeof t == "function" ? n.local ? Dw : Iw : n.local ? $w : Rw)(n, t));
}
function Xh(e) {
  return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
}
function Ow(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function Fw(e, t, n) {
  return function() {
    this.style.setProperty(e, t, n);
  };
}
function bw(e, t, n) {
  return function() {
    var r = t.apply(this, arguments);
    r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
  };
}
function Hw(e, t, n) {
  return arguments.length > 1 ? this.each((t == null ? Ow : typeof t == "function" ? bw : Fw)(e, t, n ?? "")) : Fr(this.node(), e);
}
function Fr(e, t) {
  return e.style.getPropertyValue(t) || Xh(e).getComputedStyle(e, null).getPropertyValue(t);
}
function Vw(e) {
  return function() {
    delete this[e];
  };
}
function Bw(e, t) {
  return function() {
    this[e] = t;
  };
}
function Uw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? delete this[e] : this[e] = n;
  };
}
function Ww(e, t) {
  return arguments.length > 1 ? this.each((t == null ? Vw : typeof t == "function" ? Uw : Bw)(e, t)) : this.node()[e];
}
function Kh(e) {
  return e.trim().split(/^|\s+/);
}
function Yu(e) {
  return e.classList || new Gh(e);
}
function Gh(e) {
  this._node = e, this._names = Kh(e.getAttribute("class") || "");
}
Gh.prototype = {
  add: function(e) {
    var t = this._names.indexOf(e);
    t < 0 && (this._names.push(e), this._node.setAttribute("class", this._names.join(" ")));
  },
  remove: function(e) {
    var t = this._names.indexOf(e);
    t >= 0 && (this._names.splice(t, 1), this._node.setAttribute("class", this._names.join(" ")));
  },
  contains: function(e) {
    return this._names.indexOf(e) >= 0;
  }
};
function qh(e, t) {
  for (var n = Yu(e), r = -1, o = t.length; ++r < o; ) n.add(t[r]);
}
function Qh(e, t) {
  for (var n = Yu(e), r = -1, o = t.length; ++r < o; ) n.remove(t[r]);
}
function Yw(e) {
  return function() {
    qh(this, e);
  };
}
function Xw(e) {
  return function() {
    Qh(this, e);
  };
}
function Kw(e, t) {
  return function() {
    (t.apply(this, arguments) ? qh : Qh)(this, e);
  };
}
function Gw(e, t) {
  var n = Kh(e + "");
  if (arguments.length < 2) {
    for (var r = Yu(this.node()), o = -1, i = n.length; ++o < i; ) if (!r.contains(n[o])) return !1;
    return !0;
  }
  return this.each((typeof t == "function" ? Kw : t ? Yw : Xw)(n, t));
}
function qw() {
  this.textContent = "";
}
function Qw(e) {
  return function() {
    this.textContent = e;
  };
}
function Zw(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.textContent = t ?? "";
  };
}
function Jw(e) {
  return arguments.length ? this.each(e == null ? qw : (typeof e == "function" ? Zw : Qw)(e)) : this.node().textContent;
}
function ex() {
  this.innerHTML = "";
}
function tx(e) {
  return function() {
    this.innerHTML = e;
  };
}
function nx(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.innerHTML = t ?? "";
  };
}
function rx(e) {
  return arguments.length ? this.each(e == null ? ex : (typeof e == "function" ? nx : tx)(e)) : this.node().innerHTML;
}
function ox() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function ix() {
  return this.each(ox);
}
function sx() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function lx() {
  return this.each(sx);
}
function ax(e) {
  var t = typeof e == "function" ? e : Vh(e);
  return this.select(function() {
    return this.appendChild(t.apply(this, arguments));
  });
}
function ux() {
  return null;
}
function cx(e, t) {
  var n = typeof e == "function" ? e : Vh(e), r = t == null ? ux : typeof t == "function" ? t : Wu(t);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
  });
}
function fx() {
  var e = this.parentNode;
  e && e.removeChild(this);
}
function dx() {
  return this.each(fx);
}
function px() {
  var e = this.cloneNode(!1), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function hx() {
  var e = this.cloneNode(!0), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function mx(e) {
  return this.select(e ? hx : px);
}
function gx(e) {
  return arguments.length ? this.property("__data__", e) : this.node().__data__;
}
function yx(e) {
  return function(t) {
    e.call(this, t, this.__data__);
  };
}
function vx(e) {
  return e.trim().split(/^|\s+/).map(function(t) {
    var n = "", r = t.indexOf(".");
    return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), { type: t, name: n };
  });
}
function wx(e) {
  return function() {
    var t = this.__on;
    if (t) {
      for (var n = 0, r = -1, o = t.length, i; n < o; ++n)
        i = t[n], (!e.type || i.type === e.type) && i.name === e.name ? this.removeEventListener(i.type, i.listener, i.options) : t[++r] = i;
      ++r ? t.length = r : delete this.__on;
    }
  };
}
function xx(e, t, n) {
  return function() {
    var r = this.__on, o, i = yx(t);
    if (r) {
      for (var s = 0, l = r.length; s < l; ++s)
        if ((o = r[s]).type === e.type && o.name === e.name) {
          this.removeEventListener(o.type, o.listener, o.options), this.addEventListener(o.type, o.listener = i, o.options = n), o.value = t;
          return;
        }
    }
    this.addEventListener(e.type, i, n), o = { type: e.type, name: e.name, value: t, listener: i, options: n }, r ? r.push(o) : this.__on = [o];
  };
}
function _x(e, t, n) {
  var r = vx(e + ""), o, i = r.length, s;
  if (arguments.length < 2) {
    var l = this.node().__on;
    if (l) {
      for (var a = 0, u = l.length, c; a < u; ++a)
        for (o = 0, c = l[a]; o < i; ++o)
          if ((s = r[o]).type === c.type && s.name === c.name)
            return c.value;
    }
    return;
  }
  for (l = t ? xx : wx, o = 0; o < i; ++o) this.each(l(r[o], t, n));
  return this;
}
function Zh(e, t, n) {
  var r = Xh(e), o = r.CustomEvent;
  typeof o == "function" ? o = new o(t, n) : (o = r.document.createEvent("Event"), n ? (o.initEvent(t, n.bubbles, n.cancelable), o.detail = n.detail) : o.initEvent(t, !1, !1)), e.dispatchEvent(o);
}
function Sx(e, t) {
  return function() {
    return Zh(this, e, t);
  };
}
function kx(e, t) {
  return function() {
    return Zh(this, e, t.apply(this, arguments));
  };
}
function Ex(e, t) {
  return this.each((typeof t == "function" ? kx : Sx)(e, t));
}
function* Nx() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length, s; o < i; ++o)
      (s = r[o]) && (yield s);
}
var Jh = [null];
function tt(e, t) {
  this._groups = e, this._parents = t;
}
function ni() {
  return new tt([[document.documentElement]], Jh);
}
function Cx() {
  return this;
}
tt.prototype = ni.prototype = {
  constructor: tt,
  select: Zv,
  selectAll: nw,
  selectChild: sw,
  selectChildren: cw,
  filter: fw,
  data: yw,
  enter: dw,
  exit: ww,
  join: xw,
  merge: _w,
  selection: Cx,
  order: Sw,
  sort: kw,
  call: Nw,
  nodes: Cw,
  node: zw,
  size: Pw,
  empty: Mw,
  each: Tw,
  attr: Lw,
  style: Hw,
  property: Ww,
  classed: Gw,
  text: Jw,
  html: rx,
  raise: ix,
  lower: lx,
  append: ax,
  insert: cx,
  remove: dx,
  clone: mx,
  datum: gx,
  on: _x,
  dispatch: Ex,
  [Symbol.iterator]: Nx
};
function st(e) {
  return typeof e == "string" ? new tt([[document.querySelector(e)]], [document.documentElement]) : new tt([[e]], Jh);
}
function zx(e) {
  let t;
  for (; t = e.sourceEvent; ) e = t;
  return e;
}
function vt(e, t) {
  if (e = zx(e), t === void 0 && (t = e.currentTarget), t) {
    var n = t.ownerSVGElement || t;
    if (n.createSVGPoint) {
      var r = n.createSVGPoint();
      return r.x = e.clientX, r.y = e.clientY, r = r.matrixTransform(t.getScreenCTM().inverse()), [r.x, r.y];
    }
    if (t.getBoundingClientRect) {
      var o = t.getBoundingClientRect();
      return [e.clientX - o.left - t.clientLeft, e.clientY - o.top - t.clientTop];
    }
  }
  return [e.pageX, e.pageY];
}
const Px = { passive: !1 }, Bo = { capture: !0, passive: !1 };
function Pl(e) {
  e.stopImmediatePropagation();
}
function Pr(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function em(e) {
  var t = e.document.documentElement, n = st(e).on("dragstart.drag", Pr, Bo);
  "onselectstart" in t ? n.on("selectstart.drag", Pr, Bo) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
}
function tm(e, t) {
  var n = e.document.documentElement, r = st(e).on("dragstart.drag", null);
  t && (r.on("click.drag", Pr, Bo), setTimeout(function() {
    r.on("click.drag", null);
  }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
}
const Si = (e) => () => e;
function Ra(e, {
  sourceEvent: t,
  subject: n,
  target: r,
  identifier: o,
  active: i,
  x: s,
  y: l,
  dx: a,
  dy: u,
  dispatch: c
}) {
  Object.defineProperties(this, {
    type: { value: e, enumerable: !0, configurable: !0 },
    sourceEvent: { value: t, enumerable: !0, configurable: !0 },
    subject: { value: n, enumerable: !0, configurable: !0 },
    target: { value: r, enumerable: !0, configurable: !0 },
    identifier: { value: o, enumerable: !0, configurable: !0 },
    active: { value: i, enumerable: !0, configurable: !0 },
    x: { value: s, enumerable: !0, configurable: !0 },
    y: { value: l, enumerable: !0, configurable: !0 },
    dx: { value: a, enumerable: !0, configurable: !0 },
    dy: { value: u, enumerable: !0, configurable: !0 },
    _: { value: c }
  });
}
Ra.prototype.on = function() {
  var e = this._.on.apply(this._, arguments);
  return e === this._ ? this : e;
};
function Mx(e) {
  return !e.ctrlKey && !e.button;
}
function Tx() {
  return this.parentNode;
}
function jx(e, t) {
  return t ?? { x: e.x, y: e.y };
}
function Ax() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function Rx() {
  var e = Mx, t = Tx, n = jx, r = Ax, o = {}, i = Us("start", "drag", "end"), s = 0, l, a, u, c, f = 0;
  function d(w) {
    w.on("mousedown.drag", p).filter(r).on("touchstart.drag", E).on("touchmove.drag", h, Px).on("touchend.drag touchcancel.drag", m).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  function p(w, N) {
    if (!(c || !e.call(this, w, N))) {
      var P = g(this, t.call(this, w, N), w, N, "mouse");
      P && (st(w.view).on("mousemove.drag", x, Bo).on("mouseup.drag", y, Bo), em(w.view), Pl(w), u = !1, l = w.clientX, a = w.clientY, P("start", w));
    }
  }
  function x(w) {
    if (Pr(w), !u) {
      var N = w.clientX - l, P = w.clientY - a;
      u = N * N + P * P > f;
    }
    o.mouse("drag", w);
  }
  function y(w) {
    st(w.view).on("mousemove.drag mouseup.drag", null), tm(w.view, u), Pr(w), o.mouse("end", w);
  }
  function E(w, N) {
    if (e.call(this, w, N)) {
      var P = w.changedTouches, T = t.call(this, w, N), M = P.length, k, A;
      for (k = 0; k < M; ++k)
        (A = g(this, T, w, N, P[k].identifier, P[k])) && (Pl(w), A("start", w, P[k]));
    }
  }
  function h(w) {
    var N = w.changedTouches, P = N.length, T, M;
    for (T = 0; T < P; ++T)
      (M = o[N[T].identifier]) && (Pr(w), M("drag", w, N[T]));
  }
  function m(w) {
    var N = w.changedTouches, P = N.length, T, M;
    for (c && clearTimeout(c), c = setTimeout(function() {
      c = null;
    }, 500), T = 0; T < P; ++T)
      (M = o[N[T].identifier]) && (Pl(w), M("end", w, N[T]));
  }
  function g(w, N, P, T, M, k) {
    var A = i.copy(), F = vt(k || P, N), O, H, _;
    if ((_ = n.call(w, new Ra("beforestart", {
      sourceEvent: P,
      target: d,
      identifier: M,
      active: s,
      x: F[0],
      y: F[1],
      dx: 0,
      dy: 0,
      dispatch: A
    }), T)) != null)
      return O = _.x - F[0] || 0, H = _.y - F[1] || 0, function $(z, L, j) {
        var S = F, R;
        switch (z) {
          case "start":
            o[M] = $, R = s++;
            break;
          case "end":
            delete o[M], --s;
          case "drag":
            F = vt(j || L, N), R = s;
            break;
        }
        A.call(
          z,
          w,
          new Ra(z, {
            sourceEvent: L,
            subject: _,
            target: d,
            identifier: M,
            active: R,
            x: F[0] + O,
            y: F[1] + H,
            dx: F[0] - S[0],
            dy: F[1] - S[1],
            dispatch: A
          }),
          T
        );
      };
  }
  return d.filter = function(w) {
    return arguments.length ? (e = typeof w == "function" ? w : Si(!!w), d) : e;
  }, d.container = function(w) {
    return arguments.length ? (t = typeof w == "function" ? w : Si(w), d) : t;
  }, d.subject = function(w) {
    return arguments.length ? (n = typeof w == "function" ? w : Si(w), d) : n;
  }, d.touchable = function(w) {
    return arguments.length ? (r = typeof w == "function" ? w : Si(!!w), d) : r;
  }, d.on = function() {
    var w = i.on.apply(i, arguments);
    return w === i ? d : w;
  }, d.clickDistance = function(w) {
    return arguments.length ? (f = (w = +w) * w, d) : Math.sqrt(f);
  }, d;
}
function Xu(e, t, n) {
  e.prototype = t.prototype = n, n.constructor = e;
}
function nm(e, t) {
  var n = Object.create(e.prototype);
  for (var r in t) n[r] = t[r];
  return n;
}
function ri() {
}
var Uo = 0.7, vs = 1 / Uo, Mr = "\\s*([+-]?\\d+)\\s*", Wo = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", jt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", $x = /^#([0-9a-f]{3,8})$/, Ix = new RegExp(`^rgb\\(${Mr},${Mr},${Mr}\\)$`), Dx = new RegExp(`^rgb\\(${jt},${jt},${jt}\\)$`), Lx = new RegExp(`^rgba\\(${Mr},${Mr},${Mr},${Wo}\\)$`), Ox = new RegExp(`^rgba\\(${jt},${jt},${jt},${Wo}\\)$`), Fx = new RegExp(`^hsl\\(${Wo},${jt},${jt}\\)$`), bx = new RegExp(`^hsla\\(${Wo},${jt},${jt},${Wo}\\)$`), Mf = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
Xu(ri, Yo, {
  copy(e) {
    return Object.assign(new this.constructor(), this, e);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: Tf,
  // Deprecated! Use color.formatHex.
  formatHex: Tf,
  formatHex8: Hx,
  formatHsl: Vx,
  formatRgb: jf,
  toString: jf
});
function Tf() {
  return this.rgb().formatHex();
}
function Hx() {
  return this.rgb().formatHex8();
}
function Vx() {
  return rm(this).formatHsl();
}
function jf() {
  return this.rgb().formatRgb();
}
function Yo(e) {
  var t, n;
  return e = (e + "").trim().toLowerCase(), (t = $x.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Af(t) : n === 3 ? new Ye(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? ki(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? ki(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Ix.exec(e)) ? new Ye(t[1], t[2], t[3], 1) : (t = Dx.exec(e)) ? new Ye(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Lx.exec(e)) ? ki(t[1], t[2], t[3], t[4]) : (t = Ox.exec(e)) ? ki(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Fx.exec(e)) ? If(t[1], t[2] / 100, t[3] / 100, 1) : (t = bx.exec(e)) ? If(t[1], t[2] / 100, t[3] / 100, t[4]) : Mf.hasOwnProperty(e) ? Af(Mf[e]) : e === "transparent" ? new Ye(NaN, NaN, NaN, 0) : null;
}
function Af(e) {
  return new Ye(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function ki(e, t, n, r) {
  return r <= 0 && (e = t = n = NaN), new Ye(e, t, n, r);
}
function Bx(e) {
  return e instanceof ri || (e = Yo(e)), e ? (e = e.rgb(), new Ye(e.r, e.g, e.b, e.opacity)) : new Ye();
}
function $a(e, t, n, r) {
  return arguments.length === 1 ? Bx(e) : new Ye(e, t, n, r ?? 1);
}
function Ye(e, t, n, r) {
  this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
Xu(Ye, $a, nm(ri, {
  brighter(e) {
    return e = e == null ? vs : Math.pow(vs, e), new Ye(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? Uo : Math.pow(Uo, e), new Ye(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Ye(Hn(this.r), Hn(this.g), Hn(this.b), ws(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: Rf,
  // Deprecated! Use color.formatHex.
  formatHex: Rf,
  formatHex8: Ux,
  formatRgb: $f,
  toString: $f
}));
function Rf() {
  return `#${Ln(this.r)}${Ln(this.g)}${Ln(this.b)}`;
}
function Ux() {
  return `#${Ln(this.r)}${Ln(this.g)}${Ln(this.b)}${Ln((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function $f() {
  const e = ws(this.opacity);
  return `${e === 1 ? "rgb(" : "rgba("}${Hn(this.r)}, ${Hn(this.g)}, ${Hn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function ws(e) {
  return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function Hn(e) {
  return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function Ln(e) {
  return e = Hn(e), (e < 16 ? "0" : "") + e.toString(16);
}
function If(e, t, n, r) {
  return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new xt(e, t, n, r);
}
function rm(e) {
  if (e instanceof xt) return new xt(e.h, e.s, e.l, e.opacity);
  if (e instanceof ri || (e = Yo(e)), !e) return new xt();
  if (e instanceof xt) return e;
  e = e.rgb();
  var t = e.r / 255, n = e.g / 255, r = e.b / 255, o = Math.min(t, n, r), i = Math.max(t, n, r), s = NaN, l = i - o, a = (i + o) / 2;
  return l ? (t === i ? s = (n - r) / l + (n < r) * 6 : n === i ? s = (r - t) / l + 2 : s = (t - n) / l + 4, l /= a < 0.5 ? i + o : 2 - i - o, s *= 60) : l = a > 0 && a < 1 ? 0 : s, new xt(s, l, a, e.opacity);
}
function Wx(e, t, n, r) {
  return arguments.length === 1 ? rm(e) : new xt(e, t, n, r ?? 1);
}
function xt(e, t, n, r) {
  this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
Xu(xt, Wx, nm(ri, {
  brighter(e) {
    return e = e == null ? vs : Math.pow(vs, e), new xt(this.h, this.s, this.l * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? Uo : Math.pow(Uo, e), new xt(this.h, this.s, this.l * e, this.opacity);
  },
  rgb() {
    var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, o = 2 * n - r;
    return new Ye(
      Ml(e >= 240 ? e - 240 : e + 120, o, r),
      Ml(e, o, r),
      Ml(e < 120 ? e + 240 : e - 120, o, r),
      this.opacity
    );
  },
  clamp() {
    return new xt(Df(this.h), Ei(this.s), Ei(this.l), ws(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const e = ws(this.opacity);
    return `${e === 1 ? "hsl(" : "hsla("}${Df(this.h)}, ${Ei(this.s) * 100}%, ${Ei(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
  }
}));
function Df(e) {
  return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function Ei(e) {
  return Math.max(0, Math.min(1, e || 0));
}
function Ml(e, t, n) {
  return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
const om = (e) => () => e;
function Yx(e, t) {
  return function(n) {
    return e + n * t;
  };
}
function Xx(e, t, n) {
  return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
    return Math.pow(e + r * t, n);
  };
}
function Kx(e) {
  return (e = +e) == 1 ? im : function(t, n) {
    return n - t ? Xx(t, n, e) : om(isNaN(t) ? n : t);
  };
}
function im(e, t) {
  var n = t - e;
  return n ? Yx(e, n) : om(isNaN(e) ? t : e);
}
const Lf = function e(t) {
  var n = Kx(t);
  function r(o, i) {
    var s = n((o = $a(o)).r, (i = $a(i)).r), l = n(o.g, i.g), a = n(o.b, i.b), u = im(o.opacity, i.opacity);
    return function(c) {
      return o.r = s(c), o.g = l(c), o.b = a(c), o.opacity = u(c), o + "";
    };
  }
  return r.gamma = e, r;
}(1);
function nn(e, t) {
  return e = +e, t = +t, function(n) {
    return e * (1 - n) + t * n;
  };
}
var Ia = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Tl = new RegExp(Ia.source, "g");
function Gx(e) {
  return function() {
    return e;
  };
}
function qx(e) {
  return function(t) {
    return e(t) + "";
  };
}
function Qx(e, t) {
  var n = Ia.lastIndex = Tl.lastIndex = 0, r, o, i, s = -1, l = [], a = [];
  for (e = e + "", t = t + ""; (r = Ia.exec(e)) && (o = Tl.exec(t)); )
    (i = o.index) > n && (i = t.slice(n, i), l[s] ? l[s] += i : l[++s] = i), (r = r[0]) === (o = o[0]) ? l[s] ? l[s] += o : l[++s] = o : (l[++s] = null, a.push({ i: s, x: nn(r, o) })), n = Tl.lastIndex;
  return n < t.length && (i = t.slice(n), l[s] ? l[s] += i : l[++s] = i), l.length < 2 ? a[0] ? qx(a[0].x) : Gx(t) : (t = a.length, function(u) {
    for (var c = 0, f; c < t; ++c) l[(f = a[c]).i] = f.x(u);
    return l.join("");
  });
}
var Of = 180 / Math.PI, Da = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function sm(e, t, n, r, o, i) {
  var s, l, a;
  return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (a = e * n + t * r) && (n -= e * a, r -= t * a), (l = Math.sqrt(n * n + r * r)) && (n /= l, r /= l, a /= l), e * r < t * n && (e = -e, t = -t, a = -a, s = -s), {
    translateX: o,
    translateY: i,
    rotate: Math.atan2(t, e) * Of,
    skewX: Math.atan(a) * Of,
    scaleX: s,
    scaleY: l
  };
}
var Ni;
function Zx(e) {
  const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
  return t.isIdentity ? Da : sm(t.a, t.b, t.c, t.d, t.e, t.f);
}
function Jx(e) {
  return e == null || (Ni || (Ni = document.createElementNS("http://www.w3.org/2000/svg", "g")), Ni.setAttribute("transform", e), !(e = Ni.transform.baseVal.consolidate())) ? Da : (e = e.matrix, sm(e.a, e.b, e.c, e.d, e.e, e.f));
}
function lm(e, t, n, r) {
  function o(u) {
    return u.length ? u.pop() + " " : "";
  }
  function i(u, c, f, d, p, x) {
    if (u !== f || c !== d) {
      var y = p.push("translate(", null, t, null, n);
      x.push({ i: y - 4, x: nn(u, f) }, { i: y - 2, x: nn(c, d) });
    } else (f || d) && p.push("translate(" + f + t + d + n);
  }
  function s(u, c, f, d) {
    u !== c ? (u - c > 180 ? c += 360 : c - u > 180 && (u += 360), d.push({ i: f.push(o(f) + "rotate(", null, r) - 2, x: nn(u, c) })) : c && f.push(o(f) + "rotate(" + c + r);
  }
  function l(u, c, f, d) {
    u !== c ? d.push({ i: f.push(o(f) + "skewX(", null, r) - 2, x: nn(u, c) }) : c && f.push(o(f) + "skewX(" + c + r);
  }
  function a(u, c, f, d, p, x) {
    if (u !== f || c !== d) {
      var y = p.push(o(p) + "scale(", null, ",", null, ")");
      x.push({ i: y - 4, x: nn(u, f) }, { i: y - 2, x: nn(c, d) });
    } else (f !== 1 || d !== 1) && p.push(o(p) + "scale(" + f + "," + d + ")");
  }
  return function(u, c) {
    var f = [], d = [];
    return u = e(u), c = e(c), i(u.translateX, u.translateY, c.translateX, c.translateY, f, d), s(u.rotate, c.rotate, f, d), l(u.skewX, c.skewX, f, d), a(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, d), u = c = null, function(p) {
      for (var x = -1, y = d.length, E; ++x < y; ) f[(E = d[x]).i] = E.x(p);
      return f.join("");
    };
  };
}
var e1 = lm(Zx, "px, ", "px)", "deg)"), t1 = lm(Jx, ", ", ")", ")"), n1 = 1e-12;
function Ff(e) {
  return ((e = Math.exp(e)) + 1 / e) / 2;
}
function r1(e) {
  return ((e = Math.exp(e)) - 1 / e) / 2;
}
function o1(e) {
  return ((e = Math.exp(2 * e)) - 1) / (e + 1);
}
const i1 = function e(t, n, r) {
  function o(i, s) {
    var l = i[0], a = i[1], u = i[2], c = s[0], f = s[1], d = s[2], p = c - l, x = f - a, y = p * p + x * x, E, h;
    if (y < n1)
      h = Math.log(d / u) / t, E = function(T) {
        return [
          l + T * p,
          a + T * x,
          u * Math.exp(t * T * h)
        ];
      };
    else {
      var m = Math.sqrt(y), g = (d * d - u * u + r * y) / (2 * u * n * m), w = (d * d - u * u - r * y) / (2 * d * n * m), N = Math.log(Math.sqrt(g * g + 1) - g), P = Math.log(Math.sqrt(w * w + 1) - w);
      h = (P - N) / t, E = function(T) {
        var M = T * h, k = Ff(N), A = u / (n * m) * (k * o1(t * M + N) - r1(N));
        return [
          l + A * p,
          a + A * x,
          u * k / Ff(t * M + N)
        ];
      };
    }
    return E.duration = h * 1e3 * t / Math.SQRT2, E;
  }
  return o.rho = function(i) {
    var s = Math.max(1e-3, +i), l = s * s, a = l * l;
    return e(s, l, a);
  }, o;
}(Math.SQRT2, 2, 4);
var br = 0, ho = 0, oo = 0, am = 1e3, xs, mo, _s = 0, Kn = 0, Ys = 0, Xo = typeof performance == "object" && performance.now ? performance : Date, um = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
  setTimeout(e, 17);
};
function Ku() {
  return Kn || (um(s1), Kn = Xo.now() + Ys);
}
function s1() {
  Kn = 0;
}
function Ss() {
  this._call = this._time = this._next = null;
}
Ss.prototype = cm.prototype = {
  constructor: Ss,
  restart: function(e, t, n) {
    if (typeof e != "function") throw new TypeError("callback is not a function");
    n = (n == null ? Ku() : +n) + (t == null ? 0 : +t), !this._next && mo !== this && (mo ? mo._next = this : xs = this, mo = this), this._call = e, this._time = n, La();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, La());
  }
};
function cm(e, t, n) {
  var r = new Ss();
  return r.restart(e, t, n), r;
}
function l1() {
  Ku(), ++br;
  for (var e = xs, t; e; )
    (t = Kn - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
  --br;
}
function bf() {
  Kn = (_s = Xo.now()) + Ys, br = ho = 0;
  try {
    l1();
  } finally {
    br = 0, u1(), Kn = 0;
  }
}
function a1() {
  var e = Xo.now(), t = e - _s;
  t > am && (Ys -= t, _s = e);
}
function u1() {
  for (var e, t = xs, n, r = 1 / 0; t; )
    t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : xs = n);
  mo = e, La(r);
}
function La(e) {
  if (!br) {
    ho && (ho = clearTimeout(ho));
    var t = e - Kn;
    t > 24 ? (e < 1 / 0 && (ho = setTimeout(bf, e - Xo.now() - Ys)), oo && (oo = clearInterval(oo))) : (oo || (_s = Xo.now(), oo = setInterval(a1, am)), br = 1, um(bf));
  }
}
function Hf(e, t, n) {
  var r = new Ss();
  return t = t == null ? 0 : +t, r.restart((o) => {
    r.stop(), e(o + t);
  }, t, n), r;
}
var c1 = Us("start", "end", "cancel", "interrupt"), f1 = [], fm = 0, Vf = 1, Oa = 2, Ui = 3, Bf = 4, Fa = 5, Wi = 6;
function Xs(e, t, n, r, o, i) {
  var s = e.__transition;
  if (!s) e.__transition = {};
  else if (n in s) return;
  d1(e, n, {
    name: t,
    index: r,
    // For context during callback.
    group: o,
    // For context during callback.
    on: c1,
    tween: f1,
    time: i.time,
    delay: i.delay,
    duration: i.duration,
    ease: i.ease,
    timer: null,
    state: fm
  });
}
function Gu(e, t) {
  var n = Et(e, t);
  if (n.state > fm) throw new Error("too late; already scheduled");
  return n;
}
function At(e, t) {
  var n = Et(e, t);
  if (n.state > Ui) throw new Error("too late; already running");
  return n;
}
function Et(e, t) {
  var n = e.__transition;
  if (!n || !(n = n[t])) throw new Error("transition not found");
  return n;
}
function d1(e, t, n) {
  var r = e.__transition, o;
  r[t] = n, n.timer = cm(i, 0, n.time);
  function i(u) {
    n.state = Vf, n.timer.restart(s, n.delay, n.time), n.delay <= u && s(u - n.delay);
  }
  function s(u) {
    var c, f, d, p;
    if (n.state !== Vf) return a();
    for (c in r)
      if (p = r[c], p.name === n.name) {
        if (p.state === Ui) return Hf(s);
        p.state === Bf ? (p.state = Wi, p.timer.stop(), p.on.call("interrupt", e, e.__data__, p.index, p.group), delete r[c]) : +c < t && (p.state = Wi, p.timer.stop(), p.on.call("cancel", e, e.__data__, p.index, p.group), delete r[c]);
      }
    if (Hf(function() {
      n.state === Ui && (n.state = Bf, n.timer.restart(l, n.delay, n.time), l(u));
    }), n.state = Oa, n.on.call("start", e, e.__data__, n.index, n.group), n.state === Oa) {
      for (n.state = Ui, o = new Array(d = n.tween.length), c = 0, f = -1; c < d; ++c)
        (p = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (o[++f] = p);
      o.length = f + 1;
    }
  }
  function l(u) {
    for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(a), n.state = Fa, 1), f = -1, d = o.length; ++f < d; )
      o[f].call(e, c);
    n.state === Fa && (n.on.call("end", e, e.__data__, n.index, n.group), a());
  }
  function a() {
    n.state = Wi, n.timer.stop(), delete r[t];
    for (var u in r) return;
    delete e.__transition;
  }
}
function Yi(e, t) {
  var n = e.__transition, r, o, i = !0, s;
  if (n) {
    t = t == null ? null : t + "";
    for (s in n) {
      if ((r = n[s]).name !== t) {
        i = !1;
        continue;
      }
      o = r.state > Oa && r.state < Fa, r.state = Wi, r.timer.stop(), r.on.call(o ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[s];
    }
    i && delete e.__transition;
  }
}
function p1(e) {
  return this.each(function() {
    Yi(this, e);
  });
}
function h1(e, t) {
  var n, r;
  return function() {
    var o = At(this, e), i = o.tween;
    if (i !== n) {
      r = n = i;
      for (var s = 0, l = r.length; s < l; ++s)
        if (r[s].name === t) {
          r = r.slice(), r.splice(s, 1);
          break;
        }
    }
    o.tween = r;
  };
}
function m1(e, t, n) {
  var r, o;
  if (typeof n != "function") throw new Error();
  return function() {
    var i = At(this, e), s = i.tween;
    if (s !== r) {
      o = (r = s).slice();
      for (var l = { name: t, value: n }, a = 0, u = o.length; a < u; ++a)
        if (o[a].name === t) {
          o[a] = l;
          break;
        }
      a === u && o.push(l);
    }
    i.tween = o;
  };
}
function g1(e, t) {
  var n = this._id;
  if (e += "", arguments.length < 2) {
    for (var r = Et(this.node(), n).tween, o = 0, i = r.length, s; o < i; ++o)
      if ((s = r[o]).name === e)
        return s.value;
    return null;
  }
  return this.each((t == null ? h1 : m1)(n, e, t));
}
function qu(e, t, n) {
  var r = e._id;
  return e.each(function() {
    var o = At(this, r);
    (o.value || (o.value = {}))[t] = n.apply(this, arguments);
  }), function(o) {
    return Et(o, r).value[t];
  };
}
function dm(e, t) {
  var n;
  return (typeof t == "number" ? nn : t instanceof Yo ? Lf : (n = Yo(t)) ? (t = n, Lf) : Qx)(e, t);
}
function y1(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function v1(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function w1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttribute(e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function x1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttributeNS(e.space, e.local);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function _1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function S1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function k1(e, t) {
  var n = Ws(e), r = n === "transform" ? t1 : dm;
  return this.attrTween(e, typeof t == "function" ? (n.local ? S1 : _1)(n, r, qu(this, "attr." + e, t)) : t == null ? (n.local ? v1 : y1)(n) : (n.local ? x1 : w1)(n, r, t));
}
function E1(e, t) {
  return function(n) {
    this.setAttribute(e, t.call(this, n));
  };
}
function N1(e, t) {
  return function(n) {
    this.setAttributeNS(e.space, e.local, t.call(this, n));
  };
}
function C1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && N1(e, i)), n;
  }
  return o._value = t, o;
}
function z1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && E1(e, i)), n;
  }
  return o._value = t, o;
}
function P1(e, t) {
  var n = "attr." + e;
  if (arguments.length < 2) return (n = this.tween(n)) && n._value;
  if (t == null) return this.tween(n, null);
  if (typeof t != "function") throw new Error();
  var r = Ws(e);
  return this.tween(n, (r.local ? C1 : z1)(r, t));
}
function M1(e, t) {
  return function() {
    Gu(this, e).delay = +t.apply(this, arguments);
  };
}
function T1(e, t) {
  return t = +t, function() {
    Gu(this, e).delay = t;
  };
}
function j1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? M1 : T1)(t, e)) : Et(this.node(), t).delay;
}
function A1(e, t) {
  return function() {
    At(this, e).duration = +t.apply(this, arguments);
  };
}
function R1(e, t) {
  return t = +t, function() {
    At(this, e).duration = t;
  };
}
function $1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? A1 : R1)(t, e)) : Et(this.node(), t).duration;
}
function I1(e, t) {
  if (typeof t != "function") throw new Error();
  return function() {
    At(this, e).ease = t;
  };
}
function D1(e) {
  var t = this._id;
  return arguments.length ? this.each(I1(t, e)) : Et(this.node(), t).ease;
}
function L1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    if (typeof n != "function") throw new Error();
    At(this, e).ease = n;
  };
}
function O1(e) {
  if (typeof e != "function") throw new Error();
  return this.each(L1(this._id, e));
}
function F1(e) {
  typeof e != "function" && (e = Uh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new Kt(r, this._parents, this._name, this._id);
}
function b1(e) {
  if (e._id !== this._id) throw new Error();
  for (var t = this._groups, n = e._groups, r = t.length, o = n.length, i = Math.min(r, o), s = new Array(r), l = 0; l < i; ++l)
    for (var a = t[l], u = n[l], c = a.length, f = s[l] = new Array(c), d, p = 0; p < c; ++p)
      (d = a[p] || u[p]) && (f[p] = d);
  for (; l < r; ++l)
    s[l] = t[l];
  return new Kt(s, this._parents, this._name, this._id);
}
function H1(e) {
  return (e + "").trim().split(/^|\s+/).every(function(t) {
    var n = t.indexOf(".");
    return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
  });
}
function V1(e, t, n) {
  var r, o, i = H1(t) ? Gu : At;
  return function() {
    var s = i(this, e), l = s.on;
    l !== r && (o = (r = l).copy()).on(t, n), s.on = o;
  };
}
function B1(e, t) {
  var n = this._id;
  return arguments.length < 2 ? Et(this.node(), n).on.on(e) : this.each(V1(n, e, t));
}
function U1(e) {
  return function() {
    var t = this.parentNode;
    for (var n in this.__transition) if (+n !== e) return;
    t && t.removeChild(this);
  };
}
function W1() {
  return this.on("end.remove", U1(this._id));
}
function Y1(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = Wu(e));
  for (var r = this._groups, o = r.length, i = new Array(o), s = 0; s < o; ++s)
    for (var l = r[s], a = l.length, u = i[s] = new Array(a), c, f, d = 0; d < a; ++d)
      (c = l[d]) && (f = e.call(c, c.__data__, d, l)) && ("__data__" in c && (f.__data__ = c.__data__), u[d] = f, Xs(u[d], t, n, d, u, Et(c, n)));
  return new Kt(i, this._parents, t, n);
}
function X1(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = Bh(e));
  for (var r = this._groups, o = r.length, i = [], s = [], l = 0; l < o; ++l)
    for (var a = r[l], u = a.length, c, f = 0; f < u; ++f)
      if (c = a[f]) {
        for (var d = e.call(c, c.__data__, f, a), p, x = Et(c, n), y = 0, E = d.length; y < E; ++y)
          (p = d[y]) && Xs(p, t, n, y, d, x);
        i.push(d), s.push(c);
      }
  return new Kt(i, s, t, n);
}
var K1 = ni.prototype.constructor;
function G1() {
  return new K1(this._groups, this._parents);
}
function q1(e, t) {
  var n, r, o;
  return function() {
    var i = Fr(this, e), s = (this.style.removeProperty(e), Fr(this, e));
    return i === s ? null : i === n && s === r ? o : o = t(n = i, r = s);
  };
}
function pm(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function Q1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = Fr(this, e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function Z1(e, t, n) {
  var r, o, i;
  return function() {
    var s = Fr(this, e), l = n(this), a = l + "";
    return l == null && (a = l = (this.style.removeProperty(e), Fr(this, e))), s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l));
  };
}
function J1(e, t) {
  var n, r, o, i = "style." + t, s = "end." + i, l;
  return function() {
    var a = At(this, e), u = a.on, c = a.value[i] == null ? l || (l = pm(t)) : void 0;
    (u !== n || o !== c) && (r = (n = u).copy()).on(s, o = c), a.on = r;
  };
}
function e_(e, t, n) {
  var r = (e += "") == "transform" ? e1 : dm;
  return t == null ? this.styleTween(e, q1(e, r)).on("end.style." + e, pm(e)) : typeof t == "function" ? this.styleTween(e, Z1(e, r, qu(this, "style." + e, t))).each(J1(this._id, e)) : this.styleTween(e, Q1(e, r, t), n).on("end.style." + e, null);
}
function t_(e, t, n) {
  return function(r) {
    this.style.setProperty(e, t.call(this, r), n);
  };
}
function n_(e, t, n) {
  var r, o;
  function i() {
    var s = t.apply(this, arguments);
    return s !== o && (r = (o = s) && t_(e, s, n)), r;
  }
  return i._value = t, i;
}
function r_(e, t, n) {
  var r = "style." + (e += "");
  if (arguments.length < 2) return (r = this.tween(r)) && r._value;
  if (t == null) return this.tween(r, null);
  if (typeof t != "function") throw new Error();
  return this.tween(r, n_(e, t, n ?? ""));
}
function o_(e) {
  return function() {
    this.textContent = e;
  };
}
function i_(e) {
  return function() {
    var t = e(this);
    this.textContent = t ?? "";
  };
}
function s_(e) {
  return this.tween("text", typeof e == "function" ? i_(qu(this, "text", e)) : o_(e == null ? "" : e + ""));
}
function l_(e) {
  return function(t) {
    this.textContent = e.call(this, t);
  };
}
function a_(e) {
  var t, n;
  function r() {
    var o = e.apply(this, arguments);
    return o !== n && (t = (n = o) && l_(o)), t;
  }
  return r._value = e, r;
}
function u_(e) {
  var t = "text";
  if (arguments.length < 1) return (t = this.tween(t)) && t._value;
  if (e == null) return this.tween(t, null);
  if (typeof e != "function") throw new Error();
  return this.tween(t, a_(e));
}
function c_() {
  for (var e = this._name, t = this._id, n = hm(), r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      if (a = s[u]) {
        var c = Et(a, t);
        Xs(a, e, n, u, s, {
          time: c.time + c.delay + c.duration,
          delay: 0,
          duration: c.duration,
          ease: c.ease
        });
      }
  return new Kt(r, this._parents, e, n);
}
function f_() {
  var e, t, n = this, r = n._id, o = n.size();
  return new Promise(function(i, s) {
    var l = { value: s }, a = { value: function() {
      --o === 0 && i();
    } };
    n.each(function() {
      var u = At(this, r), c = u.on;
      c !== e && (t = (e = c).copy(), t._.cancel.push(l), t._.interrupt.push(l), t._.end.push(a)), u.on = t;
    }), o === 0 && i();
  });
}
var d_ = 0;
function Kt(e, t, n, r) {
  this._groups = e, this._parents = t, this._name = n, this._id = r;
}
function hm() {
  return ++d_;
}
var Dt = ni.prototype;
Kt.prototype = {
  constructor: Kt,
  select: Y1,
  selectAll: X1,
  selectChild: Dt.selectChild,
  selectChildren: Dt.selectChildren,
  filter: F1,
  merge: b1,
  selection: G1,
  transition: c_,
  call: Dt.call,
  nodes: Dt.nodes,
  node: Dt.node,
  size: Dt.size,
  empty: Dt.empty,
  each: Dt.each,
  on: B1,
  attr: k1,
  attrTween: P1,
  style: e_,
  styleTween: r_,
  text: s_,
  textTween: u_,
  remove: W1,
  tween: g1,
  delay: j1,
  duration: $1,
  ease: D1,
  easeVarying: O1,
  end: f_,
  [Symbol.iterator]: Dt[Symbol.iterator]
};
function p_(e) {
  return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
}
var h_ = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: p_
};
function m_(e, t) {
  for (var n; !(n = e.__transition) || !(n = n[t]); )
    if (!(e = e.parentNode))
      throw new Error(`transition ${t} not found`);
  return n;
}
function g_(e) {
  var t, n;
  e instanceof Kt ? (t = e._id, e = e._name) : (t = hm(), (n = h_).time = Ku(), e = e == null ? null : e + "");
  for (var r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && Xs(a, e, t, u, s, n || m_(a, t));
  return new Kt(r, this._parents, e, t);
}
ni.prototype.interrupt = p1;
ni.prototype.transition = g_;
const Ci = (e) => () => e;
function y_(e, {
  sourceEvent: t,
  target: n,
  transform: r,
  dispatch: o
}) {
  Object.defineProperties(this, {
    type: { value: e, enumerable: !0, configurable: !0 },
    sourceEvent: { value: t, enumerable: !0, configurable: !0 },
    target: { value: n, enumerable: !0, configurable: !0 },
    transform: { value: r, enumerable: !0, configurable: !0 },
    _: { value: o }
  });
}
function Ht(e, t, n) {
  this.k = e, this.x = t, this.y = n;
}
Ht.prototype = {
  constructor: Ht,
  scale: function(e) {
    return e === 1 ? this : new Ht(this.k * e, this.x, this.y);
  },
  translate: function(e, t) {
    return e === 0 & t === 0 ? this : new Ht(this.k, this.x + this.k * e, this.y + this.k * t);
  },
  apply: function(e) {
    return [e[0] * this.k + this.x, e[1] * this.k + this.y];
  },
  applyX: function(e) {
    return e * this.k + this.x;
  },
  applyY: function(e) {
    return e * this.k + this.y;
  },
  invert: function(e) {
    return [(e[0] - this.x) / this.k, (e[1] - this.y) / this.k];
  },
  invertX: function(e) {
    return (e - this.x) / this.k;
  },
  invertY: function(e) {
    return (e - this.y) / this.k;
  },
  rescaleX: function(e) {
    return e.copy().domain(e.range().map(this.invertX, this).map(e.invert, e));
  },
  rescaleY: function(e) {
    return e.copy().domain(e.range().map(this.invertY, this).map(e.invert, e));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};
var Bt = new Ht(1, 0, 0);
Ht.prototype;
function jl(e) {
  e.stopImmediatePropagation();
}
function io(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function v_(e) {
  return (!e.ctrlKey || e.type === "wheel") && !e.button;
}
function w_() {
  var e = this;
  return e instanceof SVGElement ? (e = e.ownerSVGElement || e, e.hasAttribute("viewBox") ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]]) : [[0, 0], [e.clientWidth, e.clientHeight]];
}
function Uf() {
  return this.__zoom || Bt;
}
function x_(e) {
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * (e.ctrlKey ? 10 : 1);
}
function __() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function S_(e, t, n) {
  var r = e.invertX(t[0][0]) - n[0][0], o = e.invertX(t[1][0]) - n[1][0], i = e.invertY(t[0][1]) - n[0][1], s = e.invertY(t[1][1]) - n[1][1];
  return e.translate(
    o > r ? (r + o) / 2 : Math.min(0, r) || Math.max(0, o),
    s > i ? (i + s) / 2 : Math.min(0, i) || Math.max(0, s)
  );
}
function mm() {
  var e = v_, t = w_, n = S_, r = x_, o = __, i = [0, 1 / 0], s = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]], l = 250, a = i1, u = Us("start", "zoom", "end"), c, f, d, p = 500, x = 150, y = 0, E = 10;
  function h(_) {
    _.property("__zoom", Uf).on("wheel.zoom", M, { passive: !1 }).on("mousedown.zoom", k).on("dblclick.zoom", A).filter(o).on("touchstart.zoom", F).on("touchmove.zoom", O).on("touchend.zoom touchcancel.zoom", H).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  h.transform = function(_, $, z, L) {
    var j = _.selection ? _.selection() : _;
    j.property("__zoom", Uf), _ !== j ? N(_, $, z, L) : j.interrupt().each(function() {
      P(this, arguments).event(L).start().zoom(null, typeof $ == "function" ? $.apply(this, arguments) : $).end();
    });
  }, h.scaleBy = function(_, $, z, L) {
    h.scaleTo(_, function() {
      var j = this.__zoom.k, S = typeof $ == "function" ? $.apply(this, arguments) : $;
      return j * S;
    }, z, L);
  }, h.scaleTo = function(_, $, z, L) {
    h.transform(_, function() {
      var j = t.apply(this, arguments), S = this.__zoom, R = z == null ? w(j) : typeof z == "function" ? z.apply(this, arguments) : z, D = S.invert(R), b = typeof $ == "function" ? $.apply(this, arguments) : $;
      return n(g(m(S, b), R, D), j, s);
    }, z, L);
  }, h.translateBy = function(_, $, z, L) {
    h.transform(_, function() {
      return n(this.__zoom.translate(
        typeof $ == "function" ? $.apply(this, arguments) : $,
        typeof z == "function" ? z.apply(this, arguments) : z
      ), t.apply(this, arguments), s);
    }, null, L);
  }, h.translateTo = function(_, $, z, L, j) {
    h.transform(_, function() {
      var S = t.apply(this, arguments), R = this.__zoom, D = L == null ? w(S) : typeof L == "function" ? L.apply(this, arguments) : L;
      return n(Bt.translate(D[0], D[1]).scale(R.k).translate(
        typeof $ == "function" ? -$.apply(this, arguments) : -$,
        typeof z == "function" ? -z.apply(this, arguments) : -z
      ), S, s);
    }, L, j);
  };
  function m(_, $) {
    return $ = Math.max(i[0], Math.min(i[1], $)), $ === _.k ? _ : new Ht($, _.x, _.y);
  }
  function g(_, $, z) {
    var L = $[0] - z[0] * _.k, j = $[1] - z[1] * _.k;
    return L === _.x && j === _.y ? _ : new Ht(_.k, L, j);
  }
  function w(_) {
    return [(+_[0][0] + +_[1][0]) / 2, (+_[0][1] + +_[1][1]) / 2];
  }
  function N(_, $, z, L) {
    _.on("start.zoom", function() {
      P(this, arguments).event(L).start();
    }).on("interrupt.zoom end.zoom", function() {
      P(this, arguments).event(L).end();
    }).tween("zoom", function() {
      var j = this, S = arguments, R = P(j, S).event(L), D = t.apply(j, S), b = z == null ? w(D) : typeof z == "function" ? z.apply(j, S) : z, B = Math.max(D[1][0] - D[0][0], D[1][1] - D[0][1]), U = j.__zoom, Y = typeof $ == "function" ? $.apply(j, S) : $, q = a(U.invert(b).concat(B / U.k), Y.invert(b).concat(B / Y.k));
      return function(Q) {
        if (Q === 1) Q = Y;
        else {
          var re = q(Q), ne = B / re[2];
          Q = new Ht(ne, b[0] - re[0] * ne, b[1] - re[1] * ne);
        }
        R.zoom(null, Q);
      };
    });
  }
  function P(_, $, z) {
    return !z && _.__zooming || new T(_, $);
  }
  function T(_, $) {
    this.that = _, this.args = $, this.active = 0, this.sourceEvent = null, this.extent = t.apply(_, $), this.taps = 0;
  }
  T.prototype = {
    event: function(_) {
      return _ && (this.sourceEvent = _), this;
    },
    start: function() {
      return ++this.active === 1 && (this.that.__zooming = this, this.emit("start")), this;
    },
    zoom: function(_, $) {
      return this.mouse && _ !== "mouse" && (this.mouse[1] = $.invert(this.mouse[0])), this.touch0 && _ !== "touch" && (this.touch0[1] = $.invert(this.touch0[0])), this.touch1 && _ !== "touch" && (this.touch1[1] = $.invert(this.touch1[0])), this.that.__zoom = $, this.emit("zoom"), this;
    },
    end: function() {
      return --this.active === 0 && (delete this.that.__zooming, this.emit("end")), this;
    },
    emit: function(_) {
      var $ = st(this.that).datum();
      u.call(
        _,
        this.that,
        new y_(_, {
          sourceEvent: this.sourceEvent,
          target: h,
          transform: this.that.__zoom,
          dispatch: u
        }),
        $
      );
    }
  };
  function M(_, ...$) {
    if (!e.apply(this, arguments)) return;
    var z = P(this, $).event(_), L = this.__zoom, j = Math.max(i[0], Math.min(i[1], L.k * Math.pow(2, r.apply(this, arguments)))), S = vt(_);
    if (z.wheel)
      (z.mouse[0][0] !== S[0] || z.mouse[0][1] !== S[1]) && (z.mouse[1] = L.invert(z.mouse[0] = S)), clearTimeout(z.wheel);
    else {
      if (L.k === j) return;
      z.mouse = [S, L.invert(S)], Yi(this), z.start();
    }
    io(_), z.wheel = setTimeout(R, x), z.zoom("mouse", n(g(m(L, j), z.mouse[0], z.mouse[1]), z.extent, s));
    function R() {
      z.wheel = null, z.end();
    }
  }
  function k(_, ...$) {
    if (d || !e.apply(this, arguments)) return;
    var z = _.currentTarget, L = P(this, $, !0).event(_), j = st(_.view).on("mousemove.zoom", b, !0).on("mouseup.zoom", B, !0), S = vt(_, z), R = _.clientX, D = _.clientY;
    em(_.view), jl(_), L.mouse = [S, this.__zoom.invert(S)], Yi(this), L.start();
    function b(U) {
      if (io(U), !L.moved) {
        var Y = U.clientX - R, q = U.clientY - D;
        L.moved = Y * Y + q * q > y;
      }
      L.event(U).zoom("mouse", n(g(L.that.__zoom, L.mouse[0] = vt(U, z), L.mouse[1]), L.extent, s));
    }
    function B(U) {
      j.on("mousemove.zoom mouseup.zoom", null), tm(U.view, L.moved), io(U), L.event(U).end();
    }
  }
  function A(_, ...$) {
    if (e.apply(this, arguments)) {
      var z = this.__zoom, L = vt(_.changedTouches ? _.changedTouches[0] : _, this), j = z.invert(L), S = z.k * (_.shiftKey ? 0.5 : 2), R = n(g(m(z, S), L, j), t.apply(this, $), s);
      io(_), l > 0 ? st(this).transition().duration(l).call(N, R, L, _) : st(this).call(h.transform, R, L, _);
    }
  }
  function F(_, ...$) {
    if (e.apply(this, arguments)) {
      var z = _.touches, L = z.length, j = P(this, $, _.changedTouches.length === L).event(_), S, R, D, b;
      for (jl(_), R = 0; R < L; ++R)
        D = z[R], b = vt(D, this), b = [b, this.__zoom.invert(b), D.identifier], j.touch0 ? !j.touch1 && j.touch0[2] !== b[2] && (j.touch1 = b, j.taps = 0) : (j.touch0 = b, S = !0, j.taps = 1 + !!c);
      c && (c = clearTimeout(c)), S && (j.taps < 2 && (f = b[0], c = setTimeout(function() {
        c = null;
      }, p)), Yi(this), j.start());
    }
  }
  function O(_, ...$) {
    if (this.__zooming) {
      var z = P(this, $).event(_), L = _.changedTouches, j = L.length, S, R, D, b;
      for (io(_), S = 0; S < j; ++S)
        R = L[S], D = vt(R, this), z.touch0 && z.touch0[2] === R.identifier ? z.touch0[0] = D : z.touch1 && z.touch1[2] === R.identifier && (z.touch1[0] = D);
      if (R = z.that.__zoom, z.touch1) {
        var B = z.touch0[0], U = z.touch0[1], Y = z.touch1[0], q = z.touch1[1], Q = (Q = Y[0] - B[0]) * Q + (Q = Y[1] - B[1]) * Q, re = (re = q[0] - U[0]) * re + (re = q[1] - U[1]) * re;
        R = m(R, Math.sqrt(Q / re)), D = [(B[0] + Y[0]) / 2, (B[1] + Y[1]) / 2], b = [(U[0] + q[0]) / 2, (U[1] + q[1]) / 2];
      } else if (z.touch0) D = z.touch0[0], b = z.touch0[1];
      else return;
      z.zoom("touch", n(g(R, D, b), z.extent, s));
    }
  }
  function H(_, ...$) {
    if (this.__zooming) {
      var z = P(this, $).event(_), L = _.changedTouches, j = L.length, S, R;
      for (jl(_), d && clearTimeout(d), d = setTimeout(function() {
        d = null;
      }, p), S = 0; S < j; ++S)
        R = L[S], z.touch0 && z.touch0[2] === R.identifier ? delete z.touch0 : z.touch1 && z.touch1[2] === R.identifier && delete z.touch1;
      if (z.touch1 && !z.touch0 && (z.touch0 = z.touch1, delete z.touch1), z.touch0) z.touch0[1] = this.__zoom.invert(z.touch0[0]);
      else if (z.end(), z.taps === 2 && (R = vt(R, this), Math.hypot(f[0] - R[0], f[1] - R[1]) < E)) {
        var D = st(this).on("dblclick.zoom");
        D && D.apply(this, arguments);
      }
    }
  }
  return h.wheelDelta = function(_) {
    return arguments.length ? (r = typeof _ == "function" ? _ : Ci(+_), h) : r;
  }, h.filter = function(_) {
    return arguments.length ? (e = typeof _ == "function" ? _ : Ci(!!_), h) : e;
  }, h.touchable = function(_) {
    return arguments.length ? (o = typeof _ == "function" ? _ : Ci(!!_), h) : o;
  }, h.extent = function(_) {
    return arguments.length ? (t = typeof _ == "function" ? _ : Ci([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), h) : t;
  }, h.scaleExtent = function(_) {
    return arguments.length ? (i[0] = +_[0], i[1] = +_[1], h) : [i[0], i[1]];
  }, h.translateExtent = function(_) {
    return arguments.length ? (s[0][0] = +_[0][0], s[1][0] = +_[1][0], s[0][1] = +_[0][1], s[1][1] = +_[1][1], h) : [[s[0][0], s[0][1]], [s[1][0], s[1][1]]];
  }, h.constrain = function(_) {
    return arguments.length ? (n = _, h) : n;
  }, h.duration = function(_) {
    return arguments.length ? (l = +_, h) : l;
  }, h.interpolate = function(_) {
    return arguments.length ? (a = _, h) : a;
  }, h.on = function() {
    var _ = u.on.apply(u, arguments);
    return _ === u ? h : _;
  }, h.clickDistance = function(_) {
    return arguments.length ? (y = (_ = +_) * _, h) : Math.sqrt(y);
  }, h.tapDistance = function(_) {
    return arguments.length ? (E = +_, h) : E;
  }, h;
}
const Ks = C.createContext(null), k_ = Ks.Provider, Gt = {
  error001: () => "[React Flow]: Seems like you have not used zustand provider as an ancestor. Help: https://reactflow.dev/error#001",
  error002: () => "It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.",
  error003: (e) => `Node type "${e}" not found. Using fallback type "default".`,
  error004: () => "The React Flow parent container needs a width and a height to render the graph.",
  error005: () => "Only child nodes can use a parent extent.",
  error006: () => "Can't create edge. An edge needs a source and a target.",
  error007: (e) => `The old edge with id=${e} does not exist.`,
  error009: (e) => `Marker type "${e}" doesn't exist.`,
  error008: (e, t) => `Couldn't create edge for ${e ? "target" : "source"} handle id: "${e ? t.targetHandle : t.sourceHandle}", edge id: ${t.id}.`,
  error010: () => "Handle: No node id found. Make sure to only use a Handle inside a custom Node.",
  error011: (e) => `Edge type "${e}" not found. Using fallback type "default".`,
  error012: (e) => `Node with id "${e}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`
}, gm = Gt.error001();
function le(e, t) {
  const n = C.useContext(Ks);
  if (n === null)
    throw new Error(gm);
  return Hh(n, e, t);
}
const ke = () => {
  const e = C.useContext(Ks);
  if (e === null)
    throw new Error(gm);
  return C.useMemo(() => ({
    getState: e.getState,
    setState: e.setState,
    subscribe: e.subscribe,
    destroy: e.destroy
  }), [e]);
}, E_ = (e) => e.userSelectionActive ? "none" : "all";
function Qu({ position: e, children: t, className: n, style: r, ...o }) {
  const i = le(E_), s = `${e}`.split("-");
  return I.createElement("div", { className: je(["react-flow__panel", n, ...s]), style: { ...r, pointerEvents: i }, ...o }, t);
}
function N_({ proOptions: e, position: t = "bottom-right" }) {
  return e != null && e.hideAttribution ? null : I.createElement(
    Qu,
    { position: t, className: "react-flow__attribution", "data-message": "Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/pro" },
    I.createElement("a", { href: "https://reactflow.dev", target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution" }, "React Flow")
  );
}
const C_ = ({ x: e, y: t, label: n, labelStyle: r = {}, labelShowBg: o = !0, labelBgStyle: i = {}, labelBgPadding: s = [2, 4], labelBgBorderRadius: l = 2, children: a, className: u, ...c }) => {
  const f = C.useRef(null), [d, p] = C.useState({ x: 0, y: 0, width: 0, height: 0 }), x = je(["react-flow__edge-textwrapper", u]);
  return C.useEffect(() => {
    if (f.current) {
      const y = f.current.getBBox();
      p({
        x: y.x,
        y: y.y,
        width: y.width,
        height: y.height
      });
    }
  }, [n]), typeof n > "u" || !n ? null : I.createElement(
    "g",
    { transform: `translate(${e - d.width / 2} ${t - d.height / 2})`, className: x, visibility: d.width ? "visible" : "hidden", ...c },
    o && I.createElement("rect", { width: d.width + 2 * s[0], x: -s[0], y: -s[1], height: d.height + 2 * s[1], className: "react-flow__edge-textbg", style: i, rx: l, ry: l }),
    I.createElement("text", { className: "react-flow__edge-text", y: d.height / 2, dy: "0.3em", ref: f, style: r }, n),
    a
  );
};
var z_ = C.memo(C_);
const Zu = (e) => ({
  width: e.offsetWidth,
  height: e.offsetHeight
}), Hr = (e, t = 0, n = 1) => Math.min(Math.max(e, t), n), Ju = (e = { x: 0, y: 0 }, t) => ({
  x: Hr(e.x, t[0][0], t[1][0]),
  y: Hr(e.y, t[0][1], t[1][1])
}), Wf = (e, t, n) => e < t ? Hr(Math.abs(e - t), 1, 50) / 50 : e > n ? -Hr(Math.abs(e - n), 1, 50) / 50 : 0, ym = (e, t) => {
  const n = Wf(e.x, 35, t.width - 35) * 20, r = Wf(e.y, 35, t.height - 35) * 20;
  return [n, r];
}, vm = (e) => {
  var t;
  return ((t = e.getRootNode) == null ? void 0 : t.call(e)) || (window == null ? void 0 : window.document);
}, wm = (e, t) => ({
  x: Math.min(e.x, t.x),
  y: Math.min(e.y, t.y),
  x2: Math.max(e.x2, t.x2),
  y2: Math.max(e.y2, t.y2)
}), Ko = ({ x: e, y: t, width: n, height: r }) => ({
  x: e,
  y: t,
  x2: e + n,
  y2: t + r
}), xm = ({ x: e, y: t, x2: n, y2: r }) => ({
  x: e,
  y: t,
  width: n - e,
  height: r - t
}), Yf = (e) => ({
  ...e.positionAbsolute || { x: 0, y: 0 },
  width: e.width || 0,
  height: e.height || 0
}), P_ = (e, t) => xm(wm(Ko(e), Ko(t))), ba = (e, t) => {
  const n = Math.max(0, Math.min(e.x + e.width, t.x + t.width) - Math.max(e.x, t.x)), r = Math.max(0, Math.min(e.y + e.height, t.y + t.height) - Math.max(e.y, t.y));
  return Math.ceil(n * r);
}, M_ = (e) => at(e.width) && at(e.height) && at(e.x) && at(e.y), at = (e) => !isNaN(e) && isFinite(e), me = Symbol.for("internals"), _m = ["Enter", " ", "Escape"], T_ = (e, t) => {
}, j_ = (e) => "nativeEvent" in e;
function Ha(e) {
  var o, i;
  const t = j_(e) ? e.nativeEvent : e, n = ((i = (o = t.composedPath) == null ? void 0 : o.call(t)) == null ? void 0 : i[0]) || e.target;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(n == null ? void 0 : n.nodeName) || (n == null ? void 0 : n.hasAttribute("contenteditable")) || !!(n != null && n.closest(".nokey"));
}
const Sm = (e) => "clientX" in e, wn = (e, t) => {
  var i, s;
  const n = Sm(e), r = n ? e.clientX : (i = e.touches) == null ? void 0 : i[0].clientX, o = n ? e.clientY : (s = e.touches) == null ? void 0 : s[0].clientY;
  return {
    x: r - ((t == null ? void 0 : t.left) ?? 0),
    y: o - ((t == null ? void 0 : t.top) ?? 0)
  };
}, ks = () => {
  var e;
  return typeof navigator < "u" && ((e = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : e.indexOf("Mac")) >= 0;
}, oi = ({ id: e, path: t, labelX: n, labelY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p = 20 }) => I.createElement(
  I.Fragment,
  null,
  I.createElement("path", { id: e, style: c, d: t, fill: "none", className: "react-flow__edge-path", markerEnd: f, markerStart: d }),
  p && I.createElement("path", { d: t, fill: "none", strokeOpacity: 0, strokeWidth: p, className: "react-flow__edge-interaction" }),
  o && at(n) && at(r) ? I.createElement(z_, { x: n, y: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u }) : null
);
oi.displayName = "BaseEdge";
function so(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().edges.find((i) => i.id === e);
    o && n(r, { ...o });
  };
}
function km({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const o = Math.abs(n - e) / 2, i = n < e ? n + o : n - o, s = Math.abs(r - t) / 2, l = r < t ? r + s : r - s;
  return [i, l, o, s];
}
function Em({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourceControlX: o, sourceControlY: i, targetControlX: s, targetControlY: l }) {
  const a = e * 0.125 + o * 0.375 + s * 0.375 + n * 0.125, u = t * 0.125 + i * 0.375 + l * 0.375 + r * 0.125, c = Math.abs(a - e), f = Math.abs(u - t);
  return [a, u, c, f];
}
var Gn;
(function(e) {
  e.Strict = "strict", e.Loose = "loose";
})(Gn || (Gn = {}));
var On;
(function(e) {
  e.Free = "free", e.Vertical = "vertical", e.Horizontal = "horizontal";
})(On || (On = {}));
var Go;
(function(e) {
  e.Partial = "partial", e.Full = "full";
})(Go || (Go = {}));
var ln;
(function(e) {
  e.Bezier = "default", e.Straight = "straight", e.Step = "step", e.SmoothStep = "smoothstep", e.SimpleBezier = "simplebezier";
})(ln || (ln = {}));
var Es;
(function(e) {
  e.Arrow = "arrow", e.ArrowClosed = "arrowclosed";
})(Es || (Es = {}));
var K;
(function(e) {
  e.Left = "left", e.Top = "top", e.Right = "right", e.Bottom = "bottom";
})(K || (K = {}));
function Xf({ pos: e, x1: t, y1: n, x2: r, y2: o }) {
  return e === K.Left || e === K.Right ? [0.5 * (t + r), n] : [t, 0.5 * (n + o)];
}
function Nm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top }) {
  const [s, l] = Xf({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o
  }), [a, u] = Xf({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t
  }), [c, f, d, p] = Em({
    sourceX: e,
    sourceY: t,
    targetX: r,
    targetY: o,
    sourceControlX: s,
    sourceControlY: l,
    targetControlX: a,
    targetControlY: u
  });
  return [
    `M${e},${t} C${s},${l} ${a},${u} ${r},${o}`,
    c,
    f,
    d,
    p
  ];
}
const ec = C.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: y }) => {
  const [E, h, m] = Nm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i
  });
  return I.createElement(oi, { path: E, labelX: h, labelY: m, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: y });
});
ec.displayName = "SimpleBezierEdge";
const Kf = {
  [K.Left]: { x: -1, y: 0 },
  [K.Right]: { x: 1, y: 0 },
  [K.Top]: { x: 0, y: -1 },
  [K.Bottom]: { x: 0, y: 1 }
}, A_ = ({ source: e, sourcePosition: t = K.Bottom, target: n }) => t === K.Left || t === K.Right ? e.x < n.x ? { x: 1, y: 0 } : { x: -1, y: 0 } : e.y < n.y ? { x: 0, y: 1 } : { x: 0, y: -1 }, Gf = (e, t) => Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
function R_({ source: e, sourcePosition: t = K.Bottom, target: n, targetPosition: r = K.Top, center: o, offset: i }) {
  const s = Kf[t], l = Kf[r], a = { x: e.x + s.x * i, y: e.y + s.y * i }, u = { x: n.x + l.x * i, y: n.y + l.y * i }, c = A_({
    source: a,
    sourcePosition: t,
    target: u
  }), f = c.x !== 0 ? "x" : "y", d = c[f];
  let p = [], x, y;
  const E = { x: 0, y: 0 }, h = { x: 0, y: 0 }, [m, g, w, N] = km({
    sourceX: e.x,
    sourceY: e.y,
    targetX: n.x,
    targetY: n.y
  });
  if (s[f] * l[f] === -1) {
    x = o.x ?? m, y = o.y ?? g;
    const T = [
      { x, y: a.y },
      { x, y: u.y }
    ], M = [
      { x: a.x, y },
      { x: u.x, y }
    ];
    s[f] === d ? p = f === "x" ? T : M : p = f === "x" ? M : T;
  } else {
    const T = [{ x: a.x, y: u.y }], M = [{ x: u.x, y: a.y }];
    if (f === "x" ? p = s.x === d ? M : T : p = s.y === d ? T : M, t === r) {
      const H = Math.abs(e[f] - n[f]);
      if (H <= i) {
        const _ = Math.min(i - 1, i - H);
        s[f] === d ? E[f] = (a[f] > e[f] ? -1 : 1) * _ : h[f] = (u[f] > n[f] ? -1 : 1) * _;
      }
    }
    if (t !== r) {
      const H = f === "x" ? "y" : "x", _ = s[f] === l[H], $ = a[H] > u[H], z = a[H] < u[H];
      (s[f] === 1 && (!_ && $ || _ && z) || s[f] !== 1 && (!_ && z || _ && $)) && (p = f === "x" ? T : M);
    }
    const k = { x: a.x + E.x, y: a.y + E.y }, A = { x: u.x + h.x, y: u.y + h.y }, F = Math.max(Math.abs(k.x - p[0].x), Math.abs(A.x - p[0].x)), O = Math.max(Math.abs(k.y - p[0].y), Math.abs(A.y - p[0].y));
    F >= O ? (x = (k.x + A.x) / 2, y = p[0].y) : (x = p[0].x, y = (k.y + A.y) / 2);
  }
  return [[
    e,
    { x: a.x + E.x, y: a.y + E.y },
    ...p,
    { x: u.x + h.x, y: u.y + h.y },
    n
  ], x, y, w, N];
}
function $_(e, t, n, r) {
  const o = Math.min(Gf(e, t) / 2, Gf(t, n) / 2, r), { x: i, y: s } = t;
  if (e.x === i && i === n.x || e.y === s && s === n.y)
    return `L${i} ${s}`;
  if (e.y === s) {
    const u = e.x < n.x ? -1 : 1, c = e.y < n.y ? 1 : -1;
    return `L ${i + o * u},${s}Q ${i},${s} ${i},${s + o * c}`;
  }
  const l = e.x < n.x ? 1 : -1, a = e.y < n.y ? -1 : 1;
  return `L ${i},${s + o * a}Q ${i},${s} ${i + o * l},${s}`;
}
function Va({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, borderRadius: s = 5, centerX: l, centerY: a, offset: u = 20 }) {
  const [c, f, d, p, x] = R_({
    source: { x: e, y: t },
    sourcePosition: n,
    target: { x: r, y: o },
    targetPosition: i,
    center: { x: l, y: a },
    offset: u
  });
  return [c.reduce((E, h, m) => {
    let g = "";
    return m > 0 && m < c.length - 1 ? g = $_(c[m - 1], h, c[m + 1], s) : g = `${m === 0 ? "M" : "L"}${h.x} ${h.y}`, E += g, E;
  }, ""), f, d, p, x];
}
const Gs = C.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, sourcePosition: f = K.Bottom, targetPosition: d = K.Top, markerEnd: p, markerStart: x, pathOptions: y, interactionWidth: E }) => {
  const [h, m, g] = Va({
    sourceX: e,
    sourceY: t,
    sourcePosition: f,
    targetX: n,
    targetY: r,
    targetPosition: d,
    borderRadius: y == null ? void 0 : y.borderRadius,
    offset: y == null ? void 0 : y.offset
  });
  return I.createElement(oi, { path: h, labelX: m, labelY: g, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: p, markerStart: x, interactionWidth: E });
});
Gs.displayName = "SmoothStepEdge";
const tc = C.memo((e) => {
  var t;
  return I.createElement(Gs, { ...e, pathOptions: C.useMemo(() => {
    var n;
    return { borderRadius: 0, offset: (n = e.pathOptions) == null ? void 0 : n.offset };
  }, [(t = e.pathOptions) == null ? void 0 : t.offset]) });
});
tc.displayName = "StepEdge";
function I_({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const [o, i, s, l] = km({
    sourceX: e,
    sourceY: t,
    targetX: n,
    targetY: r
  });
  return [`M ${e},${t}L ${n},${r}`, o, i, s, l];
}
const nc = C.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p }) => {
  const [x, y, E] = I_({ sourceX: e, sourceY: t, targetX: n, targetY: r });
  return I.createElement(oi, { path: x, labelX: y, labelY: E, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p });
});
nc.displayName = "StraightEdge";
function zi(e, t) {
  return e >= 0 ? 0.5 * e : t * 25 * Math.sqrt(-e);
}
function qf({ pos: e, x1: t, y1: n, x2: r, y2: o, c: i }) {
  switch (e) {
    case K.Left:
      return [t - zi(t - r, i), n];
    case K.Right:
      return [t + zi(r - t, i), n];
    case K.Top:
      return [t, n - zi(n - o, i)];
    case K.Bottom:
      return [t, n + zi(o - n, i)];
  }
}
function Cm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, curvature: s = 0.25 }) {
  const [l, a] = qf({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o,
    c: s
  }), [u, c] = qf({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t,
    c: s
  }), [f, d, p, x] = Em({
    sourceX: e,
    sourceY: t,
    targetX: r,
    targetY: o,
    sourceControlX: l,
    sourceControlY: a,
    targetControlX: u,
    targetControlY: c
  });
  return [
    `M${e},${t} C${l},${a} ${u},${c} ${r},${o}`,
    f,
    d,
    p,
    x
  ];
}
const Ns = C.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, pathOptions: y, interactionWidth: E }) => {
  const [h, m, g] = Cm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i,
    curvature: y == null ? void 0 : y.curvature
  });
  return I.createElement(oi, { path: h, labelX: m, labelY: g, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: E });
});
Ns.displayName = "BezierEdge";
const rc = C.createContext(null), D_ = rc.Provider;
rc.Consumer;
const L_ = () => C.useContext(rc), O_ = (e) => "id" in e && "source" in e && "target" in e, F_ = ({ source: e, sourceHandle: t, target: n, targetHandle: r }) => `reactflow__edge-${e}${t || ""}-${n}${r || ""}`, Ba = (e, t) => typeof e > "u" ? "" : typeof e == "string" ? e : `${t ? `${t}__` : ""}${Object.keys(e).sort().map((r) => `${r}=${e[r]}`).join("&")}`, b_ = (e, t) => t.some((n) => n.source === e.source && n.target === e.target && (n.sourceHandle === e.sourceHandle || !n.sourceHandle && !e.sourceHandle) && (n.targetHandle === e.targetHandle || !n.targetHandle && !e.targetHandle)), H_ = (e, t) => {
  if (!e.source || !e.target)
    return t;
  let n;
  return O_(e) ? n = { ...e } : n = {
    ...e,
    id: F_(e)
  }, b_(n, t) ? t : t.concat(n);
}, Ua = ({ x: e, y: t }, [n, r, o], i, [s, l]) => {
  const a = {
    x: (e - n) / o,
    y: (t - r) / o
  };
  return i ? {
    x: s * Math.round(a.x / s),
    y: l * Math.round(a.y / l)
  } : a;
}, zm = ({ x: e, y: t }, [n, r, o]) => ({
  x: e * o + n,
  y: t * o + r
}), Vn = (e, t = [0, 0]) => {
  if (!e)
    return {
      x: 0,
      y: 0,
      positionAbsolute: {
        x: 0,
        y: 0
      }
    };
  const n = (e.width ?? 0) * t[0], r = (e.height ?? 0) * t[1], o = {
    x: e.position.x - n,
    y: e.position.y - r
  };
  return {
    ...o,
    positionAbsolute: e.positionAbsolute ? {
      x: e.positionAbsolute.x - n,
      y: e.positionAbsolute.y - r
    } : o
  };
}, qs = (e, t = [0, 0]) => {
  if (e.length === 0)
    return { x: 0, y: 0, width: 0, height: 0 };
  const n = e.reduce((r, o) => {
    const { x: i, y: s } = Vn(o, t).positionAbsolute;
    return wm(r, Ko({
      x: i,
      y: s,
      width: o.width || 0,
      height: o.height || 0
    }));
  }, { x: 1 / 0, y: 1 / 0, x2: -1 / 0, y2: -1 / 0 });
  return xm(n);
}, Pm = (e, t, [n, r, o] = [0, 0, 1], i = !1, s = !1, l = [0, 0]) => {
  const a = {
    x: (t.x - n) / o,
    y: (t.y - r) / o,
    width: t.width / o,
    height: t.height / o
  }, u = [];
  return e.forEach((c) => {
    const { width: f, height: d, selectable: p = !0, hidden: x = !1 } = c;
    if (s && !p || x)
      return !1;
    const { positionAbsolute: y } = Vn(c, l), E = {
      x: y.x,
      y: y.y,
      width: f || 0,
      height: d || 0
    }, h = ba(a, E), m = typeof f > "u" || typeof d > "u" || f === null || d === null, g = i && h > 0, w = (f || 0) * (d || 0);
    (m || g || h >= w || c.dragging) && u.push(c);
  }), u;
}, Mm = (e, t) => {
  const n = e.map((r) => r.id);
  return t.filter((r) => n.includes(r.source) || n.includes(r.target));
}, Tm = (e, t, n, r, o, i = 0.1) => {
  const s = t / (e.width * (1 + i)), l = n / (e.height * (1 + i)), a = Math.min(s, l), u = Hr(a, r, o), c = e.x + e.width / 2, f = e.y + e.height / 2, d = t / 2 - c * u, p = n / 2 - f * u;
  return { x: d, y: p, zoom: u };
}, Rn = (e, t = 0) => e.transition().duration(t);
function Qf(e, t, n, r) {
  return (t[n] || []).reduce((o, i) => {
    var s, l;
    return `${e.id}-${i.id}-${n}` !== r && o.push({
      id: i.id || null,
      type: n,
      nodeId: e.id,
      x: (((s = e.positionAbsolute) == null ? void 0 : s.x) ?? 0) + i.x + i.width / 2,
      y: (((l = e.positionAbsolute) == null ? void 0 : l.y) ?? 0) + i.y + i.height / 2
    }), o;
  }, []);
}
function V_(e, t, n, r, o, i) {
  const { x: s, y: l } = wn(e), u = t.elementsFromPoint(s, l).find((x) => x.classList.contains("react-flow__handle"));
  if (u) {
    const x = u.getAttribute("data-nodeid");
    if (x) {
      const y = oc(void 0, u), E = u.getAttribute("data-handleid"), h = i({ nodeId: x, id: E, type: y });
      if (h) {
        const m = o.find((g) => g.nodeId === x && g.type === y && g.id === E);
        return {
          handle: {
            id: E,
            type: y,
            nodeId: x,
            x: (m == null ? void 0 : m.x) || n.x,
            y: (m == null ? void 0 : m.y) || n.y
          },
          validHandleResult: h
        };
      }
    }
  }
  let c = [], f = 1 / 0;
  if (o.forEach((x) => {
    const y = Math.sqrt((x.x - n.x) ** 2 + (x.y - n.y) ** 2);
    if (y <= r) {
      const E = i(x);
      y <= f && (y < f ? c = [{ handle: x, validHandleResult: E }] : y === f && c.push({
        handle: x,
        validHandleResult: E
      }), f = y);
    }
  }), !c.length)
    return { handle: null, validHandleResult: jm() };
  if (c.length === 1)
    return c[0];
  const d = c.some(({ validHandleResult: x }) => x.isValid), p = c.some(({ handle: x }) => x.type === "target");
  return c.find(({ handle: x, validHandleResult: y }) => p ? x.type === "target" : d ? y.isValid : !0) || c[0];
}
const B_ = { source: null, target: null, sourceHandle: null, targetHandle: null }, jm = () => ({
  handleDomNode: null,
  isValid: !1,
  connection: B_,
  endHandle: null
});
function Am(e, t, n, r, o, i, s) {
  const l = o === "target", a = s.querySelector(`.react-flow__handle[data-id="${e == null ? void 0 : e.nodeId}-${e == null ? void 0 : e.id}-${e == null ? void 0 : e.type}"]`), u = {
    ...jm(),
    handleDomNode: a
  };
  if (a) {
    const c = oc(void 0, a), f = a.getAttribute("data-nodeid"), d = a.getAttribute("data-handleid"), p = a.classList.contains("connectable"), x = a.classList.contains("connectableend"), y = {
      source: l ? f : n,
      sourceHandle: l ? d : r,
      target: l ? n : f,
      targetHandle: l ? r : d
    };
    u.connection = y, p && x && (t === Gn.Strict ? l && c === "source" || !l && c === "target" : f !== n || d !== r) && (u.endHandle = {
      nodeId: f,
      handleId: d,
      type: c
    }, u.isValid = i(y));
  }
  return u;
}
function U_({ nodes: e, nodeId: t, handleId: n, handleType: r }) {
  return e.reduce((o, i) => {
    if (i[me]) {
      const { handleBounds: s } = i[me];
      let l = [], a = [];
      s && (l = Qf(i, s, "source", `${t}-${n}-${r}`), a = Qf(i, s, "target", `${t}-${n}-${r}`)), o.push(...l, ...a);
    }
    return o;
  }, []);
}
function oc(e, t) {
  return e || (t != null && t.classList.contains("target") ? "target" : t != null && t.classList.contains("source") ? "source" : null);
}
function Al(e) {
  e == null || e.classList.remove("valid", "connecting", "react-flow__handle-valid", "react-flow__handle-connecting");
}
function W_(e, t) {
  let n = null;
  return t ? n = "valid" : e && !t && (n = "invalid"), n;
}
function Rm({ event: e, handleId: t, nodeId: n, onConnect: r, isTarget: o, getState: i, setState: s, isValidConnection: l, edgeUpdaterType: a, onReconnectEnd: u }) {
  const c = vm(e.target), { connectionMode: f, domNode: d, autoPanOnConnect: p, connectionRadius: x, onConnectStart: y, panBy: E, getNodes: h, cancelConnection: m } = i();
  let g = 0, w;
  const { x: N, y: P } = wn(e), T = c == null ? void 0 : c.elementFromPoint(N, P), M = oc(a, T), k = d == null ? void 0 : d.getBoundingClientRect();
  if (!k || !M)
    return;
  let A, F = wn(e, k), O = !1, H = null, _ = !1, $ = null;
  const z = U_({
    nodes: h(),
    nodeId: n,
    handleId: t,
    handleType: M
  }), L = () => {
    if (!p)
      return;
    const [R, D] = ym(F, k);
    E({ x: R, y: D }), g = requestAnimationFrame(L);
  };
  s({
    connectionPosition: F,
    connectionStatus: null,
    // connectionNodeId etc will be removed in the next major in favor of connectionStartHandle
    connectionNodeId: n,
    connectionHandleId: t,
    connectionHandleType: M,
    connectionStartHandle: {
      nodeId: n,
      handleId: t,
      type: M
    },
    connectionEndHandle: null
  }), y == null || y(e, { nodeId: n, handleId: t, handleType: M });
  function j(R) {
    const { transform: D } = i();
    F = wn(R, k);
    const { handle: b, validHandleResult: B } = V_(R, c, Ua(F, D, !1, [1, 1]), x, z, (U) => Am(U, f, n, t, o ? "target" : "source", l, c));
    if (w = b, O || (L(), O = !0), $ = B.handleDomNode, H = B.connection, _ = B.isValid, s({
      connectionPosition: w && _ ? zm({
        x: w.x,
        y: w.y
      }, D) : F,
      connectionStatus: W_(!!w, _),
      connectionEndHandle: B.endHandle
    }), !w && !_ && !$)
      return Al(A);
    H.source !== H.target && $ && (Al(A), A = $, $.classList.add("connecting", "react-flow__handle-connecting"), $.classList.toggle("valid", _), $.classList.toggle("react-flow__handle-valid", _));
  }
  function S(R) {
    var D, b;
    (w || $) && H && _ && (r == null || r(H)), (b = (D = i()).onConnectEnd) == null || b.call(D, R), a && (u == null || u(R)), Al(A), m(), cancelAnimationFrame(g), O = !1, _ = !1, H = null, $ = null, c.removeEventListener("mousemove", j), c.removeEventListener("mouseup", S), c.removeEventListener("touchmove", j), c.removeEventListener("touchend", S);
  }
  c.addEventListener("mousemove", j), c.addEventListener("mouseup", S), c.addEventListener("touchmove", j), c.addEventListener("touchend", S);
}
const Zf = () => !0, Y_ = (e) => ({
  connectionStartHandle: e.connectionStartHandle,
  connectOnClick: e.connectOnClick,
  noPanClassName: e.noPanClassName
}), X_ = (e, t, n) => (r) => {
  const { connectionStartHandle: o, connectionEndHandle: i, connectionClickStartHandle: s } = r;
  return {
    connecting: (o == null ? void 0 : o.nodeId) === e && (o == null ? void 0 : o.handleId) === t && (o == null ? void 0 : o.type) === n || (i == null ? void 0 : i.nodeId) === e && (i == null ? void 0 : i.handleId) === t && (i == null ? void 0 : i.type) === n,
    clickConnecting: (s == null ? void 0 : s.nodeId) === e && (s == null ? void 0 : s.handleId) === t && (s == null ? void 0 : s.type) === n
  };
}, $m = C.forwardRef(({ type: e = "source", position: t = K.Top, isValidConnection: n, isConnectable: r = !0, isConnectableStart: o = !0, isConnectableEnd: i = !0, id: s, onConnect: l, children: a, className: u, onMouseDown: c, onTouchStart: f, ...d }, p) => {
  var k, A;
  const x = s || null, y = e === "target", E = ke(), h = L_(), { connectOnClick: m, noPanClassName: g } = le(Y_, Ce), { connecting: w, clickConnecting: N } = le(X_(h, x, e), Ce);
  h || (A = (k = E.getState()).onError) == null || A.call(k, "010", Gt.error010());
  const P = (F) => {
    const { defaultEdgeOptions: O, onConnect: H, hasDefaultEdges: _ } = E.getState(), $ = {
      ...O,
      ...F
    };
    if (_) {
      const { edges: z, setEdges: L } = E.getState();
      L(H_($, z));
    }
    H == null || H($), l == null || l($);
  }, T = (F) => {
    if (!h)
      return;
    const O = Sm(F);
    o && (O && F.button === 0 || !O) && Rm({
      event: F,
      handleId: x,
      nodeId: h,
      onConnect: P,
      isTarget: y,
      getState: E.getState,
      setState: E.setState,
      isValidConnection: n || E.getState().isValidConnection || Zf
    }), O ? c == null || c(F) : f == null || f(F);
  }, M = (F) => {
    const { onClickConnectStart: O, onClickConnectEnd: H, connectionClickStartHandle: _, connectionMode: $, isValidConnection: z } = E.getState();
    if (!h || !_ && !o)
      return;
    if (!_) {
      O == null || O(F, { nodeId: h, handleId: x, handleType: e }), E.setState({ connectionClickStartHandle: { nodeId: h, type: e, handleId: x } });
      return;
    }
    const L = vm(F.target), j = n || z || Zf, { connection: S, isValid: R } = Am({
      nodeId: h,
      id: x,
      type: e
    }, $, _.nodeId, _.handleId || null, _.type, j, L);
    R && P(S), H == null || H(F), E.setState({ connectionClickStartHandle: null });
  };
  return I.createElement("div", { "data-handleid": x, "data-nodeid": h, "data-handlepos": t, "data-id": `${h}-${x}-${e}`, className: je([
    "react-flow__handle",
    `react-flow__handle-${t}`,
    "nodrag",
    g,
    u,
    {
      source: !y,
      target: y,
      connectable: r,
      connectablestart: o,
      connectableend: i,
      connecting: N,
      // this class is used to style the handle when the user is connecting
      connectionindicator: r && (o && !w || i && w)
    }
  ]), onMouseDown: T, onTouchStart: T, onClick: m ? M : void 0, ref: p, ...d }, a);
});
$m.displayName = "Handle";
var Vr = C.memo($m);
const Im = ({ data: e, isConnectable: t, targetPosition: n = K.Top, sourcePosition: r = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Vr, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label,
  I.createElement(Vr, { type: "source", position: r, isConnectable: t })
);
Im.displayName = "DefaultNode";
var Wa = C.memo(Im);
const Dm = ({ data: e, isConnectable: t, sourcePosition: n = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  e == null ? void 0 : e.label,
  I.createElement(Vr, { type: "source", position: n, isConnectable: t })
);
Dm.displayName = "InputNode";
var Lm = C.memo(Dm);
const Om = ({ data: e, isConnectable: t, targetPosition: n = K.Top }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Vr, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label
);
Om.displayName = "OutputNode";
var Fm = C.memo(Om);
const ic = () => null;
ic.displayName = "GroupNode";
const K_ = (e) => ({
  selectedNodes: e.getNodes().filter((t) => t.selected),
  selectedEdges: e.edges.filter((t) => t.selected).map((t) => ({ ...t }))
}), Pi = (e) => e.id;
function G_(e, t) {
  return Ce(e.selectedNodes.map(Pi), t.selectedNodes.map(Pi)) && Ce(e.selectedEdges.map(Pi), t.selectedEdges.map(Pi));
}
const bm = C.memo(({ onSelectionChange: e }) => {
  const t = ke(), { selectedNodes: n, selectedEdges: r } = le(K_, G_);
  return C.useEffect(() => {
    const o = { nodes: n, edges: r };
    e == null || e(o), t.getState().onSelectionChange.forEach((i) => i(o));
  }, [n, r, e]), null;
});
bm.displayName = "SelectionListener";
const q_ = (e) => !!e.onSelectionChange;
function Q_({ onSelectionChange: e }) {
  const t = le(q_);
  return e || t ? I.createElement(bm, { onSelectionChange: e }) : null;
}
const Z_ = (e) => ({
  setNodes: e.setNodes,
  setEdges: e.setEdges,
  setDefaultNodesAndEdges: e.setDefaultNodesAndEdges,
  setMinZoom: e.setMinZoom,
  setMaxZoom: e.setMaxZoom,
  setTranslateExtent: e.setTranslateExtent,
  setNodeExtent: e.setNodeExtent,
  reset: e.reset
});
function or(e, t) {
  C.useEffect(() => {
    typeof e < "u" && t(e);
  }, [e]);
}
function Z(e, t, n) {
  C.useEffect(() => {
    typeof t < "u" && n({ [e]: t });
  }, [t]);
}
const J_ = ({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: o, onConnectStart: i, onConnectEnd: s, onClickConnectStart: l, onClickConnectEnd: a, nodesDraggable: u, nodesConnectable: c, nodesFocusable: f, edgesFocusable: d, edgesUpdatable: p, elevateNodesOnSelect: x, minZoom: y, maxZoom: E, nodeExtent: h, onNodesChange: m, onEdgesChange: g, elementsSelectable: w, connectionMode: N, snapGrid: P, snapToGrid: T, translateExtent: M, connectOnClick: k, defaultEdgeOptions: A, fitView: F, fitViewOptions: O, onNodesDelete: H, onEdgesDelete: _, onNodeDrag: $, onNodeDragStart: z, onNodeDragStop: L, onSelectionDrag: j, onSelectionDragStart: S, onSelectionDragStop: R, noPanClassName: D, nodeOrigin: b, rfId: B, autoPanOnConnect: U, autoPanOnNodeDrag: Y, onError: q, connectionRadius: Q, isValidConnection: re, nodeDragThreshold: ne }) => {
  const { setNodes: te, setEdges: ze, setDefaultNodesAndEdges: we, setMinZoom: Oe, setMaxZoom: Ae, setTranslateExtent: ge, setNodeExtent: qe, reset: ie } = le(Z_, Ce), G = ke();
  return C.useEffect(() => {
    const Fe = r == null ? void 0 : r.map((Rt) => ({ ...Rt, ...A }));
    return we(n, Fe), () => {
      ie();
    };
  }, []), Z("defaultEdgeOptions", A, G.setState), Z("connectionMode", N, G.setState), Z("onConnect", o, G.setState), Z("onConnectStart", i, G.setState), Z("onConnectEnd", s, G.setState), Z("onClickConnectStart", l, G.setState), Z("onClickConnectEnd", a, G.setState), Z("nodesDraggable", u, G.setState), Z("nodesConnectable", c, G.setState), Z("nodesFocusable", f, G.setState), Z("edgesFocusable", d, G.setState), Z("edgesUpdatable", p, G.setState), Z("elementsSelectable", w, G.setState), Z("elevateNodesOnSelect", x, G.setState), Z("snapToGrid", T, G.setState), Z("snapGrid", P, G.setState), Z("onNodesChange", m, G.setState), Z("onEdgesChange", g, G.setState), Z("connectOnClick", k, G.setState), Z("fitViewOnInit", F, G.setState), Z("fitViewOnInitOptions", O, G.setState), Z("onNodesDelete", H, G.setState), Z("onEdgesDelete", _, G.setState), Z("onNodeDrag", $, G.setState), Z("onNodeDragStart", z, G.setState), Z("onNodeDragStop", L, G.setState), Z("onSelectionDrag", j, G.setState), Z("onSelectionDragStart", S, G.setState), Z("onSelectionDragStop", R, G.setState), Z("noPanClassName", D, G.setState), Z("nodeOrigin", b, G.setState), Z("rfId", B, G.setState), Z("autoPanOnConnect", U, G.setState), Z("autoPanOnNodeDrag", Y, G.setState), Z("onError", q, G.setState), Z("connectionRadius", Q, G.setState), Z("isValidConnection", re, G.setState), Z("nodeDragThreshold", ne, G.setState), or(e, te), or(t, ze), or(y, Oe), or(E, Ae), or(M, ge), or(h, qe), null;
}, Jf = { display: "none" }, eS = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0px, 0px, 0px, 0px)",
  clipPath: "inset(100%)"
}, Hm = "react-flow__node-desc", Vm = "react-flow__edge-desc", tS = "react-flow__aria-live", nS = (e) => e.ariaLiveMessage;
function rS({ rfId: e }) {
  const t = le(nS);
  return I.createElement("div", { id: `${tS}-${e}`, "aria-live": "assertive", "aria-atomic": "true", style: eS }, t);
}
function oS({ rfId: e, disableKeyboardA11y: t }) {
  return I.createElement(
    I.Fragment,
    null,
    I.createElement(
      "div",
      { id: `${Hm}-${e}`, style: Jf },
      "Press enter or space to select a node.",
      !t && "You can then use the arrow keys to move the node around.",
      " Press delete to remove it and escape to cancel.",
      " "
    ),
    I.createElement("div", { id: `${Vm}-${e}`, style: Jf }, "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel."),
    !t && I.createElement(rS, { rfId: e })
  );
}
var qo = (e = null, t = { actInsideInputWithModifier: !0 }) => {
  const [n, r] = C.useState(!1), o = C.useRef(!1), i = C.useRef(/* @__PURE__ */ new Set([])), [s, l] = C.useMemo(() => {
    if (e !== null) {
      const u = (Array.isArray(e) ? e : [e]).filter((f) => typeof f == "string").map((f) => f.split("+")), c = u.reduce((f, d) => f.concat(...d), []);
      return [u, c];
    }
    return [[], []];
  }, [e]);
  return C.useEffect(() => {
    const a = typeof document < "u" ? document : null, u = (t == null ? void 0 : t.target) || a;
    if (e !== null) {
      const c = (p) => {
        if (o.current = p.ctrlKey || p.metaKey || p.shiftKey, (!o.current || o.current && !t.actInsideInputWithModifier) && Ha(p))
          return !1;
        const y = td(p.code, l);
        i.current.add(p[y]), ed(s, i.current, !1) && (p.preventDefault(), r(!0));
      }, f = (p) => {
        if ((!o.current || o.current && !t.actInsideInputWithModifier) && Ha(p))
          return !1;
        const y = td(p.code, l);
        ed(s, i.current, !0) ? (r(!1), i.current.clear()) : i.current.delete(p[y]), p.key === "Meta" && i.current.clear(), o.current = !1;
      }, d = () => {
        i.current.clear(), r(!1);
      };
      return u == null || u.addEventListener("keydown", c), u == null || u.addEventListener("keyup", f), window.addEventListener("blur", d), () => {
        u == null || u.removeEventListener("keydown", c), u == null || u.removeEventListener("keyup", f), window.removeEventListener("blur", d);
      };
    }
  }, [e, r]), n;
};
function ed(e, t, n) {
  return e.filter((r) => n || r.length === t.size).some((r) => r.every((o) => t.has(o)));
}
function td(e, t) {
  return t.includes(e) ? "code" : "key";
}
function Bm(e, t, n, r) {
  var l, a;
  const o = e.parentNode || e.parentId;
  if (!o)
    return n;
  const i = t.get(o), s = Vn(i, r);
  return Bm(i, t, {
    x: (n.x ?? 0) + s.x,
    y: (n.y ?? 0) + s.y,
    z: (((l = i[me]) == null ? void 0 : l.z) ?? 0) > (n.z ?? 0) ? ((a = i[me]) == null ? void 0 : a.z) ?? 0 : n.z ?? 0
  }, r);
}
function Um(e, t, n) {
  e.forEach((r) => {
    var i;
    const o = r.parentNode || r.parentId;
    if (o && !e.has(o))
      throw new Error(`Parent node ${o} not found`);
    if (o || n != null && n[r.id]) {
      const { x: s, y: l, z: a } = Bm(r, e, {
        ...r.position,
        z: ((i = r[me]) == null ? void 0 : i.z) ?? 0
      }, t);
      r.positionAbsolute = {
        x: s,
        y: l
      }, r[me].z = a, n != null && n[r.id] && (r[me].isParent = !0);
    }
  });
}
function Rl(e, t, n, r) {
  const o = /* @__PURE__ */ new Map(), i = {}, s = r ? 1e3 : 0;
  return e.forEach((l) => {
    var p;
    const a = (at(l.zIndex) ? l.zIndex : 0) + (l.selected ? s : 0), u = t.get(l.id), c = {
      ...l,
      positionAbsolute: {
        x: l.position.x,
        y: l.position.y
      }
    }, f = l.parentNode || l.parentId;
    f && (i[f] = !0);
    const d = (u == null ? void 0 : u.type) && (u == null ? void 0 : u.type) !== l.type;
    Object.defineProperty(c, me, {
      enumerable: !1,
      value: {
        handleBounds: d || (p = u == null ? void 0 : u[me]) == null ? void 0 : p.handleBounds,
        z: a
      }
    }), o.set(l.id, c);
  }), Um(o, n, i), o;
}
function Wm(e, t = {}) {
  const { getNodes: n, width: r, height: o, minZoom: i, maxZoom: s, d3Zoom: l, d3Selection: a, fitViewOnInitDone: u, fitViewOnInit: c, nodeOrigin: f } = e(), d = t.initial && !u && c;
  if (l && a && (d || !t.initial)) {
    const x = n().filter((E) => {
      var m;
      const h = t.includeHiddenNodes ? E.width && E.height : !E.hidden;
      return (m = t.nodes) != null && m.length ? h && t.nodes.some((g) => g.id === E.id) : h;
    }), y = x.every((E) => E.width && E.height);
    if (x.length > 0 && y) {
      const E = qs(x, f), { x: h, y: m, zoom: g } = Tm(E, r, o, t.minZoom ?? i, t.maxZoom ?? s, t.padding ?? 0.1), w = Bt.translate(h, m).scale(g);
      return typeof t.duration == "number" && t.duration > 0 ? l.transform(Rn(a, t.duration), w) : l.transform(a, w), !0;
    }
  }
  return !1;
}
function iS(e, t) {
  return e.forEach((n) => {
    const r = t.get(n.id);
    r && t.set(r.id, {
      ...r,
      [me]: r[me],
      selected: n.selected
    });
  }), new Map(t);
}
function sS(e, t) {
  return t.map((n) => {
    const r = e.find((o) => o.id === n.id);
    return r && (n.selected = r.selected), n;
  });
}
function Mi({ changedNodes: e, changedEdges: t, get: n, set: r }) {
  const { nodeInternals: o, edges: i, onNodesChange: s, onEdgesChange: l, hasDefaultNodes: a, hasDefaultEdges: u } = n();
  e != null && e.length && (a && r({ nodeInternals: iS(e, o) }), s == null || s(e)), t != null && t.length && (u && r({ edges: sS(t, i) }), l == null || l(t));
}
const ir = () => {
}, lS = {
  zoomIn: ir,
  zoomOut: ir,
  zoomTo: ir,
  getZoom: () => 1,
  setViewport: ir,
  getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  fitView: () => !1,
  setCenter: ir,
  fitBounds: ir,
  project: (e) => e,
  screenToFlowPosition: (e) => e,
  flowToScreenPosition: (e) => e,
  viewportInitialized: !1
}, aS = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection
}), uS = () => {
  const e = ke(), { d3Zoom: t, d3Selection: n } = le(aS, Ce);
  return C.useMemo(() => n && t ? {
    zoomIn: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1.2),
    zoomOut: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1 / 1.2),
    zoomTo: (o, i) => t.scaleTo(Rn(n, i == null ? void 0 : i.duration), o),
    getZoom: () => e.getState().transform[2],
    setViewport: (o, i) => {
      const [s, l, a] = e.getState().transform, u = Bt.translate(o.x ?? s, o.y ?? l).scale(o.zoom ?? a);
      t.transform(Rn(n, i == null ? void 0 : i.duration), u);
    },
    getViewport: () => {
      const [o, i, s] = e.getState().transform;
      return { x: o, y: i, zoom: s };
    },
    fitView: (o) => Wm(e.getState, o),
    setCenter: (o, i, s) => {
      const { width: l, height: a, maxZoom: u } = e.getState(), c = typeof (s == null ? void 0 : s.zoom) < "u" ? s.zoom : u, f = l / 2 - o * c, d = a / 2 - i * c, p = Bt.translate(f, d).scale(c);
      t.transform(Rn(n, s == null ? void 0 : s.duration), p);
    },
    fitBounds: (o, i) => {
      const { width: s, height: l, minZoom: a, maxZoom: u } = e.getState(), { x: c, y: f, zoom: d } = Tm(o, s, l, a, u, (i == null ? void 0 : i.padding) ?? 0.1), p = Bt.translate(c, f).scale(d);
      t.transform(Rn(n, i == null ? void 0 : i.duration), p);
    },
    // @deprecated Use `screenToFlowPosition`.
    project: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l } = e.getState();
      return console.warn("[DEPRECATED] `project` is deprecated. Instead use `screenToFlowPosition`. There is no need to subtract the react flow bounds anymore! https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position"), Ua(o, i, s, l);
    },
    screenToFlowPosition: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l, domNode: a } = e.getState();
      if (!a)
        return o;
      const { x: u, y: c } = a.getBoundingClientRect(), f = {
        x: o.x - u,
        y: o.y - c
      };
      return Ua(f, i, s, l);
    },
    flowToScreenPosition: (o) => {
      const { transform: i, domNode: s } = e.getState();
      if (!s)
        return o;
      const { x: l, y: a } = s.getBoundingClientRect(), u = zm(o, i);
      return {
        x: u.x + l,
        y: u.y + a
      };
    },
    viewportInitialized: !0
  } : lS, [t, n]);
};
function sc() {
  const e = uS(), t = ke(), n = C.useCallback(() => t.getState().getNodes().map((y) => ({ ...y })), []), r = C.useCallback((y) => t.getState().nodeInternals.get(y), []), o = C.useCallback(() => {
    const { edges: y = [] } = t.getState();
    return y.map((E) => ({ ...E }));
  }, []), i = C.useCallback((y) => {
    const { edges: E = [] } = t.getState();
    return E.find((h) => h.id === y);
  }, []), s = C.useCallback((y) => {
    const { getNodes: E, setNodes: h, hasDefaultNodes: m, onNodesChange: g } = t.getState(), w = E(), N = typeof y == "function" ? y(w) : y;
    if (m)
      h(N);
    else if (g) {
      const P = N.length === 0 ? w.map((T) => ({ type: "remove", id: T.id })) : N.map((T) => ({ item: T, type: "reset" }));
      g(P);
    }
  }, []), l = C.useCallback((y) => {
    const { edges: E = [], setEdges: h, hasDefaultEdges: m, onEdgesChange: g } = t.getState(), w = typeof y == "function" ? y(E) : y;
    if (m)
      h(w);
    else if (g) {
      const N = w.length === 0 ? E.map((P) => ({ type: "remove", id: P.id })) : w.map((P) => ({ item: P, type: "reset" }));
      g(N);
    }
  }, []), a = C.useCallback((y) => {
    const E = Array.isArray(y) ? y : [y], { getNodes: h, setNodes: m, hasDefaultNodes: g, onNodesChange: w } = t.getState();
    if (g) {
      const P = [...h(), ...E];
      m(P);
    } else if (w) {
      const N = E.map((P) => ({ item: P, type: "add" }));
      w(N);
    }
  }, []), u = C.useCallback((y) => {
    const E = Array.isArray(y) ? y : [y], { edges: h = [], setEdges: m, hasDefaultEdges: g, onEdgesChange: w } = t.getState();
    if (g)
      m([...h, ...E]);
    else if (w) {
      const N = E.map((P) => ({ item: P, type: "add" }));
      w(N);
    }
  }, []), c = C.useCallback(() => {
    const { getNodes: y, edges: E = [], transform: h } = t.getState(), [m, g, w] = h;
    return {
      nodes: y().map((N) => ({ ...N })),
      edges: E.map((N) => ({ ...N })),
      viewport: {
        x: m,
        y: g,
        zoom: w
      }
    };
  }, []), f = C.useCallback(({ nodes: y, edges: E }) => {
    const { nodeInternals: h, getNodes: m, edges: g, hasDefaultNodes: w, hasDefaultEdges: N, onNodesDelete: P, onEdgesDelete: T, onNodesChange: M, onEdgesChange: k } = t.getState(), A = (y || []).map(($) => $.id), F = (E || []).map(($) => $.id), O = m().reduce(($, z) => {
      const L = z.parentNode || z.parentId, j = !A.includes(z.id) && L && $.find((R) => R.id === L);
      return (typeof z.deletable == "boolean" ? z.deletable : !0) && (A.includes(z.id) || j) && $.push(z), $;
    }, []), H = g.filter(($) => typeof $.deletable == "boolean" ? $.deletable : !0), _ = H.filter(($) => F.includes($.id));
    if (O || _) {
      const $ = Mm(O, H), z = [..._, ...$], L = z.reduce((j, S) => (j.includes(S.id) || j.push(S.id), j), []);
      if ((N || w) && (N && t.setState({
        edges: g.filter((j) => !L.includes(j.id))
      }), w && (O.forEach((j) => {
        h.delete(j.id);
      }), t.setState({
        nodeInternals: new Map(h)
      }))), L.length > 0 && (T == null || T(z), k && k(L.map((j) => ({
        id: j,
        type: "remove"
      })))), O.length > 0 && (P == null || P(O), M)) {
        const j = O.map((S) => ({ id: S.id, type: "remove" }));
        M(j);
      }
    }
  }, []), d = C.useCallback((y) => {
    const E = M_(y), h = E ? null : t.getState().nodeInternals.get(y.id);
    return !E && !h ? [null, null, E] : [E ? y : Yf(h), h, E];
  }, []), p = C.useCallback((y, E = !0, h) => {
    const [m, g, w] = d(y);
    return m ? (h || t.getState().getNodes()).filter((N) => {
      if (!w && (N.id === g.id || !N.positionAbsolute))
        return !1;
      const P = Yf(N), T = ba(P, m);
      return E && T > 0 || T >= m.width * m.height;
    }) : [];
  }, []), x = C.useCallback((y, E, h = !0) => {
    const [m] = d(y);
    if (!m)
      return !1;
    const g = ba(m, E);
    return h && g > 0 || g >= m.width * m.height;
  }, []);
  return C.useMemo(() => ({
    ...e,
    getNodes: n,
    getNode: r,
    getEdges: o,
    getEdge: i,
    setNodes: s,
    setEdges: l,
    addNodes: a,
    addEdges: u,
    toObject: c,
    deleteElements: f,
    getIntersectingNodes: p,
    isNodeIntersecting: x
  }), [
    e,
    n,
    r,
    o,
    i,
    s,
    l,
    a,
    u,
    c,
    f,
    p,
    x
  ]);
}
const cS = { actInsideInputWithModifier: !1 };
var fS = ({ deleteKeyCode: e, multiSelectionKeyCode: t }) => {
  const n = ke(), { deleteElements: r } = sc(), o = qo(e, cS), i = qo(t);
  C.useEffect(() => {
    if (o) {
      const { edges: s, getNodes: l } = n.getState(), a = l().filter((c) => c.selected), u = s.filter((c) => c.selected);
      r({ nodes: a, edges: u }), n.setState({ nodesSelectionActive: !1 });
    }
  }, [o]), C.useEffect(() => {
    n.setState({ multiSelectionActive: i });
  }, [i]);
};
function dS(e) {
  const t = ke();
  C.useEffect(() => {
    let n;
    const r = () => {
      var i, s;
      if (!e.current)
        return;
      const o = Zu(e.current);
      (o.height === 0 || o.width === 0) && ((s = (i = t.getState()).onError) == null || s.call(i, "004", Gt.error004())), t.setState({ width: o.width || 500, height: o.height || 500 });
    };
    return r(), window.addEventListener("resize", r), e.current && (n = new ResizeObserver(() => r()), n.observe(e.current)), () => {
      window.removeEventListener("resize", r), n && e.current && n.unobserve(e.current);
    };
  }, []);
}
const lc = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0
}, pS = (e, t) => e.x !== t.x || e.y !== t.y || e.zoom !== t.k, Ti = (e) => ({
  x: e.x,
  y: e.y,
  zoom: e.k
}), sr = (e, t) => e.target.closest(`.${t}`), nd = (e, t) => t === 2 && Array.isArray(e) && e.includes(2), rd = (e) => {
  const t = e.ctrlKey && ks() ? 10 : 1;
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * t;
}, hS = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection,
  d3ZoomHandler: e.d3ZoomHandler,
  userSelectionActive: e.userSelectionActive
}), mS = ({ onMove: e, onMoveStart: t, onMoveEnd: n, onPaneContextMenu: r, zoomOnScroll: o = !0, zoomOnPinch: i = !0, panOnScroll: s = !1, panOnScrollSpeed: l = 0.5, panOnScrollMode: a = On.Free, zoomOnDoubleClick: u = !0, elementsSelectable: c, panOnDrag: f = !0, defaultViewport: d, translateExtent: p, minZoom: x, maxZoom: y, zoomActivationKeyCode: E, preventScrolling: h = !0, children: m, noWheelClassName: g, noPanClassName: w }) => {
  const N = C.useRef(), P = ke(), T = C.useRef(!1), M = C.useRef(!1), k = C.useRef(null), A = C.useRef({ x: 0, y: 0, zoom: 0 }), { d3Zoom: F, d3Selection: O, d3ZoomHandler: H, userSelectionActive: _ } = le(hS, Ce), $ = qo(E), z = C.useRef(0), L = C.useRef(!1), j = C.useRef();
  return dS(k), C.useEffect(() => {
    if (k.current) {
      const S = k.current.getBoundingClientRect(), R = mm().scaleExtent([x, y]).translateExtent(p), D = st(k.current).call(R), b = Bt.translate(d.x, d.y).scale(Hr(d.zoom, x, y)), B = [
        [0, 0],
        [S.width, S.height]
      ], U = R.constrain()(b, B, p);
      R.transform(D, U), R.wheelDelta(rd), P.setState({
        d3Zoom: R,
        d3Selection: D,
        d3ZoomHandler: D.on("wheel.zoom"),
        // we need to pass transform because zoom handler is not registered when we set the initial transform
        transform: [U.x, U.y, U.k],
        domNode: k.current.closest(".react-flow")
      });
    }
  }, []), C.useEffect(() => {
    O && F && (s && !$ && !_ ? O.on("wheel.zoom", (S) => {
      if (sr(S, g))
        return !1;
      S.preventDefault(), S.stopImmediatePropagation();
      const R = O.property("__zoom").k || 1;
      if (S.ctrlKey && i) {
        const re = vt(S), ne = rd(S), te = R * Math.pow(2, ne);
        F.scaleTo(O, te, re, S);
        return;
      }
      const D = S.deltaMode === 1 ? 20 : 1;
      let b = a === On.Vertical ? 0 : S.deltaX * D, B = a === On.Horizontal ? 0 : S.deltaY * D;
      !ks() && S.shiftKey && a !== On.Vertical && (b = S.deltaY * D, B = 0), F.translateBy(
        O,
        -(b / R) * l,
        -(B / R) * l,
        // @ts-ignore
        { internal: !0 }
      );
      const U = Ti(O.property("__zoom")), { onViewportChangeStart: Y, onViewportChange: q, onViewportChangeEnd: Q } = P.getState();
      clearTimeout(j.current), L.current || (L.current = !0, t == null || t(S, U), Y == null || Y(U)), L.current && (e == null || e(S, U), q == null || q(U), j.current = setTimeout(() => {
        n == null || n(S, U), Q == null || Q(U), L.current = !1;
      }, 150));
    }, { passive: !1 }) : typeof H < "u" && O.on("wheel.zoom", function(S, R) {
      if (!h && S.type === "wheel" && !S.ctrlKey || sr(S, g))
        return null;
      S.preventDefault(), H.call(this, S, R);
    }, { passive: !1 }));
  }, [
    _,
    s,
    a,
    O,
    F,
    H,
    $,
    i,
    h,
    g,
    t,
    e,
    n
  ]), C.useEffect(() => {
    F && F.on("start", (S) => {
      var b, B;
      if (!S.sourceEvent || S.sourceEvent.internal)
        return null;
      z.current = (b = S.sourceEvent) == null ? void 0 : b.button;
      const { onViewportChangeStart: R } = P.getState(), D = Ti(S.transform);
      T.current = !0, A.current = D, ((B = S.sourceEvent) == null ? void 0 : B.type) === "mousedown" && P.setState({ paneDragging: !0 }), R == null || R(D), t == null || t(S.sourceEvent, D);
    });
  }, [F, t]), C.useEffect(() => {
    F && (_ && !T.current ? F.on("zoom", null) : _ || F.on("zoom", (S) => {
      var D;
      const { onViewportChange: R } = P.getState();
      if (P.setState({ transform: [S.transform.x, S.transform.y, S.transform.k] }), M.current = !!(r && nd(f, z.current ?? 0)), (e || R) && !((D = S.sourceEvent) != null && D.internal)) {
        const b = Ti(S.transform);
        R == null || R(b), e == null || e(S.sourceEvent, b);
      }
    }));
  }, [_, F, e, f, r]), C.useEffect(() => {
    F && F.on("end", (S) => {
      if (!S.sourceEvent || S.sourceEvent.internal)
        return null;
      const { onViewportChangeEnd: R } = P.getState();
      if (T.current = !1, P.setState({ paneDragging: !1 }), r && nd(f, z.current ?? 0) && !M.current && r(S.sourceEvent), M.current = !1, (n || R) && pS(A.current, S.transform)) {
        const D = Ti(S.transform);
        A.current = D, clearTimeout(N.current), N.current = setTimeout(() => {
          R == null || R(D), n == null || n(S.sourceEvent, D);
        }, s ? 150 : 0);
      }
    });
  }, [F, s, f, n, r]), C.useEffect(() => {
    F && F.filter((S) => {
      const R = $ || o, D = i && S.ctrlKey;
      if ((f === !0 || Array.isArray(f) && f.includes(1)) && S.button === 1 && S.type === "mousedown" && (sr(S, "react-flow__node") || sr(S, "react-flow__edge")))
        return !0;
      if (!f && !R && !s && !u && !i || _ || !u && S.type === "dblclick" || sr(S, g) && S.type === "wheel" || sr(S, w) && (S.type !== "wheel" || s && S.type === "wheel" && !$) || !i && S.ctrlKey && S.type === "wheel" || !R && !s && !D && S.type === "wheel" || !f && (S.type === "mousedown" || S.type === "touchstart") || Array.isArray(f) && !f.includes(S.button) && S.type === "mousedown")
        return !1;
      const b = Array.isArray(f) && f.includes(S.button) || !S.button || S.button <= 1;
      return (!S.ctrlKey || S.type === "wheel") && b;
    });
  }, [
    _,
    F,
    o,
    i,
    s,
    u,
    f,
    c,
    $
  ]), I.createElement("div", { className: "react-flow__renderer", ref: k, style: lc }, m);
}, gS = (e) => ({
  userSelectionActive: e.userSelectionActive,
  userSelectionRect: e.userSelectionRect
});
function yS() {
  const { userSelectionActive: e, userSelectionRect: t } = le(gS, Ce);
  return e && t ? I.createElement("div", { className: "react-flow__selection react-flow__container", style: {
    width: t.width,
    height: t.height,
    transform: `translate(${t.x}px, ${t.y}px)`
  } }) : null;
}
function od(e, t) {
  const n = t.parentNode || t.parentId, r = e.find((o) => o.id === n);
  if (r) {
    const o = t.position.x + t.width - r.width, i = t.position.y + t.height - r.height;
    if (o > 0 || i > 0 || t.position.x < 0 || t.position.y < 0) {
      if (r.style = { ...r.style }, r.style.width = r.style.width ?? r.width, r.style.height = r.style.height ?? r.height, o > 0 && (r.style.width += o), i > 0 && (r.style.height += i), t.position.x < 0) {
        const s = Math.abs(t.position.x);
        r.position.x = r.position.x - s, r.style.width += s, t.position.x = 0;
      }
      if (t.position.y < 0) {
        const s = Math.abs(t.position.y);
        r.position.y = r.position.y - s, r.style.height += s, t.position.y = 0;
      }
      r.width = r.style.width, r.height = r.style.height;
    }
  }
}
function vS(e, t) {
  if (e.some((r) => r.type === "reset"))
    return e.filter((r) => r.type === "reset").map((r) => r.item);
  const n = e.filter((r) => r.type === "add").map((r) => r.item);
  return t.reduce((r, o) => {
    const i = e.filter((l) => l.id === o.id);
    if (i.length === 0)
      return r.push(o), r;
    const s = { ...o };
    for (const l of i)
      if (l)
        switch (l.type) {
          case "select": {
            s.selected = l.selected;
            break;
          }
          case "position": {
            typeof l.position < "u" && (s.position = l.position), typeof l.positionAbsolute < "u" && (s.positionAbsolute = l.positionAbsolute), typeof l.dragging < "u" && (s.dragging = l.dragging), s.expandParent && od(r, s);
            break;
          }
          case "dimensions": {
            typeof l.dimensions < "u" && (s.width = l.dimensions.width, s.height = l.dimensions.height), typeof l.updateStyle < "u" && (s.style = { ...s.style || {}, ...l.dimensions }), typeof l.resizing == "boolean" && (s.resizing = l.resizing), s.expandParent && od(r, s);
            break;
          }
          case "remove":
            return r;
        }
    return r.push(s), r;
  }, n);
}
function wS(e, t) {
  return vS(e, t);
}
const rn = (e, t) => ({
  id: e,
  type: "select",
  selected: t
});
function _r(e, t) {
  return e.reduce((n, r) => {
    const o = t.includes(r.id);
    return !r.selected && o ? (r.selected = !0, n.push(rn(r.id, !0))) : r.selected && !o && (r.selected = !1, n.push(rn(r.id, !1))), n;
  }, []);
}
const $l = (e, t) => (n) => {
  n.target === t.current && (e == null || e(n));
}, xS = (e) => ({
  userSelectionActive: e.userSelectionActive,
  elementsSelectable: e.elementsSelectable,
  dragging: e.paneDragging
}), Ym = C.memo(({ isSelecting: e, selectionMode: t = Go.Full, panOnDrag: n, onSelectionStart: r, onSelectionEnd: o, onPaneClick: i, onPaneContextMenu: s, onPaneScroll: l, onPaneMouseEnter: a, onPaneMouseMove: u, onPaneMouseLeave: c, children: f }) => {
  const d = C.useRef(null), p = ke(), x = C.useRef(0), y = C.useRef(0), E = C.useRef(), { userSelectionActive: h, elementsSelectable: m, dragging: g } = le(xS, Ce), w = () => {
    p.setState({ userSelectionActive: !1, userSelectionRect: null }), x.current = 0, y.current = 0;
  }, N = (H) => {
    i == null || i(H), p.getState().resetSelectedElements(), p.setState({ nodesSelectionActive: !1 });
  }, P = (H) => {
    if (Array.isArray(n) && (n != null && n.includes(2))) {
      H.preventDefault();
      return;
    }
    s == null || s(H);
  }, T = l ? (H) => l(H) : void 0, M = (H) => {
    const { resetSelectedElements: _, domNode: $ } = p.getState();
    if (E.current = $ == null ? void 0 : $.getBoundingClientRect(), !m || !e || H.button !== 0 || H.target !== d.current || !E.current)
      return;
    const { x: z, y: L } = wn(H, E.current);
    _(), p.setState({
      userSelectionRect: {
        width: 0,
        height: 0,
        startX: z,
        startY: L,
        x: z,
        y: L
      }
    }), r == null || r(H);
  }, k = (H) => {
    const { userSelectionRect: _, nodeInternals: $, edges: z, transform: L, onNodesChange: j, onEdgesChange: S, nodeOrigin: R, getNodes: D } = p.getState();
    if (!e || !E.current || !_)
      return;
    p.setState({ userSelectionActive: !0, nodesSelectionActive: !1 });
    const b = wn(H, E.current), B = _.startX ?? 0, U = _.startY ?? 0, Y = {
      ..._,
      x: b.x < B ? b.x : B,
      y: b.y < U ? b.y : U,
      width: Math.abs(b.x - B),
      height: Math.abs(b.y - U)
    }, q = D(), Q = Pm($, Y, L, t === Go.Partial, !0, R), re = Mm(Q, z).map((te) => te.id), ne = Q.map((te) => te.id);
    if (x.current !== ne.length) {
      x.current = ne.length;
      const te = _r(q, ne);
      te.length && (j == null || j(te));
    }
    if (y.current !== re.length) {
      y.current = re.length;
      const te = _r(z, re);
      te.length && (S == null || S(te));
    }
    p.setState({
      userSelectionRect: Y
    });
  }, A = (H) => {
    if (H.button !== 0)
      return;
    const { userSelectionRect: _ } = p.getState();
    !h && _ && H.target === d.current && (N == null || N(H)), p.setState({ nodesSelectionActive: x.current > 0 }), w(), o == null || o(H);
  }, F = (H) => {
    h && (p.setState({ nodesSelectionActive: x.current > 0 }), o == null || o(H)), w();
  }, O = m && (e || h);
  return I.createElement(
    "div",
    { className: je(["react-flow__pane", { dragging: g, selection: e }]), onClick: O ? void 0 : $l(N, d), onContextMenu: $l(P, d), onWheel: $l(T, d), onMouseEnter: O ? void 0 : a, onMouseDown: O ? M : void 0, onMouseMove: O ? k : u, onMouseUp: O ? A : void 0, onMouseLeave: O ? F : c, ref: d, style: lc },
    f,
    I.createElement(yS, null)
  );
});
Ym.displayName = "Pane";
function Xm(e, t) {
  const n = e.parentNode || e.parentId;
  if (!n)
    return !1;
  const r = t.get(n);
  return r ? r.selected ? !0 : Xm(r, t) : !1;
}
function id(e, t, n) {
  let r = e;
  do {
    if (r != null && r.matches(t))
      return !0;
    if (r === n.current)
      return !1;
    r = r.parentElement;
  } while (r);
  return !1;
}
function _S(e, t, n, r) {
  return Array.from(e.values()).filter((o) => (o.selected || o.id === r) && (!o.parentNode || o.parentId || !Xm(o, e)) && (o.draggable || t && typeof o.draggable > "u")).map((o) => {
    var i, s;
    return {
      id: o.id,
      position: o.position || { x: 0, y: 0 },
      positionAbsolute: o.positionAbsolute || { x: 0, y: 0 },
      distance: {
        x: n.x - (((i = o.positionAbsolute) == null ? void 0 : i.x) ?? 0),
        y: n.y - (((s = o.positionAbsolute) == null ? void 0 : s.y) ?? 0)
      },
      delta: {
        x: 0,
        y: 0
      },
      extent: o.extent,
      parentNode: o.parentNode || o.parentId,
      parentId: o.parentNode || o.parentId,
      width: o.width,
      height: o.height,
      expandParent: o.expandParent
    };
  });
}
function SS(e, t) {
  return !t || t === "parent" ? t : [t[0], [t[1][0] - (e.width || 0), t[1][1] - (e.height || 0)]];
}
function Km(e, t, n, r, o = [0, 0], i) {
  const s = SS(e, e.extent || r);
  let l = s;
  const a = e.parentNode || e.parentId;
  if (e.extent === "parent" && !e.expandParent)
    if (a && e.width && e.height) {
      const f = n.get(a), { x: d, y: p } = Vn(f, o).positionAbsolute;
      l = f && at(d) && at(p) && at(f.width) && at(f.height) ? [
        [d + e.width * o[0], p + e.height * o[1]],
        [
          d + f.width - e.width + e.width * o[0],
          p + f.height - e.height + e.height * o[1]
        ]
      ] : l;
    } else
      i == null || i("005", Gt.error005()), l = s;
  else if (e.extent && a && e.extent !== "parent") {
    const f = n.get(a), { x: d, y: p } = Vn(f, o).positionAbsolute;
    l = [
      [e.extent[0][0] + d, e.extent[0][1] + p],
      [e.extent[1][0] + d, e.extent[1][1] + p]
    ];
  }
  let u = { x: 0, y: 0 };
  if (a) {
    const f = n.get(a);
    u = Vn(f, o).positionAbsolute;
  }
  const c = l && l !== "parent" ? Ju(t, l) : t;
  return {
    position: {
      x: c.x - u.x,
      y: c.y - u.y
    },
    positionAbsolute: c
  };
}
function Il({ nodeId: e, dragItems: t, nodeInternals: n }) {
  const r = t.map((o) => ({
    ...n.get(o.id),
    position: o.position,
    positionAbsolute: o.positionAbsolute
  }));
  return [e ? r.find((o) => o.id === e) : r[0], r];
}
const sd = (e, t, n, r) => {
  const o = t.querySelectorAll(e);
  if (!o || !o.length)
    return null;
  const i = Array.from(o), s = t.getBoundingClientRect(), l = {
    x: s.width * r[0],
    y: s.height * r[1]
  };
  return i.map((a) => {
    const u = a.getBoundingClientRect();
    return {
      id: a.getAttribute("data-handleid"),
      position: a.getAttribute("data-handlepos"),
      x: (u.left - s.left - l.x) / n,
      y: (u.top - s.top - l.y) / n,
      ...Zu(a)
    };
  });
};
function lo(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().nodeInternals.get(e);
    o && n(r, { ...o });
  };
}
function Ya({ id: e, store: t, unselect: n = !1, nodeRef: r }) {
  const { addSelectedNodes: o, unselectNodesAndEdges: i, multiSelectionActive: s, nodeInternals: l, onError: a } = t.getState(), u = l.get(e);
  if (!u) {
    a == null || a("012", Gt.error012(e));
    return;
  }
  t.setState({ nodesSelectionActive: !1 }), u.selected ? (n || u.selected && s) && (i({ nodes: [u], edges: [] }), requestAnimationFrame(() => {
    var c;
    return (c = r == null ? void 0 : r.current) == null ? void 0 : c.blur();
  })) : o([e]);
}
function kS() {
  const e = ke();
  return C.useCallback(({ sourceEvent: n }) => {
    const { transform: r, snapGrid: o, snapToGrid: i } = e.getState(), s = n.touches ? n.touches[0].clientX : n.clientX, l = n.touches ? n.touches[0].clientY : n.clientY, a = {
      x: (s - r[0]) / r[2],
      y: (l - r[1]) / r[2]
    };
    return {
      xSnapped: i ? o[0] * Math.round(a.x / o[0]) : a.x,
      ySnapped: i ? o[1] * Math.round(a.y / o[1]) : a.y,
      ...a
    };
  }, []);
}
function Dl(e) {
  return (t, n, r) => e == null ? void 0 : e(t, r);
}
function Gm({ nodeRef: e, disabled: t = !1, noDragClassName: n, handleSelector: r, nodeId: o, isSelectable: i, selectNodesOnDrag: s }) {
  const l = ke(), [a, u] = C.useState(!1), c = C.useRef([]), f = C.useRef({ x: null, y: null }), d = C.useRef(0), p = C.useRef(null), x = C.useRef({ x: 0, y: 0 }), y = C.useRef(null), E = C.useRef(!1), h = C.useRef(!1), m = C.useRef(!1), g = kS();
  return C.useEffect(() => {
    if (e != null && e.current) {
      const w = st(e.current), N = ({ x: M, y: k }) => {
        const { nodeInternals: A, onNodeDrag: F, onSelectionDrag: O, updateNodePositions: H, nodeExtent: _, snapGrid: $, snapToGrid: z, nodeOrigin: L, onError: j } = l.getState();
        f.current = { x: M, y: k };
        let S = !1, R = { x: 0, y: 0, x2: 0, y2: 0 };
        if (c.current.length > 1 && _) {
          const b = qs(c.current, L);
          R = Ko(b);
        }
        if (c.current = c.current.map((b) => {
          const B = { x: M - b.distance.x, y: k - b.distance.y };
          z && (B.x = $[0] * Math.round(B.x / $[0]), B.y = $[1] * Math.round(B.y / $[1]));
          const U = [
            [_[0][0], _[0][1]],
            [_[1][0], _[1][1]]
          ];
          c.current.length > 1 && _ && !b.extent && (U[0][0] = b.positionAbsolute.x - R.x + _[0][0], U[1][0] = b.positionAbsolute.x + (b.width ?? 0) - R.x2 + _[1][0], U[0][1] = b.positionAbsolute.y - R.y + _[0][1], U[1][1] = b.positionAbsolute.y + (b.height ?? 0) - R.y2 + _[1][1]);
          const Y = Km(b, B, A, U, L, j);
          return S = S || b.position.x !== Y.position.x || b.position.y !== Y.position.y, b.position = Y.position, b.positionAbsolute = Y.positionAbsolute, b;
        }), !S)
          return;
        H(c.current, !0, !0), u(!0);
        const D = o ? F : Dl(O);
        if (D && y.current) {
          const [b, B] = Il({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: A
          });
          D(y.current, b, B);
        }
      }, P = () => {
        if (!p.current)
          return;
        const [M, k] = ym(x.current, p.current);
        if (M !== 0 || k !== 0) {
          const { transform: A, panBy: F } = l.getState();
          f.current.x = (f.current.x ?? 0) - M / A[2], f.current.y = (f.current.y ?? 0) - k / A[2], F({ x: M, y: k }) && N(f.current);
        }
        d.current = requestAnimationFrame(P);
      }, T = (M) => {
        var L;
        const { nodeInternals: k, multiSelectionActive: A, nodesDraggable: F, unselectNodesAndEdges: O, onNodeDragStart: H, onSelectionDragStart: _ } = l.getState();
        h.current = !0;
        const $ = o ? H : Dl(_);
        (!s || !i) && !A && o && ((L = k.get(o)) != null && L.selected || O()), o && i && s && Ya({
          id: o,
          store: l,
          nodeRef: e
        });
        const z = g(M);
        if (f.current = z, c.current = _S(k, F, z, o), $ && c.current) {
          const [j, S] = Il({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: k
          });
          $(M.sourceEvent, j, S);
        }
      };
      if (t)
        w.on(".drag", null);
      else {
        const M = Rx().on("start", (k) => {
          const { domNode: A, nodeDragThreshold: F } = l.getState();
          F === 0 && T(k), m.current = !1;
          const O = g(k);
          f.current = O, p.current = (A == null ? void 0 : A.getBoundingClientRect()) || null, x.current = wn(k.sourceEvent, p.current);
        }).on("drag", (k) => {
          var H, _;
          const A = g(k), { autoPanOnNodeDrag: F, nodeDragThreshold: O } = l.getState();
          if (k.sourceEvent.type === "touchmove" && k.sourceEvent.touches.length > 1 && (m.current = !0), !m.current) {
            if (!E.current && h.current && F && (E.current = !0, P()), !h.current) {
              const $ = A.xSnapped - (((H = f == null ? void 0 : f.current) == null ? void 0 : H.x) ?? 0), z = A.ySnapped - (((_ = f == null ? void 0 : f.current) == null ? void 0 : _.y) ?? 0);
              Math.sqrt($ * $ + z * z) > O && T(k);
            }
            (f.current.x !== A.xSnapped || f.current.y !== A.ySnapped) && c.current && h.current && (y.current = k.sourceEvent, x.current = wn(k.sourceEvent, p.current), N(A));
          }
        }).on("end", (k) => {
          if (!(!h.current || m.current) && (u(!1), E.current = !1, h.current = !1, cancelAnimationFrame(d.current), c.current)) {
            const { updateNodePositions: A, nodeInternals: F, onNodeDragStop: O, onSelectionDragStop: H } = l.getState(), _ = o ? O : Dl(H);
            if (A(c.current, !1, !1), _) {
              const [$, z] = Il({
                nodeId: o,
                dragItems: c.current,
                nodeInternals: F
              });
              _(k.sourceEvent, $, z);
            }
          }
        }).filter((k) => {
          const A = k.target;
          return !k.button && (!n || !id(A, `.${n}`, e)) && (!r || id(A, r, e));
        });
        return w.call(M), () => {
          w.on(".drag", null);
        };
      }
    }
  }, [
    e,
    t,
    n,
    r,
    i,
    l,
    o,
    s,
    g
  ]), a;
}
function qm() {
  const e = ke();
  return C.useCallback((n) => {
    const { nodeInternals: r, nodeExtent: o, updateNodePositions: i, getNodes: s, snapToGrid: l, snapGrid: a, onError: u, nodesDraggable: c } = e.getState(), f = s().filter((m) => m.selected && (m.draggable || c && typeof m.draggable > "u")), d = l ? a[0] : 5, p = l ? a[1] : 5, x = n.isShiftPressed ? 4 : 1, y = n.x * d * x, E = n.y * p * x, h = f.map((m) => {
      if (m.positionAbsolute) {
        const g = { x: m.positionAbsolute.x + y, y: m.positionAbsolute.y + E };
        l && (g.x = a[0] * Math.round(g.x / a[0]), g.y = a[1] * Math.round(g.y / a[1]));
        const { positionAbsolute: w, position: N } = Km(m, g, r, o, void 0, u);
        m.position = N, m.positionAbsolute = w;
      }
      return m;
    });
    i(h, !0, !1);
  }, []);
}
const Tr = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
var ao = (e) => {
  const t = ({ id: n, type: r, data: o, xPos: i, yPos: s, xPosOrigin: l, yPosOrigin: a, selected: u, onClick: c, onMouseEnter: f, onMouseMove: d, onMouseLeave: p, onContextMenu: x, onDoubleClick: y, style: E, className: h, isDraggable: m, isSelectable: g, isConnectable: w, isFocusable: N, selectNodesOnDrag: P, sourcePosition: T, targetPosition: M, hidden: k, resizeObserver: A, dragHandle: F, zIndex: O, isParent: H, noDragClassName: _, noPanClassName: $, initialized: z, disableKeyboardA11y: L, ariaLabel: j, rfId: S, hasHandleBounds: R }) => {
    const D = ke(), b = C.useRef(null), B = C.useRef(null), U = C.useRef(T), Y = C.useRef(M), q = C.useRef(r), Q = g || m || c || f || d || p, re = qm(), ne = lo(n, D.getState, f), te = lo(n, D.getState, d), ze = lo(n, D.getState, p), we = lo(n, D.getState, x), Oe = lo(n, D.getState, y), Ae = (ie) => {
      const { nodeDragThreshold: G } = D.getState();
      if (g && (!P || !m || G > 0) && Ya({
        id: n,
        store: D,
        nodeRef: b
      }), c) {
        const Fe = D.getState().nodeInternals.get(n);
        Fe && c(ie, { ...Fe });
      }
    }, ge = (ie) => {
      if (!Ha(ie) && !L)
        if (_m.includes(ie.key) && g) {
          const G = ie.key === "Escape";
          Ya({
            id: n,
            store: D,
            unselect: G,
            nodeRef: b
          });
        } else m && u && Object.prototype.hasOwnProperty.call(Tr, ie.key) && (D.setState({
          ariaLiveMessage: `Moved selected node ${ie.key.replace("Arrow", "").toLowerCase()}. New position, x: ${~~i}, y: ${~~s}`
        }), re({
          x: Tr[ie.key].x,
          y: Tr[ie.key].y,
          isShiftPressed: ie.shiftKey
        }));
    };
    C.useEffect(() => () => {
      B.current && (A == null || A.unobserve(B.current), B.current = null);
    }, []), C.useEffect(() => {
      if (b.current && !k) {
        const ie = b.current;
        (!z || !R || B.current !== ie) && (B.current && (A == null || A.unobserve(B.current)), A == null || A.observe(ie), B.current = ie);
      }
    }, [k, z, R]), C.useEffect(() => {
      const ie = q.current !== r, G = U.current !== T, Fe = Y.current !== M;
      b.current && (ie || G || Fe) && (ie && (q.current = r), G && (U.current = T), Fe && (Y.current = M), D.getState().updateNodeDimensions([{ id: n, nodeElement: b.current, forceUpdate: !0 }]));
    }, [n, r, T, M]);
    const qe = Gm({
      nodeRef: b,
      disabled: k || !m,
      noDragClassName: _,
      handleSelector: F,
      nodeId: n,
      isSelectable: g,
      selectNodesOnDrag: P
    });
    return k ? null : I.createElement(
      "div",
      { className: je([
        "react-flow__node",
        `react-flow__node-${r}`,
        {
          // this is overwritable by passing `nopan` as a class name
          [$]: m
        },
        h,
        {
          selected: u,
          selectable: g,
          parent: H,
          dragging: qe
        }
      ]), ref: b, style: {
        zIndex: O,
        transform: `translate(${l}px,${a}px)`,
        pointerEvents: Q ? "all" : "none",
        visibility: z ? "visible" : "hidden",
        ...E
      }, "data-id": n, "data-testid": `rf__node-${n}`, onMouseEnter: ne, onMouseMove: te, onMouseLeave: ze, onContextMenu: we, onClick: Ae, onDoubleClick: Oe, onKeyDown: N ? ge : void 0, tabIndex: N ? 0 : void 0, role: N ? "button" : void 0, "aria-describedby": L ? void 0 : `${Hm}-${S}`, "aria-label": j },
      I.createElement(
        D_,
        { value: n },
        I.createElement(e, { id: n, data: o, type: r, xPos: i, yPos: s, selected: u, isConnectable: w, sourcePosition: T, targetPosition: M, dragging: qe, dragHandle: F, zIndex: O })
      )
    );
  };
  return t.displayName = "NodeWrapper", C.memo(t);
};
const ES = (e) => {
  const t = e.getNodes().filter((n) => n.selected);
  return {
    ...qs(t, e.nodeOrigin),
    transformString: `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`,
    userSelectionActive: e.userSelectionActive
  };
};
function NS({ onSelectionContextMenu: e, noPanClassName: t, disableKeyboardA11y: n }) {
  const r = ke(), { width: o, height: i, x: s, y: l, transformString: a, userSelectionActive: u } = le(ES, Ce), c = qm(), f = C.useRef(null);
  if (C.useEffect(() => {
    var x;
    n || (x = f.current) == null || x.focus({
      preventScroll: !0
    });
  }, [n]), Gm({
    nodeRef: f
  }), u || !o || !i)
    return null;
  const d = e ? (x) => {
    const y = r.getState().getNodes().filter((E) => E.selected);
    e(x, y);
  } : void 0, p = (x) => {
    Object.prototype.hasOwnProperty.call(Tr, x.key) && c({
      x: Tr[x.key].x,
      y: Tr[x.key].y,
      isShiftPressed: x.shiftKey
    });
  };
  return I.createElement(
    "div",
    { className: je(["react-flow__nodesselection", "react-flow__container", t]), style: {
      transform: a
    } },
    I.createElement("div", { ref: f, className: "react-flow__nodesselection-rect", onContextMenu: d, tabIndex: n ? void 0 : -1, onKeyDown: n ? void 0 : p, style: {
      width: o,
      height: i,
      top: l,
      left: s
    } })
  );
}
var CS = C.memo(NS);
const zS = (e) => e.nodesSelectionActive, Qm = ({ children: e, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, deleteKeyCode: l, onMove: a, onMoveStart: u, onMoveEnd: c, selectionKeyCode: f, selectionOnDrag: d, selectionMode: p, onSelectionStart: x, onSelectionEnd: y, multiSelectionKeyCode: E, panActivationKeyCode: h, zoomActivationKeyCode: m, elementsSelectable: g, zoomOnScroll: w, zoomOnPinch: N, panOnScroll: P, panOnScrollSpeed: T, panOnScrollMode: M, zoomOnDoubleClick: k, panOnDrag: A, defaultViewport: F, translateExtent: O, minZoom: H, maxZoom: _, preventScrolling: $, onSelectionContextMenu: z, noWheelClassName: L, noPanClassName: j, disableKeyboardA11y: S }) => {
  const R = le(zS), D = qo(f), b = qo(h), B = b || A, U = b || P, Y = D || d && B !== !0;
  return fS({ deleteKeyCode: l, multiSelectionKeyCode: E }), I.createElement(
    mS,
    { onMove: a, onMoveStart: u, onMoveEnd: c, onPaneContextMenu: i, elementsSelectable: g, zoomOnScroll: w, zoomOnPinch: N, panOnScroll: U, panOnScrollSpeed: T, panOnScrollMode: M, zoomOnDoubleClick: k, panOnDrag: !D && B, defaultViewport: F, translateExtent: O, minZoom: H, maxZoom: _, zoomActivationKeyCode: m, preventScrolling: $, noWheelClassName: L, noPanClassName: j },
    I.createElement(
      Ym,
      { onSelectionStart: x, onSelectionEnd: y, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, panOnDrag: B, isSelecting: !!Y, selectionMode: p },
      e,
      R && I.createElement(CS, { onSelectionContextMenu: z, noPanClassName: j, disableKeyboardA11y: S })
    )
  );
};
Qm.displayName = "FlowRenderer";
var PS = C.memo(Qm);
function MS(e) {
  return le(C.useCallback((n) => e ? Pm(n.nodeInternals, { x: 0, y: 0, width: n.width, height: n.height }, n.transform, !0) : n.getNodes(), [e]));
}
function TS(e) {
  const t = {
    input: ao(e.input || Lm),
    default: ao(e.default || Wa),
    output: ao(e.output || Fm),
    group: ao(e.group || ic)
  }, n = {}, r = Object.keys(e).filter((o) => !["input", "default", "output", "group"].includes(o)).reduce((o, i) => (o[i] = ao(e[i] || Wa), o), n);
  return {
    ...t,
    ...r
  };
}
const jS = ({ x: e, y: t, width: n, height: r, origin: o }) => !n || !r ? { x: e, y: t } : o[0] < 0 || o[1] < 0 || o[0] > 1 || o[1] > 1 ? { x: e, y: t } : {
  x: e - n * o[0],
  y: t - r * o[1]
}, AS = (e) => ({
  nodesDraggable: e.nodesDraggable,
  nodesConnectable: e.nodesConnectable,
  nodesFocusable: e.nodesFocusable,
  elementsSelectable: e.elementsSelectable,
  updateNodeDimensions: e.updateNodeDimensions,
  onError: e.onError
}), Zm = (e) => {
  const { nodesDraggable: t, nodesConnectable: n, nodesFocusable: r, elementsSelectable: o, updateNodeDimensions: i, onError: s } = le(AS, Ce), l = MS(e.onlyRenderVisibleElements), a = C.useRef(), u = C.useMemo(() => {
    if (typeof ResizeObserver > "u")
      return null;
    const c = new ResizeObserver((f) => {
      const d = f.map((p) => ({
        id: p.target.getAttribute("data-id"),
        nodeElement: p.target,
        forceUpdate: !0
      }));
      i(d);
    });
    return a.current = c, c;
  }, []);
  return C.useEffect(() => () => {
    var c;
    (c = a == null ? void 0 : a.current) == null || c.disconnect();
  }, []), I.createElement("div", { className: "react-flow__nodes", style: lc }, l.map((c) => {
    var N, P, T;
    let f = c.type || "default";
    e.nodeTypes[f] || (s == null || s("003", Gt.error003(f)), f = "default");
    const d = e.nodeTypes[f] || e.nodeTypes.default, p = !!(c.draggable || t && typeof c.draggable > "u"), x = !!(c.selectable || o && typeof c.selectable > "u"), y = !!(c.connectable || n && typeof c.connectable > "u"), E = !!(c.focusable || r && typeof c.focusable > "u"), h = e.nodeExtent ? Ju(c.positionAbsolute, e.nodeExtent) : c.positionAbsolute, m = (h == null ? void 0 : h.x) ?? 0, g = (h == null ? void 0 : h.y) ?? 0, w = jS({
      x: m,
      y: g,
      width: c.width ?? 0,
      height: c.height ?? 0,
      origin: e.nodeOrigin
    });
    return I.createElement(d, { key: c.id, id: c.id, className: c.className, style: c.style, type: f, data: c.data, sourcePosition: c.sourcePosition || K.Bottom, targetPosition: c.targetPosition || K.Top, hidden: c.hidden, xPos: m, yPos: g, xPosOrigin: w.x, yPosOrigin: w.y, selectNodesOnDrag: e.selectNodesOnDrag, onClick: e.onNodeClick, onMouseEnter: e.onNodeMouseEnter, onMouseMove: e.onNodeMouseMove, onMouseLeave: e.onNodeMouseLeave, onContextMenu: e.onNodeContextMenu, onDoubleClick: e.onNodeDoubleClick, selected: !!c.selected, isDraggable: p, isSelectable: x, isConnectable: y, isFocusable: E, resizeObserver: u, dragHandle: c.dragHandle, zIndex: ((N = c[me]) == null ? void 0 : N.z) ?? 0, isParent: !!((P = c[me]) != null && P.isParent), noDragClassName: e.noDragClassName, noPanClassName: e.noPanClassName, initialized: !!c.width && !!c.height, rfId: e.rfId, disableKeyboardA11y: e.disableKeyboardA11y, ariaLabel: c.ariaLabel, hasHandleBounds: !!((T = c[me]) != null && T.handleBounds) });
  }));
};
Zm.displayName = "NodeRenderer";
var RS = C.memo(Zm);
const $S = (e, t, n) => n === K.Left ? e - t : n === K.Right ? e + t : e, IS = (e, t, n) => n === K.Top ? e - t : n === K.Bottom ? e + t : e, ld = "react-flow__edgeupdater", ad = ({ position: e, centerX: t, centerY: n, radius: r = 10, onMouseDown: o, onMouseEnter: i, onMouseOut: s, type: l }) => I.createElement("circle", { onMouseDown: o, onMouseEnter: i, onMouseOut: s, className: je([ld, `${ld}-${l}`]), cx: $S(t, r, e), cy: IS(n, r, e), r, stroke: "transparent", fill: "transparent" }), DS = () => !0;
var lr = (e) => {
  const t = ({ id: n, className: r, type: o, data: i, onClick: s, onEdgeDoubleClick: l, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: x, labelBgBorderRadius: y, style: E, source: h, target: m, sourceX: g, sourceY: w, targetX: N, targetY: P, sourcePosition: T, targetPosition: M, elementsSelectable: k, hidden: A, sourceHandleId: F, targetHandleId: O, onContextMenu: H, onMouseEnter: _, onMouseMove: $, onMouseLeave: z, reconnectRadius: L, onReconnect: j, onReconnectStart: S, onReconnectEnd: R, markerEnd: D, markerStart: b, rfId: B, ariaLabel: U, isFocusable: Y, isReconnectable: q, pathOptions: Q, interactionWidth: re, disableKeyboardA11y: ne }) => {
    const te = C.useRef(null), [ze, we] = C.useState(!1), [Oe, Ae] = C.useState(!1), ge = ke(), qe = C.useMemo(() => `url('#${Ba(b, B)}')`, [b, B]), ie = C.useMemo(() => `url('#${Ba(D, B)}')`, [D, B]);
    if (A)
      return null;
    const G = (Re) => {
      var Nt;
      const { edges: pt, addSelectedEdges: zn, unselectNodesAndEdges: Pn, multiSelectionActive: Mn } = ge.getState(), It = pt.find((Kr) => Kr.id === n);
      It && (k && (ge.setState({ nodesSelectionActive: !1 }), It.selected && Mn ? (Pn({ nodes: [], edges: [It] }), (Nt = te.current) == null || Nt.blur()) : zn([n])), s && s(Re, It));
    }, Fe = so(n, ge.getState, l), Rt = so(n, ge.getState, H), Yr = so(n, ge.getState, _), Zn = so(n, ge.getState, $), Jn = so(n, ge.getState, z), $t = (Re, pt) => {
      if (Re.button !== 0)
        return;
      const { edges: zn, isValidConnection: Pn } = ge.getState(), Mn = pt ? m : h, It = (pt ? O : F) || null, Nt = pt ? "target" : "source", Kr = Pn || DS, Zs = pt, Gr = zn.find((Tn) => Tn.id === n);
      Ae(!0), S == null || S(Re, Gr, Nt);
      const Js = (Tn) => {
        Ae(!1), R == null || R(Tn, Gr, Nt);
      };
      Rm({
        event: Re,
        handleId: It,
        nodeId: Mn,
        onConnect: (Tn) => j == null ? void 0 : j(Gr, Tn),
        isTarget: Zs,
        getState: ge.getState,
        setState: ge.setState,
        isValidConnection: Kr,
        edgeUpdaterType: Nt,
        onReconnectEnd: Js
      });
    }, er = (Re) => $t(Re, !0), Nn = (Re) => $t(Re, !1), Cn = () => we(!0), tr = () => we(!1), nr = !k && !s, Xr = (Re) => {
      var pt;
      if (!ne && _m.includes(Re.key) && k) {
        const { unselectNodesAndEdges: zn, addSelectedEdges: Pn, edges: Mn } = ge.getState();
        Re.key === "Escape" ? ((pt = te.current) == null || pt.blur(), zn({ edges: [Mn.find((Nt) => Nt.id === n)] })) : Pn([n]);
      }
    };
    return I.createElement(
      "g",
      { className: je([
        "react-flow__edge",
        `react-flow__edge-${o}`,
        r,
        { selected: a, animated: u, inactive: nr, updating: ze }
      ]), onClick: G, onDoubleClick: Fe, onContextMenu: Rt, onMouseEnter: Yr, onMouseMove: Zn, onMouseLeave: Jn, onKeyDown: Y ? Xr : void 0, tabIndex: Y ? 0 : void 0, role: Y ? "button" : "img", "data-testid": `rf__edge-${n}`, "aria-label": U === null ? void 0 : U || `Edge from ${h} to ${m}`, "aria-describedby": Y ? `${Vm}-${B}` : void 0, ref: te },
      !Oe && I.createElement(e, { id: n, source: h, target: m, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: x, labelBgBorderRadius: y, data: i, style: E, sourceX: g, sourceY: w, targetX: N, targetY: P, sourcePosition: T, targetPosition: M, sourceHandleId: F, targetHandleId: O, markerStart: qe, markerEnd: ie, pathOptions: Q, interactionWidth: re }),
      q && I.createElement(
        I.Fragment,
        null,
        (q === "source" || q === !0) && I.createElement(ad, { position: T, centerX: g, centerY: w, radius: L, onMouseDown: er, onMouseEnter: Cn, onMouseOut: tr, type: "source" }),
        (q === "target" || q === !0) && I.createElement(ad, { position: M, centerX: N, centerY: P, radius: L, onMouseDown: Nn, onMouseEnter: Cn, onMouseOut: tr, type: "target" })
      )
    );
  };
  return t.displayName = "EdgeWrapper", C.memo(t);
};
function LS(e) {
  const t = {
    default: lr(e.default || Ns),
    straight: lr(e.bezier || nc),
    step: lr(e.step || tc),
    smoothstep: lr(e.step || Gs),
    simplebezier: lr(e.simplebezier || ec)
  }, n = {}, r = Object.keys(e).filter((o) => !["default", "bezier"].includes(o)).reduce((o, i) => (o[i] = lr(e[i] || Ns), o), n);
  return {
    ...t,
    ...r
  };
}
function ud(e, t, n = null) {
  const r = ((n == null ? void 0 : n.x) || 0) + t.x, o = ((n == null ? void 0 : n.y) || 0) + t.y, i = (n == null ? void 0 : n.width) || t.width, s = (n == null ? void 0 : n.height) || t.height;
  switch (e) {
    case K.Top:
      return {
        x: r + i / 2,
        y: o
      };
    case K.Right:
      return {
        x: r + i,
        y: o + s / 2
      };
    case K.Bottom:
      return {
        x: r + i / 2,
        y: o + s
      };
    case K.Left:
      return {
        x: r,
        y: o + s / 2
      };
  }
}
function cd(e, t) {
  return e ? e.length === 1 || !t ? e[0] : t && e.find((n) => n.id === t) || null : null;
}
const OS = (e, t, n, r, o, i) => {
  const s = ud(n, e, t), l = ud(i, r, o);
  return {
    sourceX: s.x,
    sourceY: s.y,
    targetX: l.x,
    targetY: l.y
  };
};
function FS({ sourcePos: e, targetPos: t, sourceWidth: n, sourceHeight: r, targetWidth: o, targetHeight: i, width: s, height: l, transform: a }) {
  const u = {
    x: Math.min(e.x, t.x),
    y: Math.min(e.y, t.y),
    x2: Math.max(e.x + n, t.x + o),
    y2: Math.max(e.y + r, t.y + i)
  };
  u.x === u.x2 && (u.x2 += 1), u.y === u.y2 && (u.y2 += 1);
  const c = Ko({
    x: (0 - a[0]) / a[2],
    y: (0 - a[1]) / a[2],
    width: s / a[2],
    height: l / a[2]
  }), f = Math.max(0, Math.min(c.x2, u.x2) - Math.max(c.x, u.x)), d = Math.max(0, Math.min(c.y2, u.y2) - Math.max(c.y, u.y));
  return Math.ceil(f * d) > 0;
}
function fd(e) {
  var r, o, i, s, l;
  const t = ((r = e == null ? void 0 : e[me]) == null ? void 0 : r.handleBounds) || null, n = t && (e == null ? void 0 : e.width) && (e == null ? void 0 : e.height) && typeof ((o = e == null ? void 0 : e.positionAbsolute) == null ? void 0 : o.x) < "u" && typeof ((i = e == null ? void 0 : e.positionAbsolute) == null ? void 0 : i.y) < "u";
  return [
    {
      x: ((s = e == null ? void 0 : e.positionAbsolute) == null ? void 0 : s.x) || 0,
      y: ((l = e == null ? void 0 : e.positionAbsolute) == null ? void 0 : l.y) || 0,
      width: (e == null ? void 0 : e.width) || 0,
      height: (e == null ? void 0 : e.height) || 0
    },
    t,
    !!n
  ];
}
const bS = [{ level: 0, isMaxLevel: !0, edges: [] }];
function HS(e, t, n = !1) {
  let r = -1;
  const o = e.reduce((s, l) => {
    var c, f;
    const a = at(l.zIndex);
    let u = a ? l.zIndex : 0;
    if (n) {
      const d = t.get(l.target), p = t.get(l.source), x = l.selected || (d == null ? void 0 : d.selected) || (p == null ? void 0 : p.selected), y = Math.max(((c = p == null ? void 0 : p[me]) == null ? void 0 : c.z) || 0, ((f = d == null ? void 0 : d[me]) == null ? void 0 : f.z) || 0, 1e3);
      u = (a ? l.zIndex : 0) + (x ? y : 0);
    }
    return s[u] ? s[u].push(l) : s[u] = [l], r = u > r ? u : r, s;
  }, {}), i = Object.entries(o).map(([s, l]) => {
    const a = +s;
    return {
      edges: l,
      level: a,
      isMaxLevel: a === r
    };
  });
  return i.length === 0 ? bS : i;
}
function VS(e, t, n) {
  const r = le(C.useCallback((o) => e ? o.edges.filter((i) => {
    const s = t.get(i.source), l = t.get(i.target);
    return (s == null ? void 0 : s.width) && (s == null ? void 0 : s.height) && (l == null ? void 0 : l.width) && (l == null ? void 0 : l.height) && FS({
      sourcePos: s.positionAbsolute || { x: 0, y: 0 },
      targetPos: l.positionAbsolute || { x: 0, y: 0 },
      sourceWidth: s.width,
      sourceHeight: s.height,
      targetWidth: l.width,
      targetHeight: l.height,
      width: o.width,
      height: o.height,
      transform: o.transform
    });
  }) : o.edges, [e, t]));
  return HS(r, t, n);
}
const BS = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", points: "-5,-4 0,0 -5,4" }), US = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  fill: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" }), dd = {
  [Es.Arrow]: BS,
  [Es.ArrowClosed]: US
};
function WS(e) {
  const t = ke();
  return C.useMemo(() => {
    var o, i;
    return Object.prototype.hasOwnProperty.call(dd, e) ? dd[e] : ((i = (o = t.getState()).onError) == null || i.call(o, "009", Gt.error009(e)), null);
  }, [e]);
}
const YS = ({ id: e, type: t, color: n, width: r = 12.5, height: o = 12.5, markerUnits: i = "strokeWidth", strokeWidth: s, orient: l = "auto-start-reverse" }) => {
  const a = WS(t);
  return a ? I.createElement(
    "marker",
    { className: "react-flow__arrowhead", id: e, markerWidth: `${r}`, markerHeight: `${o}`, viewBox: "-10 -10 20 20", markerUnits: i, orient: l, refX: "0", refY: "0" },
    I.createElement(a, { color: n, strokeWidth: s })
  ) : null;
}, XS = ({ defaultColor: e, rfId: t }) => (n) => {
  const r = [];
  return n.edges.reduce((o, i) => ([i.markerStart, i.markerEnd].forEach((s) => {
    if (s && typeof s == "object") {
      const l = Ba(s, t);
      r.includes(l) || (o.push({ id: l, color: s.color || e, ...s }), r.push(l));
    }
  }), o), []).sort((o, i) => String(o && o.id || '').localeCompare(String(i && i.id || '')));
}, Jm = ({ defaultColor: e, rfId: t }) => {
  const n = le(
    C.useCallback(XS({ defaultColor: e, rfId: t }), [e, t]),
    // the id includes all marker options, so we just need to look at that part of the marker
    (r, o) => !(r.length !== o.length || r.some((i, s) => i.id !== o[s].id))
  );
  return I.createElement("defs", null, n.map((r) => I.createElement(YS, { id: r.id, key: r.id, type: r.type, color: r.color, width: r.width, height: r.height, markerUnits: r.markerUnits, strokeWidth: r.strokeWidth, orient: r.orient })));
};
Jm.displayName = "MarkerDefinitions";
var KS = C.memo(Jm);
const GS = (e) => ({
  nodesConnectable: e.nodesConnectable,
  edgesFocusable: e.edgesFocusable,
  edgesUpdatable: e.edgesUpdatable,
  elementsSelectable: e.elementsSelectable,
  width: e.width,
  height: e.height,
  connectionMode: e.connectionMode,
  nodeInternals: e.nodeInternals,
  onError: e.onError
}), eg = ({ defaultMarkerColor: e, onlyRenderVisibleElements: t, elevateEdgesOnSelect: n, rfId: r, edgeTypes: o, noPanClassName: i, onEdgeContextMenu: s, onEdgeMouseEnter: l, onEdgeMouseMove: a, onEdgeMouseLeave: u, onEdgeClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: x, reconnectRadius: y, children: E, disableKeyboardA11y: h }) => {
  const { edgesFocusable: m, edgesUpdatable: g, elementsSelectable: w, width: N, height: P, connectionMode: T, nodeInternals: M, onError: k } = le(GS, Ce), A = VS(t, M, n);
  return N ? I.createElement(
    I.Fragment,
    null,
    A.map(({ level: F, edges: O, isMaxLevel: H }) => I.createElement(
      "svg",
      { key: F, style: { zIndex: F }, width: N, height: P, className: "react-flow__edges react-flow__container" },
      H && I.createElement(KS, { defaultColor: e, rfId: r }),
      I.createElement("g", null, O.map((_) => {
        const [$, z, L] = fd(M.get(_.source)), [j, S, R] = fd(M.get(_.target));
        if (!L || !R)
          return null;
        let D = _.type || "default";
        o[D] || (k == null || k("011", Gt.error011(D)), D = "default");
        const b = o[D] || o.default, B = T === Gn.Strict ? S.target : (S.target ?? []).concat(S.source ?? []), U = cd(z.source, _.sourceHandle), Y = cd(B, _.targetHandle), q = (U == null ? void 0 : U.position) || K.Bottom, Q = (Y == null ? void 0 : Y.position) || K.Top, re = !!(_.focusable || m && typeof _.focusable > "u"), ne = _.reconnectable || _.updatable, te = typeof d < "u" && (ne || g && typeof ne > "u");
        if (!U || !Y)
          return k == null || k("008", Gt.error008(U, _)), null;
        const { sourceX: ze, sourceY: we, targetX: Oe, targetY: Ae } = OS($, U, q, j, Y, Q);
        return I.createElement(b, { key: _.id, id: _.id, className: je([_.className, i]), type: D, data: _.data, selected: !!_.selected, animated: !!_.animated, hidden: !!_.hidden, label: _.label, labelStyle: _.labelStyle, labelShowBg: _.labelShowBg, labelBgStyle: _.labelBgStyle, labelBgPadding: _.labelBgPadding, labelBgBorderRadius: _.labelBgBorderRadius, style: _.style, source: _.source, target: _.target, sourceHandleId: _.sourceHandle, targetHandleId: _.targetHandle, markerEnd: _.markerEnd, markerStart: _.markerStart, sourceX: ze, sourceY: we, targetX: Oe, targetY: Ae, sourcePosition: q, targetPosition: Q, elementsSelectable: w, onContextMenu: s, onMouseEnter: l, onMouseMove: a, onMouseLeave: u, onClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: x, reconnectRadius: y, rfId: r, ariaLabel: _.ariaLabel, isFocusable: re, isReconnectable: te, pathOptions: "pathOptions" in _ ? _.pathOptions : void 0, interactionWidth: _.interactionWidth, disableKeyboardA11y: h });
      }))
    )),
    E
  ) : null;
};
eg.displayName = "EdgeRenderer";
var qS = C.memo(eg);
const QS = (e) => `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`;
function ZS({ children: e }) {
  const t = le(QS);
  return I.createElement("div", { className: "react-flow__viewport react-flow__container", style: { transform: t } }, e);
}
function JS(e) {
  const t = sc(), n = C.useRef(!1);
  C.useEffect(() => {
    !n.current && t.viewportInitialized && e && (setTimeout(() => e(t), 1), n.current = !0);
  }, [e, t.viewportInitialized]);
}
const ek = {
  [K.Left]: K.Right,
  [K.Right]: K.Left,
  [K.Top]: K.Bottom,
  [K.Bottom]: K.Top
}, tg = ({ nodeId: e, handleType: t, style: n, type: r = ln.Bezier, CustomComponent: o, connectionStatus: i }) => {
  var P, T, M;
  const { fromNode: s, handleId: l, toX: a, toY: u, connectionMode: c } = le(C.useCallback((k) => ({
    fromNode: k.nodeInternals.get(e),
    handleId: k.connectionHandleId,
    toX: (k.connectionPosition.x - k.transform[0]) / k.transform[2],
    toY: (k.connectionPosition.y - k.transform[1]) / k.transform[2],
    connectionMode: k.connectionMode
  }), [e]), Ce), f = (P = s == null ? void 0 : s[me]) == null ? void 0 : P.handleBounds;
  let d = f == null ? void 0 : f[t];
  if (c === Gn.Loose && (d = d || (f == null ? void 0 : f[t === "source" ? "target" : "source"])), !s || !d)
    return null;
  const p = l ? d.find((k) => k.id === l) : d[0], x = p ? p.x + p.width / 2 : (s.width ?? 0) / 2, y = p ? p.y + p.height / 2 : s.height ?? 0, E = (((T = s.positionAbsolute) == null ? void 0 : T.x) ?? 0) + x, h = (((M = s.positionAbsolute) == null ? void 0 : M.y) ?? 0) + y, m = p == null ? void 0 : p.position, g = m ? ek[m] : null;
  if (!m || !g)
    return null;
  if (o)
    return I.createElement(o, { connectionLineType: r, connectionLineStyle: n, fromNode: s, fromHandle: p, fromX: E, fromY: h, toX: a, toY: u, fromPosition: m, toPosition: g, connectionStatus: i });
  let w = "";
  const N = {
    sourceX: E,
    sourceY: h,
    sourcePosition: m,
    targetX: a,
    targetY: u,
    targetPosition: g
  };
  return r === ln.Bezier ? [w] = Cm(N) : r === ln.Step ? [w] = Va({
    ...N,
    borderRadius: 0
  }) : r === ln.SmoothStep ? [w] = Va(N) : r === ln.SimpleBezier ? [w] = Nm(N) : w = `M${E},${h} ${a},${u}`, I.createElement("path", { d: w, fill: "none", className: "react-flow__connection-path", style: n });
};
tg.displayName = "ConnectionLine";
const tk = (e) => ({
  nodeId: e.connectionNodeId,
  handleType: e.connectionHandleType,
  nodesConnectable: e.nodesConnectable,
  connectionStatus: e.connectionStatus,
  width: e.width,
  height: e.height
});
function nk({ containerStyle: e, style: t, type: n, component: r }) {
  const { nodeId: o, handleType: i, nodesConnectable: s, width: l, height: a, connectionStatus: u } = le(tk, Ce);
  return !(o && i && l && s) ? null : I.createElement(
    "svg",
    { style: e, width: l, height: a, className: "react-flow__edges react-flow__connectionline react-flow__container" },
    I.createElement(
      "g",
      { className: je(["react-flow__connection", u]) },
      I.createElement(tg, { nodeId: o, handleType: i, style: t, type: n, CustomComponent: r, connectionStatus: u })
    )
  );
}
function pd(e, t) {
  return C.useRef(null), ke(), C.useMemo(() => t(e), [e]);
}
const ng = ({ nodeTypes: e, edgeTypes: t, onMove: n, onMoveStart: r, onMoveEnd: o, onInit: i, onNodeClick: s, onEdgeClick: l, onNodeDoubleClick: a, onEdgeDoubleClick: u, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, onSelectionContextMenu: x, onSelectionStart: y, onSelectionEnd: E, connectionLineType: h, connectionLineStyle: m, connectionLineComponent: g, connectionLineContainerStyle: w, selectionKeyCode: N, selectionOnDrag: P, selectionMode: T, multiSelectionKeyCode: M, panActivationKeyCode: k, zoomActivationKeyCode: A, deleteKeyCode: F, onlyRenderVisibleElements: O, elementsSelectable: H, selectNodesOnDrag: _, defaultViewport: $, translateExtent: z, minZoom: L, maxZoom: j, preventScrolling: S, defaultMarkerColor: R, zoomOnScroll: D, zoomOnPinch: b, panOnScroll: B, panOnScrollSpeed: U, panOnScrollMode: Y, zoomOnDoubleClick: q, panOnDrag: Q, onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: ze, onPaneScroll: we, onPaneContextMenu: Oe, onEdgeContextMenu: Ae, onEdgeMouseEnter: ge, onEdgeMouseMove: qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: Yr, noDragClassName: Zn, noWheelClassName: Jn, noPanClassName: $t, elevateEdgesOnSelect: er, disableKeyboardA11y: Nn, nodeOrigin: Cn, nodeExtent: tr, rfId: nr }) => {
  const Xr = pd(e, TS), Re = pd(t, LS);
  return JS(i), I.createElement(
    PS,
    { onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: ze, onPaneContextMenu: Oe, onPaneScroll: we, deleteKeyCode: F, selectionKeyCode: N, selectionOnDrag: P, selectionMode: T, onSelectionStart: y, onSelectionEnd: E, multiSelectionKeyCode: M, panActivationKeyCode: k, zoomActivationKeyCode: A, elementsSelectable: H, onMove: n, onMoveStart: r, onMoveEnd: o, zoomOnScroll: D, zoomOnPinch: b, zoomOnDoubleClick: q, panOnScroll: B, panOnScrollSpeed: U, panOnScrollMode: Y, panOnDrag: Q, defaultViewport: $, translateExtent: z, minZoom: L, maxZoom: j, onSelectionContextMenu: x, preventScrolling: S, noDragClassName: Zn, noWheelClassName: Jn, noPanClassName: $t, disableKeyboardA11y: Nn },
    I.createElement(
      ZS,
      null,
      I.createElement(
        qS,
        { edgeTypes: Re, onEdgeClick: l, onEdgeDoubleClick: u, onlyRenderVisibleElements: O, onEdgeContextMenu: Ae, onEdgeMouseEnter: ge, onEdgeMouseMove: qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: Yr, defaultMarkerColor: R, noPanClassName: $t, elevateEdgesOnSelect: !!er, disableKeyboardA11y: Nn, rfId: nr },
        I.createElement(nk, { style: m, type: h, component: g, containerStyle: w })
      ),
      I.createElement("div", { className: "react-flow__edgelabel-renderer" }),
      I.createElement(RS, { nodeTypes: Xr, onNodeClick: s, onNodeDoubleClick: a, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, selectNodesOnDrag: _, onlyRenderVisibleElements: O, noPanClassName: $t, noDragClassName: Zn, disableKeyboardA11y: Nn, nodeOrigin: Cn, nodeExtent: tr, rfId: nr })
    )
  );
};
ng.displayName = "GraphView";
var rk = C.memo(ng);
const Xa = [
  [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
], Zt = {
  rfId: "1",
  width: 0,
  height: 0,
  transform: [0, 0, 1],
  nodeInternals: /* @__PURE__ */ new Map(),
  edges: [],
  onNodesChange: null,
  onEdgesChange: null,
  hasDefaultNodes: !1,
  hasDefaultEdges: !1,
  d3Zoom: null,
  d3Selection: null,
  d3ZoomHandler: void 0,
  minZoom: 0.5,
  maxZoom: 2,
  translateExtent: Xa,
  nodeExtent: Xa,
  nodesSelectionActive: !1,
  userSelectionActive: !1,
  userSelectionRect: null,
  connectionNodeId: null,
  connectionHandleId: null,
  connectionHandleType: "source",
  connectionPosition: { x: 0, y: 0 },
  connectionStatus: null,
  connectionMode: Gn.Strict,
  domNode: null,
  paneDragging: !1,
  noPanClassName: "nopan",
  nodeOrigin: [0, 0],
  nodeDragThreshold: 0,
  snapGrid: [15, 15],
  snapToGrid: !1,
  nodesDraggable: !0,
  nodesConnectable: !0,
  nodesFocusable: !0,
  edgesFocusable: !0,
  edgesUpdatable: !0,
  elementsSelectable: !0,
  elevateNodesOnSelect: !0,
  fitViewOnInit: !1,
  fitViewOnInitDone: !1,
  fitViewOnInitOptions: void 0,
  onSelectionChange: [],
  multiSelectionActive: !1,
  connectionStartHandle: null,
  connectionEndHandle: null,
  connectionClickStartHandle: null,
  connectOnClick: !0,
  ariaLiveMessage: "",
  autoPanOnConnect: !0,
  autoPanOnNodeDrag: !0,
  connectionRadius: 20,
  onError: T_,
  isValidConnection: void 0
}, ok = () => Wv((e, t) => ({
  ...Zt,
  setNodes: (n) => {
    const { nodeInternals: r, nodeOrigin: o, elevateNodesOnSelect: i } = t();
    e({ nodeInternals: Rl(n, r, o, i) });
  },
  getNodes: () => Array.from(t().nodeInternals.values()),
  setEdges: (n) => {
    const { defaultEdgeOptions: r = {} } = t();
    e({ edges: n.map((o) => ({ ...r, ...o })) });
  },
  setDefaultNodesAndEdges: (n, r) => {
    const o = typeof n < "u", i = typeof r < "u", s = o ? Rl(n, /* @__PURE__ */ new Map(), t().nodeOrigin, t().elevateNodesOnSelect) : /* @__PURE__ */ new Map();
    e({ nodeInternals: s, edges: i ? r : [], hasDefaultNodes: o, hasDefaultEdges: i });
  },
  updateNodeDimensions: (n) => {
    const { onNodesChange: r, nodeInternals: o, fitViewOnInit: i, fitViewOnInitDone: s, fitViewOnInitOptions: l, domNode: a, nodeOrigin: u } = t(), c = a == null ? void 0 : a.querySelector(".react-flow__viewport");
    if (!c)
      return;
    const f = window.getComputedStyle(c), { m22: d } = new window.DOMMatrixReadOnly(f.transform), p = n.reduce((y, E) => {
      const h = o.get(E.id);
      if (h != null && h.hidden)
        o.set(h.id, {
          ...h,
          [me]: {
            ...h[me],
            // we need to reset the handle bounds when the node is hidden
            // in order to force a new observation when the node is shown again
            handleBounds: void 0
          }
        });
      else if (h) {
        const m = Zu(E.nodeElement);
        !!(m.width && m.height && (h.width !== m.width || h.height !== m.height || E.forceUpdate)) && (o.set(h.id, {
          ...h,
          [me]: {
            ...h[me],
            handleBounds: {
              source: sd(".source", E.nodeElement, d, u),
              target: sd(".target", E.nodeElement, d, u)
            }
          },
          ...m
        }), y.push({
          id: h.id,
          type: "dimensions",
          dimensions: m
        }));
      }
      return y;
    }, []);
    Um(o, u);
    const x = s || i && !s && Wm(t, { initial: !0, ...l });
    e({ nodeInternals: new Map(o), fitViewOnInitDone: x }), (p == null ? void 0 : p.length) > 0 && (r == null || r(p));
  },
  updateNodePositions: (n, r = !0, o = !1) => {
    const { triggerNodeChanges: i } = t(), s = n.map((l) => {
      const a = {
        id: l.id,
        type: "position",
        dragging: o
      };
      return r && (a.positionAbsolute = l.positionAbsolute, a.position = l.position), a;
    });
    i(s);
  },
  triggerNodeChanges: (n) => {
    const { onNodesChange: r, nodeInternals: o, hasDefaultNodes: i, nodeOrigin: s, getNodes: l, elevateNodesOnSelect: a } = t();
    if (n != null && n.length) {
      if (i) {
        const u = wS(n, l()), c = Rl(u, o, s, a);
        e({ nodeInternals: c });
      }
      r == null || r(n);
    }
  },
  addSelectedNodes: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((a) => rn(a, !0)) : (s = _r(i(), n), l = _r(o, [])), Mi({
      changedNodes: s,
      changedEdges: l,
      get: t,
      set: e
    });
  },
  addSelectedEdges: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((a) => rn(a, !0)) : (s = _r(o, n), l = _r(i(), [])), Mi({
      changedNodes: l,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  unselectNodesAndEdges: ({ nodes: n, edges: r } = {}) => {
    const { edges: o, getNodes: i } = t(), s = n || i(), l = r || o, a = s.map((c) => (c.selected = !1, rn(c.id, !1))), u = l.map((c) => rn(c.id, !1));
    Mi({
      changedNodes: a,
      changedEdges: u,
      get: t,
      set: e
    });
  },
  setMinZoom: (n) => {
    const { d3Zoom: r, maxZoom: o } = t();
    r == null || r.scaleExtent([n, o]), e({ minZoom: n });
  },
  setMaxZoom: (n) => {
    const { d3Zoom: r, minZoom: o } = t();
    r == null || r.scaleExtent([o, n]), e({ maxZoom: n });
  },
  setTranslateExtent: (n) => {
    var r;
    (r = t().d3Zoom) == null || r.translateExtent(n), e({ translateExtent: n });
  },
  resetSelectedElements: () => {
    const { edges: n, getNodes: r } = t(), i = r().filter((l) => l.selected).map((l) => rn(l.id, !1)), s = n.filter((l) => l.selected).map((l) => rn(l.id, !1));
    Mi({
      changedNodes: i,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  setNodeExtent: (n) => {
    const { nodeInternals: r } = t();
    r.forEach((o) => {
      o.positionAbsolute = Ju(o.position, n);
    }), e({
      nodeExtent: n,
      nodeInternals: new Map(r)
    });
  },
  panBy: (n) => {
    const { transform: r, width: o, height: i, d3Zoom: s, d3Selection: l, translateExtent: a } = t();
    if (!s || !l || !n.x && !n.y)
      return !1;
    const u = Bt.translate(r[0] + n.x, r[1] + n.y).scale(r[2]), c = [
      [0, 0],
      [o, i]
    ], f = s == null ? void 0 : s.constrain()(u, c, a);
    return s.transform(l, f), r[0] !== f.x || r[1] !== f.y || r[2] !== f.k;
  },
  cancelConnection: () => e({
    connectionNodeId: Zt.connectionNodeId,
    connectionHandleId: Zt.connectionHandleId,
    connectionHandleType: Zt.connectionHandleType,
    connectionStatus: Zt.connectionStatus,
    connectionStartHandle: Zt.connectionStartHandle,
    connectionEndHandle: Zt.connectionEndHandle
  }),
  reset: () => e({ ...Zt })
}), Object.is), ac = ({ children: e }) => {
  const t = C.useRef(null);
  return t.current || (t.current = ok()), I.createElement(k_, { value: t.current }, e);
};
ac.displayName = "ReactFlowProvider";
const rg = ({ children: e }) => C.useContext(Ks) ? I.createElement(I.Fragment, null, e) : I.createElement(ac, null, e);
rg.displayName = "ReactFlowWrapper";
const ik = {
  input: Lm,
  default: Wa,
  output: Fm,
  group: ic
}, sk = {
  default: Ns,
  straight: nc,
  step: tc,
  smoothstep: Gs,
  simplebezier: ec
}, lk = [0, 0], ak = [15, 15], uk = { x: 0, y: 0, zoom: 1 }, ck = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  zIndex: 0
}, og = C.forwardRef(({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, className: o, nodeTypes: i = ik, edgeTypes: s = sk, onNodeClick: l, onEdgeClick: a, onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onConnect: p, onConnectStart: x, onConnectEnd: y, onClickConnectStart: E, onClickConnectEnd: h, onNodeMouseEnter: m, onNodeMouseMove: g, onNodeMouseLeave: w, onNodeContextMenu: N, onNodeDoubleClick: P, onNodeDragStart: T, onNodeDrag: M, onNodeDragStop: k, onNodesDelete: A, onEdgesDelete: F, onSelectionChange: O, onSelectionDragStart: H, onSelectionDrag: _, onSelectionDragStop: $, onSelectionContextMenu: z, onSelectionStart: L, onSelectionEnd: j, connectionMode: S = Gn.Strict, connectionLineType: R = ln.Bezier, connectionLineStyle: D, connectionLineComponent: b, connectionLineContainerStyle: B, deleteKeyCode: U = "Backspace", selectionKeyCode: Y = "Shift", selectionOnDrag: q = !1, selectionMode: Q = Go.Full, panActivationKeyCode: re = "Space", multiSelectionKeyCode: ne = ks() ? "Meta" : "Control", zoomActivationKeyCode: te = ks() ? "Meta" : "Control", snapToGrid: ze = !1, snapGrid: we = ak, onlyRenderVisibleElements: Oe = !1, selectNodesOnDrag: Ae = !0, nodesDraggable: ge, nodesConnectable: qe, nodesFocusable: ie, nodeOrigin: G = lk, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: Yr, defaultViewport: Zn = uk, minZoom: Jn = 0.5, maxZoom: $t = 2, translateExtent: er = Xa, preventScrolling: Nn = !0, nodeExtent: Cn, defaultMarkerColor: tr = "#b1b1b7", zoomOnScroll: nr = !0, zoomOnPinch: Xr = !0, panOnScroll: Re = !1, panOnScrollSpeed: pt = 0.5, panOnScrollMode: zn = On.Free, zoomOnDoubleClick: Pn = !0, panOnDrag: Mn = !0, onPaneClick: It, onPaneMouseEnter: Nt, onPaneMouseMove: Kr, onPaneMouseLeave: Zs, onPaneScroll: Gr, onPaneContextMenu: Js, children: fc, onEdgeContextMenu: Tn, onEdgeDoubleClick: mg, onEdgeMouseEnter: gg, onEdgeMouseMove: yg, onEdgeMouseLeave: vg, onEdgeUpdate: wg, onEdgeUpdateStart: xg, onEdgeUpdateEnd: _g, onReconnect: Sg, onReconnectStart: kg, onReconnectEnd: Eg, reconnectRadius: Ng = 10, edgeUpdaterRadius: Cg = 10, onNodesChange: zg, onEdgesChange: Pg, noDragClassName: Mg = "nodrag", noWheelClassName: Tg = "nowheel", noPanClassName: dc = "nopan", fitView: jg = !1, fitViewOptions: Ag, connectOnClick: Rg = !0, attributionPosition: $g, proOptions: Ig, defaultEdgeOptions: Dg, elevateNodesOnSelect: Lg = !0, elevateEdgesOnSelect: Og = !1, disableKeyboardA11y: pc = !1, autoPanOnConnect: Fg = !0, autoPanOnNodeDrag: bg = !0, connectionRadius: Hg = 20, isValidConnection: Vg, onError: Bg, style: Ug, id: hc, nodeDragThreshold: Wg, ...Yg }, Xg) => {
  const el = hc || "1";
  return I.createElement(
    "div",
    { ...Yg, style: { ...Ug, ...ck }, ref: Xg, className: je(["react-flow", o]), "data-testid": "rf__wrapper", id: hc },
    I.createElement(
      rg,
      null,
      I.createElement(rk, { onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onNodeClick: l, onEdgeClick: a, onNodeMouseEnter: m, onNodeMouseMove: g, onNodeMouseLeave: w, onNodeContextMenu: N, onNodeDoubleClick: P, nodeTypes: i, edgeTypes: s, connectionLineType: R, connectionLineStyle: D, connectionLineComponent: b, connectionLineContainerStyle: B, selectionKeyCode: Y, selectionOnDrag: q, selectionMode: Q, deleteKeyCode: U, multiSelectionKeyCode: ne, panActivationKeyCode: re, zoomActivationKeyCode: te, onlyRenderVisibleElements: Oe, selectNodesOnDrag: Ae, defaultViewport: Zn, translateExtent: er, minZoom: Jn, maxZoom: $t, preventScrolling: Nn, zoomOnScroll: nr, zoomOnPinch: Xr, zoomOnDoubleClick: Pn, panOnScroll: Re, panOnScrollSpeed: pt, panOnScrollMode: zn, panOnDrag: Mn, onPaneClick: It, onPaneMouseEnter: Nt, onPaneMouseMove: Kr, onPaneMouseLeave: Zs, onPaneScroll: Gr, onPaneContextMenu: Js, onSelectionContextMenu: z, onSelectionStart: L, onSelectionEnd: j, onEdgeContextMenu: Tn, onEdgeDoubleClick: mg, onEdgeMouseEnter: gg, onEdgeMouseMove: yg, onEdgeMouseLeave: vg, onReconnect: Sg ?? wg, onReconnectStart: kg ?? xg, onReconnectEnd: Eg ?? _g, reconnectRadius: Ng ?? Cg, defaultMarkerColor: tr, noDragClassName: Mg, noWheelClassName: Tg, noPanClassName: dc, elevateEdgesOnSelect: Og, rfId: el, disableKeyboardA11y: pc, nodeOrigin: G, nodeExtent: Cn }),
      I.createElement(J_, { nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: p, onConnectStart: x, onConnectEnd: y, onClickConnectStart: E, onClickConnectEnd: h, nodesDraggable: ge, nodesConnectable: qe, nodesFocusable: ie, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: Yr, elevateNodesOnSelect: Lg, minZoom: Jn, maxZoom: $t, nodeExtent: Cn, onNodesChange: zg, onEdgesChange: Pg, snapToGrid: ze, snapGrid: we, connectionMode: S, translateExtent: er, connectOnClick: Rg, defaultEdgeOptions: Dg, fitView: jg, fitViewOptions: Ag, onNodesDelete: A, onEdgesDelete: F, onNodeDragStart: T, onNodeDrag: M, onNodeDragStop: k, onSelectionDrag: _, onSelectionDragStart: H, onSelectionDragStop: $, noPanClassName: dc, nodeOrigin: G, rfId: el, autoPanOnConnect: Fg, autoPanOnNodeDrag: bg, onError: Bg, connectionRadius: Hg, isValidConnection: Vg, nodeDragThreshold: Wg }),
      I.createElement(Q_, { onSelectionChange: O }),
      fc,
      I.createElement(N_, { proOptions: Ig, position: $g }),
      I.createElement(oS, { rfId: el, disableKeyboardA11y: pc })
    )
  );
});
og.displayName = "ReactFlow";
const ig = ({ id: e, x: t, y: n, width: r, height: o, style: i, color: s, strokeColor: l, strokeWidth: a, className: u, borderRadius: c, shapeRendering: f, onClick: d, selected: p }) => {
  const { background: x, backgroundColor: y } = i || {}, E = s || x || y;
  return I.createElement("rect", { className: je(["react-flow__minimap-node", { selected: p }, u]), x: t, y: n, rx: c, ry: c, width: r, height: o, fill: E, stroke: l, strokeWidth: a, shapeRendering: f, onClick: d ? (h) => d(h, e) : void 0 });
};
ig.displayName = "MiniMapNode";
var fk = C.memo(ig);
const dk = (e) => e.nodeOrigin, pk = (e) => e.getNodes().filter((t) => !t.hidden && t.width && t.height), Ll = (e) => e instanceof Function ? e : () => e;
function hk({
  nodeStrokeColor: e = "transparent",
  nodeColor: t = "#e2e2e2",
  nodeClassName: n = "",
  nodeBorderRadius: r = 5,
  nodeStrokeWidth: o = 2,
  // We need to rename the prop to be `CapitalCase` so that JSX will render it as
  // a component properly.
  nodeComponent: i = fk,
  onClick: s
}) {
  const l = le(pk, Ce), a = le(dk), u = Ll(t), c = Ll(e), f = Ll(n), d = typeof window > "u" || window.chrome ? "crispEdges" : "geometricPrecision";
  return I.createElement(I.Fragment, null, l.map((p) => {
    const { x, y } = Vn(p, a).positionAbsolute;
    return I.createElement(i, { key: p.id, x, y, width: p.width, height: p.height, style: p.style, selected: p.selected, className: f(p), color: u(p), borderRadius: r, strokeColor: c(p), strokeWidth: o, shapeRendering: d, onClick: s, id: p.id });
  }));
}
var mk = C.memo(hk);
const gk = 200, yk = 150, vk = (e) => {
  const t = e.getNodes(), n = {
    x: -e.transform[0] / e.transform[2],
    y: -e.transform[1] / e.transform[2],
    width: e.width / e.transform[2],
    height: e.height / e.transform[2]
  };
  return {
    viewBB: n,
    boundingRect: t.length > 0 ? P_(qs(t, e.nodeOrigin), n) : n,
    rfId: e.rfId
  };
}, wk = "react-flow__minimap-desc";
function sg({
  style: e,
  className: t,
  nodeStrokeColor: n = "transparent",
  nodeColor: r = "#e2e2e2",
  nodeClassName: o = "",
  nodeBorderRadius: i = 5,
  nodeStrokeWidth: s = 2,
  // We need to rename the prop to be `CapitalCase` so that JSX will render it as
  // a component properly.
  nodeComponent: l,
  maskColor: a = "rgb(240, 240, 240, 0.6)",
  maskStrokeColor: u = "none",
  maskStrokeWidth: c = 1,
  position: f = "bottom-right",
  onClick: d,
  onNodeClick: p,
  pannable: x = !1,
  zoomable: y = !1,
  ariaLabel: E = "React Flow mini map",
  inversePan: h = !1,
  zoomStep: m = 10,
  offsetScale: g = 5
}) {
  const w = ke(), N = C.useRef(null), { boundingRect: P, viewBB: T, rfId: M } = le(vk, Ce), k = (e == null ? void 0 : e.width) ?? gk, A = (e == null ? void 0 : e.height) ?? yk, F = P.width / k, O = P.height / A, H = Math.max(F, O), _ = H * k, $ = H * A, z = g * H, L = P.x - (_ - P.width) / 2 - z, j = P.y - ($ - P.height) / 2 - z, S = _ + z * 2, R = $ + z * 2, D = `${wk}-${M}`, b = C.useRef(0);
  b.current = H, C.useEffect(() => {
    if (N.current) {
      const Y = st(N.current), q = (ne) => {
        const { transform: te, d3Selection: ze, d3Zoom: we } = w.getState();
        if (ne.sourceEvent.type !== "wheel" || !ze || !we)
          return;
        const Oe = -ne.sourceEvent.deltaY * (ne.sourceEvent.deltaMode === 1 ? 0.05 : ne.sourceEvent.deltaMode ? 1 : 2e-3) * m, Ae = te[2] * Math.pow(2, Oe);
        we.scaleTo(ze, Ae);
      }, Q = (ne) => {
        const { transform: te, d3Selection: ze, d3Zoom: we, translateExtent: Oe, width: Ae, height: ge } = w.getState();
        if (ne.sourceEvent.type !== "mousemove" || !ze || !we)
          return;
        const qe = b.current * Math.max(1, te[2]) * (h ? -1 : 1), ie = {
          x: te[0] - ne.sourceEvent.movementX * qe,
          y: te[1] - ne.sourceEvent.movementY * qe
        }, G = [
          [0, 0],
          [Ae, ge]
        ], Fe = Bt.translate(ie.x, ie.y).scale(te[2]), Rt = we.constrain()(Fe, G, Oe);
        we.transform(ze, Rt);
      }, re = mm().on("zoom", x ? Q : null).on("zoom.wheel", y ? q : null);
      return Y.call(re), () => {
        Y.on("zoom", null);
      };
    }
  }, [x, y, h, m]);
  const B = d ? (Y) => {
    const q = vt(Y);
    d(Y, { x: q[0], y: q[1] });
  } : void 0, U = p ? (Y, q) => {
    const Q = w.getState().nodeInternals.get(q);
    p(Y, Q);
  } : void 0;
  return I.createElement(
    Qu,
    { position: f, style: e, className: je(["react-flow__minimap", t]), "data-testid": "rf__minimap" },
    I.createElement(
      "svg",
      { width: k, height: A, viewBox: `${L} ${j} ${S} ${R}`, role: "img", "aria-labelledby": D, ref: N, onClick: B },
      E && I.createElement("title", { id: D }, E),
      I.createElement(mk, { onClick: U, nodeColor: r, nodeStrokeColor: n, nodeBorderRadius: i, nodeClassName: o, nodeStrokeWidth: s, nodeComponent: l }),
      I.createElement("path", { className: "react-flow__minimap-mask", d: `M${L - z},${j - z}h${S + z * 2}v${R + z * 2}h${-S - z * 2}z
        M${T.x},${T.y}h${T.width}v${T.height}h${-T.width}z`, fill: a, fillRule: "evenodd", stroke: u, strokeWidth: c, pointerEvents: "none" })
    )
  );
}
sg.displayName = "MiniMap";
var xk = C.memo(sg);
function _k() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32" },
    I.createElement("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" })
  );
}
function Sk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5" },
    I.createElement("path", { d: "M0 0h32v4.2H0z" })
  );
}
function kk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30" },
    I.createElement("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" })
  );
}
function Ek() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" })
  );
}
function Nk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" })
  );
}
const go = ({ children: e, className: t, ...n }) => I.createElement("button", { type: "button", className: je(["react-flow__controls-button", t]), ...n }, e);
go.displayName = "ControlButton";
const Ck = (e) => ({
  isInteractive: e.nodesDraggable || e.nodesConnectable || e.elementsSelectable,
  minZoomReached: e.transform[2] <= e.minZoom,
  maxZoomReached: e.transform[2] >= e.maxZoom
}), lg = ({ style: e, showZoom: t = !0, showFitView: n = !0, showInteractive: r = !0, fitViewOptions: o, onZoomIn: i, onZoomOut: s, onFitView: l, onInteractiveChange: a, className: u, children: c, position: f = "bottom-left" }) => {
  const d = ke(), [p, x] = C.useState(!1), { isInteractive: y, minZoomReached: E, maxZoomReached: h } = le(Ck, Ce), { zoomIn: m, zoomOut: g, fitView: w } = sc();
  if (C.useEffect(() => {
    x(!0);
  }, []), !p)
    return null;
  const N = () => {
    m(), i == null || i();
  }, P = () => {
    g(), s == null || s();
  }, T = () => {
    w(o), l == null || l();
  }, M = () => {
    d.setState({
      nodesDraggable: !y,
      nodesConnectable: !y,
      elementsSelectable: !y
    }), a == null || a(!y);
  };
  return I.createElement(
    Qu,
    { className: je(["react-flow__controls", u]), position: f, style: e, "data-testid": "rf__controls" },
    t && I.createElement(
      I.Fragment,
      null,
      I.createElement(
        go,
        { onClick: N, className: "react-flow__controls-zoomin", title: "zoom in", "aria-label": "zoom in", disabled: h },
        I.createElement(_k, null)
      ),
      I.createElement(
        go,
        { onClick: P, className: "react-flow__controls-zoomout", title: "zoom out", "aria-label": "zoom out", disabled: E },
        I.createElement(Sk, null)
      )
    ),
    n && I.createElement(
      go,
      { className: "react-flow__controls-fitview", onClick: T, title: "fit view", "aria-label": "fit view" },
      I.createElement(kk, null)
    ),
    r && I.createElement(go, { className: "react-flow__controls-interactive", onClick: M, title: "toggle interactivity", "aria-label": "toggle interactivity" }, y ? I.createElement(Nk, null) : I.createElement(Ek, null)),
    c
  );
};
lg.displayName = "Controls";
var zk = C.memo(lg), ct;
(function(e) {
  e.Lines = "lines", e.Dots = "dots", e.Cross = "cross";
})(ct || (ct = {}));
function Pk({ color: e, dimensions: t, lineWidth: n }) {
  return I.createElement("path", { stroke: e, strokeWidth: n, d: `M${t[0] / 2} 0 V${t[1]} M0 ${t[1] / 2} H${t[0]}` });
}
function Mk({ color: e, radius: t }) {
  return I.createElement("circle", { cx: t, cy: t, r: t, fill: e });
}
const Tk = {
  [ct.Dots]: "#91919a",
  [ct.Lines]: "#eee",
  [ct.Cross]: "#e2e2e2"
}, jk = {
  [ct.Dots]: 1,
  [ct.Lines]: 1,
  [ct.Cross]: 6
}, Ak = (e) => ({ transform: e.transform, patternId: `pattern-${e.rfId}` });
function ag({
  id: e,
  variant: t = ct.Dots,
  // only used for dots and cross
  gap: n = 20,
  // only used for lines and cross
  size: r,
  lineWidth: o = 1,
  offset: i = 2,
  color: s,
  style: l,
  className: a
}) {
  const u = C.useRef(null), { transform: c, patternId: f } = le(Ak, Ce), d = s || Tk[t], p = r || jk[t], x = t === ct.Dots, y = t === ct.Cross, E = Array.isArray(n) ? n : [n, n], h = [E[0] * c[2] || 1, E[1] * c[2] || 1], m = p * c[2], g = y ? [m, m] : h, w = x ? [m / i, m / i] : [g[0] / i, g[1] / i];
  return I.createElement(
    "svg",
    { className: je(["react-flow__background", a]), style: {
      ...l,
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0
    }, ref: u, "data-testid": "rf__background" },
    I.createElement("pattern", { id: f + e, x: c[0] % h[0], y: c[1] % h[1], width: h[0], height: h[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${w[0]},-${w[1]})` }, x ? I.createElement(Mk, { color: d, radius: m / i }) : I.createElement(Pk, { dimensions: g, color: d, lineWidth: o })),
    I.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${f + e})` })
  );
}
ag.displayName = "Background";
var Rk = C.memo(ag);
const ug = {}, { useDebugValue: $k } = I, { useSyncExternalStoreWithSelector: Ik } = Fh;
let hd = !1;
const Dk = (e) => e;
function Lk(e, t = Dk, n) {
  (ug ? "production" : void 0) !== "production" && n && !hd && (console.warn(
    "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
  ), hd = !0);
  const r = Ik(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return $k(r), r;
}
const md = (e) => {
  (ug ? "production" : void 0) !== "production" && typeof e != "function" && console.warn(
    "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
  );
  const t = typeof e == "function" ? bh(e) : e, n = (r, o) => Lk(t, r, o);
  return Object.assign(n, t), n;
}, Ok = (e) => e ? md(e) : md, cg = { nodes: [], edges: [] }, X = Ok((e, t) => ({
  graph: cg,
  catalog: [],
  selectedNodeId: null,
  runContext: null,
  readOnly: !1,
  paletteFilter: "",
  rightView: "none",
  drawerNodeId: null,
  connectedProviders: null,
  setGraph: (n) => e({ graph: bk(n) }),
  setCatalog: (n) => e({ catalog: n }),
  setRunContext: (n) => e({ runContext: n }),
  setReadOnly: (n) => e({ readOnly: n }),
  setSelectedNodeId: (n) => e({ selectedNodeId: n }),
  setPaletteFilter: (n) => e({ paletteFilter: n }),
  setRightView: (n) => e({ rightView: n }),
  setDrawerNodeId: (n) => e({ drawerNodeId: n }),
  setConnectedProviders: (n) => e({ connectedProviders: Array.isArray(n) ? n : null }),
  addNode: (n) => {
    const { graph: r } = t();
    e({ graph: { ...r, nodes: [...r.nodes, n] } });
  },
  updateNode: (n, r) => {
    const { graph: o } = t();
    e({
      graph: {
        ...o,
        nodes: o.nodes.map((i) => i.id === n ? { ...i, ...r } : i)
      }
    });
  },
  updateNodeParams: (n, r) => {
    const { graph: o } = t();
    e({
      graph: {
        ...o,
        nodes: o.nodes.map(
          (i) => i.id === n ? { ...i, params: { ...i.params, ...r } } : i
        )
      }
    });
  },
  deleteNode: (n) => {
    const { graph: r, selectedNodeId: o } = t();
    e({
      graph: {
        nodes: r.nodes.filter((i) => i.id !== n),
        edges: r.edges.filter((i) => i.source !== n && i.target !== n)
      },
      selectedNodeId: o === n ? null : o
    });
  },
  addEdge: (n) => {
    const { graph: r } = t();
    r.edges.some(
      (i) => i.source === n.source && i.target === n.target && i.sourcePort === n.sourcePort && i.targetPort === n.targetPort
    ) || e({ graph: { ...r, edges: [...r.edges, n] } });
  },
  deleteEdge: (n) => {
    const { graph: r } = t();
    e({
      graph: {
        ...r,
        edges: r.edges.filter((o) => o.id !== n)
      }
    });
  },
  moveNode: (n, r) => {
    const { graph: o } = t();
    e({
      graph: {
        ...o,
        nodes: o.nodes.map((i) => i.id === n ? { ...i, position: r } : i)
      }
    });
  },
  applyAutoLayout: () => {
    const { graph: n } = t();
    if (!n.nodes.length) return;
    const r = Fk(n);
    e({
      graph: {
        ...n,
        nodes: n.nodes.map((o) => ({
          ...o,
          position: r[o.id] || o.position
        }))
      }
    });
  }
}));
function Fk(e) {
  const i = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
  for (const d of e.nodes)
    i.set(d.id, []), s.set(d.id, 0);
  for (const d of e.edges)
    !i.has(d.source) || !s.has(d.target) || (i.get(d.source).push(d.target), s.set(d.target, (s.get(d.target) || 0) + 1));
  const l = /* @__PURE__ */ new Map(), a = [];
  for (const d of e.nodes)
    (s.get(d.id) || 0) === 0 && (l.set(d.id, 0), a.push(d.id));
  a.length === 0 && e.nodes.length > 0 && (l.set(e.nodes[0].id, 0), a.push(e.nodes[0].id));
  const u = new Set(a);
  for (; a.length > 0; ) {
    const d = a.shift(), p = l.get(d) || 0;
    for (const x of i.get(d) || []) {
      const y = p + 1;
      (!l.has(x) || (l.get(x) || 0) < y) && l.set(x, y), u.has(x) || (u.add(x), a.push(x));
    }
  }
  const c = /* @__PURE__ */ new Map();
  e.nodes.forEach((d) => {
    const p = l.get(d.id) ?? 0;
    c.has(p) || c.set(p, []), c.get(p).push(d.id);
  });
  const f = {};
  for (const [d, p] of Array.from(c.entries())) {
    const x = 80 + d * 280, y = p.length, E = 80 + Math.max(0, 3 - y) * 30;
    p.forEach((h, m) => {
      f[h] = { x, y: E + m * 160 };
    });
  }
  return f;
}
function bk(e) {
  return !e || !Array.isArray(e.nodes) ? cg : {
    nodes: e.nodes.map((t) => ({
      ...t,
      params: t.params || {},
      position: t.position || { x: 0, y: 0 }
    })),
    edges: Array.isArray(e.edges) ? e.edges : []
  };
}
var fg = { exports: {} };
/*!
	Copyright (c) 2018 Jed Watson.
	Licensed under the MIT License (MIT), see
	http://jedwatson.github.io/classnames
*/
(function(e) {
  (function() {
    var t = {}.hasOwnProperty;
    function n() {
      for (var i = "", s = 0; s < arguments.length; s++) {
        var l = arguments[s];
        l && (i = o(i, r(l)));
      }
      return i;
    }
    function r(i) {
      if (typeof i == "string" || typeof i == "number")
        return i;
      if (typeof i != "object")
        return "";
      if (Array.isArray(i))
        return n.apply(null, i);
      if (i.toString !== Object.prototype.toString && !i.toString.toString().includes("[native code]"))
        return i.toString();
      var s = "";
      for (var l in i)
        t.call(i, l) && i[l] && (s = o(s, l));
      return s;
    }
    function o(i, s) {
      return s ? i ? i + " " + s : i + s : i;
    }
    e.exports ? (n.default = n, e.exports = n) : window.classNames = n;
  })();
})(fg);
var Hk = fg.exports;
const _e = /* @__PURE__ */ qa(Hk);
function dg(e) {
  const t = /* @__PURE__ */ new Map();
  for (const o of e.edges)
    t.has(o.source) || t.set(o.source, []), t.get(o.source).push(o.target);
  const n = /* @__PURE__ */ new Map(), r = (o) => {
    const i = n.get(o) || 0;
    if (i === 1) return !0;
    if (i === 2) return !1;
    n.set(o, 1);
    for (const s of t.get(o) || [])
      if (r(s)) return !0;
    return n.set(o, 2), !1;
  };
  for (const o of e.nodes)
    if (r(o.id)) return !0;
  return !1;
}
function Vk(e, t, n, r) {
  if (!e || !n) return { ok: !1, reason: "Spec faltante" };
  const o = e.outputs.find((s) => s.name === t), i = n.inputs.find((s) => s.name === r);
  return o ? i ? { ok: !0 } : { ok: !1, reason: `Puerto de entrada "${r}" no existe` } : { ok: !1, reason: `Puerto de salida "${t}" no existe` };
}
function Bk(e, t) {
  var o;
  if (!t || !t.schema) return [];
  const n = [], r = Array.isArray(t.schema.required) ? t.schema.required : [];
  for (const i of r) {
    const s = (o = e.params) == null ? void 0 : o[i];
    (s == null || s === "") && n.push(`Falta parámetro requerido: ${i}`);
  }
  return n;
}
function an(e, t) {
  return e.find((n) => n.type === t);
}
function Uk(e) {
  return (e == null ? void 0 : e.inputs) ?? [];
}
function Wk(e) {
  return (e == null ? void 0 : e.outputs) ?? [{ name: "main" }];
}
const pg = {
  osmosis: "Cereza",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  katuq: "Katuq",
  "flow-control": "Lógica (si, repetir, esperar…)",
  http: "Otros sistemas",
  kai: "Opttia (IA)",
  siigo: "SIIGO",
  worldoffice: "World Office",
  fullpi: "Fullpi",
  aliaddo: "Aliaddo",
  enviame: "Envíame",
  wompi: "Wompi",
  internal: "Katuq"
}, hg = {
  delay: { nombre: "Esperar", que: "Hace una pausa antes de seguir con el siguiente paso." },
  if: { nombre: "Si… / si no…", que: "Sigue por un camino u otro según una condición." },
  switch: { nombre: "Elegir camino", que: "Manda cada registro por el camino que le corresponde." },
  loop: { nombre: "Repetir por cada uno", que: "Hace los pasos siguientes una vez por cada registro de la lista." },
  merge: { nombre: "Juntar caminos", que: "Une en uno los registros que vienen de dos caminos." },
  "split-array": { nombre: "Separar lista", que: "Convierte una lista en registros sueltos." },
  "error-handler": { nombre: "Si algo falla", que: "Atrapa los errores y decide qué hacer con ellos." },
  "sub-flow": { nombre: "Usar otra automatización", que: "Llama a otra automatización como si fuera un paso." },
  "schedule-cron": { nombre: "Con horario", que: "Arranca la automatización a la hora o cada cuánto que elijas." },
  "webhook-listener": { nombre: "Cuando otro sistema avisa", que: "Arranca cuando un sistema externo manda un aviso a Katuq." },
  "http-request": { nombre: "Llamar a otro sistema", que: "Envía o pide datos a un sistema externo." }
}, Yk = [
  [/Gu[ií]a Cereza \(Osmosis\)|Osmosis \(Gu[ií]a Cereza\)|Gu[ií]a Cereza/g, "Cereza"],
  [/Cereza\/Osmosis|Osmosis\/Cereza/g, "Cereza"],
  [/\bOsmosis\b/g, "Cereza"],
  [/CanonicalOrder Katuq/g, "el pedido de Katuq"],
  [/\bCanonical(Order|Product)?\b/g, "de Katuq"],
  [/Mapper can[oó]nico/gi, "Traducir datos"],
  [/\bUpsert\b/g, "Crear o actualizar"],
  [/\bupsert\b/g, "crear o actualizar"],
  [/\bfulfillment\b/gi, "despacho"],
  [/\bauto-push\b/gi, "enviar"],
  [/\bpush\b/gi, "enviar"],
  [/\bpolling\b/gi, "revisión periódica"],
  [/\btrigger\b/gi, "inicio"],
  [/\bwebhook\b/gi, "aviso"],
  [/\bnodo\b/gi, "paso"],
  [/\bstock\b/gi, "existencias"]
];
function Qs(e) {
  let t = String(e || "");
  for (const [n, r] of Yk) t = t.replace(n, r);
  return t;
}
function uc(e, t) {
  var n;
  return ((n = hg[e]) == null ? void 0 : n.nombre) || Qs(t) || e;
}
function Cs(e, t) {
  var n;
  return ((n = hg[e]) == null ? void 0 : n.que) || Qs(t);
}
const cc = {
  nodeSlug: { titulo: "Identificador de tu nodo en Cereza", ayuda: "Te lo da el equipo de Cereza. Debe ser exacto." },
  bodegaCode: { titulo: "Bodega de Katuq", ayuda: "El código de la bodega, por ejemplo BOD-001." },
  warehouseCode: { titulo: "Código de bodega" },
  matchBy: { titulo: "Reconocer el producto por", ayuda: "Cómo se cruza el producto entre los dos sistemas." },
  createIfMissing: { titulo: "Crearlo si no existe" },
  publishStatus: { titulo: "Estado al publicar" },
  publishToOnlineStore: { titulo: "Publicarlo en la tienda en línea" },
  syncImages: { titulo: "Copiar también las fotos" },
  syncInventory: { titulo: "Copiar también las existencias" },
  quantity: { titulo: "Cantidad" },
  sku: { titulo: "SKU del producto" },
  status: { titulo: "Estado" },
  statuses: { titulo: "Solo estos estados" },
  reason: { titulo: "Motivo" },
  note: { titulo: "Nota" },
  noteVisibleToCustomer: { titulo: "El cliente puede ver la nota" },
  notifyCustomer: { titulo: "Avisar al cliente" },
  paymentPending: { titulo: "El pago está pendiente" },
  pushAsCompleted: { titulo: "Enviarlo como completado" },
  recalculateTotals: { titulo: "Recalcular los totales" },
  carrier: { titulo: "Transportadora", ayuda: "Déjalo vacío para usar la de siempre." },
  trackingCompany: { titulo: "Transportadora de la guía" },
  trackingNumber: { titulo: "Número de guía" },
  trackingUrl: { titulo: "Enlace para rastrear la guía" },
  documentType: { titulo: "Tipo de documento en SIIGO" },
  sellerId: { titulo: "Vendedor en SIIGO" },
  idTerceroInterno: { titulo: "Tercero interno" },
  terceroInternoId: { titulo: "Tercero interno" },
  codes: { titulo: "Tipos de documento", ayuda: "Separados por coma. Vacío trae todos." },
  fromDate: { titulo: "Desde la fecha" },
  toDate: { titulo: "Hasta la fecha" },
  fechaCorte: { titulo: "Fecha de corte" },
  diasPlazoCR: { titulo: "Días de plazo para pagos a crédito" },
  mode: { titulo: "Modo" },
  skipZero: { titulo: "Omitir los que tienen saldo en cero" },
  eventTypes: { titulo: "Qué eventos escuchar" },
  events: { titulo: "Qué eventos escuchar" },
  condition: { titulo: "Condición" },
  cases: { titulo: "Caminos" },
  ms: { titulo: "Milisegundos de espera" },
  agentName: { titulo: "Agente de Opttia" },
  continueOnError: { titulo: "Seguir aunque un registro falle" },
  url: { titulo: "Dirección del otro sistema" },
  method: { titulo: "Tipo de llamada" },
  // --- avanzados ---
  mapping: { titulo: "Ajuste de campos", avanzado: !0, ayuda: "Solo si un campo debe llenarse distinto. Formato técnico." },
  headers: { titulo: "Encabezados", avanzado: !0 },
  queryParams: { titulo: "Parámetros de la dirección", avanzado: !0 },
  body: { titulo: "Contenido a enviar", avanzado: !0 },
  params: { titulo: "Parámetros", avanzado: !0 },
  inputJson: { titulo: "Datos de entrada", avanzado: !0 },
  authMode: { titulo: "Tipo de autenticación", avanzado: !0 },
  timeout: { titulo: "Tiempo máximo de espera", avanzado: !0 },
  retries: { titulo: "Reintentos", avanzado: !0 },
  batchSize: { titulo: "Registros por tanda", avanzado: !0 },
  arrayPath: { titulo: "Dónde está la lista", avanzado: !0 },
  fieldPath: { titulo: "Campo", avanzado: !0 },
  keyField: { titulo: "Campo clave", avanzado: !0 },
  expression: { titulo: "Expresión", avanzado: !0 },
  collection: { titulo: "Colección", avanzado: !0 },
  logToCollection: { titulo: "Guardar registro en", avanzado: !0 },
  flowId: { titulo: "Automatización a usar", avanzado: !0 },
  jobIdSource: { titulo: "De dónde sale el trabajo", avanzado: !0 },
  orderIdSource: { titulo: "De dónde sale el pedido", avanzado: !0 },
  transactionIdSource: { titulo: "De dónde sale la transacción", avanzado: !0 },
  shopifyOrderId: { titulo: "Pedido de Shopify", avanzado: !0 },
  wooOrderId: { titulo: "Pedido de WooCommerce", avanzado: !0 },
  wooProductId: { titulo: "Producto de WooCommerce", avanzado: !0 },
  variationId: { titulo: "Variante", avanzado: !0 },
  inventoryItemId: { titulo: "Ítem de inventario en Shopify", avanzado: !0 },
  modifiedAfter: { titulo: "Solo cambios desde", avanzado: !0 },
  untilTimestamp: { titulo: "Hasta", avanzado: !0 },
  universeSource: { titulo: "De dónde salen los terceros", avanzado: !0 },
  skipEnrichTercero: { titulo: "No completar datos del tercero", avanzado: !0 },
  persistLines: { titulo: "Guardar cada renglón", avanzado: !0 },
  waitForCompletion: { titulo: "Esperar a que termine", avanzado: !0 }
};
function Xk(e) {
  const t = String(e || "").replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : e;
}
function Kk(e, t) {
  var n;
  return ((n = cc[e]) == null ? void 0 : n.titulo) || Qs(t == null ? void 0 : t.title) || Xk(e);
}
function Gk(e, t) {
  var n;
  return ((n = cc[e]) == null ? void 0 : n.ayuda) || Qs(t == null ? void 0 : t.description) || void 0;
}
function gd(e, t, n) {
  var r;
  return n ? !1 : !!((r = cc[e]) != null && r.avanzado) || (t == null ? void 0 : t.type) === "object";
}
const qk = {
  reference: "Referencia",
  referencia: "Referencia",
  sku: "SKU",
  barcode: "Código de barras",
  id: "Identificador",
  ACTIVE: "Publicado",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
  incremental: "Solo lo nuevo",
  historico: "Todo el histórico",
  full: "Todo",
  created: "Creado",
  updated: "Actualizado",
  deleted: "Eliminado"
};
function yd(e) {
  return qk[e] || e;
}
const Qk = ({ id: e, data: t, selected: n }) => {
  var N, P, T;
  const r = X(
    (M) => {
      var k, A;
      return (A = (k = M.runContext) == null ? void 0 : k.nodeStates) == null ? void 0 : A[e];
    }
  ), o = X((M) => {
    var k;
    return ((k = M.runContext) == null ? void 0 : k.status) === "running";
  }), i = X((M) => M.setSelectedNodeId), s = X((M) => M.setRightView), l = (r == null ? void 0 : r.status) || "pending", a = r == null ? void 0 : r.durationMs, u = r == null ? void 0 : r.attempt, c = (N = r == null ? void 0 : r.error) == null ? void 0 : N.message, f = t.spec, d = t.flowNode, p = (f == null ? void 0 : f.color) || "#5E72E4", x = Uk(f), y = Wk(f), E = uc(d.type, f == null ? void 0 : f.displayName), h = C.useMemo(() => Zk(d.params), [d.params]), m = C.useCallback(
    (M) => {
      M.stopPropagation(), i(e), s("runs");
    },
    [e, i, s]
  ), g = o && l === "running", w = ((T = (P = r == null ? void 0 : r.output) == null ? void 0 : P.main) == null ? void 0 : T.reduce((M, k) => M + ((k == null ? void 0 : k.length) || 0), 0)) ?? 0;
  return /* @__PURE__ */ v.jsxs(
    "div",
    {
      className: _e("kfc-node", {
        "kfc-node--selected": n,
        "kfc-node--disabled": d.disabled,
        "kfc-node--live": g,
        [`kfc-node--status-${l}`]: !0
      }),
      style: { "--kfc-node-color": p },
      children: [
        x.map((M, k) => /* @__PURE__ */ v.jsx(
          Vr,
          {
            id: M.name,
            type: "target",
            position: K.Left,
            className: _e("kfc-node__handle", {
              "kfc-node__handle--error": M.isError
            }),
            style: { top: 24 + k * 18 }
          },
          `in-${M.name}`
        )),
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-node__header", children: [
          /* @__PURE__ */ v.jsx("i", { className: _e("kfc-node__icon", (f == null ? void 0 : f.icon) || "pi pi-circle") }),
          /* @__PURE__ */ v.jsx("span", { className: "kfc-node__title", title: E, children: E }),
          r && (l === "success" || l === "failed" || l === "skipped") && /* @__PURE__ */ v.jsx(
            "button",
            {
              type: "button",
              className: "kfc-node__info-btn",
              onClick: m,
              title: "Ver logs de este nodo",
              "aria-label": "Ver logs",
              children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-info-circle" })
            }
          ),
          (f == null ? void 0 : f.category) && /* @__PURE__ */ v.jsx("span", { className: "kfc-node__category-badge", children: Jk(f.category) })
        ] }),
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-node__body", children: [
          h.length > 0 ? /* @__PURE__ */ v.jsx("ul", { className: "kfc-node__params", children: h.slice(0, 3).map(([M, k]) => /* @__PURE__ */ v.jsxs("li", { children: [
            /* @__PURE__ */ v.jsxs("b", { children: [
              M,
              ":"
            ] }),
            " ",
            k
          ] }, M)) }) : /* @__PURE__ */ v.jsx("em", { style: { color: "#9ca3af" }, children: "Sin parámetros configurados" }),
          /* @__PURE__ */ v.jsxs("div", { className: "kfc-node__status-row", children: [
            /* @__PURE__ */ v.jsxs("span", { className: _e("kfc-node__status", `kfc-node__status--${l}`), children: [
              g && /* @__PURE__ */ v.jsx("i", { className: "pi pi-spin pi-spinner kfc-node__status-spinner" }),
              !g && l === "success" && /* @__PURE__ */ v.jsx("i", { className: "pi pi-check" }),
              !g && l === "failed" && /* @__PURE__ */ v.jsx("i", { className: "pi pi-times" }),
              !g && l === "skipped" && /* @__PURE__ */ v.jsx("i", { className: "pi pi-forward" }),
              eE(l)
            ] }),
            a != null && l !== "running" && /* @__PURE__ */ v.jsx("span", { className: "kfc-node__metric", title: "Duración", children: tE(a) }),
            w > 0 && l === "success" && /* @__PURE__ */ v.jsxs("span", { className: "kfc-node__metric", title: "Items procesados", children: [
              w,
              " ",
              w === 1 ? "item" : "items"
            ] }),
            u != null && u > 1 && /* @__PURE__ */ v.jsxs(
              "span",
              {
                className: "kfc-node__metric kfc-node__metric--warn",
                title: "Reintentos",
                children: [
                  "int. ",
                  u
                ]
              }
            )
          ] }),
          c && l === "failed" && /* @__PURE__ */ v.jsx("div", { className: "kfc-node__error", title: c, children: nE(c, 60) })
        ] }),
        y.map((M, k) => /* @__PURE__ */ v.jsx(
          Vr,
          {
            id: M.name,
            type: "source",
            position: K.Right,
            className: _e("kfc-node__handle", {
              "kfc-node__handle--error": M.isError
            }),
            style: { top: 24 + k * 18 }
          },
          `out-${M.name}`
        )),
        g && /* @__PURE__ */ v.jsx("div", { className: "kfc-node__live-pulse", "aria-hidden": !0 })
      ]
    }
  );
};
function Zk(e) {
  return e ? Object.entries(e).filter(([, t]) => t != null && t !== "").map(([t, n]) => {
    const r = typeof n == "object" ? JSON.stringify(n).slice(0, 40) : String(n).slice(0, 40);
    return [t, r];
  }) : [];
}
function Jk(e) {
  return e === "flow-control" ? "flow" : e.slice(0, 6);
}
function eE(e) {
  switch (e) {
    case "running":
      return "Ejecutando";
    case "success":
      return "Éxito";
    case "failed":
      return "Falló";
    case "skipped":
      return "Saltado";
    default:
      return "Pendiente";
  }
}
function tE(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function nE(e, t) {
  return e.length > t ? e.slice(0, t - 1) + "…" : e;
}
const rE = C.memo(Qk);
function vd(e = "n") {
  const t = Date.now().toString(36).slice(-4), n = Math.random().toString(36).slice(2, 8);
  return `${e}_${t}${n}`;
}
const oE = { katuqNode: rE }, iE = ({ onSelectNode: e, onIntent: t }) => {
  const n = X((k) => k.graph), r = X((k) => k.catalog), o = X((k) => k.runContext), i = X((k) => k.readOnly), s = X((k) => k.selectedNodeId);
  X((k) => k.setGraph);
  const l = X((k) => k.addNode), a = X((k) => k.addEdge), u = X((k) => k.moveNode), c = X((k) => k.deleteNode), f = X((k) => k.deleteEdge), d = X((k) => k.setDrawerNodeId), p = C.useRef(null), x = C.useRef(null), y = C.useMemo(
    () => n.nodes.map((k) => {
      const A = an(r, k.type);
      return {
        id: k.id,
        type: "katuqNode",
        position: k.position,
        selected: s === k.id,
        data: { flowNode: k, spec: A }
      };
    }),
    [n.nodes, r, s]
  ), E = C.useMemo(
    () => n.edges.map((k) => {
      var $, z, L, j;
      const A = (z = ($ = o == null ? void 0 : o.nodeStates) == null ? void 0 : $[k.source]) == null ? void 0 : z.status, F = (j = (L = o == null ? void 0 : o.nodeStates) == null ? void 0 : L[k.target]) == null ? void 0 : j.status, O = A === "success", H = (o == null ? void 0 : o.status) === "running" && O && (F === "running" || F === "pending"), _ = k.sourcePort === "error";
      return {
        id: k.id,
        source: k.source,
        sourcePort: k.sourcePort,
        target: k.target,
        sourceHandle: k.sourcePort,
        targetHandle: k.targetPort,
        animated: H,
        className: _e({
          "kfc-edge--complete": O && !H,
          "kfc-edge--live": H,
          "kfc-edge--error": _
        })
      };
    }),
    [n.edges, o]
  ), h = C.useCallback(
    (k) => {
      for (const A of k)
        A.type === "position" && A.position ? u(A.id, { x: A.position.x, y: A.position.y }) : A.type === "remove" ? c(A.id) : A.type === "select" && A.selected && e(A.id);
    },
    [u, c, e]
  ), m = C.useCallback(
    (k) => {
      for (const A of k)
        A.type === "remove" && f(A.id);
    },
    [f]
  ), g = C.useCallback(
    (k) => {
      if (i || !k.source || !k.target) return;
      if (k.source === k.target) {
        t == null || t("connectionRejected", {
          reason: "Un nodo no puede conectarse a sí mismo."
        });
        return;
      }
      const A = n.nodes.find((L) => L.id === k.source), F = n.nodes.find((L) => L.id === k.target);
      if (!A || !F) return;
      const O = an(r, A.type), H = an(r, F.type), _ = Vk(
        O,
        k.sourceHandle || "main",
        H,
        k.targetHandle || "main"
      );
      if (!_.ok) {
        t == null || t("connectionRejected", {
          reason: _.reason || "Puertos incompatibles."
        });
        return;
      }
      const $ = {
        ...n,
        edges: [
          ...n.edges,
          {
            id: "__tentative__",
            source: k.source,
            sourcePort: k.sourceHandle || "main",
            target: k.target,
            targetPort: k.targetHandle || "main"
          }
        ]
      };
      if (dg($)) {
        t == null || t("connectionRejected", {
          reason: "Esta conexión crearía un ciclo en el flow."
        });
        return;
      }
      const z = {
        id: vd("e"),
        source: k.source,
        sourcePort: k.sourceHandle || "main",
        target: k.target,
        targetPort: k.targetHandle || "main"
      };
      a(z), t == null || t("connectionCreated", { edgeId: z.id });
    },
    [i, n, r, a, t]
  ), w = C.useCallback((k) => {
    k.preventDefault(), k.dataTransfer.dropEffect = "move";
  }, []), N = C.useCallback(
    (k) => {
      var z;
      if (k.preventDefault(), i) return;
      const A = k.dataTransfer.getData("application/x-katuq-node-type");
      if (!A) return;
      const F = an(r, A);
      if (!F) return;
      const O = (z = p.current) == null ? void 0 : z.getBoundingClientRect();
      if (!O) return;
      const H = x.current, _ = (H == null ? void 0 : H.project({
        x: k.clientX - O.left,
        y: k.clientY - O.top
      })) ?? { x: 100, y: 100 }, $ = {
        id: vd("n"),
        type: A,
        position: _,
        params: { ...F.defaults || {} }
      };
      l($), e($.id), t == null || t("nodeAdded", { nodeId: $.id, type: A });
    },
    [i, r, l, e, t]
  ), P = C.useCallback(() => e(null), [e]), T = C.useCallback(
    (k, A) => e(A.id),
    [e]
  ), M = C.useCallback(
    (k, A) => {
      k.preventDefault(), d(A.id);
    },
    [d]
  );
  return /* @__PURE__ */ v.jsx("div", { ref: p, className: "kfc-canvas-wrapper", onDragOver: w, onDrop: N, children: /* @__PURE__ */ v.jsxs(
    og,
    {
      nodes: y,
      edges: E,
      onNodesChange: h,
      onEdgesChange: m,
      onConnect: g,
      onPaneClick: P,
      onNodeClick: T,
      onNodeContextMenu: M,
      nodeTypes: oE,
      fitView: !0,
      fitViewOptions: { padding: 0.2 },
      onInit: (k) => x.current = k,
      proOptions: { hideAttribution: !0 },
      deleteKeyCode: i ? null : ["Delete", "Backspace"],
      minZoom: 0.2,
      maxZoom: 2,
      defaultEdgeOptions: {
        style: { strokeWidth: 1.5 }
      },
      children: [
        /* @__PURE__ */ v.jsx(Rk, { variant: ct.Dots, gap: 18, size: 1, color: "#d1d5db" }),
        /* @__PURE__ */ v.jsx(
          xk,
          {
            pannable: !0,
            zoomable: !0,
            nodeColor: (k) => {
              var O;
              const A = (O = k.data) == null ? void 0 : O.flowNode, F = A ? an(r, A.type) : void 0;
              return (F == null ? void 0 : F.color) || "#94a3b8";
            }
          }
        ),
        /* @__PURE__ */ v.jsx(zk, { position: "bottom-left" })
      ]
    }
  ) });
}, sE = ({ readOnly: e }) => {
  const t = X((s) => s.catalog), n = X((s) => s.paletteFilter), r = X((s) => s.setPaletteFilter), o = C.useMemo(() => lE(t, n), [t, n]), i = (s, l) => {
    if (e) {
      s.preventDefault();
      return;
    }
    s.dataTransfer.setData("application/x-katuq-node-type", l.type), s.dataTransfer.effectAllowed = "move";
  };
  return /* @__PURE__ */ v.jsxs("aside", { className: "kfc-sidebar", "aria-label": "Pasos disponibles", children: [
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-sidebar__header", children: [
      /* @__PURE__ */ v.jsx("h3", { className: "kfc-sidebar__title", children: "Pasos disponibles" }),
      /* @__PURE__ */ v.jsx(
        "input",
        {
          type: "search",
          className: "kfc-sidebar__search",
          placeholder: "Buscar paso…",
          value: n,
          onChange: (s) => r(s.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-sidebar__list", children: [
      t.length === 0 && /* @__PURE__ */ v.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__title", children: "No pudimos cargar los pasos" }),
        /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "Recarga la página para intentarlo de nuevo." })
      ] }),
      Object.entries(o).map(([s, l]) => /* @__PURE__ */ v.jsxs("section", { className: "kfc-group", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-group__title", children: [
          pg[s] || s,
          " · ",
          l.length
        ] }),
        l.map((a) => /* @__PURE__ */ v.jsxs(
          "div",
          {
            className: _e("kfc-palette-card"),
            draggable: !e,
            onDragStart: (u) => i(u, a),
            title: Cs(a.type, a.description),
            children: [
              /* @__PURE__ */ v.jsx("i", { className: _e("kfc-palette-card__icon", a.icon), style: { color: a.color } }),
              /* @__PURE__ */ v.jsxs("div", { className: "kfc-palette-card__body", children: [
                /* @__PURE__ */ v.jsx("div", { className: "kfc-palette-card__title", children: uc(a.type, a.displayName) }),
                /* @__PURE__ */ v.jsx("div", { className: "kfc-palette-card__desc", children: Cs(a.type, a.description) })
              ] })
            ]
          },
          a.type
        ))
      ] }, s))
    ] })
  ] });
};
function lE(e, t) {
  const n = (t || "").trim().toLowerCase(), r = n ? e.filter((i) => `${i.displayName} ${i.description} ${i.type} ${(i.tags || []).join(" ")} ${i.group}`.toLowerCase().includes(n)) : e, o = {};
  for (const i of r)
    o[i.group] || (o[i.group] = []), o[i.group].push(i);
  for (const i of Object.keys(o))
    o[i].sort((s, l) => String((s == null ? void 0 : s.displayName) ?? "").localeCompare(String((l == null ? void 0 : l.displayName) ?? "")));
  return o;
}
const aE = {
  worldoffice: "world_office"
}, wd = {
  osmosis: "Cereza",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  siigo: "Siigo",
  world_office: "World Office",
  worldoffice: "World Office",
  aliaddo: "Aliaddo",
  enviame: "Envíame",
  wompi: "Wompi",
  epayco: "ePayco"
};
function Ka(e) {
  const t = (e || "").toLowerCase();
  return aE[t] || t;
}
function Ol(e) {
  const t = (e || "").toLowerCase();
  return wd[Ka(t)] || wd[t] || e;
}
function uE(e, t) {
  if (!t) return [];
  const n = e.credentials;
  if (!n) return [];
  const r = Array.isArray(n) ? n : [n], o = new Set(t.map(Ka));
  return r.filter((i) => !o.has(Ka(i)));
}
const cE = ({ onClose: e, onOpenIntegrations: t }) => {
  var L, j;
  const n = X((S) => S.selectedNodeId), r = X((S) => S.graph), o = X((S) => S.catalog), i = X((S) => S.runContext), s = X((S) => S.connectedProviders), l = X((S) => S.updateNodeParams), a = X((S) => S.updateNode), u = X((S) => S.deleteNode), c = X((S) => S.readOnly), [f, d] = C.useState(!1), [p, x] = C.useState(!1);
  C.useEffect(() => {
    d(!1);
  }, [n]);
  const y = C.useMemo(
    () => r.nodes.find((S) => S.id === n),
    [r.nodes, n]
  ), E = C.useMemo(
    () => y ? an(o, y.type) : void 0,
    [o, y]
  ), h = C.useMemo(
    () => y ? hE(y, r, o, i) : null,
    [y, r, o, i]
  ), [m, g] = C.useState({}), [w, N] = C.useState({}), [P, T] = C.useState("");
  if (C.useEffect(() => {
    if (!y) return;
    g({ ...(E == null ? void 0 : E.defaults) || {}, ...y.params || {} }), T(y.notes || "");
    const S = {};
    for (const [R, D] of Object.entries(y.params || {}))
      typeof D == "string" && D.trim().startsWith("{{") && (S[R] = "expression");
    N(S);
  }, [y, E]), !y || !E)
    return /* @__PURE__ */ v.jsx("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: /* @__PURE__ */ v.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__title", children: "Toca un paso para configurarlo" }),
      /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "Aquí aparecen sus ajustes." })
    ] }) });
  const M = Bk({ ...y, params: m }, E), k = ((L = E.schema) == null ? void 0 : L.properties) || {}, A = Array.isArray((j = E.schema) == null ? void 0 : j.required) ? E.schema.required : [], F = uE(E, s), O = (S, R) => g((D) => ({ ...D, [S]: R })), H = (S, R) => N((D) => ({ ...D, [S]: R })), _ = () => {
    l(y.id, m), P !== (y.notes || "") && a(y.id, { notes: P }), e();
  }, $ = () => e(), z = () => {
    if (!f) {
      d(!0);
      return;
    }
    u(y.id), e();
  };
  return /* @__PURE__ */ v.jsxs("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: [
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__header", children: [
      /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__heading", children: [
        /* @__PURE__ */ v.jsx("div", { className: "kfc-config__title", children: uc(E.type, E.displayName) }),
        /* @__PURE__ */ v.jsx("div", { className: "kfc-config__subtitle", children: pg[E.group] || E.group })
      ] }),
      /* @__PURE__ */ v.jsx(
        "button",
        {
          type: "button",
          className: "kfc-btn kfc-btn--ghost kfc-config__close",
          onClick: e,
          "aria-label": "Cerrar",
          title: "Cerrar",
          children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-times" })
        }
      )
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__body", children: [
      F.length > 0 && /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__missing", role: "alert", children: [
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__missing-head", children: [
          /* @__PURE__ */ v.jsx("i", { className: "pi pi-exclamation-triangle" }),
          /* @__PURE__ */ v.jsx("span", { children: F.length === 1 ? `Conecta ${Ol(F[0])} para que este paso funcione.` : `Este paso necesita estas integraciones conectadas: ${F.map(Ol).join(", ")}.` })
        ] }),
        /* @__PURE__ */ v.jsx("div", { className: "kfc-config__missing-actions", children: F.map((S) => /* @__PURE__ */ v.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--warn-solid kfc-btn--sm",
            onClick: () => t == null ? void 0 : t(S),
            children: [
              /* @__PURE__ */ v.jsx("i", { className: "pi pi-link" }),
              "Conectar ",
              Ol(S)
            ]
          },
          S
        )) })
      ] }),
      Cs(E.type, E.description) && /* @__PURE__ */ v.jsx("p", { className: "kfc-config__desc", children: Cs(E.type, E.description) }),
      M.length > 0 && /* @__PURE__ */ v.jsx("div", { className: "kfc-config__errors", role: "alert", children: M.map((S) => /* @__PURE__ */ v.jsxs("div", { children: [
        "· ",
        S
      ] }, S)) }),
      Object.keys(k).length === 0 && /* @__PURE__ */ v.jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: "Este paso no necesita configuración." }),
      (() => {
        const S = ([B, U]) => /* @__PURE__ */ v.jsx(
          fE,
          {
            name: B,
            schema: U,
            value: m[B],
            mode: w[B] || "fixed",
            required: A.includes(B),
            readOnly: c,
            inputData: h,
            onChange: (Y) => O(B, Y),
            onModeChange: (Y) => H(B, Y)
          },
          B
        ), R = Object.entries(k), D = R.filter(([B, U]) => !gd(B, U, A.includes(B))), b = R.filter(([B, U]) => gd(B, U, A.includes(B)));
        return /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
          D.map(S),
          b.length > 0 && /* @__PURE__ */ v.jsxs("details", { className: "kfc-avanzado", children: [
            /* @__PURE__ */ v.jsxs("summary", { children: [
              "Ajustes avanzados · ",
              b.length
            ] }),
            b.map(S)
          ] })
        ] });
      })(),
      /* @__PURE__ */ v.jsx("hr", { className: "kfc-config__sep" }),
      /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
        /* @__PURE__ */ v.jsx("label", { className: "kfc-field__label", children: "Notas para tu equipo (se ven en el lienzo)" }),
        /* @__PURE__ */ v.jsx(
          "textarea",
          {
            className: "kfc-textarea",
            value: P,
            readOnly: c,
            onChange: (S) => T(S.target.value),
            placeholder: "Por qué está este paso, qué revisar…"
          }
        )
      ] }),
      /* @__PURE__ */ v.jsxs("button", { type: "button", className: "kfc-tecnico-toggle", onClick: () => x(!p), children: [
        p ? "Ocultar" : "Ver",
        " detalles técnicos"
      ] }),
      p && /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__note", children: [
        "Tipo: ",
        E.type,
        " · versión ",
        E.version
      ] }),
      E.category === "trigger" && /* @__PURE__ */ v.jsx("div", { className: "kfc-config__note", children: "Este paso arranca la automatización. Cada cuánto o con qué aviso se elige en «Ajustes», arriba a la derecha." })
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__footer", children: [
      !c && /* @__PURE__ */ v.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--danger", onClick: z, onBlur: () => d(!1), children: [
        /* @__PURE__ */ v.jsx("i", { className: "pi pi-trash" }),
        f ? "¿Seguro? Toca de nuevo" : "Quitar paso"
      ] }),
      /* @__PURE__ */ v.jsx("span", { className: "kfc-config__footer-spacer" }),
      /* @__PURE__ */ v.jsx("button", { type: "button", className: "kfc-btn", onClick: $, children: "Cancelar" }),
      !c && /* @__PURE__ */ v.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: _, children: [
        /* @__PURE__ */ v.jsx("i", { className: "pi pi-check" }),
        "Aplicar"
      ] })
    ] })
  ] });
}, fE = ({
  name: e,
  schema: t,
  value: n,
  mode: r,
  required: o,
  readOnly: i,
  inputData: s,
  onChange: l,
  onModeChange: a
}) => {
  var x;
  const u = Kk(e, t), c = Gk(e, t), f = t.type, d = t.enum, p = `kfc-field-${e}`;
  if (f === "boolean")
    return /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ v.jsxs("label", { className: "kfc-checkbox-row", children: [
        /* @__PURE__ */ v.jsx(
          "input",
          {
            id: p,
            type: "checkbox",
            checked: !!n,
            disabled: i,
            onChange: (y) => l(y.target.checked)
          }
        ),
        /* @__PURE__ */ v.jsxs("span", { children: [
          u,
          o && /* @__PURE__ */ v.jsx("span", { className: "kfc-req", children: " *" })
        ] })
      ] }),
      c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (Array.isArray(d))
    return /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ v.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ v.jsxs(
        "select",
        {
          id: p,
          className: "kfc-select",
          value: n ?? "",
          disabled: i,
          onChange: (y) => l(y.target.value),
          children: [
            /* @__PURE__ */ v.jsx("option", { value: "", children: "— elige una opción —" }),
            d.map((y) => /* @__PURE__ */ v.jsx("option", { value: String(y), children: yd(String(y)) }, String(y)))
          ]
        }
      ),
      c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (f === "array") {
    const y = (x = t.items) == null ? void 0 : x.enum, E = Array.isArray(n) ? n : [];
    return y ? /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ v.jsx(ar, { label: u, required: o, schema: t }),
      /* @__PURE__ */ v.jsx("div", { className: "kfc-checkchips", children: y.map((h) => {
        const m = E.includes(h);
        return /* @__PURE__ */ v.jsxs(
          "label",
          {
            className: _e("kfc-checkchip", { "is-on": m }),
            children: [
              /* @__PURE__ */ v.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: m,
                  disabled: i,
                  onChange: (g) => {
                    g.target.checked ? l([...E, h]) : l(E.filter((w) => w !== h));
                  }
                }
              ),
              yd(h)
            ]
          },
          h
        );
      }) }),
      c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
    ] }) : /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ v.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ v.jsx(
        "input",
        {
          id: p,
          type: "text",
          className: "kfc-input",
          value: E.join(", "),
          readOnly: i,
          onChange: (h) => l(
            h.target.value.split(",").map((m) => m.trim()).filter(Boolean)
          ),
          placeholder: "Separados por coma"
        }
      ),
      c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  }
  return f === "object" ? /* @__PURE__ */ v.jsx(
    pE,
    {
      inputId: p,
      label: u,
      schema: t,
      description: c,
      required: !!o,
      readOnly: !!i,
      value: n,
      onChange: l,
      name: e
    }
  ) : f === "number" || f === "integer" ? /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ v.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
    /* @__PURE__ */ v.jsx(
      "input",
      {
        id: p,
        type: "number",
        className: "kfc-input",
        value: n ?? "",
        readOnly: i,
        min: t.minimum,
        max: t.maximum,
        step: f === "integer" ? 1 : "any",
        onChange: (y) => {
          const E = y.target.value;
          l(E === "" ? void 0 : f === "integer" ? parseInt(E, 10) : parseFloat(E));
        }
      }
    ),
    c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
  ] }) : /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ v.jsx(
      ar,
      {
        label: u,
        required: o,
        schema: t,
        htmlFor: p,
        right: /* @__PURE__ */ v.jsxs("span", { className: "kfc-mode-toggle", role: "tablist", children: [
          /* @__PURE__ */ v.jsx(
            "button",
            {
              type: "button",
              className: _e({ "is-active": r === "fixed" }),
              onClick: () => a("fixed"),
              disabled: i,
              children: "Valor fijo"
            }
          ),
          /* @__PURE__ */ v.jsx(
            "button",
            {
              type: "button",
              className: _e({ "is-active": r === "expression" }),
              onClick: () => a("expression"),
              disabled: i,
              title: "Tomar el dato de un paso anterior",
              children: "De un paso anterior"
            }
          )
        ] })
      }
    ),
    r === "expression" ? /* @__PURE__ */ v.jsx(
      dE,
      {
        inputId: p,
        value: n ?? "",
        readOnly: i,
        inputData: s,
        onChange: l
      }
    ) : /* @__PURE__ */ v.jsx(
      "input",
      {
        id: p,
        type: "text",
        className: "kfc-input",
        value: n ?? "",
        readOnly: i,
        onChange: (y) => l(y.target.value),
        placeholder: t.default ? `Por defecto: ${t.default}` : ""
      }
    ),
    c && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: c })
  ] });
}, dE = ({
  inputId: e,
  value: t,
  readOnly: n,
  inputData: r,
  onChange: o
}) => {
  const i = C.useRef(null), [s, l] = C.useState(!1), [a, u] = C.useState(""), c = (p) => {
    const x = i.current, y = t || "";
    if (!x) {
      o(y + p);
      return;
    }
    const E = x.selectionStart ?? y.length, h = x.selectionEnd ?? y.length, m = y.slice(0, E) + p + y.slice(h);
    o(m), requestAnimationFrame(() => {
      x.focus();
      const g = E + p.length;
      try {
        x.setSelectionRange(g, g);
      } catch {
      }
    });
  }, f = C.useMemo(
    () => yE(t, r == null ? void 0 : r.json),
    [t, r]
  ), d = C.useMemo(() => {
    const p = (r == null ? void 0 : r.paths) || [], x = a.trim().toLowerCase();
    return x ? p.filter((y) => y.path.toLowerCase().includes(x)) : p;
  }, [r, a]);
  return /* @__PURE__ */ v.jsxs("div", { className: "kfc-expr-wrap", children: [
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-expr", children: [
      /* @__PURE__ */ v.jsx("span", { className: "kfc-expr__fx", title: "Modo expresión", children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-bolt" }) }),
      /* @__PURE__ */ v.jsx(
        "input",
        {
          ref: i,
          id: e,
          type: "text",
          className: "kfc-input kfc-expr__input",
          value: t ?? "",
          readOnly: n,
          placeholder: "{{ $json.campo }}",
          onChange: (p) => o(p.target.value)
        }
      ),
      !n && /* @__PURE__ */ v.jsxs(
        "button",
        {
          type: "button",
          className: _e("kfc-expr__pick", { "is-open": s }),
          onClick: () => l((p) => !p),
          title: "Insertar dato del paso anterior",
          children: [
            /* @__PURE__ */ v.jsx("i", { className: "pi pi-database" }),
            "Datos"
          ]
        }
      )
    ] }),
    f !== null && /* @__PURE__ */ v.jsxs("div", { className: "kfc-expr__preview", title: "Valor de muestra del último run", children: [
      /* @__PURE__ */ v.jsx("span", { className: "kfc-expr__preview-eq", children: "=" }),
      " ",
      f
    ] }),
    s && /* @__PURE__ */ v.jsxs("div", { className: "kfc-datapick", children: [
      /* @__PURE__ */ v.jsxs("div", { className: "kfc-datapick__head", children: [
        /* @__PURE__ */ v.jsx("i", { className: "pi pi-sign-in" }),
        "Datos de «",
        (r == null ? void 0 : r.label) || "paso anterior",
        "»"
      ] }),
      !r || r.paths.length === 0 ? /* @__PURE__ */ v.jsxs("div", { className: "kfc-datapick__empty", children: [
        /* @__PURE__ */ v.jsx("i", { className: "pi pi-info-circle" }),
        /* @__PURE__ */ v.jsx("span", { children: "Prueba la automatización una vez (botón «Probar ahora») para ver las propiedades reales del paso anterior. Mientras tanto podés insertar la raíz:" }),
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-datapick__tokens", children: [
          /* @__PURE__ */ v.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $json }}"),
              children: "{{ $json }}"
            }
          ),
          /* @__PURE__ */ v.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $vars. }}"),
              children: "{{ $vars }}"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
        /* @__PURE__ */ v.jsx(
          "input",
          {
            type: "search",
            className: "kfc-datapick__search",
            placeholder: "Buscar propiedad…",
            value: a,
            onChange: (p) => u(p.target.value)
          }
        ),
        /* @__PURE__ */ v.jsxs("ul", { className: "kfc-datapick__list", children: [
          d.map((p) => /* @__PURE__ */ v.jsx("li", { children: /* @__PURE__ */ v.jsxs(
            "button",
            {
              type: "button",
              className: "kfc-datapick__row",
              onClick: () => c(`{{ $json.${p.path} }}`),
              title: `Insertar {{ $json.${p.path} }}`,
              children: [
                /* @__PURE__ */ v.jsx(
                  "span",
                  {
                    className: `kfc-datapick__type kfc-datapick__type--${p.type}`,
                    children: gE(p.type)
                  }
                ),
                /* @__PURE__ */ v.jsx("span", { className: "kfc-datapick__path", children: p.path }),
                /* @__PURE__ */ v.jsx("span", { className: "kfc-datapick__val", children: p.preview })
              ]
            }
          ) }, p.path)),
          d.length === 0 && /* @__PURE__ */ v.jsxs("li", { className: "kfc-datapick__noresult", children: [
            "Sin propiedades que coincidan con «",
            a,
            "»."
          ] })
        ] })
      ] })
    ] })
  ] });
}, ar = ({ label: e, required: t, schema: n, htmlFor: r, right: o }) => /* @__PURE__ */ v.jsxs("label", { className: "kfc-field__label", htmlFor: r, children: [
  /* @__PURE__ */ v.jsxs("span", { className: "kfc-field__labeltext", children: [
    e,
    t && /* @__PURE__ */ v.jsx("span", { className: "kfc-req", children: " *" })
  ] }),
  o
] }), pE = ({
  inputId: e,
  label: t,
  schema: n,
  description: r,
  required: o,
  readOnly: i,
  value: s,
  onChange: l
}) => {
  const a = C.useMemo(() => {
    try {
      return JSON.stringify(s ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }, [s]), [u, c] = C.useState(a), [f, d] = C.useState(null);
  return C.useEffect(() => {
    c(a), d(null);
  }, [a]), /* @__PURE__ */ v.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ v.jsx(ar, { label: t, required: o, schema: n, htmlFor: e }),
    /* @__PURE__ */ v.jsx(
      "textarea",
      {
        id: e,
        className: "kfc-textarea",
        value: u,
        readOnly: i,
        onChange: (p) => c(p.target.value),
        onBlur: () => {
          try {
            l(JSON.parse(u || "{}")), d(null);
          } catch (p) {
            d("JSON inválido: " + (p && p.message ? p.message : String(p)));
          }
        }
      }
    ),
    f && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__error", children: f }),
    r && !f && /* @__PURE__ */ v.jsx("div", { className: "kfc-field__hint", children: r })
  ] });
};
function hE(e, t, n, r) {
  var a, u, c, f;
  const o = t.edges.filter((d) => d.target === e.id).map((d) => d.source);
  let i = null;
  for (const d of o) {
    if (xd((a = r == null ? void 0 : r.nodeStates) == null ? void 0 : a[d])) {
      i = d;
      break;
    }
    i || (i = d);
  }
  let s = "paso anterior", l = null;
  if (i) {
    l = xd((u = r == null ? void 0 : r.nodeStates) == null ? void 0 : u[i]);
    const d = t.nodes.find((x) => x.id === i), p = d ? an(n, d.type) : void 0;
    s = (p == null ? void 0 : p.displayName) || "paso anterior";
  } else {
    const d = (f = (c = r == null ? void 0 : r.triggerData) == null ? void 0 : c[0]) == null ? void 0 : f.json;
    d && (l = d, s = "trigger");
  }
  return {
    label: s,
    json: l,
    paths: l ? Ga(l) : []
  };
}
function xd(e) {
  var n, r, o, i;
  const t = (i = (o = (r = (n = e == null ? void 0 : e.output) == null ? void 0 : n.main) == null ? void 0 : r[0]) == null ? void 0 : o[0]) == null ? void 0 : i.json;
  return t && typeof t == "object" ? t : null;
}
function Ga(e, t = "", n = [], r = 0) {
  if (r > 5) return n;
  if (Array.isArray(e))
    return t && n.push({ path: t, type: "array", preview: `[${e.length} elementos]` }), e.length && Ga(e[0], `${t}[0]`, n, r + 1), n;
  if (e && typeof e == "object") {
    t && n.push({ path: t, type: "object", preview: "{ objeto }" });
    for (const o of Object.keys(e)) {
      const i = t ? `${t}.${o}` : o;
      Ga(e[o], i, n, r + 1);
    }
    return n;
  }
  return n.push({
    path: t,
    type: e === null ? "null" : typeof e,
    preview: mE(e)
  }), n;
}
function mE(e) {
  return e === null ? "null" : typeof e == "string" ? e.length > 32 ? `"${e.slice(0, 32)}…"` : `"${e}"` : String(e);
}
function gE(e) {
  switch (e) {
    case "number":
      return "núm";
    case "boolean":
      return "bool";
    case "object":
      return "{}";
    case "array":
      return "[]";
    case "null":
      return "null";
    default:
      return "txt";
  }
}
function yE(e, t) {
  if (typeof e != "string" || !t) return null;
  const n = /^\s*\{\{\s*\$json\.?([\w.$[\]]*)\s*\}\}\s*$/.exec(e);
  if (!n) return null;
  const r = n[1], o = r ? vE(t, r) : t;
  if (o === void 0) return "—";
  if (o === null) return "null";
  if (typeof o == "object") return Array.isArray(o) ? `[${o.length} elementos]` : "{ objeto }";
  const i = String(o);
  return i.length > 80 ? `${i.slice(0, 80)}…` : i;
}
function vE(e, t) {
  if (!e || !t) return;
  const n = t.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let r = e;
  for (const o of n) {
    if (r == null) return;
    r = r[o];
  }
  return r;
}
const wE = {
  pending: "#9ca3af",
  running: "#2563eb",
  success: "#10b981",
  failed: "#ef4444",
  skipped: "#6b7280"
}, xE = ({ runContext: e, onClose: t }) => {
  const [n, r] = C.useState({}), o = C.useMemo(() => {
    if (!e) return [];
    const s = Object.entries(e.nodeStates).map(([l, a]) => ({
      nodeId: l,
      state: a
    }));
    return s.sort((l, a) => {
      const u = l.state.startedAt ? Date.parse(l.state.startedAt) : 0, c = a.state.startedAt ? Date.parse(a.state.startedAt) : 0;
      return u - c;
    }), s;
  }, [e]);
  if (!e)
    return /* @__PURE__ */ v.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__title", children: "Sin ejecuciones todavía" }),
      /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "Toca «Probar ahora» o espera a que la automatización arranque sola." })
    ] });
  const i = (s) => r((l) => ({ ...l, [s]: !l[s] }));
  return /* @__PURE__ */ v.jsxs("div", { className: "kfc-runlist", "aria-label": "Historial de ejecución", children: [
    /* @__PURE__ */ v.jsxs(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 8,
          marginBottom: 8
        },
        children: [
          /* @__PURE__ */ v.jsxs("div", { children: [
            /* @__PURE__ */ v.jsxs("div", { style: { fontWeight: 600, fontSize: 14 }, children: [
              "Run · ",
              e.runId.slice(0, 12),
              "…"
            ] }),
            /* @__PURE__ */ v.jsxs("div", { style: { fontSize: 12, color: "#6b7280" }, children: [
              e.startedAt,
              " · ",
              e.totalDurationMs ?? "—",
              " ms ·",
              " ",
              /* @__PURE__ */ v.jsx(
                "span",
                {
                  style: {
                    fontWeight: 600,
                    color: e.status === "success" ? "#10b981" : e.status === "failed" ? "#ef4444" : "#2563eb"
                  },
                  children: e.status
                }
              )
            ] })
          ] }),
          t && /* @__PURE__ */ v.jsx("button", { type: "button", className: "kfc-btn", onClick: t, children: "Cerrar" })
        ]
      }
    ),
    o.length === 0 && /* @__PURE__ */ v.jsx("div", { className: "kfc-empty", children: /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "No se ejecutó ningún nodo en este run." }) }),
    o.map(({ nodeId: s, state: l }) => {
      const a = !!n[s];
      return /* @__PURE__ */ v.jsxs(
        "div",
        {
          className: "kfc-runlist__item",
          style: { borderLeftColor: wE[l.status] || "#9ca3af" },
          onClick: () => i(s),
          children: [
            /* @__PURE__ */ v.jsxs("div", { className: "kfc-runlist__head", children: [
              /* @__PURE__ */ v.jsx("span", { children: s }),
              /* @__PURE__ */ v.jsx(
                "span",
                {
                  className: _e(
                    "kfc-node__status",
                    `kfc-node__status--${l.status}`
                  ),
                  style: { marginTop: 0 },
                  children: l.status
                }
              )
            ] }),
            /* @__PURE__ */ v.jsxs("div", { className: "kfc-runlist__sub", children: [
              l.startedAt || "—",
              " · ",
              l.durationMs ?? "—",
              " ms · intento",
              " ",
              l.attempt
            ] }),
            a && /* @__PURE__ */ v.jsxs("div", { children: [
              l.error && /* @__PURE__ */ v.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d" }, children: `${l.error.code || "ERROR"}: ${l.error.message}

${l.error.stack || ""}` }),
              l.output && /* @__PURE__ */ v.jsx("pre", { className: "kfc-runlist__pre", children: _E(l.output, 8e3) })
            ] })
          ]
        },
        s
      );
    })
  ] });
};
function _E(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
const SE = ({ nodeId: e, onClose: t }) => {
  var y, E, h, m;
  const n = X((g) => g.runContext), r = X((g) => g.graph), o = X((g) => g.catalog), [i, s] = C.useState("output"), l = C.useMemo(() => r.nodes.find((g) => g.id === e), [r.nodes, e]), a = C.useMemo(() => l ? an(o, l.type) : void 0, [o, l]), u = (y = n == null ? void 0 : n.nodeStates) == null ? void 0 : y[e], c = C.useMemo(() => {
    var N, P;
    if (!n || !l) return [];
    const g = r.edges.filter((T) => T.target === e), w = [];
    for (const T of g) {
      const M = (N = n.nodeStates) == null ? void 0 : N[T.source];
      if ((P = M == null ? void 0 : M.output) != null && P.main)
        for (const k of M.output.main)
          Array.isArray(k) && w.push(...k);
    }
    return w;
  }, [n, l, r.edges, e]);
  if (!l)
    return /* @__PURE__ */ v.jsx("aside", { className: "kfc-drawer", "aria-label": "Logs del nodo", children: /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ v.jsx("div", { children: /* @__PURE__ */ v.jsx("div", { className: "kfc-drawer__title", children: "Nodo no encontrado" }) }),
      /* @__PURE__ */ v.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-times" }) })
    ] }) });
  const f = (u == null ? void 0 : u.status) || "pending", d = ((h = (E = u == null ? void 0 : u.output) == null ? void 0 : E.main) == null ? void 0 : h.flat()) || [], p = ((m = u == null ? void 0 : u.output) == null ? void 0 : m.error) || [], x = d.length;
  return /* @__PURE__ */ v.jsxs("aside", { className: "kfc-drawer", "aria-label": `Logs del nodo ${l.id}`, children: [
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ v.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__title", title: (a == null ? void 0 : a.displayName) || l.type, children: [
          /* @__PURE__ */ v.jsx(
            "i",
            {
              className: _e((a == null ? void 0 : a.icon) || "pi pi-circle"),
              style: { color: (a == null ? void 0 : a.color) || "#5E72E4", marginRight: 6 }
            }
          ),
          (a == null ? void 0 : a.displayName) || l.type
        ] }),
        /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__sub", children: [
          /* @__PURE__ */ v.jsx("span", { className: _e("kfc-node__status", `kfc-node__status--${f}`), children: f }),
          (u == null ? void 0 : u.durationMs) != null && /* @__PURE__ */ v.jsxs("span", { children: [
            "· ",
            _d(u.durationMs)
          ] }),
          (u == null ? void 0 : u.attempt) != null && /* @__PURE__ */ v.jsxs("span", { children: [
            "· intento ",
            u.attempt
          ] })
        ] })
      ] }),
      /* @__PURE__ */ v.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-times" }) })
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__tabs", role: "tablist", children: [
      /* @__PURE__ */ v.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "output",
          className: _e("kfc-drawer__tab", { "is-active": i === "output" }),
          onClick: () => s("output"),
          children: [
            "Salida ",
            x > 0 && /* @__PURE__ */ v.jsx("span", { className: "kfc-drawer__tab-count", children: x })
          ]
        }
      ),
      /* @__PURE__ */ v.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "input",
          className: _e("kfc-drawer__tab", { "is-active": i === "input" }),
          onClick: () => s("input"),
          children: [
            "Entrada ",
            c.length > 0 && /* @__PURE__ */ v.jsx("span", { className: "kfc-drawer__tab-count", children: c.length })
          ]
        }
      ),
      /* @__PURE__ */ v.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "error",
          className: _e("kfc-drawer__tab", { "is-active": i === "error" }),
          onClick: () => s("error"),
          disabled: !(u != null && u.error) && p.length === 0,
          children: "Error"
        }
      ),
      /* @__PURE__ */ v.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "meta",
          className: _e("kfc-drawer__tab", { "is-active": i === "meta" }),
          onClick: () => s("meta"),
          children: "Detalles"
        }
      )
    ] }),
    /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__body", children: [
      !u && /* @__PURE__ */ v.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__title", children: "Sin datos de ejecución" }),
        /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "Este paso no corrió en la última prueba. Toca «Probar ahora»." })
      ] }),
      u && i === "output" && /* @__PURE__ */ v.jsx(v.Fragment, { children: d.length === 0 ? /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de salida." }) : d.map((g, w) => /* @__PURE__ */ v.jsx(Fl, { index: w, item: g }, w)) }),
      u && i === "input" && /* @__PURE__ */ v.jsx(v.Fragment, { children: c.length === 0 ? /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de entrada (probablemente es un trigger)." }) : c.map((g, w) => /* @__PURE__ */ v.jsx(Fl, { index: w, item: g }, w)) }),
      u && i === "error" && /* @__PURE__ */ v.jsxs("div", { style: { padding: 12 }, children: [
        u.error ? /* @__PURE__ */ v.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d", color: "#fee2e2" }, children: `${u.error.code || "ERROR"}: ${u.error.message}

${u.error.stack || ""}` }) : /* @__PURE__ */ v.jsx("div", { className: "kfc-empty__desc", children: "Sin errores." }),
        p.length > 0 && /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
          /* @__PURE__ */ v.jsx("div", { className: "kfc-drawer__section-title", children: "Items en branch de error" }),
          p.map((g, w) => /* @__PURE__ */ v.jsx(Fl, { index: w, item: g }, w))
        ] })
      ] }),
      u && i === "meta" && /* @__PURE__ */ v.jsxs("div", { style: { padding: 12, fontSize: 12 }, children: [
        /* @__PURE__ */ v.jsx(Jt, { k: "Status", v: u.status }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Iniciado", v: u.startedAt || "—" }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Finalizado", v: u.finishedAt || "—" }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Duración", v: u.durationMs != null ? _d(u.durationMs) : "—" }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Intento", v: String(u.attempt ?? "—") }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Items salida", v: String(x) }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Spec", v: (a == null ? void 0 : a.type) || l.type }),
        /* @__PURE__ */ v.jsx(Jt, { k: "Versión spec", v: a ? `v${a.version}` : "—" })
      ] })
    ] })
  ] });
}, Fl = ({ item: e, index: t }) => {
  const [n, r] = C.useState(t < 3);
  return /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__item", children: [
    /* @__PURE__ */ v.jsxs(
      "button",
      {
        type: "button",
        className: "kfc-drawer__item-head",
        onClick: () => r((o) => !o),
        "aria-expanded": n,
        children: [
          /* @__PURE__ */ v.jsx("i", { className: `pi ${n ? "pi-chevron-down" : "pi-chevron-right"}` }),
          /* @__PURE__ */ v.jsxs("span", { children: [
            "Item #",
            t + 1
          ] }),
          (e == null ? void 0 : e.json) && typeof e.json == "object" && /* @__PURE__ */ v.jsx("span", { className: "kfc-drawer__item-summary", children: EE(e.json) })
        ]
      }
    ),
    n && /* @__PURE__ */ v.jsx("pre", { className: "kfc-runlist__pre", children: kE(e, 6e3) })
  ] });
}, Jt = ({ k: e, v: t }) => /* @__PURE__ */ v.jsxs("div", { className: "kfc-drawer__kv", children: [
  /* @__PURE__ */ v.jsx("span", { className: "kfc-drawer__kv-k", children: e }),
  /* @__PURE__ */ v.jsx("span", { className: "kfc-drawer__kv-v", children: t })
] });
function kE(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
function _d(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function EE(e) {
  if (!e) return "";
  const t = Object.keys(e);
  return t.length === 0 ? "(vacío)" : t.slice(0, 3).join(", ") + (t.length > 3 ? `, +${t.length - 3} más` : "");
}
const NE = ({ readOnly: e, onTemplateClick: t }) => e ? null : /* @__PURE__ */ v.jsx("div", { className: "kfc-canvas-empty", role: "status", "aria-live": "polite", children: /* @__PURE__ */ v.jsxs("div", { className: "kfc-canvas-empty__inner", children: [
  /* @__PURE__ */ v.jsx("span", { className: "kfc-canvas-empty__eyebrow", children: "Modo avanzado" }),
  /* @__PURE__ */ v.jsx("h2", { className: "kfc-canvas-empty__title", children: "Arma tu automatización paso a paso" }),
  /* @__PURE__ */ v.jsx("p", { className: "kfc-canvas-empty__desc", children: "Arrastra un paso desde la lista de la izquierda y suéltalo aquí. Empieza por el paso que la arranca (por ejemplo, «Cuando entra un pedido en Shopify») y luego conecta los demás." }),
  /* @__PURE__ */ v.jsx("div", { className: "kfc-canvas-empty__acciones", children: /* @__PURE__ */ v.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: () => t == null ? void 0 : t(), children: [
    /* @__PURE__ */ v.jsx("i", { className: "pi pi-th-large" }),
    "Mejor empezar con una plantilla"
  ] }) }),
  /* @__PURE__ */ v.jsxs("div", { className: "kfc-canvas-empty__hint", children: [
    /* @__PURE__ */ v.jsx("i", { className: "pi pi-info-circle" }),
    /* @__PURE__ */ v.jsxs("span", { children: [
      "Toca ",
      /* @__PURE__ */ v.jsx("kbd", { children: "?" }),
      " para ver los atajos de teclado."
    ] })
  ] })
] }) }), CE = ({
  onGraphChange: e,
  onNodeSelected: t,
  onRunRequested: n,
  onIntent: r
}) => {
  const o = X((O) => O.graph), i = X((O) => O.selectedNodeId), s = X((O) => O.setSelectedNodeId), l = X((O) => O.readOnly), a = X((O) => O.runContext), u = X((O) => O.rightView), c = X((O) => O.setRightView), f = X((O) => O.drawerNodeId), d = X((O) => O.setDrawerNodeId), p = X((O) => O.applyAutoLayout), [x, y] = I.useState(!1);
  C.useEffect(() => {
    e(o), y(dg(o));
  }, [o, e]), C.useEffect(() => {
    t(i), i && u === "none" ? c("config") : !i && u === "config" && c("none");
  }, [i]);
  const E = C.useCallback(
    (O) => {
      s(O);
    },
    [s]
  ), h = C.useCallback(() => {
    c("none"), s(null);
  }, [s, c]), m = C.useCallback(() => {
    n({ triggerData: [] });
  }, [n]), g = C.useCallback(() => {
    p(), r && r("autoLayoutApplied");
  }, [p, r]), w = C.useCallback(() => {
    r && r("showShortcuts");
  }, [r]), N = a == null ? void 0 : a.status, P = N === "running", T = C.useMemo(() => {
    if (!a) return null;
    const O = Object.values(a.nodeStates || {}), H = O.length, _ = O.filter((z) => z.status === "success" || z.status === "failed" || z.status === "skipped").length, $ = O.filter((z) => z.status === "failed").length;
    return { total: H, done: _, failed: $ };
  }, [a]), M = !o.nodes || o.nodes.length === 0, k = C.useCallback(() => d(null), [d]), A = u === "config" && i, F = u === "runs";
  return /* @__PURE__ */ v.jsx(ac, { children: /* @__PURE__ */ v.jsxs("div", { className: "kfc-root", children: [
    !A && /* @__PURE__ */ v.jsx(sE, { readOnly: l }),
    /* @__PURE__ */ v.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }, children: [
      /* @__PURE__ */ v.jsxs("div", { className: "kfc-toolbar", children: [
        /* @__PURE__ */ v.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: () => c(u === "runs" ? "none" : "runs"),
            title: "Ver el resultado de la última prueba",
            children: [
              /* @__PURE__ */ v.jsx("i", { className: "pi pi-history" }),
              "Última prueba"
            ]
          }
        ),
        !l && /* @__PURE__ */ v.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: g,
            title: "Ordenar los pasos automáticamente",
            children: [
              /* @__PURE__ */ v.jsx("i", { className: "pi pi-sitemap" }),
              "Ordenar"
            ]
          }
        ),
        !l && /* @__PURE__ */ v.jsx(
          "button",
          {
            type: "button",
            className: `kfc-btn kfc-btn--primary ${P ? "kfc-btn--running" : ""}`,
            onClick: m,
            disabled: P,
            title: "Probar ahora (Ctrl+Enter)",
            children: P ? /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
              /* @__PURE__ */ v.jsx("i", { className: "pi pi-spin pi-spinner" }),
              "Probando…"
            ] }) : /* @__PURE__ */ v.jsxs(v.Fragment, { children: [
              /* @__PURE__ */ v.jsx("i", { className: "pi pi-play" }),
              "Probar ahora"
            ] })
          }
        ),
        T && T.total > 0 && /* @__PURE__ */ v.jsxs(
          "span",
          {
            className: `kfc-run-badge kfc-run-badge--${N === "success" ? "success" : N === "failed" ? "failed" : P ? "running" : "neutral"}`,
            title: "Resultado de la prueba",
            children: [
              P && /* @__PURE__ */ v.jsx("i", { className: "pi pi-spin pi-spinner" }),
              !P && N === "success" && /* @__PURE__ */ v.jsx("i", { className: "pi pi-check-circle" }),
              !P && N === "failed" && /* @__PURE__ */ v.jsx("i", { className: "pi pi-times-circle" }),
              T.done,
              "/",
              T.total,
              " pasos",
              T.failed > 0 && /* @__PURE__ */ v.jsxs("span", { className: "kfc-run-badge__failed", children: [
                "· ",
                T.failed,
                " con error"
              ] })
            ]
          }
        ),
        x && /* @__PURE__ */ v.jsxs("span", { className: "kfc-pill kfc-pill--danger", title: "Hay conexiones en círculo", children: [
          /* @__PURE__ */ v.jsx("i", { className: "pi pi-exclamation-triangle" }),
          "Hay conexiones en círculo: revísalas"
        ] }),
        /* @__PURE__ */ v.jsx("span", { style: { flex: 1 } }),
        /* @__PURE__ */ v.jsx(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--ghost",
            onClick: w,
            title: "Atajos de teclado (?)",
            "aria-label": "Atajos de teclado",
            children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-question-circle" })
          }
        ),
        l && /* @__PURE__ */ v.jsxs("span", { className: "kfc-pill kfc-pill--neutral", children: [
          /* @__PURE__ */ v.jsx("i", { className: "pi pi-lock" }),
          "Solo lectura"
        ] })
      ] }),
      /* @__PURE__ */ v.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
        /* @__PURE__ */ v.jsx(iE, { onSelectNode: E, onIntent: r }),
        M && /* @__PURE__ */ v.jsx(
          NE,
          {
            readOnly: l,
            onTemplateClick: () => r == null ? void 0 : r("openTemplates")
          }
        )
      ] })
    ] }),
    A && /* @__PURE__ */ v.jsx(
      cE,
      {
        onClose: h,
        onOpenIntegrations: (O) => r == null ? void 0 : r("openIntegrations", { provider: O })
      }
    ),
    F && /* @__PURE__ */ v.jsxs("aside", { className: "kfc-config", "aria-label": "Resultado de la prueba", children: [
      /* @__PURE__ */ v.jsxs("div", { className: "kfc-config__header", children: [
        /* @__PURE__ */ v.jsxs("div", { children: [
          /* @__PURE__ */ v.jsx("div", { className: "kfc-config__title", children: "Resultado de la prueba" }),
          a && /* @__PURE__ */ v.jsxs("div", { style: { fontSize: 11, color: "#6b7280" }, children: [
            { success: "Bien", failed: "Falló", partial: "Con pendientes", running: "Probando", cancelled: "Cancelada" }[N || ""] || "",
            a.totalDurationMs != null ? ` · ${(a.totalDurationMs / 1e3).toFixed(1).replace(".", ",")} s` : ""
          ] })
        ] }),
        /* @__PURE__ */ v.jsx("button", { type: "button", className: "kfc-btn", onClick: () => c("none"), "aria-label": "Cerrar", children: /* @__PURE__ */ v.jsx("i", { className: "pi pi-times" }) })
      ] }),
      /* @__PURE__ */ v.jsx("div", { className: "kfc-config__body", style: { padding: 0 }, children: /* @__PURE__ */ v.jsx(xE, { runContext: a }) })
    ] }),
    f && /* @__PURE__ */ v.jsx(SE, { nodeId: f, onClose: k })
  ] }) });
};
class zE extends HTMLElement {
  constructor() {
    super(...arguments);
    ht(this, "root", null);
    ht(this, "mountPoint", null);
    ht(this, "suppressEmit", !1);
    ht(this, "keydownHandler");
    ht(this, "_graph", { nodes: [], edges: [] });
    ht(this, "_catalog", []);
    ht(this, "_runContext", null);
    ht(this, "_readOnly", !1);
    ht(this, "_selectedNodeId", null);
    ht(this, "_connectedProviders", null);
  }
  // ------ property accessors (Angular property bindings hit these) ------
  set graph(n) {
    this._graph = n || { nodes: [], edges: [] }, this.suppressEmit = !0, X.getState().setGraph(this._graph), this.suppressEmit = !1;
  }
  get graph() {
    return X.getState().graph;
  }
  set nodeCatalog(n) {
    this._catalog = Array.isArray(n) ? n : [], X.getState().setCatalog(this._catalog);
  }
  get nodeCatalog() {
    return X.getState().catalog;
  }
  set runContext(n) {
    this._runContext = n, X.getState().setRunContext(n);
  }
  get runContext() {
    return X.getState().runContext;
  }
  set readOnly(n) {
    this._readOnly = !!n, X.getState().setReadOnly(this._readOnly);
  }
  get readOnly() {
    return X.getState().readOnly;
  }
  set selectedNodeId(n) {
    this._selectedNodeId = n, X.getState().setSelectedNodeId(n);
  }
  get selectedNodeId() {
    return X.getState().selectedNodeId;
  }
  set connectedProviders(n) {
    this._connectedProviders = Array.isArray(n) ? n : null, X.getState().setConnectedProviders(this._connectedProviders);
  }
  get connectedProviders() {
    return X.getState().connectedProviders;
  }
  static get observedAttributes() {
    return ["read-only"];
  }
  attributeChangedCallback(n, r, o) {
    n === "read-only" && (this.readOnly = o !== null && o !== "false");
  }
  connectedCallback() {
    this.root || (this.mountPoint = document.createElement("div"), this.mountPoint.style.width = "100%", this.mountPoint.style.height = "100%", this.mountPoint.style.position = "relative", this.mountPoint.style.display = "flex", this.style.display = this.style.display || "block", this.style.position = this.style.position || "relative", this.style.minHeight = this.style.minHeight || "500px", this.appendChild(this.mountPoint), X.getState().setGraph(this._graph), X.getState().setCatalog(this._catalog), X.getState().setRunContext(this._runContext), X.getState().setReadOnly(this._readOnly), X.getState().setSelectedNodeId(this._selectedNodeId), X.getState().setConnectedProviders(this._connectedProviders), this.root = $h(this.mountPoint), this.root.render(
      /* @__PURE__ */ v.jsx(
        CE,
        {
          onGraphChange: (n) => this.emitGraphChange(n),
          onNodeSelected: (n) => this.emitNodeSelected(n),
          onRunRequested: (n) => this.emitRunRequested(n),
          onIntent: (n, r) => this.emitIntent(n, r)
        }
      )
    ), this.keydownHandler = (n) => this.onKeydown(n), document.addEventListener("keydown", this.keydownHandler));
  }
  disconnectedCallback() {
    var n;
    try {
      (n = this.root) == null || n.unmount();
    } catch {
    }
    this.root = null, this.mountPoint && this.mountPoint.parentNode === this && this.removeChild(this.mountPoint), this.mountPoint = null, this.keydownHandler && (document.removeEventListener("keydown", this.keydownHandler), this.keydownHandler = void 0);
  }
  /**
   * Lightweight keyboard shortcuts handled by the WC.
   * - "?" → emit showShortcuts
   * - "Esc" → close right panel
   * - "Ctrl/Cmd+Enter" → request run (if not readOnly)
   * Cmd+S, Cmd+Z stay in Angular (host) so undo/save work outside canvas too.
   */
  onKeydown(n) {
    const r = n.target;
    if (r && (r.tagName === "INPUT" || r.tagName === "TEXTAREA" || r.tagName === "SELECT" || r.isContentEditable)) return;
    if ((n.ctrlKey || n.metaKey) && n.key === "Enter") {
      n.preventDefault(), X.getState().readOnly || this.emitRunRequested({ triggerData: [] });
      return;
    }
    if (n.key === "Escape") {
      const s = X.getState();
      s.drawerNodeId ? (s.setDrawerNodeId(null), n.preventDefault()) : s.rightView !== "none" && (s.setRightView("none"), s.setSelectedNodeId(null), n.preventDefault());
      return;
    }
    (n.key === "?" || n.shiftKey && n.key === "/") && (n.preventDefault(), this.emitIntent("showShortcuts"));
  }
  emitGraphChange(n) {
    this.suppressEmit || this.dispatchEvent(
      new CustomEvent("graphChange", {
        detail: n,
        bubbles: !0,
        composed: !0
      })
    );
  }
  emitNodeSelected(n) {
    this.dispatchEvent(
      new CustomEvent("nodeSelected", {
        detail: { nodeId: n },
        bubbles: !0,
        composed: !0
      })
    );
  }
  emitRunRequested(n) {
    this.dispatchEvent(
      new CustomEvent("runRequested", {
        detail: n || {},
        bubbles: !0,
        composed: !0
      })
    );
  }
  emitIntent(n, r) {
    this.dispatchEvent(
      new CustomEvent("canvasIntent", {
        detail: { intent: n, payload: r || {} },
        bubbles: !0,
        composed: !0
      })
    );
  }
}
customElements.get("katuq-flow-canvas") || customElements.define("katuq-flow-canvas", zE);
export {
  zE as KatuqFlowCanvas
};
//# sourceMappingURL=flow-canvas.js.map
