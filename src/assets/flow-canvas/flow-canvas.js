var Vg = Object.defineProperty;
var bg = (e, t, n) => t in e ? Vg(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var ht = (e, t, n) => bg(e, typeof t != "symbol" ? t + "" : t, n);
function Ka(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var gd = { exports: {} }, Cs = {}, yd = { exports: {} }, J = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Zo = Symbol.for("react.element"), Bg = Symbol.for("react.portal"), Ug = Symbol.for("react.fragment"), Wg = Symbol.for("react.strict_mode"), Yg = Symbol.for("react.profiler"), Xg = Symbol.for("react.provider"), Kg = Symbol.for("react.context"), Gg = Symbol.for("react.forward_ref"), Qg = Symbol.for("react.suspense"), Zg = Symbol.for("react.memo"), qg = Symbol.for("react.lazy"), fc = Symbol.iterator;
function Jg(e) {
  return e === null || typeof e != "object" ? null : (e = fc && e[fc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var vd = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, wd = Object.assign, xd = {};
function Br(e, t, n) {
  this.props = e, this.context = t, this.refs = xd, this.updater = n || vd;
}
Br.prototype.isReactComponent = {};
Br.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Br.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function _d() {
}
_d.prototype = Br.prototype;
function Ga(e, t, n) {
  this.props = e, this.context = t, this.refs = xd, this.updater = n || vd;
}
var Qa = Ga.prototype = new _d();
Qa.constructor = Ga;
wd(Qa, Br.prototype);
Qa.isPureReactComponent = !0;
var dc = Array.isArray, kd = Object.prototype.hasOwnProperty, Za = { current: null }, Sd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ed(e, t, n) {
  var r, o = {}, i = null, s = null;
  if (t != null) for (r in t.ref !== void 0 && (s = t.ref), t.key !== void 0 && (i = "" + t.key), t) kd.call(t, r) && !Sd.hasOwnProperty(r) && (o[r] = t[r]);
  var l = arguments.length - 2;
  if (l === 1) o.children = n;
  else if (1 < l) {
    for (var a = Array(l), u = 0; u < l; u++) a[u] = arguments[u + 2];
    o.children = a;
  }
  if (e && e.defaultProps) for (r in l = e.defaultProps, l) o[r] === void 0 && (o[r] = l[r]);
  return { $$typeof: Zo, type: e, key: i, ref: s, props: o, _owner: Za.current };
}
function e0(e, t) {
  return { $$typeof: Zo, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function qa(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Zo;
}
function t0(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var pc = /\/+/g;
function Js(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? t0("" + e.key) : t.toString(36);
}
function Ti(e, t, n, r, o) {
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
        case Zo:
        case Bg:
          s = !0;
      }
  }
  if (s) return s = e, o = o(s), e = r === "" ? "." + Js(s, 0) : r, dc(o) ? (n = "", e != null && (n = e.replace(pc, "$&/") + "/"), Ti(o, t, n, "", function(u) {
    return u;
  })) : o != null && (qa(o) && (o = e0(o, n + (!o.key || s && s.key === o.key ? "" : ("" + o.key).replace(pc, "$&/") + "/") + e)), t.push(o)), 1;
  if (s = 0, r = r === "" ? "." : r + ":", dc(e)) for (var l = 0; l < e.length; l++) {
    i = e[l];
    var a = r + Js(i, l);
    s += Ti(i, t, n, a, o);
  }
  else if (a = Jg(e), typeof a == "function") for (e = a.call(e), l = 0; !(i = e.next()).done; ) i = i.value, a = r + Js(i, l++), s += Ti(i, t, n, a, o);
  else if (i === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return s;
}
function ii(e, t, n) {
  if (e == null) return e;
  var r = [], o = 0;
  return Ti(e, r, "", "", function(i) {
    return t.call(n, i, o++);
  }), r;
}
function n0(e) {
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
var be = { current: null }, $i = { transition: null }, r0 = { ReactCurrentDispatcher: be, ReactCurrentBatchConfig: $i, ReactCurrentOwner: Za };
function Nd() {
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
  if (!qa(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
J.Component = Br;
J.Fragment = Ug;
J.Profiler = Yg;
J.PureComponent = Ga;
J.StrictMode = Wg;
J.Suspense = Qg;
J.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = r0;
J.act = Nd;
J.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = wd({}, e.props), o = e.key, i = e.ref, s = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (i = t.ref, s = Za.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps) var l = e.type.defaultProps;
    for (a in t) kd.call(t, a) && !Sd.hasOwnProperty(a) && (r[a] = t[a] === void 0 && l !== void 0 ? l[a] : t[a]);
  }
  var a = arguments.length - 2;
  if (a === 1) r.children = n;
  else if (1 < a) {
    l = Array(a);
    for (var u = 0; u < a; u++) l[u] = arguments[u + 2];
    r.children = l;
  }
  return { $$typeof: Zo, type: e.type, key: o, ref: i, props: r, _owner: s };
};
J.createContext = function(e) {
  return e = { $$typeof: Kg, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Xg, _context: e }, e.Consumer = e;
};
J.createElement = Ed;
J.createFactory = function(e) {
  var t = Ed.bind(null, e);
  return t.type = e, t;
};
J.createRef = function() {
  return { current: null };
};
J.forwardRef = function(e) {
  return { $$typeof: Gg, render: e };
};
J.isValidElement = qa;
J.lazy = function(e) {
  return { $$typeof: qg, _payload: { _status: -1, _result: e }, _init: n0 };
};
J.memo = function(e, t) {
  return { $$typeof: Zg, type: e, compare: t === void 0 ? null : t };
};
J.startTransition = function(e) {
  var t = $i.transition;
  $i.transition = {};
  try {
    e();
  } finally {
    $i.transition = t;
  }
};
J.unstable_act = Nd;
J.useCallback = function(e, t) {
  return be.current.useCallback(e, t);
};
J.useContext = function(e) {
  return be.current.useContext(e);
};
J.useDebugValue = function() {
};
J.useDeferredValue = function(e) {
  return be.current.useDeferredValue(e);
};
J.useEffect = function(e, t) {
  return be.current.useEffect(e, t);
};
J.useId = function() {
  return be.current.useId();
};
J.useImperativeHandle = function(e, t, n) {
  return be.current.useImperativeHandle(e, t, n);
};
J.useInsertionEffect = function(e, t) {
  return be.current.useInsertionEffect(e, t);
};
J.useLayoutEffect = function(e, t) {
  return be.current.useLayoutEffect(e, t);
};
J.useMemo = function(e, t) {
  return be.current.useMemo(e, t);
};
J.useReducer = function(e, t, n) {
  return be.current.useReducer(e, t, n);
};
J.useRef = function(e) {
  return be.current.useRef(e);
};
J.useState = function(e) {
  return be.current.useState(e);
};
J.useSyncExternalStore = function(e, t, n) {
  return be.current.useSyncExternalStore(e, t, n);
};
J.useTransition = function() {
  return be.current.useTransition();
};
J.version = "18.3.1";
yd.exports = J;
var P = yd.exports;
const I = /* @__PURE__ */ Ka(P);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var o0 = P, i0 = Symbol.for("react.element"), s0 = Symbol.for("react.fragment"), l0 = Object.prototype.hasOwnProperty, a0 = o0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, u0 = { key: !0, ref: !0, __self: !0, __source: !0 };
function Cd(e, t, n) {
  var r, o = {}, i = null, s = null;
  n !== void 0 && (i = "" + n), t.key !== void 0 && (i = "" + t.key), t.ref !== void 0 && (s = t.ref);
  for (r in t) l0.call(t, r) && !u0.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: i0, type: e, key: i, ref: s, props: o, _owner: a0.current };
}
Cs.Fragment = s0;
Cs.jsx = Cd;
Cs.jsxs = Cd;
gd.exports = Cs;
var y = gd.exports, jd = { exports: {} }, nt = {}, Pd = { exports: {} }, Md = {};
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
  function t($, E) {
    var A = $.length;
    $.push(E);
    e: for (; 0 < A; ) {
      var O = A - 1 >>> 1, H = $[O];
      if (0 < o(H, E)) $[O] = E, $[A] = H, A = O;
      else break e;
    }
  }
  function n($) {
    return $.length === 0 ? null : $[0];
  }
  function r($) {
    if ($.length === 0) return null;
    var E = $[0], A = $.pop();
    if (A !== E) {
      $[0] = A;
      e: for (var O = 0, H = $.length, U = H >>> 1; O < U; ) {
        var B = 2 * (O + 1) - 1, X = $[B], Q = B + 1, Z = $[Q];
        if (0 > o(X, A)) Q < H && 0 > o(Z, X) ? ($[O] = Z, $[Q] = A, O = Q) : ($[O] = X, $[B] = A, O = B);
        else if (Q < H && 0 > o(Z, A)) $[O] = Z, $[Q] = A, O = Q;
        else break e;
      }
    }
    return E;
  }
  function o($, E) {
    var A = $.sortIndex - E.sortIndex;
    return A !== 0 ? A : $.id - E.id;
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
  var a = [], u = [], c = 1, f = null, d = 3, p = !1, x = !1, v = !1, S = typeof setTimeout == "function" ? setTimeout : null, h = typeof clearTimeout == "function" ? clearTimeout : null, m = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function g($) {
    for (var E = n(u); E !== null; ) {
      if (E.callback === null) r(u);
      else if (E.startTime <= $) r(u), E.sortIndex = E.expirationTime, t(a, E);
      else break;
      E = n(u);
    }
  }
  function w($) {
    if (v = !1, g($), !x) if (n(a) !== null) x = !0, j(N);
    else {
      var E = n(u);
      E !== null && L(w, E.startTime - $);
    }
  }
  function N($, E) {
    x = !1, v && (v = !1, h(T), T = -1), p = !0;
    var A = d;
    try {
      for (g(E), f = n(a); f !== null && (!(f.expirationTime > E) || $ && !F()); ) {
        var O = f.callback;
        if (typeof O == "function") {
          f.callback = null, d = f.priorityLevel;
          var H = O(f.expirationTime <= E);
          E = e.unstable_now(), typeof H == "function" ? f.callback = H : f === n(a) && r(a), g(E);
        } else r(a);
        f = n(a);
      }
      if (f !== null) var U = !0;
      else {
        var B = n(u);
        B !== null && L(w, B.startTime - E), U = !1;
      }
      return U;
    } finally {
      f = null, d = A, p = !1;
    }
  }
  var M = !1, z = null, T = -1, k = 5, R = -1;
  function F() {
    return !(e.unstable_now() - R < k);
  }
  function D() {
    if (z !== null) {
      var $ = e.unstable_now();
      R = $;
      var E = !0;
      try {
        E = z(!0, $);
      } finally {
        E ? V() : (M = !1, z = null);
      }
    } else M = !1;
  }
  var V;
  if (typeof m == "function") V = function() {
    m(D);
  };
  else if (typeof MessageChannel < "u") {
    var _ = new MessageChannel(), C = _.port2;
    _.port1.onmessage = D, V = function() {
      C.postMessage(null);
    };
  } else V = function() {
    S(D, 0);
  };
  function j($) {
    z = $, M || (M = !0, V());
  }
  function L($, E) {
    T = S(function() {
      $(e.unstable_now());
    }, E);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function($) {
    $.callback = null;
  }, e.unstable_continueExecution = function() {
    x || p || (x = !0, j(N));
  }, e.unstable_forceFrameRate = function($) {
    0 > $ || 125 < $ ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : k = 0 < $ ? Math.floor(1e3 / $) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return d;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(a);
  }, e.unstable_next = function($) {
    switch (d) {
      case 1:
      case 2:
      case 3:
        var E = 3;
        break;
      default:
        E = d;
    }
    var A = d;
    d = E;
    try {
      return $();
    } finally {
      d = A;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function($, E) {
    switch ($) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        $ = 3;
    }
    var A = d;
    d = $;
    try {
      return E();
    } finally {
      d = A;
    }
  }, e.unstable_scheduleCallback = function($, E, A) {
    var O = e.unstable_now();
    switch (typeof A == "object" && A !== null ? (A = A.delay, A = typeof A == "number" && 0 < A ? O + A : O) : A = O, $) {
      case 1:
        var H = -1;
        break;
      case 2:
        H = 250;
        break;
      case 5:
        H = 1073741823;
        break;
      case 4:
        H = 1e4;
        break;
      default:
        H = 5e3;
    }
    return H = A + H, $ = { id: c++, callback: E, priorityLevel: $, startTime: A, expirationTime: H, sortIndex: -1 }, A > O ? ($.sortIndex = A, t(u, $), n(a) === null && $ === n(u) && (v ? (h(T), T = -1) : v = !0, L(w, A - O))) : ($.sortIndex = H, t(a, $), x || p || (x = !0, j(N))), $;
  }, e.unstable_shouldYield = F, e.unstable_wrapCallback = function($) {
    var E = d;
    return function() {
      var A = d;
      d = E;
      try {
        return $.apply(this, arguments);
      } finally {
        d = A;
      }
    };
  };
})(Md);
Pd.exports = Md;
var c0 = Pd.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f0 = P, et = c0;
function b(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var zd = /* @__PURE__ */ new Set(), Co = {};
function Qn(e, t) {
  Tr(e, t), Tr(e + "Capture", t);
}
function Tr(e, t) {
  for (Co[e] = t, e = 0; e < t.length; e++) zd.add(t[e]);
}
var Ut = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Ol = Object.prototype.hasOwnProperty, d0 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, hc = {}, mc = {};
function p0(e) {
  return Ol.call(mc, e) ? !0 : Ol.call(hc, e) ? !1 : d0.test(e) ? mc[e] = !0 : (hc[e] = !0, !1);
}
function h0(e, t, n, r) {
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
function m0(e, t, n, r) {
  if (t === null || typeof t > "u" || h0(e, t, n, r)) return !0;
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
var ze = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  ze[e] = new Be(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  ze[t] = new Be(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  ze[e] = new Be(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  ze[e] = new Be(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  ze[e] = new Be(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  ze[e] = new Be(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  ze[e] = new Be(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  ze[e] = new Be(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  ze[e] = new Be(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Ja = /[\-:]([a-z])/g;
function eu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Ja,
    eu
  );
  ze[t] = new Be(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Ja, eu);
  ze[t] = new Be(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Ja, eu);
  ze[t] = new Be(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  ze[e] = new Be(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
ze.xlinkHref = new Be("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  ze[e] = new Be(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function tu(e, t, n, r) {
  var o = ze.hasOwnProperty(t) ? ze[t] : null;
  (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (m0(t, n, o, r) && (n = null), r || o === null ? p0(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName, r = o.attributeNamespace, n === null ? e.removeAttribute(t) : (o = o.type, n = o === 3 || o === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Qt = f0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, si = Symbol.for("react.element"), ur = Symbol.for("react.portal"), cr = Symbol.for("react.fragment"), nu = Symbol.for("react.strict_mode"), Fl = Symbol.for("react.profiler"), Td = Symbol.for("react.provider"), $d = Symbol.for("react.context"), ru = Symbol.for("react.forward_ref"), Hl = Symbol.for("react.suspense"), Vl = Symbol.for("react.suspense_list"), ou = Symbol.for("react.memo"), en = Symbol.for("react.lazy"), Rd = Symbol.for("react.offscreen"), gc = Symbol.iterator;
function Qr(e) {
  return e === null || typeof e != "object" ? null : (e = gc && e[gc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var pe = Object.assign, el;
function uo(e) {
  if (el === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    el = t && t[1] || "";
  }
  return `
` + el + e;
}
var tl = !1;
function nl(e, t) {
  if (!e || tl) return "";
  tl = !0;
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
    tl = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? uo(e) : "";
}
function g0(e) {
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
      return e = nl(e.type, !1), e;
    case 11:
      return e = nl(e.type.render, !1), e;
    case 1:
      return e = nl(e.type, !0), e;
    default:
      return "";
  }
}
function bl(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case cr:
      return "Fragment";
    case ur:
      return "Portal";
    case Fl:
      return "Profiler";
    case nu:
      return "StrictMode";
    case Hl:
      return "Suspense";
    case Vl:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case $d:
      return (e.displayName || "Context") + ".Consumer";
    case Td:
      return (e._context.displayName || "Context") + ".Provider";
    case ru:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case ou:
      return t = e.displayName || null, t !== null ? t : bl(e.type) || "Memo";
    case en:
      t = e._payload, e = e._init;
      try {
        return bl(e(t));
      } catch {
      }
  }
  return null;
}
function y0(e) {
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
      return bl(t);
    case 8:
      return t === nu ? "StrictMode" : "Mode";
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
function Ad(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function v0(e) {
  var t = Ad(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
  e._valueTracker || (e._valueTracker = v0(e));
}
function Id(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Ad(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function Xi(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Bl(e, t) {
  var n = t.checked;
  return pe({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function yc(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = xn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Ld(e, t) {
  t = t.checked, t != null && tu(e, "checked", t, !1);
}
function Ul(e, t) {
  Ld(e, t);
  var n = xn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? Wl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Wl(e, t.type, xn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function vc(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function Wl(e, t, n) {
  (t !== "number" || Xi(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var co = Array.isArray;
function kr(e, t, n, r) {
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
function Yl(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(b(91));
  return pe({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function wc(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(b(92));
      if (co(n)) {
        if (1 < n.length) throw Error(b(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: xn(n) };
}
function Dd(e, t) {
  var n = xn(t.value), r = xn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function xc(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Od(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Xl(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Od(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var ai, Fd = function(e) {
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
function jo(e, t) {
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
}, w0 = ["Webkit", "ms", "Moz", "O"];
Object.keys(yo).forEach(function(e) {
  w0.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), yo[t] = yo[e];
  });
});
function Hd(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || yo.hasOwnProperty(e) && yo[e] ? ("" + t).trim() : t + "px";
}
function Vd(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, o = Hd(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : e[n] = o;
  }
}
var x0 = pe({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Kl(e, t) {
  if (t) {
    if (x0[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(b(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(b(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(b(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(b(62));
  }
}
function Gl(e, t) {
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
var Ql = null;
function iu(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Zl = null, Sr = null, Er = null;
function _c(e) {
  if (e = ei(e)) {
    if (typeof Zl != "function") throw Error(b(280));
    var t = e.stateNode;
    t && (t = Ts(t), Zl(e.stateNode, e.type, t));
  }
}
function bd(e) {
  Sr ? Er ? Er.push(e) : Er = [e] : Sr = e;
}
function Bd() {
  if (Sr) {
    var e = Sr, t = Er;
    if (Er = Sr = null, _c(e), t) for (e = 0; e < t.length; e++) _c(t[e]);
  }
}
function Ud(e, t) {
  return e(t);
}
function Wd() {
}
var rl = !1;
function Yd(e, t, n) {
  if (rl) return e(t, n);
  rl = !0;
  try {
    return Ud(e, t, n);
  } finally {
    rl = !1, (Sr !== null || Er !== null) && (Wd(), Bd());
  }
}
function Po(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = Ts(n);
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
  if (n && typeof n != "function") throw Error(b(231, t, typeof n));
  return n;
}
var ql = !1;
if (Ut) try {
  var Zr = {};
  Object.defineProperty(Zr, "passive", { get: function() {
    ql = !0;
  } }), window.addEventListener("test", Zr, Zr), window.removeEventListener("test", Zr, Zr);
} catch {
  ql = !1;
}
function _0(e, t, n, r, o, i, s, l, a) {
  var u = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, u);
  } catch (c) {
    this.onError(c);
  }
}
var vo = !1, Ki = null, Gi = !1, Jl = null, k0 = { onError: function(e) {
  vo = !0, Ki = e;
} };
function S0(e, t, n, r, o, i, s, l, a) {
  vo = !1, Ki = null, _0.apply(k0, arguments);
}
function E0(e, t, n, r, o, i, s, l, a) {
  if (S0.apply(this, arguments), vo) {
    if (vo) {
      var u = Ki;
      vo = !1, Ki = null;
    } else throw Error(b(198));
    Gi || (Gi = !0, Jl = u);
  }
}
function Zn(e) {
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
function Xd(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function kc(e) {
  if (Zn(e) !== e) throw Error(b(188));
}
function N0(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Zn(e), t === null) throw Error(b(188));
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
        if (i === n) return kc(o), e;
        if (i === r) return kc(o), t;
        i = i.sibling;
      }
      throw Error(b(188));
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
        if (!s) throw Error(b(189));
      }
    }
    if (n.alternate !== r) throw Error(b(190));
  }
  if (n.tag !== 3) throw Error(b(188));
  return n.stateNode.current === n ? e : t;
}
function Kd(e) {
  return e = N0(e), e !== null ? Gd(e) : null;
}
function Gd(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Gd(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Qd = et.unstable_scheduleCallback, Sc = et.unstable_cancelCallback, C0 = et.unstable_shouldYield, j0 = et.unstable_requestPaint, ye = et.unstable_now, P0 = et.unstable_getCurrentPriorityLevel, su = et.unstable_ImmediatePriority, Zd = et.unstable_UserBlockingPriority, Qi = et.unstable_NormalPriority, M0 = et.unstable_LowPriority, qd = et.unstable_IdlePriority, js = null, Mt = null;
function z0(e) {
  if (Mt && typeof Mt.onCommitFiberRoot == "function") try {
    Mt.onCommitFiberRoot(js, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var _t = Math.clz32 ? Math.clz32 : R0, T0 = Math.log, $0 = Math.LN2;
function R0(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (T0(e) / $0 | 0) | 0;
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
function Zi(e, t) {
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
function A0(e, t) {
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
function I0(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
    var s = 31 - _t(i), l = 1 << s, a = o[s];
    a === -1 ? (!(l & n) || l & r) && (o[s] = A0(l, t)) : a <= t && (e.expiredLanes |= l), i &= ~l;
  }
}
function ea(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Jd() {
  var e = ui;
  return ui <<= 1, !(ui & 4194240) && (ui = 64), e;
}
function ol(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function qo(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - _t(t), e[t] = n;
}
function L0(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var o = 31 - _t(n), i = 1 << o;
    t[o] = 0, r[o] = -1, e[o] = -1, n &= ~i;
  }
}
function lu(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - _t(n), o = 1 << r;
    o & t | e[r] & t && (e[r] |= t), n &= ~o;
  }
}
var oe = 0;
function ep(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var tp, au, np, rp, op, ta = !1, fi = [], fn = null, dn = null, pn = null, Mo = /* @__PURE__ */ new Map(), zo = /* @__PURE__ */ new Map(), on = [], D0 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Ec(e, t) {
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
      zo.delete(t.pointerId);
  }
}
function qr(e, t, n, r, o, i) {
  return e === null || e.nativeEvent !== i ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: i, targetContainers: [o] }, t !== null && (t = ei(t), t !== null && au(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e);
}
function O0(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return fn = qr(fn, e, t, n, r, o), !0;
    case "dragenter":
      return dn = qr(dn, e, t, n, r, o), !0;
    case "mouseover":
      return pn = qr(pn, e, t, n, r, o), !0;
    case "pointerover":
      var i = o.pointerId;
      return Mo.set(i, qr(Mo.get(i) || null, e, t, n, r, o)), !0;
    case "gotpointercapture":
      return i = o.pointerId, zo.set(i, qr(zo.get(i) || null, e, t, n, r, o)), !0;
  }
  return !1;
}
function ip(e) {
  var t = An(e.target);
  if (t !== null) {
    var n = Zn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Xd(n), t !== null) {
          e.blockedOn = t, op(e.priority, function() {
            np(n);
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
    var n = na(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      Ql = r, n.target.dispatchEvent(r), Ql = null;
    } else return t = ei(n), t !== null && au(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function Nc(e, t, n) {
  Ri(e) && n.delete(t);
}
function F0() {
  ta = !1, fn !== null && Ri(fn) && (fn = null), dn !== null && Ri(dn) && (dn = null), pn !== null && Ri(pn) && (pn = null), Mo.forEach(Nc), zo.forEach(Nc);
}
function Jr(e, t) {
  e.blockedOn === t && (e.blockedOn = null, ta || (ta = !0, et.unstable_scheduleCallback(et.unstable_NormalPriority, F0)));
}
function To(e) {
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
  for (fn !== null && Jr(fn, e), dn !== null && Jr(dn, e), pn !== null && Jr(pn, e), Mo.forEach(t), zo.forEach(t), n = 0; n < on.length; n++) r = on[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < on.length && (n = on[0], n.blockedOn === null); ) ip(n), n.blockedOn === null && on.shift();
}
var Nr = Qt.ReactCurrentBatchConfig, qi = !0;
function H0(e, t, n, r) {
  var o = oe, i = Nr.transition;
  Nr.transition = null;
  try {
    oe = 1, uu(e, t, n, r);
  } finally {
    oe = o, Nr.transition = i;
  }
}
function V0(e, t, n, r) {
  var o = oe, i = Nr.transition;
  Nr.transition = null;
  try {
    oe = 4, uu(e, t, n, r);
  } finally {
    oe = o, Nr.transition = i;
  }
}
function uu(e, t, n, r) {
  if (qi) {
    var o = na(e, t, n, r);
    if (o === null) hl(e, t, r, Ji, n), Ec(e, r);
    else if (O0(o, e, t, n, r)) r.stopPropagation();
    else if (Ec(e, r), t & 4 && -1 < D0.indexOf(e)) {
      for (; o !== null; ) {
        var i = ei(o);
        if (i !== null && tp(i), i = na(e, t, n, r), i === null && hl(e, t, r, Ji, n), i === o) break;
        o = i;
      }
      o !== null && r.stopPropagation();
    } else hl(e, t, r, null, n);
  }
}
var Ji = null;
function na(e, t, n, r) {
  if (Ji = null, e = iu(r), e = An(e), e !== null) if (t = Zn(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Xd(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return Ji = e, null;
}
function sp(e) {
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
      switch (P0()) {
        case su:
          return 1;
        case Zd:
          return 4;
        case Qi:
        case M0:
          return 16;
        case qd:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var un = null, cu = null, Ai = null;
function lp() {
  if (Ai) return Ai;
  var e, t = cu, n = t.length, r, o = "value" in un ? un.value : un.textContent, i = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++) ;
  var s = n - e;
  for (r = 1; r <= s && t[n - r] === o[i - r]; r++) ;
  return Ai = o.slice(e, 1 < r ? 1 - r : void 0);
}
function Ii(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function di() {
  return !0;
}
function Cc() {
  return !1;
}
function rt(e) {
  function t(n, r, o, i, s) {
    this._reactName = n, this._targetInst = o, this.type = r, this.nativeEvent = i, this.target = s, this.currentTarget = null;
    for (var l in e) e.hasOwnProperty(l) && (n = e[l], this[l] = n ? n(i) : i[l]);
    return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? di : Cc, this.isPropagationStopped = Cc, this;
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
}, defaultPrevented: 0, isTrusted: 0 }, fu = rt(Ur), Jo = pe({}, Ur, { view: 0, detail: 0 }), b0 = rt(Jo), il, sl, eo, Ps = pe({}, Jo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: du, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== eo && (eo && e.type === "mousemove" ? (il = e.screenX - eo.screenX, sl = e.screenY - eo.screenY) : sl = il = 0, eo = e), il);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : sl;
} }), jc = rt(Ps), B0 = pe({}, Ps, { dataTransfer: 0 }), U0 = rt(B0), W0 = pe({}, Jo, { relatedTarget: 0 }), ll = rt(W0), Y0 = pe({}, Ur, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), X0 = rt(Y0), K0 = pe({}, Ur, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), G0 = rt(K0), Q0 = pe({}, Ur, { data: 0 }), Pc = rt(Q0), Z0 = {
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
}, q0 = {
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
}, J0 = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function ey(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = J0[e]) ? !!t[e] : !1;
}
function du() {
  return ey;
}
var ty = pe({}, Jo, { key: function(e) {
  if (e.key) {
    var t = Z0[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Ii(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? q0[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: du, charCode: function(e) {
  return e.type === "keypress" ? Ii(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Ii(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), ny = rt(ty), ry = pe({}, Ps, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Mc = rt(ry), oy = pe({}, Jo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: du }), iy = rt(oy), sy = pe({}, Ur, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), ly = rt(sy), ay = pe({}, Ps, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), uy = rt(ay), cy = [9, 13, 27, 32], pu = Ut && "CompositionEvent" in window, wo = null;
Ut && "documentMode" in document && (wo = document.documentMode);
var fy = Ut && "TextEvent" in window && !wo, ap = Ut && (!pu || wo && 8 < wo && 11 >= wo), zc = " ", Tc = !1;
function up(e, t) {
  switch (e) {
    case "keyup":
      return cy.indexOf(t.keyCode) !== -1;
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
function cp(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var fr = !1;
function dy(e, t) {
  switch (e) {
    case "compositionend":
      return cp(t);
    case "keypress":
      return t.which !== 32 ? null : (Tc = !0, zc);
    case "textInput":
      return e = t.data, e === zc && Tc ? null : e;
    default:
      return null;
  }
}
function py(e, t) {
  if (fr) return e === "compositionend" || !pu && up(e, t) ? (e = lp(), Ai = cu = un = null, fr = !1, e) : null;
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
      return ap && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var hy = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function $c(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!hy[e.type] : t === "textarea";
}
function fp(e, t, n, r) {
  bd(r), t = es(t, "onChange"), 0 < t.length && (n = new fu("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var xo = null, $o = null;
function my(e) {
  kp(e, 0);
}
function Ms(e) {
  var t = hr(e);
  if (Id(t)) return e;
}
function gy(e, t) {
  if (e === "change") return t;
}
var dp = !1;
if (Ut) {
  var al;
  if (Ut) {
    var ul = "oninput" in document;
    if (!ul) {
      var Rc = document.createElement("div");
      Rc.setAttribute("oninput", "return;"), ul = typeof Rc.oninput == "function";
    }
    al = ul;
  } else al = !1;
  dp = al && (!document.documentMode || 9 < document.documentMode);
}
function Ac() {
  xo && (xo.detachEvent("onpropertychange", pp), $o = xo = null);
}
function pp(e) {
  if (e.propertyName === "value" && Ms($o)) {
    var t = [];
    fp(t, $o, e, iu(e)), Yd(my, t);
  }
}
function yy(e, t, n) {
  e === "focusin" ? (Ac(), xo = t, $o = n, xo.attachEvent("onpropertychange", pp)) : e === "focusout" && Ac();
}
function vy(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ms($o);
}
function wy(e, t) {
  if (e === "click") return Ms(t);
}
function xy(e, t) {
  if (e === "input" || e === "change") return Ms(t);
}
function _y(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var St = typeof Object.is == "function" ? Object.is : _y;
function Ro(e, t) {
  if (St(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!Ol.call(t, o) || !St(e[o], t[o])) return !1;
  }
  return !0;
}
function Ic(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function Lc(e, t) {
  var n = Ic(e);
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
    n = Ic(n);
  }
}
function hp(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? hp(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function mp() {
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
function hu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function ky(e) {
  var t = mp(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && hp(n.ownerDocument.documentElement, n)) {
    if (r !== null && hu(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var o = n.textContent.length, i = Math.min(r.start, o);
        r = r.end === void 0 ? i : Math.min(r.end, o), !e.extend && i > r && (o = r, r = i, i = o), o = Lc(n, i);
        var s = Lc(
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
var Sy = Ut && "documentMode" in document && 11 >= document.documentMode, dr = null, ra = null, _o = null, oa = !1;
function Dc(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  oa || dr == null || dr !== Xi(r) || (r = dr, "selectionStart" in r && hu(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), _o && Ro(_o, r) || (_o = r, r = es(ra, "onSelect"), 0 < r.length && (t = new fu("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = dr)));
}
function pi(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var pr = { animationend: pi("Animation", "AnimationEnd"), animationiteration: pi("Animation", "AnimationIteration"), animationstart: pi("Animation", "AnimationStart"), transitionend: pi("Transition", "TransitionEnd") }, cl = {}, gp = {};
Ut && (gp = document.createElement("div").style, "AnimationEvent" in window || (delete pr.animationend.animation, delete pr.animationiteration.animation, delete pr.animationstart.animation), "TransitionEvent" in window || delete pr.transitionend.transition);
function zs(e) {
  if (cl[e]) return cl[e];
  if (!pr[e]) return e;
  var t = pr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in gp) return cl[e] = t[n];
  return e;
}
var yp = zs("animationend"), vp = zs("animationiteration"), wp = zs("animationstart"), xp = zs("transitionend"), _p = /* @__PURE__ */ new Map(), Oc = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function kn(e, t) {
  _p.set(e, t), Qn(t, [e]);
}
for (var fl = 0; fl < Oc.length; fl++) {
  var dl = Oc[fl], Ey = dl.toLowerCase(), Ny = dl[0].toUpperCase() + dl.slice(1);
  kn(Ey, "on" + Ny);
}
kn(yp, "onAnimationEnd");
kn(vp, "onAnimationIteration");
kn(wp, "onAnimationStart");
kn("dblclick", "onDoubleClick");
kn("focusin", "onFocus");
kn("focusout", "onBlur");
kn(xp, "onTransitionEnd");
Tr("onMouseEnter", ["mouseout", "mouseover"]);
Tr("onMouseLeave", ["mouseout", "mouseover"]);
Tr("onPointerEnter", ["pointerout", "pointerover"]);
Tr("onPointerLeave", ["pointerout", "pointerover"]);
Qn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
Qn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
Qn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
Qn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
Qn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
Qn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var po = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Cy = new Set("cancel close invalid load scroll toggle".split(" ").concat(po));
function Fc(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, E0(r, t, void 0, e), e.currentTarget = null;
}
function kp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], o = r.event;
    r = r.listeners;
    e: {
      var i = void 0;
      if (t) for (var s = r.length - 1; 0 <= s; s--) {
        var l = r[s], a = l.instance, u = l.currentTarget;
        if (l = l.listener, a !== i && o.isPropagationStopped()) break e;
        Fc(o, l, u), i = a;
      }
      else for (s = 0; s < r.length; s++) {
        if (l = r[s], a = l.instance, u = l.currentTarget, l = l.listener, a !== i && o.isPropagationStopped()) break e;
        Fc(o, l, u), i = a;
      }
    }
  }
  if (Gi) throw e = Jl, Gi = !1, Jl = null, e;
}
function ae(e, t) {
  var n = t[ua];
  n === void 0 && (n = t[ua] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (Sp(t, e, 2, !1), n.add(r));
}
function pl(e, t, n) {
  var r = 0;
  t && (r |= 4), Sp(n, e, r, t);
}
var hi = "_reactListening" + Math.random().toString(36).slice(2);
function Ao(e) {
  if (!e[hi]) {
    e[hi] = !0, zd.forEach(function(n) {
      n !== "selectionchange" && (Cy.has(n) || pl(n, !1, e), pl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[hi] || (t[hi] = !0, pl("selectionchange", !1, t));
  }
}
function Sp(e, t, n, r) {
  switch (sp(t)) {
    case 1:
      var o = H0;
      break;
    case 4:
      o = V0;
      break;
    default:
      o = uu;
  }
  n = o.bind(null, t, n, e), o = void 0, !ql || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), r ? o !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: o }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, { passive: o }) : e.addEventListener(t, n, !1);
}
function hl(e, t, n, r, o) {
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
        if (s = An(l), s === null) return;
        if (a = s.tag, a === 5 || a === 6) {
          r = i = s;
          continue e;
        }
        l = l.parentNode;
      }
    }
    r = r.return;
  }
  Yd(function() {
    var u = i, c = iu(n), f = [];
    e: {
      var d = _p.get(e);
      if (d !== void 0) {
        var p = fu, x = e;
        switch (e) {
          case "keypress":
            if (Ii(n) === 0) break e;
          case "keydown":
          case "keyup":
            p = ny;
            break;
          case "focusin":
            x = "focus", p = ll;
            break;
          case "focusout":
            x = "blur", p = ll;
            break;
          case "beforeblur":
          case "afterblur":
            p = ll;
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
            p = U0;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            p = iy;
            break;
          case yp:
          case vp:
          case wp:
            p = X0;
            break;
          case xp:
            p = ly;
            break;
          case "scroll":
            p = b0;
            break;
          case "wheel":
            p = uy;
            break;
          case "copy":
          case "cut":
          case "paste":
            p = G0;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            p = Mc;
        }
        var v = (t & 4) !== 0, S = !v && e === "scroll", h = v ? d !== null ? d + "Capture" : null : d;
        v = [];
        for (var m = u, g; m !== null; ) {
          g = m;
          var w = g.stateNode;
          if (g.tag === 5 && w !== null && (g = w, h !== null && (w = Po(m, h), w != null && v.push(Io(m, w, g)))), S) break;
          m = m.return;
        }
        0 < v.length && (d = new p(d, x, null, n, c), f.push({ event: d, listeners: v }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (d = e === "mouseover" || e === "pointerover", p = e === "mouseout" || e === "pointerout", d && n !== Ql && (x = n.relatedTarget || n.fromElement) && (An(x) || x[Wt])) break e;
        if ((p || d) && (d = c.window === c ? c : (d = c.ownerDocument) ? d.defaultView || d.parentWindow : window, p ? (x = n.relatedTarget || n.toElement, p = u, x = x ? An(x) : null, x !== null && (S = Zn(x), x !== S || x.tag !== 5 && x.tag !== 6) && (x = null)) : (p = null, x = u), p !== x)) {
          if (v = jc, w = "onMouseLeave", h = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (v = Mc, w = "onPointerLeave", h = "onPointerEnter", m = "pointer"), S = p == null ? d : hr(p), g = x == null ? d : hr(x), d = new v(w, m + "leave", p, n, c), d.target = S, d.relatedTarget = g, w = null, An(c) === u && (v = new v(h, m + "enter", x, n, c), v.target = g, v.relatedTarget = S, w = v), S = w, p && x) t: {
            for (v = p, h = x, m = 0, g = v; g; g = rr(g)) m++;
            for (g = 0, w = h; w; w = rr(w)) g++;
            for (; 0 < m - g; ) v = rr(v), m--;
            for (; 0 < g - m; ) h = rr(h), g--;
            for (; m--; ) {
              if (v === h || h !== null && v === h.alternate) break t;
              v = rr(v), h = rr(h);
            }
            v = null;
          }
          else v = null;
          p !== null && Hc(f, d, p, v, !1), x !== null && S !== null && Hc(f, S, x, v, !0);
        }
      }
      e: {
        if (d = u ? hr(u) : window, p = d.nodeName && d.nodeName.toLowerCase(), p === "select" || p === "input" && d.type === "file") var N = gy;
        else if ($c(d)) if (dp) N = xy;
        else {
          N = vy;
          var M = yy;
        }
        else (p = d.nodeName) && p.toLowerCase() === "input" && (d.type === "checkbox" || d.type === "radio") && (N = wy);
        if (N && (N = N(e, u))) {
          fp(f, N, n, c);
          break e;
        }
        M && M(e, d, u), e === "focusout" && (M = d._wrapperState) && M.controlled && d.type === "number" && Wl(d, "number", d.value);
      }
      switch (M = u ? hr(u) : window, e) {
        case "focusin":
          ($c(M) || M.contentEditable === "true") && (dr = M, ra = u, _o = null);
          break;
        case "focusout":
          _o = ra = dr = null;
          break;
        case "mousedown":
          oa = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          oa = !1, Dc(f, n, c);
          break;
        case "selectionchange":
          if (Sy) break;
        case "keydown":
        case "keyup":
          Dc(f, n, c);
      }
      var z;
      if (pu) e: {
        switch (e) {
          case "compositionstart":
            var T = "onCompositionStart";
            break e;
          case "compositionend":
            T = "onCompositionEnd";
            break e;
          case "compositionupdate":
            T = "onCompositionUpdate";
            break e;
        }
        T = void 0;
      }
      else fr ? up(e, n) && (T = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (T = "onCompositionStart");
      T && (ap && n.locale !== "ko" && (fr || T !== "onCompositionStart" ? T === "onCompositionEnd" && fr && (z = lp()) : (un = c, cu = "value" in un ? un.value : un.textContent, fr = !0)), M = es(u, T), 0 < M.length && (T = new Pc(T, e, null, n, c), f.push({ event: T, listeners: M }), z ? T.data = z : (z = cp(n), z !== null && (T.data = z)))), (z = fy ? dy(e, n) : py(e, n)) && (u = es(u, "onBeforeInput"), 0 < u.length && (c = new Pc("onBeforeInput", "beforeinput", null, n, c), f.push({ event: c, listeners: u }), c.data = z));
    }
    kp(f, t);
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
function Hc(e, t, n, r, o) {
  for (var i = t._reactName, s = []; n !== null && n !== r; ) {
    var l = n, a = l.alternate, u = l.stateNode;
    if (a !== null && a === r) break;
    l.tag === 5 && u !== null && (l = u, o ? (a = Po(n, i), a != null && s.unshift(Io(n, a, l))) : o || (a = Po(n, i), a != null && s.push(Io(n, a, l)))), n = n.return;
  }
  s.length !== 0 && e.push({ event: t, listeners: s });
}
var jy = /\r\n?/g, Py = /\u0000|\uFFFD/g;
function Vc(e) {
  return (typeof e == "string" ? e : "" + e).replace(jy, `
`).replace(Py, "");
}
function mi(e, t, n) {
  if (t = Vc(t), Vc(e) !== t && n) throw Error(b(425));
}
function ts() {
}
var ia = null, sa = null;
function la(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var aa = typeof setTimeout == "function" ? setTimeout : void 0, My = typeof clearTimeout == "function" ? clearTimeout : void 0, bc = typeof Promise == "function" ? Promise : void 0, zy = typeof queueMicrotask == "function" ? queueMicrotask : typeof bc < "u" ? function(e) {
  return bc.resolve(null).then(e).catch(Ty);
} : aa;
function Ty(e) {
  setTimeout(function() {
    throw e;
  });
}
function ml(e, t) {
  var n = t, r = 0;
  do {
    var o = n.nextSibling;
    if (e.removeChild(n), o && o.nodeType === 8) if (n = o.data, n === "/$") {
      if (r === 0) {
        e.removeChild(o), To(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = o;
  } while (n);
  To(t);
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
function Bc(e) {
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
var Wr = Math.random().toString(36).slice(2), Pt = "__reactFiber$" + Wr, Lo = "__reactProps$" + Wr, Wt = "__reactContainer$" + Wr, ua = "__reactEvents$" + Wr, $y = "__reactListeners$" + Wr, Ry = "__reactHandles$" + Wr;
function An(e) {
  var t = e[Pt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Wt] || n[Pt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = Bc(e); e !== null; ) {
        if (n = e[Pt]) return n;
        e = Bc(e);
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
  throw Error(b(33));
}
function Ts(e) {
  return e[Lo] || null;
}
var ca = [], mr = -1;
function Sn(e) {
  return { current: e };
}
function ue(e) {
  0 > mr || (e.current = ca[mr], ca[mr] = null, mr--);
}
function se(e, t) {
  mr++, ca[mr] = e.current, e.current = t;
}
var _n = {}, De = Sn(_n), Xe = Sn(!1), Bn = _n;
function $r(e, t) {
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
  ue(Xe), ue(De);
}
function Uc(e, t, n) {
  if (De.current !== _n) throw Error(b(168));
  se(De, t), se(Xe, n);
}
function Ep(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(b(108, y0(e) || "Unknown", o));
  return pe({}, n, r);
}
function rs(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || _n, Bn = De.current, se(De, e), se(Xe, Xe.current), !0;
}
function Wc(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(b(169));
  n ? (e = Ep(e, t, Bn), r.__reactInternalMemoizedMergedChildContext = e, ue(Xe), ue(De), se(De, e)) : ue(Xe), se(Xe, n);
}
var Ot = null, $s = !1, gl = !1;
function Np(e) {
  Ot === null ? Ot = [e] : Ot.push(e);
}
function Ay(e) {
  $s = !0, Np(e);
}
function En() {
  if (!gl && Ot !== null) {
    gl = !0;
    var e = 0, t = oe;
    try {
      var n = Ot;
      for (oe = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      Ot = null, $s = !1;
    } catch (o) {
      throw Ot !== null && (Ot = Ot.slice(e + 1)), Qd(su, En), o;
    } finally {
      oe = t, gl = !1;
    }
  }
  return null;
}
var gr = [], yr = 0, os = null, is = 0, ot = [], it = 0, Un = null, Ft = 1, Ht = "";
function Tn(e, t) {
  gr[yr++] = is, gr[yr++] = os, os = e, is = t;
}
function Cp(e, t, n) {
  ot[it++] = Ft, ot[it++] = Ht, ot[it++] = Un, Un = e;
  var r = Ft;
  e = Ht;
  var o = 32 - _t(r) - 1;
  r &= ~(1 << o), n += 1;
  var i = 32 - _t(t) + o;
  if (30 < i) {
    var s = o - o % 5;
    i = (r & (1 << s) - 1).toString(32), r >>= s, o -= s, Ft = 1 << 32 - _t(t) + o | n << o | r, Ht = i + e;
  } else Ft = 1 << i | n << o | r, Ht = e;
}
function mu(e) {
  e.return !== null && (Tn(e, 1), Cp(e, 1, 0));
}
function gu(e) {
  for (; e === os; ) os = gr[--yr], gr[yr] = null, is = gr[--yr], gr[yr] = null;
  for (; e === Un; ) Un = ot[--it], ot[it] = null, Ht = ot[--it], ot[it] = null, Ft = ot[--it], ot[it] = null;
}
var Je = null, qe = null, ce = !1, wt = null;
function jp(e, t) {
  var n = lt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function Yc(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, Je = e, qe = hn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, Je = e, qe = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Un !== null ? { id: Ft, overflow: Ht } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = lt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Je = e, qe = null, !0) : !1;
    default:
      return !1;
  }
}
function fa(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function da(e) {
  if (ce) {
    var t = qe;
    if (t) {
      var n = t;
      if (!Yc(e, t)) {
        if (fa(e)) throw Error(b(418));
        t = hn(n.nextSibling);
        var r = Je;
        t && Yc(e, t) ? jp(r, n) : (e.flags = e.flags & -4097 | 2, ce = !1, Je = e);
      }
    } else {
      if (fa(e)) throw Error(b(418));
      e.flags = e.flags & -4097 | 2, ce = !1, Je = e;
    }
  }
}
function Xc(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  Je = e;
}
function gi(e) {
  if (e !== Je) return !1;
  if (!ce) return Xc(e), ce = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !la(e.type, e.memoizedProps)), t && (t = qe)) {
    if (fa(e)) throw Pp(), Error(b(418));
    for (; t; ) jp(e, t), t = hn(t.nextSibling);
  }
  if (Xc(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(b(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              qe = hn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      qe = null;
    }
  } else qe = Je ? hn(e.stateNode.nextSibling) : null;
  return !0;
}
function Pp() {
  for (var e = qe; e; ) e = hn(e.nextSibling);
}
function Rr() {
  qe = Je = null, ce = !1;
}
function yu(e) {
  wt === null ? wt = [e] : wt.push(e);
}
var Iy = Qt.ReactCurrentBatchConfig;
function to(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(b(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(b(147, e));
      var o = r, i = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === i ? t.ref : (t = function(s) {
        var l = o.refs;
        s === null ? delete l[i] : l[i] = s;
      }, t._stringRef = i, t);
    }
    if (typeof e != "string") throw Error(b(284));
    if (!n._owner) throw Error(b(290, e));
  }
  return e;
}
function yi(e, t) {
  throw e = Object.prototype.toString.call(t), Error(b(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function Kc(e) {
  var t = e._init;
  return t(e._payload);
}
function Mp(e) {
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
    return m === null || m.tag !== 6 ? (m = Sl(g, h.mode, w), m.return = h, m) : (m = o(m, g), m.return = h, m);
  }
  function a(h, m, g, w) {
    var N = g.type;
    return N === cr ? c(h, m, g.props.children, w, g.key) : m !== null && (m.elementType === N || typeof N == "object" && N !== null && N.$$typeof === en && Kc(N) === m.type) ? (w = o(m, g.props), w.ref = to(h, m, g), w.return = h, w) : (w = bi(g.type, g.key, g.props, null, h.mode, w), w.ref = to(h, m, g), w.return = h, w);
  }
  function u(h, m, g, w) {
    return m === null || m.tag !== 4 || m.stateNode.containerInfo !== g.containerInfo || m.stateNode.implementation !== g.implementation ? (m = El(g, h.mode, w), m.return = h, m) : (m = o(m, g.children || []), m.return = h, m);
  }
  function c(h, m, g, w, N) {
    return m === null || m.tag !== 7 ? (m = Hn(g, h.mode, w, N), m.return = h, m) : (m = o(m, g), m.return = h, m);
  }
  function f(h, m, g) {
    if (typeof m == "string" && m !== "" || typeof m == "number") return m = Sl("" + m, h.mode, g), m.return = h, m;
    if (typeof m == "object" && m !== null) {
      switch (m.$$typeof) {
        case si:
          return g = bi(m.type, m.key, m.props, null, h.mode, g), g.ref = to(h, null, m), g.return = h, g;
        case ur:
          return m = El(m, h.mode, g), m.return = h, m;
        case en:
          var w = m._init;
          return f(h, w(m._payload), g);
      }
      if (co(m) || Qr(m)) return m = Hn(m, h.mode, g, null), m.return = h, m;
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
      if (co(g) || Qr(g)) return N !== null ? null : c(h, m, g, w, null);
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
          var M = w._init;
          return p(h, m, g, M(w._payload), N);
      }
      if (co(w) || Qr(w)) return h = h.get(g) || null, c(m, h, w, N, null);
      yi(m, w);
    }
    return null;
  }
  function x(h, m, g, w) {
    for (var N = null, M = null, z = m, T = m = 0, k = null; z !== null && T < g.length; T++) {
      z.index > T ? (k = z, z = null) : k = z.sibling;
      var R = d(h, z, g[T], w);
      if (R === null) {
        z === null && (z = k);
        break;
      }
      e && z && R.alternate === null && t(h, z), m = i(R, m, T), M === null ? N = R : M.sibling = R, M = R, z = k;
    }
    if (T === g.length) return n(h, z), ce && Tn(h, T), N;
    if (z === null) {
      for (; T < g.length; T++) z = f(h, g[T], w), z !== null && (m = i(z, m, T), M === null ? N = z : M.sibling = z, M = z);
      return ce && Tn(h, T), N;
    }
    for (z = r(h, z); T < g.length; T++) k = p(z, h, T, g[T], w), k !== null && (e && k.alternate !== null && z.delete(k.key === null ? T : k.key), m = i(k, m, T), M === null ? N = k : M.sibling = k, M = k);
    return e && z.forEach(function(F) {
      return t(h, F);
    }), ce && Tn(h, T), N;
  }
  function v(h, m, g, w) {
    var N = Qr(g);
    if (typeof N != "function") throw Error(b(150));
    if (g = N.call(g), g == null) throw Error(b(151));
    for (var M = N = null, z = m, T = m = 0, k = null, R = g.next(); z !== null && !R.done; T++, R = g.next()) {
      z.index > T ? (k = z, z = null) : k = z.sibling;
      var F = d(h, z, R.value, w);
      if (F === null) {
        z === null && (z = k);
        break;
      }
      e && z && F.alternate === null && t(h, z), m = i(F, m, T), M === null ? N = F : M.sibling = F, M = F, z = k;
    }
    if (R.done) return n(
      h,
      z
    ), ce && Tn(h, T), N;
    if (z === null) {
      for (; !R.done; T++, R = g.next()) R = f(h, R.value, w), R !== null && (m = i(R, m, T), M === null ? N = R : M.sibling = R, M = R);
      return ce && Tn(h, T), N;
    }
    for (z = r(h, z); !R.done; T++, R = g.next()) R = p(z, h, T, R.value, w), R !== null && (e && R.alternate !== null && z.delete(R.key === null ? T : R.key), m = i(R, m, T), M === null ? N = R : M.sibling = R, M = R);
    return e && z.forEach(function(D) {
      return t(h, D);
    }), ce && Tn(h, T), N;
  }
  function S(h, m, g, w) {
    if (typeof g == "object" && g !== null && g.type === cr && g.key === null && (g = g.props.children), typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case si:
          e: {
            for (var N = g.key, M = m; M !== null; ) {
              if (M.key === N) {
                if (N = g.type, N === cr) {
                  if (M.tag === 7) {
                    n(h, M.sibling), m = o(M, g.props.children), m.return = h, h = m;
                    break e;
                  }
                } else if (M.elementType === N || typeof N == "object" && N !== null && N.$$typeof === en && Kc(N) === M.type) {
                  n(h, M.sibling), m = o(M, g.props), m.ref = to(h, M, g), m.return = h, h = m;
                  break e;
                }
                n(h, M);
                break;
              } else t(h, M);
              M = M.sibling;
            }
            g.type === cr ? (m = Hn(g.props.children, h.mode, w, g.key), m.return = h, h = m) : (w = bi(g.type, g.key, g.props, null, h.mode, w), w.ref = to(h, m, g), w.return = h, h = w);
          }
          return s(h);
        case ur:
          e: {
            for (M = g.key; m !== null; ) {
              if (m.key === M) if (m.tag === 4 && m.stateNode.containerInfo === g.containerInfo && m.stateNode.implementation === g.implementation) {
                n(h, m.sibling), m = o(m, g.children || []), m.return = h, h = m;
                break e;
              } else {
                n(h, m);
                break;
              }
              else t(h, m);
              m = m.sibling;
            }
            m = El(g, h.mode, w), m.return = h, h = m;
          }
          return s(h);
        case en:
          return M = g._init, S(h, m, M(g._payload), w);
      }
      if (co(g)) return x(h, m, g, w);
      if (Qr(g)) return v(h, m, g, w);
      yi(h, g);
    }
    return typeof g == "string" && g !== "" || typeof g == "number" ? (g = "" + g, m !== null && m.tag === 6 ? (n(h, m.sibling), m = o(m, g), m.return = h, h = m) : (n(h, m), m = Sl(g, h.mode, w), m.return = h, h = m), s(h)) : n(h, m);
  }
  return S;
}
var Ar = Mp(!0), zp = Mp(!1), ss = Sn(null), ls = null, vr = null, vu = null;
function wu() {
  vu = vr = ls = null;
}
function xu(e) {
  var t = ss.current;
  ue(ss), e._currentValue = t;
}
function pa(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Cr(e, t) {
  ls = e, vu = vr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (We = !0), e.firstContext = null);
}
function ft(e) {
  var t = e._currentValue;
  if (vu !== e) if (e = { context: e, memoizedValue: t, next: null }, vr === null) {
    if (ls === null) throw Error(b(308));
    vr = e, ls.dependencies = { lanes: 0, firstContext: e };
  } else vr = vr.next = e;
  return t;
}
var In = null;
function _u(e) {
  In === null ? In = [e] : In.push(e);
}
function Tp(e, t, n, r) {
  var o = t.interleaved;
  return o === null ? (n.next = n, _u(t)) : (n.next = o.next, o.next = n), t.interleaved = n, Yt(e, r);
}
function Yt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var tn = !1;
function ku(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function $p(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function bt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function mn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, ee & 2) {
    var o = r.pending;
    return o === null ? t.next = t : (t.next = o.next, o.next = t), r.pending = t, Yt(e, n);
  }
  return o = r.interleaved, o === null ? (t.next = t, _u(r)) : (t.next = o.next, o.next = t), r.interleaved = t, Yt(e, n);
}
function Li(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, lu(e, n);
  }
}
function Gc(e, t) {
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
          var x = e, v = l;
          switch (d = t, p = n, v.tag) {
            case 1:
              if (x = v.payload, typeof x == "function") {
                f = x.call(p, f, d);
                break e;
              }
              f = x;
              break e;
            case 3:
              x.flags = x.flags & -65537 | 128;
            case 0:
              if (x = v.payload, d = typeof x == "function" ? x.call(p, f, d) : x, d == null) break e;
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
function Qc(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], o = r.callback;
    if (o !== null) {
      if (r.callback = null, r = n, typeof o != "function") throw Error(b(191, o));
      o.call(r);
    }
  }
}
var ti = {}, zt = Sn(ti), Do = Sn(ti), Oo = Sn(ti);
function Ln(e) {
  if (e === ti) throw Error(b(174));
  return e;
}
function Su(e, t) {
  switch (se(Oo, t), se(Do, e), se(zt, ti), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Xl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Xl(t, e);
  }
  ue(zt), se(zt, t);
}
function Ir() {
  ue(zt), ue(Do), ue(Oo);
}
function Rp(e) {
  Ln(Oo.current);
  var t = Ln(zt.current), n = Xl(t, e.type);
  t !== n && (se(Do, e), se(zt, n));
}
function Eu(e) {
  Do.current === e && (ue(zt), ue(Do));
}
var fe = Sn(0);
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
var yl = [];
function Nu() {
  for (var e = 0; e < yl.length; e++) yl[e]._workInProgressVersionPrimary = null;
  yl.length = 0;
}
var Di = Qt.ReactCurrentDispatcher, vl = Qt.ReactCurrentBatchConfig, Wn = 0, de = null, xe = null, Ee = null, cs = !1, ko = !1, Fo = 0, Ly = 0;
function Ae() {
  throw Error(b(321));
}
function Cu(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!St(e[n], t[n])) return !1;
  return !0;
}
function ju(e, t, n, r, o, i) {
  if (Wn = i, de = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Di.current = e === null || e.memoizedState === null ? Hy : Vy, e = n(r, o), ko) {
    i = 0;
    do {
      if (ko = !1, Fo = 0, 25 <= i) throw Error(b(301));
      i += 1, Ee = xe = null, t.updateQueue = null, Di.current = by, e = n(r, o);
    } while (ko);
  }
  if (Di.current = fs, t = xe !== null && xe.next !== null, Wn = 0, Ee = xe = de = null, cs = !1, t) throw Error(b(300));
  return e;
}
function Pu() {
  var e = Fo !== 0;
  return Fo = 0, e;
}
function jt() {
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
    if (e === null) throw Error(b(310));
    xe = e, e = { memoizedState: xe.memoizedState, baseState: xe.baseState, baseQueue: xe.baseQueue, queue: xe.queue, next: null }, Ee === null ? de.memoizedState = Ee = e : Ee = Ee.next = e;
  }
  return Ee;
}
function Ho(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function wl(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(b(311));
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
    a === null ? s = r : a.next = l, St(r, t.memoizedState) || (We = !0), t.memoizedState = r, t.baseState = s, t.baseQueue = a, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    o = e;
    do
      i = o.lane, de.lanes |= i, Yn |= i, o = o.next;
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function xl(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(b(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, o = n.pending, i = t.memoizedState;
  if (o !== null) {
    n.pending = null;
    var s = o = o.next;
    do
      i = e(i, s.action), s = s.next;
    while (s !== o);
    St(i, t.memoizedState) || (We = !0), t.memoizedState = i, t.baseQueue === null && (t.baseState = i), n.lastRenderedState = i;
  }
  return [i, r];
}
function Ap() {
}
function Ip(e, t) {
  var n = de, r = dt(), o = t(), i = !St(r.memoizedState, o);
  if (i && (r.memoizedState = o, We = !0), r = r.queue, Mu(Op.bind(null, n, r, e), [e]), r.getSnapshot !== t || i || Ee !== null && Ee.memoizedState.tag & 1) {
    if (n.flags |= 2048, Vo(9, Dp.bind(null, n, r, o, t), void 0, null), Ne === null) throw Error(b(349));
    Wn & 30 || Lp(n, t, o);
  }
  return o;
}
function Lp(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Dp(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Fp(t) && Hp(e);
}
function Op(e, t, n) {
  return n(function() {
    Fp(t) && Hp(e);
  });
}
function Fp(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !St(e, n);
  } catch {
    return !0;
  }
}
function Hp(e) {
  var t = Yt(e, 1);
  t !== null && kt(t, e, 1, -1);
}
function Zc(e) {
  var t = jt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Ho, lastRenderedState: e }, t.queue = e, e = e.dispatch = Fy.bind(null, de, e), [t.memoizedState, e];
}
function Vo(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Vp() {
  return dt().memoizedState;
}
function Oi(e, t, n, r) {
  var o = jt();
  de.flags |= e, o.memoizedState = Vo(1 | t, n, void 0, r === void 0 ? null : r);
}
function Rs(e, t, n, r) {
  var o = dt();
  r = r === void 0 ? null : r;
  var i = void 0;
  if (xe !== null) {
    var s = xe.memoizedState;
    if (i = s.destroy, r !== null && Cu(r, s.deps)) {
      o.memoizedState = Vo(t, n, i, r);
      return;
    }
  }
  de.flags |= e, o.memoizedState = Vo(1 | t, n, i, r);
}
function qc(e, t) {
  return Oi(8390656, 8, e, t);
}
function Mu(e, t) {
  return Rs(2048, 8, e, t);
}
function bp(e, t) {
  return Rs(4, 2, e, t);
}
function Bp(e, t) {
  return Rs(4, 4, e, t);
}
function Up(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Wp(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Rs(4, 4, Up.bind(null, t, e), n);
}
function zu() {
}
function Yp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Cu(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Xp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Cu(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function Kp(e, t, n) {
  return Wn & 21 ? (St(n, t) || (n = Jd(), de.lanes |= n, Yn |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, We = !0), e.memoizedState = n);
}
function Dy(e, t) {
  var n = oe;
  oe = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = vl.transition;
  vl.transition = {};
  try {
    e(!1), t();
  } finally {
    oe = n, vl.transition = r;
  }
}
function Gp() {
  return dt().memoizedState;
}
function Oy(e, t, n) {
  var r = yn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Qp(e)) Zp(t, n);
  else if (n = Tp(e, t, n, r), n !== null) {
    var o = Ve();
    kt(n, e, r, o), qp(n, t, r);
  }
}
function Fy(e, t, n) {
  var r = yn(e), o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Qp(e)) Zp(t, o);
  else {
    var i = e.alternate;
    if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer, i !== null)) try {
      var s = t.lastRenderedState, l = i(s, n);
      if (o.hasEagerState = !0, o.eagerState = l, St(l, s)) {
        var a = t.interleaved;
        a === null ? (o.next = o, _u(t)) : (o.next = a.next, a.next = o), t.interleaved = o;
        return;
      }
    } catch {
    } finally {
    }
    n = Tp(e, t, o, r), n !== null && (o = Ve(), kt(n, e, r, o), qp(n, t, r));
  }
}
function Qp(e) {
  var t = e.alternate;
  return e === de || t !== null && t === de;
}
function Zp(e, t) {
  ko = cs = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function qp(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, lu(e, n);
  }
}
var fs = { readContext: ft, useCallback: Ae, useContext: Ae, useEffect: Ae, useImperativeHandle: Ae, useInsertionEffect: Ae, useLayoutEffect: Ae, useMemo: Ae, useReducer: Ae, useRef: Ae, useState: Ae, useDebugValue: Ae, useDeferredValue: Ae, useTransition: Ae, useMutableSource: Ae, useSyncExternalStore: Ae, useId: Ae, unstable_isNewReconciler: !1 }, Hy = { readContext: ft, useCallback: function(e, t) {
  return jt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: ft, useEffect: qc, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Oi(
    4194308,
    4,
    Up.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return Oi(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return Oi(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = jt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = jt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = Oy.bind(null, de, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = jt();
  return e = { current: e }, t.memoizedState = e;
}, useState: Zc, useDebugValue: zu, useDeferredValue: function(e) {
  return jt().memoizedState = e;
}, useTransition: function() {
  var e = Zc(!1), t = e[0];
  return e = Dy.bind(null, e[1]), jt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = de, o = jt();
  if (ce) {
    if (n === void 0) throw Error(b(407));
    n = n();
  } else {
    if (n = t(), Ne === null) throw Error(b(349));
    Wn & 30 || Lp(r, t, n);
  }
  o.memoizedState = n;
  var i = { value: n, getSnapshot: t };
  return o.queue = i, qc(Op.bind(
    null,
    r,
    i,
    e
  ), [e]), r.flags |= 2048, Vo(9, Dp.bind(null, r, i, n, t), void 0, null), n;
}, useId: function() {
  var e = jt(), t = Ne.identifierPrefix;
  if (ce) {
    var n = Ht, r = Ft;
    n = (r & ~(1 << 32 - _t(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Fo++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = Ly++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, Vy = {
  readContext: ft,
  useCallback: Yp,
  useContext: ft,
  useEffect: Mu,
  useImperativeHandle: Wp,
  useInsertionEffect: bp,
  useLayoutEffect: Bp,
  useMemo: Xp,
  useReducer: wl,
  useRef: Vp,
  useState: function() {
    return wl(Ho);
  },
  useDebugValue: zu,
  useDeferredValue: function(e) {
    var t = dt();
    return Kp(t, xe.memoizedState, e);
  },
  useTransition: function() {
    var e = wl(Ho)[0], t = dt().memoizedState;
    return [e, t];
  },
  useMutableSource: Ap,
  useSyncExternalStore: Ip,
  useId: Gp,
  unstable_isNewReconciler: !1
}, by = { readContext: ft, useCallback: Yp, useContext: ft, useEffect: Mu, useImperativeHandle: Wp, useInsertionEffect: bp, useLayoutEffect: Bp, useMemo: Xp, useReducer: xl, useRef: Vp, useState: function() {
  return xl(Ho);
}, useDebugValue: zu, useDeferredValue: function(e) {
  var t = dt();
  return xe === null ? t.memoizedState = e : Kp(t, xe.memoizedState, e);
}, useTransition: function() {
  var e = xl(Ho)[0], t = dt().memoizedState;
  return [e, t];
}, useMutableSource: Ap, useSyncExternalStore: Ip, useId: Gp, unstable_isNewReconciler: !1 };
function gt(e, t) {
  if (e && e.defaultProps) {
    t = pe({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function ha(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : pe({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var As = { isMounted: function(e) {
  return (e = e._reactInternals) ? Zn(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = yn(e), i = bt(r, o);
  i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (kt(t, e, o, r), Li(t, e, o));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = yn(e), i = bt(r, o);
  i.tag = 1, i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (kt(t, e, o, r), Li(t, e, o));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Ve(), r = yn(e), o = bt(n, r);
  o.tag = 2, t != null && (o.callback = t), t = mn(e, o, r), t !== null && (kt(t, e, r, n), Li(t, e, r));
} };
function Jc(e, t, n, r, o, i, s) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, s) : t.prototype && t.prototype.isPureReactComponent ? !Ro(n, r) || !Ro(o, i) : !0;
}
function Jp(e, t, n) {
  var r = !1, o = _n, i = t.contextType;
  return typeof i == "object" && i !== null ? i = ft(i) : (o = Ke(t) ? Bn : De.current, r = t.contextTypes, i = (r = r != null) ? $r(e, o) : _n), t = new t(n, i), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = As, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = o, e.__reactInternalMemoizedMaskedChildContext = i), t;
}
function ef(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && As.enqueueReplaceState(t, t.state, null);
}
function ma(e, t, n, r) {
  var o = e.stateNode;
  o.props = n, o.state = e.memoizedState, o.refs = {}, ku(e);
  var i = t.contextType;
  typeof i == "object" && i !== null ? o.context = ft(i) : (i = Ke(t) ? Bn : De.current, o.context = $r(e, i)), o.state = e.memoizedState, i = t.getDerivedStateFromProps, typeof i == "function" && (ha(e, t, i, n), o.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state, typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(), t !== o.state && As.enqueueReplaceState(o, o.state, null), as(e, n, o, r), o.state = e.memoizedState), typeof o.componentDidMount == "function" && (e.flags |= 4194308);
}
function Lr(e, t) {
  try {
    var n = "", r = t;
    do
      n += g0(r), r = r.return;
    while (r);
    var o = n;
  } catch (i) {
    o = `
Error generating stack: ` + i.message + `
` + i.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function _l(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function ga(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var By = typeof WeakMap == "function" ? WeakMap : Map;
function eh(e, t, n) {
  n = bt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    ps || (ps = !0, Ca = r), ga(e, t);
  }, n;
}
function th(e, t, n) {
  n = bt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    n.payload = function() {
      return r(o);
    }, n.callback = function() {
      ga(e, t);
    };
  }
  var i = e.stateNode;
  return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function() {
    ga(e, t), typeof r != "function" && (gn === null ? gn = /* @__PURE__ */ new Set([this]) : gn.add(this));
    var s = t.stack;
    this.componentDidCatch(t.value, { componentStack: s !== null ? s : "" });
  }), n;
}
function tf(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new By();
    var o = /* @__PURE__ */ new Set();
    r.set(t, o);
  } else o = r.get(t), o === void 0 && (o = /* @__PURE__ */ new Set(), r.set(t, o));
  o.has(n) || (o.add(n), e = rv.bind(null, e, t, n), t.then(e, e));
}
function nf(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function rf(e, t, n, r, o) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = o, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = bt(-1, 1), t.tag = 2, mn(n, t, 1))), n.lanes |= 1), e);
}
var Uy = Qt.ReactCurrentOwner, We = !1;
function He(e, t, n, r) {
  t.child = e === null ? zp(t, null, n, r) : Ar(t, e.child, n, r);
}
function of(e, t, n, r, o) {
  n = n.render;
  var i = t.ref;
  return Cr(t, o), r = ju(e, t, n, r, i, o), n = Pu(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && n && mu(t), t.flags |= 1, He(e, t, r, o), t.child);
}
function sf(e, t, n, r, o) {
  if (e === null) {
    var i = n.type;
    return typeof i == "function" && !Ou(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = i, nh(e, t, i, r, o)) : (e = bi(n.type, null, r, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (i = e.child, !(e.lanes & o)) {
    var s = i.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Ro, n(s, r) && e.ref === t.ref) return Xt(e, t, o);
  }
  return t.flags |= 1, e = vn(i, r), e.ref = t.ref, e.return = t, t.child = e;
}
function nh(e, t, n, r, o) {
  if (e !== null) {
    var i = e.memoizedProps;
    if (Ro(i, r) && e.ref === t.ref) if (We = !1, t.pendingProps = r = i, (e.lanes & o) !== 0) e.flags & 131072 && (We = !0);
    else return t.lanes = e.lanes, Xt(e, t, o);
  }
  return ya(e, t, n, r, o);
}
function rh(e, t, n) {
  var r = t.pendingProps, o = r.children, i = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, se(xr, Ze), Ze |= n;
  else {
    if (!(n & 1073741824)) return e = i !== null ? i.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, se(xr, Ze), Ze |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = i !== null ? i.baseLanes : n, se(xr, Ze), Ze |= r;
  }
  else i !== null ? (r = i.baseLanes | n, t.memoizedState = null) : r = n, se(xr, Ze), Ze |= r;
  return He(e, t, o, n), t.child;
}
function oh(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function ya(e, t, n, r, o) {
  var i = Ke(n) ? Bn : De.current;
  return i = $r(t, i), Cr(t, o), n = ju(e, t, n, r, i, o), r = Pu(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && r && mu(t), t.flags |= 1, He(e, t, n, o), t.child);
}
function lf(e, t, n, r, o) {
  if (Ke(n)) {
    var i = !0;
    rs(t);
  } else i = !1;
  if (Cr(t, o), t.stateNode === null) Fi(e, t), Jp(t, n, r), ma(t, n, r, o), r = !0;
  else if (e === null) {
    var s = t.stateNode, l = t.memoizedProps;
    s.props = l;
    var a = s.context, u = n.contextType;
    typeof u == "object" && u !== null ? u = ft(u) : (u = Ke(n) ? Bn : De.current, u = $r(t, u));
    var c = n.getDerivedStateFromProps, f = typeof c == "function" || typeof s.getSnapshotBeforeUpdate == "function";
    f || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== r || a !== u) && ef(t, s, r, u), tn = !1;
    var d = t.memoizedState;
    s.state = d, as(t, r, s, o), a = t.memoizedState, l !== r || d !== a || Xe.current || tn ? (typeof c == "function" && (ha(t, n, c, r), a = t.memoizedState), (l = tn || Jc(t, n, l, r, d, a, u)) ? (f || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount()), typeof s.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = a), s.props = r, s.state = a, s.context = u, r = l) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    s = t.stateNode, $p(e, t), l = t.memoizedProps, u = t.type === t.elementType ? l : gt(t.type, l), s.props = u, f = t.pendingProps, d = s.context, a = n.contextType, typeof a == "object" && a !== null ? a = ft(a) : (a = Ke(n) ? Bn : De.current, a = $r(t, a));
    var p = n.getDerivedStateFromProps;
    (c = typeof p == "function" || typeof s.getSnapshotBeforeUpdate == "function") || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== f || d !== a) && ef(t, s, r, a), tn = !1, d = t.memoizedState, s.state = d, as(t, r, s, o);
    var x = t.memoizedState;
    l !== f || d !== x || Xe.current || tn ? (typeof p == "function" && (ha(t, n, p, r), x = t.memoizedState), (u = tn || Jc(t, n, u, r, d, x, a) || !1) ? (c || typeof s.UNSAFE_componentWillUpdate != "function" && typeof s.componentWillUpdate != "function" || (typeof s.componentWillUpdate == "function" && s.componentWillUpdate(r, x, a), typeof s.UNSAFE_componentWillUpdate == "function" && s.UNSAFE_componentWillUpdate(r, x, a)), typeof s.componentDidUpdate == "function" && (t.flags |= 4), typeof s.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = x), s.props = r, s.state = x, s.context = a, r = u) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return va(e, t, n, r, i, o);
}
function va(e, t, n, r, o, i) {
  oh(e, t);
  var s = (t.flags & 128) !== 0;
  if (!r && !s) return o && Wc(t, n, !1), Xt(e, t, i);
  r = t.stateNode, Uy.current = t;
  var l = s && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && s ? (t.child = Ar(t, e.child, null, i), t.child = Ar(t, null, l, i)) : He(e, t, l, i), t.memoizedState = r.state, o && Wc(t, n, !0), t.child;
}
function ih(e) {
  var t = e.stateNode;
  t.pendingContext ? Uc(e, t.pendingContext, t.pendingContext !== t.context) : t.context && Uc(e, t.context, !1), Su(e, t.containerInfo);
}
function af(e, t, n, r, o) {
  return Rr(), yu(o), t.flags |= 256, He(e, t, n, r), t.child;
}
var wa = { dehydrated: null, treeContext: null, retryLane: 0 };
function xa(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function sh(e, t, n) {
  var r = t.pendingProps, o = fe.current, i = !1, s = (t.flags & 128) !== 0, l;
  if ((l = s) || (l = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0), l ? (i = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1), se(fe, o & 1), e === null)
    return da(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (s = r.children, e = r.fallback, i ? (r = t.mode, i = t.child, s = { mode: "hidden", children: s }, !(r & 1) && i !== null ? (i.childLanes = 0, i.pendingProps = s) : i = Ds(s, r, 0, null), e = Hn(e, r, n, null), i.return = t, e.return = t, i.sibling = e, t.child = i, t.child.memoizedState = xa(n), t.memoizedState = wa, e) : Tu(t, s));
  if (o = e.memoizedState, o !== null && (l = o.dehydrated, l !== null)) return Wy(e, t, s, r, l, o, n);
  if (i) {
    i = r.fallback, s = t.mode, o = e.child, l = o.sibling;
    var a = { mode: "hidden", children: r.children };
    return !(s & 1) && t.child !== o ? (r = t.child, r.childLanes = 0, r.pendingProps = a, t.deletions = null) : (r = vn(o, a), r.subtreeFlags = o.subtreeFlags & 14680064), l !== null ? i = vn(l, i) : (i = Hn(i, s, n, null), i.flags |= 2), i.return = t, r.return = t, r.sibling = i, t.child = r, r = i, i = t.child, s = e.child.memoizedState, s = s === null ? xa(n) : { baseLanes: s.baseLanes | n, cachePool: null, transitions: s.transitions }, i.memoizedState = s, i.childLanes = e.childLanes & ~n, t.memoizedState = wa, r;
  }
  return i = e.child, e = i.sibling, r = vn(i, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Tu(e, t) {
  return t = Ds({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function vi(e, t, n, r) {
  return r !== null && yu(r), Ar(t, e.child, null, n), e = Tu(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function Wy(e, t, n, r, o, i, s) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = _l(Error(b(422))), vi(e, t, s, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (i = r.fallback, o = t.mode, r = Ds({ mode: "visible", children: r.children }, o, 0, null), i = Hn(i, o, s, null), i.flags |= 2, r.return = t, i.return = t, r.sibling = i, t.child = r, t.mode & 1 && Ar(t, e.child, null, s), t.child.memoizedState = xa(s), t.memoizedState = wa, i);
  if (!(t.mode & 1)) return vi(e, t, s, null);
  if (o.data === "$!") {
    if (r = o.nextSibling && o.nextSibling.dataset, r) var l = r.dgst;
    return r = l, i = Error(b(419)), r = _l(i, r, void 0), vi(e, t, s, r);
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
      o = o & (r.suspendedLanes | s) ? 0 : o, o !== 0 && o !== i.retryLane && (i.retryLane = o, Yt(e, o), kt(r, e, o, -1));
    }
    return Du(), r = _l(Error(b(421))), vi(e, t, s, r);
  }
  return o.data === "$?" ? (t.flags |= 128, t.child = e.child, t = ov.bind(null, e), o._reactRetry = t, null) : (e = i.treeContext, qe = hn(o.nextSibling), Je = t, ce = !0, wt = null, e !== null && (ot[it++] = Ft, ot[it++] = Ht, ot[it++] = Un, Ft = e.id, Ht = e.overflow, Un = t), t = Tu(t, r.children), t.flags |= 4096, t);
}
function uf(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), pa(e.return, t, n);
}
function kl(e, t, n, r, o) {
  var i = e.memoizedState;
  i === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: o } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = r, i.tail = n, i.tailMode = o);
}
function lh(e, t, n) {
  var r = t.pendingProps, o = r.revealOrder, i = r.tail;
  if (He(e, t, r.children, n), r = fe.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && uf(e, n, t);
      else if (e.tag === 19) uf(e, n, t);
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
      n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), kl(t, !1, o, n, i);
      break;
    case "backwards":
      for (n = null, o = t.child, t.child = null; o !== null; ) {
        if (e = o.alternate, e !== null && us(e) === null) {
          t.child = o;
          break;
        }
        e = o.sibling, o.sibling = n, n = o, o = e;
      }
      kl(t, !0, n, null, i);
      break;
    case "together":
      kl(t, !1, null, null, void 0);
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
  if (e !== null && t.child !== e.child) throw Error(b(153));
  if (t.child !== null) {
    for (e = t.child, n = vn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = vn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function Yy(e, t, n) {
  switch (t.tag) {
    case 3:
      ih(t), Rr();
      break;
    case 5:
      Rp(t);
      break;
    case 1:
      Ke(t.type) && rs(t);
      break;
    case 4:
      Su(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, o = t.memoizedProps.value;
      se(ss, r._currentValue), r._currentValue = o;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (se(fe, fe.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? sh(e, t, n) : (se(fe, fe.current & 1), e = Xt(e, t, n), e !== null ? e.sibling : null);
      se(fe, fe.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return lh(e, t, n);
        t.flags |= 128;
      }
      if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), se(fe, fe.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, rh(e, t, n);
  }
  return Xt(e, t, n);
}
var ah, _a, uh, ch;
ah = function(e, t) {
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
_a = function() {
};
uh = function(e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    e = t.stateNode, Ln(zt.current);
    var i = null;
    switch (n) {
      case "input":
        o = Bl(e, o), r = Bl(e, r), i = [];
        break;
      case "select":
        o = pe({}, o, { value: void 0 }), r = pe({}, r, { value: void 0 }), i = [];
        break;
      case "textarea":
        o = Yl(e, o), r = Yl(e, r), i = [];
        break;
      default:
        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = ts);
    }
    Kl(n, r);
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
ch = function(e, t, n, r) {
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
function Xy(e, t, n) {
  var r = t.pendingProps;
  switch (gu(t), t.tag) {
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
      return r = t.stateNode, Ir(), ue(Xe), ue(De), Nu(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (gi(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, wt !== null && (Ma(wt), wt = null))), _a(e, t), Ie(t), null;
    case 5:
      Eu(t);
      var o = Ln(Oo.current);
      if (n = t.type, e !== null && t.stateNode != null) uh(e, t, n, r, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(b(166));
          return Ie(t), null;
        }
        if (e = Ln(zt.current), gi(t)) {
          r = t.stateNode, n = t.type;
          var i = t.memoizedProps;
          switch (r[Pt] = t, r[Lo] = i, e = (t.mode & 1) !== 0, n) {
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
              yc(r, i), ae("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!i.multiple }, ae("invalid", r);
              break;
            case "textarea":
              wc(r, i), ae("invalid", r);
          }
          Kl(n, i), o = null;
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
              li(r), vc(r, i, !0);
              break;
            case "textarea":
              li(r), xc(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof i.onClick == "function" && (r.onclick = ts);
          }
          r = o, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          s = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Od(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = s.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = s.createElement(n, { is: r.is }) : (e = s.createElement(n), n === "select" && (s = e, r.multiple ? s.multiple = !0 : r.size && (s.size = r.size))) : e = s.createElementNS(e, n), e[Pt] = t, e[Lo] = r, ah(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (s = Gl(n, r), n) {
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
                yc(e, r), o = Bl(e, r), ae("invalid", e);
                break;
              case "option":
                o = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, o = pe({}, r, { value: void 0 }), ae("invalid", e);
                break;
              case "textarea":
                wc(e, r), o = Yl(e, r), ae("invalid", e);
                break;
              default:
                o = r;
            }
            Kl(n, o), l = o;
            for (i in l) if (l.hasOwnProperty(i)) {
              var a = l[i];
              i === "style" ? Vd(e, a) : i === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, a != null && Fd(e, a)) : i === "children" ? typeof a == "string" ? (n !== "textarea" || a !== "") && jo(e, a) : typeof a == "number" && jo(e, "" + a) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (Co.hasOwnProperty(i) ? a != null && i === "onScroll" && ae("scroll", e) : a != null && tu(e, i, a, s));
            }
            switch (n) {
              case "input":
                li(e), vc(e, r, !1);
                break;
              case "textarea":
                li(e), xc(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + xn(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, i = r.value, i != null ? kr(e, !!r.multiple, i, !1) : r.defaultValue != null && kr(
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
      if (e && t.stateNode != null) ch(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(b(166));
        if (n = Ln(Oo.current), Ln(zt.current), gi(t)) {
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
        if (ce && qe !== null && t.mode & 1 && !(t.flags & 128)) Pp(), Rr(), t.flags |= 98560, i = !1;
        else if (i = gi(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!i) throw Error(b(318));
            if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(b(317));
            i[Pt] = t;
          } else Rr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Ie(t), i = !1;
        } else wt !== null && (Ma(wt), wt = null), i = !0;
        if (!i) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || fe.current & 1 ? ke === 0 && (ke = 3) : Du())), t.updateQueue !== null && (t.flags |= 4), Ie(t), null);
    case 4:
      return Ir(), _a(e, t), e === null && Ao(t.stateNode.containerInfo), Ie(t), null;
    case 10:
      return xu(t.type._context), Ie(t), null;
    case 17:
      return Ke(t.type) && ns(), Ie(t), null;
    case 19:
      if (ue(fe), i = t.memoizedState, i === null) return Ie(t), null;
      if (r = (t.flags & 128) !== 0, s = i.rendering, s === null) if (r) no(i, !1);
      else {
        if (ke !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (s = us(e), s !== null) {
            for (t.flags |= 128, no(i, !1), r = s.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) i = n, e = r, i.flags &= 14680066, s = i.alternate, s === null ? (i.childLanes = 0, i.lanes = e, i.child = null, i.subtreeFlags = 0, i.memoizedProps = null, i.memoizedState = null, i.updateQueue = null, i.dependencies = null, i.stateNode = null) : (i.childLanes = s.childLanes, i.lanes = s.lanes, i.child = s.child, i.subtreeFlags = 0, i.deletions = null, i.memoizedProps = s.memoizedProps, i.memoizedState = s.memoizedState, i.updateQueue = s.updateQueue, i.type = s.type, e = s.dependencies, i.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return se(fe, fe.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        i.tail !== null && ye() > Dr && (t.flags |= 128, r = !0, no(i, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = us(s), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), no(i, !0), i.tail === null && i.tailMode === "hidden" && !s.alternate && !ce) return Ie(t), null;
        } else 2 * ye() - i.renderingStartTime > Dr && n !== 1073741824 && (t.flags |= 128, r = !0, no(i, !1), t.lanes = 4194304);
        i.isBackwards ? (s.sibling = t.child, t.child = s) : (n = i.last, n !== null ? n.sibling = s : t.child = s, i.last = s);
      }
      return i.tail !== null ? (t = i.tail, i.rendering = t, i.tail = t.sibling, i.renderingStartTime = ye(), t.sibling = null, n = fe.current, se(fe, r ? n & 1 | 2 : n & 1), t) : (Ie(t), null);
    case 22:
    case 23:
      return Lu(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? Ze & 1073741824 && (Ie(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ie(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(b(156, t.tag));
}
function Ky(e, t) {
  switch (gu(t), t.tag) {
    case 1:
      return Ke(t.type) && ns(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Ir(), ue(Xe), ue(De), Nu(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Eu(t), null;
    case 13:
      if (ue(fe), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(b(340));
        Rr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return ue(fe), null;
    case 4:
      return Ir(), null;
    case 10:
      return xu(t.type._context), null;
    case 22:
    case 23:
      return Lu(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var wi = !1, Le = !1, Gy = typeof WeakSet == "function" ? WeakSet : Set, W = null;
function wr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    he(e, t, r);
  }
  else n.current = null;
}
function ka(e, t, n) {
  try {
    n();
  } catch (r) {
    he(e, t, r);
  }
}
var cf = !1;
function Qy(e, t) {
  if (ia = qi, e = mp(), hu(e)) {
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
  for (sa = { focusedElem: e, selectionRange: n }, qi = !1, W = t; W !== null; ) if (t = W, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, W = e;
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
            var v = x.memoizedProps, S = x.memoizedState, h = t.stateNode, m = h.getSnapshotBeforeUpdate(t.elementType === t.type ? v : gt(t.type, v), S);
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
          throw Error(b(163));
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
  return x = cf, cf = !1, x;
}
function So(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var o = r = r.next;
    do {
      if ((o.tag & e) === e) {
        var i = o.destroy;
        o.destroy = void 0, i !== void 0 && ka(t, n, i);
      }
      o = o.next;
    } while (o !== r);
  }
}
function Is(e, t) {
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
function Sa(e) {
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
function fh(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, fh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Pt], delete t[Lo], delete t[ua], delete t[$y], delete t[Ry])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function dh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function ff(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || dh(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Ea(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = ts));
  else if (r !== 4 && (e = e.child, e !== null)) for (Ea(e, t, n), e = e.sibling; e !== null; ) Ea(e, t, n), e = e.sibling;
}
function Na(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (Na(e, t, n), e = e.sibling; e !== null; ) Na(e, t, n), e = e.sibling;
}
var Pe = null, yt = !1;
function Zt(e, t, n) {
  for (n = n.child; n !== null; ) ph(e, t, n), n = n.sibling;
}
function ph(e, t, n) {
  if (Mt && typeof Mt.onCommitFiberUnmount == "function") try {
    Mt.onCommitFiberUnmount(js, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      Le || wr(n, t);
    case 6:
      var r = Pe, o = yt;
      Pe = null, Zt(e, t, n), Pe = r, yt = o, Pe !== null && (yt ? (e = Pe, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Pe.removeChild(n.stateNode));
      break;
    case 18:
      Pe !== null && (yt ? (e = Pe, n = n.stateNode, e.nodeType === 8 ? ml(e.parentNode, n) : e.nodeType === 1 && ml(e, n), To(e)) : ml(Pe, n.stateNode));
      break;
    case 4:
      r = Pe, o = yt, Pe = n.stateNode.containerInfo, yt = !0, Zt(e, t, n), Pe = r, yt = o;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!Le && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        o = r = r.next;
        do {
          var i = o, s = i.destroy;
          i = i.tag, s !== void 0 && (i & 2 || i & 4) && ka(n, t, s), o = o.next;
        } while (o !== r);
      }
      Zt(e, t, n);
      break;
    case 1:
      if (!Le && (wr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (l) {
        he(n, t, l);
      }
      Zt(e, t, n);
      break;
    case 21:
      Zt(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (Le = (r = Le) || n.memoizedState !== null, Zt(e, t, n), Le = r) : Zt(e, t, n);
      break;
    default:
      Zt(e, t, n);
  }
}
function df(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new Gy()), t.forEach(function(r) {
      var o = iv.bind(null, e, r);
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
      if (Pe === null) throw Error(b(160));
      ph(i, s, o), Pe = null, yt = !1;
      var a = o.alternate;
      a !== null && (a.return = null), o.return = null;
    } catch (u) {
      he(o, t, u);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) hh(t, e), t = t.sibling;
}
function hh(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (mt(t, e), Ct(e), r & 4) {
        try {
          So(3, e, e.return), Is(3, e);
        } catch (v) {
          he(e, e.return, v);
        }
        try {
          So(5, e, e.return);
        } catch (v) {
          he(e, e.return, v);
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
          jo(o, "");
        } catch (v) {
          he(e, e.return, v);
        }
      }
      if (r & 4 && (o = e.stateNode, o != null)) {
        var i = e.memoizedProps, s = n !== null ? n.memoizedProps : i, l = e.type, a = e.updateQueue;
        if (e.updateQueue = null, a !== null) try {
          l === "input" && i.type === "radio" && i.name != null && Ld(o, i), Gl(l, s);
          var u = Gl(l, i);
          for (s = 0; s < a.length; s += 2) {
            var c = a[s], f = a[s + 1];
            c === "style" ? Vd(o, f) : c === "dangerouslySetInnerHTML" ? Fd(o, f) : c === "children" ? jo(o, f) : tu(o, c, f, u);
          }
          switch (l) {
            case "input":
              Ul(o, i);
              break;
            case "textarea":
              Dd(o, i);
              break;
            case "select":
              var d = o._wrapperState.wasMultiple;
              o._wrapperState.wasMultiple = !!i.multiple;
              var p = i.value;
              p != null ? kr(o, !!i.multiple, p, !1) : d !== !!i.multiple && (i.defaultValue != null ? kr(
                o,
                !!i.multiple,
                i.defaultValue,
                !0
              ) : kr(o, !!i.multiple, i.multiple ? [] : "", !1));
          }
          o[Lo] = i;
        } catch (v) {
          he(e, e.return, v);
        }
      }
      break;
    case 6:
      if (mt(t, e), Ct(e), r & 4) {
        if (e.stateNode === null) throw Error(b(162));
        o = e.stateNode, i = e.memoizedProps;
        try {
          o.nodeValue = i;
        } catch (v) {
          he(e, e.return, v);
        }
      }
      break;
    case 3:
      if (mt(t, e), Ct(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        To(t.containerInfo);
      } catch (v) {
        he(e, e.return, v);
      }
      break;
    case 4:
      mt(t, e), Ct(e);
      break;
    case 13:
      mt(t, e), Ct(e), o = e.child, o.flags & 8192 && (i = o.memoizedState !== null, o.stateNode.isHidden = i, !i || o.alternate !== null && o.alternate.memoizedState !== null || (Au = ye())), r & 4 && df(e);
      break;
    case 22:
      if (c = n !== null && n.memoizedState !== null, e.mode & 1 ? (Le = (u = Le) || c, mt(t, e), Le = u) : mt(t, e), Ct(e), r & 8192) {
        if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !c && e.mode & 1) for (W = e, c = e.child; c !== null; ) {
          for (f = W = c; W !== null; ) {
            switch (d = W, p = d.child, d.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                So(4, d, d.return);
                break;
              case 1:
                wr(d, d.return);
                var x = d.stateNode;
                if (typeof x.componentWillUnmount == "function") {
                  r = d, n = d.return;
                  try {
                    t = r, x.props = t.memoizedProps, x.state = t.memoizedState, x.componentWillUnmount();
                  } catch (v) {
                    he(r, n, v);
                  }
                }
                break;
              case 5:
                wr(d, d.return);
                break;
              case 22:
                if (d.memoizedState !== null) {
                  hf(f);
                  continue;
                }
            }
            p !== null ? (p.return = d, W = p) : hf(f);
          }
          c = c.sibling;
        }
        e: for (c = null, f = e; ; ) {
          if (f.tag === 5) {
            if (c === null) {
              c = f;
              try {
                o = f.stateNode, u ? (i = o.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (l = f.stateNode, a = f.memoizedProps.style, s = a != null && a.hasOwnProperty("display") ? a.display : null, l.style.display = Hd("display", s));
              } catch (v) {
                he(e, e.return, v);
              }
            }
          } else if (f.tag === 6) {
            if (c === null) try {
              f.stateNode.nodeValue = u ? "" : f.memoizedProps;
            } catch (v) {
              he(e, e.return, v);
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
      mt(t, e), Ct(e), r & 4 && df(e);
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
          if (dh(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(b(160));
      }
      switch (r.tag) {
        case 5:
          var o = r.stateNode;
          r.flags & 32 && (jo(o, ""), r.flags &= -33);
          var i = ff(e);
          Na(e, i, o);
          break;
        case 3:
        case 4:
          var s = r.stateNode.containerInfo, l = ff(e);
          Ea(e, l, s);
          break;
        default:
          throw Error(b(161));
      }
    } catch (a) {
      he(e, e.return, a);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Zy(e, t, n) {
  W = e, mh(e);
}
function mh(e, t, n) {
  for (var r = (e.mode & 1) !== 0; W !== null; ) {
    var o = W, i = o.child;
    if (o.tag === 22 && r) {
      var s = o.memoizedState !== null || wi;
      if (!s) {
        var l = o.alternate, a = l !== null && l.memoizedState !== null || Le;
        l = wi;
        var u = Le;
        if (wi = s, (Le = a) && !u) for (W = o; W !== null; ) s = W, a = s.child, s.tag === 22 && s.memoizedState !== null ? mf(o) : a !== null ? (a.return = s, W = a) : mf(o);
        for (; i !== null; ) W = i, mh(i), i = i.sibling;
        W = o, wi = l, Le = u;
      }
      pf(e);
    } else o.subtreeFlags & 8772 && i !== null ? (i.return = o, W = i) : pf(e);
  }
}
function pf(e) {
  for (; W !== null; ) {
    var t = W;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            Le || Is(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !Le) if (n === null) r.componentDidMount();
            else {
              var o = t.elementType === t.type ? n.memoizedProps : gt(t.type, n.memoizedProps);
              r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var i = t.updateQueue;
            i !== null && Qc(t, i, r);
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
              Qc(t, s, n);
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
                  f !== null && To(f);
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
            throw Error(b(163));
        }
        Le || t.flags & 512 && Sa(t);
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
function hf(e) {
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
function mf(e) {
  for (; W !== null; ) {
    var t = W;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Is(4, t);
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
            Sa(t);
          } catch (a) {
            he(t, i, a);
          }
          break;
        case 5:
          var s = t.return;
          try {
            Sa(t);
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
var qy = Math.ceil, ds = Qt.ReactCurrentDispatcher, $u = Qt.ReactCurrentOwner, ut = Qt.ReactCurrentBatchConfig, ee = 0, Ne = null, ve = null, Me = 0, Ze = 0, xr = Sn(0), ke = 0, bo = null, Yn = 0, Ls = 0, Ru = 0, Eo = null, Ue = null, Au = 0, Dr = 1 / 0, Dt = null, ps = !1, Ca = null, gn = null, xi = !1, cn = null, hs = 0, No = 0, ja = null, Hi = -1, Vi = 0;
function Ve() {
  return ee & 6 ? ye() : Hi !== -1 ? Hi : Hi = ye();
}
function yn(e) {
  return e.mode & 1 ? ee & 2 && Me !== 0 ? Me & -Me : Iy.transition !== null ? (Vi === 0 && (Vi = Jd()), Vi) : (e = oe, e !== 0 || (e = window.event, e = e === void 0 ? 16 : sp(e.type)), e) : 1;
}
function kt(e, t, n, r) {
  if (50 < No) throw No = 0, ja = null, Error(b(185));
  qo(e, n, r), (!(ee & 2) || e !== Ne) && (e === Ne && (!(ee & 2) && (Ls |= n), ke === 4 && sn(e, Me)), Ge(e, r), n === 1 && ee === 0 && !(t.mode & 1) && (Dr = ye() + 500, $s && En()));
}
function Ge(e, t) {
  var n = e.callbackNode;
  I0(e, t);
  var r = Zi(e, e === Ne ? Me : 0);
  if (r === 0) n !== null && Sc(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && Sc(n), t === 1) e.tag === 0 ? Ay(gf.bind(null, e)) : Np(gf.bind(null, e)), zy(function() {
      !(ee & 6) && En();
    }), n = null;
    else {
      switch (ep(r)) {
        case 1:
          n = su;
          break;
        case 4:
          n = Zd;
          break;
        case 16:
          n = Qi;
          break;
        case 536870912:
          n = qd;
          break;
        default:
          n = Qi;
      }
      n = Sh(n, gh.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function gh(e, t) {
  if (Hi = -1, Vi = 0, ee & 6) throw Error(b(327));
  var n = e.callbackNode;
  if (jr() && e.callbackNode !== n) return null;
  var r = Zi(e, e === Ne ? Me : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = ms(e, r);
  else {
    t = r;
    var o = ee;
    ee |= 2;
    var i = vh();
    (Ne !== e || Me !== t) && (Dt = null, Dr = ye() + 500, Fn(e, t));
    do
      try {
        tv();
        break;
      } catch (l) {
        yh(e, l);
      }
    while (!0);
    wu(), ds.current = i, ee = o, ve !== null ? t = 0 : (Ne = null, Me = 0, t = ke);
  }
  if (t !== 0) {
    if (t === 2 && (o = ea(e), o !== 0 && (r = o, t = Pa(e, o))), t === 1) throw n = bo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
    if (t === 6) sn(e, r);
    else {
      if (o = e.current.alternate, !(r & 30) && !Jy(o) && (t = ms(e, r), t === 2 && (i = ea(e), i !== 0 && (r = i, t = Pa(e, i))), t === 1)) throw n = bo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
      switch (e.finishedWork = o, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(b(345));
        case 2:
          $n(e, Ue, Dt);
          break;
        case 3:
          if (sn(e, r), (r & 130023424) === r && (t = Au + 500 - ye(), 10 < t)) {
            if (Zi(e, 0) !== 0) break;
            if (o = e.suspendedLanes, (o & r) !== r) {
              Ve(), e.pingedLanes |= e.suspendedLanes & o;
              break;
            }
            e.timeoutHandle = aa($n.bind(null, e, Ue, Dt), t);
            break;
          }
          $n(e, Ue, Dt);
          break;
        case 4:
          if (sn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, o = -1; 0 < r; ) {
            var s = 31 - _t(r);
            i = 1 << s, s = t[s], s > o && (o = s), r &= ~i;
          }
          if (r = o, r = ye() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * qy(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = aa($n.bind(null, e, Ue, Dt), r);
            break;
          }
          $n(e, Ue, Dt);
          break;
        case 5:
          $n(e, Ue, Dt);
          break;
        default:
          throw Error(b(329));
      }
    }
  }
  return Ge(e, ye()), e.callbackNode === n ? gh.bind(null, e) : null;
}
function Pa(e, t) {
  var n = Eo;
  return e.current.memoizedState.isDehydrated && (Fn(e, t).flags |= 256), e = ms(e, t), e !== 2 && (t = Ue, Ue = n, t !== null && Ma(t)), e;
}
function Ma(e) {
  Ue === null ? Ue = e : Ue.push.apply(Ue, e);
}
function Jy(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var o = n[r], i = o.getSnapshot;
        o = o.value;
        try {
          if (!St(i(), o)) return !1;
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
  for (t &= ~Ru, t &= ~Ls, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - _t(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function gf(e) {
  if (ee & 6) throw Error(b(327));
  jr();
  var t = Zi(e, 0);
  if (!(t & 1)) return Ge(e, ye()), null;
  var n = ms(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = ea(e);
    r !== 0 && (t = r, n = Pa(e, r));
  }
  if (n === 1) throw n = bo, Fn(e, 0), sn(e, t), Ge(e, ye()), n;
  if (n === 6) throw Error(b(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, $n(e, Ue, Dt), Ge(e, ye()), null;
}
function Iu(e, t) {
  var n = ee;
  ee |= 1;
  try {
    return e(t);
  } finally {
    ee = n, ee === 0 && (Dr = ye() + 500, $s && En());
  }
}
function Xn(e) {
  cn !== null && cn.tag === 0 && !(ee & 6) && jr();
  var t = ee;
  ee |= 1;
  var n = ut.transition, r = oe;
  try {
    if (ut.transition = null, oe = 1, e) return e();
  } finally {
    oe = r, ut.transition = n, ee = t, !(ee & 6) && En();
  }
}
function Lu() {
  Ze = xr.current, ue(xr);
}
function Fn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, My(n)), ve !== null) for (n = ve.return; n !== null; ) {
    var r = n;
    switch (gu(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && ns();
        break;
      case 3:
        Ir(), ue(Xe), ue(De), Nu();
        break;
      case 5:
        Eu(r);
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
        xu(r.type._context);
        break;
      case 22:
      case 23:
        Lu();
    }
    n = n.return;
  }
  if (Ne = e, ve = e = vn(e.current, null), Me = Ze = t, ke = 0, bo = null, Ru = Ls = Yn = 0, Ue = Eo = null, In !== null) {
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
function yh(e, t) {
  do {
    var n = ve;
    try {
      if (wu(), Di.current = fs, cs) {
        for (var r = de.memoizedState; r !== null; ) {
          var o = r.queue;
          o !== null && (o.pending = null), r = r.next;
        }
        cs = !1;
      }
      if (Wn = 0, Ee = xe = de = null, ko = !1, Fo = 0, $u.current = null, n === null || n.return === null) {
        ke = 1, bo = t, ve = null;
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
          var p = nf(s);
          if (p !== null) {
            p.flags &= -257, rf(p, s, l, i, t), p.mode & 1 && tf(i, u, t), t = p, a = u;
            var x = t.updateQueue;
            if (x === null) {
              var v = /* @__PURE__ */ new Set();
              v.add(a), t.updateQueue = v;
            } else x.add(a);
            break e;
          } else {
            if (!(t & 1)) {
              tf(i, u, t), Du();
              break e;
            }
            a = Error(b(426));
          }
        } else if (ce && l.mode & 1) {
          var S = nf(s);
          if (S !== null) {
            !(S.flags & 65536) && (S.flags |= 256), rf(S, s, l, i, t), yu(Lr(a, l));
            break e;
          }
        }
        i = a = Lr(a, l), ke !== 4 && (ke = 2), Eo === null ? Eo = [i] : Eo.push(i), i = s;
        do {
          switch (i.tag) {
            case 3:
              i.flags |= 65536, t &= -t, i.lanes |= t;
              var h = eh(i, a, t);
              Gc(i, h);
              break e;
            case 1:
              l = a;
              var m = i.type, g = i.stateNode;
              if (!(i.flags & 128) && (typeof m.getDerivedStateFromError == "function" || g !== null && typeof g.componentDidCatch == "function" && (gn === null || !gn.has(g)))) {
                i.flags |= 65536, t &= -t, i.lanes |= t;
                var w = th(i, l, t);
                Gc(i, w);
                break e;
              }
          }
          i = i.return;
        } while (i !== null);
      }
      xh(n);
    } catch (N) {
      t = N, ve === n && n !== null && (ve = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function vh() {
  var e = ds.current;
  return ds.current = fs, e === null ? fs : e;
}
function Du() {
  (ke === 0 || ke === 3 || ke === 2) && (ke = 4), Ne === null || !(Yn & 268435455) && !(Ls & 268435455) || sn(Ne, Me);
}
function ms(e, t) {
  var n = ee;
  ee |= 2;
  var r = vh();
  (Ne !== e || Me !== t) && (Dt = null, Fn(e, t));
  do
    try {
      ev();
      break;
    } catch (o) {
      yh(e, o);
    }
  while (!0);
  if (wu(), ee = n, ds.current = r, ve !== null) throw Error(b(261));
  return Ne = null, Me = 0, ke;
}
function ev() {
  for (; ve !== null; ) wh(ve);
}
function tv() {
  for (; ve !== null && !C0(); ) wh(ve);
}
function wh(e) {
  var t = kh(e.alternate, e, Ze);
  e.memoizedProps = e.pendingProps, t === null ? xh(e) : ve = t, $u.current = null;
}
function xh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = Ky(n, t), n !== null) {
        n.flags &= 32767, ve = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        ke = 6, ve = null;
        return;
      }
    } else if (n = Xy(n, t, Ze), n !== null) {
      ve = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ve = t;
      return;
    }
    ve = t = e;
  } while (t !== null);
  ke === 0 && (ke = 5);
}
function $n(e, t, n) {
  var r = oe, o = ut.transition;
  try {
    ut.transition = null, oe = 1, nv(e, t, n, r);
  } finally {
    ut.transition = o, oe = r;
  }
  return null;
}
function nv(e, t, n, r) {
  do
    jr();
  while (cn !== null);
  if (ee & 6) throw Error(b(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(b(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var i = n.lanes | n.childLanes;
  if (L0(e, i), e === Ne && (ve = Ne = null, Me = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || xi || (xi = !0, Sh(Qi, function() {
    return jr(), null;
  })), i = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || i) {
    i = ut.transition, ut.transition = null;
    var s = oe;
    oe = 1;
    var l = ee;
    ee |= 4, $u.current = null, Qy(e, n), hh(n, e), ky(sa), qi = !!ia, sa = ia = null, e.current = n, Zy(n), j0(), ee = l, oe = s, ut.transition = i;
  } else e.current = n;
  if (xi && (xi = !1, cn = e, hs = o), i = e.pendingLanes, i === 0 && (gn = null), z0(n.stateNode), Ge(e, ye()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) o = t[n], r(o.value, { componentStack: o.stack, digest: o.digest });
  if (ps) throw ps = !1, e = Ca, Ca = null, e;
  return hs & 1 && e.tag !== 0 && jr(), i = e.pendingLanes, i & 1 ? e === ja ? No++ : (No = 0, ja = e) : No = 0, En(), null;
}
function jr() {
  if (cn !== null) {
    var e = ep(hs), t = ut.transition, n = oe;
    try {
      if (ut.transition = null, oe = 16 > e ? 16 : e, cn === null) var r = !1;
      else {
        if (e = cn, cn = null, hs = 0, ee & 6) throw Error(b(331));
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
                      So(8, c, i);
                  }
                  var f = c.child;
                  if (f !== null) f.return = c, W = f;
                  else for (; W !== null; ) {
                    c = W;
                    var d = c.sibling, p = c.return;
                    if (fh(c), c === u) {
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
                var v = x.child;
                if (v !== null) {
                  x.child = null;
                  do {
                    var S = v.sibling;
                    v.sibling = null, v = S;
                  } while (v !== null);
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
                So(9, i, i.return);
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
                  Is(9, l);
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
          Mt.onPostCommitFiberRoot(js, e);
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
function yf(e, t, n) {
  t = Lr(n, t), t = eh(e, t, 1), e = mn(e, t, 1), t = Ve(), e !== null && (qo(e, 1, t), Ge(e, t));
}
function he(e, t, n) {
  if (e.tag === 3) yf(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      yf(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (gn === null || !gn.has(r))) {
        e = Lr(n, e), e = th(t, e, 1), t = mn(t, e, 1), e = Ve(), t !== null && (qo(t, 1, e), Ge(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function rv(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Ve(), e.pingedLanes |= e.suspendedLanes & n, Ne === e && (Me & n) === n && (ke === 4 || ke === 3 && (Me & 130023424) === Me && 500 > ye() - Au ? Fn(e, 0) : Ru |= n), Ge(e, t);
}
function _h(e, t) {
  t === 0 && (e.mode & 1 ? (t = ci, ci <<= 1, !(ci & 130023424) && (ci = 4194304)) : t = 1);
  var n = Ve();
  e = Yt(e, t), e !== null && (qo(e, t, n), Ge(e, n));
}
function ov(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), _h(e, n);
}
function iv(e, t) {
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
      throw Error(b(314));
  }
  r !== null && r.delete(t), _h(e, n);
}
var kh;
kh = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) We = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return We = !1, Yy(e, t, n);
    We = !!(e.flags & 131072);
  }
  else We = !1, ce && t.flags & 1048576 && Cp(t, is, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      Fi(e, t), e = t.pendingProps;
      var o = $r(t, De.current);
      Cr(t, n), o = ju(null, t, r, e, o, n);
      var i = Pu();
      return t.flags |= 1, typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ke(r) ? (i = !0, rs(t)) : i = !1, t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null, ku(t), o.updater = As, t.stateNode = o, o._reactInternals = t, ma(t, r, e, n), t = va(null, t, r, !0, i, n)) : (t.tag = 0, ce && i && mu(t), He(null, t, o, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (Fi(e, t), e = t.pendingProps, o = r._init, r = o(r._payload), t.type = r, o = t.tag = lv(r), e = gt(r, e), o) {
          case 0:
            t = ya(null, t, r, e, n);
            break e;
          case 1:
            t = lf(null, t, r, e, n);
            break e;
          case 11:
            t = of(null, t, r, e, n);
            break e;
          case 14:
            t = sf(null, t, r, gt(r.type, e), n);
            break e;
        }
        throw Error(b(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), ya(e, t, r, o, n);
    case 1:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), lf(e, t, r, o, n);
    case 3:
      e: {
        if (ih(t), e === null) throw Error(b(387));
        r = t.pendingProps, i = t.memoizedState, o = i.element, $p(e, t), as(t, r, null, n);
        var s = t.memoizedState;
        if (r = s.element, i.isDehydrated) if (i = { element: r, isDehydrated: !1, cache: s.cache, pendingSuspenseBoundaries: s.pendingSuspenseBoundaries, transitions: s.transitions }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
          o = Lr(Error(b(423)), t), t = af(e, t, r, n, o);
          break e;
        } else if (r !== o) {
          o = Lr(Error(b(424)), t), t = af(e, t, r, n, o);
          break e;
        } else for (qe = hn(t.stateNode.containerInfo.firstChild), Je = t, ce = !0, wt = null, n = zp(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (Rr(), r === o) {
            t = Xt(e, t, n);
            break e;
          }
          He(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Rp(t), e === null && da(t), r = t.type, o = t.pendingProps, i = e !== null ? e.memoizedProps : null, s = o.children, la(r, o) ? s = null : i !== null && la(r, i) && (t.flags |= 32), oh(e, t), He(e, t, s, n), t.child;
    case 6:
      return e === null && da(t), null;
    case 13:
      return sh(e, t, n);
    case 4:
      return Su(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Ar(t, null, r, n) : He(e, t, r, n), t.child;
    case 11:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), of(e, t, r, o, n);
    case 7:
      return He(e, t, t.pendingProps, n), t.child;
    case 8:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, o = t.pendingProps, i = t.memoizedProps, s = o.value, se(ss, r._currentValue), r._currentValue = s, i !== null) if (St(i.value, s)) {
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
                  a = bt(-1, n & -n), a.tag = 2;
                  var u = i.updateQueue;
                  if (u !== null) {
                    u = u.shared;
                    var c = u.pending;
                    c === null ? a.next = a : (a.next = c.next, c.next = a), u.pending = a;
                  }
                }
                i.lanes |= n, a = i.alternate, a !== null && (a.lanes |= n), pa(
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
            if (s = i.return, s === null) throw Error(b(341));
            s.lanes |= n, l = s.alternate, l !== null && (l.lanes |= n), pa(s, n, t), s = i.sibling;
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
        He(e, t, o.children, n), t = t.child;
      }
      return t;
    case 9:
      return o = t.type, r = t.pendingProps.children, Cr(t, n), o = ft(o), r = r(o), t.flags |= 1, He(e, t, r, n), t.child;
    case 14:
      return r = t.type, o = gt(r, t.pendingProps), o = gt(r.type, o), sf(e, t, r, o, n);
    case 15:
      return nh(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : gt(r, o), Fi(e, t), t.tag = 1, Ke(r) ? (e = !0, rs(t)) : e = !1, Cr(t, n), Jp(t, r, o), ma(t, r, o, n), va(null, t, r, !0, e, n);
    case 19:
      return lh(e, t, n);
    case 22:
      return rh(e, t, n);
  }
  throw Error(b(156, t.tag));
};
function Sh(e, t) {
  return Qd(e, t);
}
function sv(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function lt(e, t, n, r) {
  return new sv(e, t, n, r);
}
function Ou(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function lv(e) {
  if (typeof e == "function") return Ou(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === ru) return 11;
    if (e === ou) return 14;
  }
  return 2;
}
function vn(e, t) {
  var n = e.alternate;
  return n === null ? (n = lt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function bi(e, t, n, r, o, i) {
  var s = 2;
  if (r = e, typeof e == "function") Ou(e) && (s = 1);
  else if (typeof e == "string") s = 5;
  else e: switch (e) {
    case cr:
      return Hn(n.children, o, i, t);
    case nu:
      s = 8, o |= 8;
      break;
    case Fl:
      return e = lt(12, n, t, o | 2), e.elementType = Fl, e.lanes = i, e;
    case Hl:
      return e = lt(13, n, t, o), e.elementType = Hl, e.lanes = i, e;
    case Vl:
      return e = lt(19, n, t, o), e.elementType = Vl, e.lanes = i, e;
    case Rd:
      return Ds(n, o, i, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Td:
          s = 10;
          break e;
        case $d:
          s = 9;
          break e;
        case ru:
          s = 11;
          break e;
        case ou:
          s = 14;
          break e;
        case en:
          s = 16, r = null;
          break e;
      }
      throw Error(b(130, e == null ? e : typeof e, ""));
  }
  return t = lt(s, n, t, o), t.elementType = e, t.type = r, t.lanes = i, t;
}
function Hn(e, t, n, r) {
  return e = lt(7, e, r, t), e.lanes = n, e;
}
function Ds(e, t, n, r) {
  return e = lt(22, e, r, t), e.elementType = Rd, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Sl(e, t, n) {
  return e = lt(6, e, null, t), e.lanes = n, e;
}
function El(e, t, n) {
  return t = lt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function av(e, t, n, r, o) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = ol(0), this.expirationTimes = ol(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ol(0), this.identifierPrefix = r, this.onRecoverableError = o, this.mutableSourceEagerHydrationData = null;
}
function Fu(e, t, n, r, o, i, s, l, a) {
  return e = new av(e, t, n, l, a), t === 1 ? (t = 1, i === !0 && (t |= 8)) : t = 0, i = lt(3, null, null, t), e.current = i, i.stateNode = e, i.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, ku(i), e;
}
function uv(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: ur, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function Eh(e) {
  if (!e) return _n;
  e = e._reactInternals;
  e: {
    if (Zn(e) !== e || e.tag !== 1) throw Error(b(170));
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
    throw Error(b(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Ke(n)) return Ep(e, n, t);
  }
  return t;
}
function Nh(e, t, n, r, o, i, s, l, a) {
  return e = Fu(n, r, !0, e, o, i, s, l, a), e.context = Eh(null), n = e.current, r = Ve(), o = yn(n), i = bt(r, o), i.callback = t ?? null, mn(n, i, o), e.current.lanes = o, qo(e, o, r), Ge(e, r), e;
}
function Os(e, t, n, r) {
  var o = t.current, i = Ve(), s = yn(o);
  return n = Eh(n), t.context === null ? t.context = n : t.pendingContext = n, t = bt(i, s), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = mn(o, t, s), e !== null && (kt(e, o, s, i), Li(e, o, s)), s;
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
function vf(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Hu(e, t) {
  vf(e, t), (e = e.alternate) && vf(e, t);
}
function cv() {
  return null;
}
var Ch = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function Vu(e) {
  this._internalRoot = e;
}
Fs.prototype.render = Vu.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(b(409));
  Os(e, t, null, null);
};
Fs.prototype.unmount = Vu.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    Xn(function() {
      Os(null, e, null, null);
    }), t[Wt] = null;
  }
};
function Fs(e) {
  this._internalRoot = e;
}
Fs.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = rp();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < on.length && t !== 0 && t < on[n].priority; n++) ;
    on.splice(n, 0, e), n === 0 && ip(e);
  }
};
function bu(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Hs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function wf() {
}
function fv(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var i = r;
      r = function() {
        var u = gs(s);
        i.call(u);
      };
    }
    var s = Nh(t, r, e, 0, null, !1, !1, "", wf);
    return e._reactRootContainer = s, e[Wt] = s.current, Ao(e.nodeType === 8 ? e.parentNode : e), Xn(), s;
  }
  for (; o = e.lastChild; ) e.removeChild(o);
  if (typeof r == "function") {
    var l = r;
    r = function() {
      var u = gs(a);
      l.call(u);
    };
  }
  var a = Fu(e, 0, !1, null, null, !1, !1, "", wf);
  return e._reactRootContainer = a, e[Wt] = a.current, Ao(e.nodeType === 8 ? e.parentNode : e), Xn(function() {
    Os(t, a, n, r);
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
    Os(t, s, e, o);
  } else s = fv(n, t, e, o, r);
  return gs(s);
}
tp = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = fo(t.pendingLanes);
        n !== 0 && (lu(t, n | 1), Ge(t, ye()), !(ee & 6) && (Dr = ye() + 500, En()));
      }
      break;
    case 13:
      Xn(function() {
        var r = Yt(e, 1);
        if (r !== null) {
          var o = Ve();
          kt(r, e, 1, o);
        }
      }), Hu(e, 1);
  }
};
au = function(e) {
  if (e.tag === 13) {
    var t = Yt(e, 134217728);
    if (t !== null) {
      var n = Ve();
      kt(t, e, 134217728, n);
    }
    Hu(e, 134217728);
  }
};
np = function(e) {
  if (e.tag === 13) {
    var t = yn(e), n = Yt(e, t);
    if (n !== null) {
      var r = Ve();
      kt(n, e, t, r);
    }
    Hu(e, t);
  }
};
rp = function() {
  return oe;
};
op = function(e, t) {
  var n = oe;
  try {
    return oe = e, t();
  } finally {
    oe = n;
  }
};
Zl = function(e, t, n) {
  switch (t) {
    case "input":
      if (Ul(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = Ts(r);
            if (!o) throw Error(b(90));
            Id(r), Ul(r, o);
          }
        }
      }
      break;
    case "textarea":
      Dd(e, n);
      break;
    case "select":
      t = n.value, t != null && kr(e, !!n.multiple, t, !1);
  }
};
Ud = Iu;
Wd = Xn;
var dv = { usingClientEntryPoint: !1, Events: [ei, hr, Ts, bd, Bd, Iu] }, ro = { findFiberByHostInstance: An, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, pv = { bundleType: ro.bundleType, version: ro.version, rendererPackageName: ro.rendererPackageName, rendererConfig: ro.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Qt.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = Kd(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: ro.findFiberByHostInstance || cv, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var _i = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!_i.isDisabled && _i.supportsFiber) try {
    js = _i.inject(pv), Mt = _i;
  } catch {
  }
}
nt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = dv;
nt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!bu(t)) throw Error(b(200));
  return uv(e, t, null, n);
};
nt.createRoot = function(e, t) {
  if (!bu(e)) throw Error(b(299));
  var n = !1, r = "", o = Ch;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = Fu(e, 1, !1, null, null, n, !1, r, o), e[Wt] = t.current, Ao(e.nodeType === 8 ? e.parentNode : e), new Vu(t);
};
nt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(b(188)) : (e = Object.keys(e).join(","), Error(b(268, e)));
  return e = Kd(t), e = e === null ? null : e.stateNode, e;
};
nt.flushSync = function(e) {
  return Xn(e);
};
nt.hydrate = function(e, t, n) {
  if (!Hs(t)) throw Error(b(200));
  return Vs(null, e, t, !0, n);
};
nt.hydrateRoot = function(e, t, n) {
  if (!bu(e)) throw Error(b(405));
  var r = n != null && n.hydratedSources || null, o = !1, i = "", s = Ch;
  if (n != null && (n.unstable_strictMode === !0 && (o = !0), n.identifierPrefix !== void 0 && (i = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = Nh(t, null, e, 1, n ?? null, o, !1, i, s), e[Wt] = t.current, Ao(e), r) for (e = 0; e < r.length; e++) n = r[e], o = n._getVersion, o = o(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(
    n,
    o
  );
  return new Fs(t);
};
nt.render = function(e, t, n) {
  if (!Hs(t)) throw Error(b(200));
  return Vs(null, e, t, !1, n);
};
nt.unmountComponentAtNode = function(e) {
  if (!Hs(e)) throw Error(b(40));
  return e._reactRootContainer ? (Xn(function() {
    Vs(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Wt] = null;
    });
  }), !0) : !1;
};
nt.unstable_batchedUpdates = Iu;
nt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Hs(n)) throw Error(b(200));
  if (e == null || e._reactInternals === void 0) throw Error(b(38));
  return Vs(e, t, n, !1, r);
};
nt.version = "18.3.1-next-f1338f8080-20240426";
function jh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(jh);
    } catch (e) {
      console.error(e);
    }
}
jh(), jd.exports = nt;
var hv = jd.exports, Ph, xf = hv;
Ph = xf.createRoot, xf.hydrateRoot;
function Te(e) {
  if (typeof e == "string" || typeof e == "number") return "" + e;
  let t = "";
  if (Array.isArray(e))
    for (let n = 0, r; n < e.length; n++)
      (r = Te(e[n])) !== "" && (t += (t && " ") + r);
  else
    for (let n in e)
      e[n] && (t += (t && " ") + n);
  return t;
}
var Mh = { exports: {} }, zh = {}, Th = { exports: {} }, $h = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Or = P;
function mv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var gv = typeof Object.is == "function" ? Object.is : mv, yv = Or.useState, vv = Or.useEffect, wv = Or.useLayoutEffect, xv = Or.useDebugValue;
function _v(e, t) {
  var n = t(), r = yv({ inst: { value: n, getSnapshot: t } }), o = r[0].inst, i = r[1];
  return wv(
    function() {
      o.value = n, o.getSnapshot = t, Nl(o) && i({ inst: o });
    },
    [e, n, t]
  ), vv(
    function() {
      return Nl(o) && i({ inst: o }), e(function() {
        Nl(o) && i({ inst: o });
      });
    },
    [e]
  ), xv(n), n;
}
function Nl(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !gv(e, n);
  } catch {
    return !0;
  }
}
function kv(e, t) {
  return t();
}
var Sv = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? kv : _v;
$h.useSyncExternalStore = Or.useSyncExternalStore !== void 0 ? Or.useSyncExternalStore : Sv;
Th.exports = $h;
var Ev = Th.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var bs = P, Nv = Ev;
function Cv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var jv = typeof Object.is == "function" ? Object.is : Cv, Pv = Nv.useSyncExternalStore, Mv = bs.useRef, zv = bs.useEffect, Tv = bs.useMemo, $v = bs.useDebugValue;
zh.useSyncExternalStoreWithSelector = function(e, t, n, r, o) {
  var i = Mv(null);
  if (i.current === null) {
    var s = { hasValue: !1, value: null };
    i.current = s;
  } else s = i.current;
  i = Tv(
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
        if (x = f, jv(c, p)) return x;
        var v = r(p);
        return o !== void 0 && o(x, v) ? (c = p, x) : (c = p, f = v);
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
  var l = Pv(e, i[0], i[1]);
  return zv(
    function() {
      s.hasValue = !0, s.value = l;
    },
    [l]
  ), $v(l), l;
};
Mh.exports = zh;
var Rv = Mh.exports;
const Rh = /* @__PURE__ */ Ka(Rv), Av = {}, _f = (e) => {
  let t;
  const n = /* @__PURE__ */ new Set(), r = (c, f) => {
    const d = typeof c == "function" ? c(t) : c;
    if (!Object.is(d, t)) {
      const p = t;
      t = f ?? (typeof d != "object" || d === null) ? d : Object.assign({}, t, d), n.forEach((x) => x(t, p));
    }
  }, o = () => t, a = { setState: r, getState: o, getInitialState: () => u, subscribe: (c) => (n.add(c), () => n.delete(c)), destroy: () => {
    (Av ? "production" : void 0) !== "production" && console.warn(
      "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
    ), n.clear();
  } }, u = t = e(r, o, a);
  return a;
}, Ah = (e) => e ? _f(e) : _f, { useDebugValue: Iv } = I, { useSyncExternalStoreWithSelector: Lv } = Rh, Dv = (e) => e;
function Ih(e, t = Dv, n) {
  const r = Lv(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return Iv(r), r;
}
const kf = (e, t) => {
  const n = Ah(e), r = (o, i = t) => Ih(n, o, i);
  return Object.assign(r, n), r;
}, Ov = (e, t) => e ? kf(e, t) : kf;
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
var Fv = { value: () => {
} };
function Bs() {
  for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
    if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
    n[r] = [];
  }
  return new Bi(n);
}
function Bi(e) {
  this._ = e;
}
function Hv(e, t) {
  return e.trim().split(/^|\s+/).map(function(n) {
    var r = "", o = n.indexOf(".");
    if (o >= 0 && (r = n.slice(o + 1), n = n.slice(0, o)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
    return { type: n, name: r };
  });
}
Bi.prototype = Bs.prototype = {
  constructor: Bi,
  on: function(e, t) {
    var n = this._, r = Hv(e + "", n), o, i = -1, s = r.length;
    if (arguments.length < 2) {
      for (; ++i < s; ) if ((o = (e = r[i]).type) && (o = Vv(n[o], e.name))) return o;
      return;
    }
    if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
    for (; ++i < s; )
      if (o = (e = r[i]).type) n[o] = Sf(n[o], e.name, t);
      else if (t == null) for (o in n) n[o] = Sf(n[o], e.name, null);
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
function Vv(e, t) {
  for (var n = 0, r = e.length, o; n < r; ++n)
    if ((o = e[n]).name === t)
      return o.value;
}
function Sf(e, t, n) {
  for (var r = 0, o = e.length; r < o; ++r)
    if (e[r].name === t) {
      e[r] = Fv, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
  return n != null && e.push({ name: t, value: n }), e;
}
var za = "http://www.w3.org/1999/xhtml";
const Ef = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: za,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function Us(e) {
  var t = e += "", n = t.indexOf(":");
  return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Ef.hasOwnProperty(t) ? { space: Ef[t], local: e } : e;
}
function bv(e) {
  return function() {
    var t = this.ownerDocument, n = this.namespaceURI;
    return n === za && t.documentElement.namespaceURI === za ? t.createElement(e) : t.createElementNS(n, e);
  };
}
function Bv(e) {
  return function() {
    return this.ownerDocument.createElementNS(e.space, e.local);
  };
}
function Lh(e) {
  var t = Us(e);
  return (t.local ? Bv : bv)(t);
}
function Uv() {
}
function Bu(e) {
  return e == null ? Uv : function() {
    return this.querySelector(e);
  };
}
function Wv(e) {
  typeof e != "function" && (e = Bu(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = new Array(s), a, u, c = 0; c < s; ++c)
      (a = i[c]) && (u = e.call(a, a.__data__, c, i)) && ("__data__" in a && (u.__data__ = a.__data__), l[c] = u);
  return new tt(r, this._parents);
}
function Yv(e) {
  return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
}
function Xv() {
  return [];
}
function Dh(e) {
  return e == null ? Xv : function() {
    return this.querySelectorAll(e);
  };
}
function Kv(e) {
  return function() {
    return Yv(e.apply(this, arguments));
  };
}
function Gv(e) {
  typeof e == "function" ? e = Kv(e) : e = Dh(e);
  for (var t = this._groups, n = t.length, r = [], o = [], i = 0; i < n; ++i)
    for (var s = t[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && (r.push(e.call(a, a.__data__, u, s)), o.push(a));
  return new tt(r, o);
}
function Oh(e) {
  return function() {
    return this.matches(e);
  };
}
function Fh(e) {
  return function(t) {
    return t.matches(e);
  };
}
var Qv = Array.prototype.find;
function Zv(e) {
  return function() {
    return Qv.call(this.children, e);
  };
}
function qv() {
  return this.firstElementChild;
}
function Jv(e) {
  return this.select(e == null ? qv : Zv(typeof e == "function" ? e : Fh(e)));
}
var ew = Array.prototype.filter;
function tw() {
  return Array.from(this.children);
}
function nw(e) {
  return function() {
    return ew.call(this.children, e);
  };
}
function rw(e) {
  return this.selectAll(e == null ? tw : nw(typeof e == "function" ? e : Fh(e)));
}
function ow(e) {
  typeof e != "function" && (e = Oh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new tt(r, this._parents);
}
function Hh(e) {
  return new Array(e.length);
}
function iw() {
  return new tt(this._enter || this._groups.map(Hh), this._parents);
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
function sw(e) {
  return function() {
    return e;
  };
}
function lw(e, t, n, r, o, i) {
  for (var s = 0, l, a = t.length, u = i.length; s < u; ++s)
    (l = t[s]) ? (l.__data__ = i[s], r[s] = l) : n[s] = new ys(e, i[s]);
  for (; s < a; ++s)
    (l = t[s]) && (o[s] = l);
}
function aw(e, t, n, r, o, i, s) {
  var l, a, u = /* @__PURE__ */ new Map(), c = t.length, f = i.length, d = new Array(c), p;
  for (l = 0; l < c; ++l)
    (a = t[l]) && (d[l] = p = s.call(a, a.__data__, l, t) + "", u.has(p) ? o[l] = a : u.set(p, a));
  for (l = 0; l < f; ++l)
    p = s.call(e, i[l], l, i) + "", (a = u.get(p)) ? (r[l] = a, a.__data__ = i[l], u.delete(p)) : n[l] = new ys(e, i[l]);
  for (l = 0; l < c; ++l)
    (a = t[l]) && u.get(d[l]) === a && (o[l] = a);
}
function uw(e) {
  return e.__data__;
}
function cw(e, t) {
  if (!arguments.length) return Array.from(this, uw);
  var n = t ? aw : lw, r = this._parents, o = this._groups;
  typeof e != "function" && (e = sw(e));
  for (var i = o.length, s = new Array(i), l = new Array(i), a = new Array(i), u = 0; u < i; ++u) {
    var c = r[u], f = o[u], d = f.length, p = fw(e.call(c, c && c.__data__, u, r)), x = p.length, v = l[u] = new Array(x), S = s[u] = new Array(x), h = a[u] = new Array(d);
    n(c, f, v, S, h, p, t);
    for (var m = 0, g = 0, w, N; m < x; ++m)
      if (w = v[m]) {
        for (m >= g && (g = m + 1); !(N = S[g]) && ++g < x; ) ;
        w._next = N || null;
      }
  }
  return s = new tt(s, r), s._enter = l, s._exit = a, s;
}
function fw(e) {
  return typeof e == "object" && "length" in e ? e : Array.from(e);
}
function dw() {
  return new tt(this._exit || this._groups.map(Hh), this._parents);
}
function pw(e, t, n) {
  var r = this.enter(), o = this, i = this.exit();
  return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (o = t(o), o && (o = o.selection())), n == null ? i.remove() : n(i), r && o ? r.merge(o).order() : o;
}
function hw(e) {
  for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, o = n.length, i = r.length, s = Math.min(o, i), l = new Array(o), a = 0; a < s; ++a)
    for (var u = n[a], c = r[a], f = u.length, d = l[a] = new Array(f), p, x = 0; x < f; ++x)
      (p = u[x] || c[x]) && (d[x] = p);
  for (; a < o; ++a)
    l[a] = n[a];
  return new tt(l, this._parents);
}
function mw() {
  for (var e = this._groups, t = -1, n = e.length; ++t < n; )
    for (var r = e[t], o = r.length - 1, i = r[o], s; --o >= 0; )
      (s = r[o]) && (i && s.compareDocumentPosition(i) ^ 4 && i.parentNode.insertBefore(s, i), i = s);
  return this;
}
function gw(e) {
  e || (e = yw);
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
function yw(e, t) {
  return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function vw() {
  var e = arguments[0];
  return arguments[0] = this, e.apply(null, arguments), this;
}
function ww() {
  return Array.from(this);
}
function xw() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length; o < i; ++o) {
      var s = r[o];
      if (s) return s;
    }
  return null;
}
function _w() {
  let e = 0;
  for (const t of this) ++e;
  return e;
}
function kw() {
  return !this.node();
}
function Sw(e) {
  for (var t = this._groups, n = 0, r = t.length; n < r; ++n)
    for (var o = t[n], i = 0, s = o.length, l; i < s; ++i)
      (l = o[i]) && e.call(l, l.__data__, i, o);
  return this;
}
function Ew(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function Nw(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function Cw(e, t) {
  return function() {
    this.setAttribute(e, t);
  };
}
function jw(e, t) {
  return function() {
    this.setAttributeNS(e.space, e.local, t);
  };
}
function Pw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
  };
}
function Mw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
  };
}
function zw(e, t) {
  var n = Us(e);
  if (arguments.length < 2) {
    var r = this.node();
    return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
  }
  return this.each((t == null ? n.local ? Nw : Ew : typeof t == "function" ? n.local ? Mw : Pw : n.local ? jw : Cw)(n, t));
}
function Vh(e) {
  return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
}
function Tw(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function $w(e, t, n) {
  return function() {
    this.style.setProperty(e, t, n);
  };
}
function Rw(e, t, n) {
  return function() {
    var r = t.apply(this, arguments);
    r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
  };
}
function Aw(e, t, n) {
  return arguments.length > 1 ? this.each((t == null ? Tw : typeof t == "function" ? Rw : $w)(e, t, n ?? "")) : Fr(this.node(), e);
}
function Fr(e, t) {
  return e.style.getPropertyValue(t) || Vh(e).getComputedStyle(e, null).getPropertyValue(t);
}
function Iw(e) {
  return function() {
    delete this[e];
  };
}
function Lw(e, t) {
  return function() {
    this[e] = t;
  };
}
function Dw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? delete this[e] : this[e] = n;
  };
}
function Ow(e, t) {
  return arguments.length > 1 ? this.each((t == null ? Iw : typeof t == "function" ? Dw : Lw)(e, t)) : this.node()[e];
}
function bh(e) {
  return e.trim().split(/^|\s+/);
}
function Uu(e) {
  return e.classList || new Bh(e);
}
function Bh(e) {
  this._node = e, this._names = bh(e.getAttribute("class") || "");
}
Bh.prototype = {
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
function Uh(e, t) {
  for (var n = Uu(e), r = -1, o = t.length; ++r < o; ) n.add(t[r]);
}
function Wh(e, t) {
  for (var n = Uu(e), r = -1, o = t.length; ++r < o; ) n.remove(t[r]);
}
function Fw(e) {
  return function() {
    Uh(this, e);
  };
}
function Hw(e) {
  return function() {
    Wh(this, e);
  };
}
function Vw(e, t) {
  return function() {
    (t.apply(this, arguments) ? Uh : Wh)(this, e);
  };
}
function bw(e, t) {
  var n = bh(e + "");
  if (arguments.length < 2) {
    for (var r = Uu(this.node()), o = -1, i = n.length; ++o < i; ) if (!r.contains(n[o])) return !1;
    return !0;
  }
  return this.each((typeof t == "function" ? Vw : t ? Fw : Hw)(n, t));
}
function Bw() {
  this.textContent = "";
}
function Uw(e) {
  return function() {
    this.textContent = e;
  };
}
function Ww(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.textContent = t ?? "";
  };
}
function Yw(e) {
  return arguments.length ? this.each(e == null ? Bw : (typeof e == "function" ? Ww : Uw)(e)) : this.node().textContent;
}
function Xw() {
  this.innerHTML = "";
}
function Kw(e) {
  return function() {
    this.innerHTML = e;
  };
}
function Gw(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.innerHTML = t ?? "";
  };
}
function Qw(e) {
  return arguments.length ? this.each(e == null ? Xw : (typeof e == "function" ? Gw : Kw)(e)) : this.node().innerHTML;
}
function Zw() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function qw() {
  return this.each(Zw);
}
function Jw() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function ex() {
  return this.each(Jw);
}
function tx(e) {
  var t = typeof e == "function" ? e : Lh(e);
  return this.select(function() {
    return this.appendChild(t.apply(this, arguments));
  });
}
function nx() {
  return null;
}
function rx(e, t) {
  var n = typeof e == "function" ? e : Lh(e), r = t == null ? nx : typeof t == "function" ? t : Bu(t);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
  });
}
function ox() {
  var e = this.parentNode;
  e && e.removeChild(this);
}
function ix() {
  return this.each(ox);
}
function sx() {
  var e = this.cloneNode(!1), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function lx() {
  var e = this.cloneNode(!0), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function ax(e) {
  return this.select(e ? lx : sx);
}
function ux(e) {
  return arguments.length ? this.property("__data__", e) : this.node().__data__;
}
function cx(e) {
  return function(t) {
    e.call(this, t, this.__data__);
  };
}
function fx(e) {
  return e.trim().split(/^|\s+/).map(function(t) {
    var n = "", r = t.indexOf(".");
    return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), { type: t, name: n };
  });
}
function dx(e) {
  return function() {
    var t = this.__on;
    if (t) {
      for (var n = 0, r = -1, o = t.length, i; n < o; ++n)
        i = t[n], (!e.type || i.type === e.type) && i.name === e.name ? this.removeEventListener(i.type, i.listener, i.options) : t[++r] = i;
      ++r ? t.length = r : delete this.__on;
    }
  };
}
function px(e, t, n) {
  return function() {
    var r = this.__on, o, i = cx(t);
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
function hx(e, t, n) {
  var r = fx(e + ""), o, i = r.length, s;
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
  for (l = t ? px : dx, o = 0; o < i; ++o) this.each(l(r[o], t, n));
  return this;
}
function Yh(e, t, n) {
  var r = Vh(e), o = r.CustomEvent;
  typeof o == "function" ? o = new o(t, n) : (o = r.document.createEvent("Event"), n ? (o.initEvent(t, n.bubbles, n.cancelable), o.detail = n.detail) : o.initEvent(t, !1, !1)), e.dispatchEvent(o);
}
function mx(e, t) {
  return function() {
    return Yh(this, e, t);
  };
}
function gx(e, t) {
  return function() {
    return Yh(this, e, t.apply(this, arguments));
  };
}
function yx(e, t) {
  return this.each((typeof t == "function" ? gx : mx)(e, t));
}
function* vx() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length, s; o < i; ++o)
      (s = r[o]) && (yield s);
}
var Xh = [null];
function tt(e, t) {
  this._groups = e, this._parents = t;
}
function ni() {
  return new tt([[document.documentElement]], Xh);
}
function wx() {
  return this;
}
tt.prototype = ni.prototype = {
  constructor: tt,
  select: Wv,
  selectAll: Gv,
  selectChild: Jv,
  selectChildren: rw,
  filter: ow,
  data: cw,
  enter: iw,
  exit: dw,
  join: pw,
  merge: hw,
  selection: wx,
  order: mw,
  sort: gw,
  call: vw,
  nodes: ww,
  node: xw,
  size: _w,
  empty: kw,
  each: Sw,
  attr: zw,
  style: Aw,
  property: Ow,
  classed: bw,
  text: Yw,
  html: Qw,
  raise: qw,
  lower: ex,
  append: tx,
  insert: rx,
  remove: ix,
  clone: ax,
  datum: ux,
  on: hx,
  dispatch: yx,
  [Symbol.iterator]: vx
};
function st(e) {
  return typeof e == "string" ? new tt([[document.querySelector(e)]], [document.documentElement]) : new tt([[e]], Xh);
}
function xx(e) {
  let t;
  for (; t = e.sourceEvent; ) e = t;
  return e;
}
function vt(e, t) {
  if (e = xx(e), t === void 0 && (t = e.currentTarget), t) {
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
const _x = { passive: !1 }, Bo = { capture: !0, passive: !1 };
function Cl(e) {
  e.stopImmediatePropagation();
}
function Pr(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function Kh(e) {
  var t = e.document.documentElement, n = st(e).on("dragstart.drag", Pr, Bo);
  "onselectstart" in t ? n.on("selectstart.drag", Pr, Bo) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
}
function Gh(e, t) {
  var n = e.document.documentElement, r = st(e).on("dragstart.drag", null);
  t && (r.on("click.drag", Pr, Bo), setTimeout(function() {
    r.on("click.drag", null);
  }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
}
const ki = (e) => () => e;
function Ta(e, {
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
Ta.prototype.on = function() {
  var e = this._.on.apply(this._, arguments);
  return e === this._ ? this : e;
};
function kx(e) {
  return !e.ctrlKey && !e.button;
}
function Sx() {
  return this.parentNode;
}
function Ex(e, t) {
  return t ?? { x: e.x, y: e.y };
}
function Nx() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function Cx() {
  var e = kx, t = Sx, n = Ex, r = Nx, o = {}, i = Bs("start", "drag", "end"), s = 0, l, a, u, c, f = 0;
  function d(w) {
    w.on("mousedown.drag", p).filter(r).on("touchstart.drag", S).on("touchmove.drag", h, _x).on("touchend.drag touchcancel.drag", m).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  function p(w, N) {
    if (!(c || !e.call(this, w, N))) {
      var M = g(this, t.call(this, w, N), w, N, "mouse");
      M && (st(w.view).on("mousemove.drag", x, Bo).on("mouseup.drag", v, Bo), Kh(w.view), Cl(w), u = !1, l = w.clientX, a = w.clientY, M("start", w));
    }
  }
  function x(w) {
    if (Pr(w), !u) {
      var N = w.clientX - l, M = w.clientY - a;
      u = N * N + M * M > f;
    }
    o.mouse("drag", w);
  }
  function v(w) {
    st(w.view).on("mousemove.drag mouseup.drag", null), Gh(w.view, u), Pr(w), o.mouse("end", w);
  }
  function S(w, N) {
    if (e.call(this, w, N)) {
      var M = w.changedTouches, z = t.call(this, w, N), T = M.length, k, R;
      for (k = 0; k < T; ++k)
        (R = g(this, z, w, N, M[k].identifier, M[k])) && (Cl(w), R("start", w, M[k]));
    }
  }
  function h(w) {
    var N = w.changedTouches, M = N.length, z, T;
    for (z = 0; z < M; ++z)
      (T = o[N[z].identifier]) && (Pr(w), T("drag", w, N[z]));
  }
  function m(w) {
    var N = w.changedTouches, M = N.length, z, T;
    for (c && clearTimeout(c), c = setTimeout(function() {
      c = null;
    }, 500), z = 0; z < M; ++z)
      (T = o[N[z].identifier]) && (Cl(w), T("end", w, N[z]));
  }
  function g(w, N, M, z, T, k) {
    var R = i.copy(), F = vt(k || M, N), D, V, _;
    if ((_ = n.call(w, new Ta("beforestart", {
      sourceEvent: M,
      target: d,
      identifier: T,
      active: s,
      x: F[0],
      y: F[1],
      dx: 0,
      dy: 0,
      dispatch: R
    }), z)) != null)
      return D = _.x - F[0] || 0, V = _.y - F[1] || 0, function C(j, L, $) {
        var E = F, A;
        switch (j) {
          case "start":
            o[T] = C, A = s++;
            break;
          case "end":
            delete o[T], --s;
          case "drag":
            F = vt($ || L, N), A = s;
            break;
        }
        R.call(
          j,
          w,
          new Ta(j, {
            sourceEvent: L,
            subject: _,
            target: d,
            identifier: T,
            active: A,
            x: F[0] + D,
            y: F[1] + V,
            dx: F[0] - E[0],
            dy: F[1] - E[1],
            dispatch: R
          }),
          z
        );
      };
  }
  return d.filter = function(w) {
    return arguments.length ? (e = typeof w == "function" ? w : ki(!!w), d) : e;
  }, d.container = function(w) {
    return arguments.length ? (t = typeof w == "function" ? w : ki(w), d) : t;
  }, d.subject = function(w) {
    return arguments.length ? (n = typeof w == "function" ? w : ki(w), d) : n;
  }, d.touchable = function(w) {
    return arguments.length ? (r = typeof w == "function" ? w : ki(!!w), d) : r;
  }, d.on = function() {
    var w = i.on.apply(i, arguments);
    return w === i ? d : w;
  }, d.clickDistance = function(w) {
    return arguments.length ? (f = (w = +w) * w, d) : Math.sqrt(f);
  }, d;
}
function Wu(e, t, n) {
  e.prototype = t.prototype = n, n.constructor = e;
}
function Qh(e, t) {
  var n = Object.create(e.prototype);
  for (var r in t) n[r] = t[r];
  return n;
}
function ri() {
}
var Uo = 0.7, vs = 1 / Uo, Mr = "\\s*([+-]?\\d+)\\s*", Wo = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", Tt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", jx = /^#([0-9a-f]{3,8})$/, Px = new RegExp(`^rgb\\(${Mr},${Mr},${Mr}\\)$`), Mx = new RegExp(`^rgb\\(${Tt},${Tt},${Tt}\\)$`), zx = new RegExp(`^rgba\\(${Mr},${Mr},${Mr},${Wo}\\)$`), Tx = new RegExp(`^rgba\\(${Tt},${Tt},${Tt},${Wo}\\)$`), $x = new RegExp(`^hsl\\(${Wo},${Tt},${Tt}\\)$`), Rx = new RegExp(`^hsla\\(${Wo},${Tt},${Tt},${Wo}\\)$`), Nf = {
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
Wu(ri, Yo, {
  copy(e) {
    return Object.assign(new this.constructor(), this, e);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: Cf,
  // Deprecated! Use color.formatHex.
  formatHex: Cf,
  formatHex8: Ax,
  formatHsl: Ix,
  formatRgb: jf,
  toString: jf
});
function Cf() {
  return this.rgb().formatHex();
}
function Ax() {
  return this.rgb().formatHex8();
}
function Ix() {
  return Zh(this).formatHsl();
}
function jf() {
  return this.rgb().formatRgb();
}
function Yo(e) {
  var t, n;
  return e = (e + "").trim().toLowerCase(), (t = jx.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Pf(t) : n === 3 ? new Ye(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? Si(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? Si(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Px.exec(e)) ? new Ye(t[1], t[2], t[3], 1) : (t = Mx.exec(e)) ? new Ye(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = zx.exec(e)) ? Si(t[1], t[2], t[3], t[4]) : (t = Tx.exec(e)) ? Si(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = $x.exec(e)) ? Tf(t[1], t[2] / 100, t[3] / 100, 1) : (t = Rx.exec(e)) ? Tf(t[1], t[2] / 100, t[3] / 100, t[4]) : Nf.hasOwnProperty(e) ? Pf(Nf[e]) : e === "transparent" ? new Ye(NaN, NaN, NaN, 0) : null;
}
function Pf(e) {
  return new Ye(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function Si(e, t, n, r) {
  return r <= 0 && (e = t = n = NaN), new Ye(e, t, n, r);
}
function Lx(e) {
  return e instanceof ri || (e = Yo(e)), e ? (e = e.rgb(), new Ye(e.r, e.g, e.b, e.opacity)) : new Ye();
}
function $a(e, t, n, r) {
  return arguments.length === 1 ? Lx(e) : new Ye(e, t, n, r ?? 1);
}
function Ye(e, t, n, r) {
  this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
Wu(Ye, $a, Qh(ri, {
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
    return new Ye(Vn(this.r), Vn(this.g), Vn(this.b), ws(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: Mf,
  // Deprecated! Use color.formatHex.
  formatHex: Mf,
  formatHex8: Dx,
  formatRgb: zf,
  toString: zf
}));
function Mf() {
  return `#${Dn(this.r)}${Dn(this.g)}${Dn(this.b)}`;
}
function Dx() {
  return `#${Dn(this.r)}${Dn(this.g)}${Dn(this.b)}${Dn((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function zf() {
  const e = ws(this.opacity);
  return `${e === 1 ? "rgb(" : "rgba("}${Vn(this.r)}, ${Vn(this.g)}, ${Vn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function ws(e) {
  return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function Vn(e) {
  return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function Dn(e) {
  return e = Vn(e), (e < 16 ? "0" : "") + e.toString(16);
}
function Tf(e, t, n, r) {
  return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new xt(e, t, n, r);
}
function Zh(e) {
  if (e instanceof xt) return new xt(e.h, e.s, e.l, e.opacity);
  if (e instanceof ri || (e = Yo(e)), !e) return new xt();
  if (e instanceof xt) return e;
  e = e.rgb();
  var t = e.r / 255, n = e.g / 255, r = e.b / 255, o = Math.min(t, n, r), i = Math.max(t, n, r), s = NaN, l = i - o, a = (i + o) / 2;
  return l ? (t === i ? s = (n - r) / l + (n < r) * 6 : n === i ? s = (r - t) / l + 2 : s = (t - n) / l + 4, l /= a < 0.5 ? i + o : 2 - i - o, s *= 60) : l = a > 0 && a < 1 ? 0 : s, new xt(s, l, a, e.opacity);
}
function Ox(e, t, n, r) {
  return arguments.length === 1 ? Zh(e) : new xt(e, t, n, r ?? 1);
}
function xt(e, t, n, r) {
  this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
Wu(xt, Ox, Qh(ri, {
  brighter(e) {
    return e = e == null ? vs : Math.pow(vs, e), new xt(this.h, this.s, this.l * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? Uo : Math.pow(Uo, e), new xt(this.h, this.s, this.l * e, this.opacity);
  },
  rgb() {
    var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, o = 2 * n - r;
    return new Ye(
      jl(e >= 240 ? e - 240 : e + 120, o, r),
      jl(e, o, r),
      jl(e < 120 ? e + 240 : e - 120, o, r),
      this.opacity
    );
  },
  clamp() {
    return new xt($f(this.h), Ei(this.s), Ei(this.l), ws(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const e = ws(this.opacity);
    return `${e === 1 ? "hsl(" : "hsla("}${$f(this.h)}, ${Ei(this.s) * 100}%, ${Ei(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
  }
}));
function $f(e) {
  return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function Ei(e) {
  return Math.max(0, Math.min(1, e || 0));
}
function jl(e, t, n) {
  return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
const qh = (e) => () => e;
function Fx(e, t) {
  return function(n) {
    return e + n * t;
  };
}
function Hx(e, t, n) {
  return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
    return Math.pow(e + r * t, n);
  };
}
function Vx(e) {
  return (e = +e) == 1 ? Jh : function(t, n) {
    return n - t ? Hx(t, n, e) : qh(isNaN(t) ? n : t);
  };
}
function Jh(e, t) {
  var n = t - e;
  return n ? Fx(e, n) : qh(isNaN(e) ? t : e);
}
const Rf = function e(t) {
  var n = Vx(t);
  function r(o, i) {
    var s = n((o = $a(o)).r, (i = $a(i)).r), l = n(o.g, i.g), a = n(o.b, i.b), u = Jh(o.opacity, i.opacity);
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
var Ra = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Pl = new RegExp(Ra.source, "g");
function bx(e) {
  return function() {
    return e;
  };
}
function Bx(e) {
  return function(t) {
    return e(t) + "";
  };
}
function Ux(e, t) {
  var n = Ra.lastIndex = Pl.lastIndex = 0, r, o, i, s = -1, l = [], a = [];
  for (e = e + "", t = t + ""; (r = Ra.exec(e)) && (o = Pl.exec(t)); )
    (i = o.index) > n && (i = t.slice(n, i), l[s] ? l[s] += i : l[++s] = i), (r = r[0]) === (o = o[0]) ? l[s] ? l[s] += o : l[++s] = o : (l[++s] = null, a.push({ i: s, x: nn(r, o) })), n = Pl.lastIndex;
  return n < t.length && (i = t.slice(n), l[s] ? l[s] += i : l[++s] = i), l.length < 2 ? a[0] ? Bx(a[0].x) : bx(t) : (t = a.length, function(u) {
    for (var c = 0, f; c < t; ++c) l[(f = a[c]).i] = f.x(u);
    return l.join("");
  });
}
var Af = 180 / Math.PI, Aa = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function em(e, t, n, r, o, i) {
  var s, l, a;
  return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (a = e * n + t * r) && (n -= e * a, r -= t * a), (l = Math.sqrt(n * n + r * r)) && (n /= l, r /= l, a /= l), e * r < t * n && (e = -e, t = -t, a = -a, s = -s), {
    translateX: o,
    translateY: i,
    rotate: Math.atan2(t, e) * Af,
    skewX: Math.atan(a) * Af,
    scaleX: s,
    scaleY: l
  };
}
var Ni;
function Wx(e) {
  const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
  return t.isIdentity ? Aa : em(t.a, t.b, t.c, t.d, t.e, t.f);
}
function Yx(e) {
  return e == null || (Ni || (Ni = document.createElementNS("http://www.w3.org/2000/svg", "g")), Ni.setAttribute("transform", e), !(e = Ni.transform.baseVal.consolidate())) ? Aa : (e = e.matrix, em(e.a, e.b, e.c, e.d, e.e, e.f));
}
function tm(e, t, n, r) {
  function o(u) {
    return u.length ? u.pop() + " " : "";
  }
  function i(u, c, f, d, p, x) {
    if (u !== f || c !== d) {
      var v = p.push("translate(", null, t, null, n);
      x.push({ i: v - 4, x: nn(u, f) }, { i: v - 2, x: nn(c, d) });
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
      var v = p.push(o(p) + "scale(", null, ",", null, ")");
      x.push({ i: v - 4, x: nn(u, f) }, { i: v - 2, x: nn(c, d) });
    } else (f !== 1 || d !== 1) && p.push(o(p) + "scale(" + f + "," + d + ")");
  }
  return function(u, c) {
    var f = [], d = [];
    return u = e(u), c = e(c), i(u.translateX, u.translateY, c.translateX, c.translateY, f, d), s(u.rotate, c.rotate, f, d), l(u.skewX, c.skewX, f, d), a(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, d), u = c = null, function(p) {
      for (var x = -1, v = d.length, S; ++x < v; ) f[(S = d[x]).i] = S.x(p);
      return f.join("");
    };
  };
}
var Xx = tm(Wx, "px, ", "px)", "deg)"), Kx = tm(Yx, ", ", ")", ")"), Gx = 1e-12;
function If(e) {
  return ((e = Math.exp(e)) + 1 / e) / 2;
}
function Qx(e) {
  return ((e = Math.exp(e)) - 1 / e) / 2;
}
function Zx(e) {
  return ((e = Math.exp(2 * e)) - 1) / (e + 1);
}
const qx = function e(t, n, r) {
  function o(i, s) {
    var l = i[0], a = i[1], u = i[2], c = s[0], f = s[1], d = s[2], p = c - l, x = f - a, v = p * p + x * x, S, h;
    if (v < Gx)
      h = Math.log(d / u) / t, S = function(z) {
        return [
          l + z * p,
          a + z * x,
          u * Math.exp(t * z * h)
        ];
      };
    else {
      var m = Math.sqrt(v), g = (d * d - u * u + r * v) / (2 * u * n * m), w = (d * d - u * u - r * v) / (2 * d * n * m), N = Math.log(Math.sqrt(g * g + 1) - g), M = Math.log(Math.sqrt(w * w + 1) - w);
      h = (M - N) / t, S = function(z) {
        var T = z * h, k = If(N), R = u / (n * m) * (k * Zx(t * T + N) - Qx(N));
        return [
          l + R * p,
          a + R * x,
          u * k / If(t * T + N)
        ];
      };
    }
    return S.duration = h * 1e3 * t / Math.SQRT2, S;
  }
  return o.rho = function(i) {
    var s = Math.max(1e-3, +i), l = s * s, a = l * l;
    return e(s, l, a);
  }, o;
}(Math.SQRT2, 2, 4);
var Hr = 0, ho = 0, oo = 0, nm = 1e3, xs, mo, _s = 0, Kn = 0, Ws = 0, Xo = typeof performance == "object" && performance.now ? performance : Date, rm = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
  setTimeout(e, 17);
};
function Yu() {
  return Kn || (rm(Jx), Kn = Xo.now() + Ws);
}
function Jx() {
  Kn = 0;
}
function ks() {
  this._call = this._time = this._next = null;
}
ks.prototype = om.prototype = {
  constructor: ks,
  restart: function(e, t, n) {
    if (typeof e != "function") throw new TypeError("callback is not a function");
    n = (n == null ? Yu() : +n) + (t == null ? 0 : +t), !this._next && mo !== this && (mo ? mo._next = this : xs = this, mo = this), this._call = e, this._time = n, Ia();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, Ia());
  }
};
function om(e, t, n) {
  var r = new ks();
  return r.restart(e, t, n), r;
}
function e1() {
  Yu(), ++Hr;
  for (var e = xs, t; e; )
    (t = Kn - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
  --Hr;
}
function Lf() {
  Kn = (_s = Xo.now()) + Ws, Hr = ho = 0;
  try {
    e1();
  } finally {
    Hr = 0, n1(), Kn = 0;
  }
}
function t1() {
  var e = Xo.now(), t = e - _s;
  t > nm && (Ws -= t, _s = e);
}
function n1() {
  for (var e, t = xs, n, r = 1 / 0; t; )
    t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : xs = n);
  mo = e, Ia(r);
}
function Ia(e) {
  if (!Hr) {
    ho && (ho = clearTimeout(ho));
    var t = e - Kn;
    t > 24 ? (e < 1 / 0 && (ho = setTimeout(Lf, e - Xo.now() - Ws)), oo && (oo = clearInterval(oo))) : (oo || (_s = Xo.now(), oo = setInterval(t1, nm)), Hr = 1, rm(Lf));
  }
}
function Df(e, t, n) {
  var r = new ks();
  return t = t == null ? 0 : +t, r.restart((o) => {
    r.stop(), e(o + t);
  }, t, n), r;
}
var r1 = Bs("start", "end", "cancel", "interrupt"), o1 = [], im = 0, Of = 1, La = 2, Ui = 3, Ff = 4, Da = 5, Wi = 6;
function Ys(e, t, n, r, o, i) {
  var s = e.__transition;
  if (!s) e.__transition = {};
  else if (n in s) return;
  i1(e, n, {
    name: t,
    index: r,
    // For context during callback.
    group: o,
    // For context during callback.
    on: r1,
    tween: o1,
    time: i.time,
    delay: i.delay,
    duration: i.duration,
    ease: i.ease,
    timer: null,
    state: im
  });
}
function Xu(e, t) {
  var n = Et(e, t);
  if (n.state > im) throw new Error("too late; already scheduled");
  return n;
}
function $t(e, t) {
  var n = Et(e, t);
  if (n.state > Ui) throw new Error("too late; already running");
  return n;
}
function Et(e, t) {
  var n = e.__transition;
  if (!n || !(n = n[t])) throw new Error("transition not found");
  return n;
}
function i1(e, t, n) {
  var r = e.__transition, o;
  r[t] = n, n.timer = om(i, 0, n.time);
  function i(u) {
    n.state = Of, n.timer.restart(s, n.delay, n.time), n.delay <= u && s(u - n.delay);
  }
  function s(u) {
    var c, f, d, p;
    if (n.state !== Of) return a();
    for (c in r)
      if (p = r[c], p.name === n.name) {
        if (p.state === Ui) return Df(s);
        p.state === Ff ? (p.state = Wi, p.timer.stop(), p.on.call("interrupt", e, e.__data__, p.index, p.group), delete r[c]) : +c < t && (p.state = Wi, p.timer.stop(), p.on.call("cancel", e, e.__data__, p.index, p.group), delete r[c]);
      }
    if (Df(function() {
      n.state === Ui && (n.state = Ff, n.timer.restart(l, n.delay, n.time), l(u));
    }), n.state = La, n.on.call("start", e, e.__data__, n.index, n.group), n.state === La) {
      for (n.state = Ui, o = new Array(d = n.tween.length), c = 0, f = -1; c < d; ++c)
        (p = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (o[++f] = p);
      o.length = f + 1;
    }
  }
  function l(u) {
    for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(a), n.state = Da, 1), f = -1, d = o.length; ++f < d; )
      o[f].call(e, c);
    n.state === Da && (n.on.call("end", e, e.__data__, n.index, n.group), a());
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
      o = r.state > La && r.state < Da, r.state = Wi, r.timer.stop(), r.on.call(o ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[s];
    }
    i && delete e.__transition;
  }
}
function s1(e) {
  return this.each(function() {
    Yi(this, e);
  });
}
function l1(e, t) {
  var n, r;
  return function() {
    var o = $t(this, e), i = o.tween;
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
function a1(e, t, n) {
  var r, o;
  if (typeof n != "function") throw new Error();
  return function() {
    var i = $t(this, e), s = i.tween;
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
function u1(e, t) {
  var n = this._id;
  if (e += "", arguments.length < 2) {
    for (var r = Et(this.node(), n).tween, o = 0, i = r.length, s; o < i; ++o)
      if ((s = r[o]).name === e)
        return s.value;
    return null;
  }
  return this.each((t == null ? l1 : a1)(n, e, t));
}
function Ku(e, t, n) {
  var r = e._id;
  return e.each(function() {
    var o = $t(this, r);
    (o.value || (o.value = {}))[t] = n.apply(this, arguments);
  }), function(o) {
    return Et(o, r).value[t];
  };
}
function sm(e, t) {
  var n;
  return (typeof t == "number" ? nn : t instanceof Yo ? Rf : (n = Yo(t)) ? (t = n, Rf) : Ux)(e, t);
}
function c1(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function f1(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function d1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttribute(e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function p1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttributeNS(e.space, e.local);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function h1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function m1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function g1(e, t) {
  var n = Us(e), r = n === "transform" ? Kx : sm;
  return this.attrTween(e, typeof t == "function" ? (n.local ? m1 : h1)(n, r, Ku(this, "attr." + e, t)) : t == null ? (n.local ? f1 : c1)(n) : (n.local ? p1 : d1)(n, r, t));
}
function y1(e, t) {
  return function(n) {
    this.setAttribute(e, t.call(this, n));
  };
}
function v1(e, t) {
  return function(n) {
    this.setAttributeNS(e.space, e.local, t.call(this, n));
  };
}
function w1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && v1(e, i)), n;
  }
  return o._value = t, o;
}
function x1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && y1(e, i)), n;
  }
  return o._value = t, o;
}
function _1(e, t) {
  var n = "attr." + e;
  if (arguments.length < 2) return (n = this.tween(n)) && n._value;
  if (t == null) return this.tween(n, null);
  if (typeof t != "function") throw new Error();
  var r = Us(e);
  return this.tween(n, (r.local ? w1 : x1)(r, t));
}
function k1(e, t) {
  return function() {
    Xu(this, e).delay = +t.apply(this, arguments);
  };
}
function S1(e, t) {
  return t = +t, function() {
    Xu(this, e).delay = t;
  };
}
function E1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? k1 : S1)(t, e)) : Et(this.node(), t).delay;
}
function N1(e, t) {
  return function() {
    $t(this, e).duration = +t.apply(this, arguments);
  };
}
function C1(e, t) {
  return t = +t, function() {
    $t(this, e).duration = t;
  };
}
function j1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? N1 : C1)(t, e)) : Et(this.node(), t).duration;
}
function P1(e, t) {
  if (typeof t != "function") throw new Error();
  return function() {
    $t(this, e).ease = t;
  };
}
function M1(e) {
  var t = this._id;
  return arguments.length ? this.each(P1(t, e)) : Et(this.node(), t).ease;
}
function z1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    if (typeof n != "function") throw new Error();
    $t(this, e).ease = n;
  };
}
function T1(e) {
  if (typeof e != "function") throw new Error();
  return this.each(z1(this._id, e));
}
function $1(e) {
  typeof e != "function" && (e = Oh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new Kt(r, this._parents, this._name, this._id);
}
function R1(e) {
  if (e._id !== this._id) throw new Error();
  for (var t = this._groups, n = e._groups, r = t.length, o = n.length, i = Math.min(r, o), s = new Array(r), l = 0; l < i; ++l)
    for (var a = t[l], u = n[l], c = a.length, f = s[l] = new Array(c), d, p = 0; p < c; ++p)
      (d = a[p] || u[p]) && (f[p] = d);
  for (; l < r; ++l)
    s[l] = t[l];
  return new Kt(s, this._parents, this._name, this._id);
}
function A1(e) {
  return (e + "").trim().split(/^|\s+/).every(function(t) {
    var n = t.indexOf(".");
    return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
  });
}
function I1(e, t, n) {
  var r, o, i = A1(t) ? Xu : $t;
  return function() {
    var s = i(this, e), l = s.on;
    l !== r && (o = (r = l).copy()).on(t, n), s.on = o;
  };
}
function L1(e, t) {
  var n = this._id;
  return arguments.length < 2 ? Et(this.node(), n).on.on(e) : this.each(I1(n, e, t));
}
function D1(e) {
  return function() {
    var t = this.parentNode;
    for (var n in this.__transition) if (+n !== e) return;
    t && t.removeChild(this);
  };
}
function O1() {
  return this.on("end.remove", D1(this._id));
}
function F1(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = Bu(e));
  for (var r = this._groups, o = r.length, i = new Array(o), s = 0; s < o; ++s)
    for (var l = r[s], a = l.length, u = i[s] = new Array(a), c, f, d = 0; d < a; ++d)
      (c = l[d]) && (f = e.call(c, c.__data__, d, l)) && ("__data__" in c && (f.__data__ = c.__data__), u[d] = f, Ys(u[d], t, n, d, u, Et(c, n)));
  return new Kt(i, this._parents, t, n);
}
function H1(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = Dh(e));
  for (var r = this._groups, o = r.length, i = [], s = [], l = 0; l < o; ++l)
    for (var a = r[l], u = a.length, c, f = 0; f < u; ++f)
      if (c = a[f]) {
        for (var d = e.call(c, c.__data__, f, a), p, x = Et(c, n), v = 0, S = d.length; v < S; ++v)
          (p = d[v]) && Ys(p, t, n, v, d, x);
        i.push(d), s.push(c);
      }
  return new Kt(i, s, t, n);
}
var V1 = ni.prototype.constructor;
function b1() {
  return new V1(this._groups, this._parents);
}
function B1(e, t) {
  var n, r, o;
  return function() {
    var i = Fr(this, e), s = (this.style.removeProperty(e), Fr(this, e));
    return i === s ? null : i === n && s === r ? o : o = t(n = i, r = s);
  };
}
function lm(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function U1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = Fr(this, e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function W1(e, t, n) {
  var r, o, i;
  return function() {
    var s = Fr(this, e), l = n(this), a = l + "";
    return l == null && (a = l = (this.style.removeProperty(e), Fr(this, e))), s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l));
  };
}
function Y1(e, t) {
  var n, r, o, i = "style." + t, s = "end." + i, l;
  return function() {
    var a = $t(this, e), u = a.on, c = a.value[i] == null ? l || (l = lm(t)) : void 0;
    (u !== n || o !== c) && (r = (n = u).copy()).on(s, o = c), a.on = r;
  };
}
function X1(e, t, n) {
  var r = (e += "") == "transform" ? Xx : sm;
  return t == null ? this.styleTween(e, B1(e, r)).on("end.style." + e, lm(e)) : typeof t == "function" ? this.styleTween(e, W1(e, r, Ku(this, "style." + e, t))).each(Y1(this._id, e)) : this.styleTween(e, U1(e, r, t), n).on("end.style." + e, null);
}
function K1(e, t, n) {
  return function(r) {
    this.style.setProperty(e, t.call(this, r), n);
  };
}
function G1(e, t, n) {
  var r, o;
  function i() {
    var s = t.apply(this, arguments);
    return s !== o && (r = (o = s) && K1(e, s, n)), r;
  }
  return i._value = t, i;
}
function Q1(e, t, n) {
  var r = "style." + (e += "");
  if (arguments.length < 2) return (r = this.tween(r)) && r._value;
  if (t == null) return this.tween(r, null);
  if (typeof t != "function") throw new Error();
  return this.tween(r, G1(e, t, n ?? ""));
}
function Z1(e) {
  return function() {
    this.textContent = e;
  };
}
function q1(e) {
  return function() {
    var t = e(this);
    this.textContent = t ?? "";
  };
}
function J1(e) {
  return this.tween("text", typeof e == "function" ? q1(Ku(this, "text", e)) : Z1(e == null ? "" : e + ""));
}
function e_(e) {
  return function(t) {
    this.textContent = e.call(this, t);
  };
}
function t_(e) {
  var t, n;
  function r() {
    var o = e.apply(this, arguments);
    return o !== n && (t = (n = o) && e_(o)), t;
  }
  return r._value = e, r;
}
function n_(e) {
  var t = "text";
  if (arguments.length < 1) return (t = this.tween(t)) && t._value;
  if (e == null) return this.tween(t, null);
  if (typeof e != "function") throw new Error();
  return this.tween(t, t_(e));
}
function r_() {
  for (var e = this._name, t = this._id, n = am(), r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      if (a = s[u]) {
        var c = Et(a, t);
        Ys(a, e, n, u, s, {
          time: c.time + c.delay + c.duration,
          delay: 0,
          duration: c.duration,
          ease: c.ease
        });
      }
  return new Kt(r, this._parents, e, n);
}
function o_() {
  var e, t, n = this, r = n._id, o = n.size();
  return new Promise(function(i, s) {
    var l = { value: s }, a = { value: function() {
      --o === 0 && i();
    } };
    n.each(function() {
      var u = $t(this, r), c = u.on;
      c !== e && (t = (e = c).copy(), t._.cancel.push(l), t._.interrupt.push(l), t._.end.push(a)), u.on = t;
    }), o === 0 && i();
  });
}
var i_ = 0;
function Kt(e, t, n, r) {
  this._groups = e, this._parents = t, this._name = n, this._id = r;
}
function am() {
  return ++i_;
}
var Lt = ni.prototype;
Kt.prototype = {
  constructor: Kt,
  select: F1,
  selectAll: H1,
  selectChild: Lt.selectChild,
  selectChildren: Lt.selectChildren,
  filter: $1,
  merge: R1,
  selection: b1,
  transition: r_,
  call: Lt.call,
  nodes: Lt.nodes,
  node: Lt.node,
  size: Lt.size,
  empty: Lt.empty,
  each: Lt.each,
  on: L1,
  attr: g1,
  attrTween: _1,
  style: X1,
  styleTween: Q1,
  text: J1,
  textTween: n_,
  remove: O1,
  tween: u1,
  delay: E1,
  duration: j1,
  ease: M1,
  easeVarying: T1,
  end: o_,
  [Symbol.iterator]: Lt[Symbol.iterator]
};
function s_(e) {
  return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
}
var l_ = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: s_
};
function a_(e, t) {
  for (var n; !(n = e.__transition) || !(n = n[t]); )
    if (!(e = e.parentNode))
      throw new Error(`transition ${t} not found`);
  return n;
}
function u_(e) {
  var t, n;
  e instanceof Kt ? (t = e._id, e = e._name) : (t = am(), (n = l_).time = Yu(), e = e == null ? null : e + "");
  for (var r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && Ys(a, e, t, u, s, n || a_(a, t));
  return new Kt(r, this._parents, e, t);
}
ni.prototype.interrupt = s1;
ni.prototype.transition = u_;
const Ci = (e) => () => e;
function c_(e, {
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
function Vt(e, t, n) {
  this.k = e, this.x = t, this.y = n;
}
Vt.prototype = {
  constructor: Vt,
  scale: function(e) {
    return e === 1 ? this : new Vt(this.k * e, this.x, this.y);
  },
  translate: function(e, t) {
    return e === 0 & t === 0 ? this : new Vt(this.k, this.x + this.k * e, this.y + this.k * t);
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
var Bt = new Vt(1, 0, 0);
Vt.prototype;
function Ml(e) {
  e.stopImmediatePropagation();
}
function io(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function f_(e) {
  return (!e.ctrlKey || e.type === "wheel") && !e.button;
}
function d_() {
  var e = this;
  return e instanceof SVGElement ? (e = e.ownerSVGElement || e, e.hasAttribute("viewBox") ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]]) : [[0, 0], [e.clientWidth, e.clientHeight]];
}
function Hf() {
  return this.__zoom || Bt;
}
function p_(e) {
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * (e.ctrlKey ? 10 : 1);
}
function h_() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function m_(e, t, n) {
  var r = e.invertX(t[0][0]) - n[0][0], o = e.invertX(t[1][0]) - n[1][0], i = e.invertY(t[0][1]) - n[0][1], s = e.invertY(t[1][1]) - n[1][1];
  return e.translate(
    o > r ? (r + o) / 2 : Math.min(0, r) || Math.max(0, o),
    s > i ? (i + s) / 2 : Math.min(0, i) || Math.max(0, s)
  );
}
function um() {
  var e = f_, t = d_, n = m_, r = p_, o = h_, i = [0, 1 / 0], s = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]], l = 250, a = qx, u = Bs("start", "zoom", "end"), c, f, d, p = 500, x = 150, v = 0, S = 10;
  function h(_) {
    _.property("__zoom", Hf).on("wheel.zoom", T, { passive: !1 }).on("mousedown.zoom", k).on("dblclick.zoom", R).filter(o).on("touchstart.zoom", F).on("touchmove.zoom", D).on("touchend.zoom touchcancel.zoom", V).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  h.transform = function(_, C, j, L) {
    var $ = _.selection ? _.selection() : _;
    $.property("__zoom", Hf), _ !== $ ? N(_, C, j, L) : $.interrupt().each(function() {
      M(this, arguments).event(L).start().zoom(null, typeof C == "function" ? C.apply(this, arguments) : C).end();
    });
  }, h.scaleBy = function(_, C, j, L) {
    h.scaleTo(_, function() {
      var $ = this.__zoom.k, E = typeof C == "function" ? C.apply(this, arguments) : C;
      return $ * E;
    }, j, L);
  }, h.scaleTo = function(_, C, j, L) {
    h.transform(_, function() {
      var $ = t.apply(this, arguments), E = this.__zoom, A = j == null ? w($) : typeof j == "function" ? j.apply(this, arguments) : j, O = E.invert(A), H = typeof C == "function" ? C.apply(this, arguments) : C;
      return n(g(m(E, H), A, O), $, s);
    }, j, L);
  }, h.translateBy = function(_, C, j, L) {
    h.transform(_, function() {
      return n(this.__zoom.translate(
        typeof C == "function" ? C.apply(this, arguments) : C,
        typeof j == "function" ? j.apply(this, arguments) : j
      ), t.apply(this, arguments), s);
    }, null, L);
  }, h.translateTo = function(_, C, j, L, $) {
    h.transform(_, function() {
      var E = t.apply(this, arguments), A = this.__zoom, O = L == null ? w(E) : typeof L == "function" ? L.apply(this, arguments) : L;
      return n(Bt.translate(O[0], O[1]).scale(A.k).translate(
        typeof C == "function" ? -C.apply(this, arguments) : -C,
        typeof j == "function" ? -j.apply(this, arguments) : -j
      ), E, s);
    }, L, $);
  };
  function m(_, C) {
    return C = Math.max(i[0], Math.min(i[1], C)), C === _.k ? _ : new Vt(C, _.x, _.y);
  }
  function g(_, C, j) {
    var L = C[0] - j[0] * _.k, $ = C[1] - j[1] * _.k;
    return L === _.x && $ === _.y ? _ : new Vt(_.k, L, $);
  }
  function w(_) {
    return [(+_[0][0] + +_[1][0]) / 2, (+_[0][1] + +_[1][1]) / 2];
  }
  function N(_, C, j, L) {
    _.on("start.zoom", function() {
      M(this, arguments).event(L).start();
    }).on("interrupt.zoom end.zoom", function() {
      M(this, arguments).event(L).end();
    }).tween("zoom", function() {
      var $ = this, E = arguments, A = M($, E).event(L), O = t.apply($, E), H = j == null ? w(O) : typeof j == "function" ? j.apply($, E) : j, U = Math.max(O[1][0] - O[0][0], O[1][1] - O[0][1]), B = $.__zoom, X = typeof C == "function" ? C.apply($, E) : C, Q = a(B.invert(H).concat(U / B.k), X.invert(H).concat(U / X.k));
      return function(Z) {
        if (Z === 1) Z = X;
        else {
          var re = Q(Z), ne = U / re[2];
          Z = new Vt(ne, H[0] - re[0] * ne, H[1] - re[1] * ne);
        }
        A.zoom(null, Z);
      };
    });
  }
  function M(_, C, j) {
    return !j && _.__zooming || new z(_, C);
  }
  function z(_, C) {
    this.that = _, this.args = C, this.active = 0, this.sourceEvent = null, this.extent = t.apply(_, C), this.taps = 0;
  }
  z.prototype = {
    event: function(_) {
      return _ && (this.sourceEvent = _), this;
    },
    start: function() {
      return ++this.active === 1 && (this.that.__zooming = this, this.emit("start")), this;
    },
    zoom: function(_, C) {
      return this.mouse && _ !== "mouse" && (this.mouse[1] = C.invert(this.mouse[0])), this.touch0 && _ !== "touch" && (this.touch0[1] = C.invert(this.touch0[0])), this.touch1 && _ !== "touch" && (this.touch1[1] = C.invert(this.touch1[0])), this.that.__zoom = C, this.emit("zoom"), this;
    },
    end: function() {
      return --this.active === 0 && (delete this.that.__zooming, this.emit("end")), this;
    },
    emit: function(_) {
      var C = st(this.that).datum();
      u.call(
        _,
        this.that,
        new c_(_, {
          sourceEvent: this.sourceEvent,
          target: h,
          transform: this.that.__zoom,
          dispatch: u
        }),
        C
      );
    }
  };
  function T(_, ...C) {
    if (!e.apply(this, arguments)) return;
    var j = M(this, C).event(_), L = this.__zoom, $ = Math.max(i[0], Math.min(i[1], L.k * Math.pow(2, r.apply(this, arguments)))), E = vt(_);
    if (j.wheel)
      (j.mouse[0][0] !== E[0] || j.mouse[0][1] !== E[1]) && (j.mouse[1] = L.invert(j.mouse[0] = E)), clearTimeout(j.wheel);
    else {
      if (L.k === $) return;
      j.mouse = [E, L.invert(E)], Yi(this), j.start();
    }
    io(_), j.wheel = setTimeout(A, x), j.zoom("mouse", n(g(m(L, $), j.mouse[0], j.mouse[1]), j.extent, s));
    function A() {
      j.wheel = null, j.end();
    }
  }
  function k(_, ...C) {
    if (d || !e.apply(this, arguments)) return;
    var j = _.currentTarget, L = M(this, C, !0).event(_), $ = st(_.view).on("mousemove.zoom", H, !0).on("mouseup.zoom", U, !0), E = vt(_, j), A = _.clientX, O = _.clientY;
    Kh(_.view), Ml(_), L.mouse = [E, this.__zoom.invert(E)], Yi(this), L.start();
    function H(B) {
      if (io(B), !L.moved) {
        var X = B.clientX - A, Q = B.clientY - O;
        L.moved = X * X + Q * Q > v;
      }
      L.event(B).zoom("mouse", n(g(L.that.__zoom, L.mouse[0] = vt(B, j), L.mouse[1]), L.extent, s));
    }
    function U(B) {
      $.on("mousemove.zoom mouseup.zoom", null), Gh(B.view, L.moved), io(B), L.event(B).end();
    }
  }
  function R(_, ...C) {
    if (e.apply(this, arguments)) {
      var j = this.__zoom, L = vt(_.changedTouches ? _.changedTouches[0] : _, this), $ = j.invert(L), E = j.k * (_.shiftKey ? 0.5 : 2), A = n(g(m(j, E), L, $), t.apply(this, C), s);
      io(_), l > 0 ? st(this).transition().duration(l).call(N, A, L, _) : st(this).call(h.transform, A, L, _);
    }
  }
  function F(_, ...C) {
    if (e.apply(this, arguments)) {
      var j = _.touches, L = j.length, $ = M(this, C, _.changedTouches.length === L).event(_), E, A, O, H;
      for (Ml(_), A = 0; A < L; ++A)
        O = j[A], H = vt(O, this), H = [H, this.__zoom.invert(H), O.identifier], $.touch0 ? !$.touch1 && $.touch0[2] !== H[2] && ($.touch1 = H, $.taps = 0) : ($.touch0 = H, E = !0, $.taps = 1 + !!c);
      c && (c = clearTimeout(c)), E && ($.taps < 2 && (f = H[0], c = setTimeout(function() {
        c = null;
      }, p)), Yi(this), $.start());
    }
  }
  function D(_, ...C) {
    if (this.__zooming) {
      var j = M(this, C).event(_), L = _.changedTouches, $ = L.length, E, A, O, H;
      for (io(_), E = 0; E < $; ++E)
        A = L[E], O = vt(A, this), j.touch0 && j.touch0[2] === A.identifier ? j.touch0[0] = O : j.touch1 && j.touch1[2] === A.identifier && (j.touch1[0] = O);
      if (A = j.that.__zoom, j.touch1) {
        var U = j.touch0[0], B = j.touch0[1], X = j.touch1[0], Q = j.touch1[1], Z = (Z = X[0] - U[0]) * Z + (Z = X[1] - U[1]) * Z, re = (re = Q[0] - B[0]) * re + (re = Q[1] - B[1]) * re;
        A = m(A, Math.sqrt(Z / re)), O = [(U[0] + X[0]) / 2, (U[1] + X[1]) / 2], H = [(B[0] + Q[0]) / 2, (B[1] + Q[1]) / 2];
      } else if (j.touch0) O = j.touch0[0], H = j.touch0[1];
      else return;
      j.zoom("touch", n(g(A, O, H), j.extent, s));
    }
  }
  function V(_, ...C) {
    if (this.__zooming) {
      var j = M(this, C).event(_), L = _.changedTouches, $ = L.length, E, A;
      for (Ml(_), d && clearTimeout(d), d = setTimeout(function() {
        d = null;
      }, p), E = 0; E < $; ++E)
        A = L[E], j.touch0 && j.touch0[2] === A.identifier ? delete j.touch0 : j.touch1 && j.touch1[2] === A.identifier && delete j.touch1;
      if (j.touch1 && !j.touch0 && (j.touch0 = j.touch1, delete j.touch1), j.touch0) j.touch0[1] = this.__zoom.invert(j.touch0[0]);
      else if (j.end(), j.taps === 2 && (A = vt(A, this), Math.hypot(f[0] - A[0], f[1] - A[1]) < S)) {
        var O = st(this).on("dblclick.zoom");
        O && O.apply(this, arguments);
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
    return arguments.length ? (v = (_ = +_) * _, h) : Math.sqrt(v);
  }, h.tapDistance = function(_) {
    return arguments.length ? (S = +_, h) : S;
  }, h;
}
const Xs = P.createContext(null), g_ = Xs.Provider, Gt = {
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
}, cm = Gt.error001();
function le(e, t) {
  const n = P.useContext(Xs);
  if (n === null)
    throw new Error(cm);
  return Ih(n, e, t);
}
const Se = () => {
  const e = P.useContext(Xs);
  if (e === null)
    throw new Error(cm);
  return P.useMemo(() => ({
    getState: e.getState,
    setState: e.setState,
    subscribe: e.subscribe,
    destroy: e.destroy
  }), [e]);
}, y_ = (e) => e.userSelectionActive ? "none" : "all";
function Gu({ position: e, children: t, className: n, style: r, ...o }) {
  const i = le(y_), s = `${e}`.split("-");
  return I.createElement("div", { className: Te(["react-flow__panel", n, ...s]), style: { ...r, pointerEvents: i }, ...o }, t);
}
function v_({ proOptions: e, position: t = "bottom-right" }) {
  return e != null && e.hideAttribution ? null : I.createElement(
    Gu,
    { position: t, className: "react-flow__attribution", "data-message": "Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/pro" },
    I.createElement("a", { href: "https://reactflow.dev", target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution" }, "React Flow")
  );
}
const w_ = ({ x: e, y: t, label: n, labelStyle: r = {}, labelShowBg: o = !0, labelBgStyle: i = {}, labelBgPadding: s = [2, 4], labelBgBorderRadius: l = 2, children: a, className: u, ...c }) => {
  const f = P.useRef(null), [d, p] = P.useState({ x: 0, y: 0, width: 0, height: 0 }), x = Te(["react-flow__edge-textwrapper", u]);
  return P.useEffect(() => {
    if (f.current) {
      const v = f.current.getBBox();
      p({
        x: v.x,
        y: v.y,
        width: v.width,
        height: v.height
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
var x_ = P.memo(w_);
const Qu = (e) => ({
  width: e.offsetWidth,
  height: e.offsetHeight
}), Vr = (e, t = 0, n = 1) => Math.min(Math.max(e, t), n), Zu = (e = { x: 0, y: 0 }, t) => ({
  x: Vr(e.x, t[0][0], t[1][0]),
  y: Vr(e.y, t[0][1], t[1][1])
}), Vf = (e, t, n) => e < t ? Vr(Math.abs(e - t), 1, 50) / 50 : e > n ? -Vr(Math.abs(e - n), 1, 50) / 50 : 0, fm = (e, t) => {
  const n = Vf(e.x, 35, t.width - 35) * 20, r = Vf(e.y, 35, t.height - 35) * 20;
  return [n, r];
}, dm = (e) => {
  var t;
  return ((t = e.getRootNode) == null ? void 0 : t.call(e)) || (window == null ? void 0 : window.document);
}, pm = (e, t) => ({
  x: Math.min(e.x, t.x),
  y: Math.min(e.y, t.y),
  x2: Math.max(e.x2, t.x2),
  y2: Math.max(e.y2, t.y2)
}), Ko = ({ x: e, y: t, width: n, height: r }) => ({
  x: e,
  y: t,
  x2: e + n,
  y2: t + r
}), hm = ({ x: e, y: t, x2: n, y2: r }) => ({
  x: e,
  y: t,
  width: n - e,
  height: r - t
}), bf = (e) => ({
  ...e.positionAbsolute || { x: 0, y: 0 },
  width: e.width || 0,
  height: e.height || 0
}), __ = (e, t) => hm(pm(Ko(e), Ko(t))), Oa = (e, t) => {
  const n = Math.max(0, Math.min(e.x + e.width, t.x + t.width) - Math.max(e.x, t.x)), r = Math.max(0, Math.min(e.y + e.height, t.y + t.height) - Math.max(e.y, t.y));
  return Math.ceil(n * r);
}, k_ = (e) => at(e.width) && at(e.height) && at(e.x) && at(e.y), at = (e) => !isNaN(e) && isFinite(e), me = Symbol.for("internals"), mm = ["Enter", " ", "Escape"], S_ = (e, t) => {
}, E_ = (e) => "nativeEvent" in e;
function Fa(e) {
  var o, i;
  const t = E_(e) ? e.nativeEvent : e, n = ((i = (o = t.composedPath) == null ? void 0 : o.call(t)) == null ? void 0 : i[0]) || e.target;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(n == null ? void 0 : n.nodeName) || (n == null ? void 0 : n.hasAttribute("contenteditable")) || !!(n != null && n.closest(".nokey"));
}
const gm = (e) => "clientX" in e, wn = (e, t) => {
  var i, s;
  const n = gm(e), r = n ? e.clientX : (i = e.touches) == null ? void 0 : i[0].clientX, o = n ? e.clientY : (s = e.touches) == null ? void 0 : s[0].clientY;
  return {
    x: r - ((t == null ? void 0 : t.left) ?? 0),
    y: o - ((t == null ? void 0 : t.top) ?? 0)
  };
}, Ss = () => {
  var e;
  return typeof navigator < "u" && ((e = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : e.indexOf("Mac")) >= 0;
}, oi = ({ id: e, path: t, labelX: n, labelY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p = 20 }) => I.createElement(
  I.Fragment,
  null,
  I.createElement("path", { id: e, style: c, d: t, fill: "none", className: "react-flow__edge-path", markerEnd: f, markerStart: d }),
  p && I.createElement("path", { d: t, fill: "none", strokeOpacity: 0, strokeWidth: p, className: "react-flow__edge-interaction" }),
  o && at(n) && at(r) ? I.createElement(x_, { x: n, y: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u }) : null
);
oi.displayName = "BaseEdge";
function so(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().edges.find((i) => i.id === e);
    o && n(r, { ...o });
  };
}
function ym({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const o = Math.abs(n - e) / 2, i = n < e ? n + o : n - o, s = Math.abs(r - t) / 2, l = r < t ? r + s : r - s;
  return [i, l, o, s];
}
function vm({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourceControlX: o, sourceControlY: i, targetControlX: s, targetControlY: l }) {
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
function Bf({ pos: e, x1: t, y1: n, x2: r, y2: o }) {
  return e === K.Left || e === K.Right ? [0.5 * (t + r), n] : [t, 0.5 * (n + o)];
}
function wm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top }) {
  const [s, l] = Bf({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o
  }), [a, u] = Bf({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t
  }), [c, f, d, p] = vm({
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
const qu = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: v }) => {
  const [S, h, m] = wm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i
  });
  return I.createElement(oi, { path: S, labelX: h, labelY: m, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: v });
});
qu.displayName = "SimpleBezierEdge";
const Uf = {
  [K.Left]: { x: -1, y: 0 },
  [K.Right]: { x: 1, y: 0 },
  [K.Top]: { x: 0, y: -1 },
  [K.Bottom]: { x: 0, y: 1 }
}, N_ = ({ source: e, sourcePosition: t = K.Bottom, target: n }) => t === K.Left || t === K.Right ? e.x < n.x ? { x: 1, y: 0 } : { x: -1, y: 0 } : e.y < n.y ? { x: 0, y: 1 } : { x: 0, y: -1 }, Wf = (e, t) => Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
function C_({ source: e, sourcePosition: t = K.Bottom, target: n, targetPosition: r = K.Top, center: o, offset: i }) {
  const s = Uf[t], l = Uf[r], a = { x: e.x + s.x * i, y: e.y + s.y * i }, u = { x: n.x + l.x * i, y: n.y + l.y * i }, c = N_({
    source: a,
    sourcePosition: t,
    target: u
  }), f = c.x !== 0 ? "x" : "y", d = c[f];
  let p = [], x, v;
  const S = { x: 0, y: 0 }, h = { x: 0, y: 0 }, [m, g, w, N] = ym({
    sourceX: e.x,
    sourceY: e.y,
    targetX: n.x,
    targetY: n.y
  });
  if (s[f] * l[f] === -1) {
    x = o.x ?? m, v = o.y ?? g;
    const z = [
      { x, y: a.y },
      { x, y: u.y }
    ], T = [
      { x: a.x, y: v },
      { x: u.x, y: v }
    ];
    s[f] === d ? p = f === "x" ? z : T : p = f === "x" ? T : z;
  } else {
    const z = [{ x: a.x, y: u.y }], T = [{ x: u.x, y: a.y }];
    if (f === "x" ? p = s.x === d ? T : z : p = s.y === d ? z : T, t === r) {
      const V = Math.abs(e[f] - n[f]);
      if (V <= i) {
        const _ = Math.min(i - 1, i - V);
        s[f] === d ? S[f] = (a[f] > e[f] ? -1 : 1) * _ : h[f] = (u[f] > n[f] ? -1 : 1) * _;
      }
    }
    if (t !== r) {
      const V = f === "x" ? "y" : "x", _ = s[f] === l[V], C = a[V] > u[V], j = a[V] < u[V];
      (s[f] === 1 && (!_ && C || _ && j) || s[f] !== 1 && (!_ && j || _ && C)) && (p = f === "x" ? z : T);
    }
    const k = { x: a.x + S.x, y: a.y + S.y }, R = { x: u.x + h.x, y: u.y + h.y }, F = Math.max(Math.abs(k.x - p[0].x), Math.abs(R.x - p[0].x)), D = Math.max(Math.abs(k.y - p[0].y), Math.abs(R.y - p[0].y));
    F >= D ? (x = (k.x + R.x) / 2, v = p[0].y) : (x = p[0].x, v = (k.y + R.y) / 2);
  }
  return [[
    e,
    { x: a.x + S.x, y: a.y + S.y },
    ...p,
    { x: u.x + h.x, y: u.y + h.y },
    n
  ], x, v, w, N];
}
function j_(e, t, n, r) {
  const o = Math.min(Wf(e, t) / 2, Wf(t, n) / 2, r), { x: i, y: s } = t;
  if (e.x === i && i === n.x || e.y === s && s === n.y)
    return `L${i} ${s}`;
  if (e.y === s) {
    const u = e.x < n.x ? -1 : 1, c = e.y < n.y ? 1 : -1;
    return `L ${i + o * u},${s}Q ${i},${s} ${i},${s + o * c}`;
  }
  const l = e.x < n.x ? 1 : -1, a = e.y < n.y ? -1 : 1;
  return `L ${i},${s + o * a}Q ${i},${s} ${i + o * l},${s}`;
}
function Ha({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, borderRadius: s = 5, centerX: l, centerY: a, offset: u = 20 }) {
  const [c, f, d, p, x] = C_({
    source: { x: e, y: t },
    sourcePosition: n,
    target: { x: r, y: o },
    targetPosition: i,
    center: { x: l, y: a },
    offset: u
  });
  return [c.reduce((S, h, m) => {
    let g = "";
    return m > 0 && m < c.length - 1 ? g = j_(c[m - 1], h, c[m + 1], s) : g = `${m === 0 ? "M" : "L"}${h.x} ${h.y}`, S += g, S;
  }, ""), f, d, p, x];
}
const Ks = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, sourcePosition: f = K.Bottom, targetPosition: d = K.Top, markerEnd: p, markerStart: x, pathOptions: v, interactionWidth: S }) => {
  const [h, m, g] = Ha({
    sourceX: e,
    sourceY: t,
    sourcePosition: f,
    targetX: n,
    targetY: r,
    targetPosition: d,
    borderRadius: v == null ? void 0 : v.borderRadius,
    offset: v == null ? void 0 : v.offset
  });
  return I.createElement(oi, { path: h, labelX: m, labelY: g, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: p, markerStart: x, interactionWidth: S });
});
Ks.displayName = "SmoothStepEdge";
const Ju = P.memo((e) => {
  var t;
  return I.createElement(Ks, { ...e, pathOptions: P.useMemo(() => {
    var n;
    return { borderRadius: 0, offset: (n = e.pathOptions) == null ? void 0 : n.offset };
  }, [(t = e.pathOptions) == null ? void 0 : t.offset]) });
});
Ju.displayName = "StepEdge";
function P_({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const [o, i, s, l] = ym({
    sourceX: e,
    sourceY: t,
    targetX: n,
    targetY: r
  });
  return [`M ${e},${t}L ${n},${r}`, o, i, s, l];
}
const ec = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p }) => {
  const [x, v, S] = P_({ sourceX: e, sourceY: t, targetX: n, targetY: r });
  return I.createElement(oi, { path: x, labelX: v, labelY: S, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p });
});
ec.displayName = "StraightEdge";
function ji(e, t) {
  return e >= 0 ? 0.5 * e : t * 25 * Math.sqrt(-e);
}
function Yf({ pos: e, x1: t, y1: n, x2: r, y2: o, c: i }) {
  switch (e) {
    case K.Left:
      return [t - ji(t - r, i), n];
    case K.Right:
      return [t + ji(r - t, i), n];
    case K.Top:
      return [t, n - ji(n - o, i)];
    case K.Bottom:
      return [t, n + ji(o - n, i)];
  }
}
function xm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, curvature: s = 0.25 }) {
  const [l, a] = Yf({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o,
    c: s
  }), [u, c] = Yf({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t,
    c: s
  }), [f, d, p, x] = vm({
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
const Ns = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, pathOptions: v, interactionWidth: S }) => {
  const [h, m, g] = xm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i,
    curvature: v == null ? void 0 : v.curvature
  });
  return I.createElement(oi, { path: h, labelX: m, labelY: g, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: x, interactionWidth: S });
});
Ns.displayName = "BezierEdge";
const tc = P.createContext(null), M_ = tc.Provider;
tc.Consumer;
const z_ = () => P.useContext(tc), T_ = (e) => "id" in e && "source" in e && "target" in e, $_ = ({ source: e, sourceHandle: t, target: n, targetHandle: r }) => `reactflow__edge-${e}${t || ""}-${n}${r || ""}`, Va = (e, t) => typeof e > "u" ? "" : typeof e == "string" ? e : `${t ? `${t}__` : ""}${Object.keys(e).sort().map((r) => `${r}=${e[r]}`).join("&")}`, R_ = (e, t) => t.some((n) => n.source === e.source && n.target === e.target && (n.sourceHandle === e.sourceHandle || !n.sourceHandle && !e.sourceHandle) && (n.targetHandle === e.targetHandle || !n.targetHandle && !e.targetHandle)), A_ = (e, t) => {
  if (!e.source || !e.target)
    return t;
  let n;
  return T_(e) ? n = { ...e } : n = {
    ...e,
    id: $_(e)
  }, R_(n, t) ? t : t.concat(n);
}, ba = ({ x: e, y: t }, [n, r, o], i, [s, l]) => {
  const a = {
    x: (e - n) / o,
    y: (t - r) / o
  };
  return i ? {
    x: s * Math.round(a.x / s),
    y: l * Math.round(a.y / l)
  } : a;
}, _m = ({ x: e, y: t }, [n, r, o]) => ({
  x: e * o + n,
  y: t * o + r
}), bn = (e, t = [0, 0]) => {
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
}, Gs = (e, t = [0, 0]) => {
  if (e.length === 0)
    return { x: 0, y: 0, width: 0, height: 0 };
  const n = e.reduce((r, o) => {
    const { x: i, y: s } = bn(o, t).positionAbsolute;
    return pm(r, Ko({
      x: i,
      y: s,
      width: o.width || 0,
      height: o.height || 0
    }));
  }, { x: 1 / 0, y: 1 / 0, x2: -1 / 0, y2: -1 / 0 });
  return hm(n);
}, km = (e, t, [n, r, o] = [0, 0, 1], i = !1, s = !1, l = [0, 0]) => {
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
    const { positionAbsolute: v } = bn(c, l), S = {
      x: v.x,
      y: v.y,
      width: f || 0,
      height: d || 0
    }, h = Oa(a, S), m = typeof f > "u" || typeof d > "u" || f === null || d === null, g = i && h > 0, w = (f || 0) * (d || 0);
    (m || g || h >= w || c.dragging) && u.push(c);
  }), u;
}, Sm = (e, t) => {
  const n = e.map((r) => r.id);
  return t.filter((r) => n.includes(r.source) || n.includes(r.target));
}, Em = (e, t, n, r, o, i = 0.1) => {
  const s = t / (e.width * (1 + i)), l = n / (e.height * (1 + i)), a = Math.min(s, l), u = Vr(a, r, o), c = e.x + e.width / 2, f = e.y + e.height / 2, d = t / 2 - c * u, p = n / 2 - f * u;
  return { x: d, y: p, zoom: u };
}, Rn = (e, t = 0) => e.transition().duration(t);
function Xf(e, t, n, r) {
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
function I_(e, t, n, r, o, i) {
  const { x: s, y: l } = wn(e), u = t.elementsFromPoint(s, l).find((x) => x.classList.contains("react-flow__handle"));
  if (u) {
    const x = u.getAttribute("data-nodeid");
    if (x) {
      const v = nc(void 0, u), S = u.getAttribute("data-handleid"), h = i({ nodeId: x, id: S, type: v });
      if (h) {
        const m = o.find((g) => g.nodeId === x && g.type === v && g.id === S);
        return {
          handle: {
            id: S,
            type: v,
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
    const v = Math.sqrt((x.x - n.x) ** 2 + (x.y - n.y) ** 2);
    if (v <= r) {
      const S = i(x);
      v <= f && (v < f ? c = [{ handle: x, validHandleResult: S }] : v === f && c.push({
        handle: x,
        validHandleResult: S
      }), f = v);
    }
  }), !c.length)
    return { handle: null, validHandleResult: Nm() };
  if (c.length === 1)
    return c[0];
  const d = c.some(({ validHandleResult: x }) => x.isValid), p = c.some(({ handle: x }) => x.type === "target");
  return c.find(({ handle: x, validHandleResult: v }) => p ? x.type === "target" : d ? v.isValid : !0) || c[0];
}
const L_ = { source: null, target: null, sourceHandle: null, targetHandle: null }, Nm = () => ({
  handleDomNode: null,
  isValid: !1,
  connection: L_,
  endHandle: null
});
function Cm(e, t, n, r, o, i, s) {
  const l = o === "target", a = s.querySelector(`.react-flow__handle[data-id="${e == null ? void 0 : e.nodeId}-${e == null ? void 0 : e.id}-${e == null ? void 0 : e.type}"]`), u = {
    ...Nm(),
    handleDomNode: a
  };
  if (a) {
    const c = nc(void 0, a), f = a.getAttribute("data-nodeid"), d = a.getAttribute("data-handleid"), p = a.classList.contains("connectable"), x = a.classList.contains("connectableend"), v = {
      source: l ? f : n,
      sourceHandle: l ? d : r,
      target: l ? n : f,
      targetHandle: l ? r : d
    };
    u.connection = v, p && x && (t === Gn.Strict ? l && c === "source" || !l && c === "target" : f !== n || d !== r) && (u.endHandle = {
      nodeId: f,
      handleId: d,
      type: c
    }, u.isValid = i(v));
  }
  return u;
}
function D_({ nodes: e, nodeId: t, handleId: n, handleType: r }) {
  return e.reduce((o, i) => {
    if (i[me]) {
      const { handleBounds: s } = i[me];
      let l = [], a = [];
      s && (l = Xf(i, s, "source", `${t}-${n}-${r}`), a = Xf(i, s, "target", `${t}-${n}-${r}`)), o.push(...l, ...a);
    }
    return o;
  }, []);
}
function nc(e, t) {
  return e || (t != null && t.classList.contains("target") ? "target" : t != null && t.classList.contains("source") ? "source" : null);
}
function zl(e) {
  e == null || e.classList.remove("valid", "connecting", "react-flow__handle-valid", "react-flow__handle-connecting");
}
function O_(e, t) {
  let n = null;
  return t ? n = "valid" : e && !t && (n = "invalid"), n;
}
function jm({ event: e, handleId: t, nodeId: n, onConnect: r, isTarget: o, getState: i, setState: s, isValidConnection: l, edgeUpdaterType: a, onReconnectEnd: u }) {
  const c = dm(e.target), { connectionMode: f, domNode: d, autoPanOnConnect: p, connectionRadius: x, onConnectStart: v, panBy: S, getNodes: h, cancelConnection: m } = i();
  let g = 0, w;
  const { x: N, y: M } = wn(e), z = c == null ? void 0 : c.elementFromPoint(N, M), T = nc(a, z), k = d == null ? void 0 : d.getBoundingClientRect();
  if (!k || !T)
    return;
  let R, F = wn(e, k), D = !1, V = null, _ = !1, C = null;
  const j = D_({
    nodes: h(),
    nodeId: n,
    handleId: t,
    handleType: T
  }), L = () => {
    if (!p)
      return;
    const [A, O] = fm(F, k);
    S({ x: A, y: O }), g = requestAnimationFrame(L);
  };
  s({
    connectionPosition: F,
    connectionStatus: null,
    // connectionNodeId etc will be removed in the next major in favor of connectionStartHandle
    connectionNodeId: n,
    connectionHandleId: t,
    connectionHandleType: T,
    connectionStartHandle: {
      nodeId: n,
      handleId: t,
      type: T
    },
    connectionEndHandle: null
  }), v == null || v(e, { nodeId: n, handleId: t, handleType: T });
  function $(A) {
    const { transform: O } = i();
    F = wn(A, k);
    const { handle: H, validHandleResult: U } = I_(A, c, ba(F, O, !1, [1, 1]), x, j, (B) => Cm(B, f, n, t, o ? "target" : "source", l, c));
    if (w = H, D || (L(), D = !0), C = U.handleDomNode, V = U.connection, _ = U.isValid, s({
      connectionPosition: w && _ ? _m({
        x: w.x,
        y: w.y
      }, O) : F,
      connectionStatus: O_(!!w, _),
      connectionEndHandle: U.endHandle
    }), !w && !_ && !C)
      return zl(R);
    V.source !== V.target && C && (zl(R), R = C, C.classList.add("connecting", "react-flow__handle-connecting"), C.classList.toggle("valid", _), C.classList.toggle("react-flow__handle-valid", _));
  }
  function E(A) {
    var O, H;
    (w || C) && V && _ && (r == null || r(V)), (H = (O = i()).onConnectEnd) == null || H.call(O, A), a && (u == null || u(A)), zl(R), m(), cancelAnimationFrame(g), D = !1, _ = !1, V = null, C = null, c.removeEventListener("mousemove", $), c.removeEventListener("mouseup", E), c.removeEventListener("touchmove", $), c.removeEventListener("touchend", E);
  }
  c.addEventListener("mousemove", $), c.addEventListener("mouseup", E), c.addEventListener("touchmove", $), c.addEventListener("touchend", E);
}
const Kf = () => !0, F_ = (e) => ({
  connectionStartHandle: e.connectionStartHandle,
  connectOnClick: e.connectOnClick,
  noPanClassName: e.noPanClassName
}), H_ = (e, t, n) => (r) => {
  const { connectionStartHandle: o, connectionEndHandle: i, connectionClickStartHandle: s } = r;
  return {
    connecting: (o == null ? void 0 : o.nodeId) === e && (o == null ? void 0 : o.handleId) === t && (o == null ? void 0 : o.type) === n || (i == null ? void 0 : i.nodeId) === e && (i == null ? void 0 : i.handleId) === t && (i == null ? void 0 : i.type) === n,
    clickConnecting: (s == null ? void 0 : s.nodeId) === e && (s == null ? void 0 : s.handleId) === t && (s == null ? void 0 : s.type) === n
  };
}, Pm = P.forwardRef(({ type: e = "source", position: t = K.Top, isValidConnection: n, isConnectable: r = !0, isConnectableStart: o = !0, isConnectableEnd: i = !0, id: s, onConnect: l, children: a, className: u, onMouseDown: c, onTouchStart: f, ...d }, p) => {
  var k, R;
  const x = s || null, v = e === "target", S = Se(), h = z_(), { connectOnClick: m, noPanClassName: g } = le(F_, Ce), { connecting: w, clickConnecting: N } = le(H_(h, x, e), Ce);
  h || (R = (k = S.getState()).onError) == null || R.call(k, "010", Gt.error010());
  const M = (F) => {
    const { defaultEdgeOptions: D, onConnect: V, hasDefaultEdges: _ } = S.getState(), C = {
      ...D,
      ...F
    };
    if (_) {
      const { edges: j, setEdges: L } = S.getState();
      L(A_(C, j));
    }
    V == null || V(C), l == null || l(C);
  }, z = (F) => {
    if (!h)
      return;
    const D = gm(F);
    o && (D && F.button === 0 || !D) && jm({
      event: F,
      handleId: x,
      nodeId: h,
      onConnect: M,
      isTarget: v,
      getState: S.getState,
      setState: S.setState,
      isValidConnection: n || S.getState().isValidConnection || Kf
    }), D ? c == null || c(F) : f == null || f(F);
  }, T = (F) => {
    const { onClickConnectStart: D, onClickConnectEnd: V, connectionClickStartHandle: _, connectionMode: C, isValidConnection: j } = S.getState();
    if (!h || !_ && !o)
      return;
    if (!_) {
      D == null || D(F, { nodeId: h, handleId: x, handleType: e }), S.setState({ connectionClickStartHandle: { nodeId: h, type: e, handleId: x } });
      return;
    }
    const L = dm(F.target), $ = n || j || Kf, { connection: E, isValid: A } = Cm({
      nodeId: h,
      id: x,
      type: e
    }, C, _.nodeId, _.handleId || null, _.type, $, L);
    A && M(E), V == null || V(F), S.setState({ connectionClickStartHandle: null });
  };
  return I.createElement("div", { "data-handleid": x, "data-nodeid": h, "data-handlepos": t, "data-id": `${h}-${x}-${e}`, className: Te([
    "react-flow__handle",
    `react-flow__handle-${t}`,
    "nodrag",
    g,
    u,
    {
      source: !v,
      target: v,
      connectable: r,
      connectablestart: o,
      connectableend: i,
      connecting: N,
      // this class is used to style the handle when the user is connecting
      connectionindicator: r && (o && !w || i && w)
    }
  ]), onMouseDown: z, onTouchStart: z, onClick: m ? T : void 0, ref: p, ...d }, a);
});
Pm.displayName = "Handle";
var br = P.memo(Pm);
const Mm = ({ data: e, isConnectable: t, targetPosition: n = K.Top, sourcePosition: r = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(br, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label,
  I.createElement(br, { type: "source", position: r, isConnectable: t })
);
Mm.displayName = "DefaultNode";
var Ba = P.memo(Mm);
const zm = ({ data: e, isConnectable: t, sourcePosition: n = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  e == null ? void 0 : e.label,
  I.createElement(br, { type: "source", position: n, isConnectable: t })
);
zm.displayName = "InputNode";
var Tm = P.memo(zm);
const $m = ({ data: e, isConnectable: t, targetPosition: n = K.Top }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(br, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label
);
$m.displayName = "OutputNode";
var Rm = P.memo($m);
const rc = () => null;
rc.displayName = "GroupNode";
const V_ = (e) => ({
  selectedNodes: e.getNodes().filter((t) => t.selected),
  selectedEdges: e.edges.filter((t) => t.selected).map((t) => ({ ...t }))
}), Pi = (e) => e.id;
function b_(e, t) {
  return Ce(e.selectedNodes.map(Pi), t.selectedNodes.map(Pi)) && Ce(e.selectedEdges.map(Pi), t.selectedEdges.map(Pi));
}
const Am = P.memo(({ onSelectionChange: e }) => {
  const t = Se(), { selectedNodes: n, selectedEdges: r } = le(V_, b_);
  return P.useEffect(() => {
    const o = { nodes: n, edges: r };
    e == null || e(o), t.getState().onSelectionChange.forEach((i) => i(o));
  }, [n, r, e]), null;
});
Am.displayName = "SelectionListener";
const B_ = (e) => !!e.onSelectionChange;
function U_({ onSelectionChange: e }) {
  const t = le(B_);
  return e || t ? I.createElement(Am, { onSelectionChange: e }) : null;
}
const W_ = (e) => ({
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
  P.useEffect(() => {
    typeof e < "u" && t(e);
  }, [e]);
}
function q(e, t, n) {
  P.useEffect(() => {
    typeof t < "u" && n({ [e]: t });
  }, [t]);
}
const Y_ = ({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: o, onConnectStart: i, onConnectEnd: s, onClickConnectStart: l, onClickConnectEnd: a, nodesDraggable: u, nodesConnectable: c, nodesFocusable: f, edgesFocusable: d, edgesUpdatable: p, elevateNodesOnSelect: x, minZoom: v, maxZoom: S, nodeExtent: h, onNodesChange: m, onEdgesChange: g, elementsSelectable: w, connectionMode: N, snapGrid: M, snapToGrid: z, translateExtent: T, connectOnClick: k, defaultEdgeOptions: R, fitView: F, fitViewOptions: D, onNodesDelete: V, onEdgesDelete: _, onNodeDrag: C, onNodeDragStart: j, onNodeDragStop: L, onSelectionDrag: $, onSelectionDragStart: E, onSelectionDragStop: A, noPanClassName: O, nodeOrigin: H, rfId: U, autoPanOnConnect: B, autoPanOnNodeDrag: X, onError: Q, connectionRadius: Z, isValidConnection: re, nodeDragThreshold: ne }) => {
  const { setNodes: te, setEdges: je, setDefaultNodesAndEdges: we, setMinZoom: Oe, setMaxZoom: $e, setTranslateExtent: ge, setNodeExtent: Qe, reset: ie } = le(W_, Ce), G = Se();
  return P.useEffect(() => {
    const Fe = r == null ? void 0 : r.map((Rt) => ({ ...Rt, ...R }));
    return we(n, Fe), () => {
      ie();
    };
  }, []), q("defaultEdgeOptions", R, G.setState), q("connectionMode", N, G.setState), q("onConnect", o, G.setState), q("onConnectStart", i, G.setState), q("onConnectEnd", s, G.setState), q("onClickConnectStart", l, G.setState), q("onClickConnectEnd", a, G.setState), q("nodesDraggable", u, G.setState), q("nodesConnectable", c, G.setState), q("nodesFocusable", f, G.setState), q("edgesFocusable", d, G.setState), q("edgesUpdatable", p, G.setState), q("elementsSelectable", w, G.setState), q("elevateNodesOnSelect", x, G.setState), q("snapToGrid", z, G.setState), q("snapGrid", M, G.setState), q("onNodesChange", m, G.setState), q("onEdgesChange", g, G.setState), q("connectOnClick", k, G.setState), q("fitViewOnInit", F, G.setState), q("fitViewOnInitOptions", D, G.setState), q("onNodesDelete", V, G.setState), q("onEdgesDelete", _, G.setState), q("onNodeDrag", C, G.setState), q("onNodeDragStart", j, G.setState), q("onNodeDragStop", L, G.setState), q("onSelectionDrag", $, G.setState), q("onSelectionDragStart", E, G.setState), q("onSelectionDragStop", A, G.setState), q("noPanClassName", O, G.setState), q("nodeOrigin", H, G.setState), q("rfId", U, G.setState), q("autoPanOnConnect", B, G.setState), q("autoPanOnNodeDrag", X, G.setState), q("onError", Q, G.setState), q("connectionRadius", Z, G.setState), q("isValidConnection", re, G.setState), q("nodeDragThreshold", ne, G.setState), or(e, te), or(t, je), or(v, Oe), or(S, $e), or(T, ge), or(h, Qe), null;
}, Gf = { display: "none" }, X_ = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0px, 0px, 0px, 0px)",
  clipPath: "inset(100%)"
}, Im = "react-flow__node-desc", Lm = "react-flow__edge-desc", K_ = "react-flow__aria-live", G_ = (e) => e.ariaLiveMessage;
function Q_({ rfId: e }) {
  const t = le(G_);
  return I.createElement("div", { id: `${K_}-${e}`, "aria-live": "assertive", "aria-atomic": "true", style: X_ }, t);
}
function Z_({ rfId: e, disableKeyboardA11y: t }) {
  return I.createElement(
    I.Fragment,
    null,
    I.createElement(
      "div",
      { id: `${Im}-${e}`, style: Gf },
      "Press enter or space to select a node.",
      !t && "You can then use the arrow keys to move the node around.",
      " Press delete to remove it and escape to cancel.",
      " "
    ),
    I.createElement("div", { id: `${Lm}-${e}`, style: Gf }, "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel."),
    !t && I.createElement(Q_, { rfId: e })
  );
}
var Qo = (e = null, t = { actInsideInputWithModifier: !0 }) => {
  const [n, r] = P.useState(!1), o = P.useRef(!1), i = P.useRef(/* @__PURE__ */ new Set([])), [s, l] = P.useMemo(() => {
    if (e !== null) {
      const u = (Array.isArray(e) ? e : [e]).filter((f) => typeof f == "string").map((f) => f.split("+")), c = u.reduce((f, d) => f.concat(...d), []);
      return [u, c];
    }
    return [[], []];
  }, [e]);
  return P.useEffect(() => {
    const a = typeof document < "u" ? document : null, u = (t == null ? void 0 : t.target) || a;
    if (e !== null) {
      const c = (p) => {
        if (o.current = p.ctrlKey || p.metaKey || p.shiftKey, (!o.current || o.current && !t.actInsideInputWithModifier) && Fa(p))
          return !1;
        const v = Zf(p.code, l);
        i.current.add(p[v]), Qf(s, i.current, !1) && (p.preventDefault(), r(!0));
      }, f = (p) => {
        if ((!o.current || o.current && !t.actInsideInputWithModifier) && Fa(p))
          return !1;
        const v = Zf(p.code, l);
        Qf(s, i.current, !0) ? (r(!1), i.current.clear()) : i.current.delete(p[v]), p.key === "Meta" && i.current.clear(), o.current = !1;
      }, d = () => {
        i.current.clear(), r(!1);
      };
      return u == null || u.addEventListener("keydown", c), u == null || u.addEventListener("keyup", f), window.addEventListener("blur", d), () => {
        u == null || u.removeEventListener("keydown", c), u == null || u.removeEventListener("keyup", f), window.removeEventListener("blur", d);
      };
    }
  }, [e, r]), n;
};
function Qf(e, t, n) {
  return e.filter((r) => n || r.length === t.size).some((r) => r.every((o) => t.has(o)));
}
function Zf(e, t) {
  return t.includes(e) ? "code" : "key";
}
function Dm(e, t, n, r) {
  var l, a;
  const o = e.parentNode || e.parentId;
  if (!o)
    return n;
  const i = t.get(o), s = bn(i, r);
  return Dm(i, t, {
    x: (n.x ?? 0) + s.x,
    y: (n.y ?? 0) + s.y,
    z: (((l = i[me]) == null ? void 0 : l.z) ?? 0) > (n.z ?? 0) ? ((a = i[me]) == null ? void 0 : a.z) ?? 0 : n.z ?? 0
  }, r);
}
function Om(e, t, n) {
  e.forEach((r) => {
    var i;
    const o = r.parentNode || r.parentId;
    if (o && !e.has(o))
      throw new Error(`Parent node ${o} not found`);
    if (o || n != null && n[r.id]) {
      const { x: s, y: l, z: a } = Dm(r, e, {
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
function Tl(e, t, n, r) {
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
  }), Om(o, n, i), o;
}
function Fm(e, t = {}) {
  const { getNodes: n, width: r, height: o, minZoom: i, maxZoom: s, d3Zoom: l, d3Selection: a, fitViewOnInitDone: u, fitViewOnInit: c, nodeOrigin: f } = e(), d = t.initial && !u && c;
  if (l && a && (d || !t.initial)) {
    const x = n().filter((S) => {
      var m;
      const h = t.includeHiddenNodes ? S.width && S.height : !S.hidden;
      return (m = t.nodes) != null && m.length ? h && t.nodes.some((g) => g.id === S.id) : h;
    }), v = x.every((S) => S.width && S.height);
    if (x.length > 0 && v) {
      const S = Gs(x, f), { x: h, y: m, zoom: g } = Em(S, r, o, t.minZoom ?? i, t.maxZoom ?? s, t.padding ?? 0.1), w = Bt.translate(h, m).scale(g);
      return typeof t.duration == "number" && t.duration > 0 ? l.transform(Rn(a, t.duration), w) : l.transform(a, w), !0;
    }
  }
  return !1;
}
function q_(e, t) {
  return e.forEach((n) => {
    const r = t.get(n.id);
    r && t.set(r.id, {
      ...r,
      [me]: r[me],
      selected: n.selected
    });
  }), new Map(t);
}
function J_(e, t) {
  return t.map((n) => {
    const r = e.find((o) => o.id === n.id);
    return r && (n.selected = r.selected), n;
  });
}
function Mi({ changedNodes: e, changedEdges: t, get: n, set: r }) {
  const { nodeInternals: o, edges: i, onNodesChange: s, onEdgesChange: l, hasDefaultNodes: a, hasDefaultEdges: u } = n();
  e != null && e.length && (a && r({ nodeInternals: q_(e, o) }), s == null || s(e)), t != null && t.length && (u && r({ edges: J_(t, i) }), l == null || l(t));
}
const ir = () => {
}, ek = {
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
}, tk = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection
}), nk = () => {
  const e = Se(), { d3Zoom: t, d3Selection: n } = le(tk, Ce);
  return P.useMemo(() => n && t ? {
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
    fitView: (o) => Fm(e.getState, o),
    setCenter: (o, i, s) => {
      const { width: l, height: a, maxZoom: u } = e.getState(), c = typeof (s == null ? void 0 : s.zoom) < "u" ? s.zoom : u, f = l / 2 - o * c, d = a / 2 - i * c, p = Bt.translate(f, d).scale(c);
      t.transform(Rn(n, s == null ? void 0 : s.duration), p);
    },
    fitBounds: (o, i) => {
      const { width: s, height: l, minZoom: a, maxZoom: u } = e.getState(), { x: c, y: f, zoom: d } = Em(o, s, l, a, u, (i == null ? void 0 : i.padding) ?? 0.1), p = Bt.translate(c, f).scale(d);
      t.transform(Rn(n, i == null ? void 0 : i.duration), p);
    },
    // @deprecated Use `screenToFlowPosition`.
    project: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l } = e.getState();
      return console.warn("[DEPRECATED] `project` is deprecated. Instead use `screenToFlowPosition`. There is no need to subtract the react flow bounds anymore! https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position"), ba(o, i, s, l);
    },
    screenToFlowPosition: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l, domNode: a } = e.getState();
      if (!a)
        return o;
      const { x: u, y: c } = a.getBoundingClientRect(), f = {
        x: o.x - u,
        y: o.y - c
      };
      return ba(f, i, s, l);
    },
    flowToScreenPosition: (o) => {
      const { transform: i, domNode: s } = e.getState();
      if (!s)
        return o;
      const { x: l, y: a } = s.getBoundingClientRect(), u = _m(o, i);
      return {
        x: u.x + l,
        y: u.y + a
      };
    },
    viewportInitialized: !0
  } : ek, [t, n]);
};
function oc() {
  const e = nk(), t = Se(), n = P.useCallback(() => t.getState().getNodes().map((v) => ({ ...v })), []), r = P.useCallback((v) => t.getState().nodeInternals.get(v), []), o = P.useCallback(() => {
    const { edges: v = [] } = t.getState();
    return v.map((S) => ({ ...S }));
  }, []), i = P.useCallback((v) => {
    const { edges: S = [] } = t.getState();
    return S.find((h) => h.id === v);
  }, []), s = P.useCallback((v) => {
    const { getNodes: S, setNodes: h, hasDefaultNodes: m, onNodesChange: g } = t.getState(), w = S(), N = typeof v == "function" ? v(w) : v;
    if (m)
      h(N);
    else if (g) {
      const M = N.length === 0 ? w.map((z) => ({ type: "remove", id: z.id })) : N.map((z) => ({ item: z, type: "reset" }));
      g(M);
    }
  }, []), l = P.useCallback((v) => {
    const { edges: S = [], setEdges: h, hasDefaultEdges: m, onEdgesChange: g } = t.getState(), w = typeof v == "function" ? v(S) : v;
    if (m)
      h(w);
    else if (g) {
      const N = w.length === 0 ? S.map((M) => ({ type: "remove", id: M.id })) : w.map((M) => ({ item: M, type: "reset" }));
      g(N);
    }
  }, []), a = P.useCallback((v) => {
    const S = Array.isArray(v) ? v : [v], { getNodes: h, setNodes: m, hasDefaultNodes: g, onNodesChange: w } = t.getState();
    if (g) {
      const M = [...h(), ...S];
      m(M);
    } else if (w) {
      const N = S.map((M) => ({ item: M, type: "add" }));
      w(N);
    }
  }, []), u = P.useCallback((v) => {
    const S = Array.isArray(v) ? v : [v], { edges: h = [], setEdges: m, hasDefaultEdges: g, onEdgesChange: w } = t.getState();
    if (g)
      m([...h, ...S]);
    else if (w) {
      const N = S.map((M) => ({ item: M, type: "add" }));
      w(N);
    }
  }, []), c = P.useCallback(() => {
    const { getNodes: v, edges: S = [], transform: h } = t.getState(), [m, g, w] = h;
    return {
      nodes: v().map((N) => ({ ...N })),
      edges: S.map((N) => ({ ...N })),
      viewport: {
        x: m,
        y: g,
        zoom: w
      }
    };
  }, []), f = P.useCallback(({ nodes: v, edges: S }) => {
    const { nodeInternals: h, getNodes: m, edges: g, hasDefaultNodes: w, hasDefaultEdges: N, onNodesDelete: M, onEdgesDelete: z, onNodesChange: T, onEdgesChange: k } = t.getState(), R = (v || []).map((C) => C.id), F = (S || []).map((C) => C.id), D = m().reduce((C, j) => {
      const L = j.parentNode || j.parentId, $ = !R.includes(j.id) && L && C.find((A) => A.id === L);
      return (typeof j.deletable == "boolean" ? j.deletable : !0) && (R.includes(j.id) || $) && C.push(j), C;
    }, []), V = g.filter((C) => typeof C.deletable == "boolean" ? C.deletable : !0), _ = V.filter((C) => F.includes(C.id));
    if (D || _) {
      const C = Sm(D, V), j = [..._, ...C], L = j.reduce(($, E) => ($.includes(E.id) || $.push(E.id), $), []);
      if ((N || w) && (N && t.setState({
        edges: g.filter(($) => !L.includes($.id))
      }), w && (D.forEach(($) => {
        h.delete($.id);
      }), t.setState({
        nodeInternals: new Map(h)
      }))), L.length > 0 && (z == null || z(j), k && k(L.map(($) => ({
        id: $,
        type: "remove"
      })))), D.length > 0 && (M == null || M(D), T)) {
        const $ = D.map((E) => ({ id: E.id, type: "remove" }));
        T($);
      }
    }
  }, []), d = P.useCallback((v) => {
    const S = k_(v), h = S ? null : t.getState().nodeInternals.get(v.id);
    return !S && !h ? [null, null, S] : [S ? v : bf(h), h, S];
  }, []), p = P.useCallback((v, S = !0, h) => {
    const [m, g, w] = d(v);
    return m ? (h || t.getState().getNodes()).filter((N) => {
      if (!w && (N.id === g.id || !N.positionAbsolute))
        return !1;
      const M = bf(N), z = Oa(M, m);
      return S && z > 0 || z >= m.width * m.height;
    }) : [];
  }, []), x = P.useCallback((v, S, h = !0) => {
    const [m] = d(v);
    if (!m)
      return !1;
    const g = Oa(m, S);
    return h && g > 0 || g >= m.width * m.height;
  }, []);
  return P.useMemo(() => ({
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
const rk = { actInsideInputWithModifier: !1 };
var ok = ({ deleteKeyCode: e, multiSelectionKeyCode: t }) => {
  const n = Se(), { deleteElements: r } = oc(), o = Qo(e, rk), i = Qo(t);
  P.useEffect(() => {
    if (o) {
      const { edges: s, getNodes: l } = n.getState(), a = l().filter((c) => c.selected), u = s.filter((c) => c.selected);
      r({ nodes: a, edges: u }), n.setState({ nodesSelectionActive: !1 });
    }
  }, [o]), P.useEffect(() => {
    n.setState({ multiSelectionActive: i });
  }, [i]);
};
function ik(e) {
  const t = Se();
  P.useEffect(() => {
    let n;
    const r = () => {
      var i, s;
      if (!e.current)
        return;
      const o = Qu(e.current);
      (o.height === 0 || o.width === 0) && ((s = (i = t.getState()).onError) == null || s.call(i, "004", Gt.error004())), t.setState({ width: o.width || 500, height: o.height || 500 });
    };
    return r(), window.addEventListener("resize", r), e.current && (n = new ResizeObserver(() => r()), n.observe(e.current)), () => {
      window.removeEventListener("resize", r), n && e.current && n.unobserve(e.current);
    };
  }, []);
}
const ic = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0
}, sk = (e, t) => e.x !== t.x || e.y !== t.y || e.zoom !== t.k, zi = (e) => ({
  x: e.x,
  y: e.y,
  zoom: e.k
}), sr = (e, t) => e.target.closest(`.${t}`), qf = (e, t) => t === 2 && Array.isArray(e) && e.includes(2), Jf = (e) => {
  const t = e.ctrlKey && Ss() ? 10 : 1;
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * t;
}, lk = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection,
  d3ZoomHandler: e.d3ZoomHandler,
  userSelectionActive: e.userSelectionActive
}), ak = ({ onMove: e, onMoveStart: t, onMoveEnd: n, onPaneContextMenu: r, zoomOnScroll: o = !0, zoomOnPinch: i = !0, panOnScroll: s = !1, panOnScrollSpeed: l = 0.5, panOnScrollMode: a = On.Free, zoomOnDoubleClick: u = !0, elementsSelectable: c, panOnDrag: f = !0, defaultViewport: d, translateExtent: p, minZoom: x, maxZoom: v, zoomActivationKeyCode: S, preventScrolling: h = !0, children: m, noWheelClassName: g, noPanClassName: w }) => {
  const N = P.useRef(), M = Se(), z = P.useRef(!1), T = P.useRef(!1), k = P.useRef(null), R = P.useRef({ x: 0, y: 0, zoom: 0 }), { d3Zoom: F, d3Selection: D, d3ZoomHandler: V, userSelectionActive: _ } = le(lk, Ce), C = Qo(S), j = P.useRef(0), L = P.useRef(!1), $ = P.useRef();
  return ik(k), P.useEffect(() => {
    if (k.current) {
      const E = k.current.getBoundingClientRect(), A = um().scaleExtent([x, v]).translateExtent(p), O = st(k.current).call(A), H = Bt.translate(d.x, d.y).scale(Vr(d.zoom, x, v)), U = [
        [0, 0],
        [E.width, E.height]
      ], B = A.constrain()(H, U, p);
      A.transform(O, B), A.wheelDelta(Jf), M.setState({
        d3Zoom: A,
        d3Selection: O,
        d3ZoomHandler: O.on("wheel.zoom"),
        // we need to pass transform because zoom handler is not registered when we set the initial transform
        transform: [B.x, B.y, B.k],
        domNode: k.current.closest(".react-flow")
      });
    }
  }, []), P.useEffect(() => {
    D && F && (s && !C && !_ ? D.on("wheel.zoom", (E) => {
      if (sr(E, g))
        return !1;
      E.preventDefault(), E.stopImmediatePropagation();
      const A = D.property("__zoom").k || 1;
      if (E.ctrlKey && i) {
        const re = vt(E), ne = Jf(E), te = A * Math.pow(2, ne);
        F.scaleTo(D, te, re, E);
        return;
      }
      const O = E.deltaMode === 1 ? 20 : 1;
      let H = a === On.Vertical ? 0 : E.deltaX * O, U = a === On.Horizontal ? 0 : E.deltaY * O;
      !Ss() && E.shiftKey && a !== On.Vertical && (H = E.deltaY * O, U = 0), F.translateBy(
        D,
        -(H / A) * l,
        -(U / A) * l,
        // @ts-ignore
        { internal: !0 }
      );
      const B = zi(D.property("__zoom")), { onViewportChangeStart: X, onViewportChange: Q, onViewportChangeEnd: Z } = M.getState();
      clearTimeout($.current), L.current || (L.current = !0, t == null || t(E, B), X == null || X(B)), L.current && (e == null || e(E, B), Q == null || Q(B), $.current = setTimeout(() => {
        n == null || n(E, B), Z == null || Z(B), L.current = !1;
      }, 150));
    }, { passive: !1 }) : typeof V < "u" && D.on("wheel.zoom", function(E, A) {
      if (!h && E.type === "wheel" && !E.ctrlKey || sr(E, g))
        return null;
      E.preventDefault(), V.call(this, E, A);
    }, { passive: !1 }));
  }, [
    _,
    s,
    a,
    D,
    F,
    V,
    C,
    i,
    h,
    g,
    t,
    e,
    n
  ]), P.useEffect(() => {
    F && F.on("start", (E) => {
      var H, U;
      if (!E.sourceEvent || E.sourceEvent.internal)
        return null;
      j.current = (H = E.sourceEvent) == null ? void 0 : H.button;
      const { onViewportChangeStart: A } = M.getState(), O = zi(E.transform);
      z.current = !0, R.current = O, ((U = E.sourceEvent) == null ? void 0 : U.type) === "mousedown" && M.setState({ paneDragging: !0 }), A == null || A(O), t == null || t(E.sourceEvent, O);
    });
  }, [F, t]), P.useEffect(() => {
    F && (_ && !z.current ? F.on("zoom", null) : _ || F.on("zoom", (E) => {
      var O;
      const { onViewportChange: A } = M.getState();
      if (M.setState({ transform: [E.transform.x, E.transform.y, E.transform.k] }), T.current = !!(r && qf(f, j.current ?? 0)), (e || A) && !((O = E.sourceEvent) != null && O.internal)) {
        const H = zi(E.transform);
        A == null || A(H), e == null || e(E.sourceEvent, H);
      }
    }));
  }, [_, F, e, f, r]), P.useEffect(() => {
    F && F.on("end", (E) => {
      if (!E.sourceEvent || E.sourceEvent.internal)
        return null;
      const { onViewportChangeEnd: A } = M.getState();
      if (z.current = !1, M.setState({ paneDragging: !1 }), r && qf(f, j.current ?? 0) && !T.current && r(E.sourceEvent), T.current = !1, (n || A) && sk(R.current, E.transform)) {
        const O = zi(E.transform);
        R.current = O, clearTimeout(N.current), N.current = setTimeout(() => {
          A == null || A(O), n == null || n(E.sourceEvent, O);
        }, s ? 150 : 0);
      }
    });
  }, [F, s, f, n, r]), P.useEffect(() => {
    F && F.filter((E) => {
      const A = C || o, O = i && E.ctrlKey;
      if ((f === !0 || Array.isArray(f) && f.includes(1)) && E.button === 1 && E.type === "mousedown" && (sr(E, "react-flow__node") || sr(E, "react-flow__edge")))
        return !0;
      if (!f && !A && !s && !u && !i || _ || !u && E.type === "dblclick" || sr(E, g) && E.type === "wheel" || sr(E, w) && (E.type !== "wheel" || s && E.type === "wheel" && !C) || !i && E.ctrlKey && E.type === "wheel" || !A && !s && !O && E.type === "wheel" || !f && (E.type === "mousedown" || E.type === "touchstart") || Array.isArray(f) && !f.includes(E.button) && E.type === "mousedown")
        return !1;
      const H = Array.isArray(f) && f.includes(E.button) || !E.button || E.button <= 1;
      return (!E.ctrlKey || E.type === "wheel") && H;
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
    C
  ]), I.createElement("div", { className: "react-flow__renderer", ref: k, style: ic }, m);
}, uk = (e) => ({
  userSelectionActive: e.userSelectionActive,
  userSelectionRect: e.userSelectionRect
});
function ck() {
  const { userSelectionActive: e, userSelectionRect: t } = le(uk, Ce);
  return e && t ? I.createElement("div", { className: "react-flow__selection react-flow__container", style: {
    width: t.width,
    height: t.height,
    transform: `translate(${t.x}px, ${t.y}px)`
  } }) : null;
}
function ed(e, t) {
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
function fk(e, t) {
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
            typeof l.position < "u" && (s.position = l.position), typeof l.positionAbsolute < "u" && (s.positionAbsolute = l.positionAbsolute), typeof l.dragging < "u" && (s.dragging = l.dragging), s.expandParent && ed(r, s);
            break;
          }
          case "dimensions": {
            typeof l.dimensions < "u" && (s.width = l.dimensions.width, s.height = l.dimensions.height), typeof l.updateStyle < "u" && (s.style = { ...s.style || {}, ...l.dimensions }), typeof l.resizing == "boolean" && (s.resizing = l.resizing), s.expandParent && ed(r, s);
            break;
          }
          case "remove":
            return r;
        }
    return r.push(s), r;
  }, n);
}
function dk(e, t) {
  return fk(e, t);
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
}, pk = (e) => ({
  userSelectionActive: e.userSelectionActive,
  elementsSelectable: e.elementsSelectable,
  dragging: e.paneDragging
}), Hm = P.memo(({ isSelecting: e, selectionMode: t = Go.Full, panOnDrag: n, onSelectionStart: r, onSelectionEnd: o, onPaneClick: i, onPaneContextMenu: s, onPaneScroll: l, onPaneMouseEnter: a, onPaneMouseMove: u, onPaneMouseLeave: c, children: f }) => {
  const d = P.useRef(null), p = Se(), x = P.useRef(0), v = P.useRef(0), S = P.useRef(), { userSelectionActive: h, elementsSelectable: m, dragging: g } = le(pk, Ce), w = () => {
    p.setState({ userSelectionActive: !1, userSelectionRect: null }), x.current = 0, v.current = 0;
  }, N = (V) => {
    i == null || i(V), p.getState().resetSelectedElements(), p.setState({ nodesSelectionActive: !1 });
  }, M = (V) => {
    if (Array.isArray(n) && (n != null && n.includes(2))) {
      V.preventDefault();
      return;
    }
    s == null || s(V);
  }, z = l ? (V) => l(V) : void 0, T = (V) => {
    const { resetSelectedElements: _, domNode: C } = p.getState();
    if (S.current = C == null ? void 0 : C.getBoundingClientRect(), !m || !e || V.button !== 0 || V.target !== d.current || !S.current)
      return;
    const { x: j, y: L } = wn(V, S.current);
    _(), p.setState({
      userSelectionRect: {
        width: 0,
        height: 0,
        startX: j,
        startY: L,
        x: j,
        y: L
      }
    }), r == null || r(V);
  }, k = (V) => {
    const { userSelectionRect: _, nodeInternals: C, edges: j, transform: L, onNodesChange: $, onEdgesChange: E, nodeOrigin: A, getNodes: O } = p.getState();
    if (!e || !S.current || !_)
      return;
    p.setState({ userSelectionActive: !0, nodesSelectionActive: !1 });
    const H = wn(V, S.current), U = _.startX ?? 0, B = _.startY ?? 0, X = {
      ..._,
      x: H.x < U ? H.x : U,
      y: H.y < B ? H.y : B,
      width: Math.abs(H.x - U),
      height: Math.abs(H.y - B)
    }, Q = O(), Z = km(C, X, L, t === Go.Partial, !0, A), re = Sm(Z, j).map((te) => te.id), ne = Z.map((te) => te.id);
    if (x.current !== ne.length) {
      x.current = ne.length;
      const te = _r(Q, ne);
      te.length && ($ == null || $(te));
    }
    if (v.current !== re.length) {
      v.current = re.length;
      const te = _r(j, re);
      te.length && (E == null || E(te));
    }
    p.setState({
      userSelectionRect: X
    });
  }, R = (V) => {
    if (V.button !== 0)
      return;
    const { userSelectionRect: _ } = p.getState();
    !h && _ && V.target === d.current && (N == null || N(V)), p.setState({ nodesSelectionActive: x.current > 0 }), w(), o == null || o(V);
  }, F = (V) => {
    h && (p.setState({ nodesSelectionActive: x.current > 0 }), o == null || o(V)), w();
  }, D = m && (e || h);
  return I.createElement(
    "div",
    { className: Te(["react-flow__pane", { dragging: g, selection: e }]), onClick: D ? void 0 : $l(N, d), onContextMenu: $l(M, d), onWheel: $l(z, d), onMouseEnter: D ? void 0 : a, onMouseDown: D ? T : void 0, onMouseMove: D ? k : u, onMouseUp: D ? R : void 0, onMouseLeave: D ? F : c, ref: d, style: ic },
    f,
    I.createElement(ck, null)
  );
});
Hm.displayName = "Pane";
function Vm(e, t) {
  const n = e.parentNode || e.parentId;
  if (!n)
    return !1;
  const r = t.get(n);
  return r ? r.selected ? !0 : Vm(r, t) : !1;
}
function td(e, t, n) {
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
function hk(e, t, n, r) {
  return Array.from(e.values()).filter((o) => (o.selected || o.id === r) && (!o.parentNode || o.parentId || !Vm(o, e)) && (o.draggable || t && typeof o.draggable > "u")).map((o) => {
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
function mk(e, t) {
  return !t || t === "parent" ? t : [t[0], [t[1][0] - (e.width || 0), t[1][1] - (e.height || 0)]];
}
function bm(e, t, n, r, o = [0, 0], i) {
  const s = mk(e, e.extent || r);
  let l = s;
  const a = e.parentNode || e.parentId;
  if (e.extent === "parent" && !e.expandParent)
    if (a && e.width && e.height) {
      const f = n.get(a), { x: d, y: p } = bn(f, o).positionAbsolute;
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
    const f = n.get(a), { x: d, y: p } = bn(f, o).positionAbsolute;
    l = [
      [e.extent[0][0] + d, e.extent[0][1] + p],
      [e.extent[1][0] + d, e.extent[1][1] + p]
    ];
  }
  let u = { x: 0, y: 0 };
  if (a) {
    const f = n.get(a);
    u = bn(f, o).positionAbsolute;
  }
  const c = l && l !== "parent" ? Zu(t, l) : t;
  return {
    position: {
      x: c.x - u.x,
      y: c.y - u.y
    },
    positionAbsolute: c
  };
}
function Rl({ nodeId: e, dragItems: t, nodeInternals: n }) {
  const r = t.map((o) => ({
    ...n.get(o.id),
    position: o.position,
    positionAbsolute: o.positionAbsolute
  }));
  return [e ? r.find((o) => o.id === e) : r[0], r];
}
const nd = (e, t, n, r) => {
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
      ...Qu(a)
    };
  });
};
function lo(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().nodeInternals.get(e);
    o && n(r, { ...o });
  };
}
function Ua({ id: e, store: t, unselect: n = !1, nodeRef: r }) {
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
function gk() {
  const e = Se();
  return P.useCallback(({ sourceEvent: n }) => {
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
function Al(e) {
  return (t, n, r) => e == null ? void 0 : e(t, r);
}
function Bm({ nodeRef: e, disabled: t = !1, noDragClassName: n, handleSelector: r, nodeId: o, isSelectable: i, selectNodesOnDrag: s }) {
  const l = Se(), [a, u] = P.useState(!1), c = P.useRef([]), f = P.useRef({ x: null, y: null }), d = P.useRef(0), p = P.useRef(null), x = P.useRef({ x: 0, y: 0 }), v = P.useRef(null), S = P.useRef(!1), h = P.useRef(!1), m = P.useRef(!1), g = gk();
  return P.useEffect(() => {
    if (e != null && e.current) {
      const w = st(e.current), N = ({ x: T, y: k }) => {
        const { nodeInternals: R, onNodeDrag: F, onSelectionDrag: D, updateNodePositions: V, nodeExtent: _, snapGrid: C, snapToGrid: j, nodeOrigin: L, onError: $ } = l.getState();
        f.current = { x: T, y: k };
        let E = !1, A = { x: 0, y: 0, x2: 0, y2: 0 };
        if (c.current.length > 1 && _) {
          const H = Gs(c.current, L);
          A = Ko(H);
        }
        if (c.current = c.current.map((H) => {
          const U = { x: T - H.distance.x, y: k - H.distance.y };
          j && (U.x = C[0] * Math.round(U.x / C[0]), U.y = C[1] * Math.round(U.y / C[1]));
          const B = [
            [_[0][0], _[0][1]],
            [_[1][0], _[1][1]]
          ];
          c.current.length > 1 && _ && !H.extent && (B[0][0] = H.positionAbsolute.x - A.x + _[0][0], B[1][0] = H.positionAbsolute.x + (H.width ?? 0) - A.x2 + _[1][0], B[0][1] = H.positionAbsolute.y - A.y + _[0][1], B[1][1] = H.positionAbsolute.y + (H.height ?? 0) - A.y2 + _[1][1]);
          const X = bm(H, U, R, B, L, $);
          return E = E || H.position.x !== X.position.x || H.position.y !== X.position.y, H.position = X.position, H.positionAbsolute = X.positionAbsolute, H;
        }), !E)
          return;
        V(c.current, !0, !0), u(!0);
        const O = o ? F : Al(D);
        if (O && v.current) {
          const [H, U] = Rl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: R
          });
          O(v.current, H, U);
        }
      }, M = () => {
        if (!p.current)
          return;
        const [T, k] = fm(x.current, p.current);
        if (T !== 0 || k !== 0) {
          const { transform: R, panBy: F } = l.getState();
          f.current.x = (f.current.x ?? 0) - T / R[2], f.current.y = (f.current.y ?? 0) - k / R[2], F({ x: T, y: k }) && N(f.current);
        }
        d.current = requestAnimationFrame(M);
      }, z = (T) => {
        var L;
        const { nodeInternals: k, multiSelectionActive: R, nodesDraggable: F, unselectNodesAndEdges: D, onNodeDragStart: V, onSelectionDragStart: _ } = l.getState();
        h.current = !0;
        const C = o ? V : Al(_);
        (!s || !i) && !R && o && ((L = k.get(o)) != null && L.selected || D()), o && i && s && Ua({
          id: o,
          store: l,
          nodeRef: e
        });
        const j = g(T);
        if (f.current = j, c.current = hk(k, F, j, o), C && c.current) {
          const [$, E] = Rl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: k
          });
          C(T.sourceEvent, $, E);
        }
      };
      if (t)
        w.on(".drag", null);
      else {
        const T = Cx().on("start", (k) => {
          const { domNode: R, nodeDragThreshold: F } = l.getState();
          F === 0 && z(k), m.current = !1;
          const D = g(k);
          f.current = D, p.current = (R == null ? void 0 : R.getBoundingClientRect()) || null, x.current = wn(k.sourceEvent, p.current);
        }).on("drag", (k) => {
          var V, _;
          const R = g(k), { autoPanOnNodeDrag: F, nodeDragThreshold: D } = l.getState();
          if (k.sourceEvent.type === "touchmove" && k.sourceEvent.touches.length > 1 && (m.current = !0), !m.current) {
            if (!S.current && h.current && F && (S.current = !0, M()), !h.current) {
              const C = R.xSnapped - (((V = f == null ? void 0 : f.current) == null ? void 0 : V.x) ?? 0), j = R.ySnapped - (((_ = f == null ? void 0 : f.current) == null ? void 0 : _.y) ?? 0);
              Math.sqrt(C * C + j * j) > D && z(k);
            }
            (f.current.x !== R.xSnapped || f.current.y !== R.ySnapped) && c.current && h.current && (v.current = k.sourceEvent, x.current = wn(k.sourceEvent, p.current), N(R));
          }
        }).on("end", (k) => {
          if (!(!h.current || m.current) && (u(!1), S.current = !1, h.current = !1, cancelAnimationFrame(d.current), c.current)) {
            const { updateNodePositions: R, nodeInternals: F, onNodeDragStop: D, onSelectionDragStop: V } = l.getState(), _ = o ? D : Al(V);
            if (R(c.current, !1, !1), _) {
              const [C, j] = Rl({
                nodeId: o,
                dragItems: c.current,
                nodeInternals: F
              });
              _(k.sourceEvent, C, j);
            }
          }
        }).filter((k) => {
          const R = k.target;
          return !k.button && (!n || !td(R, `.${n}`, e)) && (!r || td(R, r, e));
        });
        return w.call(T), () => {
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
function Um() {
  const e = Se();
  return P.useCallback((n) => {
    const { nodeInternals: r, nodeExtent: o, updateNodePositions: i, getNodes: s, snapToGrid: l, snapGrid: a, onError: u, nodesDraggable: c } = e.getState(), f = s().filter((m) => m.selected && (m.draggable || c && typeof m.draggable > "u")), d = l ? a[0] : 5, p = l ? a[1] : 5, x = n.isShiftPressed ? 4 : 1, v = n.x * d * x, S = n.y * p * x, h = f.map((m) => {
      if (m.positionAbsolute) {
        const g = { x: m.positionAbsolute.x + v, y: m.positionAbsolute.y + S };
        l && (g.x = a[0] * Math.round(g.x / a[0]), g.y = a[1] * Math.round(g.y / a[1]));
        const { positionAbsolute: w, position: N } = bm(m, g, r, o, void 0, u);
        m.position = N, m.positionAbsolute = w;
      }
      return m;
    });
    i(h, !0, !1);
  }, []);
}
const zr = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
var ao = (e) => {
  const t = ({ id: n, type: r, data: o, xPos: i, yPos: s, xPosOrigin: l, yPosOrigin: a, selected: u, onClick: c, onMouseEnter: f, onMouseMove: d, onMouseLeave: p, onContextMenu: x, onDoubleClick: v, style: S, className: h, isDraggable: m, isSelectable: g, isConnectable: w, isFocusable: N, selectNodesOnDrag: M, sourcePosition: z, targetPosition: T, hidden: k, resizeObserver: R, dragHandle: F, zIndex: D, isParent: V, noDragClassName: _, noPanClassName: C, initialized: j, disableKeyboardA11y: L, ariaLabel: $, rfId: E, hasHandleBounds: A }) => {
    const O = Se(), H = P.useRef(null), U = P.useRef(null), B = P.useRef(z), X = P.useRef(T), Q = P.useRef(r), Z = g || m || c || f || d || p, re = Um(), ne = lo(n, O.getState, f), te = lo(n, O.getState, d), je = lo(n, O.getState, p), we = lo(n, O.getState, x), Oe = lo(n, O.getState, v), $e = (ie) => {
      const { nodeDragThreshold: G } = O.getState();
      if (g && (!M || !m || G > 0) && Ua({
        id: n,
        store: O,
        nodeRef: H
      }), c) {
        const Fe = O.getState().nodeInternals.get(n);
        Fe && c(ie, { ...Fe });
      }
    }, ge = (ie) => {
      if (!Fa(ie) && !L)
        if (mm.includes(ie.key) && g) {
          const G = ie.key === "Escape";
          Ua({
            id: n,
            store: O,
            unselect: G,
            nodeRef: H
          });
        } else m && u && Object.prototype.hasOwnProperty.call(zr, ie.key) && (O.setState({
          ariaLiveMessage: `Moved selected node ${ie.key.replace("Arrow", "").toLowerCase()}. New position, x: ${~~i}, y: ${~~s}`
        }), re({
          x: zr[ie.key].x,
          y: zr[ie.key].y,
          isShiftPressed: ie.shiftKey
        }));
    };
    P.useEffect(() => () => {
      U.current && (R == null || R.unobserve(U.current), U.current = null);
    }, []), P.useEffect(() => {
      if (H.current && !k) {
        const ie = H.current;
        (!j || !A || U.current !== ie) && (U.current && (R == null || R.unobserve(U.current)), R == null || R.observe(ie), U.current = ie);
      }
    }, [k, j, A]), P.useEffect(() => {
      const ie = Q.current !== r, G = B.current !== z, Fe = X.current !== T;
      H.current && (ie || G || Fe) && (ie && (Q.current = r), G && (B.current = z), Fe && (X.current = T), O.getState().updateNodeDimensions([{ id: n, nodeElement: H.current, forceUpdate: !0 }]));
    }, [n, r, z, T]);
    const Qe = Bm({
      nodeRef: H,
      disabled: k || !m,
      noDragClassName: _,
      handleSelector: F,
      nodeId: n,
      isSelectable: g,
      selectNodesOnDrag: M
    });
    return k ? null : I.createElement(
      "div",
      { className: Te([
        "react-flow__node",
        `react-flow__node-${r}`,
        {
          // this is overwritable by passing `nopan` as a class name
          [C]: m
        },
        h,
        {
          selected: u,
          selectable: g,
          parent: V,
          dragging: Qe
        }
      ]), ref: H, style: {
        zIndex: D,
        transform: `translate(${l}px,${a}px)`,
        pointerEvents: Z ? "all" : "none",
        visibility: j ? "visible" : "hidden",
        ...S
      }, "data-id": n, "data-testid": `rf__node-${n}`, onMouseEnter: ne, onMouseMove: te, onMouseLeave: je, onContextMenu: we, onClick: $e, onDoubleClick: Oe, onKeyDown: N ? ge : void 0, tabIndex: N ? 0 : void 0, role: N ? "button" : void 0, "aria-describedby": L ? void 0 : `${Im}-${E}`, "aria-label": $ },
      I.createElement(
        M_,
        { value: n },
        I.createElement(e, { id: n, data: o, type: r, xPos: i, yPos: s, selected: u, isConnectable: w, sourcePosition: z, targetPosition: T, dragging: Qe, dragHandle: F, zIndex: D })
      )
    );
  };
  return t.displayName = "NodeWrapper", P.memo(t);
};
const yk = (e) => {
  const t = e.getNodes().filter((n) => n.selected);
  return {
    ...Gs(t, e.nodeOrigin),
    transformString: `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`,
    userSelectionActive: e.userSelectionActive
  };
};
function vk({ onSelectionContextMenu: e, noPanClassName: t, disableKeyboardA11y: n }) {
  const r = Se(), { width: o, height: i, x: s, y: l, transformString: a, userSelectionActive: u } = le(yk, Ce), c = Um(), f = P.useRef(null);
  if (P.useEffect(() => {
    var x;
    n || (x = f.current) == null || x.focus({
      preventScroll: !0
    });
  }, [n]), Bm({
    nodeRef: f
  }), u || !o || !i)
    return null;
  const d = e ? (x) => {
    const v = r.getState().getNodes().filter((S) => S.selected);
    e(x, v);
  } : void 0, p = (x) => {
    Object.prototype.hasOwnProperty.call(zr, x.key) && c({
      x: zr[x.key].x,
      y: zr[x.key].y,
      isShiftPressed: x.shiftKey
    });
  };
  return I.createElement(
    "div",
    { className: Te(["react-flow__nodesselection", "react-flow__container", t]), style: {
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
var wk = P.memo(vk);
const xk = (e) => e.nodesSelectionActive, Wm = ({ children: e, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, deleteKeyCode: l, onMove: a, onMoveStart: u, onMoveEnd: c, selectionKeyCode: f, selectionOnDrag: d, selectionMode: p, onSelectionStart: x, onSelectionEnd: v, multiSelectionKeyCode: S, panActivationKeyCode: h, zoomActivationKeyCode: m, elementsSelectable: g, zoomOnScroll: w, zoomOnPinch: N, panOnScroll: M, panOnScrollSpeed: z, panOnScrollMode: T, zoomOnDoubleClick: k, panOnDrag: R, defaultViewport: F, translateExtent: D, minZoom: V, maxZoom: _, preventScrolling: C, onSelectionContextMenu: j, noWheelClassName: L, noPanClassName: $, disableKeyboardA11y: E }) => {
  const A = le(xk), O = Qo(f), H = Qo(h), U = H || R, B = H || M, X = O || d && U !== !0;
  return ok({ deleteKeyCode: l, multiSelectionKeyCode: S }), I.createElement(
    ak,
    { onMove: a, onMoveStart: u, onMoveEnd: c, onPaneContextMenu: i, elementsSelectable: g, zoomOnScroll: w, zoomOnPinch: N, panOnScroll: B, panOnScrollSpeed: z, panOnScrollMode: T, zoomOnDoubleClick: k, panOnDrag: !O && U, defaultViewport: F, translateExtent: D, minZoom: V, maxZoom: _, zoomActivationKeyCode: m, preventScrolling: C, noWheelClassName: L, noPanClassName: $ },
    I.createElement(
      Hm,
      { onSelectionStart: x, onSelectionEnd: v, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, panOnDrag: U, isSelecting: !!X, selectionMode: p },
      e,
      A && I.createElement(wk, { onSelectionContextMenu: j, noPanClassName: $, disableKeyboardA11y: E })
    )
  );
};
Wm.displayName = "FlowRenderer";
var _k = P.memo(Wm);
function kk(e) {
  return le(P.useCallback((n) => e ? km(n.nodeInternals, { x: 0, y: 0, width: n.width, height: n.height }, n.transform, !0) : n.getNodes(), [e]));
}
function Sk(e) {
  const t = {
    input: ao(e.input || Tm),
    default: ao(e.default || Ba),
    output: ao(e.output || Rm),
    group: ao(e.group || rc)
  }, n = {}, r = Object.keys(e).filter((o) => !["input", "default", "output", "group"].includes(o)).reduce((o, i) => (o[i] = ao(e[i] || Ba), o), n);
  return {
    ...t,
    ...r
  };
}
const Ek = ({ x: e, y: t, width: n, height: r, origin: o }) => !n || !r ? { x: e, y: t } : o[0] < 0 || o[1] < 0 || o[0] > 1 || o[1] > 1 ? { x: e, y: t } : {
  x: e - n * o[0],
  y: t - r * o[1]
}, Nk = (e) => ({
  nodesDraggable: e.nodesDraggable,
  nodesConnectable: e.nodesConnectable,
  nodesFocusable: e.nodesFocusable,
  elementsSelectable: e.elementsSelectable,
  updateNodeDimensions: e.updateNodeDimensions,
  onError: e.onError
}), Ym = (e) => {
  const { nodesDraggable: t, nodesConnectable: n, nodesFocusable: r, elementsSelectable: o, updateNodeDimensions: i, onError: s } = le(Nk, Ce), l = kk(e.onlyRenderVisibleElements), a = P.useRef(), u = P.useMemo(() => {
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
  return P.useEffect(() => () => {
    var c;
    (c = a == null ? void 0 : a.current) == null || c.disconnect();
  }, []), I.createElement("div", { className: "react-flow__nodes", style: ic }, l.map((c) => {
    var N, M, z;
    let f = c.type || "default";
    e.nodeTypes[f] || (s == null || s("003", Gt.error003(f)), f = "default");
    const d = e.nodeTypes[f] || e.nodeTypes.default, p = !!(c.draggable || t && typeof c.draggable > "u"), x = !!(c.selectable || o && typeof c.selectable > "u"), v = !!(c.connectable || n && typeof c.connectable > "u"), S = !!(c.focusable || r && typeof c.focusable > "u"), h = e.nodeExtent ? Zu(c.positionAbsolute, e.nodeExtent) : c.positionAbsolute, m = (h == null ? void 0 : h.x) ?? 0, g = (h == null ? void 0 : h.y) ?? 0, w = Ek({
      x: m,
      y: g,
      width: c.width ?? 0,
      height: c.height ?? 0,
      origin: e.nodeOrigin
    });
    return I.createElement(d, { key: c.id, id: c.id, className: c.className, style: c.style, type: f, data: c.data, sourcePosition: c.sourcePosition || K.Bottom, targetPosition: c.targetPosition || K.Top, hidden: c.hidden, xPos: m, yPos: g, xPosOrigin: w.x, yPosOrigin: w.y, selectNodesOnDrag: e.selectNodesOnDrag, onClick: e.onNodeClick, onMouseEnter: e.onNodeMouseEnter, onMouseMove: e.onNodeMouseMove, onMouseLeave: e.onNodeMouseLeave, onContextMenu: e.onNodeContextMenu, onDoubleClick: e.onNodeDoubleClick, selected: !!c.selected, isDraggable: p, isSelectable: x, isConnectable: v, isFocusable: S, resizeObserver: u, dragHandle: c.dragHandle, zIndex: ((N = c[me]) == null ? void 0 : N.z) ?? 0, isParent: !!((M = c[me]) != null && M.isParent), noDragClassName: e.noDragClassName, noPanClassName: e.noPanClassName, initialized: !!c.width && !!c.height, rfId: e.rfId, disableKeyboardA11y: e.disableKeyboardA11y, ariaLabel: c.ariaLabel, hasHandleBounds: !!((z = c[me]) != null && z.handleBounds) });
  }));
};
Ym.displayName = "NodeRenderer";
var Ck = P.memo(Ym);
const jk = (e, t, n) => n === K.Left ? e - t : n === K.Right ? e + t : e, Pk = (e, t, n) => n === K.Top ? e - t : n === K.Bottom ? e + t : e, rd = "react-flow__edgeupdater", od = ({ position: e, centerX: t, centerY: n, radius: r = 10, onMouseDown: o, onMouseEnter: i, onMouseOut: s, type: l }) => I.createElement("circle", { onMouseDown: o, onMouseEnter: i, onMouseOut: s, className: Te([rd, `${rd}-${l}`]), cx: jk(t, r, e), cy: Pk(n, r, e), r, stroke: "transparent", fill: "transparent" }), Mk = () => !0;
var lr = (e) => {
  const t = ({ id: n, className: r, type: o, data: i, onClick: s, onEdgeDoubleClick: l, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: x, labelBgBorderRadius: v, style: S, source: h, target: m, sourceX: g, sourceY: w, targetX: N, targetY: M, sourcePosition: z, targetPosition: T, elementsSelectable: k, hidden: R, sourceHandleId: F, targetHandleId: D, onContextMenu: V, onMouseEnter: _, onMouseMove: C, onMouseLeave: j, reconnectRadius: L, onReconnect: $, onReconnectStart: E, onReconnectEnd: A, markerEnd: O, markerStart: H, rfId: U, ariaLabel: B, isFocusable: X, isReconnectable: Q, pathOptions: Z, interactionWidth: re, disableKeyboardA11y: ne }) => {
    const te = P.useRef(null), [je, we] = P.useState(!1), [Oe, $e] = P.useState(!1), ge = Se(), Qe = P.useMemo(() => `url('#${Va(H, U)}')`, [H, U]), ie = P.useMemo(() => `url('#${Va(O, U)}')`, [O, U]);
    if (R)
      return null;
    const G = (Re) => {
      var Nt;
      const { edges: pt, addSelectedEdges: jn, unselectNodesAndEdges: Pn, multiSelectionActive: Mn } = ge.getState(), It = pt.find((Kr) => Kr.id === n);
      It && (k && (ge.setState({ nodesSelectionActive: !1 }), It.selected && Mn ? (Pn({ nodes: [], edges: [It] }), (Nt = te.current) == null || Nt.blur()) : jn([n])), s && s(Re, It));
    }, Fe = so(n, ge.getState, l), Rt = so(n, ge.getState, V), Yr = so(n, ge.getState, _), qn = so(n, ge.getState, C), Jn = so(n, ge.getState, j), At = (Re, pt) => {
      if (Re.button !== 0)
        return;
      const { edges: jn, isValidConnection: Pn } = ge.getState(), Mn = pt ? m : h, It = (pt ? D : F) || null, Nt = pt ? "target" : "source", Kr = Pn || Mk, Qs = pt, Gr = jn.find((zn) => zn.id === n);
      $e(!0), E == null || E(Re, Gr, Nt);
      const Zs = (zn) => {
        $e(!1), A == null || A(zn, Gr, Nt);
      };
      jm({
        event: Re,
        handleId: It,
        nodeId: Mn,
        onConnect: (zn) => $ == null ? void 0 : $(Gr, zn),
        isTarget: Qs,
        getState: ge.getState,
        setState: ge.setState,
        isValidConnection: Kr,
        edgeUpdaterType: Nt,
        onReconnectEnd: Zs
      });
    }, er = (Re) => At(Re, !0), Nn = (Re) => At(Re, !1), Cn = () => we(!0), tr = () => we(!1), nr = !k && !s, Xr = (Re) => {
      var pt;
      if (!ne && mm.includes(Re.key) && k) {
        const { unselectNodesAndEdges: jn, addSelectedEdges: Pn, edges: Mn } = ge.getState();
        Re.key === "Escape" ? ((pt = te.current) == null || pt.blur(), jn({ edges: [Mn.find((Nt) => Nt.id === n)] })) : Pn([n]);
      }
    };
    return I.createElement(
      "g",
      { className: Te([
        "react-flow__edge",
        `react-flow__edge-${o}`,
        r,
        { selected: a, animated: u, inactive: nr, updating: je }
      ]), onClick: G, onDoubleClick: Fe, onContextMenu: Rt, onMouseEnter: Yr, onMouseMove: qn, onMouseLeave: Jn, onKeyDown: X ? Xr : void 0, tabIndex: X ? 0 : void 0, role: X ? "button" : "img", "data-testid": `rf__edge-${n}`, "aria-label": B === null ? void 0 : B || `Edge from ${h} to ${m}`, "aria-describedby": X ? `${Lm}-${U}` : void 0, ref: te },
      !Oe && I.createElement(e, { id: n, source: h, target: m, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: x, labelBgBorderRadius: v, data: i, style: S, sourceX: g, sourceY: w, targetX: N, targetY: M, sourcePosition: z, targetPosition: T, sourceHandleId: F, targetHandleId: D, markerStart: Qe, markerEnd: ie, pathOptions: Z, interactionWidth: re }),
      Q && I.createElement(
        I.Fragment,
        null,
        (Q === "source" || Q === !0) && I.createElement(od, { position: z, centerX: g, centerY: w, radius: L, onMouseDown: er, onMouseEnter: Cn, onMouseOut: tr, type: "source" }),
        (Q === "target" || Q === !0) && I.createElement(od, { position: T, centerX: N, centerY: M, radius: L, onMouseDown: Nn, onMouseEnter: Cn, onMouseOut: tr, type: "target" })
      )
    );
  };
  return t.displayName = "EdgeWrapper", P.memo(t);
};
function zk(e) {
  const t = {
    default: lr(e.default || Ns),
    straight: lr(e.bezier || ec),
    step: lr(e.step || Ju),
    smoothstep: lr(e.step || Ks),
    simplebezier: lr(e.simplebezier || qu)
  }, n = {}, r = Object.keys(e).filter((o) => !["default", "bezier"].includes(o)).reduce((o, i) => (o[i] = lr(e[i] || Ns), o), n);
  return {
    ...t,
    ...r
  };
}
function id(e, t, n = null) {
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
function sd(e, t) {
  return e ? e.length === 1 || !t ? e[0] : t && e.find((n) => n.id === t) || null : null;
}
const Tk = (e, t, n, r, o, i) => {
  const s = id(n, e, t), l = id(i, r, o);
  return {
    sourceX: s.x,
    sourceY: s.y,
    targetX: l.x,
    targetY: l.y
  };
};
function $k({ sourcePos: e, targetPos: t, sourceWidth: n, sourceHeight: r, targetWidth: o, targetHeight: i, width: s, height: l, transform: a }) {
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
function ld(e) {
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
const Rk = [{ level: 0, isMaxLevel: !0, edges: [] }];
function Ak(e, t, n = !1) {
  let r = -1;
  const o = e.reduce((s, l) => {
    var c, f;
    const a = at(l.zIndex);
    let u = a ? l.zIndex : 0;
    if (n) {
      const d = t.get(l.target), p = t.get(l.source), x = l.selected || (d == null ? void 0 : d.selected) || (p == null ? void 0 : p.selected), v = Math.max(((c = p == null ? void 0 : p[me]) == null ? void 0 : c.z) || 0, ((f = d == null ? void 0 : d[me]) == null ? void 0 : f.z) || 0, 1e3);
      u = (a ? l.zIndex : 0) + (x ? v : 0);
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
  return i.length === 0 ? Rk : i;
}
function Ik(e, t, n) {
  const r = le(P.useCallback((o) => e ? o.edges.filter((i) => {
    const s = t.get(i.source), l = t.get(i.target);
    return (s == null ? void 0 : s.width) && (s == null ? void 0 : s.height) && (l == null ? void 0 : l.width) && (l == null ? void 0 : l.height) && $k({
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
  return Ak(r, t, n);
}
const Lk = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", points: "-5,-4 0,0 -5,4" }), Dk = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  fill: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" }), ad = {
  [Es.Arrow]: Lk,
  [Es.ArrowClosed]: Dk
};
function Ok(e) {
  const t = Se();
  return P.useMemo(() => {
    var o, i;
    return Object.prototype.hasOwnProperty.call(ad, e) ? ad[e] : ((i = (o = t.getState()).onError) == null || i.call(o, "009", Gt.error009(e)), null);
  }, [e]);
}
const Fk = ({ id: e, type: t, color: n, width: r = 12.5, height: o = 12.5, markerUnits: i = "strokeWidth", strokeWidth: s, orient: l = "auto-start-reverse" }) => {
  const a = Ok(t);
  return a ? I.createElement(
    "marker",
    { className: "react-flow__arrowhead", id: e, markerWidth: `${r}`, markerHeight: `${o}`, viewBox: "-10 -10 20 20", markerUnits: i, orient: l, refX: "0", refY: "0" },
    I.createElement(a, { color: n, strokeWidth: s })
  ) : null;
}, Hk = ({ defaultColor: e, rfId: t }) => (n) => {
  const r = [];
  return n.edges.reduce((o, i) => ([i.markerStart, i.markerEnd].forEach((s) => {
    if (s && typeof s == "object") {
      const l = Va(s, t);
      r.includes(l) || (o.push({ id: l, color: s.color || e, ...s }), r.push(l));
    }
  }), o), []).sort((o, i) => o.id.localeCompare(i.id));
}, Xm = ({ defaultColor: e, rfId: t }) => {
  const n = le(
    P.useCallback(Hk({ defaultColor: e, rfId: t }), [e, t]),
    // the id includes all marker options, so we just need to look at that part of the marker
    (r, o) => !(r.length !== o.length || r.some((i, s) => i.id !== o[s].id))
  );
  return I.createElement("defs", null, n.map((r) => I.createElement(Fk, { id: r.id, key: r.id, type: r.type, color: r.color, width: r.width, height: r.height, markerUnits: r.markerUnits, strokeWidth: r.strokeWidth, orient: r.orient })));
};
Xm.displayName = "MarkerDefinitions";
var Vk = P.memo(Xm);
const bk = (e) => ({
  nodesConnectable: e.nodesConnectable,
  edgesFocusable: e.edgesFocusable,
  edgesUpdatable: e.edgesUpdatable,
  elementsSelectable: e.elementsSelectable,
  width: e.width,
  height: e.height,
  connectionMode: e.connectionMode,
  nodeInternals: e.nodeInternals,
  onError: e.onError
}), Km = ({ defaultMarkerColor: e, onlyRenderVisibleElements: t, elevateEdgesOnSelect: n, rfId: r, edgeTypes: o, noPanClassName: i, onEdgeContextMenu: s, onEdgeMouseEnter: l, onEdgeMouseMove: a, onEdgeMouseLeave: u, onEdgeClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: x, reconnectRadius: v, children: S, disableKeyboardA11y: h }) => {
  const { edgesFocusable: m, edgesUpdatable: g, elementsSelectable: w, width: N, height: M, connectionMode: z, nodeInternals: T, onError: k } = le(bk, Ce), R = Ik(t, T, n);
  return N ? I.createElement(
    I.Fragment,
    null,
    R.map(({ level: F, edges: D, isMaxLevel: V }) => I.createElement(
      "svg",
      { key: F, style: { zIndex: F }, width: N, height: M, className: "react-flow__edges react-flow__container" },
      V && I.createElement(Vk, { defaultColor: e, rfId: r }),
      I.createElement("g", null, D.map((_) => {
        const [C, j, L] = ld(T.get(_.source)), [$, E, A] = ld(T.get(_.target));
        if (!L || !A)
          return null;
        let O = _.type || "default";
        o[O] || (k == null || k("011", Gt.error011(O)), O = "default");
        const H = o[O] || o.default, U = z === Gn.Strict ? E.target : (E.target ?? []).concat(E.source ?? []), B = sd(j.source, _.sourceHandle), X = sd(U, _.targetHandle), Q = (B == null ? void 0 : B.position) || K.Bottom, Z = (X == null ? void 0 : X.position) || K.Top, re = !!(_.focusable || m && typeof _.focusable > "u"), ne = _.reconnectable || _.updatable, te = typeof d < "u" && (ne || g && typeof ne > "u");
        if (!B || !X)
          return k == null || k("008", Gt.error008(B, _)), null;
        const { sourceX: je, sourceY: we, targetX: Oe, targetY: $e } = Tk(C, B, Q, $, X, Z);
        return I.createElement(H, { key: _.id, id: _.id, className: Te([_.className, i]), type: O, data: _.data, selected: !!_.selected, animated: !!_.animated, hidden: !!_.hidden, label: _.label, labelStyle: _.labelStyle, labelShowBg: _.labelShowBg, labelBgStyle: _.labelBgStyle, labelBgPadding: _.labelBgPadding, labelBgBorderRadius: _.labelBgBorderRadius, style: _.style, source: _.source, target: _.target, sourceHandleId: _.sourceHandle, targetHandleId: _.targetHandle, markerEnd: _.markerEnd, markerStart: _.markerStart, sourceX: je, sourceY: we, targetX: Oe, targetY: $e, sourcePosition: Q, targetPosition: Z, elementsSelectable: w, onContextMenu: s, onMouseEnter: l, onMouseMove: a, onMouseLeave: u, onClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: x, reconnectRadius: v, rfId: r, ariaLabel: _.ariaLabel, isFocusable: re, isReconnectable: te, pathOptions: "pathOptions" in _ ? _.pathOptions : void 0, interactionWidth: _.interactionWidth, disableKeyboardA11y: h });
      }))
    )),
    S
  ) : null;
};
Km.displayName = "EdgeRenderer";
var Bk = P.memo(Km);
const Uk = (e) => `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`;
function Wk({ children: e }) {
  const t = le(Uk);
  return I.createElement("div", { className: "react-flow__viewport react-flow__container", style: { transform: t } }, e);
}
function Yk(e) {
  const t = oc(), n = P.useRef(!1);
  P.useEffect(() => {
    !n.current && t.viewportInitialized && e && (setTimeout(() => e(t), 1), n.current = !0);
  }, [e, t.viewportInitialized]);
}
const Xk = {
  [K.Left]: K.Right,
  [K.Right]: K.Left,
  [K.Top]: K.Bottom,
  [K.Bottom]: K.Top
}, Gm = ({ nodeId: e, handleType: t, style: n, type: r = ln.Bezier, CustomComponent: o, connectionStatus: i }) => {
  var M, z, T;
  const { fromNode: s, handleId: l, toX: a, toY: u, connectionMode: c } = le(P.useCallback((k) => ({
    fromNode: k.nodeInternals.get(e),
    handleId: k.connectionHandleId,
    toX: (k.connectionPosition.x - k.transform[0]) / k.transform[2],
    toY: (k.connectionPosition.y - k.transform[1]) / k.transform[2],
    connectionMode: k.connectionMode
  }), [e]), Ce), f = (M = s == null ? void 0 : s[me]) == null ? void 0 : M.handleBounds;
  let d = f == null ? void 0 : f[t];
  if (c === Gn.Loose && (d = d || (f == null ? void 0 : f[t === "source" ? "target" : "source"])), !s || !d)
    return null;
  const p = l ? d.find((k) => k.id === l) : d[0], x = p ? p.x + p.width / 2 : (s.width ?? 0) / 2, v = p ? p.y + p.height / 2 : s.height ?? 0, S = (((z = s.positionAbsolute) == null ? void 0 : z.x) ?? 0) + x, h = (((T = s.positionAbsolute) == null ? void 0 : T.y) ?? 0) + v, m = p == null ? void 0 : p.position, g = m ? Xk[m] : null;
  if (!m || !g)
    return null;
  if (o)
    return I.createElement(o, { connectionLineType: r, connectionLineStyle: n, fromNode: s, fromHandle: p, fromX: S, fromY: h, toX: a, toY: u, fromPosition: m, toPosition: g, connectionStatus: i });
  let w = "";
  const N = {
    sourceX: S,
    sourceY: h,
    sourcePosition: m,
    targetX: a,
    targetY: u,
    targetPosition: g
  };
  return r === ln.Bezier ? [w] = xm(N) : r === ln.Step ? [w] = Ha({
    ...N,
    borderRadius: 0
  }) : r === ln.SmoothStep ? [w] = Ha(N) : r === ln.SimpleBezier ? [w] = wm(N) : w = `M${S},${h} ${a},${u}`, I.createElement("path", { d: w, fill: "none", className: "react-flow__connection-path", style: n });
};
Gm.displayName = "ConnectionLine";
const Kk = (e) => ({
  nodeId: e.connectionNodeId,
  handleType: e.connectionHandleType,
  nodesConnectable: e.nodesConnectable,
  connectionStatus: e.connectionStatus,
  width: e.width,
  height: e.height
});
function Gk({ containerStyle: e, style: t, type: n, component: r }) {
  const { nodeId: o, handleType: i, nodesConnectable: s, width: l, height: a, connectionStatus: u } = le(Kk, Ce);
  return !(o && i && l && s) ? null : I.createElement(
    "svg",
    { style: e, width: l, height: a, className: "react-flow__edges react-flow__connectionline react-flow__container" },
    I.createElement(
      "g",
      { className: Te(["react-flow__connection", u]) },
      I.createElement(Gm, { nodeId: o, handleType: i, style: t, type: n, CustomComponent: r, connectionStatus: u })
    )
  );
}
function ud(e, t) {
  return P.useRef(null), Se(), P.useMemo(() => t(e), [e]);
}
const Qm = ({ nodeTypes: e, edgeTypes: t, onMove: n, onMoveStart: r, onMoveEnd: o, onInit: i, onNodeClick: s, onEdgeClick: l, onNodeDoubleClick: a, onEdgeDoubleClick: u, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, onSelectionContextMenu: x, onSelectionStart: v, onSelectionEnd: S, connectionLineType: h, connectionLineStyle: m, connectionLineComponent: g, connectionLineContainerStyle: w, selectionKeyCode: N, selectionOnDrag: M, selectionMode: z, multiSelectionKeyCode: T, panActivationKeyCode: k, zoomActivationKeyCode: R, deleteKeyCode: F, onlyRenderVisibleElements: D, elementsSelectable: V, selectNodesOnDrag: _, defaultViewport: C, translateExtent: j, minZoom: L, maxZoom: $, preventScrolling: E, defaultMarkerColor: A, zoomOnScroll: O, zoomOnPinch: H, panOnScroll: U, panOnScrollSpeed: B, panOnScrollMode: X, zoomOnDoubleClick: Q, panOnDrag: Z, onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: je, onPaneScroll: we, onPaneContextMenu: Oe, onEdgeContextMenu: $e, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: Yr, noDragClassName: qn, noWheelClassName: Jn, noPanClassName: At, elevateEdgesOnSelect: er, disableKeyboardA11y: Nn, nodeOrigin: Cn, nodeExtent: tr, rfId: nr }) => {
  const Xr = ud(e, Sk), Re = ud(t, zk);
  return Yk(i), I.createElement(
    _k,
    { onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: je, onPaneContextMenu: Oe, onPaneScroll: we, deleteKeyCode: F, selectionKeyCode: N, selectionOnDrag: M, selectionMode: z, onSelectionStart: v, onSelectionEnd: S, multiSelectionKeyCode: T, panActivationKeyCode: k, zoomActivationKeyCode: R, elementsSelectable: V, onMove: n, onMoveStart: r, onMoveEnd: o, zoomOnScroll: O, zoomOnPinch: H, zoomOnDoubleClick: Q, panOnScroll: U, panOnScrollSpeed: B, panOnScrollMode: X, panOnDrag: Z, defaultViewport: C, translateExtent: j, minZoom: L, maxZoom: $, onSelectionContextMenu: x, preventScrolling: E, noDragClassName: qn, noWheelClassName: Jn, noPanClassName: At, disableKeyboardA11y: Nn },
    I.createElement(
      Wk,
      null,
      I.createElement(
        Bk,
        { edgeTypes: Re, onEdgeClick: l, onEdgeDoubleClick: u, onlyRenderVisibleElements: D, onEdgeContextMenu: $e, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: Yr, defaultMarkerColor: A, noPanClassName: At, elevateEdgesOnSelect: !!er, disableKeyboardA11y: Nn, rfId: nr },
        I.createElement(Gk, { style: m, type: h, component: g, containerStyle: w })
      ),
      I.createElement("div", { className: "react-flow__edgelabel-renderer" }),
      I.createElement(Ck, { nodeTypes: Xr, onNodeClick: s, onNodeDoubleClick: a, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, selectNodesOnDrag: _, onlyRenderVisibleElements: D, noPanClassName: At, noDragClassName: qn, disableKeyboardA11y: Nn, nodeOrigin: Cn, nodeExtent: tr, rfId: nr })
    )
  );
};
Qm.displayName = "GraphView";
var Qk = P.memo(Qm);
const Wa = [
  [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
], qt = {
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
  translateExtent: Wa,
  nodeExtent: Wa,
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
  onError: S_,
  isValidConnection: void 0
}, Zk = () => Ov((e, t) => ({
  ...qt,
  setNodes: (n) => {
    const { nodeInternals: r, nodeOrigin: o, elevateNodesOnSelect: i } = t();
    e({ nodeInternals: Tl(n, r, o, i) });
  },
  getNodes: () => Array.from(t().nodeInternals.values()),
  setEdges: (n) => {
    const { defaultEdgeOptions: r = {} } = t();
    e({ edges: n.map((o) => ({ ...r, ...o })) });
  },
  setDefaultNodesAndEdges: (n, r) => {
    const o = typeof n < "u", i = typeof r < "u", s = o ? Tl(n, /* @__PURE__ */ new Map(), t().nodeOrigin, t().elevateNodesOnSelect) : /* @__PURE__ */ new Map();
    e({ nodeInternals: s, edges: i ? r : [], hasDefaultNodes: o, hasDefaultEdges: i });
  },
  updateNodeDimensions: (n) => {
    const { onNodesChange: r, nodeInternals: o, fitViewOnInit: i, fitViewOnInitDone: s, fitViewOnInitOptions: l, domNode: a, nodeOrigin: u } = t(), c = a == null ? void 0 : a.querySelector(".react-flow__viewport");
    if (!c)
      return;
    const f = window.getComputedStyle(c), { m22: d } = new window.DOMMatrixReadOnly(f.transform), p = n.reduce((v, S) => {
      const h = o.get(S.id);
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
        const m = Qu(S.nodeElement);
        !!(m.width && m.height && (h.width !== m.width || h.height !== m.height || S.forceUpdate)) && (o.set(h.id, {
          ...h,
          [me]: {
            ...h[me],
            handleBounds: {
              source: nd(".source", S.nodeElement, d, u),
              target: nd(".target", S.nodeElement, d, u)
            }
          },
          ...m
        }), v.push({
          id: h.id,
          type: "dimensions",
          dimensions: m
        }));
      }
      return v;
    }, []);
    Om(o, u);
    const x = s || i && !s && Fm(t, { initial: !0, ...l });
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
        const u = dk(n, l()), c = Tl(u, o, s, a);
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
      o.positionAbsolute = Zu(o.position, n);
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
    connectionNodeId: qt.connectionNodeId,
    connectionHandleId: qt.connectionHandleId,
    connectionHandleType: qt.connectionHandleType,
    connectionStatus: qt.connectionStatus,
    connectionStartHandle: qt.connectionStartHandle,
    connectionEndHandle: qt.connectionEndHandle
  }),
  reset: () => e({ ...qt })
}), Object.is), sc = ({ children: e }) => {
  const t = P.useRef(null);
  return t.current || (t.current = Zk()), I.createElement(g_, { value: t.current }, e);
};
sc.displayName = "ReactFlowProvider";
const Zm = ({ children: e }) => P.useContext(Xs) ? I.createElement(I.Fragment, null, e) : I.createElement(sc, null, e);
Zm.displayName = "ReactFlowWrapper";
const qk = {
  input: Tm,
  default: Ba,
  output: Rm,
  group: rc
}, Jk = {
  default: Ns,
  straight: ec,
  step: Ju,
  smoothstep: Ks,
  simplebezier: qu
}, eS = [0, 0], tS = [15, 15], nS = { x: 0, y: 0, zoom: 1 }, rS = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  zIndex: 0
}, qm = P.forwardRef(({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, className: o, nodeTypes: i = qk, edgeTypes: s = Jk, onNodeClick: l, onEdgeClick: a, onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onConnect: p, onConnectStart: x, onConnectEnd: v, onClickConnectStart: S, onClickConnectEnd: h, onNodeMouseEnter: m, onNodeMouseMove: g, onNodeMouseLeave: w, onNodeContextMenu: N, onNodeDoubleClick: M, onNodeDragStart: z, onNodeDrag: T, onNodeDragStop: k, onNodesDelete: R, onEdgesDelete: F, onSelectionChange: D, onSelectionDragStart: V, onSelectionDrag: _, onSelectionDragStop: C, onSelectionContextMenu: j, onSelectionStart: L, onSelectionEnd: $, connectionMode: E = Gn.Strict, connectionLineType: A = ln.Bezier, connectionLineStyle: O, connectionLineComponent: H, connectionLineContainerStyle: U, deleteKeyCode: B = "Backspace", selectionKeyCode: X = "Shift", selectionOnDrag: Q = !1, selectionMode: Z = Go.Full, panActivationKeyCode: re = "Space", multiSelectionKeyCode: ne = Ss() ? "Meta" : "Control", zoomActivationKeyCode: te = Ss() ? "Meta" : "Control", snapToGrid: je = !1, snapGrid: we = tS, onlyRenderVisibleElements: Oe = !1, selectNodesOnDrag: $e = !0, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, nodeOrigin: G = eS, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: Yr, defaultViewport: qn = nS, minZoom: Jn = 0.5, maxZoom: At = 2, translateExtent: er = Wa, preventScrolling: Nn = !0, nodeExtent: Cn, defaultMarkerColor: tr = "#b1b1b7", zoomOnScroll: nr = !0, zoomOnPinch: Xr = !0, panOnScroll: Re = !1, panOnScrollSpeed: pt = 0.5, panOnScrollMode: jn = On.Free, zoomOnDoubleClick: Pn = !0, panOnDrag: Mn = !0, onPaneClick: It, onPaneMouseEnter: Nt, onPaneMouseMove: Kr, onPaneMouseLeave: Qs, onPaneScroll: Gr, onPaneContextMenu: Zs, children: lc, onEdgeContextMenu: zn, onEdgeDoubleClick: ag, onEdgeMouseEnter: ug, onEdgeMouseMove: cg, onEdgeMouseLeave: fg, onEdgeUpdate: dg, onEdgeUpdateStart: pg, onEdgeUpdateEnd: hg, onReconnect: mg, onReconnectStart: gg, onReconnectEnd: yg, reconnectRadius: vg = 10, edgeUpdaterRadius: wg = 10, onNodesChange: xg, onEdgesChange: _g, noDragClassName: kg = "nodrag", noWheelClassName: Sg = "nowheel", noPanClassName: ac = "nopan", fitView: Eg = !1, fitViewOptions: Ng, connectOnClick: Cg = !0, attributionPosition: jg, proOptions: Pg, defaultEdgeOptions: Mg, elevateNodesOnSelect: zg = !0, elevateEdgesOnSelect: Tg = !1, disableKeyboardA11y: uc = !1, autoPanOnConnect: $g = !0, autoPanOnNodeDrag: Rg = !0, connectionRadius: Ag = 20, isValidConnection: Ig, onError: Lg, style: Dg, id: cc, nodeDragThreshold: Og, ...Fg }, Hg) => {
  const qs = cc || "1";
  return I.createElement(
    "div",
    { ...Fg, style: { ...Dg, ...rS }, ref: Hg, className: Te(["react-flow", o]), "data-testid": "rf__wrapper", id: cc },
    I.createElement(
      Zm,
      null,
      I.createElement(Qk, { onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onNodeClick: l, onEdgeClick: a, onNodeMouseEnter: m, onNodeMouseMove: g, onNodeMouseLeave: w, onNodeContextMenu: N, onNodeDoubleClick: M, nodeTypes: i, edgeTypes: s, connectionLineType: A, connectionLineStyle: O, connectionLineComponent: H, connectionLineContainerStyle: U, selectionKeyCode: X, selectionOnDrag: Q, selectionMode: Z, deleteKeyCode: B, multiSelectionKeyCode: ne, panActivationKeyCode: re, zoomActivationKeyCode: te, onlyRenderVisibleElements: Oe, selectNodesOnDrag: $e, defaultViewport: qn, translateExtent: er, minZoom: Jn, maxZoom: At, preventScrolling: Nn, zoomOnScroll: nr, zoomOnPinch: Xr, zoomOnDoubleClick: Pn, panOnScroll: Re, panOnScrollSpeed: pt, panOnScrollMode: jn, panOnDrag: Mn, onPaneClick: It, onPaneMouseEnter: Nt, onPaneMouseMove: Kr, onPaneMouseLeave: Qs, onPaneScroll: Gr, onPaneContextMenu: Zs, onSelectionContextMenu: j, onSelectionStart: L, onSelectionEnd: $, onEdgeContextMenu: zn, onEdgeDoubleClick: ag, onEdgeMouseEnter: ug, onEdgeMouseMove: cg, onEdgeMouseLeave: fg, onReconnect: mg ?? dg, onReconnectStart: gg ?? pg, onReconnectEnd: yg ?? hg, reconnectRadius: vg ?? wg, defaultMarkerColor: tr, noDragClassName: kg, noWheelClassName: Sg, noPanClassName: ac, elevateEdgesOnSelect: Tg, rfId: qs, disableKeyboardA11y: uc, nodeOrigin: G, nodeExtent: Cn }),
      I.createElement(Y_, { nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: p, onConnectStart: x, onConnectEnd: v, onClickConnectStart: S, onClickConnectEnd: h, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: Yr, elevateNodesOnSelect: zg, minZoom: Jn, maxZoom: At, nodeExtent: Cn, onNodesChange: xg, onEdgesChange: _g, snapToGrid: je, snapGrid: we, connectionMode: E, translateExtent: er, connectOnClick: Cg, defaultEdgeOptions: Mg, fitView: Eg, fitViewOptions: Ng, onNodesDelete: R, onEdgesDelete: F, onNodeDragStart: z, onNodeDrag: T, onNodeDragStop: k, onSelectionDrag: _, onSelectionDragStart: V, onSelectionDragStop: C, noPanClassName: ac, nodeOrigin: G, rfId: qs, autoPanOnConnect: $g, autoPanOnNodeDrag: Rg, onError: Lg, connectionRadius: Ag, isValidConnection: Ig, nodeDragThreshold: Og }),
      I.createElement(U_, { onSelectionChange: D }),
      lc,
      I.createElement(v_, { proOptions: Pg, position: jg }),
      I.createElement(Z_, { rfId: qs, disableKeyboardA11y: uc })
    )
  );
});
qm.displayName = "ReactFlow";
const Jm = ({ id: e, x: t, y: n, width: r, height: o, style: i, color: s, strokeColor: l, strokeWidth: a, className: u, borderRadius: c, shapeRendering: f, onClick: d, selected: p }) => {
  const { background: x, backgroundColor: v } = i || {}, S = s || x || v;
  return I.createElement("rect", { className: Te(["react-flow__minimap-node", { selected: p }, u]), x: t, y: n, rx: c, ry: c, width: r, height: o, fill: S, stroke: l, strokeWidth: a, shapeRendering: f, onClick: d ? (h) => d(h, e) : void 0 });
};
Jm.displayName = "MiniMapNode";
var oS = P.memo(Jm);
const iS = (e) => e.nodeOrigin, sS = (e) => e.getNodes().filter((t) => !t.hidden && t.width && t.height), Il = (e) => e instanceof Function ? e : () => e;
function lS({
  nodeStrokeColor: e = "transparent",
  nodeColor: t = "#e2e2e2",
  nodeClassName: n = "",
  nodeBorderRadius: r = 5,
  nodeStrokeWidth: o = 2,
  // We need to rename the prop to be `CapitalCase` so that JSX will render it as
  // a component properly.
  nodeComponent: i = oS,
  onClick: s
}) {
  const l = le(sS, Ce), a = le(iS), u = Il(t), c = Il(e), f = Il(n), d = typeof window > "u" || window.chrome ? "crispEdges" : "geometricPrecision";
  return I.createElement(I.Fragment, null, l.map((p) => {
    const { x, y: v } = bn(p, a).positionAbsolute;
    return I.createElement(i, { key: p.id, x, y: v, width: p.width, height: p.height, style: p.style, selected: p.selected, className: f(p), color: u(p), borderRadius: r, strokeColor: c(p), strokeWidth: o, shapeRendering: d, onClick: s, id: p.id });
  }));
}
var aS = P.memo(lS);
const uS = 200, cS = 150, fS = (e) => {
  const t = e.getNodes(), n = {
    x: -e.transform[0] / e.transform[2],
    y: -e.transform[1] / e.transform[2],
    width: e.width / e.transform[2],
    height: e.height / e.transform[2]
  };
  return {
    viewBB: n,
    boundingRect: t.length > 0 ? __(Gs(t, e.nodeOrigin), n) : n,
    rfId: e.rfId
  };
}, dS = "react-flow__minimap-desc";
function eg({
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
  zoomable: v = !1,
  ariaLabel: S = "React Flow mini map",
  inversePan: h = !1,
  zoomStep: m = 10,
  offsetScale: g = 5
}) {
  const w = Se(), N = P.useRef(null), { boundingRect: M, viewBB: z, rfId: T } = le(fS, Ce), k = (e == null ? void 0 : e.width) ?? uS, R = (e == null ? void 0 : e.height) ?? cS, F = M.width / k, D = M.height / R, V = Math.max(F, D), _ = V * k, C = V * R, j = g * V, L = M.x - (_ - M.width) / 2 - j, $ = M.y - (C - M.height) / 2 - j, E = _ + j * 2, A = C + j * 2, O = `${dS}-${T}`, H = P.useRef(0);
  H.current = V, P.useEffect(() => {
    if (N.current) {
      const X = st(N.current), Q = (ne) => {
        const { transform: te, d3Selection: je, d3Zoom: we } = w.getState();
        if (ne.sourceEvent.type !== "wheel" || !je || !we)
          return;
        const Oe = -ne.sourceEvent.deltaY * (ne.sourceEvent.deltaMode === 1 ? 0.05 : ne.sourceEvent.deltaMode ? 1 : 2e-3) * m, $e = te[2] * Math.pow(2, Oe);
        we.scaleTo(je, $e);
      }, Z = (ne) => {
        const { transform: te, d3Selection: je, d3Zoom: we, translateExtent: Oe, width: $e, height: ge } = w.getState();
        if (ne.sourceEvent.type !== "mousemove" || !je || !we)
          return;
        const Qe = H.current * Math.max(1, te[2]) * (h ? -1 : 1), ie = {
          x: te[0] - ne.sourceEvent.movementX * Qe,
          y: te[1] - ne.sourceEvent.movementY * Qe
        }, G = [
          [0, 0],
          [$e, ge]
        ], Fe = Bt.translate(ie.x, ie.y).scale(te[2]), Rt = we.constrain()(Fe, G, Oe);
        we.transform(je, Rt);
      }, re = um().on("zoom", x ? Z : null).on("zoom.wheel", v ? Q : null);
      return X.call(re), () => {
        X.on("zoom", null);
      };
    }
  }, [x, v, h, m]);
  const U = d ? (X) => {
    const Q = vt(X);
    d(X, { x: Q[0], y: Q[1] });
  } : void 0, B = p ? (X, Q) => {
    const Z = w.getState().nodeInternals.get(Q);
    p(X, Z);
  } : void 0;
  return I.createElement(
    Gu,
    { position: f, style: e, className: Te(["react-flow__minimap", t]), "data-testid": "rf__minimap" },
    I.createElement(
      "svg",
      { width: k, height: R, viewBox: `${L} ${$} ${E} ${A}`, role: "img", "aria-labelledby": O, ref: N, onClick: U },
      S && I.createElement("title", { id: O }, S),
      I.createElement(aS, { onClick: B, nodeColor: r, nodeStrokeColor: n, nodeBorderRadius: i, nodeClassName: o, nodeStrokeWidth: s, nodeComponent: l }),
      I.createElement("path", { className: "react-flow__minimap-mask", d: `M${L - j},${$ - j}h${E + j * 2}v${A + j * 2}h${-E - j * 2}z
        M${z.x},${z.y}h${z.width}v${z.height}h${-z.width}z`, fill: a, fillRule: "evenodd", stroke: u, strokeWidth: c, pointerEvents: "none" })
    )
  );
}
eg.displayName = "MiniMap";
var pS = P.memo(eg);
function hS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32" },
    I.createElement("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" })
  );
}
function mS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5" },
    I.createElement("path", { d: "M0 0h32v4.2H0z" })
  );
}
function gS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30" },
    I.createElement("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" })
  );
}
function yS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" })
  );
}
function vS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" })
  );
}
const go = ({ children: e, className: t, ...n }) => I.createElement("button", { type: "button", className: Te(["react-flow__controls-button", t]), ...n }, e);
go.displayName = "ControlButton";
const wS = (e) => ({
  isInteractive: e.nodesDraggable || e.nodesConnectable || e.elementsSelectable,
  minZoomReached: e.transform[2] <= e.minZoom,
  maxZoomReached: e.transform[2] >= e.maxZoom
}), tg = ({ style: e, showZoom: t = !0, showFitView: n = !0, showInteractive: r = !0, fitViewOptions: o, onZoomIn: i, onZoomOut: s, onFitView: l, onInteractiveChange: a, className: u, children: c, position: f = "bottom-left" }) => {
  const d = Se(), [p, x] = P.useState(!1), { isInteractive: v, minZoomReached: S, maxZoomReached: h } = le(wS, Ce), { zoomIn: m, zoomOut: g, fitView: w } = oc();
  if (P.useEffect(() => {
    x(!0);
  }, []), !p)
    return null;
  const N = () => {
    m(), i == null || i();
  }, M = () => {
    g(), s == null || s();
  }, z = () => {
    w(o), l == null || l();
  }, T = () => {
    d.setState({
      nodesDraggable: !v,
      nodesConnectable: !v,
      elementsSelectable: !v
    }), a == null || a(!v);
  };
  return I.createElement(
    Gu,
    { className: Te(["react-flow__controls", u]), position: f, style: e, "data-testid": "rf__controls" },
    t && I.createElement(
      I.Fragment,
      null,
      I.createElement(
        go,
        { onClick: N, className: "react-flow__controls-zoomin", title: "zoom in", "aria-label": "zoom in", disabled: h },
        I.createElement(hS, null)
      ),
      I.createElement(
        go,
        { onClick: M, className: "react-flow__controls-zoomout", title: "zoom out", "aria-label": "zoom out", disabled: S },
        I.createElement(mS, null)
      )
    ),
    n && I.createElement(
      go,
      { className: "react-flow__controls-fitview", onClick: z, title: "fit view", "aria-label": "fit view" },
      I.createElement(gS, null)
    ),
    r && I.createElement(go, { className: "react-flow__controls-interactive", onClick: T, title: "toggle interactivity", "aria-label": "toggle interactivity" }, v ? I.createElement(vS, null) : I.createElement(yS, null)),
    c
  );
};
tg.displayName = "Controls";
var xS = P.memo(tg), ct;
(function(e) {
  e.Lines = "lines", e.Dots = "dots", e.Cross = "cross";
})(ct || (ct = {}));
function _S({ color: e, dimensions: t, lineWidth: n }) {
  return I.createElement("path", { stroke: e, strokeWidth: n, d: `M${t[0] / 2} 0 V${t[1]} M0 ${t[1] / 2} H${t[0]}` });
}
function kS({ color: e, radius: t }) {
  return I.createElement("circle", { cx: t, cy: t, r: t, fill: e });
}
const SS = {
  [ct.Dots]: "#91919a",
  [ct.Lines]: "#eee",
  [ct.Cross]: "#e2e2e2"
}, ES = {
  [ct.Dots]: 1,
  [ct.Lines]: 1,
  [ct.Cross]: 6
}, NS = (e) => ({ transform: e.transform, patternId: `pattern-${e.rfId}` });
function ng({
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
  const u = P.useRef(null), { transform: c, patternId: f } = le(NS, Ce), d = s || SS[t], p = r || ES[t], x = t === ct.Dots, v = t === ct.Cross, S = Array.isArray(n) ? n : [n, n], h = [S[0] * c[2] || 1, S[1] * c[2] || 1], m = p * c[2], g = v ? [m, m] : h, w = x ? [m / i, m / i] : [g[0] / i, g[1] / i];
  return I.createElement(
    "svg",
    { className: Te(["react-flow__background", a]), style: {
      ...l,
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0
    }, ref: u, "data-testid": "rf__background" },
    I.createElement("pattern", { id: f + e, x: c[0] % h[0], y: c[1] % h[1], width: h[0], height: h[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${w[0]},-${w[1]})` }, x ? I.createElement(kS, { color: d, radius: m / i }) : I.createElement(_S, { dimensions: g, color: d, lineWidth: o })),
    I.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${f + e})` })
  );
}
ng.displayName = "Background";
var CS = P.memo(ng);
const rg = {}, { useDebugValue: jS } = I, { useSyncExternalStoreWithSelector: PS } = Rh;
let cd = !1;
const MS = (e) => e;
function zS(e, t = MS, n) {
  (rg ? "production" : void 0) !== "production" && n && !cd && (console.warn(
    "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
  ), cd = !0);
  const r = PS(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return jS(r), r;
}
const fd = (e) => {
  (rg ? "production" : void 0) !== "production" && typeof e != "function" && console.warn(
    "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
  );
  const t = typeof e == "function" ? Ah(e) : e, n = (r, o) => zS(t, r, o);
  return Object.assign(n, t), n;
}, TS = (e) => e ? fd(e) : fd, og = { nodes: [], edges: [] }, Y = TS((e, t) => ({
  graph: og,
  catalog: [],
  selectedNodeId: null,
  runContext: null,
  readOnly: !1,
  paletteFilter: "",
  rightView: "none",
  drawerNodeId: null,
  connectedProviders: null,
  setGraph: (n) => e({ graph: RS(n) }),
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
    const r = $S(n);
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
function $S(e) {
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
      const v = p + 1;
      (!l.has(x) || (l.get(x) || 0) < v) && l.set(x, v), u.has(x) || (u.add(x), a.push(x));
    }
  }
  const c = /* @__PURE__ */ new Map();
  e.nodes.forEach((d) => {
    const p = l.get(d.id) ?? 0;
    c.has(p) || c.set(p, []), c.get(p).push(d.id);
  });
  const f = {};
  for (const [d, p] of Array.from(c.entries())) {
    const x = 80 + d * 280, v = p.length, S = 80 + Math.max(0, 3 - v) * 30;
    p.forEach((h, m) => {
      f[h] = { x, y: S + m * 160 };
    });
  }
  return f;
}
function RS(e) {
  return !e || !Array.isArray(e.nodes) ? og : {
    nodes: e.nodes.map((t) => ({
      ...t,
      params: t.params || {},
      position: t.position || { x: 0, y: 0 }
    })),
    edges: Array.isArray(e.edges) ? e.edges : []
  };
}
var ig = { exports: {} };
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
})(ig);
var AS = ig.exports;
const _e = /* @__PURE__ */ Ka(AS);
function sg(e) {
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
function IS(e, t, n, r) {
  if (!e || !n) return { ok: !1, reason: "Spec faltante" };
  const o = e.outputs.find((s) => s.name === t), i = n.inputs.find((s) => s.name === r);
  return o ? i ? { ok: !0 } : { ok: !1, reason: `Puerto de entrada "${r}" no existe` } : { ok: !1, reason: `Puerto de salida "${t}" no existe` };
}
function LS(e, t) {
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
function DS(e) {
  return (e == null ? void 0 : e.inputs) ?? [];
}
function OS(e) {
  return (e == null ? void 0 : e.outputs) ?? [{ name: "main" }];
}
const FS = ({ id: e, data: t, selected: n }) => {
  var N, M, z;
  const r = Y(
    (T) => {
      var k, R;
      return (R = (k = T.runContext) == null ? void 0 : k.nodeStates) == null ? void 0 : R[e];
    }
  ), o = Y((T) => {
    var k;
    return ((k = T.runContext) == null ? void 0 : k.status) === "running";
  }), i = Y((T) => T.setSelectedNodeId), s = Y((T) => T.setRightView), l = (r == null ? void 0 : r.status) || "pending", a = r == null ? void 0 : r.durationMs, u = r == null ? void 0 : r.attempt, c = (N = r == null ? void 0 : r.error) == null ? void 0 : N.message, f = t.spec, d = t.flowNode, p = (f == null ? void 0 : f.color) || "#5E72E4", x = DS(f), v = OS(f), S = (f == null ? void 0 : f.displayName) || d.type, h = P.useMemo(() => HS(d.params), [d.params]), m = P.useCallback(
    (T) => {
      T.stopPropagation(), i(e), s("runs");
    },
    [e, i, s]
  ), g = o && l === "running", w = ((z = (M = r == null ? void 0 : r.output) == null ? void 0 : M.main) == null ? void 0 : z.reduce((T, k) => T + ((k == null ? void 0 : k.length) || 0), 0)) ?? 0;
  return /* @__PURE__ */ y.jsxs(
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
        x.map((T, k) => /* @__PURE__ */ y.jsx(
          br,
          {
            id: T.name,
            type: "target",
            position: K.Left,
            className: _e("kfc-node__handle", {
              "kfc-node__handle--error": T.isError
            }),
            style: { top: 24 + k * 18 }
          },
          `in-${T.name}`
        )),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-node__header", children: [
          /* @__PURE__ */ y.jsx("i", { className: _e("kfc-node__icon", (f == null ? void 0 : f.icon) || "pi pi-circle") }),
          /* @__PURE__ */ y.jsx("span", { className: "kfc-node__title", title: S, children: S }),
          r && (l === "success" || l === "failed" || l === "skipped") && /* @__PURE__ */ y.jsx(
            "button",
            {
              type: "button",
              className: "kfc-node__info-btn",
              onClick: m,
              title: "Ver logs de este nodo",
              "aria-label": "Ver logs",
              children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-info-circle" })
            }
          ),
          (f == null ? void 0 : f.category) && /* @__PURE__ */ y.jsx("span", { className: "kfc-node__category-badge", children: VS(f.category) })
        ] }),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-node__body", children: [
          h.length > 0 ? /* @__PURE__ */ y.jsx("ul", { className: "kfc-node__params", children: h.slice(0, 3).map(([T, k]) => /* @__PURE__ */ y.jsxs("li", { children: [
            /* @__PURE__ */ y.jsxs("b", { children: [
              T,
              ":"
            ] }),
            " ",
            k
          ] }, T)) }) : /* @__PURE__ */ y.jsx("em", { style: { color: "#9ca3af" }, children: "Sin parámetros configurados" }),
          /* @__PURE__ */ y.jsxs("div", { className: "kfc-node__status-row", children: [
            /* @__PURE__ */ y.jsxs("span", { className: _e("kfc-node__status", `kfc-node__status--${l}`), children: [
              g && /* @__PURE__ */ y.jsx("i", { className: "pi pi-spin pi-spinner kfc-node__status-spinner" }),
              !g && l === "success" && /* @__PURE__ */ y.jsx("i", { className: "pi pi-check" }),
              !g && l === "failed" && /* @__PURE__ */ y.jsx("i", { className: "pi pi-times" }),
              !g && l === "skipped" && /* @__PURE__ */ y.jsx("i", { className: "pi pi-forward" }),
              bS(l)
            ] }),
            a != null && l !== "running" && /* @__PURE__ */ y.jsx("span", { className: "kfc-node__metric", title: "Duración", children: BS(a) }),
            w > 0 && l === "success" && /* @__PURE__ */ y.jsxs("span", { className: "kfc-node__metric", title: "Items procesados", children: [
              w,
              " ",
              w === 1 ? "item" : "items"
            ] }),
            u != null && u > 1 && /* @__PURE__ */ y.jsxs(
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
          c && l === "failed" && /* @__PURE__ */ y.jsx("div", { className: "kfc-node__error", title: c, children: US(c, 60) })
        ] }),
        v.map((T, k) => /* @__PURE__ */ y.jsx(
          br,
          {
            id: T.name,
            type: "source",
            position: K.Right,
            className: _e("kfc-node__handle", {
              "kfc-node__handle--error": T.isError
            }),
            style: { top: 24 + k * 18 }
          },
          `out-${T.name}`
        )),
        g && /* @__PURE__ */ y.jsx("div", { className: "kfc-node__live-pulse", "aria-hidden": !0 })
      ]
    }
  );
};
function HS(e) {
  return e ? Object.entries(e).filter(([, t]) => t != null && t !== "").map(([t, n]) => {
    const r = typeof n == "object" ? JSON.stringify(n).slice(0, 40) : String(n).slice(0, 40);
    return [t, r];
  }) : [];
}
function VS(e) {
  return e === "flow-control" ? "flow" : e.slice(0, 6);
}
function bS(e) {
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
function BS(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function US(e, t) {
  return e.length > t ? e.slice(0, t - 1) + "…" : e;
}
const WS = P.memo(FS);
function dd(e = "n") {
  const t = Date.now().toString(36).slice(-4), n = Math.random().toString(36).slice(2, 8);
  return `${e}_${t}${n}`;
}
const YS = { katuqNode: WS }, XS = ({ onSelectNode: e, onIntent: t }) => {
  const n = Y((k) => k.graph), r = Y((k) => k.catalog), o = Y((k) => k.runContext), i = Y((k) => k.readOnly), s = Y((k) => k.selectedNodeId);
  Y((k) => k.setGraph);
  const l = Y((k) => k.addNode), a = Y((k) => k.addEdge), u = Y((k) => k.moveNode), c = Y((k) => k.deleteNode), f = Y((k) => k.deleteEdge), d = Y((k) => k.setDrawerNodeId), p = P.useRef(null), x = P.useRef(null), v = P.useMemo(
    () => n.nodes.map((k) => {
      const R = an(r, k.type);
      return {
        id: k.id,
        type: "katuqNode",
        position: k.position,
        selected: s === k.id,
        data: { flowNode: k, spec: R }
      };
    }),
    [n.nodes, r, s]
  ), S = P.useMemo(
    () => n.edges.map((k) => {
      var C, j, L, $;
      const R = (j = (C = o == null ? void 0 : o.nodeStates) == null ? void 0 : C[k.source]) == null ? void 0 : j.status, F = ($ = (L = o == null ? void 0 : o.nodeStates) == null ? void 0 : L[k.target]) == null ? void 0 : $.status, D = R === "success", V = (o == null ? void 0 : o.status) === "running" && D && (F === "running" || F === "pending"), _ = k.sourcePort === "error";
      return {
        id: k.id,
        source: k.source,
        sourcePort: k.sourcePort,
        target: k.target,
        sourceHandle: k.sourcePort,
        targetHandle: k.targetPort,
        animated: V,
        className: _e({
          "kfc-edge--complete": D && !V,
          "kfc-edge--live": V,
          "kfc-edge--error": _
        })
      };
    }),
    [n.edges, o]
  ), h = P.useCallback(
    (k) => {
      for (const R of k)
        R.type === "position" && R.position ? u(R.id, { x: R.position.x, y: R.position.y }) : R.type === "remove" ? c(R.id) : R.type === "select" && R.selected && e(R.id);
    },
    [u, c, e]
  ), m = P.useCallback(
    (k) => {
      for (const R of k)
        R.type === "remove" && f(R.id);
    },
    [f]
  ), g = P.useCallback(
    (k) => {
      if (i || !k.source || !k.target) return;
      if (k.source === k.target) {
        t == null || t("connectionRejected", {
          reason: "Un nodo no puede conectarse a sí mismo."
        });
        return;
      }
      const R = n.nodes.find((L) => L.id === k.source), F = n.nodes.find((L) => L.id === k.target);
      if (!R || !F) return;
      const D = an(r, R.type), V = an(r, F.type), _ = IS(
        D,
        k.sourceHandle || "main",
        V,
        k.targetHandle || "main"
      );
      if (!_.ok) {
        t == null || t("connectionRejected", {
          reason: _.reason || "Puertos incompatibles."
        });
        return;
      }
      const C = {
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
      if (sg(C)) {
        t == null || t("connectionRejected", {
          reason: "Esta conexión crearía un ciclo en el flow."
        });
        return;
      }
      const j = {
        id: dd("e"),
        source: k.source,
        sourcePort: k.sourceHandle || "main",
        target: k.target,
        targetPort: k.targetHandle || "main"
      };
      a(j), t == null || t("connectionCreated", { edgeId: j.id });
    },
    [i, n, r, a, t]
  ), w = P.useCallback((k) => {
    k.preventDefault(), k.dataTransfer.dropEffect = "move";
  }, []), N = P.useCallback(
    (k) => {
      var j;
      if (k.preventDefault(), i) return;
      const R = k.dataTransfer.getData("application/x-katuq-node-type");
      if (!R) return;
      const F = an(r, R);
      if (!F) return;
      const D = (j = p.current) == null ? void 0 : j.getBoundingClientRect();
      if (!D) return;
      const V = x.current, _ = (V == null ? void 0 : V.project({
        x: k.clientX - D.left,
        y: k.clientY - D.top
      })) ?? { x: 100, y: 100 }, C = {
        id: dd("n"),
        type: R,
        position: _,
        params: { ...F.defaults || {} }
      };
      l(C), e(C.id), t == null || t("nodeAdded", { nodeId: C.id, type: R });
    },
    [i, r, l, e, t]
  ), M = P.useCallback(() => e(null), [e]), z = P.useCallback(
    (k, R) => e(R.id),
    [e]
  ), T = P.useCallback(
    (k, R) => {
      k.preventDefault(), d(R.id);
    },
    [d]
  );
  return /* @__PURE__ */ y.jsx("div", { ref: p, className: "kfc-canvas-wrapper", onDragOver: w, onDrop: N, children: /* @__PURE__ */ y.jsxs(
    qm,
    {
      nodes: v,
      edges: S,
      onNodesChange: h,
      onEdgesChange: m,
      onConnect: g,
      onPaneClick: M,
      onNodeClick: z,
      onNodeContextMenu: T,
      nodeTypes: YS,
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
        /* @__PURE__ */ y.jsx(CS, { variant: ct.Dots, gap: 18, size: 1, color: "#d1d5db" }),
        /* @__PURE__ */ y.jsx(
          pS,
          {
            pannable: !0,
            zoomable: !0,
            nodeColor: (k) => {
              var D;
              const R = (D = k.data) == null ? void 0 : D.flowNode, F = R ? an(r, R.type) : void 0;
              return (F == null ? void 0 : F.color) || "#94a3b8";
            }
          }
        ),
        /* @__PURE__ */ y.jsx(xS, { position: "bottom-left" })
      ]
    }
  ) });
}, KS = {
  osmosis: "Osmosis (Guía Cereza)",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  katuq: "Katuq Internal",
  "flow-control": "Control de Flujo",
  http: "HTTP",
  kai: "KAI (AI)"
}, GS = ({ readOnly: e }) => {
  const t = Y((s) => s.catalog), n = Y((s) => s.paletteFilter), r = Y((s) => s.setPaletteFilter), o = P.useMemo(() => QS(t, n), [t, n]), i = (s, l) => {
    if (e) {
      s.preventDefault();
      return;
    }
    s.dataTransfer.setData("application/x-katuq-node-type", l.type), s.dataTransfer.effectAllowed = "move";
  };
  return /* @__PURE__ */ y.jsxs("aside", { className: "kfc-sidebar", "aria-label": "Catálogo de nodos", children: [
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-sidebar__header", children: [
      /* @__PURE__ */ y.jsx("h3", { className: "kfc-sidebar__title", children: "Catálogo de nodos" }),
      /* @__PURE__ */ y.jsx(
        "input",
        {
          type: "search",
          className: "kfc-sidebar__search",
          placeholder: "Buscar nodo (nombre, tag, grupo)...",
          value: n,
          onChange: (s) => r(s.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-sidebar__list", children: [
      t.length === 0 && /* @__PURE__ */ y.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__title", children: "Sin catálogo cargado" }),
        /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "El backend debe enviar el array de NodeSpec[]." })
      ] }),
      Object.entries(o).map(([s, l]) => /* @__PURE__ */ y.jsxs("section", { className: "kfc-group", children: [
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-group__title", children: [
          KS[s] || s,
          " (",
          l.length,
          ")"
        ] }),
        l.map((a) => /* @__PURE__ */ y.jsxs(
          "div",
          {
            className: _e("kfc-palette-card"),
            draggable: !e,
            onDragStart: (u) => i(u, a),
            style: { borderLeftColor: a.color },
            title: a.description,
            children: [
              /* @__PURE__ */ y.jsx("i", { className: _e("kfc-palette-card__icon", a.icon) }),
              /* @__PURE__ */ y.jsxs("div", { className: "kfc-palette-card__body", children: [
                /* @__PURE__ */ y.jsx("div", { className: "kfc-palette-card__title", children: a.displayName }),
                /* @__PURE__ */ y.jsx("div", { className: "kfc-palette-card__desc", children: a.description })
              ] })
            ]
          },
          a.type
        ))
      ] }, s))
    ] })
  ] });
};
function QS(e, t) {
  const n = (t || "").trim().toLowerCase(), r = n ? e.filter((i) => `${i.displayName} ${i.description} ${i.type} ${(i.tags || []).join(" ")} ${i.group}`.toLowerCase().includes(n)) : e, o = {};
  for (const i of r)
    o[i.group] || (o[i.group] = []), o[i.group].push(i);
  for (const i of Object.keys(o))
    o[i].sort((s, l) => String((s == null ? void 0 : s.displayName) ?? "").localeCompare(String((l == null ? void 0 : l.displayName) ?? "")));
  return o;
}
const ZS = {
  worldoffice: "world_office"
}, pd = {
  osmosis: "Guía Cereza",
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
function Ya(e) {
  const t = (e || "").toLowerCase();
  return ZS[t] || t;
}
function Ll(e) {
  const t = (e || "").toLowerCase();
  return pd[Ya(t)] || pd[t] || e;
}
function qS(e, t) {
  if (!t) return [];
  const n = e.credentials;
  if (!n) return [];
  const r = Array.isArray(n) ? n : [n], o = new Set(t.map(Ya));
  return r.filter((i) => !o.has(Ya(i)));
}
const JS = ({ onClose: e, onOpenIntegrations: t }) => {
  var V, _;
  const n = Y((C) => C.selectedNodeId), r = Y((C) => C.graph), o = Y((C) => C.catalog), i = Y((C) => C.runContext), s = Y((C) => C.connectedProviders), l = Y((C) => C.updateNodeParams), a = Y((C) => C.updateNode), u = Y((C) => C.deleteNode), c = Y((C) => C.readOnly), f = P.useMemo(
    () => r.nodes.find((C) => C.id === n),
    [r.nodes, n]
  ), d = P.useMemo(
    () => f ? an(o, f.type) : void 0,
    [o, f]
  ), p = P.useMemo(
    () => f ? oE(f, r, o, i) : null,
    [f, r, o, i]
  ), [x, v] = P.useState({}), [S, h] = P.useState({}), [m, g] = P.useState("");
  if (P.useEffect(() => {
    if (!f) return;
    v({ ...(d == null ? void 0 : d.defaults) || {}, ...f.params || {} }), g(f.notes || "");
    const C = {};
    for (const [j, L] of Object.entries(f.params || {}))
      typeof L == "string" && L.trim().startsWith("{{") && (C[j] = "expression");
    h(C);
  }, [f, d]), !f || !d)
    return /* @__PURE__ */ y.jsx("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: /* @__PURE__ */ y.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__title", children: "Sin nodo seleccionado" }),
      /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "Click en un nodo del canvas para editar sus parámetros." })
    ] }) });
  const w = LS({ ...f, params: x }, d), N = ((V = d.schema) == null ? void 0 : V.properties) || {}, M = Array.isArray((_ = d.schema) == null ? void 0 : _.required) ? d.schema.required : [], z = qS(d, s), T = (C, j) => v((L) => ({ ...L, [C]: j })), k = (C, j) => h((L) => ({ ...L, [C]: j })), R = () => {
    l(f.id, x), m !== (f.notes || "") && a(f.id, { notes: m }), e();
  }, F = () => e(), D = () => {
    confirm(`Eliminar el nodo "${d.displayName}"?`) && (u(f.id), e());
  };
  return /* @__PURE__ */ y.jsxs("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: [
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__header", children: [
      /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__heading", children: [
        /* @__PURE__ */ y.jsx("div", { className: "kfc-config__title", children: d.displayName }),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__subtitle", children: [
          d.type,
          " · v",
          d.version
        ] })
      ] }),
      /* @__PURE__ */ y.jsx(
        "button",
        {
          type: "button",
          className: "kfc-btn kfc-btn--ghost kfc-config__close",
          onClick: e,
          "aria-label": "Cerrar",
          title: "Cerrar",
          children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-times" })
        }
      )
    ] }),
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__body", children: [
      z.length > 0 && /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__missing", role: "alert", children: [
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__missing-head", children: [
          /* @__PURE__ */ y.jsx("i", { className: "pi pi-exclamation-triangle" }),
          /* @__PURE__ */ y.jsx("span", { children: z.length === 1 ? `Necesitás conectar ${Ll(z[0])} para que este paso funcione.` : `Este paso necesita estas integraciones conectadas: ${z.map(Ll).join(", ")}.` })
        ] }),
        /* @__PURE__ */ y.jsx("div", { className: "kfc-config__missing-actions", children: z.map((C) => /* @__PURE__ */ y.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--warn-solid kfc-btn--sm",
            onClick: () => t == null ? void 0 : t(C),
            children: [
              /* @__PURE__ */ y.jsx("i", { className: "pi pi-link" }),
              "Conectar ",
              Ll(C)
            ]
          },
          C
        )) })
      ] }),
      d.description && /* @__PURE__ */ y.jsx("p", { className: "kfc-config__desc", children: d.description }),
      w.length > 0 && /* @__PURE__ */ y.jsx("div", { className: "kfc-config__errors", role: "alert", children: w.map((C) => /* @__PURE__ */ y.jsxs("div", { children: [
        "· ",
        C
      ] }, C)) }),
      Object.keys(N).length === 0 && /* @__PURE__ */ y.jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: "Este nodo no tiene parámetros configurables." }),
      Object.entries(N).map(([C, j]) => /* @__PURE__ */ y.jsx(
        eE,
        {
          name: C,
          schema: j,
          value: x[C],
          mode: S[C] || "fixed",
          required: M.includes(C),
          readOnly: c,
          inputData: p,
          onChange: (L) => T(C, L),
          onModeChange: (L) => k(C, L)
        },
        C
      )),
      /* @__PURE__ */ y.jsx("hr", { className: "kfc-config__sep" }),
      /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
        /* @__PURE__ */ y.jsx("label", { className: "kfc-field__label", children: "Notas (visibles en el canvas)" }),
        /* @__PURE__ */ y.jsx(
          "textarea",
          {
            className: "kfc-textarea",
            value: m,
            readOnly: c,
            onChange: (C) => g(C.target.value),
            placeholder: "Comentarios, contexto, decisiones..."
          }
        )
      ] }),
      d.category === "trigger" && /* @__PURE__ */ y.jsx("div", { className: "kfc-config__note", children: "Trigger: la suscripción (cron, webhook) se configura en el header del flow." })
    ] }),
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__footer", children: [
      !c && /* @__PURE__ */ y.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--danger", onClick: D, children: [
        /* @__PURE__ */ y.jsx("i", { className: "pi pi-trash" }),
        "Eliminar"
      ] }),
      /* @__PURE__ */ y.jsx("span", { className: "kfc-config__footer-spacer" }),
      /* @__PURE__ */ y.jsx("button", { type: "button", className: "kfc-btn", onClick: F, children: "Cancelar" }),
      !c && /* @__PURE__ */ y.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: R, children: [
        /* @__PURE__ */ y.jsx("i", { className: "pi pi-check" }),
        "Guardar"
      ] })
    ] })
  ] });
}, eE = ({
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
  const u = t.title || e, c = t.description, f = t.type, d = t.enum, p = `kfc-field-${e}`;
  if (f === "boolean")
    return /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ y.jsxs("label", { className: "kfc-checkbox-row", children: [
        /* @__PURE__ */ y.jsx(
          "input",
          {
            id: p,
            type: "checkbox",
            checked: !!n,
            disabled: i,
            onChange: (v) => l(v.target.checked)
          }
        ),
        /* @__PURE__ */ y.jsxs("span", { children: [
          u,
          o && /* @__PURE__ */ y.jsx("span", { className: "kfc-req", children: " *" })
        ] }),
        /* @__PURE__ */ y.jsx(lg, { schema: t })
      ] }),
      c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (Array.isArray(d))
    return /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ y.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ y.jsxs(
        "select",
        {
          id: p,
          className: "kfc-select",
          value: n ?? "",
          disabled: i,
          onChange: (v) => l(v.target.value),
          children: [
            /* @__PURE__ */ y.jsx("option", { value: "", children: "— elegí una opción —" }),
            d.map((v) => /* @__PURE__ */ y.jsx("option", { value: String(v), children: String(v) }, String(v)))
          ]
        }
      ),
      c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (f === "array") {
    const v = (x = t.items) == null ? void 0 : x.enum, S = Array.isArray(n) ? n : [];
    return v ? /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ y.jsx(ar, { label: u, required: o, schema: t }),
      /* @__PURE__ */ y.jsx("div", { className: "kfc-checkchips", children: v.map((h) => {
        const m = S.includes(h);
        return /* @__PURE__ */ y.jsxs(
          "label",
          {
            className: _e("kfc-checkchip", { "is-on": m }),
            children: [
              /* @__PURE__ */ y.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: m,
                  disabled: i,
                  onChange: (g) => {
                    g.target.checked ? l([...S, h]) : l(S.filter((w) => w !== h));
                  }
                }
              ),
              h
            ]
          },
          h
        );
      }) }),
      c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
    ] }) : /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ y.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ y.jsx(
        "input",
        {
          id: p,
          type: "text",
          className: "kfc-input",
          value: S.join(", "),
          readOnly: i,
          onChange: (h) => l(
            h.target.value.split(",").map((m) => m.trim()).filter(Boolean)
          ),
          placeholder: "valor1, valor2, valor3"
        }
      ),
      c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  }
  return f === "object" ? /* @__PURE__ */ y.jsx(
    rE,
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
  ) : f === "number" || f === "integer" ? /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ y.jsx(ar, { label: u, required: o, schema: t, htmlFor: p }),
    /* @__PURE__ */ y.jsx(
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
        onChange: (v) => {
          const S = v.target.value;
          l(S === "" ? void 0 : f === "integer" ? parseInt(S, 10) : parseFloat(S));
        }
      }
    ),
    c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
  ] }) : /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ y.jsx(
      ar,
      {
        label: u,
        required: o,
        schema: t,
        htmlFor: p,
        right: /* @__PURE__ */ y.jsxs("span", { className: "kfc-mode-toggle", role: "tablist", children: [
          /* @__PURE__ */ y.jsx(
            "button",
            {
              type: "button",
              className: _e({ "is-active": r === "fixed" }),
              onClick: () => a("fixed"),
              disabled: i,
              children: "Fijo"
            }
          ),
          /* @__PURE__ */ y.jsx(
            "button",
            {
              type: "button",
              className: _e({ "is-active": r === "expression" }),
              onClick: () => a("expression"),
              disabled: i,
              title: "Usar datos de pasos anteriores con {{ }}",
              children: "Expresión"
            }
          )
        ] })
      }
    ),
    r === "expression" ? /* @__PURE__ */ y.jsx(
      tE,
      {
        inputId: p,
        value: n ?? "",
        readOnly: i,
        inputData: s,
        onChange: l
      }
    ) : /* @__PURE__ */ y.jsx(
      "input",
      {
        id: p,
        type: "text",
        className: "kfc-input",
        value: n ?? "",
        readOnly: i,
        onChange: (v) => l(v.target.value),
        placeholder: t.default ? `Por defecto: ${t.default}` : ""
      }
    ),
    c && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: c })
  ] });
}, tE = ({
  inputId: e,
  value: t,
  readOnly: n,
  inputData: r,
  onChange: o
}) => {
  const i = P.useRef(null), [s, l] = P.useState(!1), [a, u] = P.useState(""), c = (p) => {
    const x = i.current, v = t || "";
    if (!x) {
      o(v + p);
      return;
    }
    const S = x.selectionStart ?? v.length, h = x.selectionEnd ?? v.length, m = v.slice(0, S) + p + v.slice(h);
    o(m), requestAnimationFrame(() => {
      x.focus();
      const g = S + p.length;
      try {
        x.setSelectionRange(g, g);
      } catch {
      }
    });
  }, f = P.useMemo(
    () => lE(t, r == null ? void 0 : r.json),
    [t, r]
  ), d = P.useMemo(() => {
    const p = (r == null ? void 0 : r.paths) || [], x = a.trim().toLowerCase();
    return x ? p.filter((v) => v.path.toLowerCase().includes(x)) : p;
  }, [r, a]);
  return /* @__PURE__ */ y.jsxs("div", { className: "kfc-expr-wrap", children: [
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-expr", children: [
      /* @__PURE__ */ y.jsx("span", { className: "kfc-expr__fx", title: "Modo expresión", children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-bolt" }) }),
      /* @__PURE__ */ y.jsx(
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
      !n && /* @__PURE__ */ y.jsxs(
        "button",
        {
          type: "button",
          className: _e("kfc-expr__pick", { "is-open": s }),
          onClick: () => l((p) => !p),
          title: "Insertar dato del paso anterior",
          children: [
            /* @__PURE__ */ y.jsx("i", { className: "pi pi-database" }),
            "Datos"
          ]
        }
      )
    ] }),
    f !== null && /* @__PURE__ */ y.jsxs("div", { className: "kfc-expr__preview", title: "Valor de muestra del último run", children: [
      /* @__PURE__ */ y.jsx("span", { className: "kfc-expr__preview-eq", children: "=" }),
      " ",
      f
    ] }),
    s && /* @__PURE__ */ y.jsxs("div", { className: "kfc-datapick", children: [
      /* @__PURE__ */ y.jsxs("div", { className: "kfc-datapick__head", children: [
        /* @__PURE__ */ y.jsx("i", { className: "pi pi-sign-in" }),
        "Datos de «",
        (r == null ? void 0 : r.label) || "paso anterior",
        "»"
      ] }),
      !r || r.paths.length === 0 ? /* @__PURE__ */ y.jsxs("div", { className: "kfc-datapick__empty", children: [
        /* @__PURE__ */ y.jsx("i", { className: "pi pi-info-circle" }),
        /* @__PURE__ */ y.jsx("span", { children: "Ejecutá el flow una vez (botón «Ejecutar») para ver las propiedades reales del paso anterior. Mientras tanto podés insertar la raíz:" }),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-datapick__tokens", children: [
          /* @__PURE__ */ y.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $json }}"),
              children: "{{ $json }}"
            }
          ),
          /* @__PURE__ */ y.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $vars. }}"),
              children: "{{ $vars }}"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ y.jsxs(y.Fragment, { children: [
        /* @__PURE__ */ y.jsx(
          "input",
          {
            type: "search",
            className: "kfc-datapick__search",
            placeholder: "Buscar propiedad…",
            value: a,
            onChange: (p) => u(p.target.value)
          }
        ),
        /* @__PURE__ */ y.jsxs("ul", { className: "kfc-datapick__list", children: [
          d.map((p) => /* @__PURE__ */ y.jsx("li", { children: /* @__PURE__ */ y.jsxs(
            "button",
            {
              type: "button",
              className: "kfc-datapick__row",
              onClick: () => c(`{{ $json.${p.path} }}`),
              title: `Insertar {{ $json.${p.path} }}`,
              children: [
                /* @__PURE__ */ y.jsx(
                  "span",
                  {
                    className: `kfc-datapick__type kfc-datapick__type--${p.type}`,
                    children: sE(p.type)
                  }
                ),
                /* @__PURE__ */ y.jsx("span", { className: "kfc-datapick__path", children: p.path }),
                /* @__PURE__ */ y.jsx("span", { className: "kfc-datapick__val", children: p.preview })
              ]
            }
          ) }, p.path)),
          d.length === 0 && /* @__PURE__ */ y.jsxs("li", { className: "kfc-datapick__noresult", children: [
            "Sin propiedades que coincidan con «",
            a,
            "»."
          ] })
        ] })
      ] })
    ] })
  ] });
}, ar = ({ label: e, required: t, schema: n, htmlFor: r, right: o }) => /* @__PURE__ */ y.jsxs("label", { className: "kfc-field__label", htmlFor: r, children: [
  /* @__PURE__ */ y.jsxs("span", { className: "kfc-field__labeltext", children: [
    e,
    t && /* @__PURE__ */ y.jsx("span", { className: "kfc-req", children: " *" }),
    /* @__PURE__ */ y.jsx(lg, { schema: n })
  ] }),
  o
] }), lg = ({ schema: e }) => {
  const { label: t, kind: n } = nE(e);
  return /* @__PURE__ */ y.jsx("span", { className: `kfc-typechip kfc-typechip--${n}`, children: t });
};
function nE(e) {
  var n;
  if (Array.isArray(e.enum)) return { label: "opción", kind: "enum" };
  const t = e.type;
  return t === "array" ? (n = e.items) != null && n.enum ? { label: "multi", kind: "array" } : { label: "lista", kind: "array" } : t === "object" ? { label: "objeto", kind: "object" } : t === "boolean" ? { label: "sí/no", kind: "boolean" } : t === "number" || t === "integer" ? { label: "número", kind: "number" } : { label: "texto", kind: "string" };
}
const rE = ({
  inputId: e,
  label: t,
  schema: n,
  description: r,
  required: o,
  readOnly: i,
  value: s,
  onChange: l
}) => {
  const a = P.useMemo(() => {
    try {
      return JSON.stringify(s ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }, [s]), [u, c] = P.useState(a), [f, d] = P.useState(null);
  return P.useEffect(() => {
    c(a), d(null);
  }, [a]), /* @__PURE__ */ y.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ y.jsx(ar, { label: t, required: o, schema: n, htmlFor: e }),
    /* @__PURE__ */ y.jsx(
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
    f && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__error", children: f }),
    r && !f && /* @__PURE__ */ y.jsx("div", { className: "kfc-field__hint", children: r })
  ] });
};
function oE(e, t, n, r) {
  var a, u, c, f;
  const o = t.edges.filter((d) => d.target === e.id).map((d) => d.source);
  let i = null;
  for (const d of o) {
    if (hd((a = r == null ? void 0 : r.nodeStates) == null ? void 0 : a[d])) {
      i = d;
      break;
    }
    i || (i = d);
  }
  let s = "paso anterior", l = null;
  if (i) {
    l = hd((u = r == null ? void 0 : r.nodeStates) == null ? void 0 : u[i]);
    const d = t.nodes.find((x) => x.id === i), p = d ? an(n, d.type) : void 0;
    s = (p == null ? void 0 : p.displayName) || "paso anterior";
  } else {
    const d = (f = (c = r == null ? void 0 : r.triggerData) == null ? void 0 : c[0]) == null ? void 0 : f.json;
    d && (l = d, s = "trigger");
  }
  return {
    label: s,
    json: l,
    paths: l ? Xa(l) : []
  };
}
function hd(e) {
  var n, r, o, i;
  const t = (i = (o = (r = (n = e == null ? void 0 : e.output) == null ? void 0 : n.main) == null ? void 0 : r[0]) == null ? void 0 : o[0]) == null ? void 0 : i.json;
  return t && typeof t == "object" ? t : null;
}
function Xa(e, t = "", n = [], r = 0) {
  if (r > 5) return n;
  if (Array.isArray(e))
    return t && n.push({ path: t, type: "array", preview: `[${e.length} elementos]` }), e.length && Xa(e[0], `${t}[0]`, n, r + 1), n;
  if (e && typeof e == "object") {
    t && n.push({ path: t, type: "object", preview: "{ objeto }" });
    for (const o of Object.keys(e)) {
      const i = t ? `${t}.${o}` : o;
      Xa(e[o], i, n, r + 1);
    }
    return n;
  }
  return n.push({
    path: t,
    type: e === null ? "null" : typeof e,
    preview: iE(e)
  }), n;
}
function iE(e) {
  return e === null ? "null" : typeof e == "string" ? e.length > 32 ? `"${e.slice(0, 32)}…"` : `"${e}"` : String(e);
}
function sE(e) {
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
function lE(e, t) {
  if (typeof e != "string" || !t) return null;
  const n = /^\s*\{\{\s*\$json\.?([\w.$[\]]*)\s*\}\}\s*$/.exec(e);
  if (!n) return null;
  const r = n[1], o = r ? aE(t, r) : t;
  if (o === void 0) return "—";
  if (o === null) return "null";
  if (typeof o == "object") return Array.isArray(o) ? `[${o.length} elementos]` : "{ objeto }";
  const i = String(o);
  return i.length > 80 ? `${i.slice(0, 80)}…` : i;
}
function aE(e, t) {
  if (!e || !t) return;
  const n = t.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let r = e;
  for (const o of n) {
    if (r == null) return;
    r = r[o];
  }
  return r;
}
const uE = {
  pending: "#9ca3af",
  running: "#2563eb",
  success: "#10b981",
  failed: "#ef4444",
  skipped: "#6b7280"
}, cE = ({ runContext: e, onClose: t }) => {
  const [n, r] = P.useState({}), o = P.useMemo(() => {
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
    return /* @__PURE__ */ y.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__title", children: "Sin ejecuciones todavía" }),
      /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "Ejecutá el flow manualmente o esperá a que un trigger lo dispare." })
    ] });
  const i = (s) => r((l) => ({ ...l, [s]: !l[s] }));
  return /* @__PURE__ */ y.jsxs("div", { className: "kfc-runlist", "aria-label": "Historial de ejecución", children: [
    /* @__PURE__ */ y.jsxs(
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
          /* @__PURE__ */ y.jsxs("div", { children: [
            /* @__PURE__ */ y.jsxs("div", { style: { fontWeight: 600, fontSize: 14 }, children: [
              "Run · ",
              e.runId.slice(0, 12),
              "…"
            ] }),
            /* @__PURE__ */ y.jsxs("div", { style: { fontSize: 12, color: "#6b7280" }, children: [
              e.startedAt,
              " · ",
              e.totalDurationMs ?? "—",
              " ms ·",
              " ",
              /* @__PURE__ */ y.jsx(
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
          t && /* @__PURE__ */ y.jsx("button", { type: "button", className: "kfc-btn", onClick: t, children: "Cerrar" })
        ]
      }
    ),
    o.length === 0 && /* @__PURE__ */ y.jsx("div", { className: "kfc-empty", children: /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "No se ejecutó ningún nodo en este run." }) }),
    o.map(({ nodeId: s, state: l }) => {
      const a = !!n[s];
      return /* @__PURE__ */ y.jsxs(
        "div",
        {
          className: "kfc-runlist__item",
          style: { borderLeftColor: uE[l.status] || "#9ca3af" },
          onClick: () => i(s),
          children: [
            /* @__PURE__ */ y.jsxs("div", { className: "kfc-runlist__head", children: [
              /* @__PURE__ */ y.jsx("span", { children: s }),
              /* @__PURE__ */ y.jsx(
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
            /* @__PURE__ */ y.jsxs("div", { className: "kfc-runlist__sub", children: [
              l.startedAt || "—",
              " · ",
              l.durationMs ?? "—",
              " ms · intento",
              " ",
              l.attempt
            ] }),
            a && /* @__PURE__ */ y.jsxs("div", { children: [
              l.error && /* @__PURE__ */ y.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d" }, children: `${l.error.code || "ERROR"}: ${l.error.message}

${l.error.stack || ""}` }),
              l.output && /* @__PURE__ */ y.jsx("pre", { className: "kfc-runlist__pre", children: fE(l.output, 8e3) })
            ] })
          ]
        },
        s
      );
    })
  ] });
};
function fE(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
const dE = ({ nodeId: e, onClose: t }) => {
  var v, S, h, m;
  const n = Y((g) => g.runContext), r = Y((g) => g.graph), o = Y((g) => g.catalog), [i, s] = P.useState("output"), l = P.useMemo(() => r.nodes.find((g) => g.id === e), [r.nodes, e]), a = P.useMemo(() => l ? an(o, l.type) : void 0, [o, l]), u = (v = n == null ? void 0 : n.nodeStates) == null ? void 0 : v[e], c = P.useMemo(() => {
    var N, M;
    if (!n || !l) return [];
    const g = r.edges.filter((z) => z.target === e), w = [];
    for (const z of g) {
      const T = (N = n.nodeStates) == null ? void 0 : N[z.source];
      if ((M = T == null ? void 0 : T.output) != null && M.main)
        for (const k of T.output.main)
          Array.isArray(k) && w.push(...k);
    }
    return w;
  }, [n, l, r.edges, e]);
  if (!l)
    return /* @__PURE__ */ y.jsx("aside", { className: "kfc-drawer", "aria-label": "Logs del nodo", children: /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ y.jsx("div", { children: /* @__PURE__ */ y.jsx("div", { className: "kfc-drawer__title", children: "Nodo no encontrado" }) }),
      /* @__PURE__ */ y.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-times" }) })
    ] }) });
  const f = (u == null ? void 0 : u.status) || "pending", d = ((h = (S = u == null ? void 0 : u.output) == null ? void 0 : S.main) == null ? void 0 : h.flat()) || [], p = ((m = u == null ? void 0 : u.output) == null ? void 0 : m.error) || [], x = d.length;
  return /* @__PURE__ */ y.jsxs("aside", { className: "kfc-drawer", "aria-label": `Logs del nodo ${l.id}`, children: [
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ y.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__title", title: (a == null ? void 0 : a.displayName) || l.type, children: [
          /* @__PURE__ */ y.jsx(
            "i",
            {
              className: _e((a == null ? void 0 : a.icon) || "pi pi-circle"),
              style: { color: (a == null ? void 0 : a.color) || "#5E72E4", marginRight: 6 }
            }
          ),
          (a == null ? void 0 : a.displayName) || l.type
        ] }),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__sub", children: [
          /* @__PURE__ */ y.jsx("span", { className: _e("kfc-node__status", `kfc-node__status--${f}`), children: f }),
          (u == null ? void 0 : u.durationMs) != null && /* @__PURE__ */ y.jsxs("span", { children: [
            "· ",
            md(u.durationMs)
          ] }),
          (u == null ? void 0 : u.attempt) != null && /* @__PURE__ */ y.jsxs("span", { children: [
            "· intento ",
            u.attempt
          ] })
        ] })
      ] }),
      /* @__PURE__ */ y.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-times" }) })
    ] }),
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__tabs", role: "tablist", children: [
      /* @__PURE__ */ y.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "output",
          className: _e("kfc-drawer__tab", { "is-active": i === "output" }),
          onClick: () => s("output"),
          children: [
            "Salida ",
            x > 0 && /* @__PURE__ */ y.jsx("span", { className: "kfc-drawer__tab-count", children: x })
          ]
        }
      ),
      /* @__PURE__ */ y.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "input",
          className: _e("kfc-drawer__tab", { "is-active": i === "input" }),
          onClick: () => s("input"),
          children: [
            "Entrada ",
            c.length > 0 && /* @__PURE__ */ y.jsx("span", { className: "kfc-drawer__tab-count", children: c.length })
          ]
        }
      ),
      /* @__PURE__ */ y.jsx(
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
      /* @__PURE__ */ y.jsx(
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
    /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__body", children: [
      !u && /* @__PURE__ */ y.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__title", children: "Sin datos de ejecución" }),
        /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "Este nodo no se ha ejecutado en el run actual. Probá ejecutar el flow." })
      ] }),
      u && i === "output" && /* @__PURE__ */ y.jsx(y.Fragment, { children: d.length === 0 ? /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de salida." }) : d.map((g, w) => /* @__PURE__ */ y.jsx(Dl, { index: w, item: g }, w)) }),
      u && i === "input" && /* @__PURE__ */ y.jsx(y.Fragment, { children: c.length === 0 ? /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de entrada (probablemente es un trigger)." }) : c.map((g, w) => /* @__PURE__ */ y.jsx(Dl, { index: w, item: g }, w)) }),
      u && i === "error" && /* @__PURE__ */ y.jsxs("div", { style: { padding: 12 }, children: [
        u.error ? /* @__PURE__ */ y.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d", color: "#fee2e2" }, children: `${u.error.code || "ERROR"}: ${u.error.message}

${u.error.stack || ""}` }) : /* @__PURE__ */ y.jsx("div", { className: "kfc-empty__desc", children: "Sin errores." }),
        p.length > 0 && /* @__PURE__ */ y.jsxs(y.Fragment, { children: [
          /* @__PURE__ */ y.jsx("div", { className: "kfc-drawer__section-title", children: "Items en branch de error" }),
          p.map((g, w) => /* @__PURE__ */ y.jsx(Dl, { index: w, item: g }, w))
        ] })
      ] }),
      u && i === "meta" && /* @__PURE__ */ y.jsxs("div", { style: { padding: 12, fontSize: 12 }, children: [
        /* @__PURE__ */ y.jsx(Jt, { k: "Status", v: u.status }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Iniciado", v: u.startedAt || "—" }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Finalizado", v: u.finishedAt || "—" }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Duración", v: u.durationMs != null ? md(u.durationMs) : "—" }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Intento", v: String(u.attempt ?? "—") }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Items salida", v: String(x) }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Spec", v: (a == null ? void 0 : a.type) || l.type }),
        /* @__PURE__ */ y.jsx(Jt, { k: "Versión spec", v: a ? `v${a.version}` : "—" })
      ] })
    ] })
  ] });
}, Dl = ({ item: e, index: t }) => {
  const [n, r] = P.useState(t < 3);
  return /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__item", children: [
    /* @__PURE__ */ y.jsxs(
      "button",
      {
        type: "button",
        className: "kfc-drawer__item-head",
        onClick: () => r((o) => !o),
        "aria-expanded": n,
        children: [
          /* @__PURE__ */ y.jsx("i", { className: `pi ${n ? "pi-chevron-down" : "pi-chevron-right"}` }),
          /* @__PURE__ */ y.jsxs("span", { children: [
            "Item #",
            t + 1
          ] }),
          (e == null ? void 0 : e.json) && typeof e.json == "object" && /* @__PURE__ */ y.jsx("span", { className: "kfc-drawer__item-summary", children: hE(e.json) })
        ]
      }
    ),
    n && /* @__PURE__ */ y.jsx("pre", { className: "kfc-runlist__pre", children: pE(e, 6e3) })
  ] });
}, Jt = ({ k: e, v: t }) => /* @__PURE__ */ y.jsxs("div", { className: "kfc-drawer__kv", children: [
  /* @__PURE__ */ y.jsx("span", { className: "kfc-drawer__kv-k", children: e }),
  /* @__PURE__ */ y.jsx("span", { className: "kfc-drawer__kv-v", children: t })
] });
function pE(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
function md(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function hE(e) {
  if (!e) return "";
  const t = Object.keys(e);
  return t.length === 0 ? "(vacío)" : t.slice(0, 3).join(", ") + (t.length > 3 ? `, +${t.length - 3} más` : "");
}
const mE = [
  {
    slug: "cereza-shopify-sync",
    icon: "pi pi-sync",
    title: "Cereza → Shopify",
    desc: "Sincronizar productos al detectar cambios en Cereza.",
    color: "#16a34a"
  },
  {
    slug: "webhook-notify",
    icon: "pi pi-bell",
    title: "Webhook → Notificar",
    desc: "Recibir webhook y disparar notificación interna.",
    color: "#2563eb"
  },
  {
    slug: "cron-backup",
    icon: "pi pi-clock",
    title: "Cron → Backup",
    desc: "Backup periódico del catálogo a otro destino.",
    color: "#7c3aed"
  }
], gE = ({ readOnly: e, onTemplateClick: t }) => e ? null : /* @__PURE__ */ y.jsx("div", { className: "kfc-canvas-empty", role: "status", "aria-live": "polite", children: /* @__PURE__ */ y.jsxs("div", { className: "kfc-canvas-empty__inner", children: [
  /* @__PURE__ */ y.jsx("div", { className: "kfc-canvas-empty__arrow", "aria-hidden": !0, children: /* @__PURE__ */ y.jsxs("svg", { viewBox: "0 0 80 60", width: "80", height: "60", children: [
    /* @__PURE__ */ y.jsx(
      "path",
      {
        d: "M70 30 Q50 20, 30 30 Q15 38, 8 30",
        stroke: "#94a3b8",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeDasharray: "4 4",
        fill: "none"
      }
    ),
    /* @__PURE__ */ y.jsx("polygon", { points: "14,24 6,30 14,36", fill: "#94a3b8" })
  ] }) }),
  /* @__PURE__ */ y.jsx("h2", { className: "kfc-canvas-empty__title", children: "Empezá tu flujo" }),
  /* @__PURE__ */ y.jsx("p", { className: "kfc-canvas-empty__desc", children: "Arrastrá un nodo desde el catálogo de la izquierda hacia este canvas. O empezá con una plantilla rápida." }),
  /* @__PURE__ */ y.jsx("div", { className: "kfc-canvas-empty__templates", children: mE.map((n) => /* @__PURE__ */ y.jsxs(
    "button",
    {
      type: "button",
      className: "kfc-template-card",
      onClick: () => t == null ? void 0 : t(n.slug),
      style: { borderLeftColor: n.color },
      children: [
        /* @__PURE__ */ y.jsx("i", { className: `kfc-template-card__icon ${n.icon}`, style: { color: n.color } }),
        /* @__PURE__ */ y.jsxs("div", { className: "kfc-template-card__body", children: [
          /* @__PURE__ */ y.jsx("div", { className: "kfc-template-card__title", children: n.title }),
          /* @__PURE__ */ y.jsx("div", { className: "kfc-template-card__desc", children: n.desc })
        ] }),
        /* @__PURE__ */ y.jsx("i", { className: "pi pi-arrow-right kfc-template-card__cta" })
      ]
    },
    n.slug
  )) }),
  /* @__PURE__ */ y.jsxs("div", { className: "kfc-canvas-empty__hint", children: [
    /* @__PURE__ */ y.jsx("i", { className: "pi pi-info-circle" }),
    /* @__PURE__ */ y.jsxs("span", { children: [
      "Tip: presioná ",
      /* @__PURE__ */ y.jsx("kbd", { children: "?" }),
      " para ver todos los atajos de teclado."
    ] })
  ] })
] }) }), yE = ({
  onGraphChange: e,
  onNodeSelected: t,
  onRunRequested: n,
  onIntent: r
}) => {
  const o = Y((D) => D.graph), i = Y((D) => D.selectedNodeId), s = Y((D) => D.setSelectedNodeId), l = Y((D) => D.readOnly), a = Y((D) => D.runContext), u = Y((D) => D.rightView), c = Y((D) => D.setRightView), f = Y((D) => D.drawerNodeId), d = Y((D) => D.setDrawerNodeId), p = Y((D) => D.applyAutoLayout), [x, v] = I.useState(!1);
  P.useEffect(() => {
    e(o), v(sg(o));
  }, [o, e]), P.useEffect(() => {
    t(i), i && u === "none" ? c("config") : !i && u === "config" && c("none");
  }, [i]);
  const S = P.useCallback(
    (D) => {
      s(D);
    },
    [s]
  ), h = P.useCallback(() => {
    c("none"), s(null);
  }, [s, c]), m = P.useCallback(() => {
    n({ triggerData: [] });
  }, [n]), g = P.useCallback(() => {
    p(), r && r("autoLayoutApplied");
  }, [p, r]), w = P.useCallback(() => {
    r && r("showShortcuts");
  }, [r]), N = a == null ? void 0 : a.status, M = N === "running", z = P.useMemo(() => {
    if (!a) return null;
    const D = Object.values(a.nodeStates || {}), V = D.length, _ = D.filter((j) => j.status === "success" || j.status === "failed" || j.status === "skipped").length, C = D.filter((j) => j.status === "failed").length;
    return { total: V, done: _, failed: C };
  }, [a]), T = !o.nodes || o.nodes.length === 0, k = P.useCallback(() => d(null), [d]), R = u === "config" && i, F = u === "runs";
  return /* @__PURE__ */ y.jsx(sc, { children: /* @__PURE__ */ y.jsxs("div", { className: "kfc-root", children: [
    /* @__PURE__ */ y.jsx(GS, { readOnly: l }),
    /* @__PURE__ */ y.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }, children: [
      /* @__PURE__ */ y.jsxs("div", { className: "kfc-toolbar", children: [
        /* @__PURE__ */ y.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: () => c(u === "runs" ? "none" : "runs"),
            title: "Ver historial / detalles del run",
            children: [
              /* @__PURE__ */ y.jsx("i", { className: "pi pi-history" }),
              "Historial"
            ]
          }
        ),
        !l && /* @__PURE__ */ y.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: g,
            title: "Reorganizar nodos automáticamente",
            children: [
              /* @__PURE__ */ y.jsx("i", { className: "pi pi-sitemap" }),
              "Reorganizar"
            ]
          }
        ),
        !l && /* @__PURE__ */ y.jsx(
          "button",
          {
            type: "button",
            className: `kfc-btn kfc-btn--primary ${M ? "kfc-btn--running" : ""}`,
            onClick: m,
            disabled: M,
            title: "Ejecutar test-run (Ctrl+Enter)",
            children: M ? /* @__PURE__ */ y.jsxs(y.Fragment, { children: [
              /* @__PURE__ */ y.jsx("i", { className: "pi pi-spin pi-spinner" }),
              "Ejecutando…"
            ] }) : /* @__PURE__ */ y.jsxs(y.Fragment, { children: [
              /* @__PURE__ */ y.jsx("i", { className: "pi pi-play" }),
              "Ejecutar"
            ] })
          }
        ),
        z && z.total > 0 && /* @__PURE__ */ y.jsxs(
          "span",
          {
            className: `kfc-run-badge kfc-run-badge--${N === "success" ? "success" : N === "failed" ? "failed" : M ? "running" : "neutral"}`,
            title: `Run: ${N}`,
            children: [
              M && /* @__PURE__ */ y.jsx("i", { className: "pi pi-spin pi-spinner" }),
              !M && N === "success" && /* @__PURE__ */ y.jsx("i", { className: "pi pi-check-circle" }),
              !M && N === "failed" && /* @__PURE__ */ y.jsx("i", { className: "pi pi-times-circle" }),
              z.done,
              "/",
              z.total,
              " nodos",
              z.failed > 0 && /* @__PURE__ */ y.jsxs("span", { className: "kfc-run-badge__failed", children: [
                "· ",
                z.failed,
                " con error"
              ] })
            ]
          }
        ),
        x && /* @__PURE__ */ y.jsxs("span", { className: "kfc-pill kfc-pill--danger", title: "Hay un ciclo en el grafo", children: [
          /* @__PURE__ */ y.jsx("i", { className: "pi pi-exclamation-triangle" }),
          "Ciclo detectado · revisá conexiones"
        ] }),
        /* @__PURE__ */ y.jsx("span", { style: { flex: 1 } }),
        /* @__PURE__ */ y.jsx(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--ghost",
            onClick: w,
            title: "Atajos de teclado (?)",
            "aria-label": "Atajos de teclado",
            children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-question-circle" })
          }
        ),
        l && /* @__PURE__ */ y.jsxs("span", { className: "kfc-pill kfc-pill--neutral", children: [
          /* @__PURE__ */ y.jsx("i", { className: "pi pi-lock" }),
          "Solo lectura"
        ] })
      ] }),
      /* @__PURE__ */ y.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
        /* @__PURE__ */ y.jsx(XS, { onSelectNode: S, onIntent: r }),
        T && /* @__PURE__ */ y.jsx(
          gE,
          {
            readOnly: l,
            onTemplateClick: (D) => r == null ? void 0 : r("installTemplate", { slug: D })
          }
        )
      ] })
    ] }),
    R && /* @__PURE__ */ y.jsx(
      JS,
      {
        onClose: h,
        onOpenIntegrations: (D) => r == null ? void 0 : r("openIntegrations", { provider: D })
      }
    ),
    F && /* @__PURE__ */ y.jsxs("aside", { className: "kfc-config", "aria-label": "Historial de ejecuciones", children: [
      /* @__PURE__ */ y.jsxs("div", { className: "kfc-config__header", children: [
        /* @__PURE__ */ y.jsxs("div", { children: [
          /* @__PURE__ */ y.jsx("div", { className: "kfc-config__title", children: "Detalles del run" }),
          a && /* @__PURE__ */ y.jsxs("div", { style: { fontSize: 11, color: "#6b7280" }, children: [
            N,
            " · ",
            a.totalDurationMs ?? "—",
            " ms"
          ] })
        ] }),
        /* @__PURE__ */ y.jsx("button", { type: "button", className: "kfc-btn", onClick: () => c("none"), "aria-label": "Cerrar", children: /* @__PURE__ */ y.jsx("i", { className: "pi pi-times" }) })
      ] }),
      /* @__PURE__ */ y.jsx("div", { className: "kfc-config__body", style: { padding: 0 }, children: /* @__PURE__ */ y.jsx(cE, { runContext: a }) })
    ] }),
    f && /* @__PURE__ */ y.jsx(dE, { nodeId: f, onClose: k })
  ] }) });
};
class vE extends HTMLElement {
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
    this._graph = n || { nodes: [], edges: [] }, this.suppressEmit = !0, Y.getState().setGraph(this._graph), this.suppressEmit = !1;
  }
  get graph() {
    return Y.getState().graph;
  }
  set nodeCatalog(n) {
    this._catalog = Array.isArray(n) ? n : [], Y.getState().setCatalog(this._catalog);
  }
  get nodeCatalog() {
    return Y.getState().catalog;
  }
  set runContext(n) {
    this._runContext = n, Y.getState().setRunContext(n);
  }
  get runContext() {
    return Y.getState().runContext;
  }
  set readOnly(n) {
    this._readOnly = !!n, Y.getState().setReadOnly(this._readOnly);
  }
  get readOnly() {
    return Y.getState().readOnly;
  }
  set selectedNodeId(n) {
    this._selectedNodeId = n, Y.getState().setSelectedNodeId(n);
  }
  get selectedNodeId() {
    return Y.getState().selectedNodeId;
  }
  set connectedProviders(n) {
    this._connectedProviders = Array.isArray(n) ? n : null, Y.getState().setConnectedProviders(this._connectedProviders);
  }
  get connectedProviders() {
    return Y.getState().connectedProviders;
  }
  static get observedAttributes() {
    return ["read-only"];
  }
  attributeChangedCallback(n, r, o) {
    n === "read-only" && (this.readOnly = o !== null && o !== "false");
  }
  connectedCallback() {
    this.root || (this.mountPoint = document.createElement("div"), this.mountPoint.style.width = "100%", this.mountPoint.style.height = "100%", this.mountPoint.style.position = "relative", this.mountPoint.style.display = "flex", this.style.display = this.style.display || "block", this.style.position = this.style.position || "relative", this.style.minHeight = this.style.minHeight || "500px", this.appendChild(this.mountPoint), Y.getState().setGraph(this._graph), Y.getState().setCatalog(this._catalog), Y.getState().setRunContext(this._runContext), Y.getState().setReadOnly(this._readOnly), Y.getState().setSelectedNodeId(this._selectedNodeId), Y.getState().setConnectedProviders(this._connectedProviders), this.root = Ph(this.mountPoint), this.root.render(
      /* @__PURE__ */ y.jsx(
        yE,
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
      n.preventDefault(), Y.getState().readOnly || this.emitRunRequested({ triggerData: [] });
      return;
    }
    if (n.key === "Escape") {
      const s = Y.getState();
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
customElements.get("katuq-flow-canvas") || customElements.define("katuq-flow-canvas", vE);
export {
  vE as KatuqFlowCanvas
};
//# sourceMappingURL=flow-canvas.js.map
