var s0 = Object.defineProperty;
var l0 = (e, t, n) => t in e ? s0(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var mt = (e, t, n) => l0(e, typeof t != "symbol" ? t + "" : t, n);
function su(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Id = { exports: {} }, As = {}, Dd = { exports: {} }, ee = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var ri = Symbol.for("react.element"), a0 = Symbol.for("react.portal"), u0 = Symbol.for("react.fragment"), c0 = Symbol.for("react.strict_mode"), f0 = Symbol.for("react.profiler"), d0 = Symbol.for("react.provider"), p0 = Symbol.for("react.context"), h0 = Symbol.for("react.forward_ref"), m0 = Symbol.for("react.suspense"), g0 = Symbol.for("react.memo"), y0 = Symbol.for("react.lazy"), zc = Symbol.iterator;
function v0(e) {
  return e === null || typeof e != "object" ? null : (e = zc && e[zc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var Ld = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Od = Object.assign, bd = {};
function Ur(e, t, n) {
  this.props = e, this.context = t, this.refs = bd, this.updater = n || Ld;
}
Ur.prototype.isReactComponent = {};
Ur.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Ur.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Fd() {
}
Fd.prototype = Ur.prototype;
function lu(e, t, n) {
  this.props = e, this.context = t, this.refs = bd, this.updater = n || Ld;
}
var au = lu.prototype = new Fd();
au.constructor = lu;
Od(au, Ur.prototype);
au.isPureReactComponent = !0;
var jc = Array.isArray, Hd = Object.prototype.hasOwnProperty, uu = { current: null }, Vd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Bd(e, t, n) {
  var r, o = {}, i = null, s = null;
  if (t != null) for (r in t.ref !== void 0 && (s = t.ref), t.key !== void 0 && (i = "" + t.key), t) Hd.call(t, r) && !Vd.hasOwnProperty(r) && (o[r] = t[r]);
  var l = arguments.length - 2;
  if (l === 1) o.children = n;
  else if (1 < l) {
    for (var a = Array(l), u = 0; u < l; u++) a[u] = arguments[u + 2];
    o.children = a;
  }
  if (e && e.defaultProps) for (r in l = e.defaultProps, l) o[r] === void 0 && (o[r] = l[r]);
  return { $$typeof: ri, type: e, key: i, ref: s, props: o, _owner: uu.current };
}
function x0(e, t) {
  return { $$typeof: ri, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function cu(e) {
  return typeof e == "object" && e !== null && e.$$typeof === ri;
}
function w0(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var Mc = /\/+/g;
function ul(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? w0("" + e.key) : t.toString(36);
}
function Li(e, t, n, r, o) {
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
        case ri:
        case a0:
          s = !0;
      }
  }
  if (s) return s = e, o = o(s), e = r === "" ? "." + ul(s, 0) : r, jc(o) ? (n = "", e != null && (n = e.replace(Mc, "$&/") + "/"), Li(o, t, n, "", function(u) {
    return u;
  })) : o != null && (cu(o) && (o = x0(o, n + (!o.key || s && s.key === o.key ? "" : ("" + o.key).replace(Mc, "$&/") + "/") + e)), t.push(o)), 1;
  if (s = 0, r = r === "" ? "." : r + ":", jc(e)) for (var l = 0; l < e.length; l++) {
    i = e[l];
    var a = r + ul(i, l);
    s += Li(i, t, n, a, o);
  }
  else if (a = v0(e), typeof a == "function") for (e = a.call(e), l = 0; !(i = e.next()).done; ) i = i.value, a = r + ul(i, l++), s += Li(i, t, n, a, o);
  else if (i === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return s;
}
function fi(e, t, n) {
  if (e == null) return e;
  var r = [], o = 0;
  return Li(e, r, "", "", function(i) {
    return t.call(n, i, o++);
  }), r;
}
function _0(e) {
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
var Be = { current: null }, Oi = { transition: null }, k0 = { ReactCurrentDispatcher: Be, ReactCurrentBatchConfig: Oi, ReactCurrentOwner: uu };
function Ud() {
  throw Error("act(...) is not supported in production builds of React.");
}
ee.Children = { map: fi, forEach: function(e, t, n) {
  fi(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return fi(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return fi(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!cu(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
ee.Component = Ur;
ee.Fragment = u0;
ee.Profiler = f0;
ee.PureComponent = lu;
ee.StrictMode = c0;
ee.Suspense = m0;
ee.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = k0;
ee.act = Ud;
ee.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Od({}, e.props), o = e.key, i = e.ref, s = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (i = t.ref, s = uu.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps) var l = e.type.defaultProps;
    for (a in t) Hd.call(t, a) && !Vd.hasOwnProperty(a) && (r[a] = t[a] === void 0 && l !== void 0 ? l[a] : t[a]);
  }
  var a = arguments.length - 2;
  if (a === 1) r.children = n;
  else if (1 < a) {
    l = Array(a);
    for (var u = 0; u < a; u++) l[u] = arguments[u + 2];
    r.children = l;
  }
  return { $$typeof: ri, type: e.type, key: o, ref: i, props: r, _owner: s };
};
ee.createContext = function(e) {
  return e = { $$typeof: p0, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: d0, _context: e }, e.Consumer = e;
};
ee.createElement = Bd;
ee.createFactory = function(e) {
  var t = Bd.bind(null, e);
  return t.type = e, t;
};
ee.createRef = function() {
  return { current: null };
};
ee.forwardRef = function(e) {
  return { $$typeof: h0, render: e };
};
ee.isValidElement = cu;
ee.lazy = function(e) {
  return { $$typeof: y0, _payload: { _status: -1, _result: e }, _init: _0 };
};
ee.memo = function(e, t) {
  return { $$typeof: g0, type: e, compare: t === void 0 ? null : t };
};
ee.startTransition = function(e) {
  var t = Oi.transition;
  Oi.transition = {};
  try {
    e();
  } finally {
    Oi.transition = t;
  }
};
ee.unstable_act = Ud;
ee.useCallback = function(e, t) {
  return Be.current.useCallback(e, t);
};
ee.useContext = function(e) {
  return Be.current.useContext(e);
};
ee.useDebugValue = function() {
};
ee.useDeferredValue = function(e) {
  return Be.current.useDeferredValue(e);
};
ee.useEffect = function(e, t) {
  return Be.current.useEffect(e, t);
};
ee.useId = function() {
  return Be.current.useId();
};
ee.useImperativeHandle = function(e, t, n) {
  return Be.current.useImperativeHandle(e, t, n);
};
ee.useInsertionEffect = function(e, t) {
  return Be.current.useInsertionEffect(e, t);
};
ee.useLayoutEffect = function(e, t) {
  return Be.current.useLayoutEffect(e, t);
};
ee.useMemo = function(e, t) {
  return Be.current.useMemo(e, t);
};
ee.useReducer = function(e, t, n) {
  return Be.current.useReducer(e, t, n);
};
ee.useRef = function(e) {
  return Be.current.useRef(e);
};
ee.useState = function(e) {
  return Be.current.useState(e);
};
ee.useSyncExternalStore = function(e, t, n) {
  return Be.current.useSyncExternalStore(e, t, n);
};
ee.useTransition = function() {
  return Be.current.useTransition();
};
ee.version = "18.3.1";
Dd.exports = ee;
var N = Dd.exports;
const I = /* @__PURE__ */ su(N);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var S0 = N, E0 = Symbol.for("react.element"), N0 = Symbol.for("react.fragment"), C0 = Object.prototype.hasOwnProperty, P0 = S0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, z0 = { key: !0, ref: !0, __self: !0, __source: !0 };
function Wd(e, t, n) {
  var r, o = {}, i = null, s = null;
  n !== void 0 && (i = "" + n), t.key !== void 0 && (i = "" + t.key), t.ref !== void 0 && (s = t.ref);
  for (r in t) C0.call(t, r) && !z0.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: E0, type: e, key: i, ref: s, props: o, _owner: P0.current };
}
As.Fragment = N0;
As.jsx = Wd;
As.jsxs = Wd;
Id.exports = As;
var g = Id.exports, Yd = { exports: {} }, rt = {}, Xd = { exports: {} }, qd = {};
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
  function t(E, _) {
    var M = E.length;
    E.push(_);
    e: for (; 0 < M; ) {
      var R = M - 1 >>> 1, L = E[R];
      if (0 < o(L, _)) E[R] = _, E[M] = L, M = R;
      else break e;
    }
  }
  function n(E) {
    return E.length === 0 ? null : E[0];
  }
  function r(E) {
    if (E.length === 0) return null;
    var _ = E[0], M = E.pop();
    if (M !== _) {
      E[0] = M;
      e: for (var R = 0, L = E.length, B = L >>> 1; R < B; ) {
        var U = 2 * (R + 1) - 1, W = E[U], q = U + 1, Q = E[q];
        if (0 > o(W, M)) q < L && 0 > o(Q, W) ? (E[R] = Q, E[q] = M, R = q) : (E[R] = W, E[U] = M, R = U);
        else if (q < L && 0 > o(Q, M)) E[R] = Q, E[q] = M, R = q;
        else break e;
      }
    }
    return _;
  }
  function o(E, _) {
    var M = E.sortIndex - _.sortIndex;
    return M !== 0 ? M : E.id - _.id;
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
  var a = [], u = [], c = 1, f = null, d = 3, p = !1, w = !1, y = !1, k = typeof setTimeout == "function" ? setTimeout : null, h = typeof clearTimeout == "function" ? clearTimeout : null, m = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function v(E) {
    for (var _ = n(u); _ !== null; ) {
      if (_.callback === null) r(u);
      else if (_.startTime <= E) r(u), _.sortIndex = _.expirationTime, t(a, _);
      else break;
      _ = n(u);
    }
  }
  function x(E) {
    if (y = !1, v(E), !w) if (n(a) !== null) w = !0, j(C);
    else {
      var _ = n(u);
      _ !== null && O(x, _.startTime - E);
    }
  }
  function C(E, _) {
    w = !1, y && (y = !1, h(P), P = -1), p = !0;
    var M = d;
    try {
      for (v(_), f = n(a); f !== null && (!(f.expirationTime > _) || E && !F()); ) {
        var R = f.callback;
        if (typeof R == "function") {
          f.callback = null, d = f.priorityLevel;
          var L = R(f.expirationTime <= _);
          _ = e.unstable_now(), typeof L == "function" ? f.callback = L : f === n(a) && r(a), v(_);
        } else r(a);
        f = n(a);
      }
      if (f !== null) var B = !0;
      else {
        var U = n(u);
        U !== null && O(x, U.startTime - _), B = !1;
      }
      return B;
    } finally {
      f = null, d = M, p = !1;
    }
  }
  var z = !1, T = null, P = -1, $ = 5, D = -1;
  function F() {
    return !(e.unstable_now() - D < $);
  }
  function b() {
    if (T !== null) {
      var E = e.unstable_now();
      D = E;
      var _ = !0;
      try {
        _ = T(!0, E);
      } finally {
        _ ? H() : (z = !1, T = null);
      }
    } else z = !1;
  }
  var H;
  if (typeof m == "function") H = function() {
    m(b);
  };
  else if (typeof MessageChannel < "u") {
    var S = new MessageChannel(), A = S.port2;
    S.port1.onmessage = b, H = function() {
      A.postMessage(null);
    };
  } else H = function() {
    k(b, 0);
  };
  function j(E) {
    T = E, z || (z = !0, H());
  }
  function O(E, _) {
    P = k(function() {
      E(e.unstable_now());
    }, _);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(E) {
    E.callback = null;
  }, e.unstable_continueExecution = function() {
    w || p || (w = !0, j(C));
  }, e.unstable_forceFrameRate = function(E) {
    0 > E || 125 < E ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : $ = 0 < E ? Math.floor(1e3 / E) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return d;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(a);
  }, e.unstable_next = function(E) {
    switch (d) {
      case 1:
      case 2:
      case 3:
        var _ = 3;
        break;
      default:
        _ = d;
    }
    var M = d;
    d = _;
    try {
      return E();
    } finally {
      d = M;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(E, _) {
    switch (E) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        E = 3;
    }
    var M = d;
    d = E;
    try {
      return _();
    } finally {
      d = M;
    }
  }, e.unstable_scheduleCallback = function(E, _, M) {
    var R = e.unstable_now();
    switch (typeof M == "object" && M !== null ? (M = M.delay, M = typeof M == "number" && 0 < M ? R + M : R) : M = R, E) {
      case 1:
        var L = -1;
        break;
      case 2:
        L = 250;
        break;
      case 5:
        L = 1073741823;
        break;
      case 4:
        L = 1e4;
        break;
      default:
        L = 5e3;
    }
    return L = M + L, E = { id: c++, callback: _, priorityLevel: E, startTime: M, expirationTime: L, sortIndex: -1 }, M > R ? (E.sortIndex = M, t(u, E), n(a) === null && E === n(u) && (y ? (h(P), P = -1) : y = !0, O(x, M - R))) : (E.sortIndex = L, t(a, E), w || p || (w = !0, j(C))), E;
  }, e.unstable_shouldYield = F, e.unstable_wrapCallback = function(E) {
    var _ = d;
    return function() {
      var M = d;
      d = _;
      try {
        return E.apply(this, arguments);
      } finally {
        d = M;
      }
    };
  };
})(qd);
Xd.exports = qd;
var j0 = Xd.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var M0 = N, tt = j0;
function V(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Kd = /* @__PURE__ */ new Set(), jo = {};
function Qn(e, t) {
  $r(e, t), $r(e + "Capture", t);
}
function $r(e, t) {
  for (jo[e] = t, e = 0; e < t.length; e++) Kd.add(t[e]);
}
var Wt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ql = Object.prototype.hasOwnProperty, T0 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, Tc = {}, $c = {};
function $0(e) {
  return ql.call($c, e) ? !0 : ql.call(Tc, e) ? !1 : T0.test(e) ? $c[e] = !0 : (Tc[e] = !0, !1);
}
function A0(e, t, n, r) {
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
function R0(e, t, n, r) {
  if (t === null || typeof t > "u" || A0(e, t, n, r)) return !0;
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
function Ue(e, t, n, r, o, i, s) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = o, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = i, this.removeEmptyString = s;
}
var Te = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  Te[e] = new Ue(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  Te[t] = new Ue(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  Te[e] = new Ue(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  Te[e] = new Ue(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  Te[e] = new Ue(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  Te[e] = new Ue(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  Te[e] = new Ue(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  Te[e] = new Ue(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  Te[e] = new Ue(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var fu = /[\-:]([a-z])/g;
function du(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    fu,
    du
  );
  Te[t] = new Ue(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(fu, du);
  Te[t] = new Ue(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(fu, du);
  Te[t] = new Ue(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  Te[e] = new Ue(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
Te.xlinkHref = new Ue("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  Te[e] = new Ue(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function pu(e, t, n, r) {
  var o = Te.hasOwnProperty(t) ? Te[t] : null;
  (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (R0(t, n, o, r) && (n = null), r || o === null ? $0(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName, r = o.attributeNamespace, n === null ? e.removeAttribute(t) : (o = o.type, n = o === 3 || o === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Qt = M0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, di = Symbol.for("react.element"), cr = Symbol.for("react.portal"), fr = Symbol.for("react.fragment"), hu = Symbol.for("react.strict_mode"), Kl = Symbol.for("react.profiler"), Gd = Symbol.for("react.provider"), Qd = Symbol.for("react.context"), mu = Symbol.for("react.forward_ref"), Gl = Symbol.for("react.suspense"), Ql = Symbol.for("react.suspense_list"), gu = Symbol.for("react.memo"), tn = Symbol.for("react.lazy"), Zd = Symbol.for("react.offscreen"), Ac = Symbol.iterator;
function Zr(e) {
  return e === null || typeof e != "object" ? null : (e = Ac && e[Ac] || e["@@iterator"], typeof e == "function" ? e : null);
}
var pe = Object.assign, cl;
function fo(e) {
  if (cl === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    cl = t && t[1] || "";
  }
  return `
` + cl + e;
}
var fl = !1;
function dl(e, t) {
  if (!e || fl) return "";
  fl = !0;
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
    fl = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? fo(e) : "";
}
function I0(e) {
  switch (e.tag) {
    case 5:
      return fo(e.type);
    case 16:
      return fo("Lazy");
    case 13:
      return fo("Suspense");
    case 19:
      return fo("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = dl(e.type, !1), e;
    case 11:
      return e = dl(e.type.render, !1), e;
    case 1:
      return e = dl(e.type, !0), e;
    default:
      return "";
  }
}
function Zl(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case fr:
      return "Fragment";
    case cr:
      return "Portal";
    case Kl:
      return "Profiler";
    case hu:
      return "StrictMode";
    case Gl:
      return "Suspense";
    case Ql:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case Qd:
      return (e.displayName || "Context") + ".Consumer";
    case Gd:
      return (e._context.displayName || "Context") + ".Provider";
    case mu:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case gu:
      return t = e.displayName || null, t !== null ? t : Zl(e.type) || "Memo";
    case tn:
      t = e._payload, e = e._init;
      try {
        return Zl(e(t));
      } catch {
      }
  }
  return null;
}
function D0(e) {
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
      return Zl(t);
    case 8:
      return t === hu ? "StrictMode" : "Mode";
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
function wn(e) {
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
function Jd(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function L0(e) {
  var t = Jd(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
function pi(e) {
  e._valueTracker || (e._valueTracker = L0(e));
}
function ep(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Jd(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function Ji(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Jl(e, t) {
  var n = t.checked;
  return pe({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function Rc(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = wn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function tp(e, t) {
  t = t.checked, t != null && pu(e, "checked", t, !1);
}
function ea(e, t) {
  tp(e, t);
  var n = wn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? ta(e, t.type, n) : t.hasOwnProperty("defaultValue") && ta(e, t.type, wn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function Ic(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function ta(e, t, n) {
  (t !== "number" || Ji(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var po = Array.isArray;
function Sr(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var o = 0; o < n.length; o++) t["$" + n[o]] = !0;
    for (n = 0; n < e.length; n++) o = t.hasOwnProperty("$" + e[n].value), e[n].selected !== o && (e[n].selected = o), o && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + wn(n), t = null, o = 0; o < e.length; o++) {
      if (e[o].value === n) {
        e[o].selected = !0, r && (e[o].defaultSelected = !0);
        return;
      }
      t !== null || e[o].disabled || (t = e[o]);
    }
    t !== null && (t.selected = !0);
  }
}
function na(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(V(91));
  return pe({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function Dc(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(V(92));
      if (po(n)) {
        if (1 < n.length) throw Error(V(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: wn(n) };
}
function np(e, t) {
  var n = wn(t.value), r = wn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function Lc(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function rp(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function ra(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? rp(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var hi, op = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, o) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, o);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (hi = hi || document.createElement("div"), hi.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = hi.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function Mo(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var wo = {
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
}, O0 = ["Webkit", "ms", "Moz", "O"];
Object.keys(wo).forEach(function(e) {
  O0.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), wo[t] = wo[e];
  });
});
function ip(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || wo.hasOwnProperty(e) && wo[e] ? ("" + t).trim() : t + "px";
}
function sp(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, o = ip(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : e[n] = o;
  }
}
var b0 = pe({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function oa(e, t) {
  if (t) {
    if (b0[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(V(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(V(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(V(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(V(62));
  }
}
function ia(e, t) {
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
var sa = null;
function yu(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var la = null, Er = null, Nr = null;
function Oc(e) {
  if (e = si(e)) {
    if (typeof la != "function") throw Error(V(280));
    var t = e.stateNode;
    t && (t = Os(t), la(e.stateNode, e.type, t));
  }
}
function lp(e) {
  Er ? Nr ? Nr.push(e) : Nr = [e] : Er = e;
}
function ap() {
  if (Er) {
    var e = Er, t = Nr;
    if (Nr = Er = null, Oc(e), t) for (e = 0; e < t.length; e++) Oc(t[e]);
  }
}
function up(e, t) {
  return e(t);
}
function cp() {
}
var pl = !1;
function fp(e, t, n) {
  if (pl) return e(t, n);
  pl = !0;
  try {
    return up(e, t, n);
  } finally {
    pl = !1, (Er !== null || Nr !== null) && (cp(), ap());
  }
}
function To(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = Os(n);
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
var aa = !1;
if (Wt) try {
  var Jr = {};
  Object.defineProperty(Jr, "passive", { get: function() {
    aa = !0;
  } }), window.addEventListener("test", Jr, Jr), window.removeEventListener("test", Jr, Jr);
} catch {
  aa = !1;
}
function F0(e, t, n, r, o, i, s, l, a) {
  var u = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, u);
  } catch (c) {
    this.onError(c);
  }
}
var _o = !1, es = null, ts = !1, ua = null, H0 = { onError: function(e) {
  _o = !0, es = e;
} };
function V0(e, t, n, r, o, i, s, l, a) {
  _o = !1, es = null, F0.apply(H0, arguments);
}
function B0(e, t, n, r, o, i, s, l, a) {
  if (V0.apply(this, arguments), _o) {
    if (_o) {
      var u = es;
      _o = !1, es = null;
    } else throw Error(V(198));
    ts || (ts = !0, ua = u);
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
function dp(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function bc(e) {
  if (Zn(e) !== e) throw Error(V(188));
}
function U0(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Zn(e), t === null) throw Error(V(188));
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
        if (i === n) return bc(o), e;
        if (i === r) return bc(o), t;
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
function pp(e) {
  return e = U0(e), e !== null ? hp(e) : null;
}
function hp(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = hp(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var mp = tt.unstable_scheduleCallback, Fc = tt.unstable_cancelCallback, W0 = tt.unstable_shouldYield, Y0 = tt.unstable_requestPaint, ye = tt.unstable_now, X0 = tt.unstable_getCurrentPriorityLevel, vu = tt.unstable_ImmediatePriority, gp = tt.unstable_UserBlockingPriority, ns = tt.unstable_NormalPriority, q0 = tt.unstable_LowPriority, yp = tt.unstable_IdlePriority, Rs = null, Mt = null;
function K0(e) {
  if (Mt && typeof Mt.onCommitFiberRoot == "function") try {
    Mt.onCommitFiberRoot(Rs, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var kt = Math.clz32 ? Math.clz32 : Z0, G0 = Math.log, Q0 = Math.LN2;
function Z0(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (G0(e) / Q0 | 0) | 0;
}
var mi = 64, gi = 4194304;
function ho(e) {
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
function rs(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, o = e.suspendedLanes, i = e.pingedLanes, s = n & 268435455;
  if (s !== 0) {
    var l = s & ~o;
    l !== 0 ? r = ho(l) : (i &= s, i !== 0 && (r = ho(i)));
  } else s = n & ~o, s !== 0 ? r = ho(s) : i !== 0 && (r = ho(i));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & o) && (o = r & -r, i = t & -t, o >= i || o === 16 && (i & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - kt(t), o = 1 << n, r |= e[n], t &= ~o;
  return r;
}
function J0(e, t) {
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
function ey(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
    var s = 31 - kt(i), l = 1 << s, a = o[s];
    a === -1 ? (!(l & n) || l & r) && (o[s] = J0(l, t)) : a <= t && (e.expiredLanes |= l), i &= ~l;
  }
}
function ca(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function vp() {
  var e = mi;
  return mi <<= 1, !(mi & 4194240) && (mi = 64), e;
}
function hl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function oi(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - kt(t), e[t] = n;
}
function ty(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var o = 31 - kt(n), i = 1 << o;
    t[o] = 0, r[o] = -1, e[o] = -1, n &= ~i;
  }
}
function xu(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - kt(n), o = 1 << r;
    o & t | e[r] & t && (e[r] |= t), n &= ~o;
  }
}
var oe = 0;
function xp(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var wp, wu, _p, kp, Sp, fa = !1, yi = [], fn = null, dn = null, pn = null, $o = /* @__PURE__ */ new Map(), Ao = /* @__PURE__ */ new Map(), sn = [], ny = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Hc(e, t) {
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
      $o.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Ao.delete(t.pointerId);
  }
}
function eo(e, t, n, r, o, i) {
  return e === null || e.nativeEvent !== i ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: i, targetContainers: [o] }, t !== null && (t = si(t), t !== null && wu(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e);
}
function ry(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return fn = eo(fn, e, t, n, r, o), !0;
    case "dragenter":
      return dn = eo(dn, e, t, n, r, o), !0;
    case "mouseover":
      return pn = eo(pn, e, t, n, r, o), !0;
    case "pointerover":
      var i = o.pointerId;
      return $o.set(i, eo($o.get(i) || null, e, t, n, r, o)), !0;
    case "gotpointercapture":
      return i = o.pointerId, Ao.set(i, eo(Ao.get(i) || null, e, t, n, r, o)), !0;
  }
  return !1;
}
function Ep(e) {
  var t = In(e.target);
  if (t !== null) {
    var n = Zn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = dp(n), t !== null) {
          e.blockedOn = t, Sp(e.priority, function() {
            _p(n);
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
function bi(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = da(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      sa = r, n.target.dispatchEvent(r), sa = null;
    } else return t = si(n), t !== null && wu(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function Vc(e, t, n) {
  bi(e) && n.delete(t);
}
function oy() {
  fa = !1, fn !== null && bi(fn) && (fn = null), dn !== null && bi(dn) && (dn = null), pn !== null && bi(pn) && (pn = null), $o.forEach(Vc), Ao.forEach(Vc);
}
function to(e, t) {
  e.blockedOn === t && (e.blockedOn = null, fa || (fa = !0, tt.unstable_scheduleCallback(tt.unstable_NormalPriority, oy)));
}
function Ro(e) {
  function t(o) {
    return to(o, e);
  }
  if (0 < yi.length) {
    to(yi[0], e);
    for (var n = 1; n < yi.length; n++) {
      var r = yi[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (fn !== null && to(fn, e), dn !== null && to(dn, e), pn !== null && to(pn, e), $o.forEach(t), Ao.forEach(t), n = 0; n < sn.length; n++) r = sn[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < sn.length && (n = sn[0], n.blockedOn === null); ) Ep(n), n.blockedOn === null && sn.shift();
}
var Cr = Qt.ReactCurrentBatchConfig, os = !0;
function iy(e, t, n, r) {
  var o = oe, i = Cr.transition;
  Cr.transition = null;
  try {
    oe = 1, _u(e, t, n, r);
  } finally {
    oe = o, Cr.transition = i;
  }
}
function sy(e, t, n, r) {
  var o = oe, i = Cr.transition;
  Cr.transition = null;
  try {
    oe = 4, _u(e, t, n, r);
  } finally {
    oe = o, Cr.transition = i;
  }
}
function _u(e, t, n, r) {
  if (os) {
    var o = da(e, t, n, r);
    if (o === null) El(e, t, r, is, n), Hc(e, r);
    else if (ry(o, e, t, n, r)) r.stopPropagation();
    else if (Hc(e, r), t & 4 && -1 < ny.indexOf(e)) {
      for (; o !== null; ) {
        var i = si(o);
        if (i !== null && wp(i), i = da(e, t, n, r), i === null && El(e, t, r, is, n), i === o) break;
        o = i;
      }
      o !== null && r.stopPropagation();
    } else El(e, t, r, null, n);
  }
}
var is = null;
function da(e, t, n, r) {
  if (is = null, e = yu(r), e = In(e), e !== null) if (t = Zn(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = dp(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return is = e, null;
}
function Np(e) {
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
      switch (X0()) {
        case vu:
          return 1;
        case gp:
          return 4;
        case ns:
        case q0:
          return 16;
        case yp:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var un = null, ku = null, Fi = null;
function Cp() {
  if (Fi) return Fi;
  var e, t = ku, n = t.length, r, o = "value" in un ? un.value : un.textContent, i = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++) ;
  var s = n - e;
  for (r = 1; r <= s && t[n - r] === o[i - r]; r++) ;
  return Fi = o.slice(e, 1 < r ? 1 - r : void 0);
}
function Hi(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function vi() {
  return !0;
}
function Bc() {
  return !1;
}
function ot(e) {
  function t(n, r, o, i, s) {
    this._reactName = n, this._targetInst = o, this.type = r, this.nativeEvent = i, this.target = s, this.currentTarget = null;
    for (var l in e) e.hasOwnProperty(l) && (n = e[l], this[l] = n ? n(i) : i[l]);
    return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? vi : Bc, this.isPropagationStopped = Bc, this;
  }
  return pe(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = vi);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = vi);
  }, persist: function() {
  }, isPersistent: vi }), t;
}
var Wr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, Su = ot(Wr), ii = pe({}, Wr, { view: 0, detail: 0 }), ly = ot(ii), ml, gl, no, Is = pe({}, ii, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Eu, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== no && (no && e.type === "mousemove" ? (ml = e.screenX - no.screenX, gl = e.screenY - no.screenY) : gl = ml = 0, no = e), ml);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : gl;
} }), Uc = ot(Is), ay = pe({}, Is, { dataTransfer: 0 }), uy = ot(ay), cy = pe({}, ii, { relatedTarget: 0 }), yl = ot(cy), fy = pe({}, Wr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), dy = ot(fy), py = pe({}, Wr, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), hy = ot(py), my = pe({}, Wr, { data: 0 }), Wc = ot(my), gy = {
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
}, yy = {
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
}, vy = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function xy(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = vy[e]) ? !!t[e] : !1;
}
function Eu() {
  return xy;
}
var wy = pe({}, ii, { key: function(e) {
  if (e.key) {
    var t = gy[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Hi(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? yy[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Eu, charCode: function(e) {
  return e.type === "keypress" ? Hi(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Hi(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), _y = ot(wy), ky = pe({}, Is, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Yc = ot(ky), Sy = pe({}, ii, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Eu }), Ey = ot(Sy), Ny = pe({}, Wr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Cy = ot(Ny), Py = pe({}, Is, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), zy = ot(Py), jy = [9, 13, 27, 32], Nu = Wt && "CompositionEvent" in window, ko = null;
Wt && "documentMode" in document && (ko = document.documentMode);
var My = Wt && "TextEvent" in window && !ko, Pp = Wt && (!Nu || ko && 8 < ko && 11 >= ko), Xc = " ", qc = !1;
function zp(e, t) {
  switch (e) {
    case "keyup":
      return jy.indexOf(t.keyCode) !== -1;
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
function jp(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var dr = !1;
function Ty(e, t) {
  switch (e) {
    case "compositionend":
      return jp(t);
    case "keypress":
      return t.which !== 32 ? null : (qc = !0, Xc);
    case "textInput":
      return e = t.data, e === Xc && qc ? null : e;
    default:
      return null;
  }
}
function $y(e, t) {
  if (dr) return e === "compositionend" || !Nu && zp(e, t) ? (e = Cp(), Fi = ku = un = null, dr = !1, e) : null;
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
      return Pp && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var Ay = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function Kc(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!Ay[e.type] : t === "textarea";
}
function Mp(e, t, n, r) {
  lp(r), t = ss(t, "onChange"), 0 < t.length && (n = new Su("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var So = null, Io = null;
function Ry(e) {
  Hp(e, 0);
}
function Ds(e) {
  var t = mr(e);
  if (ep(t)) return e;
}
function Iy(e, t) {
  if (e === "change") return t;
}
var Tp = !1;
if (Wt) {
  var vl;
  if (Wt) {
    var xl = "oninput" in document;
    if (!xl) {
      var Gc = document.createElement("div");
      Gc.setAttribute("oninput", "return;"), xl = typeof Gc.oninput == "function";
    }
    vl = xl;
  } else vl = !1;
  Tp = vl && (!document.documentMode || 9 < document.documentMode);
}
function Qc() {
  So && (So.detachEvent("onpropertychange", $p), Io = So = null);
}
function $p(e) {
  if (e.propertyName === "value" && Ds(Io)) {
    var t = [];
    Mp(t, Io, e, yu(e)), fp(Ry, t);
  }
}
function Dy(e, t, n) {
  e === "focusin" ? (Qc(), So = t, Io = n, So.attachEvent("onpropertychange", $p)) : e === "focusout" && Qc();
}
function Ly(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ds(Io);
}
function Oy(e, t) {
  if (e === "click") return Ds(t);
}
function by(e, t) {
  if (e === "input" || e === "change") return Ds(t);
}
function Fy(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Et = typeof Object.is == "function" ? Object.is : Fy;
function Do(e, t) {
  if (Et(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!ql.call(t, o) || !Et(e[o], t[o])) return !1;
  }
  return !0;
}
function Zc(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function Jc(e, t) {
  var n = Zc(e);
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
    n = Zc(n);
  }
}
function Ap(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ap(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function Rp() {
  for (var e = window, t = Ji(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Ji(e.document);
  }
  return t;
}
function Cu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function Hy(e) {
  var t = Rp(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && Ap(n.ownerDocument.documentElement, n)) {
    if (r !== null && Cu(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var o = n.textContent.length, i = Math.min(r.start, o);
        r = r.end === void 0 ? i : Math.min(r.end, o), !e.extend && i > r && (o = r, r = i, i = o), o = Jc(n, i);
        var s = Jc(
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
var Vy = Wt && "documentMode" in document && 11 >= document.documentMode, pr = null, pa = null, Eo = null, ha = !1;
function ef(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  ha || pr == null || pr !== Ji(r) || (r = pr, "selectionStart" in r && Cu(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Eo && Do(Eo, r) || (Eo = r, r = ss(pa, "onSelect"), 0 < r.length && (t = new Su("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = pr)));
}
function xi(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var hr = { animationend: xi("Animation", "AnimationEnd"), animationiteration: xi("Animation", "AnimationIteration"), animationstart: xi("Animation", "AnimationStart"), transitionend: xi("Transition", "TransitionEnd") }, wl = {}, Ip = {};
Wt && (Ip = document.createElement("div").style, "AnimationEvent" in window || (delete hr.animationend.animation, delete hr.animationiteration.animation, delete hr.animationstart.animation), "TransitionEvent" in window || delete hr.transitionend.transition);
function Ls(e) {
  if (wl[e]) return wl[e];
  if (!hr[e]) return e;
  var t = hr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in Ip) return wl[e] = t[n];
  return e;
}
var Dp = Ls("animationend"), Lp = Ls("animationiteration"), Op = Ls("animationstart"), bp = Ls("transitionend"), Fp = /* @__PURE__ */ new Map(), tf = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function Sn(e, t) {
  Fp.set(e, t), Qn(t, [e]);
}
for (var _l = 0; _l < tf.length; _l++) {
  var kl = tf[_l], By = kl.toLowerCase(), Uy = kl[0].toUpperCase() + kl.slice(1);
  Sn(By, "on" + Uy);
}
Sn(Dp, "onAnimationEnd");
Sn(Lp, "onAnimationIteration");
Sn(Op, "onAnimationStart");
Sn("dblclick", "onDoubleClick");
Sn("focusin", "onFocus");
Sn("focusout", "onBlur");
Sn(bp, "onTransitionEnd");
$r("onMouseEnter", ["mouseout", "mouseover"]);
$r("onMouseLeave", ["mouseout", "mouseover"]);
$r("onPointerEnter", ["pointerout", "pointerover"]);
$r("onPointerLeave", ["pointerout", "pointerover"]);
Qn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
Qn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
Qn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
Qn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
Qn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
Qn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var mo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Wy = new Set("cancel close invalid load scroll toggle".split(" ").concat(mo));
function nf(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, B0(r, t, void 0, e), e.currentTarget = null;
}
function Hp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], o = r.event;
    r = r.listeners;
    e: {
      var i = void 0;
      if (t) for (var s = r.length - 1; 0 <= s; s--) {
        var l = r[s], a = l.instance, u = l.currentTarget;
        if (l = l.listener, a !== i && o.isPropagationStopped()) break e;
        nf(o, l, u), i = a;
      }
      else for (s = 0; s < r.length; s++) {
        if (l = r[s], a = l.instance, u = l.currentTarget, l = l.listener, a !== i && o.isPropagationStopped()) break e;
        nf(o, l, u), i = a;
      }
    }
  }
  if (ts) throw e = ua, ts = !1, ua = null, e;
}
function ae(e, t) {
  var n = t[xa];
  n === void 0 && (n = t[xa] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (Vp(t, e, 2, !1), n.add(r));
}
function Sl(e, t, n) {
  var r = 0;
  t && (r |= 4), Vp(n, e, r, t);
}
var wi = "_reactListening" + Math.random().toString(36).slice(2);
function Lo(e) {
  if (!e[wi]) {
    e[wi] = !0, Kd.forEach(function(n) {
      n !== "selectionchange" && (Wy.has(n) || Sl(n, !1, e), Sl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[wi] || (t[wi] = !0, Sl("selectionchange", !1, t));
  }
}
function Vp(e, t, n, r) {
  switch (Np(t)) {
    case 1:
      var o = iy;
      break;
    case 4:
      o = sy;
      break;
    default:
      o = _u;
  }
  n = o.bind(null, t, n, e), o = void 0, !aa || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), r ? o !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: o }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, { passive: o }) : e.addEventListener(t, n, !1);
}
function El(e, t, n, r, o) {
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
        if (s = In(l), s === null) return;
        if (a = s.tag, a === 5 || a === 6) {
          r = i = s;
          continue e;
        }
        l = l.parentNode;
      }
    }
    r = r.return;
  }
  fp(function() {
    var u = i, c = yu(n), f = [];
    e: {
      var d = Fp.get(e);
      if (d !== void 0) {
        var p = Su, w = e;
        switch (e) {
          case "keypress":
            if (Hi(n) === 0) break e;
          case "keydown":
          case "keyup":
            p = _y;
            break;
          case "focusin":
            w = "focus", p = yl;
            break;
          case "focusout":
            w = "blur", p = yl;
            break;
          case "beforeblur":
          case "afterblur":
            p = yl;
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
            p = Uc;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            p = uy;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            p = Ey;
            break;
          case Dp:
          case Lp:
          case Op:
            p = dy;
            break;
          case bp:
            p = Cy;
            break;
          case "scroll":
            p = ly;
            break;
          case "wheel":
            p = zy;
            break;
          case "copy":
          case "cut":
          case "paste":
            p = hy;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            p = Yc;
        }
        var y = (t & 4) !== 0, k = !y && e === "scroll", h = y ? d !== null ? d + "Capture" : null : d;
        y = [];
        for (var m = u, v; m !== null; ) {
          v = m;
          var x = v.stateNode;
          if (v.tag === 5 && x !== null && (v = x, h !== null && (x = To(m, h), x != null && y.push(Oo(m, x, v)))), k) break;
          m = m.return;
        }
        0 < y.length && (d = new p(d, w, null, n, c), f.push({ event: d, listeners: y }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (d = e === "mouseover" || e === "pointerover", p = e === "mouseout" || e === "pointerout", d && n !== sa && (w = n.relatedTarget || n.fromElement) && (In(w) || w[Yt])) break e;
        if ((p || d) && (d = c.window === c ? c : (d = c.ownerDocument) ? d.defaultView || d.parentWindow : window, p ? (w = n.relatedTarget || n.toElement, p = u, w = w ? In(w) : null, w !== null && (k = Zn(w), w !== k || w.tag !== 5 && w.tag !== 6) && (w = null)) : (p = null, w = u), p !== w)) {
          if (y = Uc, x = "onMouseLeave", h = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (y = Yc, x = "onPointerLeave", h = "onPointerEnter", m = "pointer"), k = p == null ? d : mr(p), v = w == null ? d : mr(w), d = new y(x, m + "leave", p, n, c), d.target = k, d.relatedTarget = v, x = null, In(c) === u && (y = new y(h, m + "enter", w, n, c), y.target = v, y.relatedTarget = k, x = y), k = x, p && w) t: {
            for (y = p, h = w, m = 0, v = y; v; v = or(v)) m++;
            for (v = 0, x = h; x; x = or(x)) v++;
            for (; 0 < m - v; ) y = or(y), m--;
            for (; 0 < v - m; ) h = or(h), v--;
            for (; m--; ) {
              if (y === h || h !== null && y === h.alternate) break t;
              y = or(y), h = or(h);
            }
            y = null;
          }
          else y = null;
          p !== null && rf(f, d, p, y, !1), w !== null && k !== null && rf(f, k, w, y, !0);
        }
      }
      e: {
        if (d = u ? mr(u) : window, p = d.nodeName && d.nodeName.toLowerCase(), p === "select" || p === "input" && d.type === "file") var C = Iy;
        else if (Kc(d)) if (Tp) C = by;
        else {
          C = Ly;
          var z = Dy;
        }
        else (p = d.nodeName) && p.toLowerCase() === "input" && (d.type === "checkbox" || d.type === "radio") && (C = Oy);
        if (C && (C = C(e, u))) {
          Mp(f, C, n, c);
          break e;
        }
        z && z(e, d, u), e === "focusout" && (z = d._wrapperState) && z.controlled && d.type === "number" && ta(d, "number", d.value);
      }
      switch (z = u ? mr(u) : window, e) {
        case "focusin":
          (Kc(z) || z.contentEditable === "true") && (pr = z, pa = u, Eo = null);
          break;
        case "focusout":
          Eo = pa = pr = null;
          break;
        case "mousedown":
          ha = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          ha = !1, ef(f, n, c);
          break;
        case "selectionchange":
          if (Vy) break;
        case "keydown":
        case "keyup":
          ef(f, n, c);
      }
      var T;
      if (Nu) e: {
        switch (e) {
          case "compositionstart":
            var P = "onCompositionStart";
            break e;
          case "compositionend":
            P = "onCompositionEnd";
            break e;
          case "compositionupdate":
            P = "onCompositionUpdate";
            break e;
        }
        P = void 0;
      }
      else dr ? zp(e, n) && (P = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (P = "onCompositionStart");
      P && (Pp && n.locale !== "ko" && (dr || P !== "onCompositionStart" ? P === "onCompositionEnd" && dr && (T = Cp()) : (un = c, ku = "value" in un ? un.value : un.textContent, dr = !0)), z = ss(u, P), 0 < z.length && (P = new Wc(P, e, null, n, c), f.push({ event: P, listeners: z }), T ? P.data = T : (T = jp(n), T !== null && (P.data = T)))), (T = My ? Ty(e, n) : $y(e, n)) && (u = ss(u, "onBeforeInput"), 0 < u.length && (c = new Wc("onBeforeInput", "beforeinput", null, n, c), f.push({ event: c, listeners: u }), c.data = T));
    }
    Hp(f, t);
  });
}
function Oo(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function ss(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var o = e, i = o.stateNode;
    o.tag === 5 && i !== null && (o = i, i = To(e, n), i != null && r.unshift(Oo(e, i, o)), i = To(e, t), i != null && r.push(Oo(e, i, o))), e = e.return;
  }
  return r;
}
function or(e) {
  if (e === null) return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function rf(e, t, n, r, o) {
  for (var i = t._reactName, s = []; n !== null && n !== r; ) {
    var l = n, a = l.alternate, u = l.stateNode;
    if (a !== null && a === r) break;
    l.tag === 5 && u !== null && (l = u, o ? (a = To(n, i), a != null && s.unshift(Oo(n, a, l))) : o || (a = To(n, i), a != null && s.push(Oo(n, a, l)))), n = n.return;
  }
  s.length !== 0 && e.push({ event: t, listeners: s });
}
var Yy = /\r\n?/g, Xy = /\u0000|\uFFFD/g;
function of(e) {
  return (typeof e == "string" ? e : "" + e).replace(Yy, `
`).replace(Xy, "");
}
function _i(e, t, n) {
  if (t = of(t), of(e) !== t && n) throw Error(V(425));
}
function ls() {
}
var ma = null, ga = null;
function ya(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var va = typeof setTimeout == "function" ? setTimeout : void 0, qy = typeof clearTimeout == "function" ? clearTimeout : void 0, sf = typeof Promise == "function" ? Promise : void 0, Ky = typeof queueMicrotask == "function" ? queueMicrotask : typeof sf < "u" ? function(e) {
  return sf.resolve(null).then(e).catch(Gy);
} : va;
function Gy(e) {
  setTimeout(function() {
    throw e;
  });
}
function Nl(e, t) {
  var n = t, r = 0;
  do {
    var o = n.nextSibling;
    if (e.removeChild(n), o && o.nodeType === 8) if (n = o.data, n === "/$") {
      if (r === 0) {
        e.removeChild(o), Ro(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = o;
  } while (n);
  Ro(t);
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
function lf(e) {
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
var Yr = Math.random().toString(36).slice(2), jt = "__reactFiber$" + Yr, bo = "__reactProps$" + Yr, Yt = "__reactContainer$" + Yr, xa = "__reactEvents$" + Yr, Qy = "__reactListeners$" + Yr, Zy = "__reactHandles$" + Yr;
function In(e) {
  var t = e[jt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Yt] || n[jt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = lf(e); e !== null; ) {
        if (n = e[jt]) return n;
        e = lf(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function si(e) {
  return e = e[jt] || e[Yt], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function mr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(V(33));
}
function Os(e) {
  return e[bo] || null;
}
var wa = [], gr = -1;
function En(e) {
  return { current: e };
}
function ue(e) {
  0 > gr || (e.current = wa[gr], wa[gr] = null, gr--);
}
function le(e, t) {
  gr++, wa[gr] = e.current, e.current = t;
}
var _n = {}, Oe = En(_n), qe = En(!1), Un = _n;
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
function as() {
  ue(qe), ue(Oe);
}
function af(e, t, n) {
  if (Oe.current !== _n) throw Error(V(168));
  le(Oe, t), le(qe, n);
}
function Bp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(V(108, D0(e) || "Unknown", o));
  return pe({}, n, r);
}
function us(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || _n, Un = Oe.current, le(Oe, e), le(qe, qe.current), !0;
}
function uf(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(V(169));
  n ? (e = Bp(e, t, Un), r.__reactInternalMemoizedMergedChildContext = e, ue(qe), ue(Oe), le(Oe, e)) : ue(qe), le(qe, n);
}
var bt = null, bs = !1, Cl = !1;
function Up(e) {
  bt === null ? bt = [e] : bt.push(e);
}
function Jy(e) {
  bs = !0, Up(e);
}
function Nn() {
  if (!Cl && bt !== null) {
    Cl = !0;
    var e = 0, t = oe;
    try {
      var n = bt;
      for (oe = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      bt = null, bs = !1;
    } catch (o) {
      throw bt !== null && (bt = bt.slice(e + 1)), mp(vu, Nn), o;
    } finally {
      oe = t, Cl = !1;
    }
  }
  return null;
}
var yr = [], vr = 0, cs = null, fs = 0, it = [], st = 0, Wn = null, Ft = 1, Ht = "";
function $n(e, t) {
  yr[vr++] = fs, yr[vr++] = cs, cs = e, fs = t;
}
function Wp(e, t, n) {
  it[st++] = Ft, it[st++] = Ht, it[st++] = Wn, Wn = e;
  var r = Ft;
  e = Ht;
  var o = 32 - kt(r) - 1;
  r &= ~(1 << o), n += 1;
  var i = 32 - kt(t) + o;
  if (30 < i) {
    var s = o - o % 5;
    i = (r & (1 << s) - 1).toString(32), r >>= s, o -= s, Ft = 1 << 32 - kt(t) + o | n << o | r, Ht = i + e;
  } else Ft = 1 << i | n << o | r, Ht = e;
}
function Pu(e) {
  e.return !== null && ($n(e, 1), Wp(e, 1, 0));
}
function zu(e) {
  for (; e === cs; ) cs = yr[--vr], yr[vr] = null, fs = yr[--vr], yr[vr] = null;
  for (; e === Wn; ) Wn = it[--st], it[st] = null, Ht = it[--st], it[st] = null, Ft = it[--st], it[st] = null;
}
var et = null, Je = null, ce = !1, wt = null;
function Yp(e, t) {
  var n = at(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function cf(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, et = e, Je = hn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, et = e, Je = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Wn !== null ? { id: Ft, overflow: Ht } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = at(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, et = e, Je = null, !0) : !1;
    default:
      return !1;
  }
}
function _a(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function ka(e) {
  if (ce) {
    var t = Je;
    if (t) {
      var n = t;
      if (!cf(e, t)) {
        if (_a(e)) throw Error(V(418));
        t = hn(n.nextSibling);
        var r = et;
        t && cf(e, t) ? Yp(r, n) : (e.flags = e.flags & -4097 | 2, ce = !1, et = e);
      }
    } else {
      if (_a(e)) throw Error(V(418));
      e.flags = e.flags & -4097 | 2, ce = !1, et = e;
    }
  }
}
function ff(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  et = e;
}
function ki(e) {
  if (e !== et) return !1;
  if (!ce) return ff(e), ce = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !ya(e.type, e.memoizedProps)), t && (t = Je)) {
    if (_a(e)) throw Xp(), Error(V(418));
    for (; t; ) Yp(e, t), t = hn(t.nextSibling);
  }
  if (ff(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(V(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              Je = hn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      Je = null;
    }
  } else Je = et ? hn(e.stateNode.nextSibling) : null;
  return !0;
}
function Xp() {
  for (var e = Je; e; ) e = hn(e.nextSibling);
}
function Rr() {
  Je = et = null, ce = !1;
}
function ju(e) {
  wt === null ? wt = [e] : wt.push(e);
}
var ev = Qt.ReactCurrentBatchConfig;
function ro(e, t, n) {
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
function Si(e, t) {
  throw e = Object.prototype.toString.call(t), Error(V(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function df(e) {
  var t = e._init;
  return t(e._payload);
}
function qp(e) {
  function t(h, m) {
    if (e) {
      var v = h.deletions;
      v === null ? (h.deletions = [m], h.flags |= 16) : v.push(m);
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
  function i(h, m, v) {
    return h.index = v, e ? (v = h.alternate, v !== null ? (v = v.index, v < m ? (h.flags |= 2, m) : v) : (h.flags |= 2, m)) : (h.flags |= 1048576, m);
  }
  function s(h) {
    return e && h.alternate === null && (h.flags |= 2), h;
  }
  function l(h, m, v, x) {
    return m === null || m.tag !== 6 ? (m = Al(v, h.mode, x), m.return = h, m) : (m = o(m, v), m.return = h, m);
  }
  function a(h, m, v, x) {
    var C = v.type;
    return C === fr ? c(h, m, v.props.children, x, v.key) : m !== null && (m.elementType === C || typeof C == "object" && C !== null && C.$$typeof === tn && df(C) === m.type) ? (x = o(m, v.props), x.ref = ro(h, m, v), x.return = h, x) : (x = qi(v.type, v.key, v.props, null, h.mode, x), x.ref = ro(h, m, v), x.return = h, x);
  }
  function u(h, m, v, x) {
    return m === null || m.tag !== 4 || m.stateNode.containerInfo !== v.containerInfo || m.stateNode.implementation !== v.implementation ? (m = Rl(v, h.mode, x), m.return = h, m) : (m = o(m, v.children || []), m.return = h, m);
  }
  function c(h, m, v, x, C) {
    return m === null || m.tag !== 7 ? (m = Hn(v, h.mode, x, C), m.return = h, m) : (m = o(m, v), m.return = h, m);
  }
  function f(h, m, v) {
    if (typeof m == "string" && m !== "" || typeof m == "number") return m = Al("" + m, h.mode, v), m.return = h, m;
    if (typeof m == "object" && m !== null) {
      switch (m.$$typeof) {
        case di:
          return v = qi(m.type, m.key, m.props, null, h.mode, v), v.ref = ro(h, null, m), v.return = h, v;
        case cr:
          return m = Rl(m, h.mode, v), m.return = h, m;
        case tn:
          var x = m._init;
          return f(h, x(m._payload), v);
      }
      if (po(m) || Zr(m)) return m = Hn(m, h.mode, v, null), m.return = h, m;
      Si(h, m);
    }
    return null;
  }
  function d(h, m, v, x) {
    var C = m !== null ? m.key : null;
    if (typeof v == "string" && v !== "" || typeof v == "number") return C !== null ? null : l(h, m, "" + v, x);
    if (typeof v == "object" && v !== null) {
      switch (v.$$typeof) {
        case di:
          return v.key === C ? a(h, m, v, x) : null;
        case cr:
          return v.key === C ? u(h, m, v, x) : null;
        case tn:
          return C = v._init, d(
            h,
            m,
            C(v._payload),
            x
          );
      }
      if (po(v) || Zr(v)) return C !== null ? null : c(h, m, v, x, null);
      Si(h, v);
    }
    return null;
  }
  function p(h, m, v, x, C) {
    if (typeof x == "string" && x !== "" || typeof x == "number") return h = h.get(v) || null, l(m, h, "" + x, C);
    if (typeof x == "object" && x !== null) {
      switch (x.$$typeof) {
        case di:
          return h = h.get(x.key === null ? v : x.key) || null, a(m, h, x, C);
        case cr:
          return h = h.get(x.key === null ? v : x.key) || null, u(m, h, x, C);
        case tn:
          var z = x._init;
          return p(h, m, v, z(x._payload), C);
      }
      if (po(x) || Zr(x)) return h = h.get(v) || null, c(m, h, x, C, null);
      Si(m, x);
    }
    return null;
  }
  function w(h, m, v, x) {
    for (var C = null, z = null, T = m, P = m = 0, $ = null; T !== null && P < v.length; P++) {
      T.index > P ? ($ = T, T = null) : $ = T.sibling;
      var D = d(h, T, v[P], x);
      if (D === null) {
        T === null && (T = $);
        break;
      }
      e && T && D.alternate === null && t(h, T), m = i(D, m, P), z === null ? C = D : z.sibling = D, z = D, T = $;
    }
    if (P === v.length) return n(h, T), ce && $n(h, P), C;
    if (T === null) {
      for (; P < v.length; P++) T = f(h, v[P], x), T !== null && (m = i(T, m, P), z === null ? C = T : z.sibling = T, z = T);
      return ce && $n(h, P), C;
    }
    for (T = r(h, T); P < v.length; P++) $ = p(T, h, P, v[P], x), $ !== null && (e && $.alternate !== null && T.delete($.key === null ? P : $.key), m = i($, m, P), z === null ? C = $ : z.sibling = $, z = $);
    return e && T.forEach(function(F) {
      return t(h, F);
    }), ce && $n(h, P), C;
  }
  function y(h, m, v, x) {
    var C = Zr(v);
    if (typeof C != "function") throw Error(V(150));
    if (v = C.call(v), v == null) throw Error(V(151));
    for (var z = C = null, T = m, P = m = 0, $ = null, D = v.next(); T !== null && !D.done; P++, D = v.next()) {
      T.index > P ? ($ = T, T = null) : $ = T.sibling;
      var F = d(h, T, D.value, x);
      if (F === null) {
        T === null && (T = $);
        break;
      }
      e && T && F.alternate === null && t(h, T), m = i(F, m, P), z === null ? C = F : z.sibling = F, z = F, T = $;
    }
    if (D.done) return n(
      h,
      T
    ), ce && $n(h, P), C;
    if (T === null) {
      for (; !D.done; P++, D = v.next()) D = f(h, D.value, x), D !== null && (m = i(D, m, P), z === null ? C = D : z.sibling = D, z = D);
      return ce && $n(h, P), C;
    }
    for (T = r(h, T); !D.done; P++, D = v.next()) D = p(T, h, P, D.value, x), D !== null && (e && D.alternate !== null && T.delete(D.key === null ? P : D.key), m = i(D, m, P), z === null ? C = D : z.sibling = D, z = D);
    return e && T.forEach(function(b) {
      return t(h, b);
    }), ce && $n(h, P), C;
  }
  function k(h, m, v, x) {
    if (typeof v == "object" && v !== null && v.type === fr && v.key === null && (v = v.props.children), typeof v == "object" && v !== null) {
      switch (v.$$typeof) {
        case di:
          e: {
            for (var C = v.key, z = m; z !== null; ) {
              if (z.key === C) {
                if (C = v.type, C === fr) {
                  if (z.tag === 7) {
                    n(h, z.sibling), m = o(z, v.props.children), m.return = h, h = m;
                    break e;
                  }
                } else if (z.elementType === C || typeof C == "object" && C !== null && C.$$typeof === tn && df(C) === z.type) {
                  n(h, z.sibling), m = o(z, v.props), m.ref = ro(h, z, v), m.return = h, h = m;
                  break e;
                }
                n(h, z);
                break;
              } else t(h, z);
              z = z.sibling;
            }
            v.type === fr ? (m = Hn(v.props.children, h.mode, x, v.key), m.return = h, h = m) : (x = qi(v.type, v.key, v.props, null, h.mode, x), x.ref = ro(h, m, v), x.return = h, h = x);
          }
          return s(h);
        case cr:
          e: {
            for (z = v.key; m !== null; ) {
              if (m.key === z) if (m.tag === 4 && m.stateNode.containerInfo === v.containerInfo && m.stateNode.implementation === v.implementation) {
                n(h, m.sibling), m = o(m, v.children || []), m.return = h, h = m;
                break e;
              } else {
                n(h, m);
                break;
              }
              else t(h, m);
              m = m.sibling;
            }
            m = Rl(v, h.mode, x), m.return = h, h = m;
          }
          return s(h);
        case tn:
          return z = v._init, k(h, m, z(v._payload), x);
      }
      if (po(v)) return w(h, m, v, x);
      if (Zr(v)) return y(h, m, v, x);
      Si(h, v);
    }
    return typeof v == "string" && v !== "" || typeof v == "number" ? (v = "" + v, m !== null && m.tag === 6 ? (n(h, m.sibling), m = o(m, v), m.return = h, h = m) : (n(h, m), m = Al(v, h.mode, x), m.return = h, h = m), s(h)) : n(h, m);
  }
  return k;
}
var Ir = qp(!0), Kp = qp(!1), ds = En(null), ps = null, xr = null, Mu = null;
function Tu() {
  Mu = xr = ps = null;
}
function $u(e) {
  var t = ds.current;
  ue(ds), e._currentValue = t;
}
function Sa(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Pr(e, t) {
  ps = e, Mu = xr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (Ye = !0), e.firstContext = null);
}
function dt(e) {
  var t = e._currentValue;
  if (Mu !== e) if (e = { context: e, memoizedValue: t, next: null }, xr === null) {
    if (ps === null) throw Error(V(308));
    xr = e, ps.dependencies = { lanes: 0, firstContext: e };
  } else xr = xr.next = e;
  return t;
}
var Dn = null;
function Au(e) {
  Dn === null ? Dn = [e] : Dn.push(e);
}
function Gp(e, t, n, r) {
  var o = t.interleaved;
  return o === null ? (n.next = n, Au(t)) : (n.next = o.next, o.next = n), t.interleaved = n, Xt(e, r);
}
function Xt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var nn = !1;
function Ru(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function Qp(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function Bt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function mn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, re & 2) {
    var o = r.pending;
    return o === null ? t.next = t : (t.next = o.next, o.next = t), r.pending = t, Xt(e, n);
  }
  return o = r.interleaved, o === null ? (t.next = t, Au(r)) : (t.next = o.next, o.next = t), r.interleaved = t, Xt(e, n);
}
function Vi(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, xu(e, n);
  }
}
function pf(e, t) {
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
function hs(e, t, n, r) {
  var o = e.updateQueue;
  nn = !1;
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
          var w = e, y = l;
          switch (d = t, p = n, y.tag) {
            case 1:
              if (w = y.payload, typeof w == "function") {
                f = w.call(p, f, d);
                break e;
              }
              f = w;
              break e;
            case 3:
              w.flags = w.flags & -65537 | 128;
            case 0:
              if (w = y.payload, d = typeof w == "function" ? w.call(p, f, d) : w, d == null) break e;
              f = pe({}, f, d);
              break e;
            case 2:
              nn = !0;
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
    Xn |= s, e.lanes = s, e.memoizedState = f;
  }
}
function hf(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], o = r.callback;
    if (o !== null) {
      if (r.callback = null, r = n, typeof o != "function") throw Error(V(191, o));
      o.call(r);
    }
  }
}
var li = {}, Tt = En(li), Fo = En(li), Ho = En(li);
function Ln(e) {
  if (e === li) throw Error(V(174));
  return e;
}
function Iu(e, t) {
  switch (le(Ho, t), le(Fo, e), le(Tt, li), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : ra(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = ra(t, e);
  }
  ue(Tt), le(Tt, t);
}
function Dr() {
  ue(Tt), ue(Fo), ue(Ho);
}
function Zp(e) {
  Ln(Ho.current);
  var t = Ln(Tt.current), n = ra(t, e.type);
  t !== n && (le(Fo, e), le(Tt, n));
}
function Du(e) {
  Fo.current === e && (ue(Tt), ue(Fo));
}
var fe = En(0);
function ms(e) {
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
var Pl = [];
function Lu() {
  for (var e = 0; e < Pl.length; e++) Pl[e]._workInProgressVersionPrimary = null;
  Pl.length = 0;
}
var Bi = Qt.ReactCurrentDispatcher, zl = Qt.ReactCurrentBatchConfig, Yn = 0, de = null, _e = null, Ne = null, gs = !1, No = !1, Vo = 0, tv = 0;
function Ie() {
  throw Error(V(321));
}
function Ou(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!Et(e[n], t[n])) return !1;
  return !0;
}
function bu(e, t, n, r, o, i) {
  if (Yn = i, de = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Bi.current = e === null || e.memoizedState === null ? iv : sv, e = n(r, o), No) {
    i = 0;
    do {
      if (No = !1, Vo = 0, 25 <= i) throw Error(V(301));
      i += 1, Ne = _e = null, t.updateQueue = null, Bi.current = lv, e = n(r, o);
    } while (No);
  }
  if (Bi.current = ys, t = _e !== null && _e.next !== null, Yn = 0, Ne = _e = de = null, gs = !1, t) throw Error(V(300));
  return e;
}
function Fu() {
  var e = Vo !== 0;
  return Vo = 0, e;
}
function zt() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return Ne === null ? de.memoizedState = Ne = e : Ne = Ne.next = e, Ne;
}
function pt() {
  if (_e === null) {
    var e = de.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = _e.next;
  var t = Ne === null ? de.memoizedState : Ne.next;
  if (t !== null) Ne = t, _e = e;
  else {
    if (e === null) throw Error(V(310));
    _e = e, e = { memoizedState: _e.memoizedState, baseState: _e.baseState, baseQueue: _e.baseQueue, queue: _e.queue, next: null }, Ne === null ? de.memoizedState = Ne = e : Ne = Ne.next = e;
  }
  return Ne;
}
function Bo(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function jl(e) {
  var t = pt(), n = t.queue;
  if (n === null) throw Error(V(311));
  n.lastRenderedReducer = e;
  var r = _e, o = r.baseQueue, i = n.pending;
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
      if ((Yn & c) === c) a !== null && (a = a.next = { lane: 0, action: u.action, hasEagerState: u.hasEagerState, eagerState: u.eagerState, next: null }), r = u.hasEagerState ? u.eagerState : e(r, u.action);
      else {
        var f = {
          lane: c,
          action: u.action,
          hasEagerState: u.hasEagerState,
          eagerState: u.eagerState,
          next: null
        };
        a === null ? (l = a = f, s = r) : a = a.next = f, de.lanes |= c, Xn |= c;
      }
      u = u.next;
    } while (u !== null && u !== i);
    a === null ? s = r : a.next = l, Et(r, t.memoizedState) || (Ye = !0), t.memoizedState = r, t.baseState = s, t.baseQueue = a, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    o = e;
    do
      i = o.lane, de.lanes |= i, Xn |= i, o = o.next;
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Ml(e) {
  var t = pt(), n = t.queue;
  if (n === null) throw Error(V(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, o = n.pending, i = t.memoizedState;
  if (o !== null) {
    n.pending = null;
    var s = o = o.next;
    do
      i = e(i, s.action), s = s.next;
    while (s !== o);
    Et(i, t.memoizedState) || (Ye = !0), t.memoizedState = i, t.baseQueue === null && (t.baseState = i), n.lastRenderedState = i;
  }
  return [i, r];
}
function Jp() {
}
function eh(e, t) {
  var n = de, r = pt(), o = t(), i = !Et(r.memoizedState, o);
  if (i && (r.memoizedState = o, Ye = !0), r = r.queue, Hu(rh.bind(null, n, r, e), [e]), r.getSnapshot !== t || i || Ne !== null && Ne.memoizedState.tag & 1) {
    if (n.flags |= 2048, Uo(9, nh.bind(null, n, r, o, t), void 0, null), Ce === null) throw Error(V(349));
    Yn & 30 || th(n, t, o);
  }
  return o;
}
function th(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function nh(e, t, n, r) {
  t.value = n, t.getSnapshot = r, oh(t) && ih(e);
}
function rh(e, t, n) {
  return n(function() {
    oh(t) && ih(e);
  });
}
function oh(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Et(e, n);
  } catch {
    return !0;
  }
}
function ih(e) {
  var t = Xt(e, 1);
  t !== null && St(t, e, 1, -1);
}
function mf(e) {
  var t = zt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Bo, lastRenderedState: e }, t.queue = e, e = e.dispatch = ov.bind(null, de, e), [t.memoizedState, e];
}
function Uo(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function sh() {
  return pt().memoizedState;
}
function Ui(e, t, n, r) {
  var o = zt();
  de.flags |= e, o.memoizedState = Uo(1 | t, n, void 0, r === void 0 ? null : r);
}
function Fs(e, t, n, r) {
  var o = pt();
  r = r === void 0 ? null : r;
  var i = void 0;
  if (_e !== null) {
    var s = _e.memoizedState;
    if (i = s.destroy, r !== null && Ou(r, s.deps)) {
      o.memoizedState = Uo(t, n, i, r);
      return;
    }
  }
  de.flags |= e, o.memoizedState = Uo(1 | t, n, i, r);
}
function gf(e, t) {
  return Ui(8390656, 8, e, t);
}
function Hu(e, t) {
  return Fs(2048, 8, e, t);
}
function lh(e, t) {
  return Fs(4, 2, e, t);
}
function ah(e, t) {
  return Fs(4, 4, e, t);
}
function uh(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function ch(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Fs(4, 4, uh.bind(null, t, e), n);
}
function Vu() {
}
function fh(e, t) {
  var n = pt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Ou(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function dh(e, t) {
  var n = pt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Ou(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function ph(e, t, n) {
  return Yn & 21 ? (Et(n, t) || (n = vp(), de.lanes |= n, Xn |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n);
}
function nv(e, t) {
  var n = oe;
  oe = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = zl.transition;
  zl.transition = {};
  try {
    e(!1), t();
  } finally {
    oe = n, zl.transition = r;
  }
}
function hh() {
  return pt().memoizedState;
}
function rv(e, t, n) {
  var r = yn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, mh(e)) gh(t, n);
  else if (n = Gp(e, t, n, r), n !== null) {
    var o = Ve();
    St(n, e, r, o), yh(n, t, r);
  }
}
function ov(e, t, n) {
  var r = yn(e), o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (mh(e)) gh(t, o);
  else {
    var i = e.alternate;
    if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer, i !== null)) try {
      var s = t.lastRenderedState, l = i(s, n);
      if (o.hasEagerState = !0, o.eagerState = l, Et(l, s)) {
        var a = t.interleaved;
        a === null ? (o.next = o, Au(t)) : (o.next = a.next, a.next = o), t.interleaved = o;
        return;
      }
    } catch {
    } finally {
    }
    n = Gp(e, t, o, r), n !== null && (o = Ve(), St(n, e, r, o), yh(n, t, r));
  }
}
function mh(e) {
  var t = e.alternate;
  return e === de || t !== null && t === de;
}
function gh(e, t) {
  No = gs = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function yh(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, xu(e, n);
  }
}
var ys = { readContext: dt, useCallback: Ie, useContext: Ie, useEffect: Ie, useImperativeHandle: Ie, useInsertionEffect: Ie, useLayoutEffect: Ie, useMemo: Ie, useReducer: Ie, useRef: Ie, useState: Ie, useDebugValue: Ie, useDeferredValue: Ie, useTransition: Ie, useMutableSource: Ie, useSyncExternalStore: Ie, useId: Ie, unstable_isNewReconciler: !1 }, iv = { readContext: dt, useCallback: function(e, t) {
  return zt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: dt, useEffect: gf, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Ui(
    4194308,
    4,
    uh.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return Ui(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return Ui(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = zt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = zt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = rv.bind(null, de, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = zt();
  return e = { current: e }, t.memoizedState = e;
}, useState: mf, useDebugValue: Vu, useDeferredValue: function(e) {
  return zt().memoizedState = e;
}, useTransition: function() {
  var e = mf(!1), t = e[0];
  return e = nv.bind(null, e[1]), zt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = de, o = zt();
  if (ce) {
    if (n === void 0) throw Error(V(407));
    n = n();
  } else {
    if (n = t(), Ce === null) throw Error(V(349));
    Yn & 30 || th(r, t, n);
  }
  o.memoizedState = n;
  var i = { value: n, getSnapshot: t };
  return o.queue = i, gf(rh.bind(
    null,
    r,
    i,
    e
  ), [e]), r.flags |= 2048, Uo(9, nh.bind(null, r, i, n, t), void 0, null), n;
}, useId: function() {
  var e = zt(), t = Ce.identifierPrefix;
  if (ce) {
    var n = Ht, r = Ft;
    n = (r & ~(1 << 32 - kt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Vo++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = tv++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, sv = {
  readContext: dt,
  useCallback: fh,
  useContext: dt,
  useEffect: Hu,
  useImperativeHandle: ch,
  useInsertionEffect: lh,
  useLayoutEffect: ah,
  useMemo: dh,
  useReducer: jl,
  useRef: sh,
  useState: function() {
    return jl(Bo);
  },
  useDebugValue: Vu,
  useDeferredValue: function(e) {
    var t = pt();
    return ph(t, _e.memoizedState, e);
  },
  useTransition: function() {
    var e = jl(Bo)[0], t = pt().memoizedState;
    return [e, t];
  },
  useMutableSource: Jp,
  useSyncExternalStore: eh,
  useId: hh,
  unstable_isNewReconciler: !1
}, lv = { readContext: dt, useCallback: fh, useContext: dt, useEffect: Hu, useImperativeHandle: ch, useInsertionEffect: lh, useLayoutEffect: ah, useMemo: dh, useReducer: Ml, useRef: sh, useState: function() {
  return Ml(Bo);
}, useDebugValue: Vu, useDeferredValue: function(e) {
  var t = pt();
  return _e === null ? t.memoizedState = e : ph(t, _e.memoizedState, e);
}, useTransition: function() {
  var e = Ml(Bo)[0], t = pt().memoizedState;
  return [e, t];
}, useMutableSource: Jp, useSyncExternalStore: eh, useId: hh, unstable_isNewReconciler: !1 };
function yt(e, t) {
  if (e && e.defaultProps) {
    t = pe({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function Ea(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : pe({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var Hs = { isMounted: function(e) {
  return (e = e._reactInternals) ? Zn(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = yn(e), i = Bt(r, o);
  i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (St(t, e, o, r), Vi(t, e, o));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = yn(e), i = Bt(r, o);
  i.tag = 1, i.payload = t, n != null && (i.callback = n), t = mn(e, i, o), t !== null && (St(t, e, o, r), Vi(t, e, o));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Ve(), r = yn(e), o = Bt(n, r);
  o.tag = 2, t != null && (o.callback = t), t = mn(e, o, r), t !== null && (St(t, e, r, n), Vi(t, e, r));
} };
function yf(e, t, n, r, o, i, s) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, s) : t.prototype && t.prototype.isPureReactComponent ? !Do(n, r) || !Do(o, i) : !0;
}
function vh(e, t, n) {
  var r = !1, o = _n, i = t.contextType;
  return typeof i == "object" && i !== null ? i = dt(i) : (o = Ke(t) ? Un : Oe.current, r = t.contextTypes, i = (r = r != null) ? Ar(e, o) : _n), t = new t(n, i), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = Hs, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = o, e.__reactInternalMemoizedMaskedChildContext = i), t;
}
function vf(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Hs.enqueueReplaceState(t, t.state, null);
}
function Na(e, t, n, r) {
  var o = e.stateNode;
  o.props = n, o.state = e.memoizedState, o.refs = {}, Ru(e);
  var i = t.contextType;
  typeof i == "object" && i !== null ? o.context = dt(i) : (i = Ke(t) ? Un : Oe.current, o.context = Ar(e, i)), o.state = e.memoizedState, i = t.getDerivedStateFromProps, typeof i == "function" && (Ea(e, t, i, n), o.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state, typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(), t !== o.state && Hs.enqueueReplaceState(o, o.state, null), hs(e, n, o, r), o.state = e.memoizedState), typeof o.componentDidMount == "function" && (e.flags |= 4194308);
}
function Lr(e, t) {
  try {
    var n = "", r = t;
    do
      n += I0(r), r = r.return;
    while (r);
    var o = n;
  } catch (i) {
    o = `
Error generating stack: ` + i.message + `
` + i.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function Tl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function Ca(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var av = typeof WeakMap == "function" ? WeakMap : Map;
function xh(e, t, n) {
  n = Bt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    xs || (xs = !0, Da = r), Ca(e, t);
  }, n;
}
function wh(e, t, n) {
  n = Bt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    n.payload = function() {
      return r(o);
    }, n.callback = function() {
      Ca(e, t);
    };
  }
  var i = e.stateNode;
  return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function() {
    Ca(e, t), typeof r != "function" && (gn === null ? gn = /* @__PURE__ */ new Set([this]) : gn.add(this));
    var s = t.stack;
    this.componentDidCatch(t.value, { componentStack: s !== null ? s : "" });
  }), n;
}
function xf(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new av();
    var o = /* @__PURE__ */ new Set();
    r.set(t, o);
  } else o = r.get(t), o === void 0 && (o = /* @__PURE__ */ new Set(), r.set(t, o));
  o.has(n) || (o.add(n), e = kv.bind(null, e, t, n), t.then(e, e));
}
function wf(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function _f(e, t, n, r, o) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = o, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Bt(-1, 1), t.tag = 2, mn(n, t, 1))), n.lanes |= 1), e);
}
var uv = Qt.ReactCurrentOwner, Ye = !1;
function He(e, t, n, r) {
  t.child = e === null ? Kp(t, null, n, r) : Ir(t, e.child, n, r);
}
function kf(e, t, n, r, o) {
  n = n.render;
  var i = t.ref;
  return Pr(t, o), r = bu(e, t, n, r, i, o), n = Fu(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, qt(e, t, o)) : (ce && n && Pu(t), t.flags |= 1, He(e, t, r, o), t.child);
}
function Sf(e, t, n, r, o) {
  if (e === null) {
    var i = n.type;
    return typeof i == "function" && !Gu(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = i, _h(e, t, i, r, o)) : (e = qi(n.type, null, r, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (i = e.child, !(e.lanes & o)) {
    var s = i.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Do, n(s, r) && e.ref === t.ref) return qt(e, t, o);
  }
  return t.flags |= 1, e = vn(i, r), e.ref = t.ref, e.return = t, t.child = e;
}
function _h(e, t, n, r, o) {
  if (e !== null) {
    var i = e.memoizedProps;
    if (Do(i, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = i, (e.lanes & o) !== 0) e.flags & 131072 && (Ye = !0);
    else return t.lanes = e.lanes, qt(e, t, o);
  }
  return Pa(e, t, n, r, o);
}
function kh(e, t, n) {
  var r = t.pendingProps, o = r.children, i = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, le(_r, Ze), Ze |= n;
  else {
    if (!(n & 1073741824)) return e = i !== null ? i.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, le(_r, Ze), Ze |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = i !== null ? i.baseLanes : n, le(_r, Ze), Ze |= r;
  }
  else i !== null ? (r = i.baseLanes | n, t.memoizedState = null) : r = n, le(_r, Ze), Ze |= r;
  return He(e, t, o, n), t.child;
}
function Sh(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function Pa(e, t, n, r, o) {
  var i = Ke(n) ? Un : Oe.current;
  return i = Ar(t, i), Pr(t, o), n = bu(e, t, n, r, i, o), r = Fu(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, qt(e, t, o)) : (ce && r && Pu(t), t.flags |= 1, He(e, t, n, o), t.child);
}
function Ef(e, t, n, r, o) {
  if (Ke(n)) {
    var i = !0;
    us(t);
  } else i = !1;
  if (Pr(t, o), t.stateNode === null) Wi(e, t), vh(t, n, r), Na(t, n, r, o), r = !0;
  else if (e === null) {
    var s = t.stateNode, l = t.memoizedProps;
    s.props = l;
    var a = s.context, u = n.contextType;
    typeof u == "object" && u !== null ? u = dt(u) : (u = Ke(n) ? Un : Oe.current, u = Ar(t, u));
    var c = n.getDerivedStateFromProps, f = typeof c == "function" || typeof s.getSnapshotBeforeUpdate == "function";
    f || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== r || a !== u) && vf(t, s, r, u), nn = !1;
    var d = t.memoizedState;
    s.state = d, hs(t, r, s, o), a = t.memoizedState, l !== r || d !== a || qe.current || nn ? (typeof c == "function" && (Ea(t, n, c, r), a = t.memoizedState), (l = nn || yf(t, n, l, r, d, a, u)) ? (f || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount()), typeof s.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = a), s.props = r, s.state = a, s.context = u, r = l) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    s = t.stateNode, Qp(e, t), l = t.memoizedProps, u = t.type === t.elementType ? l : yt(t.type, l), s.props = u, f = t.pendingProps, d = s.context, a = n.contextType, typeof a == "object" && a !== null ? a = dt(a) : (a = Ke(n) ? Un : Oe.current, a = Ar(t, a));
    var p = n.getDerivedStateFromProps;
    (c = typeof p == "function" || typeof s.getSnapshotBeforeUpdate == "function") || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== f || d !== a) && vf(t, s, r, a), nn = !1, d = t.memoizedState, s.state = d, hs(t, r, s, o);
    var w = t.memoizedState;
    l !== f || d !== w || qe.current || nn ? (typeof p == "function" && (Ea(t, n, p, r), w = t.memoizedState), (u = nn || yf(t, n, u, r, d, w, a) || !1) ? (c || typeof s.UNSAFE_componentWillUpdate != "function" && typeof s.componentWillUpdate != "function" || (typeof s.componentWillUpdate == "function" && s.componentWillUpdate(r, w, a), typeof s.UNSAFE_componentWillUpdate == "function" && s.UNSAFE_componentWillUpdate(r, w, a)), typeof s.componentDidUpdate == "function" && (t.flags |= 4), typeof s.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = w), s.props = r, s.state = w, s.context = a, r = u) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return za(e, t, n, r, i, o);
}
function za(e, t, n, r, o, i) {
  Sh(e, t);
  var s = (t.flags & 128) !== 0;
  if (!r && !s) return o && uf(t, n, !1), qt(e, t, i);
  r = t.stateNode, uv.current = t;
  var l = s && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && s ? (t.child = Ir(t, e.child, null, i), t.child = Ir(t, null, l, i)) : He(e, t, l, i), t.memoizedState = r.state, o && uf(t, n, !0), t.child;
}
function Eh(e) {
  var t = e.stateNode;
  t.pendingContext ? af(e, t.pendingContext, t.pendingContext !== t.context) : t.context && af(e, t.context, !1), Iu(e, t.containerInfo);
}
function Nf(e, t, n, r, o) {
  return Rr(), ju(o), t.flags |= 256, He(e, t, n, r), t.child;
}
var ja = { dehydrated: null, treeContext: null, retryLane: 0 };
function Ma(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Nh(e, t, n) {
  var r = t.pendingProps, o = fe.current, i = !1, s = (t.flags & 128) !== 0, l;
  if ((l = s) || (l = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0), l ? (i = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1), le(fe, o & 1), e === null)
    return ka(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (s = r.children, e = r.fallback, i ? (r = t.mode, i = t.child, s = { mode: "hidden", children: s }, !(r & 1) && i !== null ? (i.childLanes = 0, i.pendingProps = s) : i = Us(s, r, 0, null), e = Hn(e, r, n, null), i.return = t, e.return = t, i.sibling = e, t.child = i, t.child.memoizedState = Ma(n), t.memoizedState = ja, e) : Bu(t, s));
  if (o = e.memoizedState, o !== null && (l = o.dehydrated, l !== null)) return cv(e, t, s, r, l, o, n);
  if (i) {
    i = r.fallback, s = t.mode, o = e.child, l = o.sibling;
    var a = { mode: "hidden", children: r.children };
    return !(s & 1) && t.child !== o ? (r = t.child, r.childLanes = 0, r.pendingProps = a, t.deletions = null) : (r = vn(o, a), r.subtreeFlags = o.subtreeFlags & 14680064), l !== null ? i = vn(l, i) : (i = Hn(i, s, n, null), i.flags |= 2), i.return = t, r.return = t, r.sibling = i, t.child = r, r = i, i = t.child, s = e.child.memoizedState, s = s === null ? Ma(n) : { baseLanes: s.baseLanes | n, cachePool: null, transitions: s.transitions }, i.memoizedState = s, i.childLanes = e.childLanes & ~n, t.memoizedState = ja, r;
  }
  return i = e.child, e = i.sibling, r = vn(i, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Bu(e, t) {
  return t = Us({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function Ei(e, t, n, r) {
  return r !== null && ju(r), Ir(t, e.child, null, n), e = Bu(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function cv(e, t, n, r, o, i, s) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = Tl(Error(V(422))), Ei(e, t, s, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (i = r.fallback, o = t.mode, r = Us({ mode: "visible", children: r.children }, o, 0, null), i = Hn(i, o, s, null), i.flags |= 2, r.return = t, i.return = t, r.sibling = i, t.child = r, t.mode & 1 && Ir(t, e.child, null, s), t.child.memoizedState = Ma(s), t.memoizedState = ja, i);
  if (!(t.mode & 1)) return Ei(e, t, s, null);
  if (o.data === "$!") {
    if (r = o.nextSibling && o.nextSibling.dataset, r) var l = r.dgst;
    return r = l, i = Error(V(419)), r = Tl(i, r, void 0), Ei(e, t, s, r);
  }
  if (l = (s & e.childLanes) !== 0, Ye || l) {
    if (r = Ce, r !== null) {
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
      o = o & (r.suspendedLanes | s) ? 0 : o, o !== 0 && o !== i.retryLane && (i.retryLane = o, Xt(e, o), St(r, e, o, -1));
    }
    return Ku(), r = Tl(Error(V(421))), Ei(e, t, s, r);
  }
  return o.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Sv.bind(null, e), o._reactRetry = t, null) : (e = i.treeContext, Je = hn(o.nextSibling), et = t, ce = !0, wt = null, e !== null && (it[st++] = Ft, it[st++] = Ht, it[st++] = Wn, Ft = e.id, Ht = e.overflow, Wn = t), t = Bu(t, r.children), t.flags |= 4096, t);
}
function Cf(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), Sa(e.return, t, n);
}
function $l(e, t, n, r, o) {
  var i = e.memoizedState;
  i === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: o } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = r, i.tail = n, i.tailMode = o);
}
function Ch(e, t, n) {
  var r = t.pendingProps, o = r.revealOrder, i = r.tail;
  if (He(e, t, r.children, n), r = fe.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && Cf(e, n, t);
      else if (e.tag === 19) Cf(e, n, t);
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
  if (le(fe, r), !(t.mode & 1)) t.memoizedState = null;
  else switch (o) {
    case "forwards":
      for (n = t.child, o = null; n !== null; ) e = n.alternate, e !== null && ms(e) === null && (o = n), n = n.sibling;
      n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), $l(t, !1, o, n, i);
      break;
    case "backwards":
      for (n = null, o = t.child, t.child = null; o !== null; ) {
        if (e = o.alternate, e !== null && ms(e) === null) {
          t.child = o;
          break;
        }
        e = o.sibling, o.sibling = n, n = o, o = e;
      }
      $l(t, !0, n, null, i);
      break;
    case "together":
      $l(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function Wi(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function qt(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), Xn |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(V(153));
  if (t.child !== null) {
    for (e = t.child, n = vn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = vn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function fv(e, t, n) {
  switch (t.tag) {
    case 3:
      Eh(t), Rr();
      break;
    case 5:
      Zp(t);
      break;
    case 1:
      Ke(t.type) && us(t);
      break;
    case 4:
      Iu(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, o = t.memoizedProps.value;
      le(ds, r._currentValue), r._currentValue = o;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (le(fe, fe.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? Nh(e, t, n) : (le(fe, fe.current & 1), e = qt(e, t, n), e !== null ? e.sibling : null);
      le(fe, fe.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return Ch(e, t, n);
        t.flags |= 128;
      }
      if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), le(fe, fe.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, kh(e, t, n);
  }
  return qt(e, t, n);
}
var Ph, Ta, zh, jh;
Ph = function(e, t) {
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
Ta = function() {
};
zh = function(e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    e = t.stateNode, Ln(Tt.current);
    var i = null;
    switch (n) {
      case "input":
        o = Jl(e, o), r = Jl(e, r), i = [];
        break;
      case "select":
        o = pe({}, o, { value: void 0 }), r = pe({}, r, { value: void 0 }), i = [];
        break;
      case "textarea":
        o = na(e, o), r = na(e, r), i = [];
        break;
      default:
        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = ls);
    }
    oa(n, r);
    var s;
    n = null;
    for (u in o) if (!r.hasOwnProperty(u) && o.hasOwnProperty(u) && o[u] != null) if (u === "style") {
      var l = o[u];
      for (s in l) l.hasOwnProperty(s) && (n || (n = {}), n[s] = "");
    } else u !== "dangerouslySetInnerHTML" && u !== "children" && u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (jo.hasOwnProperty(u) ? i || (i = []) : (i = i || []).push(u, null));
    for (u in r) {
      var a = r[u];
      if (l = o != null ? o[u] : void 0, r.hasOwnProperty(u) && a !== l && (a != null || l != null)) if (u === "style") if (l) {
        for (s in l) !l.hasOwnProperty(s) || a && a.hasOwnProperty(s) || (n || (n = {}), n[s] = "");
        for (s in a) a.hasOwnProperty(s) && l[s] !== a[s] && (n || (n = {}), n[s] = a[s]);
      } else n || (i || (i = []), i.push(
        u,
        n
      )), n = a;
      else u === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, l = l ? l.__html : void 0, a != null && l !== a && (i = i || []).push(u, a)) : u === "children" ? typeof a != "string" && typeof a != "number" || (i = i || []).push(u, "" + a) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (jo.hasOwnProperty(u) ? (a != null && u === "onScroll" && ae("scroll", e), i || l === a || (i = [])) : (i = i || []).push(u, a));
    }
    n && (i = i || []).push("style", n);
    var u = i;
    (t.updateQueue = u) && (t.flags |= 4);
  }
};
jh = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function oo(e, t) {
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
function De(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t) for (var o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags & 14680064, r |= o.flags & 14680064, o.return = e, o = o.sibling;
  else for (o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags, r |= o.flags, o.return = e, o = o.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function dv(e, t, n) {
  var r = t.pendingProps;
  switch (zu(t), t.tag) {
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
      return De(t), null;
    case 1:
      return Ke(t.type) && as(), De(t), null;
    case 3:
      return r = t.stateNode, Dr(), ue(qe), ue(Oe), Lu(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (ki(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, wt !== null && (ba(wt), wt = null))), Ta(e, t), De(t), null;
    case 5:
      Du(t);
      var o = Ln(Ho.current);
      if (n = t.type, e !== null && t.stateNode != null) zh(e, t, n, r, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(V(166));
          return De(t), null;
        }
        if (e = Ln(Tt.current), ki(t)) {
          r = t.stateNode, n = t.type;
          var i = t.memoizedProps;
          switch (r[jt] = t, r[bo] = i, e = (t.mode & 1) !== 0, n) {
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
              for (o = 0; o < mo.length; o++) ae(mo[o], r);
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
              Rc(r, i), ae("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!i.multiple }, ae("invalid", r);
              break;
            case "textarea":
              Dc(r, i), ae("invalid", r);
          }
          oa(n, i), o = null;
          for (var s in i) if (i.hasOwnProperty(s)) {
            var l = i[s];
            s === "children" ? typeof l == "string" ? r.textContent !== l && (i.suppressHydrationWarning !== !0 && _i(r.textContent, l, e), o = ["children", l]) : typeof l == "number" && r.textContent !== "" + l && (i.suppressHydrationWarning !== !0 && _i(
              r.textContent,
              l,
              e
            ), o = ["children", "" + l]) : jo.hasOwnProperty(s) && l != null && s === "onScroll" && ae("scroll", r);
          }
          switch (n) {
            case "input":
              pi(r), Ic(r, i, !0);
              break;
            case "textarea":
              pi(r), Lc(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof i.onClick == "function" && (r.onclick = ls);
          }
          r = o, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          s = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = rp(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = s.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = s.createElement(n, { is: r.is }) : (e = s.createElement(n), n === "select" && (s = e, r.multiple ? s.multiple = !0 : r.size && (s.size = r.size))) : e = s.createElementNS(e, n), e[jt] = t, e[bo] = r, Ph(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (s = ia(n, r), n) {
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
                for (o = 0; o < mo.length; o++) ae(mo[o], e);
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
                Rc(e, r), o = Jl(e, r), ae("invalid", e);
                break;
              case "option":
                o = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, o = pe({}, r, { value: void 0 }), ae("invalid", e);
                break;
              case "textarea":
                Dc(e, r), o = na(e, r), ae("invalid", e);
                break;
              default:
                o = r;
            }
            oa(n, o), l = o;
            for (i in l) if (l.hasOwnProperty(i)) {
              var a = l[i];
              i === "style" ? sp(e, a) : i === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, a != null && op(e, a)) : i === "children" ? typeof a == "string" ? (n !== "textarea" || a !== "") && Mo(e, a) : typeof a == "number" && Mo(e, "" + a) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (jo.hasOwnProperty(i) ? a != null && i === "onScroll" && ae("scroll", e) : a != null && pu(e, i, a, s));
            }
            switch (n) {
              case "input":
                pi(e), Ic(e, r, !1);
                break;
              case "textarea":
                pi(e), Lc(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + wn(r.value));
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
                typeof o.onClick == "function" && (e.onclick = ls);
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
      return De(t), null;
    case 6:
      if (e && t.stateNode != null) jh(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(V(166));
        if (n = Ln(Ho.current), Ln(Tt.current), ki(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[jt] = t, (i = r.nodeValue !== n) && (e = et, e !== null)) switch (e.tag) {
            case 3:
              _i(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && _i(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          i && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[jt] = t, t.stateNode = r;
      }
      return De(t), null;
    case 13:
      if (ue(fe), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (ce && Je !== null && t.mode & 1 && !(t.flags & 128)) Xp(), Rr(), t.flags |= 98560, i = !1;
        else if (i = ki(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!i) throw Error(V(318));
            if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(V(317));
            i[jt] = t;
          } else Rr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          De(t), i = !1;
        } else wt !== null && (ba(wt), wt = null), i = !0;
        if (!i) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || fe.current & 1 ? Se === 0 && (Se = 3) : Ku())), t.updateQueue !== null && (t.flags |= 4), De(t), null);
    case 4:
      return Dr(), Ta(e, t), e === null && Lo(t.stateNode.containerInfo), De(t), null;
    case 10:
      return $u(t.type._context), De(t), null;
    case 17:
      return Ke(t.type) && as(), De(t), null;
    case 19:
      if (ue(fe), i = t.memoizedState, i === null) return De(t), null;
      if (r = (t.flags & 128) !== 0, s = i.rendering, s === null) if (r) oo(i, !1);
      else {
        if (Se !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (s = ms(e), s !== null) {
            for (t.flags |= 128, oo(i, !1), r = s.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) i = n, e = r, i.flags &= 14680066, s = i.alternate, s === null ? (i.childLanes = 0, i.lanes = e, i.child = null, i.subtreeFlags = 0, i.memoizedProps = null, i.memoizedState = null, i.updateQueue = null, i.dependencies = null, i.stateNode = null) : (i.childLanes = s.childLanes, i.lanes = s.lanes, i.child = s.child, i.subtreeFlags = 0, i.deletions = null, i.memoizedProps = s.memoizedProps, i.memoizedState = s.memoizedState, i.updateQueue = s.updateQueue, i.type = s.type, e = s.dependencies, i.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return le(fe, fe.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        i.tail !== null && ye() > Or && (t.flags |= 128, r = !0, oo(i, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = ms(s), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), oo(i, !0), i.tail === null && i.tailMode === "hidden" && !s.alternate && !ce) return De(t), null;
        } else 2 * ye() - i.renderingStartTime > Or && n !== 1073741824 && (t.flags |= 128, r = !0, oo(i, !1), t.lanes = 4194304);
        i.isBackwards ? (s.sibling = t.child, t.child = s) : (n = i.last, n !== null ? n.sibling = s : t.child = s, i.last = s);
      }
      return i.tail !== null ? (t = i.tail, i.rendering = t, i.tail = t.sibling, i.renderingStartTime = ye(), t.sibling = null, n = fe.current, le(fe, r ? n & 1 | 2 : n & 1), t) : (De(t), null);
    case 22:
    case 23:
      return qu(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? Ze & 1073741824 && (De(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : De(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(V(156, t.tag));
}
function pv(e, t) {
  switch (zu(t), t.tag) {
    case 1:
      return Ke(t.type) && as(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Dr(), ue(qe), ue(Oe), Lu(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Du(t), null;
    case 13:
      if (ue(fe), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(V(340));
        Rr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return ue(fe), null;
    case 4:
      return Dr(), null;
    case 10:
      return $u(t.type._context), null;
    case 22:
    case 23:
      return qu(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Ni = !1, Le = !1, hv = typeof WeakSet == "function" ? WeakSet : Set, X = null;
function wr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    he(e, t, r);
  }
  else n.current = null;
}
function $a(e, t, n) {
  try {
    n();
  } catch (r) {
    he(e, t, r);
  }
}
var Pf = !1;
function mv(e, t) {
  if (ma = os, e = Rp(), Cu(e)) {
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
  for (ga = { focusedElem: e, selectionRange: n }, os = !1, X = t; X !== null; ) if (t = X, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, X = e;
  else for (; X !== null; ) {
    t = X;
    try {
      var w = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (w !== null) {
            var y = w.memoizedProps, k = w.memoizedState, h = t.stateNode, m = h.getSnapshotBeforeUpdate(t.elementType === t.type ? y : yt(t.type, y), k);
            h.__reactInternalSnapshotBeforeUpdate = m;
          }
          break;
        case 3:
          var v = t.stateNode.containerInfo;
          v.nodeType === 1 ? v.textContent = "" : v.nodeType === 9 && v.documentElement && v.removeChild(v.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(V(163));
      }
    } catch (x) {
      he(t, t.return, x);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, X = e;
      break;
    }
    X = t.return;
  }
  return w = Pf, Pf = !1, w;
}
function Co(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var o = r = r.next;
    do {
      if ((o.tag & e) === e) {
        var i = o.destroy;
        o.destroy = void 0, i !== void 0 && $a(t, n, i);
      }
      o = o.next;
    } while (o !== r);
  }
}
function Vs(e, t) {
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
function Aa(e) {
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
function Mh(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, Mh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[jt], delete t[bo], delete t[xa], delete t[Qy], delete t[Zy])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function Th(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function zf(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || Th(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Ra(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = ls));
  else if (r !== 4 && (e = e.child, e !== null)) for (Ra(e, t, n), e = e.sibling; e !== null; ) Ra(e, t, n), e = e.sibling;
}
function Ia(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (Ia(e, t, n), e = e.sibling; e !== null; ) Ia(e, t, n), e = e.sibling;
}
var je = null, vt = !1;
function Zt(e, t, n) {
  for (n = n.child; n !== null; ) $h(e, t, n), n = n.sibling;
}
function $h(e, t, n) {
  if (Mt && typeof Mt.onCommitFiberUnmount == "function") try {
    Mt.onCommitFiberUnmount(Rs, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      Le || wr(n, t);
    case 6:
      var r = je, o = vt;
      je = null, Zt(e, t, n), je = r, vt = o, je !== null && (vt ? (e = je, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : je.removeChild(n.stateNode));
      break;
    case 18:
      je !== null && (vt ? (e = je, n = n.stateNode, e.nodeType === 8 ? Nl(e.parentNode, n) : e.nodeType === 1 && Nl(e, n), Ro(e)) : Nl(je, n.stateNode));
      break;
    case 4:
      r = je, o = vt, je = n.stateNode.containerInfo, vt = !0, Zt(e, t, n), je = r, vt = o;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!Le && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        o = r = r.next;
        do {
          var i = o, s = i.destroy;
          i = i.tag, s !== void 0 && (i & 2 || i & 4) && $a(n, t, s), o = o.next;
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
function jf(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new hv()), t.forEach(function(r) {
      var o = Ev.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(o, o));
    });
  }
}
function gt(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var o = n[r];
    try {
      var i = e, s = t, l = s;
      e: for (; l !== null; ) {
        switch (l.tag) {
          case 5:
            je = l.stateNode, vt = !1;
            break e;
          case 3:
            je = l.stateNode.containerInfo, vt = !0;
            break e;
          case 4:
            je = l.stateNode.containerInfo, vt = !0;
            break e;
        }
        l = l.return;
      }
      if (je === null) throw Error(V(160));
      $h(i, s, o), je = null, vt = !1;
      var a = o.alternate;
      a !== null && (a.return = null), o.return = null;
    } catch (u) {
      he(o, t, u);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) Ah(t, e), t = t.sibling;
}
function Ah(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (gt(t, e), Pt(e), r & 4) {
        try {
          Co(3, e, e.return), Vs(3, e);
        } catch (y) {
          he(e, e.return, y);
        }
        try {
          Co(5, e, e.return);
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 1:
      gt(t, e), Pt(e), r & 512 && n !== null && wr(n, n.return);
      break;
    case 5:
      if (gt(t, e), Pt(e), r & 512 && n !== null && wr(n, n.return), e.flags & 32) {
        var o = e.stateNode;
        try {
          Mo(o, "");
        } catch (y) {
          he(e, e.return, y);
        }
      }
      if (r & 4 && (o = e.stateNode, o != null)) {
        var i = e.memoizedProps, s = n !== null ? n.memoizedProps : i, l = e.type, a = e.updateQueue;
        if (e.updateQueue = null, a !== null) try {
          l === "input" && i.type === "radio" && i.name != null && tp(o, i), ia(l, s);
          var u = ia(l, i);
          for (s = 0; s < a.length; s += 2) {
            var c = a[s], f = a[s + 1];
            c === "style" ? sp(o, f) : c === "dangerouslySetInnerHTML" ? op(o, f) : c === "children" ? Mo(o, f) : pu(o, c, f, u);
          }
          switch (l) {
            case "input":
              ea(o, i);
              break;
            case "textarea":
              np(o, i);
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
          o[bo] = i;
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 6:
      if (gt(t, e), Pt(e), r & 4) {
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
      if (gt(t, e), Pt(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        Ro(t.containerInfo);
      } catch (y) {
        he(e, e.return, y);
      }
      break;
    case 4:
      gt(t, e), Pt(e);
      break;
    case 13:
      gt(t, e), Pt(e), o = e.child, o.flags & 8192 && (i = o.memoizedState !== null, o.stateNode.isHidden = i, !i || o.alternate !== null && o.alternate.memoizedState !== null || (Yu = ye())), r & 4 && jf(e);
      break;
    case 22:
      if (c = n !== null && n.memoizedState !== null, e.mode & 1 ? (Le = (u = Le) || c, gt(t, e), Le = u) : gt(t, e), Pt(e), r & 8192) {
        if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !c && e.mode & 1) for (X = e, c = e.child; c !== null; ) {
          for (f = X = c; X !== null; ) {
            switch (d = X, p = d.child, d.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Co(4, d, d.return);
                break;
              case 1:
                wr(d, d.return);
                var w = d.stateNode;
                if (typeof w.componentWillUnmount == "function") {
                  r = d, n = d.return;
                  try {
                    t = r, w.props = t.memoizedProps, w.state = t.memoizedState, w.componentWillUnmount();
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
                  Tf(f);
                  continue;
                }
            }
            p !== null ? (p.return = d, X = p) : Tf(f);
          }
          c = c.sibling;
        }
        e: for (c = null, f = e; ; ) {
          if (f.tag === 5) {
            if (c === null) {
              c = f;
              try {
                o = f.stateNode, u ? (i = o.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (l = f.stateNode, a = f.memoizedProps.style, s = a != null && a.hasOwnProperty("display") ? a.display : null, l.style.display = ip("display", s));
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
      gt(t, e), Pt(e), r & 4 && jf(e);
      break;
    case 21:
      break;
    default:
      gt(
        t,
        e
      ), Pt(e);
  }
}
function Pt(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (Th(n)) {
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
          r.flags & 32 && (Mo(o, ""), r.flags &= -33);
          var i = zf(e);
          Ia(e, i, o);
          break;
        case 3:
        case 4:
          var s = r.stateNode.containerInfo, l = zf(e);
          Ra(e, l, s);
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
function gv(e, t, n) {
  X = e, Rh(e);
}
function Rh(e, t, n) {
  for (var r = (e.mode & 1) !== 0; X !== null; ) {
    var o = X, i = o.child;
    if (o.tag === 22 && r) {
      var s = o.memoizedState !== null || Ni;
      if (!s) {
        var l = o.alternate, a = l !== null && l.memoizedState !== null || Le;
        l = Ni;
        var u = Le;
        if (Ni = s, (Le = a) && !u) for (X = o; X !== null; ) s = X, a = s.child, s.tag === 22 && s.memoizedState !== null ? $f(o) : a !== null ? (a.return = s, X = a) : $f(o);
        for (; i !== null; ) X = i, Rh(i), i = i.sibling;
        X = o, Ni = l, Le = u;
      }
      Mf(e);
    } else o.subtreeFlags & 8772 && i !== null ? (i.return = o, X = i) : Mf(e);
  }
}
function Mf(e) {
  for (; X !== null; ) {
    var t = X;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            Le || Vs(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !Le) if (n === null) r.componentDidMount();
            else {
              var o = t.elementType === t.type ? n.memoizedProps : yt(t.type, n.memoizedProps);
              r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var i = t.updateQueue;
            i !== null && hf(t, i, r);
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
              hf(t, s, n);
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
                  f !== null && Ro(f);
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
        Le || t.flags & 512 && Aa(t);
      } catch (d) {
        he(t, t.return, d);
      }
    }
    if (t === e) {
      X = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, X = n;
      break;
    }
    X = t.return;
  }
}
function Tf(e) {
  for (; X !== null; ) {
    var t = X;
    if (t === e) {
      X = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, X = n;
      break;
    }
    X = t.return;
  }
}
function $f(e) {
  for (; X !== null; ) {
    var t = X;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Vs(4, t);
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
            Aa(t);
          } catch (a) {
            he(t, i, a);
          }
          break;
        case 5:
          var s = t.return;
          try {
            Aa(t);
          } catch (a) {
            he(t, s, a);
          }
      }
    } catch (a) {
      he(t, t.return, a);
    }
    if (t === e) {
      X = null;
      break;
    }
    var l = t.sibling;
    if (l !== null) {
      l.return = t.return, X = l;
      break;
    }
    X = t.return;
  }
}
var yv = Math.ceil, vs = Qt.ReactCurrentDispatcher, Uu = Qt.ReactCurrentOwner, ct = Qt.ReactCurrentBatchConfig, re = 0, Ce = null, xe = null, Me = 0, Ze = 0, _r = En(0), Se = 0, Wo = null, Xn = 0, Bs = 0, Wu = 0, Po = null, We = null, Yu = 0, Or = 1 / 0, Ot = null, xs = !1, Da = null, gn = null, Ci = !1, cn = null, ws = 0, zo = 0, La = null, Yi = -1, Xi = 0;
function Ve() {
  return re & 6 ? ye() : Yi !== -1 ? Yi : Yi = ye();
}
function yn(e) {
  return e.mode & 1 ? re & 2 && Me !== 0 ? Me & -Me : ev.transition !== null ? (Xi === 0 && (Xi = vp()), Xi) : (e = oe, e !== 0 || (e = window.event, e = e === void 0 ? 16 : Np(e.type)), e) : 1;
}
function St(e, t, n, r) {
  if (50 < zo) throw zo = 0, La = null, Error(V(185));
  oi(e, n, r), (!(re & 2) || e !== Ce) && (e === Ce && (!(re & 2) && (Bs |= n), Se === 4 && ln(e, Me)), Ge(e, r), n === 1 && re === 0 && !(t.mode & 1) && (Or = ye() + 500, bs && Nn()));
}
function Ge(e, t) {
  var n = e.callbackNode;
  ey(e, t);
  var r = rs(e, e === Ce ? Me : 0);
  if (r === 0) n !== null && Fc(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && Fc(n), t === 1) e.tag === 0 ? Jy(Af.bind(null, e)) : Up(Af.bind(null, e)), Ky(function() {
      !(re & 6) && Nn();
    }), n = null;
    else {
      switch (xp(r)) {
        case 1:
          n = vu;
          break;
        case 4:
          n = gp;
          break;
        case 16:
          n = ns;
          break;
        case 536870912:
          n = yp;
          break;
        default:
          n = ns;
      }
      n = Vh(n, Ih.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function Ih(e, t) {
  if (Yi = -1, Xi = 0, re & 6) throw Error(V(327));
  var n = e.callbackNode;
  if (zr() && e.callbackNode !== n) return null;
  var r = rs(e, e === Ce ? Me : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = _s(e, r);
  else {
    t = r;
    var o = re;
    re |= 2;
    var i = Lh();
    (Ce !== e || Me !== t) && (Ot = null, Or = ye() + 500, Fn(e, t));
    do
      try {
        wv();
        break;
      } catch (l) {
        Dh(e, l);
      }
    while (!0);
    Tu(), vs.current = i, re = o, xe !== null ? t = 0 : (Ce = null, Me = 0, t = Se);
  }
  if (t !== 0) {
    if (t === 2 && (o = ca(e), o !== 0 && (r = o, t = Oa(e, o))), t === 1) throw n = Wo, Fn(e, 0), ln(e, r), Ge(e, ye()), n;
    if (t === 6) ln(e, r);
    else {
      if (o = e.current.alternate, !(r & 30) && !vv(o) && (t = _s(e, r), t === 2 && (i = ca(e), i !== 0 && (r = i, t = Oa(e, i))), t === 1)) throw n = Wo, Fn(e, 0), ln(e, r), Ge(e, ye()), n;
      switch (e.finishedWork = o, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(V(345));
        case 2:
          An(e, We, Ot);
          break;
        case 3:
          if (ln(e, r), (r & 130023424) === r && (t = Yu + 500 - ye(), 10 < t)) {
            if (rs(e, 0) !== 0) break;
            if (o = e.suspendedLanes, (o & r) !== r) {
              Ve(), e.pingedLanes |= e.suspendedLanes & o;
              break;
            }
            e.timeoutHandle = va(An.bind(null, e, We, Ot), t);
            break;
          }
          An(e, We, Ot);
          break;
        case 4:
          if (ln(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, o = -1; 0 < r; ) {
            var s = 31 - kt(r);
            i = 1 << s, s = t[s], s > o && (o = s), r &= ~i;
          }
          if (r = o, r = ye() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * yv(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = va(An.bind(null, e, We, Ot), r);
            break;
          }
          An(e, We, Ot);
          break;
        case 5:
          An(e, We, Ot);
          break;
        default:
          throw Error(V(329));
      }
    }
  }
  return Ge(e, ye()), e.callbackNode === n ? Ih.bind(null, e) : null;
}
function Oa(e, t) {
  var n = Po;
  return e.current.memoizedState.isDehydrated && (Fn(e, t).flags |= 256), e = _s(e, t), e !== 2 && (t = We, We = n, t !== null && ba(t)), e;
}
function ba(e) {
  We === null ? We = e : We.push.apply(We, e);
}
function vv(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var o = n[r], i = o.getSnapshot;
        o = o.value;
        try {
          if (!Et(i(), o)) return !1;
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
function ln(e, t) {
  for (t &= ~Wu, t &= ~Bs, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - kt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function Af(e) {
  if (re & 6) throw Error(V(327));
  zr();
  var t = rs(e, 0);
  if (!(t & 1)) return Ge(e, ye()), null;
  var n = _s(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = ca(e);
    r !== 0 && (t = r, n = Oa(e, r));
  }
  if (n === 1) throw n = Wo, Fn(e, 0), ln(e, t), Ge(e, ye()), n;
  if (n === 6) throw Error(V(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, An(e, We, Ot), Ge(e, ye()), null;
}
function Xu(e, t) {
  var n = re;
  re |= 1;
  try {
    return e(t);
  } finally {
    re = n, re === 0 && (Or = ye() + 500, bs && Nn());
  }
}
function qn(e) {
  cn !== null && cn.tag === 0 && !(re & 6) && zr();
  var t = re;
  re |= 1;
  var n = ct.transition, r = oe;
  try {
    if (ct.transition = null, oe = 1, e) return e();
  } finally {
    oe = r, ct.transition = n, re = t, !(re & 6) && Nn();
  }
}
function qu() {
  Ze = _r.current, ue(_r);
}
function Fn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, qy(n)), xe !== null) for (n = xe.return; n !== null; ) {
    var r = n;
    switch (zu(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && as();
        break;
      case 3:
        Dr(), ue(qe), ue(Oe), Lu();
        break;
      case 5:
        Du(r);
        break;
      case 4:
        Dr();
        break;
      case 13:
        ue(fe);
        break;
      case 19:
        ue(fe);
        break;
      case 10:
        $u(r.type._context);
        break;
      case 22:
      case 23:
        qu();
    }
    n = n.return;
  }
  if (Ce = e, xe = e = vn(e.current, null), Me = Ze = t, Se = 0, Wo = null, Wu = Bs = Xn = 0, We = Po = null, Dn !== null) {
    for (t = 0; t < Dn.length; t++) if (n = Dn[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var o = r.next, i = n.pending;
      if (i !== null) {
        var s = i.next;
        i.next = o, r.next = s;
      }
      n.pending = r;
    }
    Dn = null;
  }
  return e;
}
function Dh(e, t) {
  do {
    var n = xe;
    try {
      if (Tu(), Bi.current = ys, gs) {
        for (var r = de.memoizedState; r !== null; ) {
          var o = r.queue;
          o !== null && (o.pending = null), r = r.next;
        }
        gs = !1;
      }
      if (Yn = 0, Ne = _e = de = null, No = !1, Vo = 0, Uu.current = null, n === null || n.return === null) {
        Se = 1, Wo = t, xe = null;
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
          var p = wf(s);
          if (p !== null) {
            p.flags &= -257, _f(p, s, l, i, t), p.mode & 1 && xf(i, u, t), t = p, a = u;
            var w = t.updateQueue;
            if (w === null) {
              var y = /* @__PURE__ */ new Set();
              y.add(a), t.updateQueue = y;
            } else w.add(a);
            break e;
          } else {
            if (!(t & 1)) {
              xf(i, u, t), Ku();
              break e;
            }
            a = Error(V(426));
          }
        } else if (ce && l.mode & 1) {
          var k = wf(s);
          if (k !== null) {
            !(k.flags & 65536) && (k.flags |= 256), _f(k, s, l, i, t), ju(Lr(a, l));
            break e;
          }
        }
        i = a = Lr(a, l), Se !== 4 && (Se = 2), Po === null ? Po = [i] : Po.push(i), i = s;
        do {
          switch (i.tag) {
            case 3:
              i.flags |= 65536, t &= -t, i.lanes |= t;
              var h = xh(i, a, t);
              pf(i, h);
              break e;
            case 1:
              l = a;
              var m = i.type, v = i.stateNode;
              if (!(i.flags & 128) && (typeof m.getDerivedStateFromError == "function" || v !== null && typeof v.componentDidCatch == "function" && (gn === null || !gn.has(v)))) {
                i.flags |= 65536, t &= -t, i.lanes |= t;
                var x = wh(i, l, t);
                pf(i, x);
                break e;
              }
          }
          i = i.return;
        } while (i !== null);
      }
      bh(n);
    } catch (C) {
      t = C, xe === n && n !== null && (xe = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function Lh() {
  var e = vs.current;
  return vs.current = ys, e === null ? ys : e;
}
function Ku() {
  (Se === 0 || Se === 3 || Se === 2) && (Se = 4), Ce === null || !(Xn & 268435455) && !(Bs & 268435455) || ln(Ce, Me);
}
function _s(e, t) {
  var n = re;
  re |= 2;
  var r = Lh();
  (Ce !== e || Me !== t) && (Ot = null, Fn(e, t));
  do
    try {
      xv();
      break;
    } catch (o) {
      Dh(e, o);
    }
  while (!0);
  if (Tu(), re = n, vs.current = r, xe !== null) throw Error(V(261));
  return Ce = null, Me = 0, Se;
}
function xv() {
  for (; xe !== null; ) Oh(xe);
}
function wv() {
  for (; xe !== null && !W0(); ) Oh(xe);
}
function Oh(e) {
  var t = Hh(e.alternate, e, Ze);
  e.memoizedProps = e.pendingProps, t === null ? bh(e) : xe = t, Uu.current = null;
}
function bh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = pv(n, t), n !== null) {
        n.flags &= 32767, xe = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        Se = 6, xe = null;
        return;
      }
    } else if (n = dv(n, t, Ze), n !== null) {
      xe = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      xe = t;
      return;
    }
    xe = t = e;
  } while (t !== null);
  Se === 0 && (Se = 5);
}
function An(e, t, n) {
  var r = oe, o = ct.transition;
  try {
    ct.transition = null, oe = 1, _v(e, t, n, r);
  } finally {
    ct.transition = o, oe = r;
  }
  return null;
}
function _v(e, t, n, r) {
  do
    zr();
  while (cn !== null);
  if (re & 6) throw Error(V(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(V(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var i = n.lanes | n.childLanes;
  if (ty(e, i), e === Ce && (xe = Ce = null, Me = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || Ci || (Ci = !0, Vh(ns, function() {
    return zr(), null;
  })), i = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || i) {
    i = ct.transition, ct.transition = null;
    var s = oe;
    oe = 1;
    var l = re;
    re |= 4, Uu.current = null, mv(e, n), Ah(n, e), Hy(ga), os = !!ma, ga = ma = null, e.current = n, gv(n), Y0(), re = l, oe = s, ct.transition = i;
  } else e.current = n;
  if (Ci && (Ci = !1, cn = e, ws = o), i = e.pendingLanes, i === 0 && (gn = null), K0(n.stateNode), Ge(e, ye()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) o = t[n], r(o.value, { componentStack: o.stack, digest: o.digest });
  if (xs) throw xs = !1, e = Da, Da = null, e;
  return ws & 1 && e.tag !== 0 && zr(), i = e.pendingLanes, i & 1 ? e === La ? zo++ : (zo = 0, La = e) : zo = 0, Nn(), null;
}
function zr() {
  if (cn !== null) {
    var e = xp(ws), t = ct.transition, n = oe;
    try {
      if (ct.transition = null, oe = 16 > e ? 16 : e, cn === null) var r = !1;
      else {
        if (e = cn, cn = null, ws = 0, re & 6) throw Error(V(331));
        var o = re;
        for (re |= 4, X = e.current; X !== null; ) {
          var i = X, s = i.child;
          if (X.flags & 16) {
            var l = i.deletions;
            if (l !== null) {
              for (var a = 0; a < l.length; a++) {
                var u = l[a];
                for (X = u; X !== null; ) {
                  var c = X;
                  switch (c.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Co(8, c, i);
                  }
                  var f = c.child;
                  if (f !== null) f.return = c, X = f;
                  else for (; X !== null; ) {
                    c = X;
                    var d = c.sibling, p = c.return;
                    if (Mh(c), c === u) {
                      X = null;
                      break;
                    }
                    if (d !== null) {
                      d.return = p, X = d;
                      break;
                    }
                    X = p;
                  }
                }
              }
              var w = i.alternate;
              if (w !== null) {
                var y = w.child;
                if (y !== null) {
                  w.child = null;
                  do {
                    var k = y.sibling;
                    y.sibling = null, y = k;
                  } while (y !== null);
                }
              }
              X = i;
            }
          }
          if (i.subtreeFlags & 2064 && s !== null) s.return = i, X = s;
          else e: for (; X !== null; ) {
            if (i = X, i.flags & 2048) switch (i.tag) {
              case 0:
              case 11:
              case 15:
                Co(9, i, i.return);
            }
            var h = i.sibling;
            if (h !== null) {
              h.return = i.return, X = h;
              break e;
            }
            X = i.return;
          }
        }
        var m = e.current;
        for (X = m; X !== null; ) {
          s = X;
          var v = s.child;
          if (s.subtreeFlags & 2064 && v !== null) v.return = s, X = v;
          else e: for (s = m; X !== null; ) {
            if (l = X, l.flags & 2048) try {
              switch (l.tag) {
                case 0:
                case 11:
                case 15:
                  Vs(9, l);
              }
            } catch (C) {
              he(l, l.return, C);
            }
            if (l === s) {
              X = null;
              break e;
            }
            var x = l.sibling;
            if (x !== null) {
              x.return = l.return, X = x;
              break e;
            }
            X = l.return;
          }
        }
        if (re = o, Nn(), Mt && typeof Mt.onPostCommitFiberRoot == "function") try {
          Mt.onPostCommitFiberRoot(Rs, e);
        } catch {
        }
        r = !0;
      }
      return r;
    } finally {
      oe = n, ct.transition = t;
    }
  }
  return !1;
}
function Rf(e, t, n) {
  t = Lr(n, t), t = xh(e, t, 1), e = mn(e, t, 1), t = Ve(), e !== null && (oi(e, 1, t), Ge(e, t));
}
function he(e, t, n) {
  if (e.tag === 3) Rf(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      Rf(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (gn === null || !gn.has(r))) {
        e = Lr(n, e), e = wh(t, e, 1), t = mn(t, e, 1), e = Ve(), t !== null && (oi(t, 1, e), Ge(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function kv(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Ve(), e.pingedLanes |= e.suspendedLanes & n, Ce === e && (Me & n) === n && (Se === 4 || Se === 3 && (Me & 130023424) === Me && 500 > ye() - Yu ? Fn(e, 0) : Wu |= n), Ge(e, t);
}
function Fh(e, t) {
  t === 0 && (e.mode & 1 ? (t = gi, gi <<= 1, !(gi & 130023424) && (gi = 4194304)) : t = 1);
  var n = Ve();
  e = Xt(e, t), e !== null && (oi(e, t, n), Ge(e, n));
}
function Sv(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), Fh(e, n);
}
function Ev(e, t) {
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
  r !== null && r.delete(t), Fh(e, n);
}
var Hh;
Hh = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || qe.current) Ye = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return Ye = !1, fv(e, t, n);
    Ye = !!(e.flags & 131072);
  }
  else Ye = !1, ce && t.flags & 1048576 && Wp(t, fs, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      Wi(e, t), e = t.pendingProps;
      var o = Ar(t, Oe.current);
      Pr(t, n), o = bu(null, t, r, e, o, n);
      var i = Fu();
      return t.flags |= 1, typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ke(r) ? (i = !0, us(t)) : i = !1, t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null, Ru(t), o.updater = Hs, t.stateNode = o, o._reactInternals = t, Na(t, r, e, n), t = za(null, t, r, !0, i, n)) : (t.tag = 0, ce && i && Pu(t), He(null, t, o, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (Wi(e, t), e = t.pendingProps, o = r._init, r = o(r._payload), t.type = r, o = t.tag = Cv(r), e = yt(r, e), o) {
          case 0:
            t = Pa(null, t, r, e, n);
            break e;
          case 1:
            t = Ef(null, t, r, e, n);
            break e;
          case 11:
            t = kf(null, t, r, e, n);
            break e;
          case 14:
            t = Sf(null, t, r, yt(r.type, e), n);
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
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : yt(r, o), Pa(e, t, r, o, n);
    case 1:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : yt(r, o), Ef(e, t, r, o, n);
    case 3:
      e: {
        if (Eh(t), e === null) throw Error(V(387));
        r = t.pendingProps, i = t.memoizedState, o = i.element, Qp(e, t), hs(t, r, null, n);
        var s = t.memoizedState;
        if (r = s.element, i.isDehydrated) if (i = { element: r, isDehydrated: !1, cache: s.cache, pendingSuspenseBoundaries: s.pendingSuspenseBoundaries, transitions: s.transitions }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
          o = Lr(Error(V(423)), t), t = Nf(e, t, r, n, o);
          break e;
        } else if (r !== o) {
          o = Lr(Error(V(424)), t), t = Nf(e, t, r, n, o);
          break e;
        } else for (Je = hn(t.stateNode.containerInfo.firstChild), et = t, ce = !0, wt = null, n = Kp(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (Rr(), r === o) {
            t = qt(e, t, n);
            break e;
          }
          He(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Zp(t), e === null && ka(t), r = t.type, o = t.pendingProps, i = e !== null ? e.memoizedProps : null, s = o.children, ya(r, o) ? s = null : i !== null && ya(r, i) && (t.flags |= 32), Sh(e, t), He(e, t, s, n), t.child;
    case 6:
      return e === null && ka(t), null;
    case 13:
      return Nh(e, t, n);
    case 4:
      return Iu(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Ir(t, null, r, n) : He(e, t, r, n), t.child;
    case 11:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : yt(r, o), kf(e, t, r, o, n);
    case 7:
      return He(e, t, t.pendingProps, n), t.child;
    case 8:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, o = t.pendingProps, i = t.memoizedProps, s = o.value, le(ds, r._currentValue), r._currentValue = s, i !== null) if (Et(i.value, s)) {
          if (i.children === o.children && !qe.current) {
            t = qt(e, t, n);
            break e;
          }
        } else for (i = t.child, i !== null && (i.return = t); i !== null; ) {
          var l = i.dependencies;
          if (l !== null) {
            s = i.child;
            for (var a = l.firstContext; a !== null; ) {
              if (a.context === r) {
                if (i.tag === 1) {
                  a = Bt(-1, n & -n), a.tag = 2;
                  var u = i.updateQueue;
                  if (u !== null) {
                    u = u.shared;
                    var c = u.pending;
                    c === null ? a.next = a : (a.next = c.next, c.next = a), u.pending = a;
                  }
                }
                i.lanes |= n, a = i.alternate, a !== null && (a.lanes |= n), Sa(
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
            s.lanes |= n, l = s.alternate, l !== null && (l.lanes |= n), Sa(s, n, t), s = i.sibling;
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
      return o = t.type, r = t.pendingProps.children, Pr(t, n), o = dt(o), r = r(o), t.flags |= 1, He(e, t, r, n), t.child;
    case 14:
      return r = t.type, o = yt(r, t.pendingProps), o = yt(r.type, o), Sf(e, t, r, o, n);
    case 15:
      return _h(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : yt(r, o), Wi(e, t), t.tag = 1, Ke(r) ? (e = !0, us(t)) : e = !1, Pr(t, n), vh(t, r, o), Na(t, r, o, n), za(null, t, r, !0, e, n);
    case 19:
      return Ch(e, t, n);
    case 22:
      return kh(e, t, n);
  }
  throw Error(V(156, t.tag));
};
function Vh(e, t) {
  return mp(e, t);
}
function Nv(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function at(e, t, n, r) {
  return new Nv(e, t, n, r);
}
function Gu(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function Cv(e) {
  if (typeof e == "function") return Gu(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === mu) return 11;
    if (e === gu) return 14;
  }
  return 2;
}
function vn(e, t) {
  var n = e.alternate;
  return n === null ? (n = at(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function qi(e, t, n, r, o, i) {
  var s = 2;
  if (r = e, typeof e == "function") Gu(e) && (s = 1);
  else if (typeof e == "string") s = 5;
  else e: switch (e) {
    case fr:
      return Hn(n.children, o, i, t);
    case hu:
      s = 8, o |= 8;
      break;
    case Kl:
      return e = at(12, n, t, o | 2), e.elementType = Kl, e.lanes = i, e;
    case Gl:
      return e = at(13, n, t, o), e.elementType = Gl, e.lanes = i, e;
    case Ql:
      return e = at(19, n, t, o), e.elementType = Ql, e.lanes = i, e;
    case Zd:
      return Us(n, o, i, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Gd:
          s = 10;
          break e;
        case Qd:
          s = 9;
          break e;
        case mu:
          s = 11;
          break e;
        case gu:
          s = 14;
          break e;
        case tn:
          s = 16, r = null;
          break e;
      }
      throw Error(V(130, e == null ? e : typeof e, ""));
  }
  return t = at(s, n, t, o), t.elementType = e, t.type = r, t.lanes = i, t;
}
function Hn(e, t, n, r) {
  return e = at(7, e, r, t), e.lanes = n, e;
}
function Us(e, t, n, r) {
  return e = at(22, e, r, t), e.elementType = Zd, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Al(e, t, n) {
  return e = at(6, e, null, t), e.lanes = n, e;
}
function Rl(e, t, n) {
  return t = at(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function Pv(e, t, n, r, o) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = hl(0), this.expirationTimes = hl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = hl(0), this.identifierPrefix = r, this.onRecoverableError = o, this.mutableSourceEagerHydrationData = null;
}
function Qu(e, t, n, r, o, i, s, l, a) {
  return e = new Pv(e, t, n, l, a), t === 1 ? (t = 1, i === !0 && (t |= 8)) : t = 0, i = at(3, null, null, t), e.current = i, i.stateNode = e, i.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Ru(i), e;
}
function zv(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: cr, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function Bh(e) {
  if (!e) return _n;
  e = e._reactInternals;
  e: {
    if (Zn(e) !== e || e.tag !== 1) throw Error(V(170));
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
    if (Ke(n)) return Bp(e, n, t);
  }
  return t;
}
function Uh(e, t, n, r, o, i, s, l, a) {
  return e = Qu(n, r, !0, e, o, i, s, l, a), e.context = Bh(null), n = e.current, r = Ve(), o = yn(n), i = Bt(r, o), i.callback = t ?? null, mn(n, i, o), e.current.lanes = o, oi(e, o, r), Ge(e, r), e;
}
function Ws(e, t, n, r) {
  var o = t.current, i = Ve(), s = yn(o);
  return n = Bh(n), t.context === null ? t.context = n : t.pendingContext = n, t = Bt(i, s), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = mn(o, t, s), e !== null && (St(e, o, s, i), Vi(e, o, s)), s;
}
function ks(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function If(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Zu(e, t) {
  If(e, t), (e = e.alternate) && If(e, t);
}
function jv() {
  return null;
}
var Wh = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function Ju(e) {
  this._internalRoot = e;
}
Ys.prototype.render = Ju.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(V(409));
  Ws(e, t, null, null);
};
Ys.prototype.unmount = Ju.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    qn(function() {
      Ws(null, e, null, null);
    }), t[Yt] = null;
  }
};
function Ys(e) {
  this._internalRoot = e;
}
Ys.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = kp();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < sn.length && t !== 0 && t < sn[n].priority; n++) ;
    sn.splice(n, 0, e), n === 0 && Ep(e);
  }
};
function ec(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Xs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Df() {
}
function Mv(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var i = r;
      r = function() {
        var u = ks(s);
        i.call(u);
      };
    }
    var s = Uh(t, r, e, 0, null, !1, !1, "", Df);
    return e._reactRootContainer = s, e[Yt] = s.current, Lo(e.nodeType === 8 ? e.parentNode : e), qn(), s;
  }
  for (; o = e.lastChild; ) e.removeChild(o);
  if (typeof r == "function") {
    var l = r;
    r = function() {
      var u = ks(a);
      l.call(u);
    };
  }
  var a = Qu(e, 0, !1, null, null, !1, !1, "", Df);
  return e._reactRootContainer = a, e[Yt] = a.current, Lo(e.nodeType === 8 ? e.parentNode : e), qn(function() {
    Ws(t, a, n, r);
  }), a;
}
function qs(e, t, n, r, o) {
  var i = n._reactRootContainer;
  if (i) {
    var s = i;
    if (typeof o == "function") {
      var l = o;
      o = function() {
        var a = ks(s);
        l.call(a);
      };
    }
    Ws(t, s, e, o);
  } else s = Mv(n, t, e, o, r);
  return ks(s);
}
wp = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = ho(t.pendingLanes);
        n !== 0 && (xu(t, n | 1), Ge(t, ye()), !(re & 6) && (Or = ye() + 500, Nn()));
      }
      break;
    case 13:
      qn(function() {
        var r = Xt(e, 1);
        if (r !== null) {
          var o = Ve();
          St(r, e, 1, o);
        }
      }), Zu(e, 1);
  }
};
wu = function(e) {
  if (e.tag === 13) {
    var t = Xt(e, 134217728);
    if (t !== null) {
      var n = Ve();
      St(t, e, 134217728, n);
    }
    Zu(e, 134217728);
  }
};
_p = function(e) {
  if (e.tag === 13) {
    var t = yn(e), n = Xt(e, t);
    if (n !== null) {
      var r = Ve();
      St(n, e, t, r);
    }
    Zu(e, t);
  }
};
kp = function() {
  return oe;
};
Sp = function(e, t) {
  var n = oe;
  try {
    return oe = e, t();
  } finally {
    oe = n;
  }
};
la = function(e, t, n) {
  switch (t) {
    case "input":
      if (ea(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = Os(r);
            if (!o) throw Error(V(90));
            ep(r), ea(r, o);
          }
        }
      }
      break;
    case "textarea":
      np(e, n);
      break;
    case "select":
      t = n.value, t != null && Sr(e, !!n.multiple, t, !1);
  }
};
up = Xu;
cp = qn;
var Tv = { usingClientEntryPoint: !1, Events: [si, mr, Os, lp, ap, Xu] }, io = { findFiberByHostInstance: In, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, $v = { bundleType: io.bundleType, version: io.version, rendererPackageName: io.rendererPackageName, rendererConfig: io.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Qt.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = pp(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: io.findFiberByHostInstance || jv, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var Pi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Pi.isDisabled && Pi.supportsFiber) try {
    Rs = Pi.inject($v), Mt = Pi;
  } catch {
  }
}
rt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Tv;
rt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!ec(t)) throw Error(V(200));
  return zv(e, t, null, n);
};
rt.createRoot = function(e, t) {
  if (!ec(e)) throw Error(V(299));
  var n = !1, r = "", o = Wh;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = Qu(e, 1, !1, null, null, n, !1, r, o), e[Yt] = t.current, Lo(e.nodeType === 8 ? e.parentNode : e), new Ju(t);
};
rt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(V(188)) : (e = Object.keys(e).join(","), Error(V(268, e)));
  return e = pp(t), e = e === null ? null : e.stateNode, e;
};
rt.flushSync = function(e) {
  return qn(e);
};
rt.hydrate = function(e, t, n) {
  if (!Xs(t)) throw Error(V(200));
  return qs(null, e, t, !0, n);
};
rt.hydrateRoot = function(e, t, n) {
  if (!ec(e)) throw Error(V(405));
  var r = n != null && n.hydratedSources || null, o = !1, i = "", s = Wh;
  if (n != null && (n.unstable_strictMode === !0 && (o = !0), n.identifierPrefix !== void 0 && (i = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = Uh(t, null, e, 1, n ?? null, o, !1, i, s), e[Yt] = t.current, Lo(e), r) for (e = 0; e < r.length; e++) n = r[e], o = n._getVersion, o = o(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(
    n,
    o
  );
  return new Ys(t);
};
rt.render = function(e, t, n) {
  if (!Xs(t)) throw Error(V(200));
  return qs(null, e, t, !1, n);
};
rt.unmountComponentAtNode = function(e) {
  if (!Xs(e)) throw Error(V(40));
  return e._reactRootContainer ? (qn(function() {
    qs(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Yt] = null;
    });
  }), !0) : !1;
};
rt.unstable_batchedUpdates = Xu;
rt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Xs(n)) throw Error(V(200));
  if (e == null || e._reactInternals === void 0) throw Error(V(38));
  return qs(e, t, n, !1, r);
};
rt.version = "18.3.1-next-f1338f8080-20240426";
function Yh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Yh);
    } catch (e) {
      console.error(e);
    }
}
Yh(), Yd.exports = rt;
var Xh = Yd.exports, qh, Lf = Xh;
qh = Lf.createRoot, Lf.hydrateRoot;
function $e(e) {
  if (typeof e == "string" || typeof e == "number") return "" + e;
  let t = "";
  if (Array.isArray(e))
    for (let n = 0, r; n < e.length; n++)
      (r = $e(e[n])) !== "" && (t += (t && " ") + r);
  else
    for (let n in e)
      e[n] && (t += (t && " ") + n);
  return t;
}
var Kh = { exports: {} }, Gh = {}, Qh = { exports: {} }, Zh = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var br = N;
function Av(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Rv = typeof Object.is == "function" ? Object.is : Av, Iv = br.useState, Dv = br.useEffect, Lv = br.useLayoutEffect, Ov = br.useDebugValue;
function bv(e, t) {
  var n = t(), r = Iv({ inst: { value: n, getSnapshot: t } }), o = r[0].inst, i = r[1];
  return Lv(
    function() {
      o.value = n, o.getSnapshot = t, Il(o) && i({ inst: o });
    },
    [e, n, t]
  ), Dv(
    function() {
      return Il(o) && i({ inst: o }), e(function() {
        Il(o) && i({ inst: o });
      });
    },
    [e]
  ), Ov(n), n;
}
function Il(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Rv(e, n);
  } catch {
    return !0;
  }
}
function Fv(e, t) {
  return t();
}
var Hv = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? Fv : bv;
Zh.useSyncExternalStore = br.useSyncExternalStore !== void 0 ? br.useSyncExternalStore : Hv;
Qh.exports = Zh;
var Vv = Qh.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ks = N, Bv = Vv;
function Uv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Wv = typeof Object.is == "function" ? Object.is : Uv, Yv = Bv.useSyncExternalStore, Xv = Ks.useRef, qv = Ks.useEffect, Kv = Ks.useMemo, Gv = Ks.useDebugValue;
Gh.useSyncExternalStoreWithSelector = function(e, t, n, r, o) {
  var i = Xv(null);
  if (i.current === null) {
    var s = { hasValue: !1, value: null };
    i.current = s;
  } else s = i.current;
  i = Kv(
    function() {
      function a(p) {
        if (!u) {
          if (u = !0, c = p, p = r(p), o !== void 0 && s.hasValue) {
            var w = s.value;
            if (o(w, p))
              return f = w;
          }
          return f = p;
        }
        if (w = f, Wv(c, p)) return w;
        var y = r(p);
        return o !== void 0 && o(w, y) ? (c = p, w) : (c = p, f = y);
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
  var l = Yv(e, i[0], i[1]);
  return qv(
    function() {
      s.hasValue = !0, s.value = l;
    },
    [l]
  ), Gv(l), l;
};
Kh.exports = Gh;
var Qv = Kh.exports;
const Jh = /* @__PURE__ */ su(Qv), Zv = {}, Of = (e) => {
  let t;
  const n = /* @__PURE__ */ new Set(), r = (c, f) => {
    const d = typeof c == "function" ? c(t) : c;
    if (!Object.is(d, t)) {
      const p = t;
      t = f ?? (typeof d != "object" || d === null) ? d : Object.assign({}, t, d), n.forEach((w) => w(t, p));
    }
  }, o = () => t, a = { setState: r, getState: o, getInitialState: () => u, subscribe: (c) => (n.add(c), () => n.delete(c)), destroy: () => {
    (Zv ? "production" : void 0) !== "production" && console.warn(
      "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
    ), n.clear();
  } }, u = t = e(r, o, a);
  return a;
}, em = (e) => e ? Of(e) : Of, { useDebugValue: Jv } = I, { useSyncExternalStoreWithSelector: ex } = Jh, tx = (e) => e;
function tm(e, t = tx, n) {
  const r = ex(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return Jv(r), r;
}
const bf = (e, t) => {
  const n = em(e), r = (o, i = t) => tm(n, o, i);
  return Object.assign(r, n), r;
}, nx = (e, t) => e ? bf(e, t) : bf;
function Pe(e, t) {
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
var rx = { value: () => {
} };
function Gs() {
  for (var e = 0, t = arguments.length, n = {}, r; e < t; ++e) {
    if (!(r = arguments[e] + "") || r in n || /[\s.]/.test(r)) throw new Error("illegal type: " + r);
    n[r] = [];
  }
  return new Ki(n);
}
function Ki(e) {
  this._ = e;
}
function ox(e, t) {
  return e.trim().split(/^|\s+/).map(function(n) {
    var r = "", o = n.indexOf(".");
    if (o >= 0 && (r = n.slice(o + 1), n = n.slice(0, o)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
    return { type: n, name: r };
  });
}
Ki.prototype = Gs.prototype = {
  constructor: Ki,
  on: function(e, t) {
    var n = this._, r = ox(e + "", n), o, i = -1, s = r.length;
    if (arguments.length < 2) {
      for (; ++i < s; ) if ((o = (e = r[i]).type) && (o = ix(n[o], e.name))) return o;
      return;
    }
    if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
    for (; ++i < s; )
      if (o = (e = r[i]).type) n[o] = Ff(n[o], e.name, t);
      else if (t == null) for (o in n) n[o] = Ff(n[o], e.name, null);
    return this;
  },
  copy: function() {
    var e = {}, t = this._;
    for (var n in t) e[n] = t[n].slice();
    return new Ki(e);
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
function ix(e, t) {
  for (var n = 0, r = e.length, o; n < r; ++n)
    if ((o = e[n]).name === t)
      return o.value;
}
function Ff(e, t, n) {
  for (var r = 0, o = e.length; r < o; ++r)
    if (e[r].name === t) {
      e[r] = rx, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
  return n != null && e.push({ name: t, value: n }), e;
}
var Fa = "http://www.w3.org/1999/xhtml";
const Hf = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: Fa,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function Qs(e) {
  var t = e += "", n = t.indexOf(":");
  return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), Hf.hasOwnProperty(t) ? { space: Hf[t], local: e } : e;
}
function sx(e) {
  return function() {
    var t = this.ownerDocument, n = this.namespaceURI;
    return n === Fa && t.documentElement.namespaceURI === Fa ? t.createElement(e) : t.createElementNS(n, e);
  };
}
function lx(e) {
  return function() {
    return this.ownerDocument.createElementNS(e.space, e.local);
  };
}
function nm(e) {
  var t = Qs(e);
  return (t.local ? lx : sx)(t);
}
function ax() {
}
function tc(e) {
  return e == null ? ax : function() {
    return this.querySelector(e);
  };
}
function ux(e) {
  typeof e != "function" && (e = tc(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = new Array(s), a, u, c = 0; c < s; ++c)
      (a = i[c]) && (u = e.call(a, a.__data__, c, i)) && ("__data__" in a && (u.__data__ = a.__data__), l[c] = u);
  return new nt(r, this._parents);
}
function cx(e) {
  return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
}
function fx() {
  return [];
}
function rm(e) {
  return e == null ? fx : function() {
    return this.querySelectorAll(e);
  };
}
function dx(e) {
  return function() {
    return cx(e.apply(this, arguments));
  };
}
function px(e) {
  typeof e == "function" ? e = dx(e) : e = rm(e);
  for (var t = this._groups, n = t.length, r = [], o = [], i = 0; i < n; ++i)
    for (var s = t[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && (r.push(e.call(a, a.__data__, u, s)), o.push(a));
  return new nt(r, o);
}
function om(e) {
  return function() {
    return this.matches(e);
  };
}
function im(e) {
  return function(t) {
    return t.matches(e);
  };
}
var hx = Array.prototype.find;
function mx(e) {
  return function() {
    return hx.call(this.children, e);
  };
}
function gx() {
  return this.firstElementChild;
}
function yx(e) {
  return this.select(e == null ? gx : mx(typeof e == "function" ? e : im(e)));
}
var vx = Array.prototype.filter;
function xx() {
  return Array.from(this.children);
}
function wx(e) {
  return function() {
    return vx.call(this.children, e);
  };
}
function _x(e) {
  return this.selectAll(e == null ? xx : wx(typeof e == "function" ? e : im(e)));
}
function kx(e) {
  typeof e != "function" && (e = om(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new nt(r, this._parents);
}
function sm(e) {
  return new Array(e.length);
}
function Sx() {
  return new nt(this._enter || this._groups.map(sm), this._parents);
}
function Ss(e, t) {
  this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
}
Ss.prototype = {
  constructor: Ss,
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
function Ex(e) {
  return function() {
    return e;
  };
}
function Nx(e, t, n, r, o, i) {
  for (var s = 0, l, a = t.length, u = i.length; s < u; ++s)
    (l = t[s]) ? (l.__data__ = i[s], r[s] = l) : n[s] = new Ss(e, i[s]);
  for (; s < a; ++s)
    (l = t[s]) && (o[s] = l);
}
function Cx(e, t, n, r, o, i, s) {
  var l, a, u = /* @__PURE__ */ new Map(), c = t.length, f = i.length, d = new Array(c), p;
  for (l = 0; l < c; ++l)
    (a = t[l]) && (d[l] = p = s.call(a, a.__data__, l, t) + "", u.has(p) ? o[l] = a : u.set(p, a));
  for (l = 0; l < f; ++l)
    p = s.call(e, i[l], l, i) + "", (a = u.get(p)) ? (r[l] = a, a.__data__ = i[l], u.delete(p)) : n[l] = new Ss(e, i[l]);
  for (l = 0; l < c; ++l)
    (a = t[l]) && u.get(d[l]) === a && (o[l] = a);
}
function Px(e) {
  return e.__data__;
}
function zx(e, t) {
  if (!arguments.length) return Array.from(this, Px);
  var n = t ? Cx : Nx, r = this._parents, o = this._groups;
  typeof e != "function" && (e = Ex(e));
  for (var i = o.length, s = new Array(i), l = new Array(i), a = new Array(i), u = 0; u < i; ++u) {
    var c = r[u], f = o[u], d = f.length, p = jx(e.call(c, c && c.__data__, u, r)), w = p.length, y = l[u] = new Array(w), k = s[u] = new Array(w), h = a[u] = new Array(d);
    n(c, f, y, k, h, p, t);
    for (var m = 0, v = 0, x, C; m < w; ++m)
      if (x = y[m]) {
        for (m >= v && (v = m + 1); !(C = k[v]) && ++v < w; ) ;
        x._next = C || null;
      }
  }
  return s = new nt(s, r), s._enter = l, s._exit = a, s;
}
function jx(e) {
  return typeof e == "object" && "length" in e ? e : Array.from(e);
}
function Mx() {
  return new nt(this._exit || this._groups.map(sm), this._parents);
}
function Tx(e, t, n) {
  var r = this.enter(), o = this, i = this.exit();
  return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (o = t(o), o && (o = o.selection())), n == null ? i.remove() : n(i), r && o ? r.merge(o).order() : o;
}
function $x(e) {
  for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, o = n.length, i = r.length, s = Math.min(o, i), l = new Array(o), a = 0; a < s; ++a)
    for (var u = n[a], c = r[a], f = u.length, d = l[a] = new Array(f), p, w = 0; w < f; ++w)
      (p = u[w] || c[w]) && (d[w] = p);
  for (; a < o; ++a)
    l[a] = n[a];
  return new nt(l, this._parents);
}
function Ax() {
  for (var e = this._groups, t = -1, n = e.length; ++t < n; )
    for (var r = e[t], o = r.length - 1, i = r[o], s; --o >= 0; )
      (s = r[o]) && (i && s.compareDocumentPosition(i) ^ 4 && i.parentNode.insertBefore(s, i), i = s);
  return this;
}
function Rx(e) {
  e || (e = Ix);
  function t(f, d) {
    return f && d ? e(f.__data__, d.__data__) : !f - !d;
  }
  for (var n = this._groups, r = n.length, o = new Array(r), i = 0; i < r; ++i) {
    for (var s = n[i], l = s.length, a = o[i] = new Array(l), u, c = 0; c < l; ++c)
      (u = s[c]) && (a[c] = u);
    a.sort(t);
  }
  return new nt(o, this._parents).order();
}
function Ix(e, t) {
  return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function Dx() {
  var e = arguments[0];
  return arguments[0] = this, e.apply(null, arguments), this;
}
function Lx() {
  return Array.from(this);
}
function Ox() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length; o < i; ++o) {
      var s = r[o];
      if (s) return s;
    }
  return null;
}
function bx() {
  let e = 0;
  for (const t of this) ++e;
  return e;
}
function Fx() {
  return !this.node();
}
function Hx(e) {
  for (var t = this._groups, n = 0, r = t.length; n < r; ++n)
    for (var o = t[n], i = 0, s = o.length, l; i < s; ++i)
      (l = o[i]) && e.call(l, l.__data__, i, o);
  return this;
}
function Vx(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function Bx(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function Ux(e, t) {
  return function() {
    this.setAttribute(e, t);
  };
}
function Wx(e, t) {
  return function() {
    this.setAttributeNS(e.space, e.local, t);
  };
}
function Yx(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
  };
}
function Xx(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
  };
}
function qx(e, t) {
  var n = Qs(e);
  if (arguments.length < 2) {
    var r = this.node();
    return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
  }
  return this.each((t == null ? n.local ? Bx : Vx : typeof t == "function" ? n.local ? Xx : Yx : n.local ? Wx : Ux)(n, t));
}
function lm(e) {
  return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
}
function Kx(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function Gx(e, t, n) {
  return function() {
    this.style.setProperty(e, t, n);
  };
}
function Qx(e, t, n) {
  return function() {
    var r = t.apply(this, arguments);
    r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
  };
}
function Zx(e, t, n) {
  return arguments.length > 1 ? this.each((t == null ? Kx : typeof t == "function" ? Qx : Gx)(e, t, n ?? "")) : Fr(this.node(), e);
}
function Fr(e, t) {
  return e.style.getPropertyValue(t) || lm(e).getComputedStyle(e, null).getPropertyValue(t);
}
function Jx(e) {
  return function() {
    delete this[e];
  };
}
function ew(e, t) {
  return function() {
    this[e] = t;
  };
}
function tw(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? delete this[e] : this[e] = n;
  };
}
function nw(e, t) {
  return arguments.length > 1 ? this.each((t == null ? Jx : typeof t == "function" ? tw : ew)(e, t)) : this.node()[e];
}
function am(e) {
  return e.trim().split(/^|\s+/);
}
function nc(e) {
  return e.classList || new um(e);
}
function um(e) {
  this._node = e, this._names = am(e.getAttribute("class") || "");
}
um.prototype = {
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
function cm(e, t) {
  for (var n = nc(e), r = -1, o = t.length; ++r < o; ) n.add(t[r]);
}
function fm(e, t) {
  for (var n = nc(e), r = -1, o = t.length; ++r < o; ) n.remove(t[r]);
}
function rw(e) {
  return function() {
    cm(this, e);
  };
}
function ow(e) {
  return function() {
    fm(this, e);
  };
}
function iw(e, t) {
  return function() {
    (t.apply(this, arguments) ? cm : fm)(this, e);
  };
}
function sw(e, t) {
  var n = am(e + "");
  if (arguments.length < 2) {
    for (var r = nc(this.node()), o = -1, i = n.length; ++o < i; ) if (!r.contains(n[o])) return !1;
    return !0;
  }
  return this.each((typeof t == "function" ? iw : t ? rw : ow)(n, t));
}
function lw() {
  this.textContent = "";
}
function aw(e) {
  return function() {
    this.textContent = e;
  };
}
function uw(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.textContent = t ?? "";
  };
}
function cw(e) {
  return arguments.length ? this.each(e == null ? lw : (typeof e == "function" ? uw : aw)(e)) : this.node().textContent;
}
function fw() {
  this.innerHTML = "";
}
function dw(e) {
  return function() {
    this.innerHTML = e;
  };
}
function pw(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.innerHTML = t ?? "";
  };
}
function hw(e) {
  return arguments.length ? this.each(e == null ? fw : (typeof e == "function" ? pw : dw)(e)) : this.node().innerHTML;
}
function mw() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function gw() {
  return this.each(mw);
}
function yw() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function vw() {
  return this.each(yw);
}
function xw(e) {
  var t = typeof e == "function" ? e : nm(e);
  return this.select(function() {
    return this.appendChild(t.apply(this, arguments));
  });
}
function ww() {
  return null;
}
function _w(e, t) {
  var n = typeof e == "function" ? e : nm(e), r = t == null ? ww : typeof t == "function" ? t : tc(t);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
  });
}
function kw() {
  var e = this.parentNode;
  e && e.removeChild(this);
}
function Sw() {
  return this.each(kw);
}
function Ew() {
  var e = this.cloneNode(!1), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function Nw() {
  var e = this.cloneNode(!0), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function Cw(e) {
  return this.select(e ? Nw : Ew);
}
function Pw(e) {
  return arguments.length ? this.property("__data__", e) : this.node().__data__;
}
function zw(e) {
  return function(t) {
    e.call(this, t, this.__data__);
  };
}
function jw(e) {
  return e.trim().split(/^|\s+/).map(function(t) {
    var n = "", r = t.indexOf(".");
    return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), { type: t, name: n };
  });
}
function Mw(e) {
  return function() {
    var t = this.__on;
    if (t) {
      for (var n = 0, r = -1, o = t.length, i; n < o; ++n)
        i = t[n], (!e.type || i.type === e.type) && i.name === e.name ? this.removeEventListener(i.type, i.listener, i.options) : t[++r] = i;
      ++r ? t.length = r : delete this.__on;
    }
  };
}
function Tw(e, t, n) {
  return function() {
    var r = this.__on, o, i = zw(t);
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
function $w(e, t, n) {
  var r = jw(e + ""), o, i = r.length, s;
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
  for (l = t ? Tw : Mw, o = 0; o < i; ++o) this.each(l(r[o], t, n));
  return this;
}
function dm(e, t, n) {
  var r = lm(e), o = r.CustomEvent;
  typeof o == "function" ? o = new o(t, n) : (o = r.document.createEvent("Event"), n ? (o.initEvent(t, n.bubbles, n.cancelable), o.detail = n.detail) : o.initEvent(t, !1, !1)), e.dispatchEvent(o);
}
function Aw(e, t) {
  return function() {
    return dm(this, e, t);
  };
}
function Rw(e, t) {
  return function() {
    return dm(this, e, t.apply(this, arguments));
  };
}
function Iw(e, t) {
  return this.each((typeof t == "function" ? Rw : Aw)(e, t));
}
function* Dw() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length, s; o < i; ++o)
      (s = r[o]) && (yield s);
}
var pm = [null];
function nt(e, t) {
  this._groups = e, this._parents = t;
}
function ai() {
  return new nt([[document.documentElement]], pm);
}
function Lw() {
  return this;
}
nt.prototype = ai.prototype = {
  constructor: nt,
  select: ux,
  selectAll: px,
  selectChild: yx,
  selectChildren: _x,
  filter: kx,
  data: zx,
  enter: Sx,
  exit: Mx,
  join: Tx,
  merge: $x,
  selection: Lw,
  order: Ax,
  sort: Rx,
  call: Dx,
  nodes: Lx,
  node: Ox,
  size: bx,
  empty: Fx,
  each: Hx,
  attr: qx,
  style: Zx,
  property: nw,
  classed: sw,
  text: cw,
  html: hw,
  raise: gw,
  lower: vw,
  append: xw,
  insert: _w,
  remove: Sw,
  clone: Cw,
  datum: Pw,
  on: $w,
  dispatch: Iw,
  [Symbol.iterator]: Dw
};
function lt(e) {
  return typeof e == "string" ? new nt([[document.querySelector(e)]], [document.documentElement]) : new nt([[e]], pm);
}
function Ow(e) {
  let t;
  for (; t = e.sourceEvent; ) e = t;
  return e;
}
function xt(e, t) {
  if (e = Ow(e), t === void 0 && (t = e.currentTarget), t) {
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
const bw = { passive: !1 }, Yo = { capture: !0, passive: !1 };
function Dl(e) {
  e.stopImmediatePropagation();
}
function jr(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function hm(e) {
  var t = e.document.documentElement, n = lt(e).on("dragstart.drag", jr, Yo);
  "onselectstart" in t ? n.on("selectstart.drag", jr, Yo) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
}
function mm(e, t) {
  var n = e.document.documentElement, r = lt(e).on("dragstart.drag", null);
  t && (r.on("click.drag", jr, Yo), setTimeout(function() {
    r.on("click.drag", null);
  }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
}
const zi = (e) => () => e;
function Ha(e, {
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
Ha.prototype.on = function() {
  var e = this._.on.apply(this._, arguments);
  return e === this._ ? this : e;
};
function Fw(e) {
  return !e.ctrlKey && !e.button;
}
function Hw() {
  return this.parentNode;
}
function Vw(e, t) {
  return t ?? { x: e.x, y: e.y };
}
function Bw() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function Uw() {
  var e = Fw, t = Hw, n = Vw, r = Bw, o = {}, i = Gs("start", "drag", "end"), s = 0, l, a, u, c, f = 0;
  function d(x) {
    x.on("mousedown.drag", p).filter(r).on("touchstart.drag", k).on("touchmove.drag", h, bw).on("touchend.drag touchcancel.drag", m).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  function p(x, C) {
    if (!(c || !e.call(this, x, C))) {
      var z = v(this, t.call(this, x, C), x, C, "mouse");
      z && (lt(x.view).on("mousemove.drag", w, Yo).on("mouseup.drag", y, Yo), hm(x.view), Dl(x), u = !1, l = x.clientX, a = x.clientY, z("start", x));
    }
  }
  function w(x) {
    if (jr(x), !u) {
      var C = x.clientX - l, z = x.clientY - a;
      u = C * C + z * z > f;
    }
    o.mouse("drag", x);
  }
  function y(x) {
    lt(x.view).on("mousemove.drag mouseup.drag", null), mm(x.view, u), jr(x), o.mouse("end", x);
  }
  function k(x, C) {
    if (e.call(this, x, C)) {
      var z = x.changedTouches, T = t.call(this, x, C), P = z.length, $, D;
      for ($ = 0; $ < P; ++$)
        (D = v(this, T, x, C, z[$].identifier, z[$])) && (Dl(x), D("start", x, z[$]));
    }
  }
  function h(x) {
    var C = x.changedTouches, z = C.length, T, P;
    for (T = 0; T < z; ++T)
      (P = o[C[T].identifier]) && (jr(x), P("drag", x, C[T]));
  }
  function m(x) {
    var C = x.changedTouches, z = C.length, T, P;
    for (c && clearTimeout(c), c = setTimeout(function() {
      c = null;
    }, 500), T = 0; T < z; ++T)
      (P = o[C[T].identifier]) && (Dl(x), P("end", x, C[T]));
  }
  function v(x, C, z, T, P, $) {
    var D = i.copy(), F = xt($ || z, C), b, H, S;
    if ((S = n.call(x, new Ha("beforestart", {
      sourceEvent: z,
      target: d,
      identifier: P,
      active: s,
      x: F[0],
      y: F[1],
      dx: 0,
      dy: 0,
      dispatch: D
    }), T)) != null)
      return b = S.x - F[0] || 0, H = S.y - F[1] || 0, function A(j, O, E) {
        var _ = F, M;
        switch (j) {
          case "start":
            o[P] = A, M = s++;
            break;
          case "end":
            delete o[P], --s;
          case "drag":
            F = xt(E || O, C), M = s;
            break;
        }
        D.call(
          j,
          x,
          new Ha(j, {
            sourceEvent: O,
            subject: S,
            target: d,
            identifier: P,
            active: M,
            x: F[0] + b,
            y: F[1] + H,
            dx: F[0] - _[0],
            dy: F[1] - _[1],
            dispatch: D
          }),
          T
        );
      };
  }
  return d.filter = function(x) {
    return arguments.length ? (e = typeof x == "function" ? x : zi(!!x), d) : e;
  }, d.container = function(x) {
    return arguments.length ? (t = typeof x == "function" ? x : zi(x), d) : t;
  }, d.subject = function(x) {
    return arguments.length ? (n = typeof x == "function" ? x : zi(x), d) : n;
  }, d.touchable = function(x) {
    return arguments.length ? (r = typeof x == "function" ? x : zi(!!x), d) : r;
  }, d.on = function() {
    var x = i.on.apply(i, arguments);
    return x === i ? d : x;
  }, d.clickDistance = function(x) {
    return arguments.length ? (f = (x = +x) * x, d) : Math.sqrt(f);
  }, d;
}
function rc(e, t, n) {
  e.prototype = t.prototype = n, n.constructor = e;
}
function gm(e, t) {
  var n = Object.create(e.prototype);
  for (var r in t) n[r] = t[r];
  return n;
}
function ui() {
}
var Xo = 0.7, Es = 1 / Xo, Mr = "\\s*([+-]?\\d+)\\s*", qo = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", $t = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Ww = /^#([0-9a-f]{3,8})$/, Yw = new RegExp(`^rgb\\(${Mr},${Mr},${Mr}\\)$`), Xw = new RegExp(`^rgb\\(${$t},${$t},${$t}\\)$`), qw = new RegExp(`^rgba\\(${Mr},${Mr},${Mr},${qo}\\)$`), Kw = new RegExp(`^rgba\\(${$t},${$t},${$t},${qo}\\)$`), Gw = new RegExp(`^hsl\\(${qo},${$t},${$t}\\)$`), Qw = new RegExp(`^hsla\\(${qo},${$t},${$t},${qo}\\)$`), Vf = {
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
rc(ui, Ko, {
  copy(e) {
    return Object.assign(new this.constructor(), this, e);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: Bf,
  // Deprecated! Use color.formatHex.
  formatHex: Bf,
  formatHex8: Zw,
  formatHsl: Jw,
  formatRgb: Uf,
  toString: Uf
});
function Bf() {
  return this.rgb().formatHex();
}
function Zw() {
  return this.rgb().formatHex8();
}
function Jw() {
  return ym(this).formatHsl();
}
function Uf() {
  return this.rgb().formatRgb();
}
function Ko(e) {
  var t, n;
  return e = (e + "").trim().toLowerCase(), (t = Ww.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Wf(t) : n === 3 ? new Xe(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? ji(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? ji(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Yw.exec(e)) ? new Xe(t[1], t[2], t[3], 1) : (t = Xw.exec(e)) ? new Xe(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = qw.exec(e)) ? ji(t[1], t[2], t[3], t[4]) : (t = Kw.exec(e)) ? ji(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Gw.exec(e)) ? qf(t[1], t[2] / 100, t[3] / 100, 1) : (t = Qw.exec(e)) ? qf(t[1], t[2] / 100, t[3] / 100, t[4]) : Vf.hasOwnProperty(e) ? Wf(Vf[e]) : e === "transparent" ? new Xe(NaN, NaN, NaN, 0) : null;
}
function Wf(e) {
  return new Xe(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function ji(e, t, n, r) {
  return r <= 0 && (e = t = n = NaN), new Xe(e, t, n, r);
}
function e1(e) {
  return e instanceof ui || (e = Ko(e)), e ? (e = e.rgb(), new Xe(e.r, e.g, e.b, e.opacity)) : new Xe();
}
function Va(e, t, n, r) {
  return arguments.length === 1 ? e1(e) : new Xe(e, t, n, r ?? 1);
}
function Xe(e, t, n, r) {
  this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
rc(Xe, Va, gm(ui, {
  brighter(e) {
    return e = e == null ? Es : Math.pow(Es, e), new Xe(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? Xo : Math.pow(Xo, e), new Xe(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Xe(Vn(this.r), Vn(this.g), Vn(this.b), Ns(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: Yf,
  // Deprecated! Use color.formatHex.
  formatHex: Yf,
  formatHex8: t1,
  formatRgb: Xf,
  toString: Xf
}));
function Yf() {
  return `#${On(this.r)}${On(this.g)}${On(this.b)}`;
}
function t1() {
  return `#${On(this.r)}${On(this.g)}${On(this.b)}${On((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function Xf() {
  const e = Ns(this.opacity);
  return `${e === 1 ? "rgb(" : "rgba("}${Vn(this.r)}, ${Vn(this.g)}, ${Vn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function Ns(e) {
  return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function Vn(e) {
  return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function On(e) {
  return e = Vn(e), (e < 16 ? "0" : "") + e.toString(16);
}
function qf(e, t, n, r) {
  return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new _t(e, t, n, r);
}
function ym(e) {
  if (e instanceof _t) return new _t(e.h, e.s, e.l, e.opacity);
  if (e instanceof ui || (e = Ko(e)), !e) return new _t();
  if (e instanceof _t) return e;
  e = e.rgb();
  var t = e.r / 255, n = e.g / 255, r = e.b / 255, o = Math.min(t, n, r), i = Math.max(t, n, r), s = NaN, l = i - o, a = (i + o) / 2;
  return l ? (t === i ? s = (n - r) / l + (n < r) * 6 : n === i ? s = (r - t) / l + 2 : s = (t - n) / l + 4, l /= a < 0.5 ? i + o : 2 - i - o, s *= 60) : l = a > 0 && a < 1 ? 0 : s, new _t(s, l, a, e.opacity);
}
function n1(e, t, n, r) {
  return arguments.length === 1 ? ym(e) : new _t(e, t, n, r ?? 1);
}
function _t(e, t, n, r) {
  this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
rc(_t, n1, gm(ui, {
  brighter(e) {
    return e = e == null ? Es : Math.pow(Es, e), new _t(this.h, this.s, this.l * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? Xo : Math.pow(Xo, e), new _t(this.h, this.s, this.l * e, this.opacity);
  },
  rgb() {
    var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, o = 2 * n - r;
    return new Xe(
      Ll(e >= 240 ? e - 240 : e + 120, o, r),
      Ll(e, o, r),
      Ll(e < 120 ? e + 240 : e - 120, o, r),
      this.opacity
    );
  },
  clamp() {
    return new _t(Kf(this.h), Mi(this.s), Mi(this.l), Ns(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const e = Ns(this.opacity);
    return `${e === 1 ? "hsl(" : "hsla("}${Kf(this.h)}, ${Mi(this.s) * 100}%, ${Mi(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
  }
}));
function Kf(e) {
  return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function Mi(e) {
  return Math.max(0, Math.min(1, e || 0));
}
function Ll(e, t, n) {
  return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
const vm = (e) => () => e;
function r1(e, t) {
  return function(n) {
    return e + n * t;
  };
}
function o1(e, t, n) {
  return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
    return Math.pow(e + r * t, n);
  };
}
function i1(e) {
  return (e = +e) == 1 ? xm : function(t, n) {
    return n - t ? o1(t, n, e) : vm(isNaN(t) ? n : t);
  };
}
function xm(e, t) {
  var n = t - e;
  return n ? r1(e, n) : vm(isNaN(e) ? t : e);
}
const Gf = function e(t) {
  var n = i1(t);
  function r(o, i) {
    var s = n((o = Va(o)).r, (i = Va(i)).r), l = n(o.g, i.g), a = n(o.b, i.b), u = xm(o.opacity, i.opacity);
    return function(c) {
      return o.r = s(c), o.g = l(c), o.b = a(c), o.opacity = u(c), o + "";
    };
  }
  return r.gamma = e, r;
}(1);
function rn(e, t) {
  return e = +e, t = +t, function(n) {
    return e * (1 - n) + t * n;
  };
}
var Ba = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Ol = new RegExp(Ba.source, "g");
function s1(e) {
  return function() {
    return e;
  };
}
function l1(e) {
  return function(t) {
    return e(t) + "";
  };
}
function a1(e, t) {
  var n = Ba.lastIndex = Ol.lastIndex = 0, r, o, i, s = -1, l = [], a = [];
  for (e = e + "", t = t + ""; (r = Ba.exec(e)) && (o = Ol.exec(t)); )
    (i = o.index) > n && (i = t.slice(n, i), l[s] ? l[s] += i : l[++s] = i), (r = r[0]) === (o = o[0]) ? l[s] ? l[s] += o : l[++s] = o : (l[++s] = null, a.push({ i: s, x: rn(r, o) })), n = Ol.lastIndex;
  return n < t.length && (i = t.slice(n), l[s] ? l[s] += i : l[++s] = i), l.length < 2 ? a[0] ? l1(a[0].x) : s1(t) : (t = a.length, function(u) {
    for (var c = 0, f; c < t; ++c) l[(f = a[c]).i] = f.x(u);
    return l.join("");
  });
}
var Qf = 180 / Math.PI, Ua = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function wm(e, t, n, r, o, i) {
  var s, l, a;
  return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (a = e * n + t * r) && (n -= e * a, r -= t * a), (l = Math.sqrt(n * n + r * r)) && (n /= l, r /= l, a /= l), e * r < t * n && (e = -e, t = -t, a = -a, s = -s), {
    translateX: o,
    translateY: i,
    rotate: Math.atan2(t, e) * Qf,
    skewX: Math.atan(a) * Qf,
    scaleX: s,
    scaleY: l
  };
}
var Ti;
function u1(e) {
  const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
  return t.isIdentity ? Ua : wm(t.a, t.b, t.c, t.d, t.e, t.f);
}
function c1(e) {
  return e == null || (Ti || (Ti = document.createElementNS("http://www.w3.org/2000/svg", "g")), Ti.setAttribute("transform", e), !(e = Ti.transform.baseVal.consolidate())) ? Ua : (e = e.matrix, wm(e.a, e.b, e.c, e.d, e.e, e.f));
}
function _m(e, t, n, r) {
  function o(u) {
    return u.length ? u.pop() + " " : "";
  }
  function i(u, c, f, d, p, w) {
    if (u !== f || c !== d) {
      var y = p.push("translate(", null, t, null, n);
      w.push({ i: y - 4, x: rn(u, f) }, { i: y - 2, x: rn(c, d) });
    } else (f || d) && p.push("translate(" + f + t + d + n);
  }
  function s(u, c, f, d) {
    u !== c ? (u - c > 180 ? c += 360 : c - u > 180 && (u += 360), d.push({ i: f.push(o(f) + "rotate(", null, r) - 2, x: rn(u, c) })) : c && f.push(o(f) + "rotate(" + c + r);
  }
  function l(u, c, f, d) {
    u !== c ? d.push({ i: f.push(o(f) + "skewX(", null, r) - 2, x: rn(u, c) }) : c && f.push(o(f) + "skewX(" + c + r);
  }
  function a(u, c, f, d, p, w) {
    if (u !== f || c !== d) {
      var y = p.push(o(p) + "scale(", null, ",", null, ")");
      w.push({ i: y - 4, x: rn(u, f) }, { i: y - 2, x: rn(c, d) });
    } else (f !== 1 || d !== 1) && p.push(o(p) + "scale(" + f + "," + d + ")");
  }
  return function(u, c) {
    var f = [], d = [];
    return u = e(u), c = e(c), i(u.translateX, u.translateY, c.translateX, c.translateY, f, d), s(u.rotate, c.rotate, f, d), l(u.skewX, c.skewX, f, d), a(u.scaleX, u.scaleY, c.scaleX, c.scaleY, f, d), u = c = null, function(p) {
      for (var w = -1, y = d.length, k; ++w < y; ) f[(k = d[w]).i] = k.x(p);
      return f.join("");
    };
  };
}
var f1 = _m(u1, "px, ", "px)", "deg)"), d1 = _m(c1, ", ", ")", ")"), p1 = 1e-12;
function Zf(e) {
  return ((e = Math.exp(e)) + 1 / e) / 2;
}
function h1(e) {
  return ((e = Math.exp(e)) - 1 / e) / 2;
}
function m1(e) {
  return ((e = Math.exp(2 * e)) - 1) / (e + 1);
}
const g1 = function e(t, n, r) {
  function o(i, s) {
    var l = i[0], a = i[1], u = i[2], c = s[0], f = s[1], d = s[2], p = c - l, w = f - a, y = p * p + w * w, k, h;
    if (y < p1)
      h = Math.log(d / u) / t, k = function(T) {
        return [
          l + T * p,
          a + T * w,
          u * Math.exp(t * T * h)
        ];
      };
    else {
      var m = Math.sqrt(y), v = (d * d - u * u + r * y) / (2 * u * n * m), x = (d * d - u * u - r * y) / (2 * d * n * m), C = Math.log(Math.sqrt(v * v + 1) - v), z = Math.log(Math.sqrt(x * x + 1) - x);
      h = (z - C) / t, k = function(T) {
        var P = T * h, $ = Zf(C), D = u / (n * m) * ($ * m1(t * P + C) - h1(C));
        return [
          l + D * p,
          a + D * w,
          u * $ / Zf(t * P + C)
        ];
      };
    }
    return k.duration = h * 1e3 * t / Math.SQRT2, k;
  }
  return o.rho = function(i) {
    var s = Math.max(1e-3, +i), l = s * s, a = l * l;
    return e(s, l, a);
  }, o;
}(Math.SQRT2, 2, 4);
var Hr = 0, go = 0, so = 0, km = 1e3, Cs, yo, Ps = 0, Kn = 0, Zs = 0, Go = typeof performance == "object" && performance.now ? performance : Date, Sm = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
  setTimeout(e, 17);
};
function oc() {
  return Kn || (Sm(y1), Kn = Go.now() + Zs);
}
function y1() {
  Kn = 0;
}
function zs() {
  this._call = this._time = this._next = null;
}
zs.prototype = Em.prototype = {
  constructor: zs,
  restart: function(e, t, n) {
    if (typeof e != "function") throw new TypeError("callback is not a function");
    n = (n == null ? oc() : +n) + (t == null ? 0 : +t), !this._next && yo !== this && (yo ? yo._next = this : Cs = this, yo = this), this._call = e, this._time = n, Wa();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, Wa());
  }
};
function Em(e, t, n) {
  var r = new zs();
  return r.restart(e, t, n), r;
}
function v1() {
  oc(), ++Hr;
  for (var e = Cs, t; e; )
    (t = Kn - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
  --Hr;
}
function Jf() {
  Kn = (Ps = Go.now()) + Zs, Hr = go = 0;
  try {
    v1();
  } finally {
    Hr = 0, w1(), Kn = 0;
  }
}
function x1() {
  var e = Go.now(), t = e - Ps;
  t > km && (Zs -= t, Ps = e);
}
function w1() {
  for (var e, t = Cs, n, r = 1 / 0; t; )
    t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : Cs = n);
  yo = e, Wa(r);
}
function Wa(e) {
  if (!Hr) {
    go && (go = clearTimeout(go));
    var t = e - Kn;
    t > 24 ? (e < 1 / 0 && (go = setTimeout(Jf, e - Go.now() - Zs)), so && (so = clearInterval(so))) : (so || (Ps = Go.now(), so = setInterval(x1, km)), Hr = 1, Sm(Jf));
  }
}
function ed(e, t, n) {
  var r = new zs();
  return t = t == null ? 0 : +t, r.restart((o) => {
    r.stop(), e(o + t);
  }, t, n), r;
}
var _1 = Gs("start", "end", "cancel", "interrupt"), k1 = [], Nm = 0, td = 1, Ya = 2, Gi = 3, nd = 4, Xa = 5, Qi = 6;
function Js(e, t, n, r, o, i) {
  var s = e.__transition;
  if (!s) e.__transition = {};
  else if (n in s) return;
  S1(e, n, {
    name: t,
    index: r,
    // For context during callback.
    group: o,
    // For context during callback.
    on: _1,
    tween: k1,
    time: i.time,
    delay: i.delay,
    duration: i.duration,
    ease: i.ease,
    timer: null,
    state: Nm
  });
}
function ic(e, t) {
  var n = Nt(e, t);
  if (n.state > Nm) throw new Error("too late; already scheduled");
  return n;
}
function At(e, t) {
  var n = Nt(e, t);
  if (n.state > Gi) throw new Error("too late; already running");
  return n;
}
function Nt(e, t) {
  var n = e.__transition;
  if (!n || !(n = n[t])) throw new Error("transition not found");
  return n;
}
function S1(e, t, n) {
  var r = e.__transition, o;
  r[t] = n, n.timer = Em(i, 0, n.time);
  function i(u) {
    n.state = td, n.timer.restart(s, n.delay, n.time), n.delay <= u && s(u - n.delay);
  }
  function s(u) {
    var c, f, d, p;
    if (n.state !== td) return a();
    for (c in r)
      if (p = r[c], p.name === n.name) {
        if (p.state === Gi) return ed(s);
        p.state === nd ? (p.state = Qi, p.timer.stop(), p.on.call("interrupt", e, e.__data__, p.index, p.group), delete r[c]) : +c < t && (p.state = Qi, p.timer.stop(), p.on.call("cancel", e, e.__data__, p.index, p.group), delete r[c]);
      }
    if (ed(function() {
      n.state === Gi && (n.state = nd, n.timer.restart(l, n.delay, n.time), l(u));
    }), n.state = Ya, n.on.call("start", e, e.__data__, n.index, n.group), n.state === Ya) {
      for (n.state = Gi, o = new Array(d = n.tween.length), c = 0, f = -1; c < d; ++c)
        (p = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (o[++f] = p);
      o.length = f + 1;
    }
  }
  function l(u) {
    for (var c = u < n.duration ? n.ease.call(null, u / n.duration) : (n.timer.restart(a), n.state = Xa, 1), f = -1, d = o.length; ++f < d; )
      o[f].call(e, c);
    n.state === Xa && (n.on.call("end", e, e.__data__, n.index, n.group), a());
  }
  function a() {
    n.state = Qi, n.timer.stop(), delete r[t];
    for (var u in r) return;
    delete e.__transition;
  }
}
function Zi(e, t) {
  var n = e.__transition, r, o, i = !0, s;
  if (n) {
    t = t == null ? null : t + "";
    for (s in n) {
      if ((r = n[s]).name !== t) {
        i = !1;
        continue;
      }
      o = r.state > Ya && r.state < Xa, r.state = Qi, r.timer.stop(), r.on.call(o ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[s];
    }
    i && delete e.__transition;
  }
}
function E1(e) {
  return this.each(function() {
    Zi(this, e);
  });
}
function N1(e, t) {
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
function C1(e, t, n) {
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
function P1(e, t) {
  var n = this._id;
  if (e += "", arguments.length < 2) {
    for (var r = Nt(this.node(), n).tween, o = 0, i = r.length, s; o < i; ++o)
      if ((s = r[o]).name === e)
        return s.value;
    return null;
  }
  return this.each((t == null ? N1 : C1)(n, e, t));
}
function sc(e, t, n) {
  var r = e._id;
  return e.each(function() {
    var o = At(this, r);
    (o.value || (o.value = {}))[t] = n.apply(this, arguments);
  }), function(o) {
    return Nt(o, r).value[t];
  };
}
function Cm(e, t) {
  var n;
  return (typeof t == "number" ? rn : t instanceof Ko ? Gf : (n = Ko(t)) ? (t = n, Gf) : a1)(e, t);
}
function z1(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function j1(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function M1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttribute(e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function T1(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttributeNS(e.space, e.local);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function $1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function A1(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), a;
    return l == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), a = l + "", s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l)));
  };
}
function R1(e, t) {
  var n = Qs(e), r = n === "transform" ? d1 : Cm;
  return this.attrTween(e, typeof t == "function" ? (n.local ? A1 : $1)(n, r, sc(this, "attr." + e, t)) : t == null ? (n.local ? j1 : z1)(n) : (n.local ? T1 : M1)(n, r, t));
}
function I1(e, t) {
  return function(n) {
    this.setAttribute(e, t.call(this, n));
  };
}
function D1(e, t) {
  return function(n) {
    this.setAttributeNS(e.space, e.local, t.call(this, n));
  };
}
function L1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && D1(e, i)), n;
  }
  return o._value = t, o;
}
function O1(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && I1(e, i)), n;
  }
  return o._value = t, o;
}
function b1(e, t) {
  var n = "attr." + e;
  if (arguments.length < 2) return (n = this.tween(n)) && n._value;
  if (t == null) return this.tween(n, null);
  if (typeof t != "function") throw new Error();
  var r = Qs(e);
  return this.tween(n, (r.local ? L1 : O1)(r, t));
}
function F1(e, t) {
  return function() {
    ic(this, e).delay = +t.apply(this, arguments);
  };
}
function H1(e, t) {
  return t = +t, function() {
    ic(this, e).delay = t;
  };
}
function V1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? F1 : H1)(t, e)) : Nt(this.node(), t).delay;
}
function B1(e, t) {
  return function() {
    At(this, e).duration = +t.apply(this, arguments);
  };
}
function U1(e, t) {
  return t = +t, function() {
    At(this, e).duration = t;
  };
}
function W1(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? B1 : U1)(t, e)) : Nt(this.node(), t).duration;
}
function Y1(e, t) {
  if (typeof t != "function") throw new Error();
  return function() {
    At(this, e).ease = t;
  };
}
function X1(e) {
  var t = this._id;
  return arguments.length ? this.each(Y1(t, e)) : Nt(this.node(), t).ease;
}
function q1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    if (typeof n != "function") throw new Error();
    At(this, e).ease = n;
  };
}
function K1(e) {
  if (typeof e != "function") throw new Error();
  return this.each(q1(this._id, e));
}
function G1(e) {
  typeof e != "function" && (e = om(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], a, u = 0; u < s; ++u)
      (a = i[u]) && e.call(a, a.__data__, u, i) && l.push(a);
  return new Kt(r, this._parents, this._name, this._id);
}
function Q1(e) {
  if (e._id !== this._id) throw new Error();
  for (var t = this._groups, n = e._groups, r = t.length, o = n.length, i = Math.min(r, o), s = new Array(r), l = 0; l < i; ++l)
    for (var a = t[l], u = n[l], c = a.length, f = s[l] = new Array(c), d, p = 0; p < c; ++p)
      (d = a[p] || u[p]) && (f[p] = d);
  for (; l < r; ++l)
    s[l] = t[l];
  return new Kt(s, this._parents, this._name, this._id);
}
function Z1(e) {
  return (e + "").trim().split(/^|\s+/).every(function(t) {
    var n = t.indexOf(".");
    return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
  });
}
function J1(e, t, n) {
  var r, o, i = Z1(t) ? ic : At;
  return function() {
    var s = i(this, e), l = s.on;
    l !== r && (o = (r = l).copy()).on(t, n), s.on = o;
  };
}
function e_(e, t) {
  var n = this._id;
  return arguments.length < 2 ? Nt(this.node(), n).on.on(e) : this.each(J1(n, e, t));
}
function t_(e) {
  return function() {
    var t = this.parentNode;
    for (var n in this.__transition) if (+n !== e) return;
    t && t.removeChild(this);
  };
}
function n_() {
  return this.on("end.remove", t_(this._id));
}
function r_(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = tc(e));
  for (var r = this._groups, o = r.length, i = new Array(o), s = 0; s < o; ++s)
    for (var l = r[s], a = l.length, u = i[s] = new Array(a), c, f, d = 0; d < a; ++d)
      (c = l[d]) && (f = e.call(c, c.__data__, d, l)) && ("__data__" in c && (f.__data__ = c.__data__), u[d] = f, Js(u[d], t, n, d, u, Nt(c, n)));
  return new Kt(i, this._parents, t, n);
}
function o_(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = rm(e));
  for (var r = this._groups, o = r.length, i = [], s = [], l = 0; l < o; ++l)
    for (var a = r[l], u = a.length, c, f = 0; f < u; ++f)
      if (c = a[f]) {
        for (var d = e.call(c, c.__data__, f, a), p, w = Nt(c, n), y = 0, k = d.length; y < k; ++y)
          (p = d[y]) && Js(p, t, n, y, d, w);
        i.push(d), s.push(c);
      }
  return new Kt(i, s, t, n);
}
var i_ = ai.prototype.constructor;
function s_() {
  return new i_(this._groups, this._parents);
}
function l_(e, t) {
  var n, r, o;
  return function() {
    var i = Fr(this, e), s = (this.style.removeProperty(e), Fr(this, e));
    return i === s ? null : i === n && s === r ? o : o = t(n = i, r = s);
  };
}
function Pm(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function a_(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = Fr(this, e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function u_(e, t, n) {
  var r, o, i;
  return function() {
    var s = Fr(this, e), l = n(this), a = l + "";
    return l == null && (a = l = (this.style.removeProperty(e), Fr(this, e))), s === a ? null : s === r && a === o ? i : (o = a, i = t(r = s, l));
  };
}
function c_(e, t) {
  var n, r, o, i = "style." + t, s = "end." + i, l;
  return function() {
    var a = At(this, e), u = a.on, c = a.value[i] == null ? l || (l = Pm(t)) : void 0;
    (u !== n || o !== c) && (r = (n = u).copy()).on(s, o = c), a.on = r;
  };
}
function f_(e, t, n) {
  var r = (e += "") == "transform" ? f1 : Cm;
  return t == null ? this.styleTween(e, l_(e, r)).on("end.style." + e, Pm(e)) : typeof t == "function" ? this.styleTween(e, u_(e, r, sc(this, "style." + e, t))).each(c_(this._id, e)) : this.styleTween(e, a_(e, r, t), n).on("end.style." + e, null);
}
function d_(e, t, n) {
  return function(r) {
    this.style.setProperty(e, t.call(this, r), n);
  };
}
function p_(e, t, n) {
  var r, o;
  function i() {
    var s = t.apply(this, arguments);
    return s !== o && (r = (o = s) && d_(e, s, n)), r;
  }
  return i._value = t, i;
}
function h_(e, t, n) {
  var r = "style." + (e += "");
  if (arguments.length < 2) return (r = this.tween(r)) && r._value;
  if (t == null) return this.tween(r, null);
  if (typeof t != "function") throw new Error();
  return this.tween(r, p_(e, t, n ?? ""));
}
function m_(e) {
  return function() {
    this.textContent = e;
  };
}
function g_(e) {
  return function() {
    var t = e(this);
    this.textContent = t ?? "";
  };
}
function y_(e) {
  return this.tween("text", typeof e == "function" ? g_(sc(this, "text", e)) : m_(e == null ? "" : e + ""));
}
function v_(e) {
  return function(t) {
    this.textContent = e.call(this, t);
  };
}
function x_(e) {
  var t, n;
  function r() {
    var o = e.apply(this, arguments);
    return o !== n && (t = (n = o) && v_(o)), t;
  }
  return r._value = e, r;
}
function w_(e) {
  var t = "text";
  if (arguments.length < 1) return (t = this.tween(t)) && t._value;
  if (e == null) return this.tween(t, null);
  if (typeof e != "function") throw new Error();
  return this.tween(t, x_(e));
}
function __() {
  for (var e = this._name, t = this._id, n = zm(), r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      if (a = s[u]) {
        var c = Nt(a, t);
        Js(a, e, n, u, s, {
          time: c.time + c.delay + c.duration,
          delay: 0,
          duration: c.duration,
          ease: c.ease
        });
      }
  return new Kt(r, this._parents, e, n);
}
function k_() {
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
var S_ = 0;
function Kt(e, t, n, r) {
  this._groups = e, this._parents = t, this._name = n, this._id = r;
}
function zm() {
  return ++S_;
}
var Lt = ai.prototype;
Kt.prototype = {
  constructor: Kt,
  select: r_,
  selectAll: o_,
  selectChild: Lt.selectChild,
  selectChildren: Lt.selectChildren,
  filter: G1,
  merge: Q1,
  selection: s_,
  transition: __,
  call: Lt.call,
  nodes: Lt.nodes,
  node: Lt.node,
  size: Lt.size,
  empty: Lt.empty,
  each: Lt.each,
  on: e_,
  attr: R1,
  attrTween: b1,
  style: f_,
  styleTween: h_,
  text: y_,
  textTween: w_,
  remove: n_,
  tween: P1,
  delay: V1,
  duration: W1,
  ease: X1,
  easeVarying: K1,
  end: k_,
  [Symbol.iterator]: Lt[Symbol.iterator]
};
function E_(e) {
  return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
}
var N_ = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: E_
};
function C_(e, t) {
  for (var n; !(n = e.__transition) || !(n = n[t]); )
    if (!(e = e.parentNode))
      throw new Error(`transition ${t} not found`);
  return n;
}
function P_(e) {
  var t, n;
  e instanceof Kt ? (t = e._id, e = e._name) : (t = zm(), (n = N_).time = oc(), e = e == null ? null : e + "");
  for (var r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, a, u = 0; u < l; ++u)
      (a = s[u]) && Js(a, e, t, u, s, n || C_(a, t));
  return new Kt(r, this._parents, e, t);
}
ai.prototype.interrupt = E1;
ai.prototype.transition = P_;
const $i = (e) => () => e;
function z_(e, {
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
var Ut = new Vt(1, 0, 0);
Vt.prototype;
function bl(e) {
  e.stopImmediatePropagation();
}
function lo(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function j_(e) {
  return (!e.ctrlKey || e.type === "wheel") && !e.button;
}
function M_() {
  var e = this;
  return e instanceof SVGElement ? (e = e.ownerSVGElement || e, e.hasAttribute("viewBox") ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]]) : [[0, 0], [e.clientWidth, e.clientHeight]];
}
function rd() {
  return this.__zoom || Ut;
}
function T_(e) {
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * (e.ctrlKey ? 10 : 1);
}
function $_() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function A_(e, t, n) {
  var r = e.invertX(t[0][0]) - n[0][0], o = e.invertX(t[1][0]) - n[1][0], i = e.invertY(t[0][1]) - n[0][1], s = e.invertY(t[1][1]) - n[1][1];
  return e.translate(
    o > r ? (r + o) / 2 : Math.min(0, r) || Math.max(0, o),
    s > i ? (i + s) / 2 : Math.min(0, i) || Math.max(0, s)
  );
}
function jm() {
  var e = j_, t = M_, n = A_, r = T_, o = $_, i = [0, 1 / 0], s = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]], l = 250, a = g1, u = Gs("start", "zoom", "end"), c, f, d, p = 500, w = 150, y = 0, k = 10;
  function h(S) {
    S.property("__zoom", rd).on("wheel.zoom", P, { passive: !1 }).on("mousedown.zoom", $).on("dblclick.zoom", D).filter(o).on("touchstart.zoom", F).on("touchmove.zoom", b).on("touchend.zoom touchcancel.zoom", H).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  h.transform = function(S, A, j, O) {
    var E = S.selection ? S.selection() : S;
    E.property("__zoom", rd), S !== E ? C(S, A, j, O) : E.interrupt().each(function() {
      z(this, arguments).event(O).start().zoom(null, typeof A == "function" ? A.apply(this, arguments) : A).end();
    });
  }, h.scaleBy = function(S, A, j, O) {
    h.scaleTo(S, function() {
      var E = this.__zoom.k, _ = typeof A == "function" ? A.apply(this, arguments) : A;
      return E * _;
    }, j, O);
  }, h.scaleTo = function(S, A, j, O) {
    h.transform(S, function() {
      var E = t.apply(this, arguments), _ = this.__zoom, M = j == null ? x(E) : typeof j == "function" ? j.apply(this, arguments) : j, R = _.invert(M), L = typeof A == "function" ? A.apply(this, arguments) : A;
      return n(v(m(_, L), M, R), E, s);
    }, j, O);
  }, h.translateBy = function(S, A, j, O) {
    h.transform(S, function() {
      return n(this.__zoom.translate(
        typeof A == "function" ? A.apply(this, arguments) : A,
        typeof j == "function" ? j.apply(this, arguments) : j
      ), t.apply(this, arguments), s);
    }, null, O);
  }, h.translateTo = function(S, A, j, O, E) {
    h.transform(S, function() {
      var _ = t.apply(this, arguments), M = this.__zoom, R = O == null ? x(_) : typeof O == "function" ? O.apply(this, arguments) : O;
      return n(Ut.translate(R[0], R[1]).scale(M.k).translate(
        typeof A == "function" ? -A.apply(this, arguments) : -A,
        typeof j == "function" ? -j.apply(this, arguments) : -j
      ), _, s);
    }, O, E);
  };
  function m(S, A) {
    return A = Math.max(i[0], Math.min(i[1], A)), A === S.k ? S : new Vt(A, S.x, S.y);
  }
  function v(S, A, j) {
    var O = A[0] - j[0] * S.k, E = A[1] - j[1] * S.k;
    return O === S.x && E === S.y ? S : new Vt(S.k, O, E);
  }
  function x(S) {
    return [(+S[0][0] + +S[1][0]) / 2, (+S[0][1] + +S[1][1]) / 2];
  }
  function C(S, A, j, O) {
    S.on("start.zoom", function() {
      z(this, arguments).event(O).start();
    }).on("interrupt.zoom end.zoom", function() {
      z(this, arguments).event(O).end();
    }).tween("zoom", function() {
      var E = this, _ = arguments, M = z(E, _).event(O), R = t.apply(E, _), L = j == null ? x(R) : typeof j == "function" ? j.apply(E, _) : j, B = Math.max(R[1][0] - R[0][0], R[1][1] - R[0][1]), U = E.__zoom, W = typeof A == "function" ? A.apply(E, _) : A, q = a(U.invert(L).concat(B / U.k), W.invert(L).concat(B / W.k));
      return function(Q) {
        if (Q === 1) Q = W;
        else {
          var te = q(Q), Z = B / te[2];
          Q = new Vt(Z, L[0] - te[0] * Z, L[1] - te[1] * Z);
        }
        M.zoom(null, Q);
      };
    });
  }
  function z(S, A, j) {
    return !j && S.__zooming || new T(S, A);
  }
  function T(S, A) {
    this.that = S, this.args = A, this.active = 0, this.sourceEvent = null, this.extent = t.apply(S, A), this.taps = 0;
  }
  T.prototype = {
    event: function(S) {
      return S && (this.sourceEvent = S), this;
    },
    start: function() {
      return ++this.active === 1 && (this.that.__zooming = this, this.emit("start")), this;
    },
    zoom: function(S, A) {
      return this.mouse && S !== "mouse" && (this.mouse[1] = A.invert(this.mouse[0])), this.touch0 && S !== "touch" && (this.touch0[1] = A.invert(this.touch0[0])), this.touch1 && S !== "touch" && (this.touch1[1] = A.invert(this.touch1[0])), this.that.__zoom = A, this.emit("zoom"), this;
    },
    end: function() {
      return --this.active === 0 && (delete this.that.__zooming, this.emit("end")), this;
    },
    emit: function(S) {
      var A = lt(this.that).datum();
      u.call(
        S,
        this.that,
        new z_(S, {
          sourceEvent: this.sourceEvent,
          target: h,
          transform: this.that.__zoom,
          dispatch: u
        }),
        A
      );
    }
  };
  function P(S, ...A) {
    if (!e.apply(this, arguments)) return;
    var j = z(this, A).event(S), O = this.__zoom, E = Math.max(i[0], Math.min(i[1], O.k * Math.pow(2, r.apply(this, arguments)))), _ = xt(S);
    if (j.wheel)
      (j.mouse[0][0] !== _[0] || j.mouse[0][1] !== _[1]) && (j.mouse[1] = O.invert(j.mouse[0] = _)), clearTimeout(j.wheel);
    else {
      if (O.k === E) return;
      j.mouse = [_, O.invert(_)], Zi(this), j.start();
    }
    lo(S), j.wheel = setTimeout(M, w), j.zoom("mouse", n(v(m(O, E), j.mouse[0], j.mouse[1]), j.extent, s));
    function M() {
      j.wheel = null, j.end();
    }
  }
  function $(S, ...A) {
    if (d || !e.apply(this, arguments)) return;
    var j = S.currentTarget, O = z(this, A, !0).event(S), E = lt(S.view).on("mousemove.zoom", L, !0).on("mouseup.zoom", B, !0), _ = xt(S, j), M = S.clientX, R = S.clientY;
    hm(S.view), bl(S), O.mouse = [_, this.__zoom.invert(_)], Zi(this), O.start();
    function L(U) {
      if (lo(U), !O.moved) {
        var W = U.clientX - M, q = U.clientY - R;
        O.moved = W * W + q * q > y;
      }
      O.event(U).zoom("mouse", n(v(O.that.__zoom, O.mouse[0] = xt(U, j), O.mouse[1]), O.extent, s));
    }
    function B(U) {
      E.on("mousemove.zoom mouseup.zoom", null), mm(U.view, O.moved), lo(U), O.event(U).end();
    }
  }
  function D(S, ...A) {
    if (e.apply(this, arguments)) {
      var j = this.__zoom, O = xt(S.changedTouches ? S.changedTouches[0] : S, this), E = j.invert(O), _ = j.k * (S.shiftKey ? 0.5 : 2), M = n(v(m(j, _), O, E), t.apply(this, A), s);
      lo(S), l > 0 ? lt(this).transition().duration(l).call(C, M, O, S) : lt(this).call(h.transform, M, O, S);
    }
  }
  function F(S, ...A) {
    if (e.apply(this, arguments)) {
      var j = S.touches, O = j.length, E = z(this, A, S.changedTouches.length === O).event(S), _, M, R, L;
      for (bl(S), M = 0; M < O; ++M)
        R = j[M], L = xt(R, this), L = [L, this.__zoom.invert(L), R.identifier], E.touch0 ? !E.touch1 && E.touch0[2] !== L[2] && (E.touch1 = L, E.taps = 0) : (E.touch0 = L, _ = !0, E.taps = 1 + !!c);
      c && (c = clearTimeout(c)), _ && (E.taps < 2 && (f = L[0], c = setTimeout(function() {
        c = null;
      }, p)), Zi(this), E.start());
    }
  }
  function b(S, ...A) {
    if (this.__zooming) {
      var j = z(this, A).event(S), O = S.changedTouches, E = O.length, _, M, R, L;
      for (lo(S), _ = 0; _ < E; ++_)
        M = O[_], R = xt(M, this), j.touch0 && j.touch0[2] === M.identifier ? j.touch0[0] = R : j.touch1 && j.touch1[2] === M.identifier && (j.touch1[0] = R);
      if (M = j.that.__zoom, j.touch1) {
        var B = j.touch0[0], U = j.touch0[1], W = j.touch1[0], q = j.touch1[1], Q = (Q = W[0] - B[0]) * Q + (Q = W[1] - B[1]) * Q, te = (te = q[0] - U[0]) * te + (te = q[1] - U[1]) * te;
        M = m(M, Math.sqrt(Q / te)), R = [(B[0] + W[0]) / 2, (B[1] + W[1]) / 2], L = [(U[0] + q[0]) / 2, (U[1] + q[1]) / 2];
      } else if (j.touch0) R = j.touch0[0], L = j.touch0[1];
      else return;
      j.zoom("touch", n(v(M, R, L), j.extent, s));
    }
  }
  function H(S, ...A) {
    if (this.__zooming) {
      var j = z(this, A).event(S), O = S.changedTouches, E = O.length, _, M;
      for (bl(S), d && clearTimeout(d), d = setTimeout(function() {
        d = null;
      }, p), _ = 0; _ < E; ++_)
        M = O[_], j.touch0 && j.touch0[2] === M.identifier ? delete j.touch0 : j.touch1 && j.touch1[2] === M.identifier && delete j.touch1;
      if (j.touch1 && !j.touch0 && (j.touch0 = j.touch1, delete j.touch1), j.touch0) j.touch0[1] = this.__zoom.invert(j.touch0[0]);
      else if (j.end(), j.taps === 2 && (M = xt(M, this), Math.hypot(f[0] - M[0], f[1] - M[1]) < k)) {
        var R = lt(this).on("dblclick.zoom");
        R && R.apply(this, arguments);
      }
    }
  }
  return h.wheelDelta = function(S) {
    return arguments.length ? (r = typeof S == "function" ? S : $i(+S), h) : r;
  }, h.filter = function(S) {
    return arguments.length ? (e = typeof S == "function" ? S : $i(!!S), h) : e;
  }, h.touchable = function(S) {
    return arguments.length ? (o = typeof S == "function" ? S : $i(!!S), h) : o;
  }, h.extent = function(S) {
    return arguments.length ? (t = typeof S == "function" ? S : $i([[+S[0][0], +S[0][1]], [+S[1][0], +S[1][1]]]), h) : t;
  }, h.scaleExtent = function(S) {
    return arguments.length ? (i[0] = +S[0], i[1] = +S[1], h) : [i[0], i[1]];
  }, h.translateExtent = function(S) {
    return arguments.length ? (s[0][0] = +S[0][0], s[1][0] = +S[1][0], s[0][1] = +S[0][1], s[1][1] = +S[1][1], h) : [[s[0][0], s[0][1]], [s[1][0], s[1][1]]];
  }, h.constrain = function(S) {
    return arguments.length ? (n = S, h) : n;
  }, h.duration = function(S) {
    return arguments.length ? (l = +S, h) : l;
  }, h.interpolate = function(S) {
    return arguments.length ? (a = S, h) : a;
  }, h.on = function() {
    var S = u.on.apply(u, arguments);
    return S === u ? h : S;
  }, h.clickDistance = function(S) {
    return arguments.length ? (y = (S = +S) * S, h) : Math.sqrt(y);
  }, h.tapDistance = function(S) {
    return arguments.length ? (k = +S, h) : k;
  }, h;
}
const el = N.createContext(null), R_ = el.Provider, Gt = {
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
}, Mm = Gt.error001();
function se(e, t) {
  const n = N.useContext(el);
  if (n === null)
    throw new Error(Mm);
  return tm(n, e, t);
}
const Ee = () => {
  const e = N.useContext(el);
  if (e === null)
    throw new Error(Mm);
  return N.useMemo(() => ({
    getState: e.getState,
    setState: e.setState,
    subscribe: e.subscribe,
    destroy: e.destroy
  }), [e]);
}, I_ = (e) => e.userSelectionActive ? "none" : "all";
function lc({ position: e, children: t, className: n, style: r, ...o }) {
  const i = se(I_), s = `${e}`.split("-");
  return I.createElement("div", { className: $e(["react-flow__panel", n, ...s]), style: { ...r, pointerEvents: i }, ...o }, t);
}
function D_({ proOptions: e, position: t = "bottom-right" }) {
  return e != null && e.hideAttribution ? null : I.createElement(
    lc,
    { position: t, className: "react-flow__attribution", "data-message": "Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/pro" },
    I.createElement("a", { href: "https://reactflow.dev", target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution" }, "React Flow")
  );
}
const L_ = ({ x: e, y: t, label: n, labelStyle: r = {}, labelShowBg: o = !0, labelBgStyle: i = {}, labelBgPadding: s = [2, 4], labelBgBorderRadius: l = 2, children: a, className: u, ...c }) => {
  const f = N.useRef(null), [d, p] = N.useState({ x: 0, y: 0, width: 0, height: 0 }), w = $e(["react-flow__edge-textwrapper", u]);
  return N.useEffect(() => {
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
    { transform: `translate(${e - d.width / 2} ${t - d.height / 2})`, className: w, visibility: d.width ? "visible" : "hidden", ...c },
    o && I.createElement("rect", { width: d.width + 2 * s[0], x: -s[0], y: -s[1], height: d.height + 2 * s[1], className: "react-flow__edge-textbg", style: i, rx: l, ry: l }),
    I.createElement("text", { className: "react-flow__edge-text", y: d.height / 2, dy: "0.3em", ref: f, style: r }, n),
    a
  );
};
var O_ = N.memo(L_);
const ac = (e) => ({
  width: e.offsetWidth,
  height: e.offsetHeight
}), Vr = (e, t = 0, n = 1) => Math.min(Math.max(e, t), n), uc = (e = { x: 0, y: 0 }, t) => ({
  x: Vr(e.x, t[0][0], t[1][0]),
  y: Vr(e.y, t[0][1], t[1][1])
}), od = (e, t, n) => e < t ? Vr(Math.abs(e - t), 1, 50) / 50 : e > n ? -Vr(Math.abs(e - n), 1, 50) / 50 : 0, Tm = (e, t) => {
  const n = od(e.x, 35, t.width - 35) * 20, r = od(e.y, 35, t.height - 35) * 20;
  return [n, r];
}, $m = (e) => {
  var t;
  return ((t = e.getRootNode) == null ? void 0 : t.call(e)) || (window == null ? void 0 : window.document);
}, Am = (e, t) => ({
  x: Math.min(e.x, t.x),
  y: Math.min(e.y, t.y),
  x2: Math.max(e.x2, t.x2),
  y2: Math.max(e.y2, t.y2)
}), Qo = ({ x: e, y: t, width: n, height: r }) => ({
  x: e,
  y: t,
  x2: e + n,
  y2: t + r
}), Rm = ({ x: e, y: t, x2: n, y2: r }) => ({
  x: e,
  y: t,
  width: n - e,
  height: r - t
}), id = (e) => ({
  ...e.positionAbsolute || { x: 0, y: 0 },
  width: e.width || 0,
  height: e.height || 0
}), b_ = (e, t) => Rm(Am(Qo(e), Qo(t))), qa = (e, t) => {
  const n = Math.max(0, Math.min(e.x + e.width, t.x + t.width) - Math.max(e.x, t.x)), r = Math.max(0, Math.min(e.y + e.height, t.y + t.height) - Math.max(e.y, t.y));
  return Math.ceil(n * r);
}, F_ = (e) => ut(e.width) && ut(e.height) && ut(e.x) && ut(e.y), ut = (e) => !isNaN(e) && isFinite(e), me = Symbol.for("internals"), Im = ["Enter", " ", "Escape"], H_ = (e, t) => {
}, V_ = (e) => "nativeEvent" in e;
function Ka(e) {
  var o, i;
  const t = V_(e) ? e.nativeEvent : e, n = ((i = (o = t.composedPath) == null ? void 0 : o.call(t)) == null ? void 0 : i[0]) || e.target;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(n == null ? void 0 : n.nodeName) || (n == null ? void 0 : n.hasAttribute("contenteditable")) || !!(n != null && n.closest(".nokey"));
}
const Dm = (e) => "clientX" in e, xn = (e, t) => {
  var i, s;
  const n = Dm(e), r = n ? e.clientX : (i = e.touches) == null ? void 0 : i[0].clientX, o = n ? e.clientY : (s = e.touches) == null ? void 0 : s[0].clientY;
  return {
    x: r - ((t == null ? void 0 : t.left) ?? 0),
    y: o - ((t == null ? void 0 : t.top) ?? 0)
  };
}, js = () => {
  var e;
  return typeof navigator < "u" && ((e = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : e.indexOf("Mac")) >= 0;
}, Xr = ({ id: e, path: t, labelX: n, labelY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p = 20 }) => I.createElement(
  I.Fragment,
  null,
  I.createElement("path", { id: e, style: c, d: t, fill: "none", className: "react-flow__edge-path", markerEnd: f, markerStart: d }),
  p && I.createElement("path", { d: t, fill: "none", strokeOpacity: 0, strokeWidth: p, className: "react-flow__edge-interaction" }),
  o && ut(n) && ut(r) ? I.createElement(O_, { x: n, y: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u }) : null
);
Xr.displayName = "BaseEdge";
function ao(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().edges.find((i) => i.id === e);
    o && n(r, { ...o });
  };
}
function Lm({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const o = Math.abs(n - e) / 2, i = n < e ? n + o : n - o, s = Math.abs(r - t) / 2, l = r < t ? r + s : r - s;
  return [i, l, o, s];
}
function Om({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourceControlX: o, sourceControlY: i, targetControlX: s, targetControlY: l }) {
  const a = e * 0.125 + o * 0.375 + s * 0.375 + n * 0.125, u = t * 0.125 + i * 0.375 + l * 0.375 + r * 0.125, c = Math.abs(a - e), f = Math.abs(u - t);
  return [a, u, c, f];
}
var Gn;
(function(e) {
  e.Strict = "strict", e.Loose = "loose";
})(Gn || (Gn = {}));
var bn;
(function(e) {
  e.Free = "free", e.Vertical = "vertical", e.Horizontal = "horizontal";
})(bn || (bn = {}));
var Zo;
(function(e) {
  e.Partial = "partial", e.Full = "full";
})(Zo || (Zo = {}));
var an;
(function(e) {
  e.Bezier = "default", e.Straight = "straight", e.Step = "step", e.SmoothStep = "smoothstep", e.SimpleBezier = "simplebezier";
})(an || (an = {}));
var Jo;
(function(e) {
  e.Arrow = "arrow", e.ArrowClosed = "arrowclosed";
})(Jo || (Jo = {}));
var K;
(function(e) {
  e.Left = "left", e.Top = "top", e.Right = "right", e.Bottom = "bottom";
})(K || (K = {}));
function sd({ pos: e, x1: t, y1: n, x2: r, y2: o }) {
  return e === K.Left || e === K.Right ? [0.5 * (t + r), n] : [t, 0.5 * (n + o)];
}
function bm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top }) {
  const [s, l] = sd({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o
  }), [a, u] = sd({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t
  }), [c, f, d, p] = Om({
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
const cc = N.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: w, interactionWidth: y }) => {
  const [k, h, m] = bm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i
  });
  return I.createElement(Xr, { path: k, labelX: h, labelY: m, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: w, interactionWidth: y });
});
cc.displayName = "SimpleBezierEdge";
const ld = {
  [K.Left]: { x: -1, y: 0 },
  [K.Right]: { x: 1, y: 0 },
  [K.Top]: { x: 0, y: -1 },
  [K.Bottom]: { x: 0, y: 1 }
}, B_ = ({ source: e, sourcePosition: t = K.Bottom, target: n }) => t === K.Left || t === K.Right ? e.x < n.x ? { x: 1, y: 0 } : { x: -1, y: 0 } : e.y < n.y ? { x: 0, y: 1 } : { x: 0, y: -1 }, ad = (e, t) => Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
function U_({ source: e, sourcePosition: t = K.Bottom, target: n, targetPosition: r = K.Top, center: o, offset: i }) {
  const s = ld[t], l = ld[r], a = { x: e.x + s.x * i, y: e.y + s.y * i }, u = { x: n.x + l.x * i, y: n.y + l.y * i }, c = B_({
    source: a,
    sourcePosition: t,
    target: u
  }), f = c.x !== 0 ? "x" : "y", d = c[f];
  let p = [], w, y;
  const k = { x: 0, y: 0 }, h = { x: 0, y: 0 }, [m, v, x, C] = Lm({
    sourceX: e.x,
    sourceY: e.y,
    targetX: n.x,
    targetY: n.y
  });
  if (s[f] * l[f] === -1) {
    w = o.x ?? m, y = o.y ?? v;
    const T = [
      { x: w, y: a.y },
      { x: w, y: u.y }
    ], P = [
      { x: a.x, y },
      { x: u.x, y }
    ];
    s[f] === d ? p = f === "x" ? T : P : p = f === "x" ? P : T;
  } else {
    const T = [{ x: a.x, y: u.y }], P = [{ x: u.x, y: a.y }];
    if (f === "x" ? p = s.x === d ? P : T : p = s.y === d ? T : P, t === r) {
      const H = Math.abs(e[f] - n[f]);
      if (H <= i) {
        const S = Math.min(i - 1, i - H);
        s[f] === d ? k[f] = (a[f] > e[f] ? -1 : 1) * S : h[f] = (u[f] > n[f] ? -1 : 1) * S;
      }
    }
    if (t !== r) {
      const H = f === "x" ? "y" : "x", S = s[f] === l[H], A = a[H] > u[H], j = a[H] < u[H];
      (s[f] === 1 && (!S && A || S && j) || s[f] !== 1 && (!S && j || S && A)) && (p = f === "x" ? T : P);
    }
    const $ = { x: a.x + k.x, y: a.y + k.y }, D = { x: u.x + h.x, y: u.y + h.y }, F = Math.max(Math.abs($.x - p[0].x), Math.abs(D.x - p[0].x)), b = Math.max(Math.abs($.y - p[0].y), Math.abs(D.y - p[0].y));
    F >= b ? (w = ($.x + D.x) / 2, y = p[0].y) : (w = p[0].x, y = ($.y + D.y) / 2);
  }
  return [[
    e,
    { x: a.x + k.x, y: a.y + k.y },
    ...p,
    { x: u.x + h.x, y: u.y + h.y },
    n
  ], w, y, x, C];
}
function W_(e, t, n, r) {
  const o = Math.min(ad(e, t) / 2, ad(t, n) / 2, r), { x: i, y: s } = t;
  if (e.x === i && i === n.x || e.y === s && s === n.y)
    return `L${i} ${s}`;
  if (e.y === s) {
    const u = e.x < n.x ? -1 : 1, c = e.y < n.y ? 1 : -1;
    return `L ${i + o * u},${s}Q ${i},${s} ${i},${s + o * c}`;
  }
  const l = e.x < n.x ? 1 : -1, a = e.y < n.y ? -1 : 1;
  return `L ${i},${s + o * a}Q ${i},${s} ${i + o * l},${s}`;
}
function Ga({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, borderRadius: s = 5, centerX: l, centerY: a, offset: u = 20 }) {
  const [c, f, d, p, w] = U_({
    source: { x: e, y: t },
    sourcePosition: n,
    target: { x: r, y: o },
    targetPosition: i,
    center: { x: l, y: a },
    offset: u
  });
  return [c.reduce((k, h, m) => {
    let v = "";
    return m > 0 && m < c.length - 1 ? v = W_(c[m - 1], h, c[m + 1], s) : v = `${m === 0 ? "M" : "L"}${h.x} ${h.y}`, k += v, k;
  }, ""), f, d, p, w];
}
const tl = N.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, sourcePosition: f = K.Bottom, targetPosition: d = K.Top, markerEnd: p, markerStart: w, pathOptions: y, interactionWidth: k }) => {
  const [h, m, v] = Ga({
    sourceX: e,
    sourceY: t,
    sourcePosition: f,
    targetX: n,
    targetY: r,
    targetPosition: d,
    borderRadius: y == null ? void 0 : y.borderRadius,
    offset: y == null ? void 0 : y.offset
  });
  return I.createElement(Xr, { path: h, labelX: m, labelY: v, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: p, markerStart: w, interactionWidth: k });
});
tl.displayName = "SmoothStepEdge";
const fc = N.memo((e) => {
  var t;
  return I.createElement(tl, { ...e, pathOptions: N.useMemo(() => {
    var n;
    return { borderRadius: 0, offset: (n = e.pathOptions) == null ? void 0 : n.offset };
  }, [(t = e.pathOptions) == null ? void 0 : t.offset]) });
});
fc.displayName = "StepEdge";
function Y_({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const [o, i, s, l] = Lm({
    sourceX: e,
    sourceY: t,
    targetX: n,
    targetY: r
  });
  return [`M ${e},${t}L ${n},${r}`, o, i, s, l];
}
const dc = N.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p }) => {
  const [w, y, k] = Y_({ sourceX: e, sourceY: t, targetX: n, targetY: r });
  return I.createElement(Xr, { path: w, labelX: y, labelY: k, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: a, labelBgBorderRadius: u, style: c, markerEnd: f, markerStart: d, interactionWidth: p });
});
dc.displayName = "StraightEdge";
function Ai(e, t) {
  return e >= 0 ? 0.5 * e : t * 25 * Math.sqrt(-e);
}
function ud({ pos: e, x1: t, y1: n, x2: r, y2: o, c: i }) {
  switch (e) {
    case K.Left:
      return [t - Ai(t - r, i), n];
    case K.Right:
      return [t + Ai(r - t, i), n];
    case K.Top:
      return [t, n - Ai(n - o, i)];
    case K.Bottom:
      return [t, n + Ai(o - n, i)];
  }
}
function pc({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, curvature: s = 0.25 }) {
  const [l, a] = ud({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o,
    c: s
  }), [u, c] = ud({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t,
    c: s
  }), [f, d, p, w] = Om({
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
    w
  ];
}
const Ms = N.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: w, pathOptions: y, interactionWidth: k }) => {
  const [h, m, v] = pc({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i,
    curvature: y == null ? void 0 : y.curvature
  });
  return I.createElement(Xr, { path: h, labelX: m, labelY: v, label: s, labelStyle: l, labelShowBg: a, labelBgStyle: u, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: p, markerStart: w, interactionWidth: k });
});
Ms.displayName = "BezierEdge";
const hc = N.createContext(null), X_ = hc.Provider;
hc.Consumer;
const q_ = () => N.useContext(hc), K_ = (e) => "id" in e && "source" in e && "target" in e, G_ = ({ source: e, sourceHandle: t, target: n, targetHandle: r }) => `reactflow__edge-${e}${t || ""}-${n}${r || ""}`, Qa = (e, t) => typeof e > "u" ? "" : typeof e == "string" ? e : `${t ? `${t}__` : ""}${Object.keys(e).sort().map((r) => `${r}=${e[r]}`).join("&")}`, Q_ = (e, t) => t.some((n) => n.source === e.source && n.target === e.target && (n.sourceHandle === e.sourceHandle || !n.sourceHandle && !e.sourceHandle) && (n.targetHandle === e.targetHandle || !n.targetHandle && !e.targetHandle)), Z_ = (e, t) => {
  if (!e.source || !e.target)
    return t;
  let n;
  return K_(e) ? n = { ...e } : n = {
    ...e,
    id: G_(e)
  }, Q_(n, t) ? t : t.concat(n);
}, Za = ({ x: e, y: t }, [n, r, o], i, [s, l]) => {
  const a = {
    x: (e - n) / o,
    y: (t - r) / o
  };
  return i ? {
    x: s * Math.round(a.x / s),
    y: l * Math.round(a.y / l)
  } : a;
}, Fm = ({ x: e, y: t }, [n, r, o]) => ({
  x: e * o + n,
  y: t * o + r
}), Bn = (e, t = [0, 0]) => {
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
}, nl = (e, t = [0, 0]) => {
  if (e.length === 0)
    return { x: 0, y: 0, width: 0, height: 0 };
  const n = e.reduce((r, o) => {
    const { x: i, y: s } = Bn(o, t).positionAbsolute;
    return Am(r, Qo({
      x: i,
      y: s,
      width: o.width || 0,
      height: o.height || 0
    }));
  }, { x: 1 / 0, y: 1 / 0, x2: -1 / 0, y2: -1 / 0 });
  return Rm(n);
}, Hm = (e, t, [n, r, o] = [0, 0, 1], i = !1, s = !1, l = [0, 0]) => {
  const a = {
    x: (t.x - n) / o,
    y: (t.y - r) / o,
    width: t.width / o,
    height: t.height / o
  }, u = [];
  return e.forEach((c) => {
    const { width: f, height: d, selectable: p = !0, hidden: w = !1 } = c;
    if (s && !p || w)
      return !1;
    const { positionAbsolute: y } = Bn(c, l), k = {
      x: y.x,
      y: y.y,
      width: f || 0,
      height: d || 0
    }, h = qa(a, k), m = typeof f > "u" || typeof d > "u" || f === null || d === null, v = i && h > 0, x = (f || 0) * (d || 0);
    (m || v || h >= x || c.dragging) && u.push(c);
  }), u;
}, Vm = (e, t) => {
  const n = e.map((r) => r.id);
  return t.filter((r) => n.includes(r.source) || n.includes(r.target));
}, Bm = (e, t, n, r, o, i = 0.1) => {
  const s = t / (e.width * (1 + i)), l = n / (e.height * (1 + i)), a = Math.min(s, l), u = Vr(a, r, o), c = e.x + e.width / 2, f = e.y + e.height / 2, d = t / 2 - c * u, p = n / 2 - f * u;
  return { x: d, y: p, zoom: u };
}, Rn = (e, t = 0) => e.transition().duration(t);
function cd(e, t, n, r) {
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
function J_(e, t, n, r, o, i) {
  const { x: s, y: l } = xn(e), u = t.elementsFromPoint(s, l).find((w) => w.classList.contains("react-flow__handle"));
  if (u) {
    const w = u.getAttribute("data-nodeid");
    if (w) {
      const y = mc(void 0, u), k = u.getAttribute("data-handleid"), h = i({ nodeId: w, id: k, type: y });
      if (h) {
        const m = o.find((v) => v.nodeId === w && v.type === y && v.id === k);
        return {
          handle: {
            id: k,
            type: y,
            nodeId: w,
            x: (m == null ? void 0 : m.x) || n.x,
            y: (m == null ? void 0 : m.y) || n.y
          },
          validHandleResult: h
        };
      }
    }
  }
  let c = [], f = 1 / 0;
  if (o.forEach((w) => {
    const y = Math.sqrt((w.x - n.x) ** 2 + (w.y - n.y) ** 2);
    if (y <= r) {
      const k = i(w);
      y <= f && (y < f ? c = [{ handle: w, validHandleResult: k }] : y === f && c.push({
        handle: w,
        validHandleResult: k
      }), f = y);
    }
  }), !c.length)
    return { handle: null, validHandleResult: Um() };
  if (c.length === 1)
    return c[0];
  const d = c.some(({ validHandleResult: w }) => w.isValid), p = c.some(({ handle: w }) => w.type === "target");
  return c.find(({ handle: w, validHandleResult: y }) => p ? w.type === "target" : d ? y.isValid : !0) || c[0];
}
const ek = { source: null, target: null, sourceHandle: null, targetHandle: null }, Um = () => ({
  handleDomNode: null,
  isValid: !1,
  connection: ek,
  endHandle: null
});
function Wm(e, t, n, r, o, i, s) {
  const l = o === "target", a = s.querySelector(`.react-flow__handle[data-id="${e == null ? void 0 : e.nodeId}-${e == null ? void 0 : e.id}-${e == null ? void 0 : e.type}"]`), u = {
    ...Um(),
    handleDomNode: a
  };
  if (a) {
    const c = mc(void 0, a), f = a.getAttribute("data-nodeid"), d = a.getAttribute("data-handleid"), p = a.classList.contains("connectable"), w = a.classList.contains("connectableend"), y = {
      source: l ? f : n,
      sourceHandle: l ? d : r,
      target: l ? n : f,
      targetHandle: l ? r : d
    };
    u.connection = y, p && w && (t === Gn.Strict ? l && c === "source" || !l && c === "target" : f !== n || d !== r) && (u.endHandle = {
      nodeId: f,
      handleId: d,
      type: c
    }, u.isValid = i(y));
  }
  return u;
}
function tk({ nodes: e, nodeId: t, handleId: n, handleType: r }) {
  return e.reduce((o, i) => {
    if (i[me]) {
      const { handleBounds: s } = i[me];
      let l = [], a = [];
      s && (l = cd(i, s, "source", `${t}-${n}-${r}`), a = cd(i, s, "target", `${t}-${n}-${r}`)), o.push(...l, ...a);
    }
    return o;
  }, []);
}
function mc(e, t) {
  return e || (t != null && t.classList.contains("target") ? "target" : t != null && t.classList.contains("source") ? "source" : null);
}
function Fl(e) {
  e == null || e.classList.remove("valid", "connecting", "react-flow__handle-valid", "react-flow__handle-connecting");
}
function nk(e, t) {
  let n = null;
  return t ? n = "valid" : e && !t && (n = "invalid"), n;
}
function Ym({ event: e, handleId: t, nodeId: n, onConnect: r, isTarget: o, getState: i, setState: s, isValidConnection: l, edgeUpdaterType: a, onReconnectEnd: u }) {
  const c = $m(e.target), { connectionMode: f, domNode: d, autoPanOnConnect: p, connectionRadius: w, onConnectStart: y, panBy: k, getNodes: h, cancelConnection: m } = i();
  let v = 0, x;
  const { x: C, y: z } = xn(e), T = c == null ? void 0 : c.elementFromPoint(C, z), P = mc(a, T), $ = d == null ? void 0 : d.getBoundingClientRect();
  if (!$ || !P)
    return;
  let D, F = xn(e, $), b = !1, H = null, S = !1, A = null;
  const j = tk({
    nodes: h(),
    nodeId: n,
    handleId: t,
    handleType: P
  }), O = () => {
    if (!p)
      return;
    const [M, R] = Tm(F, $);
    k({ x: M, y: R }), v = requestAnimationFrame(O);
  };
  s({
    connectionPosition: F,
    connectionStatus: null,
    // connectionNodeId etc will be removed in the next major in favor of connectionStartHandle
    connectionNodeId: n,
    connectionHandleId: t,
    connectionHandleType: P,
    connectionStartHandle: {
      nodeId: n,
      handleId: t,
      type: P
    },
    connectionEndHandle: null
  }), y == null || y(e, { nodeId: n, handleId: t, handleType: P });
  function E(M) {
    const { transform: R } = i();
    F = xn(M, $);
    const { handle: L, validHandleResult: B } = J_(M, c, Za(F, R, !1, [1, 1]), w, j, (U) => Wm(U, f, n, t, o ? "target" : "source", l, c));
    if (x = L, b || (O(), b = !0), A = B.handleDomNode, H = B.connection, S = B.isValid, s({
      connectionPosition: x && S ? Fm({
        x: x.x,
        y: x.y
      }, R) : F,
      connectionStatus: nk(!!x, S),
      connectionEndHandle: B.endHandle
    }), !x && !S && !A)
      return Fl(D);
    H.source !== H.target && A && (Fl(D), D = A, A.classList.add("connecting", "react-flow__handle-connecting"), A.classList.toggle("valid", S), A.classList.toggle("react-flow__handle-valid", S));
  }
  function _(M) {
    var R, L;
    (x || A) && H && S && (r == null || r(H)), (L = (R = i()).onConnectEnd) == null || L.call(R, M), a && (u == null || u(M)), Fl(D), m(), cancelAnimationFrame(v), b = !1, S = !1, H = null, A = null, c.removeEventListener("mousemove", E), c.removeEventListener("mouseup", _), c.removeEventListener("touchmove", E), c.removeEventListener("touchend", _);
  }
  c.addEventListener("mousemove", E), c.addEventListener("mouseup", _), c.addEventListener("touchmove", E), c.addEventListener("touchend", _);
}
const fd = () => !0, rk = (e) => ({
  connectionStartHandle: e.connectionStartHandle,
  connectOnClick: e.connectOnClick,
  noPanClassName: e.noPanClassName
}), ok = (e, t, n) => (r) => {
  const { connectionStartHandle: o, connectionEndHandle: i, connectionClickStartHandle: s } = r;
  return {
    connecting: (o == null ? void 0 : o.nodeId) === e && (o == null ? void 0 : o.handleId) === t && (o == null ? void 0 : o.type) === n || (i == null ? void 0 : i.nodeId) === e && (i == null ? void 0 : i.handleId) === t && (i == null ? void 0 : i.type) === n,
    clickConnecting: (s == null ? void 0 : s.nodeId) === e && (s == null ? void 0 : s.handleId) === t && (s == null ? void 0 : s.type) === n
  };
}, Xm = N.forwardRef(({ type: e = "source", position: t = K.Top, isValidConnection: n, isConnectable: r = !0, isConnectableStart: o = !0, isConnectableEnd: i = !0, id: s, onConnect: l, children: a, className: u, onMouseDown: c, onTouchStart: f, ...d }, p) => {
  var $, D;
  const w = s || null, y = e === "target", k = Ee(), h = q_(), { connectOnClick: m, noPanClassName: v } = se(rk, Pe), { connecting: x, clickConnecting: C } = se(ok(h, w, e), Pe);
  h || (D = ($ = k.getState()).onError) == null || D.call($, "010", Gt.error010());
  const z = (F) => {
    const { defaultEdgeOptions: b, onConnect: H, hasDefaultEdges: S } = k.getState(), A = {
      ...b,
      ...F
    };
    if (S) {
      const { edges: j, setEdges: O } = k.getState();
      O(Z_(A, j));
    }
    H == null || H(A), l == null || l(A);
  }, T = (F) => {
    if (!h)
      return;
    const b = Dm(F);
    o && (b && F.button === 0 || !b) && Ym({
      event: F,
      handleId: w,
      nodeId: h,
      onConnect: z,
      isTarget: y,
      getState: k.getState,
      setState: k.setState,
      isValidConnection: n || k.getState().isValidConnection || fd
    }), b ? c == null || c(F) : f == null || f(F);
  }, P = (F) => {
    const { onClickConnectStart: b, onClickConnectEnd: H, connectionClickStartHandle: S, connectionMode: A, isValidConnection: j } = k.getState();
    if (!h || !S && !o)
      return;
    if (!S) {
      b == null || b(F, { nodeId: h, handleId: w, handleType: e }), k.setState({ connectionClickStartHandle: { nodeId: h, type: e, handleId: w } });
      return;
    }
    const O = $m(F.target), E = n || j || fd, { connection: _, isValid: M } = Wm({
      nodeId: h,
      id: w,
      type: e
    }, A, S.nodeId, S.handleId || null, S.type, E, O);
    M && z(_), H == null || H(F), k.setState({ connectionClickStartHandle: null });
  };
  return I.createElement("div", { "data-handleid": w, "data-nodeid": h, "data-handlepos": t, "data-id": `${h}-${w}-${e}`, className: $e([
    "react-flow__handle",
    `react-flow__handle-${t}`,
    "nodrag",
    v,
    u,
    {
      source: !y,
      target: y,
      connectable: r,
      connectablestart: o,
      connectableend: i,
      connecting: C,
      // this class is used to style the handle when the user is connecting
      connectionindicator: r && (o && !x || i && x)
    }
  ]), onMouseDown: T, onTouchStart: T, onClick: m ? P : void 0, ref: p, ...d }, a);
});
Xm.displayName = "Handle";
var Br = N.memo(Xm);
const qm = ({ data: e, isConnectable: t, targetPosition: n = K.Top, sourcePosition: r = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Br, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label,
  I.createElement(Br, { type: "source", position: r, isConnectable: t })
);
qm.displayName = "DefaultNode";
var Ja = N.memo(qm);
const Km = ({ data: e, isConnectable: t, sourcePosition: n = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  e == null ? void 0 : e.label,
  I.createElement(Br, { type: "source", position: n, isConnectable: t })
);
Km.displayName = "InputNode";
var Gm = N.memo(Km);
const Qm = ({ data: e, isConnectable: t, targetPosition: n = K.Top }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Br, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label
);
Qm.displayName = "OutputNode";
var Zm = N.memo(Qm);
const gc = () => null;
gc.displayName = "GroupNode";
const ik = (e) => ({
  selectedNodes: e.getNodes().filter((t) => t.selected),
  selectedEdges: e.edges.filter((t) => t.selected).map((t) => ({ ...t }))
}), Ri = (e) => e.id;
function sk(e, t) {
  return Pe(e.selectedNodes.map(Ri), t.selectedNodes.map(Ri)) && Pe(e.selectedEdges.map(Ri), t.selectedEdges.map(Ri));
}
const Jm = N.memo(({ onSelectionChange: e }) => {
  const t = Ee(), { selectedNodes: n, selectedEdges: r } = se(ik, sk);
  return N.useEffect(() => {
    const o = { nodes: n, edges: r };
    e == null || e(o), t.getState().onSelectionChange.forEach((i) => i(o));
  }, [n, r, e]), null;
});
Jm.displayName = "SelectionListener";
const lk = (e) => !!e.onSelectionChange;
function ak({ onSelectionChange: e }) {
  const t = se(lk);
  return e || t ? I.createElement(Jm, { onSelectionChange: e }) : null;
}
const uk = (e) => ({
  setNodes: e.setNodes,
  setEdges: e.setEdges,
  setDefaultNodesAndEdges: e.setDefaultNodesAndEdges,
  setMinZoom: e.setMinZoom,
  setMaxZoom: e.setMaxZoom,
  setTranslateExtent: e.setTranslateExtent,
  setNodeExtent: e.setNodeExtent,
  reset: e.reset
});
function ir(e, t) {
  N.useEffect(() => {
    typeof e < "u" && t(e);
  }, [e]);
}
function J(e, t, n) {
  N.useEffect(() => {
    typeof t < "u" && n({ [e]: t });
  }, [t]);
}
const ck = ({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: o, onConnectStart: i, onConnectEnd: s, onClickConnectStart: l, onClickConnectEnd: a, nodesDraggable: u, nodesConnectable: c, nodesFocusable: f, edgesFocusable: d, edgesUpdatable: p, elevateNodesOnSelect: w, minZoom: y, maxZoom: k, nodeExtent: h, onNodesChange: m, onEdgesChange: v, elementsSelectable: x, connectionMode: C, snapGrid: z, snapToGrid: T, translateExtent: P, connectOnClick: $, defaultEdgeOptions: D, fitView: F, fitViewOptions: b, onNodesDelete: H, onEdgesDelete: S, onNodeDrag: A, onNodeDragStart: j, onNodeDragStop: O, onSelectionDrag: E, onSelectionDragStart: _, onSelectionDragStop: M, noPanClassName: R, nodeOrigin: L, rfId: B, autoPanOnConnect: U, autoPanOnNodeDrag: W, onError: q, connectionRadius: Q, isValidConnection: te, nodeDragThreshold: Z }) => {
  const { setNodes: ne, setEdges: ze, setDefaultNodesAndEdges: we, setMinZoom: be, setMaxZoom: Ae, setTranslateExtent: ge, setNodeExtent: Qe, reset: ie } = se(uk, Pe), G = Ee();
  return N.useEffect(() => {
    const Fe = r == null ? void 0 : r.map((Rt) => ({ ...Rt, ...D }));
    return we(n, Fe), () => {
      ie();
    };
  }, []), J("defaultEdgeOptions", D, G.setState), J("connectionMode", C, G.setState), J("onConnect", o, G.setState), J("onConnectStart", i, G.setState), J("onConnectEnd", s, G.setState), J("onClickConnectStart", l, G.setState), J("onClickConnectEnd", a, G.setState), J("nodesDraggable", u, G.setState), J("nodesConnectable", c, G.setState), J("nodesFocusable", f, G.setState), J("edgesFocusable", d, G.setState), J("edgesUpdatable", p, G.setState), J("elementsSelectable", x, G.setState), J("elevateNodesOnSelect", w, G.setState), J("snapToGrid", T, G.setState), J("snapGrid", z, G.setState), J("onNodesChange", m, G.setState), J("onEdgesChange", v, G.setState), J("connectOnClick", $, G.setState), J("fitViewOnInit", F, G.setState), J("fitViewOnInitOptions", b, G.setState), J("onNodesDelete", H, G.setState), J("onEdgesDelete", S, G.setState), J("onNodeDrag", A, G.setState), J("onNodeDragStart", j, G.setState), J("onNodeDragStop", O, G.setState), J("onSelectionDrag", E, G.setState), J("onSelectionDragStart", _, G.setState), J("onSelectionDragStop", M, G.setState), J("noPanClassName", R, G.setState), J("nodeOrigin", L, G.setState), J("rfId", B, G.setState), J("autoPanOnConnect", U, G.setState), J("autoPanOnNodeDrag", W, G.setState), J("onError", q, G.setState), J("connectionRadius", Q, G.setState), J("isValidConnection", te, G.setState), J("nodeDragThreshold", Z, G.setState), ir(e, ne), ir(t, ze), ir(y, be), ir(k, Ae), ir(P, ge), ir(h, Qe), null;
}, dd = { display: "none" }, fk = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0px, 0px, 0px, 0px)",
  clipPath: "inset(100%)"
}, eg = "react-flow__node-desc", tg = "react-flow__edge-desc", dk = "react-flow__aria-live", pk = (e) => e.ariaLiveMessage;
function hk({ rfId: e }) {
  const t = se(pk);
  return I.createElement("div", { id: `${dk}-${e}`, "aria-live": "assertive", "aria-atomic": "true", style: fk }, t);
}
function mk({ rfId: e, disableKeyboardA11y: t }) {
  return I.createElement(
    I.Fragment,
    null,
    I.createElement(
      "div",
      { id: `${eg}-${e}`, style: dd },
      "Press enter or space to select a node.",
      !t && "You can then use the arrow keys to move the node around.",
      " Press delete to remove it and escape to cancel.",
      " "
    ),
    I.createElement("div", { id: `${tg}-${e}`, style: dd }, "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel."),
    !t && I.createElement(hk, { rfId: e })
  );
}
var ei = (e = null, t = { actInsideInputWithModifier: !0 }) => {
  const [n, r] = N.useState(!1), o = N.useRef(!1), i = N.useRef(/* @__PURE__ */ new Set([])), [s, l] = N.useMemo(() => {
    if (e !== null) {
      const u = (Array.isArray(e) ? e : [e]).filter((f) => typeof f == "string").map((f) => f.split("+")), c = u.reduce((f, d) => f.concat(...d), []);
      return [u, c];
    }
    return [[], []];
  }, [e]);
  return N.useEffect(() => {
    const a = typeof document < "u" ? document : null, u = (t == null ? void 0 : t.target) || a;
    if (e !== null) {
      const c = (p) => {
        if (o.current = p.ctrlKey || p.metaKey || p.shiftKey, (!o.current || o.current && !t.actInsideInputWithModifier) && Ka(p))
          return !1;
        const y = hd(p.code, l);
        i.current.add(p[y]), pd(s, i.current, !1) && (p.preventDefault(), r(!0));
      }, f = (p) => {
        if ((!o.current || o.current && !t.actInsideInputWithModifier) && Ka(p))
          return !1;
        const y = hd(p.code, l);
        pd(s, i.current, !0) ? (r(!1), i.current.clear()) : i.current.delete(p[y]), p.key === "Meta" && i.current.clear(), o.current = !1;
      }, d = () => {
        i.current.clear(), r(!1);
      };
      return u == null || u.addEventListener("keydown", c), u == null || u.addEventListener("keyup", f), window.addEventListener("blur", d), () => {
        u == null || u.removeEventListener("keydown", c), u == null || u.removeEventListener("keyup", f), window.removeEventListener("blur", d);
      };
    }
  }, [e, r]), n;
};
function pd(e, t, n) {
  return e.filter((r) => n || r.length === t.size).some((r) => r.every((o) => t.has(o)));
}
function hd(e, t) {
  return t.includes(e) ? "code" : "key";
}
function ng(e, t, n, r) {
  var l, a;
  const o = e.parentNode || e.parentId;
  if (!o)
    return n;
  const i = t.get(o), s = Bn(i, r);
  return ng(i, t, {
    x: (n.x ?? 0) + s.x,
    y: (n.y ?? 0) + s.y,
    z: (((l = i[me]) == null ? void 0 : l.z) ?? 0) > (n.z ?? 0) ? ((a = i[me]) == null ? void 0 : a.z) ?? 0 : n.z ?? 0
  }, r);
}
function rg(e, t, n) {
  e.forEach((r) => {
    var i;
    const o = r.parentNode || r.parentId;
    if (o && !e.has(o))
      throw new Error(`Parent node ${o} not found`);
    if (o || n != null && n[r.id]) {
      const { x: s, y: l, z: a } = ng(r, e, {
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
function Hl(e, t, n, r) {
  const o = /* @__PURE__ */ new Map(), i = {}, s = r ? 1e3 : 0;
  return e.forEach((l) => {
    var p;
    const a = (ut(l.zIndex) ? l.zIndex : 0) + (l.selected ? s : 0), u = t.get(l.id), c = {
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
  }), rg(o, n, i), o;
}
function og(e, t = {}) {
  const { getNodes: n, width: r, height: o, minZoom: i, maxZoom: s, d3Zoom: l, d3Selection: a, fitViewOnInitDone: u, fitViewOnInit: c, nodeOrigin: f } = e(), d = t.initial && !u && c;
  if (l && a && (d || !t.initial)) {
    const w = n().filter((k) => {
      var m;
      const h = t.includeHiddenNodes ? k.width && k.height : !k.hidden;
      return (m = t.nodes) != null && m.length ? h && t.nodes.some((v) => v.id === k.id) : h;
    }), y = w.every((k) => k.width && k.height);
    if (w.length > 0 && y) {
      const k = nl(w, f), { x: h, y: m, zoom: v } = Bm(k, r, o, t.minZoom ?? i, t.maxZoom ?? s, t.padding ?? 0.1), x = Ut.translate(h, m).scale(v);
      return typeof t.duration == "number" && t.duration > 0 ? l.transform(Rn(a, t.duration), x) : l.transform(a, x), !0;
    }
  }
  return !1;
}
function gk(e, t) {
  return e.forEach((n) => {
    const r = t.get(n.id);
    r && t.set(r.id, {
      ...r,
      [me]: r[me],
      selected: n.selected
    });
  }), new Map(t);
}
function yk(e, t) {
  return t.map((n) => {
    const r = e.find((o) => o.id === n.id);
    return r && (n.selected = r.selected), n;
  });
}
function Ii({ changedNodes: e, changedEdges: t, get: n, set: r }) {
  const { nodeInternals: o, edges: i, onNodesChange: s, onEdgesChange: l, hasDefaultNodes: a, hasDefaultEdges: u } = n();
  e != null && e.length && (a && r({ nodeInternals: gk(e, o) }), s == null || s(e)), t != null && t.length && (u && r({ edges: yk(t, i) }), l == null || l(t));
}
const sr = () => {
}, vk = {
  zoomIn: sr,
  zoomOut: sr,
  zoomTo: sr,
  getZoom: () => 1,
  setViewport: sr,
  getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  fitView: () => !1,
  setCenter: sr,
  fitBounds: sr,
  project: (e) => e,
  screenToFlowPosition: (e) => e,
  flowToScreenPosition: (e) => e,
  viewportInitialized: !1
}, xk = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection
}), wk = () => {
  const e = Ee(), { d3Zoom: t, d3Selection: n } = se(xk, Pe);
  return N.useMemo(() => n && t ? {
    zoomIn: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1.2),
    zoomOut: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1 / 1.2),
    zoomTo: (o, i) => t.scaleTo(Rn(n, i == null ? void 0 : i.duration), o),
    getZoom: () => e.getState().transform[2],
    setViewport: (o, i) => {
      const [s, l, a] = e.getState().transform, u = Ut.translate(o.x ?? s, o.y ?? l).scale(o.zoom ?? a);
      t.transform(Rn(n, i == null ? void 0 : i.duration), u);
    },
    getViewport: () => {
      const [o, i, s] = e.getState().transform;
      return { x: o, y: i, zoom: s };
    },
    fitView: (o) => og(e.getState, o),
    setCenter: (o, i, s) => {
      const { width: l, height: a, maxZoom: u } = e.getState(), c = typeof (s == null ? void 0 : s.zoom) < "u" ? s.zoom : u, f = l / 2 - o * c, d = a / 2 - i * c, p = Ut.translate(f, d).scale(c);
      t.transform(Rn(n, s == null ? void 0 : s.duration), p);
    },
    fitBounds: (o, i) => {
      const { width: s, height: l, minZoom: a, maxZoom: u } = e.getState(), { x: c, y: f, zoom: d } = Bm(o, s, l, a, u, (i == null ? void 0 : i.padding) ?? 0.1), p = Ut.translate(c, f).scale(d);
      t.transform(Rn(n, i == null ? void 0 : i.duration), p);
    },
    // @deprecated Use `screenToFlowPosition`.
    project: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l } = e.getState();
      return console.warn("[DEPRECATED] `project` is deprecated. Instead use `screenToFlowPosition`. There is no need to subtract the react flow bounds anymore! https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position"), Za(o, i, s, l);
    },
    screenToFlowPosition: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l, domNode: a } = e.getState();
      if (!a)
        return o;
      const { x: u, y: c } = a.getBoundingClientRect(), f = {
        x: o.x - u,
        y: o.y - c
      };
      return Za(f, i, s, l);
    },
    flowToScreenPosition: (o) => {
      const { transform: i, domNode: s } = e.getState();
      if (!s)
        return o;
      const { x: l, y: a } = s.getBoundingClientRect(), u = Fm(o, i);
      return {
        x: u.x + l,
        y: u.y + a
      };
    },
    viewportInitialized: !0
  } : vk, [t, n]);
};
function rl() {
  const e = wk(), t = Ee(), n = N.useCallback(() => t.getState().getNodes().map((y) => ({ ...y })), []), r = N.useCallback((y) => t.getState().nodeInternals.get(y), []), o = N.useCallback(() => {
    const { edges: y = [] } = t.getState();
    return y.map((k) => ({ ...k }));
  }, []), i = N.useCallback((y) => {
    const { edges: k = [] } = t.getState();
    return k.find((h) => h.id === y);
  }, []), s = N.useCallback((y) => {
    const { getNodes: k, setNodes: h, hasDefaultNodes: m, onNodesChange: v } = t.getState(), x = k(), C = typeof y == "function" ? y(x) : y;
    if (m)
      h(C);
    else if (v) {
      const z = C.length === 0 ? x.map((T) => ({ type: "remove", id: T.id })) : C.map((T) => ({ item: T, type: "reset" }));
      v(z);
    }
  }, []), l = N.useCallback((y) => {
    const { edges: k = [], setEdges: h, hasDefaultEdges: m, onEdgesChange: v } = t.getState(), x = typeof y == "function" ? y(k) : y;
    if (m)
      h(x);
    else if (v) {
      const C = x.length === 0 ? k.map((z) => ({ type: "remove", id: z.id })) : x.map((z) => ({ item: z, type: "reset" }));
      v(C);
    }
  }, []), a = N.useCallback((y) => {
    const k = Array.isArray(y) ? y : [y], { getNodes: h, setNodes: m, hasDefaultNodes: v, onNodesChange: x } = t.getState();
    if (v) {
      const z = [...h(), ...k];
      m(z);
    } else if (x) {
      const C = k.map((z) => ({ item: z, type: "add" }));
      x(C);
    }
  }, []), u = N.useCallback((y) => {
    const k = Array.isArray(y) ? y : [y], { edges: h = [], setEdges: m, hasDefaultEdges: v, onEdgesChange: x } = t.getState();
    if (v)
      m([...h, ...k]);
    else if (x) {
      const C = k.map((z) => ({ item: z, type: "add" }));
      x(C);
    }
  }, []), c = N.useCallback(() => {
    const { getNodes: y, edges: k = [], transform: h } = t.getState(), [m, v, x] = h;
    return {
      nodes: y().map((C) => ({ ...C })),
      edges: k.map((C) => ({ ...C })),
      viewport: {
        x: m,
        y: v,
        zoom: x
      }
    };
  }, []), f = N.useCallback(({ nodes: y, edges: k }) => {
    const { nodeInternals: h, getNodes: m, edges: v, hasDefaultNodes: x, hasDefaultEdges: C, onNodesDelete: z, onEdgesDelete: T, onNodesChange: P, onEdgesChange: $ } = t.getState(), D = (y || []).map((A) => A.id), F = (k || []).map((A) => A.id), b = m().reduce((A, j) => {
      const O = j.parentNode || j.parentId, E = !D.includes(j.id) && O && A.find((M) => M.id === O);
      return (typeof j.deletable == "boolean" ? j.deletable : !0) && (D.includes(j.id) || E) && A.push(j), A;
    }, []), H = v.filter((A) => typeof A.deletable == "boolean" ? A.deletable : !0), S = H.filter((A) => F.includes(A.id));
    if (b || S) {
      const A = Vm(b, H), j = [...S, ...A], O = j.reduce((E, _) => (E.includes(_.id) || E.push(_.id), E), []);
      if ((C || x) && (C && t.setState({
        edges: v.filter((E) => !O.includes(E.id))
      }), x && (b.forEach((E) => {
        h.delete(E.id);
      }), t.setState({
        nodeInternals: new Map(h)
      }))), O.length > 0 && (T == null || T(j), $ && $(O.map((E) => ({
        id: E,
        type: "remove"
      })))), b.length > 0 && (z == null || z(b), P)) {
        const E = b.map((_) => ({ id: _.id, type: "remove" }));
        P(E);
      }
    }
  }, []), d = N.useCallback((y) => {
    const k = F_(y), h = k ? null : t.getState().nodeInternals.get(y.id);
    return !k && !h ? [null, null, k] : [k ? y : id(h), h, k];
  }, []), p = N.useCallback((y, k = !0, h) => {
    const [m, v, x] = d(y);
    return m ? (h || t.getState().getNodes()).filter((C) => {
      if (!x && (C.id === v.id || !C.positionAbsolute))
        return !1;
      const z = id(C), T = qa(z, m);
      return k && T > 0 || T >= m.width * m.height;
    }) : [];
  }, []), w = N.useCallback((y, k, h = !0) => {
    const [m] = d(y);
    if (!m)
      return !1;
    const v = qa(m, k);
    return h && v > 0 || v >= m.width * m.height;
  }, []);
  return N.useMemo(() => ({
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
    isNodeIntersecting: w
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
    w
  ]);
}
const _k = { actInsideInputWithModifier: !1 };
var kk = ({ deleteKeyCode: e, multiSelectionKeyCode: t }) => {
  const n = Ee(), { deleteElements: r } = rl(), o = ei(e, _k), i = ei(t);
  N.useEffect(() => {
    if (o) {
      const { edges: s, getNodes: l } = n.getState(), a = l().filter((c) => c.selected), u = s.filter((c) => c.selected);
      r({ nodes: a, edges: u }), n.setState({ nodesSelectionActive: !1 });
    }
  }, [o]), N.useEffect(() => {
    n.setState({ multiSelectionActive: i });
  }, [i]);
};
function Sk(e) {
  const t = Ee();
  N.useEffect(() => {
    let n;
    const r = () => {
      var i, s;
      if (!e.current)
        return;
      const o = ac(e.current);
      (o.height === 0 || o.width === 0) && ((s = (i = t.getState()).onError) == null || s.call(i, "004", Gt.error004())), t.setState({ width: o.width || 500, height: o.height || 500 });
    };
    return r(), window.addEventListener("resize", r), e.current && (n = new ResizeObserver(() => r()), n.observe(e.current)), () => {
      window.removeEventListener("resize", r), n && e.current && n.unobserve(e.current);
    };
  }, []);
}
const yc = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0
}, Ek = (e, t) => e.x !== t.x || e.y !== t.y || e.zoom !== t.k, Di = (e) => ({
  x: e.x,
  y: e.y,
  zoom: e.k
}), lr = (e, t) => e.target.closest(`.${t}`), md = (e, t) => t === 2 && Array.isArray(e) && e.includes(2), gd = (e) => {
  const t = e.ctrlKey && js() ? 10 : 1;
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * t;
}, Nk = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection,
  d3ZoomHandler: e.d3ZoomHandler,
  userSelectionActive: e.userSelectionActive
}), Ck = ({ onMove: e, onMoveStart: t, onMoveEnd: n, onPaneContextMenu: r, zoomOnScroll: o = !0, zoomOnPinch: i = !0, panOnScroll: s = !1, panOnScrollSpeed: l = 0.5, panOnScrollMode: a = bn.Free, zoomOnDoubleClick: u = !0, elementsSelectable: c, panOnDrag: f = !0, defaultViewport: d, translateExtent: p, minZoom: w, maxZoom: y, zoomActivationKeyCode: k, preventScrolling: h = !0, children: m, noWheelClassName: v, noPanClassName: x }) => {
  const C = N.useRef(), z = Ee(), T = N.useRef(!1), P = N.useRef(!1), $ = N.useRef(null), D = N.useRef({ x: 0, y: 0, zoom: 0 }), { d3Zoom: F, d3Selection: b, d3ZoomHandler: H, userSelectionActive: S } = se(Nk, Pe), A = ei(k), j = N.useRef(0), O = N.useRef(!1), E = N.useRef();
  return Sk($), N.useEffect(() => {
    if ($.current) {
      const _ = $.current.getBoundingClientRect(), M = jm().scaleExtent([w, y]).translateExtent(p), R = lt($.current).call(M), L = Ut.translate(d.x, d.y).scale(Vr(d.zoom, w, y)), B = [
        [0, 0],
        [_.width, _.height]
      ], U = M.constrain()(L, B, p);
      M.transform(R, U), M.wheelDelta(gd), z.setState({
        d3Zoom: M,
        d3Selection: R,
        d3ZoomHandler: R.on("wheel.zoom"),
        // we need to pass transform because zoom handler is not registered when we set the initial transform
        transform: [U.x, U.y, U.k],
        domNode: $.current.closest(".react-flow")
      });
    }
  }, []), N.useEffect(() => {
    b && F && (s && !A && !S ? b.on("wheel.zoom", (_) => {
      if (lr(_, v))
        return !1;
      _.preventDefault(), _.stopImmediatePropagation();
      const M = b.property("__zoom").k || 1;
      if (_.ctrlKey && i) {
        const te = xt(_), Z = gd(_), ne = M * Math.pow(2, Z);
        F.scaleTo(b, ne, te, _);
        return;
      }
      const R = _.deltaMode === 1 ? 20 : 1;
      let L = a === bn.Vertical ? 0 : _.deltaX * R, B = a === bn.Horizontal ? 0 : _.deltaY * R;
      !js() && _.shiftKey && a !== bn.Vertical && (L = _.deltaY * R, B = 0), F.translateBy(
        b,
        -(L / M) * l,
        -(B / M) * l,
        // @ts-ignore
        { internal: !0 }
      );
      const U = Di(b.property("__zoom")), { onViewportChangeStart: W, onViewportChange: q, onViewportChangeEnd: Q } = z.getState();
      clearTimeout(E.current), O.current || (O.current = !0, t == null || t(_, U), W == null || W(U)), O.current && (e == null || e(_, U), q == null || q(U), E.current = setTimeout(() => {
        n == null || n(_, U), Q == null || Q(U), O.current = !1;
      }, 150));
    }, { passive: !1 }) : typeof H < "u" && b.on("wheel.zoom", function(_, M) {
      if (!h && _.type === "wheel" && !_.ctrlKey || lr(_, v))
        return null;
      _.preventDefault(), H.call(this, _, M);
    }, { passive: !1 }));
  }, [
    S,
    s,
    a,
    b,
    F,
    H,
    A,
    i,
    h,
    v,
    t,
    e,
    n
  ]), N.useEffect(() => {
    F && F.on("start", (_) => {
      var L, B;
      if (!_.sourceEvent || _.sourceEvent.internal)
        return null;
      j.current = (L = _.sourceEvent) == null ? void 0 : L.button;
      const { onViewportChangeStart: M } = z.getState(), R = Di(_.transform);
      T.current = !0, D.current = R, ((B = _.sourceEvent) == null ? void 0 : B.type) === "mousedown" && z.setState({ paneDragging: !0 }), M == null || M(R), t == null || t(_.sourceEvent, R);
    });
  }, [F, t]), N.useEffect(() => {
    F && (S && !T.current ? F.on("zoom", null) : S || F.on("zoom", (_) => {
      var R;
      const { onViewportChange: M } = z.getState();
      if (z.setState({ transform: [_.transform.x, _.transform.y, _.transform.k] }), P.current = !!(r && md(f, j.current ?? 0)), (e || M) && !((R = _.sourceEvent) != null && R.internal)) {
        const L = Di(_.transform);
        M == null || M(L), e == null || e(_.sourceEvent, L);
      }
    }));
  }, [S, F, e, f, r]), N.useEffect(() => {
    F && F.on("end", (_) => {
      if (!_.sourceEvent || _.sourceEvent.internal)
        return null;
      const { onViewportChangeEnd: M } = z.getState();
      if (T.current = !1, z.setState({ paneDragging: !1 }), r && md(f, j.current ?? 0) && !P.current && r(_.sourceEvent), P.current = !1, (n || M) && Ek(D.current, _.transform)) {
        const R = Di(_.transform);
        D.current = R, clearTimeout(C.current), C.current = setTimeout(() => {
          M == null || M(R), n == null || n(_.sourceEvent, R);
        }, s ? 150 : 0);
      }
    });
  }, [F, s, f, n, r]), N.useEffect(() => {
    F && F.filter((_) => {
      const M = A || o, R = i && _.ctrlKey;
      if ((f === !0 || Array.isArray(f) && f.includes(1)) && _.button === 1 && _.type === "mousedown" && (lr(_, "react-flow__node") || lr(_, "react-flow__edge")))
        return !0;
      if (!f && !M && !s && !u && !i || S || !u && _.type === "dblclick" || lr(_, v) && _.type === "wheel" || lr(_, x) && (_.type !== "wheel" || s && _.type === "wheel" && !A) || !i && _.ctrlKey && _.type === "wheel" || !M && !s && !R && _.type === "wheel" || !f && (_.type === "mousedown" || _.type === "touchstart") || Array.isArray(f) && !f.includes(_.button) && _.type === "mousedown")
        return !1;
      const L = Array.isArray(f) && f.includes(_.button) || !_.button || _.button <= 1;
      return (!_.ctrlKey || _.type === "wheel") && L;
    });
  }, [
    S,
    F,
    o,
    i,
    s,
    u,
    f,
    c,
    A
  ]), I.createElement("div", { className: "react-flow__renderer", ref: $, style: yc }, m);
}, Pk = (e) => ({
  userSelectionActive: e.userSelectionActive,
  userSelectionRect: e.userSelectionRect
});
function zk() {
  const { userSelectionActive: e, userSelectionRect: t } = se(Pk, Pe);
  return e && t ? I.createElement("div", { className: "react-flow__selection react-flow__container", style: {
    width: t.width,
    height: t.height,
    transform: `translate(${t.x}px, ${t.y}px)`
  } }) : null;
}
function yd(e, t) {
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
function jk(e, t) {
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
            typeof l.position < "u" && (s.position = l.position), typeof l.positionAbsolute < "u" && (s.positionAbsolute = l.positionAbsolute), typeof l.dragging < "u" && (s.dragging = l.dragging), s.expandParent && yd(r, s);
            break;
          }
          case "dimensions": {
            typeof l.dimensions < "u" && (s.width = l.dimensions.width, s.height = l.dimensions.height), typeof l.updateStyle < "u" && (s.style = { ...s.style || {}, ...l.dimensions }), typeof l.resizing == "boolean" && (s.resizing = l.resizing), s.expandParent && yd(r, s);
            break;
          }
          case "remove":
            return r;
        }
    return r.push(s), r;
  }, n);
}
function Mk(e, t) {
  return jk(e, t);
}
const on = (e, t) => ({
  id: e,
  type: "select",
  selected: t
});
function kr(e, t) {
  return e.reduce((n, r) => {
    const o = t.includes(r.id);
    return !r.selected && o ? (r.selected = !0, n.push(on(r.id, !0))) : r.selected && !o && (r.selected = !1, n.push(on(r.id, !1))), n;
  }, []);
}
const Vl = (e, t) => (n) => {
  n.target === t.current && (e == null || e(n));
}, Tk = (e) => ({
  userSelectionActive: e.userSelectionActive,
  elementsSelectable: e.elementsSelectable,
  dragging: e.paneDragging
}), ig = N.memo(({ isSelecting: e, selectionMode: t = Zo.Full, panOnDrag: n, onSelectionStart: r, onSelectionEnd: o, onPaneClick: i, onPaneContextMenu: s, onPaneScroll: l, onPaneMouseEnter: a, onPaneMouseMove: u, onPaneMouseLeave: c, children: f }) => {
  const d = N.useRef(null), p = Ee(), w = N.useRef(0), y = N.useRef(0), k = N.useRef(), { userSelectionActive: h, elementsSelectable: m, dragging: v } = se(Tk, Pe), x = () => {
    p.setState({ userSelectionActive: !1, userSelectionRect: null }), w.current = 0, y.current = 0;
  }, C = (H) => {
    i == null || i(H), p.getState().resetSelectedElements(), p.setState({ nodesSelectionActive: !1 });
  }, z = (H) => {
    if (Array.isArray(n) && (n != null && n.includes(2))) {
      H.preventDefault();
      return;
    }
    s == null || s(H);
  }, T = l ? (H) => l(H) : void 0, P = (H) => {
    const { resetSelectedElements: S, domNode: A } = p.getState();
    if (k.current = A == null ? void 0 : A.getBoundingClientRect(), !m || !e || H.button !== 0 || H.target !== d.current || !k.current)
      return;
    const { x: j, y: O } = xn(H, k.current);
    S(), p.setState({
      userSelectionRect: {
        width: 0,
        height: 0,
        startX: j,
        startY: O,
        x: j,
        y: O
      }
    }), r == null || r(H);
  }, $ = (H) => {
    const { userSelectionRect: S, nodeInternals: A, edges: j, transform: O, onNodesChange: E, onEdgesChange: _, nodeOrigin: M, getNodes: R } = p.getState();
    if (!e || !k.current || !S)
      return;
    p.setState({ userSelectionActive: !0, nodesSelectionActive: !1 });
    const L = xn(H, k.current), B = S.startX ?? 0, U = S.startY ?? 0, W = {
      ...S,
      x: L.x < B ? L.x : B,
      y: L.y < U ? L.y : U,
      width: Math.abs(L.x - B),
      height: Math.abs(L.y - U)
    }, q = R(), Q = Hm(A, W, O, t === Zo.Partial, !0, M), te = Vm(Q, j).map((ne) => ne.id), Z = Q.map((ne) => ne.id);
    if (w.current !== Z.length) {
      w.current = Z.length;
      const ne = kr(q, Z);
      ne.length && (E == null || E(ne));
    }
    if (y.current !== te.length) {
      y.current = te.length;
      const ne = kr(j, te);
      ne.length && (_ == null || _(ne));
    }
    p.setState({
      userSelectionRect: W
    });
  }, D = (H) => {
    if (H.button !== 0)
      return;
    const { userSelectionRect: S } = p.getState();
    !h && S && H.target === d.current && (C == null || C(H)), p.setState({ nodesSelectionActive: w.current > 0 }), x(), o == null || o(H);
  }, F = (H) => {
    h && (p.setState({ nodesSelectionActive: w.current > 0 }), o == null || o(H)), x();
  }, b = m && (e || h);
  return I.createElement(
    "div",
    { className: $e(["react-flow__pane", { dragging: v, selection: e }]), onClick: b ? void 0 : Vl(C, d), onContextMenu: Vl(z, d), onWheel: Vl(T, d), onMouseEnter: b ? void 0 : a, onMouseDown: b ? P : void 0, onMouseMove: b ? $ : u, onMouseUp: b ? D : void 0, onMouseLeave: b ? F : c, ref: d, style: yc },
    f,
    I.createElement(zk, null)
  );
});
ig.displayName = "Pane";
function sg(e, t) {
  const n = e.parentNode || e.parentId;
  if (!n)
    return !1;
  const r = t.get(n);
  return r ? r.selected ? !0 : sg(r, t) : !1;
}
function vd(e, t, n) {
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
function $k(e, t, n, r) {
  return Array.from(e.values()).filter((o) => (o.selected || o.id === r) && (!o.parentNode || o.parentId || !sg(o, e)) && (o.draggable || t && typeof o.draggable > "u")).map((o) => {
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
function Ak(e, t) {
  return !t || t === "parent" ? t : [t[0], [t[1][0] - (e.width || 0), t[1][1] - (e.height || 0)]];
}
function lg(e, t, n, r, o = [0, 0], i) {
  const s = Ak(e, e.extent || r);
  let l = s;
  const a = e.parentNode || e.parentId;
  if (e.extent === "parent" && !e.expandParent)
    if (a && e.width && e.height) {
      const f = n.get(a), { x: d, y: p } = Bn(f, o).positionAbsolute;
      l = f && ut(d) && ut(p) && ut(f.width) && ut(f.height) ? [
        [d + e.width * o[0], p + e.height * o[1]],
        [
          d + f.width - e.width + e.width * o[0],
          p + f.height - e.height + e.height * o[1]
        ]
      ] : l;
    } else
      i == null || i("005", Gt.error005()), l = s;
  else if (e.extent && a && e.extent !== "parent") {
    const f = n.get(a), { x: d, y: p } = Bn(f, o).positionAbsolute;
    l = [
      [e.extent[0][0] + d, e.extent[0][1] + p],
      [e.extent[1][0] + d, e.extent[1][1] + p]
    ];
  }
  let u = { x: 0, y: 0 };
  if (a) {
    const f = n.get(a);
    u = Bn(f, o).positionAbsolute;
  }
  const c = l && l !== "parent" ? uc(t, l) : t;
  return {
    position: {
      x: c.x - u.x,
      y: c.y - u.y
    },
    positionAbsolute: c
  };
}
function Bl({ nodeId: e, dragItems: t, nodeInternals: n }) {
  const r = t.map((o) => ({
    ...n.get(o.id),
    position: o.position,
    positionAbsolute: o.positionAbsolute
  }));
  return [e ? r.find((o) => o.id === e) : r[0], r];
}
const xd = (e, t, n, r) => {
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
      ...ac(a)
    };
  });
};
function uo(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().nodeInternals.get(e);
    o && n(r, { ...o });
  };
}
function eu({ id: e, store: t, unselect: n = !1, nodeRef: r }) {
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
function Rk() {
  const e = Ee();
  return N.useCallback(({ sourceEvent: n }) => {
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
function Ul(e) {
  return (t, n, r) => e == null ? void 0 : e(t, r);
}
function ag({ nodeRef: e, disabled: t = !1, noDragClassName: n, handleSelector: r, nodeId: o, isSelectable: i, selectNodesOnDrag: s }) {
  const l = Ee(), [a, u] = N.useState(!1), c = N.useRef([]), f = N.useRef({ x: null, y: null }), d = N.useRef(0), p = N.useRef(null), w = N.useRef({ x: 0, y: 0 }), y = N.useRef(null), k = N.useRef(!1), h = N.useRef(!1), m = N.useRef(!1), v = Rk();
  return N.useEffect(() => {
    if (e != null && e.current) {
      const x = lt(e.current), C = ({ x: P, y: $ }) => {
        const { nodeInternals: D, onNodeDrag: F, onSelectionDrag: b, updateNodePositions: H, nodeExtent: S, snapGrid: A, snapToGrid: j, nodeOrigin: O, onError: E } = l.getState();
        f.current = { x: P, y: $ };
        let _ = !1, M = { x: 0, y: 0, x2: 0, y2: 0 };
        if (c.current.length > 1 && S) {
          const L = nl(c.current, O);
          M = Qo(L);
        }
        if (c.current = c.current.map((L) => {
          const B = { x: P - L.distance.x, y: $ - L.distance.y };
          j && (B.x = A[0] * Math.round(B.x / A[0]), B.y = A[1] * Math.round(B.y / A[1]));
          const U = [
            [S[0][0], S[0][1]],
            [S[1][0], S[1][1]]
          ];
          c.current.length > 1 && S && !L.extent && (U[0][0] = L.positionAbsolute.x - M.x + S[0][0], U[1][0] = L.positionAbsolute.x + (L.width ?? 0) - M.x2 + S[1][0], U[0][1] = L.positionAbsolute.y - M.y + S[0][1], U[1][1] = L.positionAbsolute.y + (L.height ?? 0) - M.y2 + S[1][1]);
          const W = lg(L, B, D, U, O, E);
          return _ = _ || L.position.x !== W.position.x || L.position.y !== W.position.y, L.position = W.position, L.positionAbsolute = W.positionAbsolute, L;
        }), !_)
          return;
        H(c.current, !0, !0), u(!0);
        const R = o ? F : Ul(b);
        if (R && y.current) {
          const [L, B] = Bl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: D
          });
          R(y.current, L, B);
        }
      }, z = () => {
        if (!p.current)
          return;
        const [P, $] = Tm(w.current, p.current);
        if (P !== 0 || $ !== 0) {
          const { transform: D, panBy: F } = l.getState();
          f.current.x = (f.current.x ?? 0) - P / D[2], f.current.y = (f.current.y ?? 0) - $ / D[2], F({ x: P, y: $ }) && C(f.current);
        }
        d.current = requestAnimationFrame(z);
      }, T = (P) => {
        var O;
        const { nodeInternals: $, multiSelectionActive: D, nodesDraggable: F, unselectNodesAndEdges: b, onNodeDragStart: H, onSelectionDragStart: S } = l.getState();
        h.current = !0;
        const A = o ? H : Ul(S);
        (!s || !i) && !D && o && ((O = $.get(o)) != null && O.selected || b()), o && i && s && eu({
          id: o,
          store: l,
          nodeRef: e
        });
        const j = v(P);
        if (f.current = j, c.current = $k($, F, j, o), A && c.current) {
          const [E, _] = Bl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: $
          });
          A(P.sourceEvent, E, _);
        }
      };
      if (t)
        x.on(".drag", null);
      else {
        const P = Uw().on("start", ($) => {
          const { domNode: D, nodeDragThreshold: F } = l.getState();
          F === 0 && T($), m.current = !1;
          const b = v($);
          f.current = b, p.current = (D == null ? void 0 : D.getBoundingClientRect()) || null, w.current = xn($.sourceEvent, p.current);
        }).on("drag", ($) => {
          var H, S;
          const D = v($), { autoPanOnNodeDrag: F, nodeDragThreshold: b } = l.getState();
          if ($.sourceEvent.type === "touchmove" && $.sourceEvent.touches.length > 1 && (m.current = !0), !m.current) {
            if (!k.current && h.current && F && (k.current = !0, z()), !h.current) {
              const A = D.xSnapped - (((H = f == null ? void 0 : f.current) == null ? void 0 : H.x) ?? 0), j = D.ySnapped - (((S = f == null ? void 0 : f.current) == null ? void 0 : S.y) ?? 0);
              Math.sqrt(A * A + j * j) > b && T($);
            }
            (f.current.x !== D.xSnapped || f.current.y !== D.ySnapped) && c.current && h.current && (y.current = $.sourceEvent, w.current = xn($.sourceEvent, p.current), C(D));
          }
        }).on("end", ($) => {
          if (!(!h.current || m.current) && (u(!1), k.current = !1, h.current = !1, cancelAnimationFrame(d.current), c.current)) {
            const { updateNodePositions: D, nodeInternals: F, onNodeDragStop: b, onSelectionDragStop: H } = l.getState(), S = o ? b : Ul(H);
            if (D(c.current, !1, !1), S) {
              const [A, j] = Bl({
                nodeId: o,
                dragItems: c.current,
                nodeInternals: F
              });
              S($.sourceEvent, A, j);
            }
          }
        }).filter(($) => {
          const D = $.target;
          return !$.button && (!n || !vd(D, `.${n}`, e)) && (!r || vd(D, r, e));
        });
        return x.call(P), () => {
          x.on(".drag", null);
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
    v
  ]), a;
}
function ug() {
  const e = Ee();
  return N.useCallback((n) => {
    const { nodeInternals: r, nodeExtent: o, updateNodePositions: i, getNodes: s, snapToGrid: l, snapGrid: a, onError: u, nodesDraggable: c } = e.getState(), f = s().filter((m) => m.selected && (m.draggable || c && typeof m.draggable > "u")), d = l ? a[0] : 5, p = l ? a[1] : 5, w = n.isShiftPressed ? 4 : 1, y = n.x * d * w, k = n.y * p * w, h = f.map((m) => {
      if (m.positionAbsolute) {
        const v = { x: m.positionAbsolute.x + y, y: m.positionAbsolute.y + k };
        l && (v.x = a[0] * Math.round(v.x / a[0]), v.y = a[1] * Math.round(v.y / a[1]));
        const { positionAbsolute: x, position: C } = lg(m, v, r, o, void 0, u);
        m.position = C, m.positionAbsolute = x;
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
var co = (e) => {
  const t = ({ id: n, type: r, data: o, xPos: i, yPos: s, xPosOrigin: l, yPosOrigin: a, selected: u, onClick: c, onMouseEnter: f, onMouseMove: d, onMouseLeave: p, onContextMenu: w, onDoubleClick: y, style: k, className: h, isDraggable: m, isSelectable: v, isConnectable: x, isFocusable: C, selectNodesOnDrag: z, sourcePosition: T, targetPosition: P, hidden: $, resizeObserver: D, dragHandle: F, zIndex: b, isParent: H, noDragClassName: S, noPanClassName: A, initialized: j, disableKeyboardA11y: O, ariaLabel: E, rfId: _, hasHandleBounds: M }) => {
    const R = Ee(), L = N.useRef(null), B = N.useRef(null), U = N.useRef(T), W = N.useRef(P), q = N.useRef(r), Q = v || m || c || f || d || p, te = ug(), Z = uo(n, R.getState, f), ne = uo(n, R.getState, d), ze = uo(n, R.getState, p), we = uo(n, R.getState, w), be = uo(n, R.getState, y), Ae = (ie) => {
      const { nodeDragThreshold: G } = R.getState();
      if (v && (!z || !m || G > 0) && eu({
        id: n,
        store: R,
        nodeRef: L
      }), c) {
        const Fe = R.getState().nodeInternals.get(n);
        Fe && c(ie, { ...Fe });
      }
    }, ge = (ie) => {
      if (!Ka(ie) && !O)
        if (Im.includes(ie.key) && v) {
          const G = ie.key === "Escape";
          eu({
            id: n,
            store: R,
            unselect: G,
            nodeRef: L
          });
        } else m && u && Object.prototype.hasOwnProperty.call(Tr, ie.key) && (R.setState({
          ariaLiveMessage: `Moved selected node ${ie.key.replace("Arrow", "").toLowerCase()}. New position, x: ${~~i}, y: ${~~s}`
        }), te({
          x: Tr[ie.key].x,
          y: Tr[ie.key].y,
          isShiftPressed: ie.shiftKey
        }));
    };
    N.useEffect(() => () => {
      B.current && (D == null || D.unobserve(B.current), B.current = null);
    }, []), N.useEffect(() => {
      if (L.current && !$) {
        const ie = L.current;
        (!j || !M || B.current !== ie) && (B.current && (D == null || D.unobserve(B.current)), D == null || D.observe(ie), B.current = ie);
      }
    }, [$, j, M]), N.useEffect(() => {
      const ie = q.current !== r, G = U.current !== T, Fe = W.current !== P;
      L.current && (ie || G || Fe) && (ie && (q.current = r), G && (U.current = T), Fe && (W.current = P), R.getState().updateNodeDimensions([{ id: n, nodeElement: L.current, forceUpdate: !0 }]));
    }, [n, r, T, P]);
    const Qe = ag({
      nodeRef: L,
      disabled: $ || !m,
      noDragClassName: S,
      handleSelector: F,
      nodeId: n,
      isSelectable: v,
      selectNodesOnDrag: z
    });
    return $ ? null : I.createElement(
      "div",
      { className: $e([
        "react-flow__node",
        `react-flow__node-${r}`,
        {
          // this is overwritable by passing `nopan` as a class name
          [A]: m
        },
        h,
        {
          selected: u,
          selectable: v,
          parent: H,
          dragging: Qe
        }
      ]), ref: L, style: {
        zIndex: b,
        transform: `translate(${l}px,${a}px)`,
        pointerEvents: Q ? "all" : "none",
        visibility: j ? "visible" : "hidden",
        ...k
      }, "data-id": n, "data-testid": `rf__node-${n}`, onMouseEnter: Z, onMouseMove: ne, onMouseLeave: ze, onContextMenu: we, onClick: Ae, onDoubleClick: be, onKeyDown: C ? ge : void 0, tabIndex: C ? 0 : void 0, role: C ? "button" : void 0, "aria-describedby": O ? void 0 : `${eg}-${_}`, "aria-label": E },
      I.createElement(
        X_,
        { value: n },
        I.createElement(e, { id: n, data: o, type: r, xPos: i, yPos: s, selected: u, isConnectable: x, sourcePosition: T, targetPosition: P, dragging: Qe, dragHandle: F, zIndex: b })
      )
    );
  };
  return t.displayName = "NodeWrapper", N.memo(t);
};
const Ik = (e) => {
  const t = e.getNodes().filter((n) => n.selected);
  return {
    ...nl(t, e.nodeOrigin),
    transformString: `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`,
    userSelectionActive: e.userSelectionActive
  };
};
function Dk({ onSelectionContextMenu: e, noPanClassName: t, disableKeyboardA11y: n }) {
  const r = Ee(), { width: o, height: i, x: s, y: l, transformString: a, userSelectionActive: u } = se(Ik, Pe), c = ug(), f = N.useRef(null);
  if (N.useEffect(() => {
    var w;
    n || (w = f.current) == null || w.focus({
      preventScroll: !0
    });
  }, [n]), ag({
    nodeRef: f
  }), u || !o || !i)
    return null;
  const d = e ? (w) => {
    const y = r.getState().getNodes().filter((k) => k.selected);
    e(w, y);
  } : void 0, p = (w) => {
    Object.prototype.hasOwnProperty.call(Tr, w.key) && c({
      x: Tr[w.key].x,
      y: Tr[w.key].y,
      isShiftPressed: w.shiftKey
    });
  };
  return I.createElement(
    "div",
    { className: $e(["react-flow__nodesselection", "react-flow__container", t]), style: {
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
var Lk = N.memo(Dk);
const Ok = (e) => e.nodesSelectionActive, cg = ({ children: e, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, deleteKeyCode: l, onMove: a, onMoveStart: u, onMoveEnd: c, selectionKeyCode: f, selectionOnDrag: d, selectionMode: p, onSelectionStart: w, onSelectionEnd: y, multiSelectionKeyCode: k, panActivationKeyCode: h, zoomActivationKeyCode: m, elementsSelectable: v, zoomOnScroll: x, zoomOnPinch: C, panOnScroll: z, panOnScrollSpeed: T, panOnScrollMode: P, zoomOnDoubleClick: $, panOnDrag: D, defaultViewport: F, translateExtent: b, minZoom: H, maxZoom: S, preventScrolling: A, onSelectionContextMenu: j, noWheelClassName: O, noPanClassName: E, disableKeyboardA11y: _ }) => {
  const M = se(Ok), R = ei(f), L = ei(h), B = L || D, U = L || z, W = R || d && B !== !0;
  return kk({ deleteKeyCode: l, multiSelectionKeyCode: k }), I.createElement(
    Ck,
    { onMove: a, onMoveStart: u, onMoveEnd: c, onPaneContextMenu: i, elementsSelectable: v, zoomOnScroll: x, zoomOnPinch: C, panOnScroll: U, panOnScrollSpeed: T, panOnScrollMode: P, zoomOnDoubleClick: $, panOnDrag: !R && B, defaultViewport: F, translateExtent: b, minZoom: H, maxZoom: S, zoomActivationKeyCode: m, preventScrolling: A, noWheelClassName: O, noPanClassName: E },
    I.createElement(
      ig,
      { onSelectionStart: w, onSelectionEnd: y, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, panOnDrag: B, isSelecting: !!W, selectionMode: p },
      e,
      M && I.createElement(Lk, { onSelectionContextMenu: j, noPanClassName: E, disableKeyboardA11y: _ })
    )
  );
};
cg.displayName = "FlowRenderer";
var bk = N.memo(cg);
function Fk(e) {
  return se(N.useCallback((n) => e ? Hm(n.nodeInternals, { x: 0, y: 0, width: n.width, height: n.height }, n.transform, !0) : n.getNodes(), [e]));
}
function Hk(e) {
  const t = {
    input: co(e.input || Gm),
    default: co(e.default || Ja),
    output: co(e.output || Zm),
    group: co(e.group || gc)
  }, n = {}, r = Object.keys(e).filter((o) => !["input", "default", "output", "group"].includes(o)).reduce((o, i) => (o[i] = co(e[i] || Ja), o), n);
  return {
    ...t,
    ...r
  };
}
const Vk = ({ x: e, y: t, width: n, height: r, origin: o }) => !n || !r ? { x: e, y: t } : o[0] < 0 || o[1] < 0 || o[0] > 1 || o[1] > 1 ? { x: e, y: t } : {
  x: e - n * o[0],
  y: t - r * o[1]
}, Bk = (e) => ({
  nodesDraggable: e.nodesDraggable,
  nodesConnectable: e.nodesConnectable,
  nodesFocusable: e.nodesFocusable,
  elementsSelectable: e.elementsSelectable,
  updateNodeDimensions: e.updateNodeDimensions,
  onError: e.onError
}), fg = (e) => {
  const { nodesDraggable: t, nodesConnectable: n, nodesFocusable: r, elementsSelectable: o, updateNodeDimensions: i, onError: s } = se(Bk, Pe), l = Fk(e.onlyRenderVisibleElements), a = N.useRef(), u = N.useMemo(() => {
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
  return N.useEffect(() => () => {
    var c;
    (c = a == null ? void 0 : a.current) == null || c.disconnect();
  }, []), I.createElement("div", { className: "react-flow__nodes", style: yc }, l.map((c) => {
    var C, z, T;
    let f = c.type || "default";
    e.nodeTypes[f] || (s == null || s("003", Gt.error003(f)), f = "default");
    const d = e.nodeTypes[f] || e.nodeTypes.default, p = !!(c.draggable || t && typeof c.draggable > "u"), w = !!(c.selectable || o && typeof c.selectable > "u"), y = !!(c.connectable || n && typeof c.connectable > "u"), k = !!(c.focusable || r && typeof c.focusable > "u"), h = e.nodeExtent ? uc(c.positionAbsolute, e.nodeExtent) : c.positionAbsolute, m = (h == null ? void 0 : h.x) ?? 0, v = (h == null ? void 0 : h.y) ?? 0, x = Vk({
      x: m,
      y: v,
      width: c.width ?? 0,
      height: c.height ?? 0,
      origin: e.nodeOrigin
    });
    return I.createElement(d, { key: c.id, id: c.id, className: c.className, style: c.style, type: f, data: c.data, sourcePosition: c.sourcePosition || K.Bottom, targetPosition: c.targetPosition || K.Top, hidden: c.hidden, xPos: m, yPos: v, xPosOrigin: x.x, yPosOrigin: x.y, selectNodesOnDrag: e.selectNodesOnDrag, onClick: e.onNodeClick, onMouseEnter: e.onNodeMouseEnter, onMouseMove: e.onNodeMouseMove, onMouseLeave: e.onNodeMouseLeave, onContextMenu: e.onNodeContextMenu, onDoubleClick: e.onNodeDoubleClick, selected: !!c.selected, isDraggable: p, isSelectable: w, isConnectable: y, isFocusable: k, resizeObserver: u, dragHandle: c.dragHandle, zIndex: ((C = c[me]) == null ? void 0 : C.z) ?? 0, isParent: !!((z = c[me]) != null && z.isParent), noDragClassName: e.noDragClassName, noPanClassName: e.noPanClassName, initialized: !!c.width && !!c.height, rfId: e.rfId, disableKeyboardA11y: e.disableKeyboardA11y, ariaLabel: c.ariaLabel, hasHandleBounds: !!((T = c[me]) != null && T.handleBounds) });
  }));
};
fg.displayName = "NodeRenderer";
var Uk = N.memo(fg);
const Wk = (e, t, n) => n === K.Left ? e - t : n === K.Right ? e + t : e, Yk = (e, t, n) => n === K.Top ? e - t : n === K.Bottom ? e + t : e, wd = "react-flow__edgeupdater", _d = ({ position: e, centerX: t, centerY: n, radius: r = 10, onMouseDown: o, onMouseEnter: i, onMouseOut: s, type: l }) => I.createElement("circle", { onMouseDown: o, onMouseEnter: i, onMouseOut: s, className: $e([wd, `${wd}-${l}`]), cx: Wk(t, r, e), cy: Yk(n, r, e), r, stroke: "transparent", fill: "transparent" }), Xk = () => !0;
var ar = (e) => {
  const t = ({ id: n, className: r, type: o, data: i, onClick: s, onEdgeDoubleClick: l, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: w, labelBgBorderRadius: y, style: k, source: h, target: m, sourceX: v, sourceY: x, targetX: C, targetY: z, sourcePosition: T, targetPosition: P, elementsSelectable: $, hidden: D, sourceHandleId: F, targetHandleId: b, onContextMenu: H, onMouseEnter: S, onMouseMove: A, onMouseLeave: j, reconnectRadius: O, onReconnect: E, onReconnectStart: _, onReconnectEnd: M, markerEnd: R, markerStart: L, rfId: B, ariaLabel: U, isFocusable: W, isReconnectable: q, pathOptions: Q, interactionWidth: te, disableKeyboardA11y: Z }) => {
    const ne = N.useRef(null), [ze, we] = N.useState(!1), [be, Ae] = N.useState(!1), ge = Ee(), Qe = N.useMemo(() => `url('#${Qa(L, B)}')`, [L, B]), ie = N.useMemo(() => `url('#${Qa(R, B)}')`, [R, B]);
    if (D)
      return null;
    const G = (Re) => {
      var Ct;
      const { edges: ht, addSelectedEdges: zn, unselectNodesAndEdges: jn, multiSelectionActive: Mn } = ge.getState(), Dt = ht.find((Gr) => Gr.id === n);
      Dt && ($ && (ge.setState({ nodesSelectionActive: !1 }), Dt.selected && Mn ? (jn({ nodes: [], edges: [Dt] }), (Ct = ne.current) == null || Ct.blur()) : zn([n])), s && s(Re, Dt));
    }, Fe = ao(n, ge.getState, l), Rt = ao(n, ge.getState, H), qr = ao(n, ge.getState, S), Jn = ao(n, ge.getState, A), er = ao(n, ge.getState, j), It = (Re, ht) => {
      if (Re.button !== 0)
        return;
      const { edges: zn, isValidConnection: jn } = ge.getState(), Mn = ht ? m : h, Dt = (ht ? b : F) || null, Ct = ht ? "target" : "source", Gr = jn || Xk, sl = ht, Qr = zn.find((Tn) => Tn.id === n);
      Ae(!0), _ == null || _(Re, Qr, Ct);
      const ll = (Tn) => {
        Ae(!1), M == null || M(Tn, Qr, Ct);
      };
      Ym({
        event: Re,
        handleId: Dt,
        nodeId: Mn,
        onConnect: (Tn) => E == null ? void 0 : E(Qr, Tn),
        isTarget: sl,
        getState: ge.getState,
        setState: ge.setState,
        isValidConnection: Gr,
        edgeUpdaterType: Ct,
        onReconnectEnd: ll
      });
    }, tr = (Re) => It(Re, !0), Cn = (Re) => It(Re, !1), Pn = () => we(!0), nr = () => we(!1), rr = !$ && !s, Kr = (Re) => {
      var ht;
      if (!Z && Im.includes(Re.key) && $) {
        const { unselectNodesAndEdges: zn, addSelectedEdges: jn, edges: Mn } = ge.getState();
        Re.key === "Escape" ? ((ht = ne.current) == null || ht.blur(), zn({ edges: [Mn.find((Ct) => Ct.id === n)] })) : jn([n]);
      }
    };
    return I.createElement(
      "g",
      { className: $e([
        "react-flow__edge",
        `react-flow__edge-${o}`,
        r,
        { selected: a, animated: u, inactive: rr, updating: ze }
      ]), onClick: G, onDoubleClick: Fe, onContextMenu: Rt, onMouseEnter: qr, onMouseMove: Jn, onMouseLeave: er, onKeyDown: W ? Kr : void 0, tabIndex: W ? 0 : void 0, role: W ? "button" : "img", "data-testid": `rf__edge-${n}`, "aria-label": U === null ? void 0 : U || `Edge from ${h} to ${m}`, "aria-describedby": W ? `${tg}-${B}` : void 0, ref: ne },
      !be && I.createElement(e, { id: n, source: h, target: m, selected: a, animated: u, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: p, labelBgPadding: w, labelBgBorderRadius: y, data: i, style: k, sourceX: v, sourceY: x, targetX: C, targetY: z, sourcePosition: T, targetPosition: P, sourceHandleId: F, targetHandleId: b, markerStart: Qe, markerEnd: ie, pathOptions: Q, interactionWidth: te }),
      q && I.createElement(
        I.Fragment,
        null,
        (q === "source" || q === !0) && I.createElement(_d, { position: T, centerX: v, centerY: x, radius: O, onMouseDown: tr, onMouseEnter: Pn, onMouseOut: nr, type: "source" }),
        (q === "target" || q === !0) && I.createElement(_d, { position: P, centerX: C, centerY: z, radius: O, onMouseDown: Cn, onMouseEnter: Pn, onMouseOut: nr, type: "target" })
      )
    );
  };
  return t.displayName = "EdgeWrapper", N.memo(t);
};
function qk(e) {
  const t = {
    default: ar(e.default || Ms),
    straight: ar(e.bezier || dc),
    step: ar(e.step || fc),
    smoothstep: ar(e.step || tl),
    simplebezier: ar(e.simplebezier || cc)
  }, n = {}, r = Object.keys(e).filter((o) => !["default", "bezier"].includes(o)).reduce((o, i) => (o[i] = ar(e[i] || Ms), o), n);
  return {
    ...t,
    ...r
  };
}
function kd(e, t, n = null) {
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
function Sd(e, t) {
  return e ? e.length === 1 || !t ? e[0] : t && e.find((n) => n.id === t) || null : null;
}
const Kk = (e, t, n, r, o, i) => {
  const s = kd(n, e, t), l = kd(i, r, o);
  return {
    sourceX: s.x,
    sourceY: s.y,
    targetX: l.x,
    targetY: l.y
  };
};
function Gk({ sourcePos: e, targetPos: t, sourceWidth: n, sourceHeight: r, targetWidth: o, targetHeight: i, width: s, height: l, transform: a }) {
  const u = {
    x: Math.min(e.x, t.x),
    y: Math.min(e.y, t.y),
    x2: Math.max(e.x + n, t.x + o),
    y2: Math.max(e.y + r, t.y + i)
  };
  u.x === u.x2 && (u.x2 += 1), u.y === u.y2 && (u.y2 += 1);
  const c = Qo({
    x: (0 - a[0]) / a[2],
    y: (0 - a[1]) / a[2],
    width: s / a[2],
    height: l / a[2]
  }), f = Math.max(0, Math.min(c.x2, u.x2) - Math.max(c.x, u.x)), d = Math.max(0, Math.min(c.y2, u.y2) - Math.max(c.y, u.y));
  return Math.ceil(f * d) > 0;
}
function Ed(e) {
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
const Qk = [{ level: 0, isMaxLevel: !0, edges: [] }];
function Zk(e, t, n = !1) {
  let r = -1;
  const o = e.reduce((s, l) => {
    var c, f;
    const a = ut(l.zIndex);
    let u = a ? l.zIndex : 0;
    if (n) {
      const d = t.get(l.target), p = t.get(l.source), w = l.selected || (d == null ? void 0 : d.selected) || (p == null ? void 0 : p.selected), y = Math.max(((c = p == null ? void 0 : p[me]) == null ? void 0 : c.z) || 0, ((f = d == null ? void 0 : d[me]) == null ? void 0 : f.z) || 0, 1e3);
      u = (a ? l.zIndex : 0) + (w ? y : 0);
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
  return i.length === 0 ? Qk : i;
}
function Jk(e, t, n) {
  const r = se(N.useCallback((o) => e ? o.edges.filter((i) => {
    const s = t.get(i.source), l = t.get(i.target);
    return (s == null ? void 0 : s.width) && (s == null ? void 0 : s.height) && (l == null ? void 0 : l.width) && (l == null ? void 0 : l.height) && Gk({
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
  return Zk(r, t, n);
}
const eS = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", points: "-5,-4 0,0 -5,4" }), tS = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  fill: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" }), Nd = {
  [Jo.Arrow]: eS,
  [Jo.ArrowClosed]: tS
};
function nS(e) {
  const t = Ee();
  return N.useMemo(() => {
    var o, i;
    return Object.prototype.hasOwnProperty.call(Nd, e) ? Nd[e] : ((i = (o = t.getState()).onError) == null || i.call(o, "009", Gt.error009(e)), null);
  }, [e]);
}
const rS = ({ id: e, type: t, color: n, width: r = 12.5, height: o = 12.5, markerUnits: i = "strokeWidth", strokeWidth: s, orient: l = "auto-start-reverse" }) => {
  const a = nS(t);
  return a ? I.createElement(
    "marker",
    { className: "react-flow__arrowhead", id: e, markerWidth: `${r}`, markerHeight: `${o}`, viewBox: "-10 -10 20 20", markerUnits: i, orient: l, refX: "0", refY: "0" },
    I.createElement(a, { color: n, strokeWidth: s })
  ) : null;
}, oS = ({ defaultColor: e, rfId: t }) => (n) => {
  const r = [];
  return n.edges.reduce((o, i) => ([i.markerStart, i.markerEnd].forEach((s) => {
    if (s && typeof s == "object") {
      const l = Qa(s, t);
      r.includes(l) || (o.push({ id: l, color: s.color || e, ...s }), r.push(l));
    }
  }), o), []).sort((o, i) => String(o && o.id || '').localeCompare(String(i && i.id || '')));
}, dg = ({ defaultColor: e, rfId: t }) => {
  const n = se(
    N.useCallback(oS({ defaultColor: e, rfId: t }), [e, t]),
    // the id includes all marker options, so we just need to look at that part of the marker
    (r, o) => !(r.length !== o.length || r.some((i, s) => i.id !== o[s].id))
  );
  return I.createElement("defs", null, n.map((r) => I.createElement(rS, { id: r.id, key: r.id, type: r.type, color: r.color, width: r.width, height: r.height, markerUnits: r.markerUnits, strokeWidth: r.strokeWidth, orient: r.orient })));
};
dg.displayName = "MarkerDefinitions";
var iS = N.memo(dg);
const sS = (e) => ({
  nodesConnectable: e.nodesConnectable,
  edgesFocusable: e.edgesFocusable,
  edgesUpdatable: e.edgesUpdatable,
  elementsSelectable: e.elementsSelectable,
  width: e.width,
  height: e.height,
  connectionMode: e.connectionMode,
  nodeInternals: e.nodeInternals,
  onError: e.onError
}), pg = ({ defaultMarkerColor: e, onlyRenderVisibleElements: t, elevateEdgesOnSelect: n, rfId: r, edgeTypes: o, noPanClassName: i, onEdgeContextMenu: s, onEdgeMouseEnter: l, onEdgeMouseMove: a, onEdgeMouseLeave: u, onEdgeClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: w, reconnectRadius: y, children: k, disableKeyboardA11y: h }) => {
  const { edgesFocusable: m, edgesUpdatable: v, elementsSelectable: x, width: C, height: z, connectionMode: T, nodeInternals: P, onError: $ } = se(sS, Pe), D = Jk(t, P, n);
  return C ? I.createElement(
    I.Fragment,
    null,
    D.map(({ level: F, edges: b, isMaxLevel: H }) => I.createElement(
      "svg",
      { key: F, style: { zIndex: F }, width: C, height: z, className: "react-flow__edges react-flow__container" },
      H && I.createElement(iS, { defaultColor: e, rfId: r }),
      I.createElement("g", null, b.map((S) => {
        const [A, j, O] = Ed(P.get(S.source)), [E, _, M] = Ed(P.get(S.target));
        if (!O || !M)
          return null;
        let R = S.type || "default";
        o[R] || ($ == null || $("011", Gt.error011(R)), R = "default");
        const L = o[R] || o.default, B = T === Gn.Strict ? _.target : (_.target ?? []).concat(_.source ?? []), U = Sd(j.source, S.sourceHandle), W = Sd(B, S.targetHandle), q = (U == null ? void 0 : U.position) || K.Bottom, Q = (W == null ? void 0 : W.position) || K.Top, te = !!(S.focusable || m && typeof S.focusable > "u"), Z = S.reconnectable || S.updatable, ne = typeof d < "u" && (Z || v && typeof Z > "u");
        if (!U || !W)
          return $ == null || $("008", Gt.error008(U, S)), null;
        const { sourceX: ze, sourceY: we, targetX: be, targetY: Ae } = Kk(A, U, q, E, W, Q);
        return I.createElement(L, { key: S.id, id: S.id, className: $e([S.className, i]), type: R, data: S.data, selected: !!S.selected, animated: !!S.animated, hidden: !!S.hidden, label: S.label, labelStyle: S.labelStyle, labelShowBg: S.labelShowBg, labelBgStyle: S.labelBgStyle, labelBgPadding: S.labelBgPadding, labelBgBorderRadius: S.labelBgBorderRadius, style: S.style, source: S.source, target: S.target, sourceHandleId: S.sourceHandle, targetHandleId: S.targetHandle, markerEnd: S.markerEnd, markerStart: S.markerStart, sourceX: ze, sourceY: we, targetX: be, targetY: Ae, sourcePosition: q, targetPosition: Q, elementsSelectable: x, onContextMenu: s, onMouseEnter: l, onMouseMove: a, onMouseLeave: u, onClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: p, onReconnectEnd: w, reconnectRadius: y, rfId: r, ariaLabel: S.ariaLabel, isFocusable: te, isReconnectable: ne, pathOptions: "pathOptions" in S ? S.pathOptions : void 0, interactionWidth: S.interactionWidth, disableKeyboardA11y: h });
      }))
    )),
    k
  ) : null;
};
pg.displayName = "EdgeRenderer";
var lS = N.memo(pg);
const aS = (e) => `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`;
function uS({ children: e }) {
  const t = se(aS);
  return I.createElement("div", { className: "react-flow__viewport react-flow__container", style: { transform: t } }, e);
}
function cS(e) {
  const t = rl(), n = N.useRef(!1);
  N.useEffect(() => {
    !n.current && t.viewportInitialized && e && (setTimeout(() => e(t), 1), n.current = !0);
  }, [e, t.viewportInitialized]);
}
const fS = {
  [K.Left]: K.Right,
  [K.Right]: K.Left,
  [K.Top]: K.Bottom,
  [K.Bottom]: K.Top
}, hg = ({ nodeId: e, handleType: t, style: n, type: r = an.Bezier, CustomComponent: o, connectionStatus: i }) => {
  var z, T, P;
  const { fromNode: s, handleId: l, toX: a, toY: u, connectionMode: c } = se(N.useCallback(($) => ({
    fromNode: $.nodeInternals.get(e),
    handleId: $.connectionHandleId,
    toX: ($.connectionPosition.x - $.transform[0]) / $.transform[2],
    toY: ($.connectionPosition.y - $.transform[1]) / $.transform[2],
    connectionMode: $.connectionMode
  }), [e]), Pe), f = (z = s == null ? void 0 : s[me]) == null ? void 0 : z.handleBounds;
  let d = f == null ? void 0 : f[t];
  if (c === Gn.Loose && (d = d || (f == null ? void 0 : f[t === "source" ? "target" : "source"])), !s || !d)
    return null;
  const p = l ? d.find(($) => $.id === l) : d[0], w = p ? p.x + p.width / 2 : (s.width ?? 0) / 2, y = p ? p.y + p.height / 2 : s.height ?? 0, k = (((T = s.positionAbsolute) == null ? void 0 : T.x) ?? 0) + w, h = (((P = s.positionAbsolute) == null ? void 0 : P.y) ?? 0) + y, m = p == null ? void 0 : p.position, v = m ? fS[m] : null;
  if (!m || !v)
    return null;
  if (o)
    return I.createElement(o, { connectionLineType: r, connectionLineStyle: n, fromNode: s, fromHandle: p, fromX: k, fromY: h, toX: a, toY: u, fromPosition: m, toPosition: v, connectionStatus: i });
  let x = "";
  const C = {
    sourceX: k,
    sourceY: h,
    sourcePosition: m,
    targetX: a,
    targetY: u,
    targetPosition: v
  };
  return r === an.Bezier ? [x] = pc(C) : r === an.Step ? [x] = Ga({
    ...C,
    borderRadius: 0
  }) : r === an.SmoothStep ? [x] = Ga(C) : r === an.SimpleBezier ? [x] = bm(C) : x = `M${k},${h} ${a},${u}`, I.createElement("path", { d: x, fill: "none", className: "react-flow__connection-path", style: n });
};
hg.displayName = "ConnectionLine";
const dS = (e) => ({
  nodeId: e.connectionNodeId,
  handleType: e.connectionHandleType,
  nodesConnectable: e.nodesConnectable,
  connectionStatus: e.connectionStatus,
  width: e.width,
  height: e.height
});
function pS({ containerStyle: e, style: t, type: n, component: r }) {
  const { nodeId: o, handleType: i, nodesConnectable: s, width: l, height: a, connectionStatus: u } = se(dS, Pe);
  return !(o && i && l && s) ? null : I.createElement(
    "svg",
    { style: e, width: l, height: a, className: "react-flow__edges react-flow__connectionline react-flow__container" },
    I.createElement(
      "g",
      { className: $e(["react-flow__connection", u]) },
      I.createElement(hg, { nodeId: o, handleType: i, style: t, type: n, CustomComponent: r, connectionStatus: u })
    )
  );
}
function Cd(e, t) {
  return N.useRef(null), Ee(), N.useMemo(() => t(e), [e]);
}
const mg = ({ nodeTypes: e, edgeTypes: t, onMove: n, onMoveStart: r, onMoveEnd: o, onInit: i, onNodeClick: s, onEdgeClick: l, onNodeDoubleClick: a, onEdgeDoubleClick: u, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, onSelectionContextMenu: w, onSelectionStart: y, onSelectionEnd: k, connectionLineType: h, connectionLineStyle: m, connectionLineComponent: v, connectionLineContainerStyle: x, selectionKeyCode: C, selectionOnDrag: z, selectionMode: T, multiSelectionKeyCode: P, panActivationKeyCode: $, zoomActivationKeyCode: D, deleteKeyCode: F, onlyRenderVisibleElements: b, elementsSelectable: H, selectNodesOnDrag: S, defaultViewport: A, translateExtent: j, minZoom: O, maxZoom: E, preventScrolling: _, defaultMarkerColor: M, zoomOnScroll: R, zoomOnPinch: L, panOnScroll: B, panOnScrollSpeed: U, panOnScrollMode: W, zoomOnDoubleClick: q, panOnDrag: Q, onPaneClick: te, onPaneMouseEnter: Z, onPaneMouseMove: ne, onPaneMouseLeave: ze, onPaneScroll: we, onPaneContextMenu: be, onEdgeContextMenu: Ae, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: qr, noDragClassName: Jn, noWheelClassName: er, noPanClassName: It, elevateEdgesOnSelect: tr, disableKeyboardA11y: Cn, nodeOrigin: Pn, nodeExtent: nr, rfId: rr }) => {
  const Kr = Cd(e, Hk), Re = Cd(t, qk);
  return cS(i), I.createElement(
    bk,
    { onPaneClick: te, onPaneMouseEnter: Z, onPaneMouseMove: ne, onPaneMouseLeave: ze, onPaneContextMenu: be, onPaneScroll: we, deleteKeyCode: F, selectionKeyCode: C, selectionOnDrag: z, selectionMode: T, onSelectionStart: y, onSelectionEnd: k, multiSelectionKeyCode: P, panActivationKeyCode: $, zoomActivationKeyCode: D, elementsSelectable: H, onMove: n, onMoveStart: r, onMoveEnd: o, zoomOnScroll: R, zoomOnPinch: L, zoomOnDoubleClick: q, panOnScroll: B, panOnScrollSpeed: U, panOnScrollMode: W, panOnDrag: Q, defaultViewport: A, translateExtent: j, minZoom: O, maxZoom: E, onSelectionContextMenu: w, preventScrolling: _, noDragClassName: Jn, noWheelClassName: er, noPanClassName: It, disableKeyboardA11y: Cn },
    I.createElement(
      uS,
      null,
      I.createElement(
        lS,
        { edgeTypes: Re, onEdgeClick: l, onEdgeDoubleClick: u, onlyRenderVisibleElements: b, onEdgeContextMenu: Ae, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: Rt, reconnectRadius: qr, defaultMarkerColor: M, noPanClassName: It, elevateEdgesOnSelect: !!tr, disableKeyboardA11y: Cn, rfId: rr },
        I.createElement(pS, { style: m, type: h, component: v, containerStyle: x })
      ),
      I.createElement("div", { className: "react-flow__edgelabel-renderer" }),
      I.createElement(Uk, { nodeTypes: Kr, onNodeClick: s, onNodeDoubleClick: a, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: p, selectNodesOnDrag: S, onlyRenderVisibleElements: b, noPanClassName: It, noDragClassName: Jn, disableKeyboardA11y: Cn, nodeOrigin: Pn, nodeExtent: nr, rfId: rr })
    )
  );
};
mg.displayName = "GraphView";
var hS = N.memo(mg);
const tu = [
  [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
], Jt = {
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
  translateExtent: tu,
  nodeExtent: tu,
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
  onError: H_,
  isValidConnection: void 0
}, mS = () => nx((e, t) => ({
  ...Jt,
  setNodes: (n) => {
    const { nodeInternals: r, nodeOrigin: o, elevateNodesOnSelect: i } = t();
    e({ nodeInternals: Hl(n, r, o, i) });
  },
  getNodes: () => Array.from(t().nodeInternals.values()),
  setEdges: (n) => {
    const { defaultEdgeOptions: r = {} } = t();
    e({ edges: n.map((o) => ({ ...r, ...o })) });
  },
  setDefaultNodesAndEdges: (n, r) => {
    const o = typeof n < "u", i = typeof r < "u", s = o ? Hl(n, /* @__PURE__ */ new Map(), t().nodeOrigin, t().elevateNodesOnSelect) : /* @__PURE__ */ new Map();
    e({ nodeInternals: s, edges: i ? r : [], hasDefaultNodes: o, hasDefaultEdges: i });
  },
  updateNodeDimensions: (n) => {
    const { onNodesChange: r, nodeInternals: o, fitViewOnInit: i, fitViewOnInitDone: s, fitViewOnInitOptions: l, domNode: a, nodeOrigin: u } = t(), c = a == null ? void 0 : a.querySelector(".react-flow__viewport");
    if (!c)
      return;
    const f = window.getComputedStyle(c), { m22: d } = new window.DOMMatrixReadOnly(f.transform), p = n.reduce((y, k) => {
      const h = o.get(k.id);
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
        const m = ac(k.nodeElement);
        !!(m.width && m.height && (h.width !== m.width || h.height !== m.height || k.forceUpdate)) && (o.set(h.id, {
          ...h,
          [me]: {
            ...h[me],
            handleBounds: {
              source: xd(".source", k.nodeElement, d, u),
              target: xd(".target", k.nodeElement, d, u)
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
    rg(o, u);
    const w = s || i && !s && og(t, { initial: !0, ...l });
    e({ nodeInternals: new Map(o), fitViewOnInitDone: w }), (p == null ? void 0 : p.length) > 0 && (r == null || r(p));
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
        const u = Mk(n, l()), c = Hl(u, o, s, a);
        e({ nodeInternals: c });
      }
      r == null || r(n);
    }
  },
  addSelectedNodes: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((a) => on(a, !0)) : (s = kr(i(), n), l = kr(o, [])), Ii({
      changedNodes: s,
      changedEdges: l,
      get: t,
      set: e
    });
  },
  addSelectedEdges: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((a) => on(a, !0)) : (s = kr(o, n), l = kr(i(), [])), Ii({
      changedNodes: l,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  unselectNodesAndEdges: ({ nodes: n, edges: r } = {}) => {
    const { edges: o, getNodes: i } = t(), s = n || i(), l = r || o, a = s.map((c) => (c.selected = !1, on(c.id, !1))), u = l.map((c) => on(c.id, !1));
    Ii({
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
    const { edges: n, getNodes: r } = t(), i = r().filter((l) => l.selected).map((l) => on(l.id, !1)), s = n.filter((l) => l.selected).map((l) => on(l.id, !1));
    Ii({
      changedNodes: i,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  setNodeExtent: (n) => {
    const { nodeInternals: r } = t();
    r.forEach((o) => {
      o.positionAbsolute = uc(o.position, n);
    }), e({
      nodeExtent: n,
      nodeInternals: new Map(r)
    });
  },
  panBy: (n) => {
    const { transform: r, width: o, height: i, d3Zoom: s, d3Selection: l, translateExtent: a } = t();
    if (!s || !l || !n.x && !n.y)
      return !1;
    const u = Ut.translate(r[0] + n.x, r[1] + n.y).scale(r[2]), c = [
      [0, 0],
      [o, i]
    ], f = s == null ? void 0 : s.constrain()(u, c, a);
    return s.transform(l, f), r[0] !== f.x || r[1] !== f.y || r[2] !== f.k;
  },
  cancelConnection: () => e({
    connectionNodeId: Jt.connectionNodeId,
    connectionHandleId: Jt.connectionHandleId,
    connectionHandleType: Jt.connectionHandleType,
    connectionStatus: Jt.connectionStatus,
    connectionStartHandle: Jt.connectionStartHandle,
    connectionEndHandle: Jt.connectionEndHandle
  }),
  reset: () => e({ ...Jt })
}), Object.is), vc = ({ children: e }) => {
  const t = N.useRef(null);
  return t.current || (t.current = mS()), I.createElement(R_, { value: t.current }, e);
};
vc.displayName = "ReactFlowProvider";
const gg = ({ children: e }) => N.useContext(el) ? I.createElement(I.Fragment, null, e) : I.createElement(vc, null, e);
gg.displayName = "ReactFlowWrapper";
const gS = {
  input: Gm,
  default: Ja,
  output: Zm,
  group: gc
}, yS = {
  default: Ms,
  straight: dc,
  step: fc,
  smoothstep: tl,
  simplebezier: cc
}, vS = [0, 0], xS = [15, 15], wS = { x: 0, y: 0, zoom: 1 }, _S = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  zIndex: 0
}, yg = N.forwardRef(({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, className: o, nodeTypes: i = gS, edgeTypes: s = yS, onNodeClick: l, onEdgeClick: a, onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onConnect: p, onConnectStart: w, onConnectEnd: y, onClickConnectStart: k, onClickConnectEnd: h, onNodeMouseEnter: m, onNodeMouseMove: v, onNodeMouseLeave: x, onNodeContextMenu: C, onNodeDoubleClick: z, onNodeDragStart: T, onNodeDrag: P, onNodeDragStop: $, onNodesDelete: D, onEdgesDelete: F, onSelectionChange: b, onSelectionDragStart: H, onSelectionDrag: S, onSelectionDragStop: A, onSelectionContextMenu: j, onSelectionStart: O, onSelectionEnd: E, connectionMode: _ = Gn.Strict, connectionLineType: M = an.Bezier, connectionLineStyle: R, connectionLineComponent: L, connectionLineContainerStyle: B, deleteKeyCode: U = "Backspace", selectionKeyCode: W = "Shift", selectionOnDrag: q = !1, selectionMode: Q = Zo.Full, panActivationKeyCode: te = "Space", multiSelectionKeyCode: Z = js() ? "Meta" : "Control", zoomActivationKeyCode: ne = js() ? "Meta" : "Control", snapToGrid: ze = !1, snapGrid: we = xS, onlyRenderVisibleElements: be = !1, selectNodesOnDrag: Ae = !0, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, nodeOrigin: G = vS, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: qr, defaultViewport: Jn = wS, minZoom: er = 0.5, maxZoom: It = 2, translateExtent: tr = tu, preventScrolling: Cn = !0, nodeExtent: Pn, defaultMarkerColor: nr = "#b1b1b7", zoomOnScroll: rr = !0, zoomOnPinch: Kr = !0, panOnScroll: Re = !1, panOnScrollSpeed: ht = 0.5, panOnScrollMode: zn = bn.Free, zoomOnDoubleClick: jn = !0, panOnDrag: Mn = !0, onPaneClick: Dt, onPaneMouseEnter: Ct, onPaneMouseMove: Gr, onPaneMouseLeave: sl, onPaneScroll: Qr, onPaneContextMenu: ll, children: Ec, onEdgeContextMenu: Tn, onEdgeDoubleClick: Pg, onEdgeMouseEnter: zg, onEdgeMouseMove: jg, onEdgeMouseLeave: Mg, onEdgeUpdate: Tg, onEdgeUpdateStart: $g, onEdgeUpdateEnd: Ag, onReconnect: Rg, onReconnectStart: Ig, onReconnectEnd: Dg, reconnectRadius: Lg = 10, edgeUpdaterRadius: Og = 10, onNodesChange: bg, onEdgesChange: Fg, noDragClassName: Hg = "nodrag", noWheelClassName: Vg = "nowheel", noPanClassName: Nc = "nopan", fitView: Bg = !1, fitViewOptions: Ug, connectOnClick: Wg = !0, attributionPosition: Yg, proOptions: Xg, defaultEdgeOptions: qg, elevateNodesOnSelect: Kg = !0, elevateEdgesOnSelect: Gg = !1, disableKeyboardA11y: Cc = !1, autoPanOnConnect: Qg = !0, autoPanOnNodeDrag: Zg = !0, connectionRadius: Jg = 20, isValidConnection: e0, onError: t0, style: n0, id: Pc, nodeDragThreshold: r0, ...o0 }, i0) => {
  const al = Pc || "1";
  return I.createElement(
    "div",
    { ...o0, style: { ...n0, ..._S }, ref: i0, className: $e(["react-flow", o]), "data-testid": "rf__wrapper", id: Pc },
    I.createElement(
      gg,
      null,
      I.createElement(hS, { onInit: u, onMove: c, onMoveStart: f, onMoveEnd: d, onNodeClick: l, onEdgeClick: a, onNodeMouseEnter: m, onNodeMouseMove: v, onNodeMouseLeave: x, onNodeContextMenu: C, onNodeDoubleClick: z, nodeTypes: i, edgeTypes: s, connectionLineType: M, connectionLineStyle: R, connectionLineComponent: L, connectionLineContainerStyle: B, selectionKeyCode: W, selectionOnDrag: q, selectionMode: Q, deleteKeyCode: U, multiSelectionKeyCode: Z, panActivationKeyCode: te, zoomActivationKeyCode: ne, onlyRenderVisibleElements: be, selectNodesOnDrag: Ae, defaultViewport: Jn, translateExtent: tr, minZoom: er, maxZoom: It, preventScrolling: Cn, zoomOnScroll: rr, zoomOnPinch: Kr, zoomOnDoubleClick: jn, panOnScroll: Re, panOnScrollSpeed: ht, panOnScrollMode: zn, panOnDrag: Mn, onPaneClick: Dt, onPaneMouseEnter: Ct, onPaneMouseMove: Gr, onPaneMouseLeave: sl, onPaneScroll: Qr, onPaneContextMenu: ll, onSelectionContextMenu: j, onSelectionStart: O, onSelectionEnd: E, onEdgeContextMenu: Tn, onEdgeDoubleClick: Pg, onEdgeMouseEnter: zg, onEdgeMouseMove: jg, onEdgeMouseLeave: Mg, onReconnect: Rg ?? Tg, onReconnectStart: Ig ?? $g, onReconnectEnd: Dg ?? Ag, reconnectRadius: Lg ?? Og, defaultMarkerColor: nr, noDragClassName: Hg, noWheelClassName: Vg, noPanClassName: Nc, elevateEdgesOnSelect: Gg, rfId: al, disableKeyboardA11y: Cc, nodeOrigin: G, nodeExtent: Pn }),
      I.createElement(ck, { nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: p, onConnectStart: w, onConnectEnd: y, onClickConnectStart: k, onClickConnectEnd: h, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, edgesFocusable: Fe, edgesUpdatable: Rt, elementsSelectable: qr, elevateNodesOnSelect: Kg, minZoom: er, maxZoom: It, nodeExtent: Pn, onNodesChange: bg, onEdgesChange: Fg, snapToGrid: ze, snapGrid: we, connectionMode: _, translateExtent: tr, connectOnClick: Wg, defaultEdgeOptions: qg, fitView: Bg, fitViewOptions: Ug, onNodesDelete: D, onEdgesDelete: F, onNodeDragStart: T, onNodeDrag: P, onNodeDragStop: $, onSelectionDrag: S, onSelectionDragStart: H, onSelectionDragStop: A, noPanClassName: Nc, nodeOrigin: G, rfId: al, autoPanOnConnect: Qg, autoPanOnNodeDrag: Zg, onError: t0, connectionRadius: Jg, isValidConnection: e0, nodeDragThreshold: r0 }),
      I.createElement(ak, { onSelectionChange: b }),
      Ec,
      I.createElement(D_, { proOptions: Xg, position: Yg }),
      I.createElement(mk, { rfId: al, disableKeyboardA11y: Cc })
    )
  );
});
yg.displayName = "ReactFlow";
const kS = (e) => {
  var t;
  return (t = e.domNode) == null ? void 0 : t.querySelector(".react-flow__edgelabel-renderer");
};
function SS({ children: e }) {
  const t = se(kS);
  return t ? Xh.createPortal(e, t) : null;
}
const vg = ({ id: e, x: t, y: n, width: r, height: o, style: i, color: s, strokeColor: l, strokeWidth: a, className: u, borderRadius: c, shapeRendering: f, onClick: d, selected: p }) => {
  const { background: w, backgroundColor: y } = i || {}, k = s || w || y;
  return I.createElement("rect", { className: $e(["react-flow__minimap-node", { selected: p }, u]), x: t, y: n, rx: c, ry: c, width: r, height: o, fill: k, stroke: l, strokeWidth: a, shapeRendering: f, onClick: d ? (h) => d(h, e) : void 0 });
};
vg.displayName = "MiniMapNode";
var ES = N.memo(vg);
const NS = (e) => e.nodeOrigin, CS = (e) => e.getNodes().filter((t) => !t.hidden && t.width && t.height), Wl = (e) => e instanceof Function ? e : () => e;
function PS({
  nodeStrokeColor: e = "transparent",
  nodeColor: t = "#e2e2e2",
  nodeClassName: n = "",
  nodeBorderRadius: r = 5,
  nodeStrokeWidth: o = 2,
  // We need to rename the prop to be `CapitalCase` so that JSX will render it as
  // a component properly.
  nodeComponent: i = ES,
  onClick: s
}) {
  const l = se(CS, Pe), a = se(NS), u = Wl(t), c = Wl(e), f = Wl(n), d = typeof window > "u" || window.chrome ? "crispEdges" : "geometricPrecision";
  return I.createElement(I.Fragment, null, l.map((p) => {
    const { x: w, y } = Bn(p, a).positionAbsolute;
    return I.createElement(i, { key: p.id, x: w, y, width: p.width, height: p.height, style: p.style, selected: p.selected, className: f(p), color: u(p), borderRadius: r, strokeColor: c(p), strokeWidth: o, shapeRendering: d, onClick: s, id: p.id });
  }));
}
var zS = N.memo(PS);
const jS = 200, MS = 150, TS = (e) => {
  const t = e.getNodes(), n = {
    x: -e.transform[0] / e.transform[2],
    y: -e.transform[1] / e.transform[2],
    width: e.width / e.transform[2],
    height: e.height / e.transform[2]
  };
  return {
    viewBB: n,
    boundingRect: t.length > 0 ? b_(nl(t, e.nodeOrigin), n) : n,
    rfId: e.rfId
  };
}, $S = "react-flow__minimap-desc";
function xg({
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
  pannable: w = !1,
  zoomable: y = !1,
  ariaLabel: k = "React Flow mini map",
  inversePan: h = !1,
  zoomStep: m = 10,
  offsetScale: v = 5
}) {
  const x = Ee(), C = N.useRef(null), { boundingRect: z, viewBB: T, rfId: P } = se(TS, Pe), $ = (e == null ? void 0 : e.width) ?? jS, D = (e == null ? void 0 : e.height) ?? MS, F = z.width / $, b = z.height / D, H = Math.max(F, b), S = H * $, A = H * D, j = v * H, O = z.x - (S - z.width) / 2 - j, E = z.y - (A - z.height) / 2 - j, _ = S + j * 2, M = A + j * 2, R = `${$S}-${P}`, L = N.useRef(0);
  L.current = H, N.useEffect(() => {
    if (C.current) {
      const W = lt(C.current), q = (Z) => {
        const { transform: ne, d3Selection: ze, d3Zoom: we } = x.getState();
        if (Z.sourceEvent.type !== "wheel" || !ze || !we)
          return;
        const be = -Z.sourceEvent.deltaY * (Z.sourceEvent.deltaMode === 1 ? 0.05 : Z.sourceEvent.deltaMode ? 1 : 2e-3) * m, Ae = ne[2] * Math.pow(2, be);
        we.scaleTo(ze, Ae);
      }, Q = (Z) => {
        const { transform: ne, d3Selection: ze, d3Zoom: we, translateExtent: be, width: Ae, height: ge } = x.getState();
        if (Z.sourceEvent.type !== "mousemove" || !ze || !we)
          return;
        const Qe = L.current * Math.max(1, ne[2]) * (h ? -1 : 1), ie = {
          x: ne[0] - Z.sourceEvent.movementX * Qe,
          y: ne[1] - Z.sourceEvent.movementY * Qe
        }, G = [
          [0, 0],
          [Ae, ge]
        ], Fe = Ut.translate(ie.x, ie.y).scale(ne[2]), Rt = we.constrain()(Fe, G, be);
        we.transform(ze, Rt);
      }, te = jm().on("zoom", w ? Q : null).on("zoom.wheel", y ? q : null);
      return W.call(te), () => {
        W.on("zoom", null);
      };
    }
  }, [w, y, h, m]);
  const B = d ? (W) => {
    const q = xt(W);
    d(W, { x: q[0], y: q[1] });
  } : void 0, U = p ? (W, q) => {
    const Q = x.getState().nodeInternals.get(q);
    p(W, Q);
  } : void 0;
  return I.createElement(
    lc,
    { position: f, style: e, className: $e(["react-flow__minimap", t]), "data-testid": "rf__minimap" },
    I.createElement(
      "svg",
      { width: $, height: D, viewBox: `${O} ${E} ${_} ${M}`, role: "img", "aria-labelledby": R, ref: C, onClick: B },
      k && I.createElement("title", { id: R }, k),
      I.createElement(zS, { onClick: U, nodeColor: r, nodeStrokeColor: n, nodeBorderRadius: i, nodeClassName: o, nodeStrokeWidth: s, nodeComponent: l }),
      I.createElement("path", { className: "react-flow__minimap-mask", d: `M${O - j},${E - j}h${_ + j * 2}v${M + j * 2}h${-_ - j * 2}z
        M${T.x},${T.y}h${T.width}v${T.height}h${-T.width}z`, fill: a, fillRule: "evenodd", stroke: u, strokeWidth: c, pointerEvents: "none" })
    )
  );
}
xg.displayName = "MiniMap";
var AS = N.memo(xg);
function RS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32" },
    I.createElement("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" })
  );
}
function IS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5" },
    I.createElement("path", { d: "M0 0h32v4.2H0z" })
  );
}
function DS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30" },
    I.createElement("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" })
  );
}
function LS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" })
  );
}
function OS() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" })
  );
}
const vo = ({ children: e, className: t, ...n }) => I.createElement("button", { type: "button", className: $e(["react-flow__controls-button", t]), ...n }, e);
vo.displayName = "ControlButton";
const bS = (e) => ({
  isInteractive: e.nodesDraggable || e.nodesConnectable || e.elementsSelectable,
  minZoomReached: e.transform[2] <= e.minZoom,
  maxZoomReached: e.transform[2] >= e.maxZoom
}), wg = ({ style: e, showZoom: t = !0, showFitView: n = !0, showInteractive: r = !0, fitViewOptions: o, onZoomIn: i, onZoomOut: s, onFitView: l, onInteractiveChange: a, className: u, children: c, position: f = "bottom-left" }) => {
  const d = Ee(), [p, w] = N.useState(!1), { isInteractive: y, minZoomReached: k, maxZoomReached: h } = se(bS, Pe), { zoomIn: m, zoomOut: v, fitView: x } = rl();
  if (N.useEffect(() => {
    w(!0);
  }, []), !p)
    return null;
  const C = () => {
    m(), i == null || i();
  }, z = () => {
    v(), s == null || s();
  }, T = () => {
    x(o), l == null || l();
  }, P = () => {
    d.setState({
      nodesDraggable: !y,
      nodesConnectable: !y,
      elementsSelectable: !y
    }), a == null || a(!y);
  };
  return I.createElement(
    lc,
    { className: $e(["react-flow__controls", u]), position: f, style: e, "data-testid": "rf__controls" },
    t && I.createElement(
      I.Fragment,
      null,
      I.createElement(
        vo,
        { onClick: C, className: "react-flow__controls-zoomin", title: "zoom in", "aria-label": "zoom in", disabled: h },
        I.createElement(RS, null)
      ),
      I.createElement(
        vo,
        { onClick: z, className: "react-flow__controls-zoomout", title: "zoom out", "aria-label": "zoom out", disabled: k },
        I.createElement(IS, null)
      )
    ),
    n && I.createElement(
      vo,
      { className: "react-flow__controls-fitview", onClick: T, title: "fit view", "aria-label": "fit view" },
      I.createElement(DS, null)
    ),
    r && I.createElement(vo, { className: "react-flow__controls-interactive", onClick: P, title: "toggle interactivity", "aria-label": "toggle interactivity" }, y ? I.createElement(OS, null) : I.createElement(LS, null)),
    c
  );
};
wg.displayName = "Controls";
var FS = N.memo(wg), ft;
(function(e) {
  e.Lines = "lines", e.Dots = "dots", e.Cross = "cross";
})(ft || (ft = {}));
function HS({ color: e, dimensions: t, lineWidth: n }) {
  return I.createElement("path", { stroke: e, strokeWidth: n, d: `M${t[0] / 2} 0 V${t[1]} M0 ${t[1] / 2} H${t[0]}` });
}
function VS({ color: e, radius: t }) {
  return I.createElement("circle", { cx: t, cy: t, r: t, fill: e });
}
const BS = {
  [ft.Dots]: "#91919a",
  [ft.Lines]: "#eee",
  [ft.Cross]: "#e2e2e2"
}, US = {
  [ft.Dots]: 1,
  [ft.Lines]: 1,
  [ft.Cross]: 6
}, WS = (e) => ({ transform: e.transform, patternId: `pattern-${e.rfId}` });
function _g({
  id: e,
  variant: t = ft.Dots,
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
  const u = N.useRef(null), { transform: c, patternId: f } = se(WS, Pe), d = s || BS[t], p = r || US[t], w = t === ft.Dots, y = t === ft.Cross, k = Array.isArray(n) ? n : [n, n], h = [k[0] * c[2] || 1, k[1] * c[2] || 1], m = p * c[2], v = y ? [m, m] : h, x = w ? [m / i, m / i] : [v[0] / i, v[1] / i];
  return I.createElement(
    "svg",
    { className: $e(["react-flow__background", a]), style: {
      ...l,
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0
    }, ref: u, "data-testid": "rf__background" },
    I.createElement("pattern", { id: f + e, x: c[0] % h[0], y: c[1] % h[1], width: h[0], height: h[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${x[0]},-${x[1]})` }, w ? I.createElement(VS, { color: d, radius: m / i }) : I.createElement(HS, { dimensions: v, color: d, lineWidth: o })),
    I.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${f + e})` })
  );
}
_g.displayName = "Background";
var YS = N.memo(_g);
const kg = {}, { useDebugValue: XS } = I, { useSyncExternalStoreWithSelector: qS } = Jh;
let Pd = !1;
const KS = (e) => e;
function GS(e, t = KS, n) {
  (kg ? "production" : void 0) !== "production" && n && !Pd && (console.warn(
    "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
  ), Pd = !0);
  const r = qS(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return XS(r), r;
}
const zd = (e) => {
  (kg ? "production" : void 0) !== "production" && typeof e != "function" && console.warn(
    "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
  );
  const t = typeof e == "function" ? em(e) : e, n = (r, o) => GS(t, r, o);
  return Object.assign(n, t), n;
}, QS = (e) => e ? zd(e) : zd, xc = {
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
}, Sg = {
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
}, ZS = [
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
function ol(e) {
  let t = String(e || "");
  for (const [n, r] of ZS) t = t.replace(n, r);
  return t;
}
function kn(e, t) {
  var n;
  return ((n = Sg[e]) == null ? void 0 : n.nombre) || ol(t) || e;
}
function ti(e, t) {
  var n;
  return ((n = Sg[e]) == null ? void 0 : n.que) || ol(t);
}
const wc = {
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
  ms: { titulo: "Cuánto esperar", ayuda: "En milisegundos: 1000 = 1 segundo · 60000 = 1 minuto · 3600000 = 1 hora." },
  cronExpression: { titulo: "Cuándo se repite", ayuda: "Ejemplos: «0 9 * * 1» = cada lunes a las 9:00 · «*/15 * * * *» = cada 15 minutos · «0 7 * * *» = todos los días a las 7:00." },
  timezone: { titulo: "Zona horaria", avanzado: !0 },
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
function JS(e) {
  const t = String(e || "").replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : e;
}
function _c(e, t) {
  var n;
  return ((n = wc[e]) == null ? void 0 : n.titulo) || ol(t == null ? void 0 : t.title) || JS(e);
}
function eE(e, t) {
  var n;
  return ((n = wc[e]) == null ? void 0 : n.ayuda) || ol(t == null ? void 0 : t.description) || void 0;
}
function nu(e, t, n) {
  var r;
  return n ? !1 : !!((r = wc[e]) != null && r.avanzado) || (t == null ? void 0 : t.type) === "object";
}
const tE = {
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
  deleted: "Eliminado",
  fixed: "Un tiempo fijo",
  until: "Hasta una fecha"
};
function ru(e) {
  return tE[e] || e;
}
function nE(e, t) {
  return typeof t == "boolean" ? t ? "Sí" : "No" : e === "cronExpression" ? rE(String(t)) : e === "ms" && Number.isFinite(Number(t)) ? oE(Number(t)) : ru(String(t));
}
const jd = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
function rE(e) {
  const t = String(e || "").trim().split(/\s+/);
  if (t.length !== 5) return e;
  const [n, r, o, i, s] = t, l = (u, c) => `${Number(u)}:${String(Number(c)).padStart(2, "0")}`, a = /^\*\/(\d+)$/;
  if (a.test(n) && r === "*" && o === "*" && i === "*" && s === "*") return `Cada ${n.match(a)[1]} minutos`;
  if (n === "*" && r === "*" && o === "*" && i === "*" && s === "*") return "Cada minuto";
  if (/^\d+$/.test(n) && r === "*" && o === "*" && i === "*" && s === "*") return "Cada hora";
  if (/^\d+$/.test(n) && a.test(r) && o === "*" && i === "*" && s === "*") return `Cada ${r.match(a)[1]} horas`;
  if (/^\d+$/.test(n) && /^\d+$/.test(r) && i === "*") {
    const u = `a las ${l(r, n)}`;
    if (o === "*" && s === "*") return `Todos los días ${u}`;
    if (o === "*" && s === "1-5") return `De lunes a viernes ${u}`;
    if (o === "*" && /^\d$/.test(s)) return `Cada ${jd[Number(s)]} ${u}`;
    if (o === "*" && /^\d(,\d)+$/.test(s)) return `Los ${s.split(",").map((c) => jd[Number(c)]).join(", ")} ${u}`;
    if (/^\d+$/.test(o) && s === "*") return `El día ${Number(o)} de cada mes ${u}`;
  }
  return e;
}
function oE(e) {
  if (e < 1e3) return `${e} milisegundos`;
  const t = e / 1e3;
  if (t < 60) return `${+t.toFixed(1)} ${t === 1 ? "segundo" : "segundos"}`;
  const n = t / 60;
  if (n < 60) return `${+n.toFixed(1)} ${n === 1 ? "minuto" : "minutos"}`;
  const r = n / 60;
  return `${+r.toFixed(1)} ${r === 1 ? "hora" : "horas"}`;
}
function Eg(e) {
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
function iE(e, t, n, r) {
  if (!e || !n) return { ok: !1, reason: "Spec faltante" };
  const o = e.outputs.find((s) => s.name === t), i = n.inputs.find((s) => s.name === r);
  return o ? i ? { ok: !0 } : { ok: !1, reason: `Puerto de entrada "${r}" no existe` } : { ok: !1, reason: `Puerto de salida "${t}" no existe` };
}
function sE(e, t) {
  var o, i;
  if (!t || !t.schema) return [];
  const n = [], r = Array.isArray(t.schema.required) ? t.schema.required : [];
  for (const s of r) {
    const l = (o = e.params) == null ? void 0 : o[s];
    (l == null || l === "") && n.push(`Falta llenar: ${_c(s, ((i = t.schema.properties) == null ? void 0 : i[s]) || {})}`);
  }
  return n;
}
function ve(e, t) {
  return e.find((n) => n.type === t);
}
function ci(e) {
  return (e == null ? void 0 : e.inputs) ?? [];
}
function il(e) {
  return (e == null ? void 0 : e.outputs) ?? [{ name: "main" }];
}
function kc(e = "n") {
  const t = Date.now().toString(36).slice(-4), n = Math.random().toString(36).slice(2, 8);
  return `${e}_${t}${n}`;
}
function xo(e, t, n) {
  const r = n === "in" ? ci(e) : il(e);
  if (r.length <= 1) return "";
  const o = t.name;
  return t.isError || o === "error" ? n === "in" ? "Errores" : "Si falla" : o === "true" ? "Sí se cumple" : o === "false" ? "No se cumple" : o === "done" ? "Al terminar" : o === "default" ? "Otro caso" : /^\d+$/.test(o) ? `Caso ${Number(o) + 1}` : o === "mainB" ? "Entrada B" : o === "main" ? (e == null ? void 0 : e.type) === "loop" ? "Por cada uno" : n === "in" && r.some((i) => i.name === "mainB") ? "Entrada A" : "Sigue" : t.label || o;
}
function Ts(e) {
  const t = il(e), n = t.find((r) => !r.isError) || t[0];
  return n ? n.name : null;
}
function $s(e) {
  const t = ci(e), n = t.find((r) => !r.isError) || t[0];
  return n ? n.name : null;
}
function ni(e, t, n) {
  if (n.source === n.target) return { ok: !1, reason: "Un paso no se puede conectar consigo mismo." };
  const r = e.nodes.find((u) => u.id === n.source), o = e.nodes.find((u) => u.id === n.target);
  if (!r || !o) return { ok: !1 };
  const i = ve(t, r.type), s = ve(t, o.type);
  if (!ci(s).length)
    return {
      ok: !1,
      reason: `«${kn(o.type, s == null ? void 0 : s.displayName)}» es el paso que arranca la automatización: no recibe nada de otros pasos.`
    };
  if (!iE(i, n.sourcePort, s, n.targetPort).ok)
    return { ok: !1, reason: "Esos dos puntos no se pueden unir. Prueba soltando la línea encima del paso." };
  if (e.edges.some(
    (u) => u.source === n.source && u.sourcePort === n.sourcePort && u.target === n.target && u.targetPort === n.targetPort
  )) return { ok: !1, reason: "Esos dos pasos ya están conectados." };
  const a = { ...e, edges: [...e.edges, { id: "__tentativo__", ...n }] };
  return Eg(a) ? { ok: !1, reason: "Esa conexión haría que la automatización diera vueltas sin terminar nunca." } : { ok: !0 };
}
function Sc(e) {
  return { id: kc("e"), ...e };
}
function lE(e, t, n) {
  const r = ve(t, n.type), o = $s(r);
  if (!o) return null;
  const i = e.nodes.filter((u) => {
    if (u.id === n.id || u.disabled) return !1;
    const c = Ts(ve(t, u.type));
    return !!c && !e.edges.some((f) => f.source === u.id && f.sourcePort === c);
  });
  if (!i.length) return null;
  let s;
  if (i.length === 1 ? s = i[0] : s = i.filter((c) => c.position.x < n.position.x).sort(
    (c, f) => Math.hypot(n.position.x - c.position.x, n.position.y - c.position.y) - Math.hypot(n.position.x - f.position.x, n.position.y - f.position.y)
  )[0], !s) return null;
  const l = {
    source: s.id,
    sourcePort: Ts(ve(t, s.type)),
    target: n.id,
    targetPort: o
  }, a = e.nodes.some((u) => u.id === n.id) ? e : { ...e, nodes: [...e.nodes, n] };
  return ni(a, t, l).ok ? { edge: Sc(l), desde: s } : null;
}
function aE(e, t) {
  if (!e.nodes.length) return { x: 100, y: 120 };
  const n = e.nodes.filter((o) => {
    const i = Ts(ve(t, o.type));
    return !!i && !e.edges.some((s) => s.source === o.id && s.sourcePort === i);
  }), r = (n.length ? n : e.nodes).reduce((o, i) => i.position.x > o.position.x ? i : o);
  return { x: r.position.x + 380, y: r.position.y };
}
const Ng = { nodes: [], edges: [] }, Y = QS((e, t) => ({
  graph: Ng,
  catalog: [],
  selectedNodeId: null,
  runContext: null,
  readOnly: !1,
  paletteFilter: "",
  rightView: "none",
  drawerNodeId: null,
  connectedProviders: null,
  setGraph: (n) => e({ graph: cE(n) }),
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
  addNodeConectado: (n) => {
    const { graph: r, catalog: o } = t(), i = lE(r, o, n);
    return e({
      graph: {
        nodes: [...r.nodes, n],
        edges: i ? [...r.edges, i.edge] : r.edges
      }
    }), i ? i.desde : null;
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
    const r = uE(n);
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
function uE(e) {
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
    for (const w of i.get(d) || []) {
      const y = p + 1;
      (!l.has(w) || (l.get(w) || 0) < y) && l.set(w, y), u.has(w) || (u.add(w), a.push(w));
    }
  }
  const c = /* @__PURE__ */ new Map();
  e.nodes.forEach((d) => {
    const p = l.get(d.id) ?? 0;
    c.has(p) || c.set(p, []), c.get(p).push(d.id);
  });
  const f = {};
  for (const [d, p] of Array.from(c.entries())) {
    const w = 80 + d * 380, y = p.length, k = 80 + Math.max(0, 3 - y) * 30;
    p.forEach((h, m) => {
      f[h] = { x: w, y: k + m * 190 };
    });
  }
  return f;
}
function cE(e) {
  return !e || !Array.isArray(e.nodes) ? Ng : {
    nodes: e.nodes.map((t) => ({
      ...t,
      params: t.params || {},
      position: t.position || { x: 0, y: 0 }
    })),
    edges: Array.isArray(e.edges) ? e.edges : []
  };
}
var Cg = { exports: {} };
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
})(Cg);
var fE = Cg.exports;
const ke = /* @__PURE__ */ su(fE);
function Md(e, t) {
  return t <= 1 ? "50%" : `${(e + 1) * 100 / (t + 1)}%`;
}
const dE = ({ id: e, data: t, selected: n }) => {
  var C, z, T;
  const r = Y(
    (P) => {
      var $, D;
      return (D = ($ = P.runContext) == null ? void 0 : $.nodeStates) == null ? void 0 : D[e];
    }
  ), o = Y((P) => {
    var $;
    return (($ = P.runContext) == null ? void 0 : $.status) === "running";
  }), i = Y((P) => P.setSelectedNodeId), s = Y((P) => P.setRightView), l = (r == null ? void 0 : r.status) || "pending", a = r == null ? void 0 : r.durationMs, u = r == null ? void 0 : r.attempt, c = (C = r == null ? void 0 : r.error) == null ? void 0 : C.message, f = t.spec, d = t.flowNode, p = (f == null ? void 0 : f.color) || "#5E72E4", w = ci(f), y = il(f), k = kn(d.type, f == null ? void 0 : f.displayName), h = N.useMemo(() => pE(d.params, f), [d.params, f]), m = N.useCallback(
    (P) => {
      P.stopPropagation(), i(e), s("runs");
    },
    [e, i, s]
  ), v = o && l === "running", x = ((T = (z = r == null ? void 0 : r.output) == null ? void 0 : z.main) == null ? void 0 : T.reduce((P, $) => P + (($ == null ? void 0 : $.length) || 0), 0)) ?? 0;
  return /* @__PURE__ */ g.jsxs(
    "div",
    {
      className: ke("kfc-node", {
        "kfc-node--selected": n,
        "kfc-node--disabled": d.disabled,
        "kfc-node--live": v,
        [`kfc-node--status-${l}`]: !0
      }),
      style: { "--kfc-node-color": p },
      children: [
        w.map((P, $) => /* @__PURE__ */ g.jsx(
          Br,
          {
            id: P.name,
            type: "target",
            position: K.Left,
            className: ke("kfc-node__handle", "kfc-node__handle--in", {
              "kfc-node__handle--error": P.isError
            }),
            style: { top: Md($, w.length) },
            title: "Suelta aquí una línea para que este paso reciba lo del anterior",
            children: xo(f, P, "in") && /* @__PURE__ */ g.jsx("span", { className: "kfc-node__handle-label kfc-node__handle-label--in", children: xo(f, P, "in") })
          },
          `in-${P.name}`
        )),
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-node__header", children: [
          /* @__PURE__ */ g.jsx("i", { className: ke("kfc-node__icon", (f == null ? void 0 : f.icon) || "pi pi-circle") }),
          /* @__PURE__ */ g.jsx("span", { className: "kfc-node__title", title: k, children: k }),
          r && (l === "success" || l === "failed" || l === "skipped") && /* @__PURE__ */ g.jsx(
            "button",
            {
              type: "button",
              className: "kfc-node__info-btn",
              onClick: m,
              title: "Ver qué pasó en este paso",
              "aria-label": "Ver qué pasó en este paso",
              children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-info-circle" })
            }
          ),
          (f == null ? void 0 : f.category) && /* @__PURE__ */ g.jsx("span", { className: "kfc-node__category-badge", children: hE(f.category) })
        ] }),
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-node__body", children: [
          h.length > 0 ? /* @__PURE__ */ g.jsx("ul", { className: "kfc-node__params", children: h.slice(0, 3).map(([P, $]) => /* @__PURE__ */ g.jsxs("li", { title: `${P}: ${$}`, children: [
            /* @__PURE__ */ g.jsxs("b", { children: [
              P,
              ":"
            ] }),
            " ",
            $
          ] }, P)) }) : /* @__PURE__ */ g.jsx("em", { style: { color: "#9ca3af" }, children: "Sin ajustes" }),
          /* @__PURE__ */ g.jsxs("div", { className: "kfc-node__status-row", children: [
            /* @__PURE__ */ g.jsxs("span", { className: ke("kfc-node__status", `kfc-node__status--${l}`), children: [
              v && /* @__PURE__ */ g.jsx("i", { className: "pi pi-spin pi-spinner kfc-node__status-spinner" }),
              !v && l === "success" && /* @__PURE__ */ g.jsx("i", { className: "pi pi-check" }),
              !v && l === "failed" && /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }),
              !v && l === "skipped" && /* @__PURE__ */ g.jsx("i", { className: "pi pi-forward" }),
              mE(l)
            ] }),
            a != null && l !== "running" && /* @__PURE__ */ g.jsx("span", { className: "kfc-node__metric", title: "Duración", children: gE(a) }),
            x > 0 && l === "success" && /* @__PURE__ */ g.jsxs("span", { className: "kfc-node__metric", title: "Registros procesados", children: [
              x,
              " ",
              x === 1 ? "item" : "items"
            ] }),
            u != null && u > 1 && /* @__PURE__ */ g.jsxs(
              "span",
              {
                className: "kfc-node__metric kfc-node__metric--warn",
                title: "Veces que se reintentó",
                children: [
                  "int. ",
                  u
                ]
              }
            )
          ] }),
          c && l === "failed" && /* @__PURE__ */ g.jsx("div", { className: "kfc-node__error", title: c, children: yE(c, 60) })
        ] }),
        y.map((P, $) => /* @__PURE__ */ g.jsx(
          Br,
          {
            id: P.name,
            type: "source",
            position: K.Right,
            className: ke("kfc-node__handle", "kfc-node__handle--out", {
              "kfc-node__handle--error": P.isError
            }),
            style: { top: Md($, y.length) },
            title: "Arrastra desde aquí hasta el siguiente paso",
            children: xo(f, P, "out") && /* @__PURE__ */ g.jsx("span", { className: "kfc-node__handle-label kfc-node__handle-label--out", children: xo(f, P, "out") })
          },
          `out-${P.name}`
        )),
        v && /* @__PURE__ */ g.jsx("div", { className: "kfc-node__live-pulse", "aria-hidden": !0 })
      ]
    }
  );
};
function pE(e, t) {
  var s, l;
  if (!e) return [];
  const n = ((s = t == null ? void 0 : t.schema) == null ? void 0 : s.properties) || {}, r = ((l = t == null ? void 0 : t.schema) == null ? void 0 : l.required) || [], i = Object.entries(e).filter(([, a]) => a != null && a !== "").filter(([a, u]) => typeof u != "object" && !nu(a, n[a] || {}, r.includes(a))).map(([a, u]) => {
    const c = nE(a, u);
    return [_c(a, n[a] || {}), c.slice(0, 40)];
  });
  return !i.length && Object.keys(e).some((a) => e[a] !== void 0 && e[a] !== "") ? [["Ajustes", "configurados"]] : i;
}
function hE(e) {
  return { trigger: "Inicio", action: "Acción", transform: "Datos", "flow-control": "Lógica", ai: "IA" }[e] || e;
}
function mE(e) {
  switch (e) {
    case "running":
      return "Probando";
    case "success":
      return "Bien";
    case "failed":
      return "Falló";
    case "skipped":
      return "Omitido";
    default:
      return "Sin probar";
  }
}
function gE(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function yE(e, t) {
  return e.length > t ? e.slice(0, t - 1) + "…" : e;
}
const vE = N.memo(dE), xE = ({
  id: e,
  sourceX: t,
  sourceY: n,
  targetX: r,
  targetY: o,
  sourcePosition: i,
  targetPosition: s,
  style: l,
  markerEnd: a,
  selected: u
}) => {
  const c = Y((y) => y.deleteEdge), f = Y((y) => y.readOnly), [d, p, w] = pc({
    sourceX: t,
    sourceY: n,
    targetX: r,
    targetY: o,
    sourcePosition: i,
    targetPosition: s
  });
  return /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
    /* @__PURE__ */ g.jsx(Xr, { path: d, markerEnd: a, style: l, interactionWidth: 24 }),
    u && !f && /* @__PURE__ */ g.jsx(SS, { children: /* @__PURE__ */ g.jsx(
      "button",
      {
        type: "button",
        className: "kfc-edge-quitar nodrag nopan",
        style: { transform: `translate(-50%, -50%) translate(${p}px, ${w}px)` },
        onClick: (y) => {
          y.stopPropagation(), c(e);
        },
        title: "Quitar esta conexión",
        "aria-label": "Quitar esta conexión",
        children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" })
      }
    ) })
  ] });
}, wE = N.memo(xE), _E = { katuqNode: vE }, kE = { linea: wE }, SE = ({ onSelectNode: e, onIntent: t }) => {
  const n = Y((E) => E.graph), r = Y((E) => E.catalog), o = Y((E) => E.runContext), i = Y((E) => E.readOnly), s = Y((E) => E.selectedNodeId);
  Y((E) => E.setGraph);
  const l = Y((E) => E.addNodeConectado), a = Y((E) => E.addEdge), u = Y((E) => E.moveNode), c = Y((E) => E.deleteNode), f = Y((E) => E.deleteEdge), d = Y((E) => E.setDrawerNodeId), p = N.useRef(null), w = N.useRef(null), [y, k] = N.useState(null), [h, m] = N.useState(!1), v = N.useRef({ start: null, conecto: !1 }), x = N.useMemo(
    () => n.nodes.map((E) => {
      const _ = ve(r, E.type);
      return {
        id: E.id,
        type: "katuqNode",
        position: E.position,
        selected: s === E.id,
        data: { flowNode: E, spec: _ }
      };
    }),
    [n.nodes, r, s]
  ), C = N.useMemo(
    () => n.edges.map((E) => {
      var U, W, q, Q;
      const _ = (W = (U = o == null ? void 0 : o.nodeStates) == null ? void 0 : U[E.source]) == null ? void 0 : W.status, M = (Q = (q = o == null ? void 0 : o.nodeStates) == null ? void 0 : q[E.target]) == null ? void 0 : Q.status, R = _ === "success", L = (o == null ? void 0 : o.status) === "running" && R && (M === "running" || M === "pending"), B = E.sourcePort === "error";
      return {
        id: E.id,
        type: "linea",
        selected: y === E.id,
        markerEnd: { type: Jo.ArrowClosed, width: 16, height: 16, color: B ? "#dc2626" : "#94a3b8" },
        source: E.source,
        target: E.target,
        sourceHandle: E.sourcePort,
        targetHandle: E.targetPort,
        animated: L,
        className: ke({
          "kfc-edge--complete": R && !L,
          "kfc-edge--live": L,
          "kfc-edge--error": B
        })
      };
    }),
    [n.edges, o, y]
  ), z = N.useCallback(
    (E) => {
      for (const _ of E)
        _.type === "position" && _.position ? u(_.id, { x: _.position.x, y: _.position.y }) : _.type === "remove" && c(_.id);
    },
    [u, c, e]
  ), T = N.useCallback(
    (E) => {
      for (const _ of E)
        _.type === "remove" && f(_.id);
    },
    [f]
  ), P = N.useCallback(
    (E) => {
      if (i) return;
      const _ = ni(n, r, E);
      if (!_.ok) {
        _.reason && (t == null || t("connectionRejected", { reason: _.reason }));
        return;
      }
      const M = Sc(E);
      a(M), t == null || t("connectionCreated", { edgeId: M.id });
    },
    [i, n, r, a, t]
  ), $ = N.useCallback(
    (E) => {
      v.current.conecto = !0, !(!E.source || !E.target) && P({
        source: E.source,
        sourcePort: E.sourceHandle || "main",
        target: E.target,
        targetPort: E.targetHandle || "main"
      });
    },
    [P]
  ), D = N.useCallback((E, _) => {
    v.current = { start: _, conecto: !1 }, m(!0);
  }, []), F = N.useCallback(
    (E) => {
      var Q, te;
      const { start: _, conecto: M } = v.current;
      if (v.current = { start: null, conecto: !1 }, m(!1), M || !(_ != null && _.nodeId)) return;
      const R = "changedTouches" in E ? E.changedTouches[0] : E;
      if (!R) return;
      const B = (((Q = p.current) == null ? void 0 : Q.getRootNode()) || document).elementFromPoint(R.clientX, R.clientY), U = (te = B == null ? void 0 : B.closest(".react-flow__node")) == null ? void 0 : te.getAttribute("data-id");
      if (!U || U === _.nodeId) return;
      const W = n.nodes.find((Z) => Z.id === U), q = n.nodes.find((Z) => Z.id === _.nodeId);
      if (!(!W || !q))
        if (_.handleType === "target") {
          const Z = Ts(ve(r, W.type));
          if (!Z) return;
          P({ source: W.id, sourcePort: Z, target: q.id, targetPort: _.handleId || "main" });
        } else {
          const Z = $s(ve(r, W.type));
          if (!Z) {
            const ne = ni(n, r, { source: q.id, sourcePort: _.handleId || "main", target: W.id, targetPort: "main" });
            ne.reason && (t == null || t("connectionRejected", { reason: ne.reason }));
            return;
          }
          P({ source: q.id, sourcePort: _.handleId || "main", target: W.id, targetPort: Z });
        }
    },
    [n, r, P, t]
  ), b = N.useCallback((E) => {
    E.preventDefault(), E.dataTransfer.dropEffect = "move";
  }, []), H = N.useCallback(
    (E) => {
      var Q, te;
      if (E.preventDefault(), i) return;
      const _ = E.dataTransfer.getData("application/x-katuq-node-type");
      if (!_) return;
      const M = ve(r, _);
      if (!M) return;
      const R = (Q = p.current) == null ? void 0 : Q.getBoundingClientRect();
      if (!R) return;
      const L = w.current, B = (L == null ? void 0 : L.project({
        x: E.clientX - R.left,
        y: E.clientY - R.top
      })) ?? { x: 100, y: 100 }, U = {
        id: kc("n"),
        type: _,
        position: B,
        params: { ...M.defaults || {} }
      }, W = n.nodes.length > 0, q = l(U);
      e(U.id), t == null || t("nodeAdded", {
        nodeId: U.id,
        type: _,
        conectadoDespuesDe: q ? kn(q.type, (te = ve(r, q.type)) == null ? void 0 : te.displayName) : null,
        faltaUnir: !q && W && M.inputs.length > 0
      });
    },
    [i, n, r, l, e, t]
  ), S = N.useCallback(() => {
    k(null), e(null);
  }, [e]), A = N.useCallback((E, _) => k(_.id), []), j = N.useCallback(
    (E, _) => {
      k(null), e(_.id);
    },
    [e]
  ), O = N.useCallback(
    (E, _) => {
      E.preventDefault(), d(_.id);
    },
    [d]
  );
  return /* @__PURE__ */ g.jsx("div", { ref: p, className: "kfc-canvas-wrapper", onDragOver: b, onDrop: H, children: /* @__PURE__ */ g.jsxs(
    yg,
    {
      className: h ? "kfc-conectando" : void 0,
      nodes: x,
      edges: C,
      onNodesChange: z,
      onEdgesChange: T,
      onConnect: $,
      onConnectStart: D,
      onConnectEnd: F,
      connectionRadius: 36,
      onEdgeClick: A,
      onPaneClick: S,
      onNodeClick: j,
      onNodeContextMenu: O,
      nodeTypes: _E,
      edgeTypes: kE,
      fitView: !0,
      fitViewOptions: { padding: 0.3 },
      onInit: (E) => w.current = E,
      proOptions: { hideAttribution: !0 },
      deleteKeyCode: i ? null : ["Delete", "Backspace"],
      minZoom: 0.2,
      maxZoom: 2,
      defaultEdgeOptions: {
        style: { strokeWidth: 2 }
      },
      connectionLineStyle: { stroke: "#5F3FE0", strokeWidth: 2 },
      children: [
        /* @__PURE__ */ g.jsx(YS, { variant: ft.Dots, gap: 18, size: 1, color: "#d1d5db" }),
        /* @__PURE__ */ g.jsx(
          AS,
          {
            pannable: !0,
            zoomable: !0,
            nodeColor: (E) => {
              var R;
              const _ = (R = E.data) == null ? void 0 : R.flowNode, M = _ ? ve(r, _.type) : void 0;
              return (M == null ? void 0 : M.color) || "#94a3b8";
            }
          }
        ),
        /* @__PURE__ */ g.jsx(FS, { position: "bottom-left" })
      ]
    }
  ) });
}, EE = ({ readOnly: e, onIntent: t }) => {
  const n = Y((c) => c.catalog), r = Y((c) => c.paletteFilter), o = Y((c) => c.setPaletteFilter), i = N.useMemo(() => NE(n, r), [n, r]), s = Y((c) => c.addNodeConectado), l = rl(), a = (c) => {
    var k;
    if (e) return;
    const { graph: f, catalog: d } = Y.getState(), p = {
      id: kc("n"),
      type: c.type,
      position: aE(f, d),
      params: { ...c.defaults || {} }
    }, w = f.nodes.length > 0, y = s(p);
    t == null || t("nodeAdded", {
      nodeId: p.id,
      type: c.type,
      conectadoDespuesDe: y ? kn(y.type, (k = ve(d, y.type)) == null ? void 0 : k.displayName) : null,
      faltaUnir: !y && w && c.inputs.length > 0
    }), requestAnimationFrame(() => l.setCenter(p.position.x + 125, p.position.y + 60, { zoom: l.getZoom(), duration: 300 }));
  }, u = (c, f) => {
    if (e) {
      c.preventDefault();
      return;
    }
    c.dataTransfer.setData("application/x-katuq-node-type", f.type), c.dataTransfer.effectAllowed = "move";
  };
  return /* @__PURE__ */ g.jsxs("aside", { className: "kfc-sidebar", "aria-label": "Pasos disponibles", children: [
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-sidebar__header", children: [
      /* @__PURE__ */ g.jsx("h3", { className: "kfc-sidebar__title", children: "Pasos disponibles" }),
      /* @__PURE__ */ g.jsx("p", { className: "kfc-sidebar__hint", children: "Toca los pasos en orden y quedan conectados uno tras otro. Luego toca cada uno en el lienzo para llenarlo." }),
      /* @__PURE__ */ g.jsx(
        "input",
        {
          type: "search",
          className: "kfc-sidebar__search",
          placeholder: "Buscar paso…",
          value: r,
          onChange: (c) => o(c.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-sidebar__list", children: [
      n.length === 0 && /* @__PURE__ */ g.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__title", children: "No pudimos cargar los pasos" }),
        /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "Recarga la página para intentarlo de nuevo." })
      ] }),
      Object.entries(i).map(([c, f]) => /* @__PURE__ */ g.jsxs("section", { className: "kfc-group", children: [
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-group__title", children: [
          xc[c] || c,
          " · ",
          f.length
        ] }),
        f.map((d) => /* @__PURE__ */ g.jsxs(
          "div",
          {
            className: ke("kfc-palette-card"),
            draggable: !e,
            onDragStart: (p) => u(p, d),
            onClick: () => a(d),
            role: "button",
            tabIndex: 0,
            onKeyDown: (p) => {
              p.key === "Enter" && a(d);
            },
            title: ti(d.type, d.description),
            children: [
              /* @__PURE__ */ g.jsx("i", { className: ke("kfc-palette-card__icon", d.icon), style: { color: d.color } }),
              /* @__PURE__ */ g.jsxs("div", { className: "kfc-palette-card__body", children: [
                /* @__PURE__ */ g.jsx("div", { className: "kfc-palette-card__title", children: kn(d.type, d.displayName) }),
                /* @__PURE__ */ g.jsx("div", { className: "kfc-palette-card__desc", children: ti(d.type, d.description) })
              ] })
            ]
          },
          d.type
        ))
      ] }, c))
    ] })
  ] });
};
function NE(e, t) {
  const n = Td((t || "").trim()), r = n ? e.filter((i) => Td(`${kn(i.type, i.displayName)} ${ti(i.type, i.description)} ${i.displayName} ${i.description} ${i.type} ${(i.tags || []).join(" ")} ${i.group} ${xc[i.group] || ""}`).includes(n)) : e, o = {};
  for (const i of r)
    o[i.group] || (o[i.group] = []), o[i.group].push(i);
  for (const i of Object.keys(o))
    o[i].sort((s, l) => String((s == null ? void 0 : s.displayName) ?? "").localeCompare(String((l == null ? void 0 : l.displayName) ?? "")));
  return o;
}
function Td(e) {
  return e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const CE = ({ node: e, spec: t }) => {
  const n = Y((k) => k.graph), r = Y((k) => k.catalog), o = Y((k) => k.readOnly), i = Y((k) => k.addEdge), s = Y((k) => k.deleteEdge), l = Y((k) => k.setSelectedNodeId), [a, u] = N.useState("");
  N.useEffect(() => u(""), [e.id]);
  const c = N.useMemo(() => {
    var h;
    const k = /* @__PURE__ */ new Map();
    for (const m of n.nodes) {
      const v = kn(m.type, (h = ve(r, m.type)) == null ? void 0 : h.displayName), x = n.nodes.filter((C) => C.type === m.type);
      k.set(m.id, x.length > 1 ? `${v} (${x.indexOf(m) + 1})` : v);
    }
    return (m) => k.get(m) || "Paso";
  }, [n.nodes, r]), f = n.edges.filter((k) => k.target === e.id), d = il(t), p = ci(t).length > 0, w = (k, h) => {
    const m = n.nodes.find((z) => z.id === h), v = m ? $s(ve(r, m.type)) : null;
    if (!m || !v) return;
    const x = { source: e.id, sourcePort: k, target: m.id, targetPort: v }, C = ni(n, r, x);
    if (!C.ok) {
      u(C.reason || "Esos dos pasos no se pueden unir.");
      return;
    }
    u(""), i(Sc(x));
  }, y = (k) => n.nodes.filter((h) => {
    if (h.id === e.id) return !1;
    const m = $s(ve(r, h.type));
    return m ? ni(n, r, { source: e.id, sourcePort: k, target: h.id, targetPort: m }).ok : !1;
  });
  return /* @__PURE__ */ g.jsxs("section", { className: "kfc-conex", "aria-label": "Conexiones del paso", children: [
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-conex__fila", children: [
      /* @__PURE__ */ g.jsx("span", { className: "kfc-conex__rotulo", children: "Recibe de" }),
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-conex__chips", children: [
        !p && /* @__PURE__ */ g.jsx("span", { className: "kfc-conex__nada", children: "Nadie: este paso arranca la automatización." }),
        p && f.length === 0 && /* @__PURE__ */ g.jsx("span", { className: "kfc-conex__nada kfc-conex__nada--alerta", children: "Ningún paso todavía. Conéctalo desde el paso anterior." }),
        f.map((k) => /* @__PURE__ */ g.jsxs("span", { className: "kfc-conex__chip", children: [
          /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-conex__ir", onClick: () => l(k.source), title: "Ir a ese paso", children: c(k.source) }),
          !o && /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-conex__quitar", onClick: () => s(k.id), title: "Quitar esta conexión", "aria-label": "Quitar esta conexión", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }) })
        ] }, k.id))
      ] })
    ] }),
    d.map((k) => {
      const h = n.edges.filter((x) => x.source === e.id && x.sourcePort === k.name), m = o ? [] : y(k.name), v = xo(t, k, "out");
      return /* @__PURE__ */ g.jsxs("div", { className: "kfc-conex__fila", children: [
        /* @__PURE__ */ g.jsx("span", { className: `kfc-conex__rotulo${k.isError ? " kfc-conex__rotulo--error" : ""}`, children: v ? `${v}, sigue con` : "Después sigue con" }),
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-conex__chips", children: [
          h.length === 0 && /* @__PURE__ */ g.jsx("span", { className: "kfc-conex__nada", children: k.isError ? "Nada: si falla, se detiene." : "Nada: aquí termina." }),
          h.map((x) => /* @__PURE__ */ g.jsxs("span", { className: "kfc-conex__chip", children: [
            /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-conex__ir", onClick: () => l(x.target), title: "Ir a ese paso", children: c(x.target) }),
            !o && /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-conex__quitar", onClick: () => s(x.id), title: "Quitar esta conexión", "aria-label": "Quitar esta conexión", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }) })
          ] }, x.id)),
          m.length > 0 && /* @__PURE__ */ g.jsxs(
            "select",
            {
              className: "kfc-conex__agregar",
              value: "",
              onChange: (x) => x.target.value && w(k.name, x.target.value),
              "aria-label": "Conectar con otro paso",
              children: [
                /* @__PURE__ */ g.jsx("option", { value: "", children: "+ Conectar con…" }),
                m.map((x) => /* @__PURE__ */ g.jsx("option", { value: x.id, children: c(x.id) }, x.id))
              ]
            }
          )
        ] })
      ] }, k.name);
    }),
    a && /* @__PURE__ */ g.jsx("div", { className: "kfc-conex__aviso", children: a }),
    !o && /* @__PURE__ */ g.jsx("div", { className: "kfc-conex__nota", children: "Las conexiones se aplican de una vez, sin tocar «Aplicar»." })
  ] });
}, PE = {
  worldoffice: "world_office"
}, $d = {
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
function ou(e) {
  const t = (e || "").toLowerCase();
  return PE[t] || t;
}
function Yl(e) {
  const t = (e || "").toLowerCase();
  return $d[ou(t)] || $d[t] || e;
}
function zE(e, t) {
  if (!t) return [];
  const n = e.credentials;
  if (!n) return [];
  const r = Array.isArray(n) ? n : [n], o = new Set(t.map(ou));
  return r.filter((i) => !o.has(ou(i)));
}
const jE = ({ onClose: e, onOpenIntegrations: t }) => {
  var O, E;
  const n = Y((_) => _.selectedNodeId), r = Y((_) => _.graph), o = Y((_) => _.catalog), i = Y((_) => _.runContext), s = Y((_) => _.connectedProviders), l = Y((_) => _.updateNodeParams), a = Y((_) => _.updateNode), u = Y((_) => _.deleteNode), c = Y((_) => _.readOnly), [f, d] = N.useState(!1), [p, w] = N.useState(!1);
  N.useEffect(() => {
    d(!1);
  }, [n]);
  const y = N.useMemo(
    () => r.nodes.find((_) => _.id === n),
    [r.nodes, n]
  ), k = N.useMemo(
    () => y ? ve(o, y.type) : void 0,
    [o, y]
  ), h = N.useMemo(
    () => y ? AE(y, r, o, i) : null,
    [y, r, o, i]
  ), [m, v] = N.useState({}), [x, C] = N.useState({}), [z, T] = N.useState("");
  if (N.useEffect(() => {
    if (!y) return;
    v({ ...(k == null ? void 0 : k.defaults) || {}, ...y.params || {} }), T(y.notes || "");
    const _ = {};
    for (const [M, R] of Object.entries(y.params || {}))
      typeof R == "string" && R.trim().startsWith("{{") && (_[M] = "expression");
    C(_);
  }, [y, k]), !y || !k)
    return /* @__PURE__ */ g.jsx("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: /* @__PURE__ */ g.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__title", children: "Toca un paso para configurarlo" }),
      /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "Aquí aparecen sus ajustes." })
    ] }) });
  const P = sE({ ...y, params: m }, k), $ = ((O = k.schema) == null ? void 0 : O.properties) || {}, D = Array.isArray((E = k.schema) == null ? void 0 : E.required) ? k.schema.required : [], F = zE(k, s), b = (_, M) => v((R) => ({ ...R, [_]: M })), H = (_, M) => C((R) => ({ ...R, [_]: M })), S = () => {
    l(y.id, m), z !== (y.notes || "") && a(y.id, { notes: z }), e();
  }, A = () => e(), j = () => {
    if (!f) {
      d(!0);
      return;
    }
    u(y.id), e();
  };
  return /* @__PURE__ */ g.jsxs("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: [
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__header", children: [
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__heading", children: [
        /* @__PURE__ */ g.jsx("div", { className: "kfc-config__title", children: kn(k.type, k.displayName) }),
        /* @__PURE__ */ g.jsx("div", { className: "kfc-config__subtitle", children: xc[k.group] || k.group })
      ] }),
      /* @__PURE__ */ g.jsx(
        "button",
        {
          type: "button",
          className: "kfc-btn kfc-btn--ghost kfc-config__close",
          onClick: e,
          "aria-label": "Cerrar",
          title: "Cerrar",
          children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" })
        }
      )
    ] }),
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__body", children: [
      F.length > 0 && /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__missing", role: "alert", children: [
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__missing-head", children: [
          /* @__PURE__ */ g.jsx("i", { className: "pi pi-exclamation-triangle" }),
          /* @__PURE__ */ g.jsx("span", { children: F.length === 1 ? `Conecta ${Yl(F[0])} para que este paso funcione.` : `Este paso necesita estas integraciones conectadas: ${F.map(Yl).join(", ")}.` })
        ] }),
        /* @__PURE__ */ g.jsx("div", { className: "kfc-config__missing-actions", children: F.map((_) => /* @__PURE__ */ g.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--warn-solid kfc-btn--sm",
            onClick: () => t == null ? void 0 : t(_),
            children: [
              /* @__PURE__ */ g.jsx("i", { className: "pi pi-link" }),
              "Conectar ",
              Yl(_)
            ]
          },
          _
        )) })
      ] }),
      ti(k.type, k.description) && /* @__PURE__ */ g.jsx("p", { className: "kfc-config__desc", children: ti(k.type, k.description) }),
      /* @__PURE__ */ g.jsx(CE, { node: y, spec: k }),
      P.length > 0 && /* @__PURE__ */ g.jsx("div", { className: "kfc-config__errors", role: "alert", children: P.map((_) => /* @__PURE__ */ g.jsxs("div", { children: [
        "· ",
        _
      ] }, _)) }),
      Object.keys($).length === 0 && /* @__PURE__ */ g.jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: "Este paso no necesita configuración." }),
      (() => {
        const _ = ([B, U]) => /* @__PURE__ */ g.jsx(
          ME,
          {
            name: B,
            schema: U,
            value: m[B],
            mode: x[B] || "fixed",
            required: D.includes(B),
            readOnly: c,
            inputData: h,
            onChange: (W) => b(B, W),
            onModeChange: (W) => H(B, W)
          },
          B
        ), M = Object.entries($), R = M.filter(([B, U]) => !nu(B, U, D.includes(B))), L = M.filter(([B, U]) => nu(B, U, D.includes(B)));
        return /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
          R.map(_),
          L.length > 0 && /* @__PURE__ */ g.jsxs("details", { className: "kfc-avanzado", children: [
            /* @__PURE__ */ g.jsxs("summary", { children: [
              "Ajustes avanzados · ",
              L.length
            ] }),
            L.map(_)
          ] })
        ] });
      })(),
      /* @__PURE__ */ g.jsx("hr", { className: "kfc-config__sep" }),
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
        /* @__PURE__ */ g.jsx("label", { className: "kfc-field__label", children: "Notas para tu equipo (se ven en el lienzo)" }),
        /* @__PURE__ */ g.jsx(
          "textarea",
          {
            className: "kfc-textarea",
            value: z,
            readOnly: c,
            onChange: (_) => T(_.target.value),
            placeholder: "Por qué está este paso, qué revisar…"
          }
        )
      ] }),
      /* @__PURE__ */ g.jsxs("button", { type: "button", className: "kfc-tecnico-toggle", onClick: () => w(!p), children: [
        p ? "Ocultar" : "Ver",
        " detalles técnicos"
      ] }),
      p && /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__note", children: [
        "Tipo: ",
        k.type,
        " · versión ",
        k.version
      ] }),
      k.category === "trigger" && /* @__PURE__ */ g.jsx("div", { className: "kfc-config__note", children: "Este paso arranca la automatización. Cada cuánto o con qué aviso se elige en «Ajustes», arriba a la derecha." })
    ] }),
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__footer", children: [
      !c && /* @__PURE__ */ g.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--danger", onClick: j, onBlur: () => d(!1), children: [
        /* @__PURE__ */ g.jsx("i", { className: "pi pi-trash" }),
        f ? "¿Seguro? Toca de nuevo" : "Quitar paso"
      ] }),
      /* @__PURE__ */ g.jsx("span", { className: "kfc-config__footer-spacer" }),
      /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-btn", onClick: A, children: "Cancelar" }),
      !c && /* @__PURE__ */ g.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: S, children: [
        /* @__PURE__ */ g.jsx("i", { className: "pi pi-check" }),
        "Aplicar"
      ] })
    ] })
  ] });
}, ME = ({
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
  var w;
  const u = _c(e, t), c = eE(e, t), f = t.type, d = t.enum, p = `kfc-field-${e}`;
  if (f === "boolean")
    return /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ g.jsxs("label", { className: "kfc-checkbox-row", children: [
        /* @__PURE__ */ g.jsx(
          "input",
          {
            id: p,
            type: "checkbox",
            checked: !!n,
            disabled: i,
            onChange: (y) => l(y.target.checked)
          }
        ),
        /* @__PURE__ */ g.jsxs("span", { children: [
          u,
          o && /* @__PURE__ */ g.jsx("span", { className: "kfc-req", children: " *" })
        ] })
      ] }),
      c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (Array.isArray(d))
    return /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ g.jsx(ur, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ g.jsxs(
        "select",
        {
          id: p,
          className: "kfc-select",
          value: n ?? "",
          disabled: i,
          onChange: (y) => l(y.target.value),
          children: [
            /* @__PURE__ */ g.jsx("option", { value: "", children: "— elige una opción —" }),
            d.map((y) => /* @__PURE__ */ g.jsx("option", { value: String(y), children: ru(String(y)) }, String(y)))
          ]
        }
      ),
      c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  if (f === "array") {
    const y = (w = t.items) == null ? void 0 : w.enum, k = Array.isArray(n) ? n : [];
    return y ? /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ g.jsx(ur, { label: u, required: o, schema: t }),
      /* @__PURE__ */ g.jsx("div", { className: "kfc-checkchips", children: y.map((h) => {
        const m = k.includes(h);
        return /* @__PURE__ */ g.jsxs(
          "label",
          {
            className: ke("kfc-checkchip", { "is-on": m }),
            children: [
              /* @__PURE__ */ g.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: m,
                  disabled: i,
                  onChange: (v) => {
                    v.target.checked ? l([...k, h]) : l(k.filter((x) => x !== h));
                  }
                }
              ),
              ru(h)
            ]
          },
          h
        );
      }) }),
      c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
    ] }) : /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ g.jsx(ur, { label: u, required: o, schema: t, htmlFor: p }),
      /* @__PURE__ */ g.jsx(
        "input",
        {
          id: p,
          type: "text",
          className: "kfc-input",
          value: k.join(", "),
          readOnly: i,
          onChange: (h) => l(
            h.target.value.split(",").map((m) => m.trim()).filter(Boolean)
          ),
          placeholder: "Separados por coma"
        }
      ),
      c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
    ] });
  }
  return f === "object" ? /* @__PURE__ */ g.jsx(
    $E,
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
  ) : f === "number" || f === "integer" ? /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ g.jsx(ur, { label: u, required: o, schema: t, htmlFor: p }),
    /* @__PURE__ */ g.jsx(
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
          const k = y.target.value;
          l(k === "" ? void 0 : f === "integer" ? parseInt(k, 10) : parseFloat(k));
        }
      }
    ),
    c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
  ] }) : /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ g.jsx(
      ur,
      {
        label: u,
        required: o,
        schema: t,
        htmlFor: p,
        right: /* @__PURE__ */ g.jsxs("span", { className: "kfc-mode-toggle", role: "tablist", children: [
          /* @__PURE__ */ g.jsx(
            "button",
            {
              type: "button",
              className: ke({ "is-active": r === "fixed" }),
              onClick: () => a("fixed"),
              disabled: i,
              children: "Valor fijo"
            }
          ),
          /* @__PURE__ */ g.jsx(
            "button",
            {
              type: "button",
              className: ke({ "is-active": r === "expression" }),
              onClick: () => a("expression"),
              disabled: i,
              title: "Tomar el dato de un paso anterior",
              children: "De un paso anterior"
            }
          )
        ] })
      }
    ),
    r === "expression" ? /* @__PURE__ */ g.jsx(
      TE,
      {
        inputId: p,
        value: n ?? "",
        readOnly: i,
        inputData: s,
        onChange: l
      }
    ) : /* @__PURE__ */ g.jsx(
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
    c && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: c })
  ] });
}, TE = ({
  inputId: e,
  value: t,
  readOnly: n,
  inputData: r,
  onChange: o
}) => {
  const i = N.useRef(null), [s, l] = N.useState(!1), [a, u] = N.useState(""), c = (p) => {
    const w = i.current, y = t || "";
    if (!w) {
      o(y + p);
      return;
    }
    const k = w.selectionStart ?? y.length, h = w.selectionEnd ?? y.length, m = y.slice(0, k) + p + y.slice(h);
    o(m), requestAnimationFrame(() => {
      w.focus();
      const v = k + p.length;
      try {
        w.setSelectionRange(v, v);
      } catch {
      }
    });
  }, f = N.useMemo(
    () => DE(t, r == null ? void 0 : r.json),
    [t, r]
  ), d = N.useMemo(() => {
    const p = (r == null ? void 0 : r.paths) || [], w = a.trim().toLowerCase();
    return w ? p.filter((y) => y.path.toLowerCase().includes(w)) : p;
  }, [r, a]);
  return /* @__PURE__ */ g.jsxs("div", { className: "kfc-expr-wrap", children: [
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-expr", children: [
      /* @__PURE__ */ g.jsx("span", { className: "kfc-expr__fx", title: "Dato que viene de un paso anterior", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-bolt" }) }),
      /* @__PURE__ */ g.jsx(
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
      !n && /* @__PURE__ */ g.jsxs(
        "button",
        {
          type: "button",
          className: ke("kfc-expr__pick", { "is-open": s }),
          onClick: () => l((p) => !p),
          title: "Insertar dato del paso anterior",
          children: [
            /* @__PURE__ */ g.jsx("i", { className: "pi pi-database" }),
            "Datos"
          ]
        }
      )
    ] }),
    f !== null && /* @__PURE__ */ g.jsxs("div", { className: "kfc-expr__preview", title: "Así se vio en la última prueba", children: [
      /* @__PURE__ */ g.jsx("span", { className: "kfc-expr__preview-eq", children: "=" }),
      " ",
      f
    ] }),
    s && /* @__PURE__ */ g.jsxs("div", { className: "kfc-datapick", children: [
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-datapick__head", children: [
        /* @__PURE__ */ g.jsx("i", { className: "pi pi-sign-in" }),
        "Datos de «",
        (r == null ? void 0 : r.label) || "paso anterior",
        "»"
      ] }),
      !r || r.paths.length === 0 ? /* @__PURE__ */ g.jsxs("div", { className: "kfc-datapick__empty", children: [
        /* @__PURE__ */ g.jsx("i", { className: "pi pi-info-circle" }),
        /* @__PURE__ */ g.jsx("span", { children: r && r.sinConexion ? "Este paso todavía no recibe nada de otro paso. Conéctalo con el anterior (arriba, en «Recibe de», o con una línea en el lienzo) para usar sus datos." : "Prueba la automatización una vez (botón «Probar ahora») para ver los datos reales del paso anterior. Mientras tanto puedes insertar todo el registro:" }),
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-datapick__tokens", children: [
          /* @__PURE__ */ g.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $json }}"),
              children: "{{ $json }}"
            }
          ),
          /* @__PURE__ */ g.jsx(
            "button",
            {
              type: "button",
              className: "kfc-token",
              onClick: () => c("{{ $vars. }}"),
              children: "{{ $vars }}"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
        /* @__PURE__ */ g.jsx(
          "input",
          {
            type: "search",
            className: "kfc-datapick__search",
            placeholder: "Buscar dato…",
            value: a,
            onChange: (p) => u(p.target.value)
          }
        ),
        /* @__PURE__ */ g.jsxs("ul", { className: "kfc-datapick__list", children: [
          d.map((p) => /* @__PURE__ */ g.jsx("li", { children: /* @__PURE__ */ g.jsxs(
            "button",
            {
              type: "button",
              className: "kfc-datapick__row",
              onClick: () => c(`{{ $json.${p.path} }}`),
              title: `Insertar {{ $json.${p.path} }}`,
              children: [
                /* @__PURE__ */ g.jsx(
                  "span",
                  {
                    className: `kfc-datapick__type kfc-datapick__type--${p.type}`,
                    children: IE(p.type)
                  }
                ),
                /* @__PURE__ */ g.jsx("span", { className: "kfc-datapick__path", children: p.path }),
                /* @__PURE__ */ g.jsx("span", { className: "kfc-datapick__val", children: p.preview })
              ]
            }
          ) }, p.path)),
          d.length === 0 && /* @__PURE__ */ g.jsxs("li", { className: "kfc-datapick__noresult", children: [
            "Ningún dato coincide con «",
            a,
            "»."
          ] })
        ] })
      ] })
    ] })
  ] });
}, ur = ({ label: e, required: t, schema: n, htmlFor: r, right: o }) => /* @__PURE__ */ g.jsxs("label", { className: "kfc-field__label", htmlFor: r, children: [
  /* @__PURE__ */ g.jsxs("span", { className: "kfc-field__labeltext", children: [
    e,
    t && /* @__PURE__ */ g.jsx("span", { className: "kfc-req", children: " *" })
  ] }),
  o
] }), $E = ({
  inputId: e,
  label: t,
  schema: n,
  description: r,
  required: o,
  readOnly: i,
  value: s,
  onChange: l
}) => {
  const a = N.useMemo(() => {
    try {
      return JSON.stringify(s ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }, [s]), [u, c] = N.useState(a), [f, d] = N.useState(null);
  return N.useEffect(() => {
    c(a), d(null);
  }, [a]), /* @__PURE__ */ g.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ g.jsx(ur, { label: t, required: o, schema: n, htmlFor: e }),
    /* @__PURE__ */ g.jsx(
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
    f && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__error", children: f }),
    r && !f && /* @__PURE__ */ g.jsx("div", { className: "kfc-field__hint", children: r })
  ] });
};
function AE(e, t, n, r) {
  var a, u, c, f, d, p;
  const o = t.edges.filter((w) => w.target === e.id).map((w) => w.source);
  let i = null;
  for (const w of o) {
    if (Ad((a = r == null ? void 0 : r.nodeStates) == null ? void 0 : a[w])) {
      i = w;
      break;
    }
    i || (i = w);
  }
  let s = "paso anterior", l = null;
  if (i) {
    l = Ad((u = r == null ? void 0 : r.nodeStates) == null ? void 0 : u[i]);
    const w = t.nodes.find((k) => k.id === i), y = w ? ve(n, w.type) : void 0;
    s = (y == null ? void 0 : y.displayName) || "paso anterior";
  } else {
    const w = (f = (c = r == null ? void 0 : r.triggerData) == null ? void 0 : c[0]) == null ? void 0 : f.json;
    w && (l = w, s = "el inicio de la automatización");
  }
  return {
    label: s,
    json: l,
    paths: l ? iu(l) : [],
    sinConexion: o.length === 0 && (((p = (d = ve(n, e.type)) == null ? void 0 : d.inputs) == null ? void 0 : p.length) || 0) > 0
  };
}
function Ad(e) {
  var n, r, o, i;
  const t = (i = (o = (r = (n = e == null ? void 0 : e.output) == null ? void 0 : n.main) == null ? void 0 : r[0]) == null ? void 0 : o[0]) == null ? void 0 : i.json;
  return t && typeof t == "object" ? t : null;
}
function iu(e, t = "", n = [], r = 0) {
  if (r > 5) return n;
  if (Array.isArray(e))
    return t && n.push({ path: t, type: "array", preview: `[${e.length} elementos]` }), e.length && iu(e[0], `${t}[0]`, n, r + 1), n;
  if (e && typeof e == "object") {
    t && n.push({ path: t, type: "object", preview: "{ objeto }" });
    for (const o of Object.keys(e)) {
      const i = t ? `${t}.${o}` : o;
      iu(e[o], i, n, r + 1);
    }
    return n;
  }
  return n.push({
    path: t,
    type: e === null ? "null" : typeof e,
    preview: RE(e)
  }), n;
}
function RE(e) {
  return e === null ? "null" : typeof e == "string" ? e.length > 32 ? `"${e.slice(0, 32)}…"` : `"${e}"` : String(e);
}
function IE(e) {
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
function DE(e, t) {
  if (typeof e != "string" || !t) return null;
  const n = /^\s*\{\{\s*\$json\.?([\w.$[\]]*)\s*\}\}\s*$/.exec(e);
  if (!n) return null;
  const r = n[1], o = r ? LE(t, r) : t;
  if (o === void 0) return "—";
  if (o === null) return "null";
  if (typeof o == "object") return Array.isArray(o) ? `[${o.length} elementos]` : "{ objeto }";
  const i = String(o);
  return i.length > 80 ? `${i.slice(0, 80)}…` : i;
}
function LE(e, t) {
  if (!e || !t) return;
  const n = t.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let r = e;
  for (const o of n) {
    if (r == null) return;
    r = r[o];
  }
  return r;
}
const OE = {
  pending: "#9ca3af",
  running: "#2563eb",
  success: "#10b981",
  failed: "#ef4444",
  skipped: "#6b7280"
}, bE = ({ runContext: e, onClose: t }) => {
  const [n, r] = N.useState({}), o = N.useMemo(() => {
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
    return /* @__PURE__ */ g.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__title", children: "Sin ejecuciones todavía" }),
      /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "Toca «Probar ahora» o espera a que la automatización arranque sola." })
    ] });
  const i = (s) => r((l) => ({ ...l, [s]: !l[s] }));
  return /* @__PURE__ */ g.jsxs("div", { className: "kfc-runlist", "aria-label": "Historial de ejecución", children: [
    /* @__PURE__ */ g.jsxs(
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
          /* @__PURE__ */ g.jsxs("div", { children: [
            /* @__PURE__ */ g.jsxs("div", { style: { fontWeight: 600, fontSize: 14 }, children: [
              "Run · ",
              e.runId.slice(0, 12),
              "…"
            ] }),
            /* @__PURE__ */ g.jsxs("div", { style: { fontSize: 12, color: "#6b7280" }, children: [
              e.startedAt,
              " · ",
              e.totalDurationMs ?? "—",
              " ms ·",
              " ",
              /* @__PURE__ */ g.jsx(
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
          t && /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-btn", onClick: t, children: "Cerrar" })
        ]
      }
    ),
    o.length === 0 && /* @__PURE__ */ g.jsx("div", { className: "kfc-empty", children: /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "No se ejecutó ningún nodo en este run." }) }),
    o.map(({ nodeId: s, state: l }) => {
      const a = !!n[s];
      return /* @__PURE__ */ g.jsxs(
        "div",
        {
          className: "kfc-runlist__item",
          style: { borderLeftColor: OE[l.status] || "#9ca3af" },
          onClick: () => i(s),
          children: [
            /* @__PURE__ */ g.jsxs("div", { className: "kfc-runlist__head", children: [
              /* @__PURE__ */ g.jsx("span", { children: s }),
              /* @__PURE__ */ g.jsx(
                "span",
                {
                  className: ke(
                    "kfc-node__status",
                    `kfc-node__status--${l.status}`
                  ),
                  style: { marginTop: 0 },
                  children: l.status
                }
              )
            ] }),
            /* @__PURE__ */ g.jsxs("div", { className: "kfc-runlist__sub", children: [
              l.startedAt || "—",
              " · ",
              l.durationMs ?? "—",
              " ms · intento",
              " ",
              l.attempt
            ] }),
            a && /* @__PURE__ */ g.jsxs("div", { children: [
              l.error && /* @__PURE__ */ g.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d" }, children: `${l.error.code || "ERROR"}: ${l.error.message}

${l.error.stack || ""}` }),
              l.output && /* @__PURE__ */ g.jsx("pre", { className: "kfc-runlist__pre", children: FE(l.output, 8e3) })
            ] })
          ]
        },
        s
      );
    })
  ] });
};
function FE(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
const HE = ({ nodeId: e, onClose: t }) => {
  var y, k, h, m;
  const n = Y((v) => v.runContext), r = Y((v) => v.graph), o = Y((v) => v.catalog), [i, s] = N.useState("output"), l = N.useMemo(() => r.nodes.find((v) => v.id === e), [r.nodes, e]), a = N.useMemo(() => l ? ve(o, l.type) : void 0, [o, l]), u = (y = n == null ? void 0 : n.nodeStates) == null ? void 0 : y[e], c = N.useMemo(() => {
    var C, z;
    if (!n || !l) return [];
    const v = r.edges.filter((T) => T.target === e), x = [];
    for (const T of v) {
      const P = (C = n.nodeStates) == null ? void 0 : C[T.source];
      if ((z = P == null ? void 0 : P.output) != null && z.main)
        for (const $ of P.output.main)
          Array.isArray($) && x.push(...$);
    }
    return x;
  }, [n, l, r.edges, e]);
  if (!l)
    return /* @__PURE__ */ g.jsx("aside", { className: "kfc-drawer", "aria-label": "Logs del nodo", children: /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ g.jsx("div", { children: /* @__PURE__ */ g.jsx("div", { className: "kfc-drawer__title", children: "Nodo no encontrado" }) }),
      /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }) })
    ] }) });
  const f = (u == null ? void 0 : u.status) || "pending", d = ((h = (k = u == null ? void 0 : u.output) == null ? void 0 : k.main) == null ? void 0 : h.flat()) || [], p = ((m = u == null ? void 0 : u.output) == null ? void 0 : m.error) || [], w = d.length;
  return /* @__PURE__ */ g.jsxs("aside", { className: "kfc-drawer", "aria-label": `Logs del nodo ${l.id}`, children: [
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ g.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__title", title: (a == null ? void 0 : a.displayName) || l.type, children: [
          /* @__PURE__ */ g.jsx(
            "i",
            {
              className: ke((a == null ? void 0 : a.icon) || "pi pi-circle"),
              style: { color: (a == null ? void 0 : a.color) || "#5E72E4", marginRight: 6 }
            }
          ),
          (a == null ? void 0 : a.displayName) || l.type
        ] }),
        /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__sub", children: [
          /* @__PURE__ */ g.jsx("span", { className: ke("kfc-node__status", `kfc-node__status--${f}`), children: f }),
          (u == null ? void 0 : u.durationMs) != null && /* @__PURE__ */ g.jsxs("span", { children: [
            "· ",
            Rd(u.durationMs)
          ] }),
          (u == null ? void 0 : u.attempt) != null && /* @__PURE__ */ g.jsxs("span", { children: [
            "· intento ",
            u.attempt
          ] })
        ] })
      ] }),
      /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }) })
    ] }),
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__tabs", role: "tablist", children: [
      /* @__PURE__ */ g.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "output",
          className: ke("kfc-drawer__tab", { "is-active": i === "output" }),
          onClick: () => s("output"),
          children: [
            "Salida ",
            w > 0 && /* @__PURE__ */ g.jsx("span", { className: "kfc-drawer__tab-count", children: w })
          ]
        }
      ),
      /* @__PURE__ */ g.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "input",
          className: ke("kfc-drawer__tab", { "is-active": i === "input" }),
          onClick: () => s("input"),
          children: [
            "Entrada ",
            c.length > 0 && /* @__PURE__ */ g.jsx("span", { className: "kfc-drawer__tab-count", children: c.length })
          ]
        }
      ),
      /* @__PURE__ */ g.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "error",
          className: ke("kfc-drawer__tab", { "is-active": i === "error" }),
          onClick: () => s("error"),
          disabled: !(u != null && u.error) && p.length === 0,
          children: "Error"
        }
      ),
      /* @__PURE__ */ g.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "meta",
          className: ke("kfc-drawer__tab", { "is-active": i === "meta" }),
          onClick: () => s("meta"),
          children: "Detalles"
        }
      )
    ] }),
    /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__body", children: [
      !u && /* @__PURE__ */ g.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__title", children: "Sin datos de ejecución" }),
        /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "Este paso no corrió en la última prueba. Toca «Probar ahora»." })
      ] }),
      u && i === "output" && /* @__PURE__ */ g.jsx(g.Fragment, { children: d.length === 0 ? /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de salida." }) : d.map((v, x) => /* @__PURE__ */ g.jsx(Xl, { index: x, item: v }, x)) }),
      u && i === "input" && /* @__PURE__ */ g.jsx(g.Fragment, { children: c.length === 0 ? /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de entrada (probablemente es un trigger)." }) : c.map((v, x) => /* @__PURE__ */ g.jsx(Xl, { index: x, item: v }, x)) }),
      u && i === "error" && /* @__PURE__ */ g.jsxs("div", { style: { padding: 12 }, children: [
        u.error ? /* @__PURE__ */ g.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d", color: "#fee2e2" }, children: `${u.error.code || "ERROR"}: ${u.error.message}

${u.error.stack || ""}` }) : /* @__PURE__ */ g.jsx("div", { className: "kfc-empty__desc", children: "Sin errores." }),
        p.length > 0 && /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
          /* @__PURE__ */ g.jsx("div", { className: "kfc-drawer__section-title", children: "Items en branch de error" }),
          p.map((v, x) => /* @__PURE__ */ g.jsx(Xl, { index: x, item: v }, x))
        ] })
      ] }),
      u && i === "meta" && /* @__PURE__ */ g.jsxs("div", { style: { padding: 12, fontSize: 12 }, children: [
        /* @__PURE__ */ g.jsx(en, { k: "Status", v: u.status }),
        /* @__PURE__ */ g.jsx(en, { k: "Iniciado", v: u.startedAt || "—" }),
        /* @__PURE__ */ g.jsx(en, { k: "Finalizado", v: u.finishedAt || "—" }),
        /* @__PURE__ */ g.jsx(en, { k: "Duración", v: u.durationMs != null ? Rd(u.durationMs) : "—" }),
        /* @__PURE__ */ g.jsx(en, { k: "Intento", v: String(u.attempt ?? "—") }),
        /* @__PURE__ */ g.jsx(en, { k: "Items salida", v: String(w) }),
        /* @__PURE__ */ g.jsx(en, { k: "Spec", v: (a == null ? void 0 : a.type) || l.type }),
        /* @__PURE__ */ g.jsx(en, { k: "Versión spec", v: a ? `v${a.version}` : "—" })
      ] })
    ] })
  ] });
}, Xl = ({ item: e, index: t }) => {
  const [n, r] = N.useState(t < 3);
  return /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__item", children: [
    /* @__PURE__ */ g.jsxs(
      "button",
      {
        type: "button",
        className: "kfc-drawer__item-head",
        onClick: () => r((o) => !o),
        "aria-expanded": n,
        children: [
          /* @__PURE__ */ g.jsx("i", { className: `pi ${n ? "pi-chevron-down" : "pi-chevron-right"}` }),
          /* @__PURE__ */ g.jsxs("span", { children: [
            "Item #",
            t + 1
          ] }),
          (e == null ? void 0 : e.json) && typeof e.json == "object" && /* @__PURE__ */ g.jsx("span", { className: "kfc-drawer__item-summary", children: BE(e.json) })
        ]
      }
    ),
    n && /* @__PURE__ */ g.jsx("pre", { className: "kfc-runlist__pre", children: VE(e, 6e3) })
  ] });
}, en = ({ k: e, v: t }) => /* @__PURE__ */ g.jsxs("div", { className: "kfc-drawer__kv", children: [
  /* @__PURE__ */ g.jsx("span", { className: "kfc-drawer__kv-k", children: e }),
  /* @__PURE__ */ g.jsx("span", { className: "kfc-drawer__kv-v", children: t })
] });
function VE(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
function Rd(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function BE(e) {
  if (!e) return "";
  const t = Object.keys(e);
  return t.length === 0 ? "(vacío)" : t.slice(0, 3).join(", ") + (t.length > 3 ? `, +${t.length - 3} más` : "");
}
const UE = ({ readOnly: e, onTemplateClick: t }) => e ? null : /* @__PURE__ */ g.jsx("div", { className: "kfc-canvas-empty", role: "status", "aria-live": "polite", children: /* @__PURE__ */ g.jsxs("div", { className: "kfc-canvas-empty__inner", children: [
  /* @__PURE__ */ g.jsx("span", { className: "kfc-canvas-empty__eyebrow", children: "Modo avanzado" }),
  /* @__PURE__ */ g.jsx("h2", { className: "kfc-canvas-empty__title", children: "Arma tu automatización paso a paso" }),
  /* @__PURE__ */ g.jsx("p", { className: "kfc-canvas-empty__desc", children: "Toca en la lista de la izquierda el paso que la arranca (por ejemplo, «Cuando entra un pedido en Shopify») y luego los que siguen: cada uno queda conectado después del anterior." }),
  /* @__PURE__ */ g.jsx("div", { className: "kfc-canvas-empty__acciones", children: /* @__PURE__ */ g.jsxs("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: () => t == null ? void 0 : t(), children: [
    /* @__PURE__ */ g.jsx("i", { className: "pi pi-th-large" }),
    "Mejor empezar con una plantilla"
  ] }) }),
  /* @__PURE__ */ g.jsxs("div", { className: "kfc-canvas-empty__hint", children: [
    /* @__PURE__ */ g.jsx("i", { className: "pi pi-info-circle" }),
    /* @__PURE__ */ g.jsxs("span", { children: [
      "Toca ",
      /* @__PURE__ */ g.jsx("kbd", { children: "?" }),
      " para ver los atajos de teclado."
    ] })
  ] })
] }) }), WE = ({
  onGraphChange: e,
  onNodeSelected: t,
  onRunRequested: n,
  onIntent: r
}) => {
  const o = Y((b) => b.graph), i = Y((b) => b.selectedNodeId), s = Y((b) => b.setSelectedNodeId), l = Y((b) => b.readOnly), a = Y((b) => b.runContext), u = Y((b) => b.rightView), c = Y((b) => b.setRightView), f = Y((b) => b.drawerNodeId), d = Y((b) => b.setDrawerNodeId), p = Y((b) => b.applyAutoLayout), [w, y] = I.useState(!1);
  N.useEffect(() => {
    e(o), y(Eg(o));
  }, [o, e]), N.useEffect(() => {
    t(i), i && u === "none" ? c("config") : !i && u === "config" && c("none");
  }, [i]);
  const k = N.useCallback(
    (b) => {
      s(b);
    },
    [s]
  ), h = N.useCallback(() => {
    c("none"), s(null);
  }, [s, c]), m = N.useCallback(() => {
    n({ triggerData: [] });
  }, [n]), v = N.useCallback(() => {
    p(), r && r("autoLayoutApplied");
  }, [p, r]), x = N.useCallback(() => {
    r && r("showShortcuts");
  }, [r]), C = a == null ? void 0 : a.status, z = C === "running", T = N.useMemo(() => {
    if (!a) return null;
    const b = Object.values(a.nodeStates || {}), H = b.length, S = b.filter((j) => j.status === "success" || j.status === "failed" || j.status === "skipped").length, A = b.filter((j) => j.status === "failed").length;
    return { total: H, done: S, failed: A };
  }, [a]), P = !o.nodes || o.nodes.length === 0, $ = N.useCallback(() => d(null), [d]), D = u === "config" && i, F = u === "runs";
  return /* @__PURE__ */ g.jsx(vc, { children: /* @__PURE__ */ g.jsxs("div", { className: "kfc-root", children: [
    !D && /* @__PURE__ */ g.jsx(EE, { readOnly: l, onIntent: r }),
    /* @__PURE__ */ g.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }, children: [
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-toolbar", children: [
        /* @__PURE__ */ g.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: () => c(u === "runs" ? "none" : "runs"),
            title: "Ver el resultado de la última prueba",
            children: [
              /* @__PURE__ */ g.jsx("i", { className: "pi pi-history" }),
              "Última prueba"
            ]
          }
        ),
        !l && /* @__PURE__ */ g.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: v,
            title: "Ordenar los pasos automáticamente",
            children: [
              /* @__PURE__ */ g.jsx("i", { className: "pi pi-sitemap" }),
              "Ordenar"
            ]
          }
        ),
        !l && /* @__PURE__ */ g.jsx(
          "button",
          {
            type: "button",
            className: `kfc-btn kfc-btn--primary ${z ? "kfc-btn--running" : ""}`,
            onClick: m,
            disabled: z,
            title: "Probar ahora (Ctrl+Enter)",
            children: z ? /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
              /* @__PURE__ */ g.jsx("i", { className: "pi pi-spin pi-spinner" }),
              "Probando…"
            ] }) : /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
              /* @__PURE__ */ g.jsx("i", { className: "pi pi-play" }),
              "Probar ahora"
            ] })
          }
        ),
        T && T.total > 0 && /* @__PURE__ */ g.jsxs(
          "span",
          {
            className: `kfc-run-badge kfc-run-badge--${C === "success" ? "success" : C === "failed" ? "failed" : z ? "running" : "neutral"}`,
            title: "Resultado de la prueba",
            children: [
              z && /* @__PURE__ */ g.jsx("i", { className: "pi pi-spin pi-spinner" }),
              !z && C === "success" && /* @__PURE__ */ g.jsx("i", { className: "pi pi-check-circle" }),
              !z && C === "failed" && /* @__PURE__ */ g.jsx("i", { className: "pi pi-times-circle" }),
              T.done,
              "/",
              T.total,
              " pasos",
              T.failed > 0 && /* @__PURE__ */ g.jsxs("span", { className: "kfc-run-badge__failed", children: [
                "· ",
                T.failed,
                " con error"
              ] })
            ]
          }
        ),
        w && /* @__PURE__ */ g.jsxs("span", { className: "kfc-pill kfc-pill--danger", title: "Hay conexiones en círculo", children: [
          /* @__PURE__ */ g.jsx("i", { className: "pi pi-exclamation-triangle" }),
          "Hay conexiones en círculo: revísalas"
        ] }),
        /* @__PURE__ */ g.jsx("span", { style: { flex: 1 } }),
        /* @__PURE__ */ g.jsx(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--ghost",
            onClick: x,
            title: "Atajos de teclado (?)",
            "aria-label": "Atajos de teclado",
            children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-question-circle" })
          }
        ),
        l && /* @__PURE__ */ g.jsxs("span", { className: "kfc-pill kfc-pill--neutral", children: [
          /* @__PURE__ */ g.jsx("i", { className: "pi pi-lock" }),
          "Solo lectura"
        ] })
      ] }),
      /* @__PURE__ */ g.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
        /* @__PURE__ */ g.jsx(SE, { onSelectNode: k, onIntent: r }),
        P && /* @__PURE__ */ g.jsx(
          UE,
          {
            readOnly: l,
            onTemplateClick: () => r == null ? void 0 : r("openTemplates")
          }
        )
      ] })
    ] }),
    D && /* @__PURE__ */ g.jsx(
      jE,
      {
        onClose: h,
        onOpenIntegrations: (b) => r == null ? void 0 : r("openIntegrations", { provider: b })
      }
    ),
    F && /* @__PURE__ */ g.jsxs("aside", { className: "kfc-config", "aria-label": "Resultado de la prueba", children: [
      /* @__PURE__ */ g.jsxs("div", { className: "kfc-config__header", children: [
        /* @__PURE__ */ g.jsxs("div", { children: [
          /* @__PURE__ */ g.jsx("div", { className: "kfc-config__title", children: "Resultado de la prueba" }),
          a && /* @__PURE__ */ g.jsxs("div", { style: { fontSize: 11, color: "#6b7280" }, children: [
            { success: "Bien", failed: "Falló", partial: "Con pendientes", running: "Probando", cancelled: "Cancelada" }[C || ""] || "",
            a.totalDurationMs != null ? ` · ${(a.totalDurationMs / 1e3).toFixed(1).replace(".", ",")} s` : ""
          ] })
        ] }),
        /* @__PURE__ */ g.jsx("button", { type: "button", className: "kfc-btn", onClick: () => c("none"), "aria-label": "Cerrar", children: /* @__PURE__ */ g.jsx("i", { className: "pi pi-times" }) })
      ] }),
      /* @__PURE__ */ g.jsx("div", { className: "kfc-config__body", style: { padding: 0 }, children: /* @__PURE__ */ g.jsx(bE, { runContext: a }) })
    ] }),
    f && /* @__PURE__ */ g.jsx(HE, { nodeId: f, onClose: $ })
  ] }) });
};
class YE extends HTMLElement {
  constructor() {
    super(...arguments);
    mt(this, "root", null);
    mt(this, "mountPoint", null);
    mt(this, "suppressEmit", !1);
    mt(this, "keydownHandler");
    mt(this, "_graph", { nodes: [], edges: [] });
    mt(this, "_catalog", []);
    mt(this, "_runContext", null);
    mt(this, "_readOnly", !1);
    mt(this, "_selectedNodeId", null);
    mt(this, "_connectedProviders", null);
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
    this.root || (this.mountPoint = document.createElement("div"), this.mountPoint.style.width = "100%", this.mountPoint.style.height = "100%", this.mountPoint.style.position = "relative", this.mountPoint.style.display = "flex", this.style.display = this.style.display || "block", this.style.position = this.style.position || "relative", this.style.minHeight = this.style.minHeight || "500px", this.appendChild(this.mountPoint), Y.getState().setGraph(this._graph), Y.getState().setCatalog(this._catalog), Y.getState().setRunContext(this._runContext), Y.getState().setReadOnly(this._readOnly), Y.getState().setSelectedNodeId(this._selectedNodeId), Y.getState().setConnectedProviders(this._connectedProviders), this.root = qh(this.mountPoint), this.root.render(
      /* @__PURE__ */ g.jsx(
        WE,
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
customElements.get("katuq-flow-canvas") || customElements.define("katuq-flow-canvas", YE);
export {
  YE as KatuqFlowCanvas
};
//# sourceMappingURL=flow-canvas.js.map
