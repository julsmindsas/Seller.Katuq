var Ag = Object.defineProperty;
var Ig = (e, t, n) => t in e ? Ag(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var Nt = (e, t, n) => Ig(e, typeof t != "symbol" ? t + "" : t, n);
function Uu(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var cd = { exports: {} }, Ns = {}, fd = { exports: {} }, J = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Qo = Symbol.for("react.element"), Dg = Symbol.for("react.portal"), Lg = Symbol.for("react.fragment"), Og = Symbol.for("react.strict_mode"), Fg = Symbol.for("react.profiler"), Hg = Symbol.for("react.provider"), Vg = Symbol.for("react.context"), Bg = Symbol.for("react.forward_ref"), bg = Symbol.for("react.suspense"), Ug = Symbol.for("react.memo"), Wg = Symbol.for("react.lazy"), lc = Symbol.iterator;
function Yg(e) {
  return e === null || typeof e != "object" ? null : (e = lc && e[lc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var dd = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, pd = Object.assign, hd = {};
function Br(e, t, n) {
  this.props = e, this.context = t, this.refs = hd, this.updater = n || dd;
}
Br.prototype.isReactComponent = {};
Br.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Br.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function md() {
}
md.prototype = Br.prototype;
function Wu(e, t, n) {
  this.props = e, this.context = t, this.refs = hd, this.updater = n || dd;
}
var Yu = Wu.prototype = new md();
Yu.constructor = Wu;
pd(Yu, Br.prototype);
Yu.isPureReactComponent = !0;
var uc = Array.isArray, gd = Object.prototype.hasOwnProperty, Xu = { current: null }, yd = { key: !0, ref: !0, __self: !0, __source: !0 };
function vd(e, t, n) {
  var r, o = {}, i = null, s = null;
  if (t != null) for (r in t.ref !== void 0 && (s = t.ref), t.key !== void 0 && (i = "" + t.key), t) gd.call(t, r) && !yd.hasOwnProperty(r) && (o[r] = t[r]);
  var l = arguments.length - 2;
  if (l === 1) o.children = n;
  else if (1 < l) {
    for (var u = Array(l), a = 0; a < l; a++) u[a] = arguments[a + 2];
    o.children = u;
  }
  if (e && e.defaultProps) for (r in l = e.defaultProps, l) o[r] === void 0 && (o[r] = l[r]);
  return { $$typeof: Qo, type: e, key: i, ref: s, props: o, _owner: Xu.current };
}
function Xg(e, t) {
  return { $$typeof: Qo, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Ku(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Qo;
}
function Kg(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var ac = /\/+/g;
function qs(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? Kg("" + e.key) : t.toString(36);
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
        case Qo:
        case Dg:
          s = !0;
      }
  }
  if (s) return s = e, o = o(s), e = r === "" ? "." + qs(s, 0) : r, uc(o) ? (n = "", e != null && (n = e.replace(ac, "$&/") + "/"), Ti(o, t, n, "", function(a) {
    return a;
  })) : o != null && (Ku(o) && (o = Xg(o, n + (!o.key || s && s.key === o.key ? "" : ("" + o.key).replace(ac, "$&/") + "/") + e)), t.push(o)), 1;
  if (s = 0, r = r === "" ? "." : r + ":", uc(e)) for (var l = 0; l < e.length; l++) {
    i = e[l];
    var u = r + qs(i, l);
    s += Ti(i, t, n, u, o);
  }
  else if (u = Yg(e), typeof u == "function") for (e = u.call(e), l = 0; !(i = e.next()).done; ) i = i.value, u = r + qs(i, l++), s += Ti(i, t, n, u, o);
  else if (i === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return s;
}
function oi(e, t, n) {
  if (e == null) return e;
  var r = [], o = 0;
  return Ti(e, r, "", "", function(i) {
    return t.call(n, i, o++);
  }), r;
}
function Gg(e) {
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
var Be = { current: null }, ji = { transition: null }, Qg = { ReactCurrentDispatcher: Be, ReactCurrentBatchConfig: ji, ReactCurrentOwner: Xu };
function wd() {
  throw Error("act(...) is not supported in production builds of React.");
}
J.Children = { map: oi, forEach: function(e, t, n) {
  oi(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return oi(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return oi(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!Ku(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
J.Component = Br;
J.Fragment = Lg;
J.Profiler = Fg;
J.PureComponent = Wu;
J.StrictMode = Og;
J.Suspense = bg;
J.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Qg;
J.act = wd;
J.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = pd({}, e.props), o = e.key, i = e.ref, s = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (i = t.ref, s = Xu.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps) var l = e.type.defaultProps;
    for (u in t) gd.call(t, u) && !yd.hasOwnProperty(u) && (r[u] = t[u] === void 0 && l !== void 0 ? l[u] : t[u]);
  }
  var u = arguments.length - 2;
  if (u === 1) r.children = n;
  else if (1 < u) {
    l = Array(u);
    for (var a = 0; a < u; a++) l[a] = arguments[a + 2];
    r.children = l;
  }
  return { $$typeof: Qo, type: e.type, key: o, ref: i, props: r, _owner: s };
};
J.createContext = function(e) {
  return e = { $$typeof: Vg, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Hg, _context: e }, e.Consumer = e;
};
J.createElement = vd;
J.createFactory = function(e) {
  var t = vd.bind(null, e);
  return t.type = e, t;
};
J.createRef = function() {
  return { current: null };
};
J.forwardRef = function(e) {
  return { $$typeof: Bg, render: e };
};
J.isValidElement = Ku;
J.lazy = function(e) {
  return { $$typeof: Wg, _payload: { _status: -1, _result: e }, _init: Gg };
};
J.memo = function(e, t) {
  return { $$typeof: Ug, type: e, compare: t === void 0 ? null : t };
};
J.startTransition = function(e) {
  var t = ji.transition;
  ji.transition = {};
  try {
    e();
  } finally {
    ji.transition = t;
  }
};
J.unstable_act = wd;
J.useCallback = function(e, t) {
  return Be.current.useCallback(e, t);
};
J.useContext = function(e) {
  return Be.current.useContext(e);
};
J.useDebugValue = function() {
};
J.useDeferredValue = function(e) {
  return Be.current.useDeferredValue(e);
};
J.useEffect = function(e, t) {
  return Be.current.useEffect(e, t);
};
J.useId = function() {
  return Be.current.useId();
};
J.useImperativeHandle = function(e, t, n) {
  return Be.current.useImperativeHandle(e, t, n);
};
J.useInsertionEffect = function(e, t) {
  return Be.current.useInsertionEffect(e, t);
};
J.useLayoutEffect = function(e, t) {
  return Be.current.useLayoutEffect(e, t);
};
J.useMemo = function(e, t) {
  return Be.current.useMemo(e, t);
};
J.useReducer = function(e, t, n) {
  return Be.current.useReducer(e, t, n);
};
J.useRef = function(e) {
  return Be.current.useRef(e);
};
J.useState = function(e) {
  return Be.current.useState(e);
};
J.useSyncExternalStore = function(e, t, n) {
  return Be.current.useSyncExternalStore(e, t, n);
};
J.useTransition = function() {
  return Be.current.useTransition();
};
J.version = "18.3.1";
fd.exports = J;
var P = fd.exports;
const I = /* @__PURE__ */ Uu(P);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Zg = P, qg = Symbol.for("react.element"), Jg = Symbol.for("react.fragment"), e0 = Object.prototype.hasOwnProperty, t0 = Zg.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, n0 = { key: !0, ref: !0, __self: !0, __source: !0 };
function xd(e, t, n) {
  var r, o = {}, i = null, s = null;
  n !== void 0 && (i = "" + n), t.key !== void 0 && (i = "" + t.key), t.ref !== void 0 && (s = t.ref);
  for (r in t) e0.call(t, r) && !n0.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: qg, type: e, key: i, ref: s, props: o, _owner: t0.current };
}
Ns.Fragment = Jg;
Ns.jsx = xd;
Ns.jsxs = xd;
cd.exports = Ns;
var x = cd.exports, _d = { exports: {} }, nt = {}, Sd = { exports: {} }, kd = {};
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
  function t(R, E) {
    var A = R.length;
    R.push(E);
    e: for (; 0 < A; ) {
      var F = A - 1 >>> 1, H = R[F];
      if (0 < o(H, E)) R[F] = E, R[A] = H, A = F;
      else break e;
    }
  }
  function n(R) {
    return R.length === 0 ? null : R[0];
  }
  function r(R) {
    if (R.length === 0) return null;
    var E = R[0], A = R.pop();
    if (A !== E) {
      R[0] = A;
      e: for (var F = 0, H = R.length, U = H >>> 1; F < U; ) {
        var b = 2 * (F + 1) - 1, Y = R[b], Q = b + 1, Z = R[Q];
        if (0 > o(Y, A)) Q < H && 0 > o(Z, Y) ? (R[F] = Z, R[Q] = A, F = Q) : (R[F] = Y, R[b] = A, F = b);
        else if (Q < H && 0 > o(Z, A)) R[F] = Z, R[Q] = A, F = Q;
        else break e;
      }
    }
    return E;
  }
  function o(R, E) {
    var A = R.sortIndex - E.sortIndex;
    return A !== 0 ? A : R.id - E.id;
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
  var u = [], a = [], c = 1, f = null, d = 3, m = !1, w = !1, y = !1, k = typeof setTimeout == "function" ? setTimeout : null, p = typeof clearTimeout == "function" ? clearTimeout : null, h = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function g(R) {
    for (var E = n(a); E !== null; ) {
      if (E.callback === null) r(a);
      else if (E.startTime <= R) r(a), E.sortIndex = E.expirationTime, t(u, E);
      else break;
      E = n(a);
    }
  }
  function v(R) {
    if (y = !1, g(R), !w) if (n(u) !== null) w = !0, M(C);
    else {
      var E = n(a);
      E !== null && O(v, E.startTime - R);
    }
  }
  function C(R, E) {
    w = !1, y && (y = !1, p(T), T = -1), m = !0;
    var A = d;
    try {
      for (g(E), f = n(u); f !== null && (!(f.expirationTime > E) || R && !L()); ) {
        var F = f.callback;
        if (typeof F == "function") {
          f.callback = null, d = f.priorityLevel;
          var H = F(f.expirationTime <= E);
          E = e.unstable_now(), typeof H == "function" ? f.callback = H : f === n(u) && r(u), g(E);
        } else r(u);
        f = n(u);
      }
      if (f !== null) var U = !0;
      else {
        var b = n(a);
        b !== null && O(v, b.startTime - E), U = !1;
      }
      return U;
    } finally {
      f = null, d = A, m = !1;
    }
  }
  var z = !1, j = null, T = -1, S = 5, N = -1;
  function L() {
    return !(e.unstable_now() - N < S);
  }
  function D() {
    if (j !== null) {
      var R = e.unstable_now();
      N = R;
      var E = !0;
      try {
        E = j(!0, R);
      } finally {
        E ? V() : (z = !1, j = null);
      }
    } else z = !1;
  }
  var V;
  if (typeof h == "function") V = function() {
    h(D);
  };
  else if (typeof MessageChannel < "u") {
    var _ = new MessageChannel(), $ = _.port2;
    _.port1.onmessage = D, V = function() {
      $.postMessage(null);
    };
  } else V = function() {
    k(D, 0);
  };
  function M(R) {
    j = R, z || (z = !0, V());
  }
  function O(R, E) {
    T = k(function() {
      R(e.unstable_now());
    }, E);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(R) {
    R.callback = null;
  }, e.unstable_continueExecution = function() {
    w || m || (w = !0, M(C));
  }, e.unstable_forceFrameRate = function(R) {
    0 > R || 125 < R ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : S = 0 < R ? Math.floor(1e3 / R) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return d;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(u);
  }, e.unstable_next = function(R) {
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
      return R();
    } finally {
      d = A;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(R, E) {
    switch (R) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        R = 3;
    }
    var A = d;
    d = R;
    try {
      return E();
    } finally {
      d = A;
    }
  }, e.unstable_scheduleCallback = function(R, E, A) {
    var F = e.unstable_now();
    switch (typeof A == "object" && A !== null ? (A = A.delay, A = typeof A == "number" && 0 < A ? F + A : F) : A = F, R) {
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
    return H = A + H, R = { id: c++, callback: E, priorityLevel: R, startTime: A, expirationTime: H, sortIndex: -1 }, A > F ? (R.sortIndex = A, t(a, R), n(u) === null && R === n(a) && (y ? (p(T), T = -1) : y = !0, O(v, A - F))) : (R.sortIndex = H, t(u, R), w || m || (w = !0, M(C))), R;
  }, e.unstable_shouldYield = L, e.unstable_wrapCallback = function(R) {
    var E = d;
    return function() {
      var A = d;
      d = E;
      try {
        return R.apply(this, arguments);
      } finally {
        d = A;
      }
    };
  };
})(kd);
Sd.exports = kd;
var r0 = Sd.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var o0 = P, et = r0;
function B(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Ed = /* @__PURE__ */ new Set(), No = {};
function Qn(e, t) {
  Tr(e, t), Tr(e + "Capture", t);
}
function Tr(e, t) {
  for (No[e] = t, e = 0; e < t.length; e++) Ed.add(t[e]);
}
var Ut = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Dl = Object.prototype.hasOwnProperty, i0 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, cc = {}, fc = {};
function s0(e) {
  return Dl.call(fc, e) ? !0 : Dl.call(cc, e) ? !1 : i0.test(e) ? fc[e] = !0 : (cc[e] = !0, !1);
}
function l0(e, t, n, r) {
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
function u0(e, t, n, r) {
  if (t === null || typeof t > "u" || l0(e, t, n, r)) return !0;
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
function be(e, t, n, r, o, i, s) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = o, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = i, this.removeEmptyString = s;
}
var Te = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  Te[e] = new be(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  Te[t] = new be(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  Te[e] = new be(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  Te[e] = new be(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  Te[e] = new be(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  Te[e] = new be(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  Te[e] = new be(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  Te[e] = new be(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  Te[e] = new be(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Gu = /[\-:]([a-z])/g;
function Qu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Gu,
    Qu
  );
  Te[t] = new be(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Gu, Qu);
  Te[t] = new be(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Gu, Qu);
  Te[t] = new be(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  Te[e] = new be(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
Te.xlinkHref = new be("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  Te[e] = new be(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Zu(e, t, n, r) {
  var o = Te.hasOwnProperty(t) ? Te[t] : null;
  (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (u0(t, n, o, r) && (n = null), r || o === null ? s0(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName, r = o.attributeNamespace, n === null ? e.removeAttribute(t) : (o = o.type, n = o === 3 || o === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Qt = o0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, ii = Symbol.for("react.element"), ur = Symbol.for("react.portal"), ar = Symbol.for("react.fragment"), qu = Symbol.for("react.strict_mode"), Ll = Symbol.for("react.profiler"), Nd = Symbol.for("react.provider"), Cd = Symbol.for("react.context"), Ju = Symbol.for("react.forward_ref"), Ol = Symbol.for("react.suspense"), Fl = Symbol.for("react.suspense_list"), ea = Symbol.for("react.memo"), en = Symbol.for("react.lazy"), Md = Symbol.for("react.offscreen"), dc = Symbol.iterator;
function Gr(e) {
  return e === null || typeof e != "object" ? null : (e = dc && e[dc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var pe = Object.assign, Js;
function uo(e) {
  if (Js === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    Js = t && t[1] || "";
  }
  return `
` + Js + e;
}
var el = !1;
function tl(e, t) {
  if (!e || el) return "";
  el = !0;
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
      } catch (a) {
        var r = a;
      }
      Reflect.construct(e, [], t);
    } else {
      try {
        t.call();
      } catch (a) {
        r = a;
      }
      e.call(t.prototype);
    }
    else {
      try {
        throw Error();
      } catch (a) {
        r = a;
      }
      e();
    }
  } catch (a) {
    if (a && r && typeof a.stack == "string") {
      for (var o = a.stack.split(`
`), i = r.stack.split(`
`), s = o.length - 1, l = i.length - 1; 1 <= s && 0 <= l && o[s] !== i[l]; ) l--;
      for (; 1 <= s && 0 <= l; s--, l--) if (o[s] !== i[l]) {
        if (s !== 1 || l !== 1)
          do
            if (s--, l--, 0 > l || o[s] !== i[l]) {
              var u = `
` + o[s].replace(" at new ", " at ");
              return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
            }
          while (1 <= s && 0 <= l);
        break;
      }
    }
  } finally {
    el = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? uo(e) : "";
}
function a0(e) {
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
      return e = tl(e.type, !1), e;
    case 11:
      return e = tl(e.type.render, !1), e;
    case 1:
      return e = tl(e.type, !0), e;
    default:
      return "";
  }
}
function Hl(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case ar:
      return "Fragment";
    case ur:
      return "Portal";
    case Ll:
      return "Profiler";
    case qu:
      return "StrictMode";
    case Ol:
      return "Suspense";
    case Fl:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case Cd:
      return (e.displayName || "Context") + ".Consumer";
    case Nd:
      return (e._context.displayName || "Context") + ".Provider";
    case Ju:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case ea:
      return t = e.displayName || null, t !== null ? t : Hl(e.type) || "Memo";
    case en:
      t = e._payload, e = e._init;
      try {
        return Hl(e(t));
      } catch {
      }
  }
  return null;
}
function c0(e) {
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
      return Hl(t);
    case 8:
      return t === qu ? "StrictMode" : "Mode";
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
function Pd(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function f0(e) {
  var t = Pd(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
function si(e) {
  e._valueTracker || (e._valueTracker = f0(e));
}
function zd(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Pd(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function Yi(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Vl(e, t) {
  var n = t.checked;
  return pe({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function pc(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = wn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Td(e, t) {
  t = t.checked, t != null && Zu(e, "checked", t, !1);
}
function Bl(e, t) {
  Td(e, t);
  var n = wn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? bl(e, t.type, n) : t.hasOwnProperty("defaultValue") && bl(e, t.type, wn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function hc(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function bl(e, t, n) {
  (t !== "number" || Yi(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var ao = Array.isArray;
function _r(e, t, n, r) {
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
function Ul(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(B(91));
  return pe({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function mc(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(B(92));
      if (ao(n)) {
        if (1 < n.length) throw Error(B(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: wn(n) };
}
function jd(e, t) {
  var n = wn(t.value), r = wn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function gc(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Rd(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Wl(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Rd(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var li, $d = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, o) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, o);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (li = li || document.createElement("div"), li.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = li.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function Co(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var go = {
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
}, d0 = ["Webkit", "ms", "Moz", "O"];
Object.keys(go).forEach(function(e) {
  d0.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), go[t] = go[e];
  });
});
function Ad(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || go.hasOwnProperty(e) && go[e] ? ("" + t).trim() : t + "px";
}
function Id(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, o = Ad(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : e[n] = o;
  }
}
var p0 = pe({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Yl(e, t) {
  if (t) {
    if (p0[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(B(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(B(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(B(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(B(62));
  }
}
function Xl(e, t) {
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
var Kl = null;
function ta(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Gl = null, Sr = null, kr = null;
function yc(e) {
  if (e = Jo(e)) {
    if (typeof Gl != "function") throw Error(B(280));
    var t = e.stateNode;
    t && (t = Ts(t), Gl(e.stateNode, e.type, t));
  }
}
function Dd(e) {
  Sr ? kr ? kr.push(e) : kr = [e] : Sr = e;
}
function Ld() {
  if (Sr) {
    var e = Sr, t = kr;
    if (kr = Sr = null, yc(e), t) for (e = 0; e < t.length; e++) yc(t[e]);
  }
}
function Od(e, t) {
  return e(t);
}
function Fd() {
}
var nl = !1;
function Hd(e, t, n) {
  if (nl) return e(t, n);
  nl = !0;
  try {
    return Od(e, t, n);
  } finally {
    nl = !1, (Sr !== null || kr !== null) && (Fd(), Ld());
  }
}
function Mo(e, t) {
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
  if (n && typeof n != "function") throw Error(B(231, t, typeof n));
  return n;
}
var Ql = !1;
if (Ut) try {
  var Qr = {};
  Object.defineProperty(Qr, "passive", { get: function() {
    Ql = !0;
  } }), window.addEventListener("test", Qr, Qr), window.removeEventListener("test", Qr, Qr);
} catch {
  Ql = !1;
}
function h0(e, t, n, r, o, i, s, l, u) {
  var a = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, a);
  } catch (c) {
    this.onError(c);
  }
}
var yo = !1, Xi = null, Ki = !1, Zl = null, m0 = { onError: function(e) {
  yo = !0, Xi = e;
} };
function g0(e, t, n, r, o, i, s, l, u) {
  yo = !1, Xi = null, h0.apply(m0, arguments);
}
function y0(e, t, n, r, o, i, s, l, u) {
  if (g0.apply(this, arguments), yo) {
    if (yo) {
      var a = Xi;
      yo = !1, Xi = null;
    } else throw Error(B(198));
    Ki || (Ki = !0, Zl = a);
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
function Vd(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function vc(e) {
  if (Zn(e) !== e) throw Error(B(188));
}
function v0(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Zn(e), t === null) throw Error(B(188));
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
        if (i === n) return vc(o), e;
        if (i === r) return vc(o), t;
        i = i.sibling;
      }
      throw Error(B(188));
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
        if (!s) throw Error(B(189));
      }
    }
    if (n.alternate !== r) throw Error(B(190));
  }
  if (n.tag !== 3) throw Error(B(188));
  return n.stateNode.current === n ? e : t;
}
function Bd(e) {
  return e = v0(e), e !== null ? bd(e) : null;
}
function bd(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = bd(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Ud = et.unstable_scheduleCallback, wc = et.unstable_cancelCallback, w0 = et.unstable_shouldYield, x0 = et.unstable_requestPaint, ye = et.unstable_now, _0 = et.unstable_getCurrentPriorityLevel, na = et.unstable_ImmediatePriority, Wd = et.unstable_UserBlockingPriority, Gi = et.unstable_NormalPriority, S0 = et.unstable_LowPriority, Yd = et.unstable_IdlePriority, Cs = null, zt = null;
function k0(e) {
  if (zt && typeof zt.onCommitFiberRoot == "function") try {
    zt.onCommitFiberRoot(Cs, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var xt = Math.clz32 ? Math.clz32 : C0, E0 = Math.log, N0 = Math.LN2;
function C0(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (E0(e) / N0 | 0) | 0;
}
var ui = 64, ai = 4194304;
function co(e) {
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
    l !== 0 ? r = co(l) : (i &= s, i !== 0 && (r = co(i)));
  } else s = n & ~o, s !== 0 ? r = co(s) : i !== 0 && (r = co(i));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & o) && (o = r & -r, i = t & -t, o >= i || o === 16 && (i & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - xt(t), o = 1 << n, r |= e[n], t &= ~o;
  return r;
}
function M0(e, t) {
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
function P0(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
    var s = 31 - xt(i), l = 1 << s, u = o[s];
    u === -1 ? (!(l & n) || l & r) && (o[s] = M0(l, t)) : u <= t && (e.expiredLanes |= l), i &= ~l;
  }
}
function ql(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Xd() {
  var e = ui;
  return ui <<= 1, !(ui & 4194240) && (ui = 64), e;
}
function rl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function Zo(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - xt(t), e[t] = n;
}
function z0(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var o = 31 - xt(n), i = 1 << o;
    t[o] = 0, r[o] = -1, e[o] = -1, n &= ~i;
  }
}
function ra(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - xt(n), o = 1 << r;
    o & t | e[r] & t && (e[r] |= t), n &= ~o;
  }
}
var oe = 0;
function Kd(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var Gd, oa, Qd, Zd, qd, Jl = !1, ci = [], cn = null, fn = null, dn = null, Po = /* @__PURE__ */ new Map(), zo = /* @__PURE__ */ new Map(), on = [], T0 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function xc(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      cn = null;
      break;
    case "dragenter":
    case "dragleave":
      fn = null;
      break;
    case "mouseover":
    case "mouseout":
      dn = null;
      break;
    case "pointerover":
    case "pointerout":
      Po.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      zo.delete(t.pointerId);
  }
}
function Zr(e, t, n, r, o, i) {
  return e === null || e.nativeEvent !== i ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: i, targetContainers: [o] }, t !== null && (t = Jo(t), t !== null && oa(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e);
}
function j0(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return cn = Zr(cn, e, t, n, r, o), !0;
    case "dragenter":
      return fn = Zr(fn, e, t, n, r, o), !0;
    case "mouseover":
      return dn = Zr(dn, e, t, n, r, o), !0;
    case "pointerover":
      var i = o.pointerId;
      return Po.set(i, Zr(Po.get(i) || null, e, t, n, r, o)), !0;
    case "gotpointercapture":
      return i = o.pointerId, zo.set(i, Zr(zo.get(i) || null, e, t, n, r, o)), !0;
  }
  return !1;
}
function Jd(e) {
  var t = An(e.target);
  if (t !== null) {
    var n = Zn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Vd(n), t !== null) {
          e.blockedOn = t, qd(e.priority, function() {
            Qd(n);
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
    var n = eu(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      Kl = r, n.target.dispatchEvent(r), Kl = null;
    } else return t = Jo(n), t !== null && oa(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function _c(e, t, n) {
  Ri(e) && n.delete(t);
}
function R0() {
  Jl = !1, cn !== null && Ri(cn) && (cn = null), fn !== null && Ri(fn) && (fn = null), dn !== null && Ri(dn) && (dn = null), Po.forEach(_c), zo.forEach(_c);
}
function qr(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Jl || (Jl = !0, et.unstable_scheduleCallback(et.unstable_NormalPriority, R0)));
}
function To(e) {
  function t(o) {
    return qr(o, e);
  }
  if (0 < ci.length) {
    qr(ci[0], e);
    for (var n = 1; n < ci.length; n++) {
      var r = ci[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (cn !== null && qr(cn, e), fn !== null && qr(fn, e), dn !== null && qr(dn, e), Po.forEach(t), zo.forEach(t), n = 0; n < on.length; n++) r = on[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < on.length && (n = on[0], n.blockedOn === null); ) Jd(n), n.blockedOn === null && on.shift();
}
var Er = Qt.ReactCurrentBatchConfig, Zi = !0;
function $0(e, t, n, r) {
  var o = oe, i = Er.transition;
  Er.transition = null;
  try {
    oe = 1, ia(e, t, n, r);
  } finally {
    oe = o, Er.transition = i;
  }
}
function A0(e, t, n, r) {
  var o = oe, i = Er.transition;
  Er.transition = null;
  try {
    oe = 4, ia(e, t, n, r);
  } finally {
    oe = o, Er.transition = i;
  }
}
function ia(e, t, n, r) {
  if (Zi) {
    var o = eu(e, t, n, r);
    if (o === null) pl(e, t, r, qi, n), xc(e, r);
    else if (j0(o, e, t, n, r)) r.stopPropagation();
    else if (xc(e, r), t & 4 && -1 < T0.indexOf(e)) {
      for (; o !== null; ) {
        var i = Jo(o);
        if (i !== null && Gd(i), i = eu(e, t, n, r), i === null && pl(e, t, r, qi, n), i === o) break;
        o = i;
      }
      o !== null && r.stopPropagation();
    } else pl(e, t, r, null, n);
  }
}
var qi = null;
function eu(e, t, n, r) {
  if (qi = null, e = ta(r), e = An(e), e !== null) if (t = Zn(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Vd(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return qi = e, null;
}
function ep(e) {
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
      switch (_0()) {
        case na:
          return 1;
        case Wd:
          return 4;
        case Gi:
        case S0:
          return 16;
        case Yd:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var un = null, sa = null, $i = null;
function tp() {
  if ($i) return $i;
  var e, t = sa, n = t.length, r, o = "value" in un ? un.value : un.textContent, i = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++) ;
  var s = n - e;
  for (r = 1; r <= s && t[n - r] === o[i - r]; r++) ;
  return $i = o.slice(e, 1 < r ? 1 - r : void 0);
}
function Ai(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function fi() {
  return !0;
}
function Sc() {
  return !1;
}
function rt(e) {
  function t(n, r, o, i, s) {
    this._reactName = n, this._targetInst = o, this.type = r, this.nativeEvent = i, this.target = s, this.currentTarget = null;
    for (var l in e) e.hasOwnProperty(l) && (n = e[l], this[l] = n ? n(i) : i[l]);
    return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? fi : Sc, this.isPropagationStopped = Sc, this;
  }
  return pe(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = fi);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = fi);
  }, persist: function() {
  }, isPersistent: fi }), t;
}
var br = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, la = rt(br), qo = pe({}, br, { view: 0, detail: 0 }), I0 = rt(qo), ol, il, Jr, Ms = pe({}, qo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: ua, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== Jr && (Jr && e.type === "mousemove" ? (ol = e.screenX - Jr.screenX, il = e.screenY - Jr.screenY) : il = ol = 0, Jr = e), ol);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : il;
} }), kc = rt(Ms), D0 = pe({}, Ms, { dataTransfer: 0 }), L0 = rt(D0), O0 = pe({}, qo, { relatedTarget: 0 }), sl = rt(O0), F0 = pe({}, br, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), H0 = rt(F0), V0 = pe({}, br, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), B0 = rt(V0), b0 = pe({}, br, { data: 0 }), Ec = rt(b0), U0 = {
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
}, W0 = {
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
}, Y0 = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function X0(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Y0[e]) ? !!t[e] : !1;
}
function ua() {
  return X0;
}
var K0 = pe({}, qo, { key: function(e) {
  if (e.key) {
    var t = U0[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Ai(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? W0[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: ua, charCode: function(e) {
  return e.type === "keypress" ? Ai(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Ai(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), G0 = rt(K0), Q0 = pe({}, Ms, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Nc = rt(Q0), Z0 = pe({}, qo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: ua }), q0 = rt(Z0), J0 = pe({}, br, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), ey = rt(J0), ty = pe({}, Ms, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), ny = rt(ty), ry = [9, 13, 27, 32], aa = Ut && "CompositionEvent" in window, vo = null;
Ut && "documentMode" in document && (vo = document.documentMode);
var oy = Ut && "TextEvent" in window && !vo, np = Ut && (!aa || vo && 8 < vo && 11 >= vo), Cc = " ", Mc = !1;
function rp(e, t) {
  switch (e) {
    case "keyup":
      return ry.indexOf(t.keyCode) !== -1;
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
function op(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var cr = !1;
function iy(e, t) {
  switch (e) {
    case "compositionend":
      return op(t);
    case "keypress":
      return t.which !== 32 ? null : (Mc = !0, Cc);
    case "textInput":
      return e = t.data, e === Cc && Mc ? null : e;
    default:
      return null;
  }
}
function sy(e, t) {
  if (cr) return e === "compositionend" || !aa && rp(e, t) ? (e = tp(), $i = sa = un = null, cr = !1, e) : null;
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
      return np && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var ly = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function Pc(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!ly[e.type] : t === "textarea";
}
function ip(e, t, n, r) {
  Dd(r), t = Ji(t, "onChange"), 0 < t.length && (n = new la("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var wo = null, jo = null;
function uy(e) {
  gp(e, 0);
}
function Ps(e) {
  var t = pr(e);
  if (zd(t)) return e;
}
function ay(e, t) {
  if (e === "change") return t;
}
var sp = !1;
if (Ut) {
  var ll;
  if (Ut) {
    var ul = "oninput" in document;
    if (!ul) {
      var zc = document.createElement("div");
      zc.setAttribute("oninput", "return;"), ul = typeof zc.oninput == "function";
    }
    ll = ul;
  } else ll = !1;
  sp = ll && (!document.documentMode || 9 < document.documentMode);
}
function Tc() {
  wo && (wo.detachEvent("onpropertychange", lp), jo = wo = null);
}
function lp(e) {
  if (e.propertyName === "value" && Ps(jo)) {
    var t = [];
    ip(t, jo, e, ta(e)), Hd(uy, t);
  }
}
function cy(e, t, n) {
  e === "focusin" ? (Tc(), wo = t, jo = n, wo.attachEvent("onpropertychange", lp)) : e === "focusout" && Tc();
}
function fy(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ps(jo);
}
function dy(e, t) {
  if (e === "click") return Ps(t);
}
function py(e, t) {
  if (e === "input" || e === "change") return Ps(t);
}
function hy(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var St = typeof Object.is == "function" ? Object.is : hy;
function Ro(e, t) {
  if (St(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!Dl.call(t, o) || !St(e[o], t[o])) return !1;
  }
  return !0;
}
function jc(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function Rc(e, t) {
  var n = jc(e);
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
    n = jc(n);
  }
}
function up(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? up(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function ap() {
  for (var e = window, t = Yi(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Yi(e.document);
  }
  return t;
}
function ca(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function my(e) {
  var t = ap(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && up(n.ownerDocument.documentElement, n)) {
    if (r !== null && ca(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var o = n.textContent.length, i = Math.min(r.start, o);
        r = r.end === void 0 ? i : Math.min(r.end, o), !e.extend && i > r && (o = r, r = i, i = o), o = Rc(n, i);
        var s = Rc(
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
var gy = Ut && "documentMode" in document && 11 >= document.documentMode, fr = null, tu = null, xo = null, nu = !1;
function $c(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  nu || fr == null || fr !== Yi(r) || (r = fr, "selectionStart" in r && ca(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), xo && Ro(xo, r) || (xo = r, r = Ji(tu, "onSelect"), 0 < r.length && (t = new la("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = fr)));
}
function di(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var dr = { animationend: di("Animation", "AnimationEnd"), animationiteration: di("Animation", "AnimationIteration"), animationstart: di("Animation", "AnimationStart"), transitionend: di("Transition", "TransitionEnd") }, al = {}, cp = {};
Ut && (cp = document.createElement("div").style, "AnimationEvent" in window || (delete dr.animationend.animation, delete dr.animationiteration.animation, delete dr.animationstart.animation), "TransitionEvent" in window || delete dr.transitionend.transition);
function zs(e) {
  if (al[e]) return al[e];
  if (!dr[e]) return e;
  var t = dr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in cp) return al[e] = t[n];
  return e;
}
var fp = zs("animationend"), dp = zs("animationiteration"), pp = zs("animationstart"), hp = zs("transitionend"), mp = /* @__PURE__ */ new Map(), Ac = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function _n(e, t) {
  mp.set(e, t), Qn(t, [e]);
}
for (var cl = 0; cl < Ac.length; cl++) {
  var fl = Ac[cl], yy = fl.toLowerCase(), vy = fl[0].toUpperCase() + fl.slice(1);
  _n(yy, "on" + vy);
}
_n(fp, "onAnimationEnd");
_n(dp, "onAnimationIteration");
_n(pp, "onAnimationStart");
_n("dblclick", "onDoubleClick");
_n("focusin", "onFocus");
_n("focusout", "onBlur");
_n(hp, "onTransitionEnd");
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
var fo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), wy = new Set("cancel close invalid load scroll toggle".split(" ").concat(fo));
function Ic(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, y0(r, t, void 0, e), e.currentTarget = null;
}
function gp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], o = r.event;
    r = r.listeners;
    e: {
      var i = void 0;
      if (t) for (var s = r.length - 1; 0 <= s; s--) {
        var l = r[s], u = l.instance, a = l.currentTarget;
        if (l = l.listener, u !== i && o.isPropagationStopped()) break e;
        Ic(o, l, a), i = u;
      }
      else for (s = 0; s < r.length; s++) {
        if (l = r[s], u = l.instance, a = l.currentTarget, l = l.listener, u !== i && o.isPropagationStopped()) break e;
        Ic(o, l, a), i = u;
      }
    }
  }
  if (Ki) throw e = Zl, Ki = !1, Zl = null, e;
}
function ue(e, t) {
  var n = t[lu];
  n === void 0 && (n = t[lu] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (yp(t, e, 2, !1), n.add(r));
}
function dl(e, t, n) {
  var r = 0;
  t && (r |= 4), yp(n, e, r, t);
}
var pi = "_reactListening" + Math.random().toString(36).slice(2);
function $o(e) {
  if (!e[pi]) {
    e[pi] = !0, Ed.forEach(function(n) {
      n !== "selectionchange" && (wy.has(n) || dl(n, !1, e), dl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[pi] || (t[pi] = !0, dl("selectionchange", !1, t));
  }
}
function yp(e, t, n, r) {
  switch (ep(t)) {
    case 1:
      var o = $0;
      break;
    case 4:
      o = A0;
      break;
    default:
      o = ia;
  }
  n = o.bind(null, t, n, e), o = void 0, !Ql || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), r ? o !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: o }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, { passive: o }) : e.addEventListener(t, n, !1);
}
function pl(e, t, n, r, o) {
  var i = r;
  if (!(t & 1) && !(t & 2) && r !== null) e: for (; ; ) {
    if (r === null) return;
    var s = r.tag;
    if (s === 3 || s === 4) {
      var l = r.stateNode.containerInfo;
      if (l === o || l.nodeType === 8 && l.parentNode === o) break;
      if (s === 4) for (s = r.return; s !== null; ) {
        var u = s.tag;
        if ((u === 3 || u === 4) && (u = s.stateNode.containerInfo, u === o || u.nodeType === 8 && u.parentNode === o)) return;
        s = s.return;
      }
      for (; l !== null; ) {
        if (s = An(l), s === null) return;
        if (u = s.tag, u === 5 || u === 6) {
          r = i = s;
          continue e;
        }
        l = l.parentNode;
      }
    }
    r = r.return;
  }
  Hd(function() {
    var a = i, c = ta(n), f = [];
    e: {
      var d = mp.get(e);
      if (d !== void 0) {
        var m = la, w = e;
        switch (e) {
          case "keypress":
            if (Ai(n) === 0) break e;
          case "keydown":
          case "keyup":
            m = G0;
            break;
          case "focusin":
            w = "focus", m = sl;
            break;
          case "focusout":
            w = "blur", m = sl;
            break;
          case "beforeblur":
          case "afterblur":
            m = sl;
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
            m = kc;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            m = L0;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            m = q0;
            break;
          case fp:
          case dp:
          case pp:
            m = H0;
            break;
          case hp:
            m = ey;
            break;
          case "scroll":
            m = I0;
            break;
          case "wheel":
            m = ny;
            break;
          case "copy":
          case "cut":
          case "paste":
            m = B0;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            m = Nc;
        }
        var y = (t & 4) !== 0, k = !y && e === "scroll", p = y ? d !== null ? d + "Capture" : null : d;
        y = [];
        for (var h = a, g; h !== null; ) {
          g = h;
          var v = g.stateNode;
          if (g.tag === 5 && v !== null && (g = v, p !== null && (v = Mo(h, p), v != null && y.push(Ao(h, v, g)))), k) break;
          h = h.return;
        }
        0 < y.length && (d = new m(d, w, null, n, c), f.push({ event: d, listeners: y }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (d = e === "mouseover" || e === "pointerover", m = e === "mouseout" || e === "pointerout", d && n !== Kl && (w = n.relatedTarget || n.fromElement) && (An(w) || w[Wt])) break e;
        if ((m || d) && (d = c.window === c ? c : (d = c.ownerDocument) ? d.defaultView || d.parentWindow : window, m ? (w = n.relatedTarget || n.toElement, m = a, w = w ? An(w) : null, w !== null && (k = Zn(w), w !== k || w.tag !== 5 && w.tag !== 6) && (w = null)) : (m = null, w = a), m !== w)) {
          if (y = kc, v = "onMouseLeave", p = "onMouseEnter", h = "mouse", (e === "pointerout" || e === "pointerover") && (y = Nc, v = "onPointerLeave", p = "onPointerEnter", h = "pointer"), k = m == null ? d : pr(m), g = w == null ? d : pr(w), d = new y(v, h + "leave", m, n, c), d.target = k, d.relatedTarget = g, v = null, An(c) === a && (y = new y(p, h + "enter", w, n, c), y.target = g, y.relatedTarget = k, v = y), k = v, m && w) t: {
            for (y = m, p = w, h = 0, g = y; g; g = rr(g)) h++;
            for (g = 0, v = p; v; v = rr(v)) g++;
            for (; 0 < h - g; ) y = rr(y), h--;
            for (; 0 < g - h; ) p = rr(p), g--;
            for (; h--; ) {
              if (y === p || p !== null && y === p.alternate) break t;
              y = rr(y), p = rr(p);
            }
            y = null;
          }
          else y = null;
          m !== null && Dc(f, d, m, y, !1), w !== null && k !== null && Dc(f, k, w, y, !0);
        }
      }
      e: {
        if (d = a ? pr(a) : window, m = d.nodeName && d.nodeName.toLowerCase(), m === "select" || m === "input" && d.type === "file") var C = ay;
        else if (Pc(d)) if (sp) C = py;
        else {
          C = fy;
          var z = cy;
        }
        else (m = d.nodeName) && m.toLowerCase() === "input" && (d.type === "checkbox" || d.type === "radio") && (C = dy);
        if (C && (C = C(e, a))) {
          ip(f, C, n, c);
          break e;
        }
        z && z(e, d, a), e === "focusout" && (z = d._wrapperState) && z.controlled && d.type === "number" && bl(d, "number", d.value);
      }
      switch (z = a ? pr(a) : window, e) {
        case "focusin":
          (Pc(z) || z.contentEditable === "true") && (fr = z, tu = a, xo = null);
          break;
        case "focusout":
          xo = tu = fr = null;
          break;
        case "mousedown":
          nu = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          nu = !1, $c(f, n, c);
          break;
        case "selectionchange":
          if (gy) break;
        case "keydown":
        case "keyup":
          $c(f, n, c);
      }
      var j;
      if (aa) e: {
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
      else cr ? rp(e, n) && (T = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (T = "onCompositionStart");
      T && (np && n.locale !== "ko" && (cr || T !== "onCompositionStart" ? T === "onCompositionEnd" && cr && (j = tp()) : (un = c, sa = "value" in un ? un.value : un.textContent, cr = !0)), z = Ji(a, T), 0 < z.length && (T = new Ec(T, e, null, n, c), f.push({ event: T, listeners: z }), j ? T.data = j : (j = op(n), j !== null && (T.data = j)))), (j = oy ? iy(e, n) : sy(e, n)) && (a = Ji(a, "onBeforeInput"), 0 < a.length && (c = new Ec("onBeforeInput", "beforeinput", null, n, c), f.push({ event: c, listeners: a }), c.data = j));
    }
    gp(f, t);
  });
}
function Ao(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Ji(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var o = e, i = o.stateNode;
    o.tag === 5 && i !== null && (o = i, i = Mo(e, n), i != null && r.unshift(Ao(e, i, o)), i = Mo(e, t), i != null && r.push(Ao(e, i, o))), e = e.return;
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
function Dc(e, t, n, r, o) {
  for (var i = t._reactName, s = []; n !== null && n !== r; ) {
    var l = n, u = l.alternate, a = l.stateNode;
    if (u !== null && u === r) break;
    l.tag === 5 && a !== null && (l = a, o ? (u = Mo(n, i), u != null && s.unshift(Ao(n, u, l))) : o || (u = Mo(n, i), u != null && s.push(Ao(n, u, l)))), n = n.return;
  }
  s.length !== 0 && e.push({ event: t, listeners: s });
}
var xy = /\r\n?/g, _y = /\u0000|\uFFFD/g;
function Lc(e) {
  return (typeof e == "string" ? e : "" + e).replace(xy, `
`).replace(_y, "");
}
function hi(e, t, n) {
  if (t = Lc(t), Lc(e) !== t && n) throw Error(B(425));
}
function es() {
}
var ru = null, ou = null;
function iu(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var su = typeof setTimeout == "function" ? setTimeout : void 0, Sy = typeof clearTimeout == "function" ? clearTimeout : void 0, Oc = typeof Promise == "function" ? Promise : void 0, ky = typeof queueMicrotask == "function" ? queueMicrotask : typeof Oc < "u" ? function(e) {
  return Oc.resolve(null).then(e).catch(Ey);
} : su;
function Ey(e) {
  setTimeout(function() {
    throw e;
  });
}
function hl(e, t) {
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
function pn(e) {
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
function Fc(e) {
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
var Ur = Math.random().toString(36).slice(2), Pt = "__reactFiber$" + Ur, Io = "__reactProps$" + Ur, Wt = "__reactContainer$" + Ur, lu = "__reactEvents$" + Ur, Ny = "__reactListeners$" + Ur, Cy = "__reactHandles$" + Ur;
function An(e) {
  var t = e[Pt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Wt] || n[Pt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = Fc(e); e !== null; ) {
        if (n = e[Pt]) return n;
        e = Fc(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function Jo(e) {
  return e = e[Pt] || e[Wt], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function pr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(B(33));
}
function Ts(e) {
  return e[Io] || null;
}
var uu = [], hr = -1;
function Sn(e) {
  return { current: e };
}
function ae(e) {
  0 > hr || (e.current = uu[hr], uu[hr] = null, hr--);
}
function se(e, t) {
  hr++, uu[hr] = e.current, e.current = t;
}
var xn = {}, Le = Sn(xn), Xe = Sn(!1), bn = xn;
function jr(e, t) {
  var n = e.type.contextTypes;
  if (!n) return xn;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var o = {}, i;
  for (i in n) o[i] = t[i];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = o), o;
}
function Ke(e) {
  return e = e.childContextTypes, e != null;
}
function ts() {
  ae(Xe), ae(Le);
}
function Hc(e, t, n) {
  if (Le.current !== xn) throw Error(B(168));
  se(Le, t), se(Xe, n);
}
function vp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(B(108, c0(e) || "Unknown", o));
  return pe({}, n, r);
}
function ns(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || xn, bn = Le.current, se(Le, e), se(Xe, Xe.current), !0;
}
function Vc(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(B(169));
  n ? (e = vp(e, t, bn), r.__reactInternalMemoizedMergedChildContext = e, ae(Xe), ae(Le), se(Le, e)) : ae(Xe), se(Xe, n);
}
var Ot = null, js = !1, ml = !1;
function wp(e) {
  Ot === null ? Ot = [e] : Ot.push(e);
}
function My(e) {
  js = !0, wp(e);
}
function kn() {
  if (!ml && Ot !== null) {
    ml = !0;
    var e = 0, t = oe;
    try {
      var n = Ot;
      for (oe = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      Ot = null, js = !1;
    } catch (o) {
      throw Ot !== null && (Ot = Ot.slice(e + 1)), Ud(na, kn), o;
    } finally {
      oe = t, ml = !1;
    }
  }
  return null;
}
var mr = [], gr = 0, rs = null, os = 0, ot = [], it = 0, Un = null, Ft = 1, Ht = "";
function Tn(e, t) {
  mr[gr++] = os, mr[gr++] = rs, rs = e, os = t;
}
function xp(e, t, n) {
  ot[it++] = Ft, ot[it++] = Ht, ot[it++] = Un, Un = e;
  var r = Ft;
  e = Ht;
  var o = 32 - xt(r) - 1;
  r &= ~(1 << o), n += 1;
  var i = 32 - xt(t) + o;
  if (30 < i) {
    var s = o - o % 5;
    i = (r & (1 << s) - 1).toString(32), r >>= s, o -= s, Ft = 1 << 32 - xt(t) + o | n << o | r, Ht = i + e;
  } else Ft = 1 << i | n << o | r, Ht = e;
}
function fa(e) {
  e.return !== null && (Tn(e, 1), xp(e, 1, 0));
}
function da(e) {
  for (; e === rs; ) rs = mr[--gr], mr[gr] = null, os = mr[--gr], mr[gr] = null;
  for (; e === Un; ) Un = ot[--it], ot[it] = null, Ht = ot[--it], ot[it] = null, Ft = ot[--it], ot[it] = null;
}
var Je = null, qe = null, ce = !1, vt = null;
function _p(e, t) {
  var n = lt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function Bc(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, Je = e, qe = pn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, Je = e, qe = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Un !== null ? { id: Ft, overflow: Ht } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = lt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Je = e, qe = null, !0) : !1;
    default:
      return !1;
  }
}
function au(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function cu(e) {
  if (ce) {
    var t = qe;
    if (t) {
      var n = t;
      if (!Bc(e, t)) {
        if (au(e)) throw Error(B(418));
        t = pn(n.nextSibling);
        var r = Je;
        t && Bc(e, t) ? _p(r, n) : (e.flags = e.flags & -4097 | 2, ce = !1, Je = e);
      }
    } else {
      if (au(e)) throw Error(B(418));
      e.flags = e.flags & -4097 | 2, ce = !1, Je = e;
    }
  }
}
function bc(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  Je = e;
}
function mi(e) {
  if (e !== Je) return !1;
  if (!ce) return bc(e), ce = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !iu(e.type, e.memoizedProps)), t && (t = qe)) {
    if (au(e)) throw Sp(), Error(B(418));
    for (; t; ) _p(e, t), t = pn(t.nextSibling);
  }
  if (bc(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(B(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              qe = pn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      qe = null;
    }
  } else qe = Je ? pn(e.stateNode.nextSibling) : null;
  return !0;
}
function Sp() {
  for (var e = qe; e; ) e = pn(e.nextSibling);
}
function Rr() {
  qe = Je = null, ce = !1;
}
function pa(e) {
  vt === null ? vt = [e] : vt.push(e);
}
var Py = Qt.ReactCurrentBatchConfig;
function eo(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(B(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(B(147, e));
      var o = r, i = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === i ? t.ref : (t = function(s) {
        var l = o.refs;
        s === null ? delete l[i] : l[i] = s;
      }, t._stringRef = i, t);
    }
    if (typeof e != "string") throw Error(B(284));
    if (!n._owner) throw Error(B(290, e));
  }
  return e;
}
function gi(e, t) {
  throw e = Object.prototype.toString.call(t), Error(B(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function Uc(e) {
  var t = e._init;
  return t(e._payload);
}
function kp(e) {
  function t(p, h) {
    if (e) {
      var g = p.deletions;
      g === null ? (p.deletions = [h], p.flags |= 16) : g.push(h);
    }
  }
  function n(p, h) {
    if (!e) return null;
    for (; h !== null; ) t(p, h), h = h.sibling;
    return null;
  }
  function r(p, h) {
    for (p = /* @__PURE__ */ new Map(); h !== null; ) h.key !== null ? p.set(h.key, h) : p.set(h.index, h), h = h.sibling;
    return p;
  }
  function o(p, h) {
    return p = yn(p, h), p.index = 0, p.sibling = null, p;
  }
  function i(p, h, g) {
    return p.index = g, e ? (g = p.alternate, g !== null ? (g = g.index, g < h ? (p.flags |= 2, h) : g) : (p.flags |= 2, h)) : (p.flags |= 1048576, h);
  }
  function s(p) {
    return e && p.alternate === null && (p.flags |= 2), p;
  }
  function l(p, h, g, v) {
    return h === null || h.tag !== 6 ? (h = Sl(g, p.mode, v), h.return = p, h) : (h = o(h, g), h.return = p, h);
  }
  function u(p, h, g, v) {
    var C = g.type;
    return C === ar ? c(p, h, g.props.children, v, g.key) : h !== null && (h.elementType === C || typeof C == "object" && C !== null && C.$$typeof === en && Uc(C) === h.type) ? (v = o(h, g.props), v.ref = eo(p, h, g), v.return = p, v) : (v = Vi(g.type, g.key, g.props, null, p.mode, v), v.ref = eo(p, h, g), v.return = p, v);
  }
  function a(p, h, g, v) {
    return h === null || h.tag !== 4 || h.stateNode.containerInfo !== g.containerInfo || h.stateNode.implementation !== g.implementation ? (h = kl(g, p.mode, v), h.return = p, h) : (h = o(h, g.children || []), h.return = p, h);
  }
  function c(p, h, g, v, C) {
    return h === null || h.tag !== 7 ? (h = Hn(g, p.mode, v, C), h.return = p, h) : (h = o(h, g), h.return = p, h);
  }
  function f(p, h, g) {
    if (typeof h == "string" && h !== "" || typeof h == "number") return h = Sl("" + h, p.mode, g), h.return = p, h;
    if (typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case ii:
          return g = Vi(h.type, h.key, h.props, null, p.mode, g), g.ref = eo(p, null, h), g.return = p, g;
        case ur:
          return h = kl(h, p.mode, g), h.return = p, h;
        case en:
          var v = h._init;
          return f(p, v(h._payload), g);
      }
      if (ao(h) || Gr(h)) return h = Hn(h, p.mode, g, null), h.return = p, h;
      gi(p, h);
    }
    return null;
  }
  function d(p, h, g, v) {
    var C = h !== null ? h.key : null;
    if (typeof g == "string" && g !== "" || typeof g == "number") return C !== null ? null : l(p, h, "" + g, v);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case ii:
          return g.key === C ? u(p, h, g, v) : null;
        case ur:
          return g.key === C ? a(p, h, g, v) : null;
        case en:
          return C = g._init, d(
            p,
            h,
            C(g._payload),
            v
          );
      }
      if (ao(g) || Gr(g)) return C !== null ? null : c(p, h, g, v, null);
      gi(p, g);
    }
    return null;
  }
  function m(p, h, g, v, C) {
    if (typeof v == "string" && v !== "" || typeof v == "number") return p = p.get(g) || null, l(h, p, "" + v, C);
    if (typeof v == "object" && v !== null) {
      switch (v.$$typeof) {
        case ii:
          return p = p.get(v.key === null ? g : v.key) || null, u(h, p, v, C);
        case ur:
          return p = p.get(v.key === null ? g : v.key) || null, a(h, p, v, C);
        case en:
          var z = v._init;
          return m(p, h, g, z(v._payload), C);
      }
      if (ao(v) || Gr(v)) return p = p.get(g) || null, c(h, p, v, C, null);
      gi(h, v);
    }
    return null;
  }
  function w(p, h, g, v) {
    for (var C = null, z = null, j = h, T = h = 0, S = null; j !== null && T < g.length; T++) {
      j.index > T ? (S = j, j = null) : S = j.sibling;
      var N = d(p, j, g[T], v);
      if (N === null) {
        j === null && (j = S);
        break;
      }
      e && j && N.alternate === null && t(p, j), h = i(N, h, T), z === null ? C = N : z.sibling = N, z = N, j = S;
    }
    if (T === g.length) return n(p, j), ce && Tn(p, T), C;
    if (j === null) {
      for (; T < g.length; T++) j = f(p, g[T], v), j !== null && (h = i(j, h, T), z === null ? C = j : z.sibling = j, z = j);
      return ce && Tn(p, T), C;
    }
    for (j = r(p, j); T < g.length; T++) S = m(j, p, T, g[T], v), S !== null && (e && S.alternate !== null && j.delete(S.key === null ? T : S.key), h = i(S, h, T), z === null ? C = S : z.sibling = S, z = S);
    return e && j.forEach(function(L) {
      return t(p, L);
    }), ce && Tn(p, T), C;
  }
  function y(p, h, g, v) {
    var C = Gr(g);
    if (typeof C != "function") throw Error(B(150));
    if (g = C.call(g), g == null) throw Error(B(151));
    for (var z = C = null, j = h, T = h = 0, S = null, N = g.next(); j !== null && !N.done; T++, N = g.next()) {
      j.index > T ? (S = j, j = null) : S = j.sibling;
      var L = d(p, j, N.value, v);
      if (L === null) {
        j === null && (j = S);
        break;
      }
      e && j && L.alternate === null && t(p, j), h = i(L, h, T), z === null ? C = L : z.sibling = L, z = L, j = S;
    }
    if (N.done) return n(
      p,
      j
    ), ce && Tn(p, T), C;
    if (j === null) {
      for (; !N.done; T++, N = g.next()) N = f(p, N.value, v), N !== null && (h = i(N, h, T), z === null ? C = N : z.sibling = N, z = N);
      return ce && Tn(p, T), C;
    }
    for (j = r(p, j); !N.done; T++, N = g.next()) N = m(j, p, T, N.value, v), N !== null && (e && N.alternate !== null && j.delete(N.key === null ? T : N.key), h = i(N, h, T), z === null ? C = N : z.sibling = N, z = N);
    return e && j.forEach(function(D) {
      return t(p, D);
    }), ce && Tn(p, T), C;
  }
  function k(p, h, g, v) {
    if (typeof g == "object" && g !== null && g.type === ar && g.key === null && (g = g.props.children), typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case ii:
          e: {
            for (var C = g.key, z = h; z !== null; ) {
              if (z.key === C) {
                if (C = g.type, C === ar) {
                  if (z.tag === 7) {
                    n(p, z.sibling), h = o(z, g.props.children), h.return = p, p = h;
                    break e;
                  }
                } else if (z.elementType === C || typeof C == "object" && C !== null && C.$$typeof === en && Uc(C) === z.type) {
                  n(p, z.sibling), h = o(z, g.props), h.ref = eo(p, z, g), h.return = p, p = h;
                  break e;
                }
                n(p, z);
                break;
              } else t(p, z);
              z = z.sibling;
            }
            g.type === ar ? (h = Hn(g.props.children, p.mode, v, g.key), h.return = p, p = h) : (v = Vi(g.type, g.key, g.props, null, p.mode, v), v.ref = eo(p, h, g), v.return = p, p = v);
          }
          return s(p);
        case ur:
          e: {
            for (z = g.key; h !== null; ) {
              if (h.key === z) if (h.tag === 4 && h.stateNode.containerInfo === g.containerInfo && h.stateNode.implementation === g.implementation) {
                n(p, h.sibling), h = o(h, g.children || []), h.return = p, p = h;
                break e;
              } else {
                n(p, h);
                break;
              }
              else t(p, h);
              h = h.sibling;
            }
            h = kl(g, p.mode, v), h.return = p, p = h;
          }
          return s(p);
        case en:
          return z = g._init, k(p, h, z(g._payload), v);
      }
      if (ao(g)) return w(p, h, g, v);
      if (Gr(g)) return y(p, h, g, v);
      gi(p, g);
    }
    return typeof g == "string" && g !== "" || typeof g == "number" ? (g = "" + g, h !== null && h.tag === 6 ? (n(p, h.sibling), h = o(h, g), h.return = p, p = h) : (n(p, h), h = Sl(g, p.mode, v), h.return = p, p = h), s(p)) : n(p, h);
  }
  return k;
}
var $r = kp(!0), Ep = kp(!1), is = Sn(null), ss = null, yr = null, ha = null;
function ma() {
  ha = yr = ss = null;
}
function ga(e) {
  var t = is.current;
  ae(is), e._currentValue = t;
}
function fu(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Nr(e, t) {
  ss = e, ha = yr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (We = !0), e.firstContext = null);
}
function ft(e) {
  var t = e._currentValue;
  if (ha !== e) if (e = { context: e, memoizedValue: t, next: null }, yr === null) {
    if (ss === null) throw Error(B(308));
    yr = e, ss.dependencies = { lanes: 0, firstContext: e };
  } else yr = yr.next = e;
  return t;
}
var In = null;
function ya(e) {
  In === null ? In = [e] : In.push(e);
}
function Np(e, t, n, r) {
  var o = t.interleaved;
  return o === null ? (n.next = n, ya(t)) : (n.next = o.next, o.next = n), t.interleaved = n, Yt(e, r);
}
function Yt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var tn = !1;
function va(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function Cp(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function Bt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function hn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, ee & 2) {
    var o = r.pending;
    return o === null ? t.next = t : (t.next = o.next, o.next = t), r.pending = t, Yt(e, n);
  }
  return o = r.interleaved, o === null ? (t.next = t, ya(r)) : (t.next = o.next, o.next = t), r.interleaved = t, Yt(e, n);
}
function Ii(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, ra(e, n);
  }
}
function Wc(e, t) {
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
function ls(e, t, n, r) {
  var o = e.updateQueue;
  tn = !1;
  var i = o.firstBaseUpdate, s = o.lastBaseUpdate, l = o.shared.pending;
  if (l !== null) {
    o.shared.pending = null;
    var u = l, a = u.next;
    u.next = null, s === null ? i = a : s.next = a, s = u;
    var c = e.alternate;
    c !== null && (c = c.updateQueue, l = c.lastBaseUpdate, l !== s && (l === null ? c.firstBaseUpdate = a : l.next = a, c.lastBaseUpdate = u));
  }
  if (i !== null) {
    var f = o.baseState;
    s = 0, c = a = u = null, l = i;
    do {
      var d = l.lane, m = l.eventTime;
      if ((r & d) === d) {
        c !== null && (c = c.next = {
          eventTime: m,
          lane: 0,
          tag: l.tag,
          payload: l.payload,
          callback: l.callback,
          next: null
        });
        e: {
          var w = e, y = l;
          switch (d = t, m = n, y.tag) {
            case 1:
              if (w = y.payload, typeof w == "function") {
                f = w.call(m, f, d);
                break e;
              }
              f = w;
              break e;
            case 3:
              w.flags = w.flags & -65537 | 128;
            case 0:
              if (w = y.payload, d = typeof w == "function" ? w.call(m, f, d) : w, d == null) break e;
              f = pe({}, f, d);
              break e;
            case 2:
              tn = !0;
          }
        }
        l.callback !== null && l.lane !== 0 && (e.flags |= 64, d = o.effects, d === null ? o.effects = [l] : d.push(l));
      } else m = { eventTime: m, lane: d, tag: l.tag, payload: l.payload, callback: l.callback, next: null }, c === null ? (a = c = m, u = f) : c = c.next = m, s |= d;
      if (l = l.next, l === null) {
        if (l = o.shared.pending, l === null) break;
        d = l, l = d.next, d.next = null, o.lastBaseUpdate = d, o.shared.pending = null;
      }
    } while (!0);
    if (c === null && (u = f), o.baseState = u, o.firstBaseUpdate = a, o.lastBaseUpdate = c, t = o.shared.interleaved, t !== null) {
      o = t;
      do
        s |= o.lane, o = o.next;
      while (o !== t);
    } else i === null && (o.shared.lanes = 0);
    Yn |= s, e.lanes = s, e.memoizedState = f;
  }
}
function Yc(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], o = r.callback;
    if (o !== null) {
      if (r.callback = null, r = n, typeof o != "function") throw Error(B(191, o));
      o.call(r);
    }
  }
}
var ei = {}, Tt = Sn(ei), Do = Sn(ei), Lo = Sn(ei);
function Dn(e) {
  if (e === ei) throw Error(B(174));
  return e;
}
function wa(e, t) {
  switch (se(Lo, t), se(Do, e), se(Tt, ei), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Wl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Wl(t, e);
  }
  ae(Tt), se(Tt, t);
}
function Ar() {
  ae(Tt), ae(Do), ae(Lo);
}
function Mp(e) {
  Dn(Lo.current);
  var t = Dn(Tt.current), n = Wl(t, e.type);
  t !== n && (se(Do, e), se(Tt, n));
}
function xa(e) {
  Do.current === e && (ae(Tt), ae(Do));
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
var gl = [];
function _a() {
  for (var e = 0; e < gl.length; e++) gl[e]._workInProgressVersionPrimary = null;
  gl.length = 0;
}
var Di = Qt.ReactCurrentDispatcher, yl = Qt.ReactCurrentBatchConfig, Wn = 0, de = null, xe = null, ke = null, as = !1, _o = !1, Oo = 0, zy = 0;
function Ae() {
  throw Error(B(321));
}
function Sa(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!St(e[n], t[n])) return !1;
  return !0;
}
function ka(e, t, n, r, o, i) {
  if (Wn = i, de = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Di.current = e === null || e.memoizedState === null ? $y : Ay, e = n(r, o), _o) {
    i = 0;
    do {
      if (_o = !1, Oo = 0, 25 <= i) throw Error(B(301));
      i += 1, ke = xe = null, t.updateQueue = null, Di.current = Iy, e = n(r, o);
    } while (_o);
  }
  if (Di.current = cs, t = xe !== null && xe.next !== null, Wn = 0, ke = xe = de = null, as = !1, t) throw Error(B(300));
  return e;
}
function Ea() {
  var e = Oo !== 0;
  return Oo = 0, e;
}
function Mt() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return ke === null ? de.memoizedState = ke = e : ke = ke.next = e, ke;
}
function dt() {
  if (xe === null) {
    var e = de.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = xe.next;
  var t = ke === null ? de.memoizedState : ke.next;
  if (t !== null) ke = t, xe = e;
  else {
    if (e === null) throw Error(B(310));
    xe = e, e = { memoizedState: xe.memoizedState, baseState: xe.baseState, baseQueue: xe.baseQueue, queue: xe.queue, next: null }, ke === null ? de.memoizedState = ke = e : ke = ke.next = e;
  }
  return ke;
}
function Fo(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function vl(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(B(311));
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
    var l = s = null, u = null, a = i;
    do {
      var c = a.lane;
      if ((Wn & c) === c) u !== null && (u = u.next = { lane: 0, action: a.action, hasEagerState: a.hasEagerState, eagerState: a.eagerState, next: null }), r = a.hasEagerState ? a.eagerState : e(r, a.action);
      else {
        var f = {
          lane: c,
          action: a.action,
          hasEagerState: a.hasEagerState,
          eagerState: a.eagerState,
          next: null
        };
        u === null ? (l = u = f, s = r) : u = u.next = f, de.lanes |= c, Yn |= c;
      }
      a = a.next;
    } while (a !== null && a !== i);
    u === null ? s = r : u.next = l, St(r, t.memoizedState) || (We = !0), t.memoizedState = r, t.baseState = s, t.baseQueue = u, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    o = e;
    do
      i = o.lane, de.lanes |= i, Yn |= i, o = o.next;
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function wl(e) {
  var t = dt(), n = t.queue;
  if (n === null) throw Error(B(311));
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
function Pp() {
}
function zp(e, t) {
  var n = de, r = dt(), o = t(), i = !St(r.memoizedState, o);
  if (i && (r.memoizedState = o, We = !0), r = r.queue, Na(Rp.bind(null, n, r, e), [e]), r.getSnapshot !== t || i || ke !== null && ke.memoizedState.tag & 1) {
    if (n.flags |= 2048, Ho(9, jp.bind(null, n, r, o, t), void 0, null), Ee === null) throw Error(B(349));
    Wn & 30 || Tp(n, t, o);
  }
  return o;
}
function Tp(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function jp(e, t, n, r) {
  t.value = n, t.getSnapshot = r, $p(t) && Ap(e);
}
function Rp(e, t, n) {
  return n(function() {
    $p(t) && Ap(e);
  });
}
function $p(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !St(e, n);
  } catch {
    return !0;
  }
}
function Ap(e) {
  var t = Yt(e, 1);
  t !== null && _t(t, e, 1, -1);
}
function Xc(e) {
  var t = Mt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Fo, lastRenderedState: e }, t.queue = e, e = e.dispatch = Ry.bind(null, de, e), [t.memoizedState, e];
}
function Ho(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = de.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, de.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Ip() {
  return dt().memoizedState;
}
function Li(e, t, n, r) {
  var o = Mt();
  de.flags |= e, o.memoizedState = Ho(1 | t, n, void 0, r === void 0 ? null : r);
}
function Rs(e, t, n, r) {
  var o = dt();
  r = r === void 0 ? null : r;
  var i = void 0;
  if (xe !== null) {
    var s = xe.memoizedState;
    if (i = s.destroy, r !== null && Sa(r, s.deps)) {
      o.memoizedState = Ho(t, n, i, r);
      return;
    }
  }
  de.flags |= e, o.memoizedState = Ho(1 | t, n, i, r);
}
function Kc(e, t) {
  return Li(8390656, 8, e, t);
}
function Na(e, t) {
  return Rs(2048, 8, e, t);
}
function Dp(e, t) {
  return Rs(4, 2, e, t);
}
function Lp(e, t) {
  return Rs(4, 4, e, t);
}
function Op(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Fp(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Rs(4, 4, Op.bind(null, t, e), n);
}
function Ca() {
}
function Hp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Sa(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Vp(e, t) {
  var n = dt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Sa(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function Bp(e, t, n) {
  return Wn & 21 ? (St(n, t) || (n = Xd(), de.lanes |= n, Yn |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, We = !0), e.memoizedState = n);
}
function Ty(e, t) {
  var n = oe;
  oe = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = yl.transition;
  yl.transition = {};
  try {
    e(!1), t();
  } finally {
    oe = n, yl.transition = r;
  }
}
function bp() {
  return dt().memoizedState;
}
function jy(e, t, n) {
  var r = gn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Up(e)) Wp(t, n);
  else if (n = Np(e, t, n, r), n !== null) {
    var o = Ve();
    _t(n, e, r, o), Yp(n, t, r);
  }
}
function Ry(e, t, n) {
  var r = gn(e), o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Up(e)) Wp(t, o);
  else {
    var i = e.alternate;
    if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer, i !== null)) try {
      var s = t.lastRenderedState, l = i(s, n);
      if (o.hasEagerState = !0, o.eagerState = l, St(l, s)) {
        var u = t.interleaved;
        u === null ? (o.next = o, ya(t)) : (o.next = u.next, u.next = o), t.interleaved = o;
        return;
      }
    } catch {
    } finally {
    }
    n = Np(e, t, o, r), n !== null && (o = Ve(), _t(n, e, r, o), Yp(n, t, r));
  }
}
function Up(e) {
  var t = e.alternate;
  return e === de || t !== null && t === de;
}
function Wp(e, t) {
  _o = as = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function Yp(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, ra(e, n);
  }
}
var cs = { readContext: ft, useCallback: Ae, useContext: Ae, useEffect: Ae, useImperativeHandle: Ae, useInsertionEffect: Ae, useLayoutEffect: Ae, useMemo: Ae, useReducer: Ae, useRef: Ae, useState: Ae, useDebugValue: Ae, useDeferredValue: Ae, useTransition: Ae, useMutableSource: Ae, useSyncExternalStore: Ae, useId: Ae, unstable_isNewReconciler: !1 }, $y = { readContext: ft, useCallback: function(e, t) {
  return Mt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: ft, useEffect: Kc, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Li(
    4194308,
    4,
    Op.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return Li(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return Li(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = Mt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = Mt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = jy.bind(null, de, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = Mt();
  return e = { current: e }, t.memoizedState = e;
}, useState: Xc, useDebugValue: Ca, useDeferredValue: function(e) {
  return Mt().memoizedState = e;
}, useTransition: function() {
  var e = Xc(!1), t = e[0];
  return e = Ty.bind(null, e[1]), Mt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = de, o = Mt();
  if (ce) {
    if (n === void 0) throw Error(B(407));
    n = n();
  } else {
    if (n = t(), Ee === null) throw Error(B(349));
    Wn & 30 || Tp(r, t, n);
  }
  o.memoizedState = n;
  var i = { value: n, getSnapshot: t };
  return o.queue = i, Kc(Rp.bind(
    null,
    r,
    i,
    e
  ), [e]), r.flags |= 2048, Ho(9, jp.bind(null, r, i, n, t), void 0, null), n;
}, useId: function() {
  var e = Mt(), t = Ee.identifierPrefix;
  if (ce) {
    var n = Ht, r = Ft;
    n = (r & ~(1 << 32 - xt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = Oo++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = zy++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, Ay = {
  readContext: ft,
  useCallback: Hp,
  useContext: ft,
  useEffect: Na,
  useImperativeHandle: Fp,
  useInsertionEffect: Dp,
  useLayoutEffect: Lp,
  useMemo: Vp,
  useReducer: vl,
  useRef: Ip,
  useState: function() {
    return vl(Fo);
  },
  useDebugValue: Ca,
  useDeferredValue: function(e) {
    var t = dt();
    return Bp(t, xe.memoizedState, e);
  },
  useTransition: function() {
    var e = vl(Fo)[0], t = dt().memoizedState;
    return [e, t];
  },
  useMutableSource: Pp,
  useSyncExternalStore: zp,
  useId: bp,
  unstable_isNewReconciler: !1
}, Iy = { readContext: ft, useCallback: Hp, useContext: ft, useEffect: Na, useImperativeHandle: Fp, useInsertionEffect: Dp, useLayoutEffect: Lp, useMemo: Vp, useReducer: wl, useRef: Ip, useState: function() {
  return wl(Fo);
}, useDebugValue: Ca, useDeferredValue: function(e) {
  var t = dt();
  return xe === null ? t.memoizedState = e : Bp(t, xe.memoizedState, e);
}, useTransition: function() {
  var e = wl(Fo)[0], t = dt().memoizedState;
  return [e, t];
}, useMutableSource: Pp, useSyncExternalStore: zp, useId: bp, unstable_isNewReconciler: !1 };
function mt(e, t) {
  if (e && e.defaultProps) {
    t = pe({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function du(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : pe({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var $s = { isMounted: function(e) {
  return (e = e._reactInternals) ? Zn(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = gn(e), i = Bt(r, o);
  i.payload = t, n != null && (i.callback = n), t = hn(e, i, o), t !== null && (_t(t, e, o, r), Ii(t, e, o));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Ve(), o = gn(e), i = Bt(r, o);
  i.tag = 1, i.payload = t, n != null && (i.callback = n), t = hn(e, i, o), t !== null && (_t(t, e, o, r), Ii(t, e, o));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Ve(), r = gn(e), o = Bt(n, r);
  o.tag = 2, t != null && (o.callback = t), t = hn(e, o, r), t !== null && (_t(t, e, r, n), Ii(t, e, r));
} };
function Gc(e, t, n, r, o, i, s) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, s) : t.prototype && t.prototype.isPureReactComponent ? !Ro(n, r) || !Ro(o, i) : !0;
}
function Xp(e, t, n) {
  var r = !1, o = xn, i = t.contextType;
  return typeof i == "object" && i !== null ? i = ft(i) : (o = Ke(t) ? bn : Le.current, r = t.contextTypes, i = (r = r != null) ? jr(e, o) : xn), t = new t(n, i), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = $s, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = o, e.__reactInternalMemoizedMaskedChildContext = i), t;
}
function Qc(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && $s.enqueueReplaceState(t, t.state, null);
}
function pu(e, t, n, r) {
  var o = e.stateNode;
  o.props = n, o.state = e.memoizedState, o.refs = {}, va(e);
  var i = t.contextType;
  typeof i == "object" && i !== null ? o.context = ft(i) : (i = Ke(t) ? bn : Le.current, o.context = jr(e, i)), o.state = e.memoizedState, i = t.getDerivedStateFromProps, typeof i == "function" && (du(e, t, i, n), o.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state, typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(), t !== o.state && $s.enqueueReplaceState(o, o.state, null), ls(e, n, o, r), o.state = e.memoizedState), typeof o.componentDidMount == "function" && (e.flags |= 4194308);
}
function Ir(e, t) {
  try {
    var n = "", r = t;
    do
      n += a0(r), r = r.return;
    while (r);
    var o = n;
  } catch (i) {
    o = `
Error generating stack: ` + i.message + `
` + i.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function xl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function hu(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var Dy = typeof WeakMap == "function" ? WeakMap : Map;
function Kp(e, t, n) {
  n = Bt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    ds || (ds = !0, Eu = r), hu(e, t);
  }, n;
}
function Gp(e, t, n) {
  n = Bt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    n.payload = function() {
      return r(o);
    }, n.callback = function() {
      hu(e, t);
    };
  }
  var i = e.stateNode;
  return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function() {
    hu(e, t), typeof r != "function" && (mn === null ? mn = /* @__PURE__ */ new Set([this]) : mn.add(this));
    var s = t.stack;
    this.componentDidCatch(t.value, { componentStack: s !== null ? s : "" });
  }), n;
}
function Zc(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new Dy();
    var o = /* @__PURE__ */ new Set();
    r.set(t, o);
  } else o = r.get(t), o === void 0 && (o = /* @__PURE__ */ new Set(), r.set(t, o));
  o.has(n) || (o.add(n), e = Qy.bind(null, e, t, n), t.then(e, e));
}
function qc(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function Jc(e, t, n, r, o) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = o, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Bt(-1, 1), t.tag = 2, hn(n, t, 1))), n.lanes |= 1), e);
}
var Ly = Qt.ReactCurrentOwner, We = !1;
function He(e, t, n, r) {
  t.child = e === null ? Ep(t, null, n, r) : $r(t, e.child, n, r);
}
function ef(e, t, n, r, o) {
  n = n.render;
  var i = t.ref;
  return Nr(t, o), r = ka(e, t, n, r, i, o), n = Ea(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && n && fa(t), t.flags |= 1, He(e, t, r, o), t.child);
}
function tf(e, t, n, r, o) {
  if (e === null) {
    var i = n.type;
    return typeof i == "function" && !Aa(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = i, Qp(e, t, i, r, o)) : (e = Vi(n.type, null, r, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (i = e.child, !(e.lanes & o)) {
    var s = i.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Ro, n(s, r) && e.ref === t.ref) return Xt(e, t, o);
  }
  return t.flags |= 1, e = yn(i, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Qp(e, t, n, r, o) {
  if (e !== null) {
    var i = e.memoizedProps;
    if (Ro(i, r) && e.ref === t.ref) if (We = !1, t.pendingProps = r = i, (e.lanes & o) !== 0) e.flags & 131072 && (We = !0);
    else return t.lanes = e.lanes, Xt(e, t, o);
  }
  return mu(e, t, n, r, o);
}
function Zp(e, t, n) {
  var r = t.pendingProps, o = r.children, i = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, se(wr, Ze), Ze |= n;
  else {
    if (!(n & 1073741824)) return e = i !== null ? i.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, se(wr, Ze), Ze |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = i !== null ? i.baseLanes : n, se(wr, Ze), Ze |= r;
  }
  else i !== null ? (r = i.baseLanes | n, t.memoizedState = null) : r = n, se(wr, Ze), Ze |= r;
  return He(e, t, o, n), t.child;
}
function qp(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function mu(e, t, n, r, o) {
  var i = Ke(n) ? bn : Le.current;
  return i = jr(t, i), Nr(t, o), n = ka(e, t, n, r, i, o), r = Ea(), e !== null && !We ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, Xt(e, t, o)) : (ce && r && fa(t), t.flags |= 1, He(e, t, n, o), t.child);
}
function nf(e, t, n, r, o) {
  if (Ke(n)) {
    var i = !0;
    ns(t);
  } else i = !1;
  if (Nr(t, o), t.stateNode === null) Oi(e, t), Xp(t, n, r), pu(t, n, r, o), r = !0;
  else if (e === null) {
    var s = t.stateNode, l = t.memoizedProps;
    s.props = l;
    var u = s.context, a = n.contextType;
    typeof a == "object" && a !== null ? a = ft(a) : (a = Ke(n) ? bn : Le.current, a = jr(t, a));
    var c = n.getDerivedStateFromProps, f = typeof c == "function" || typeof s.getSnapshotBeforeUpdate == "function";
    f || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== r || u !== a) && Qc(t, s, r, a), tn = !1;
    var d = t.memoizedState;
    s.state = d, ls(t, r, s, o), u = t.memoizedState, l !== r || d !== u || Xe.current || tn ? (typeof c == "function" && (du(t, n, c, r), u = t.memoizedState), (l = tn || Gc(t, n, l, r, d, u, a)) ? (f || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount()), typeof s.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = u), s.props = r, s.state = u, s.context = a, r = l) : (typeof s.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    s = t.stateNode, Cp(e, t), l = t.memoizedProps, a = t.type === t.elementType ? l : mt(t.type, l), s.props = a, f = t.pendingProps, d = s.context, u = n.contextType, typeof u == "object" && u !== null ? u = ft(u) : (u = Ke(n) ? bn : Le.current, u = jr(t, u));
    var m = n.getDerivedStateFromProps;
    (c = typeof m == "function" || typeof s.getSnapshotBeforeUpdate == "function") || typeof s.UNSAFE_componentWillReceiveProps != "function" && typeof s.componentWillReceiveProps != "function" || (l !== f || d !== u) && Qc(t, s, r, u), tn = !1, d = t.memoizedState, s.state = d, ls(t, r, s, o);
    var w = t.memoizedState;
    l !== f || d !== w || Xe.current || tn ? (typeof m == "function" && (du(t, n, m, r), w = t.memoizedState), (a = tn || Gc(t, n, a, r, d, w, u) || !1) ? (c || typeof s.UNSAFE_componentWillUpdate != "function" && typeof s.componentWillUpdate != "function" || (typeof s.componentWillUpdate == "function" && s.componentWillUpdate(r, w, u), typeof s.UNSAFE_componentWillUpdate == "function" && s.UNSAFE_componentWillUpdate(r, w, u)), typeof s.componentDidUpdate == "function" && (t.flags |= 4), typeof s.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = w), s.props = r, s.state = w, s.context = u, r = a) : (typeof s.componentDidUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 4), typeof s.getSnapshotBeforeUpdate != "function" || l === e.memoizedProps && d === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return gu(e, t, n, r, i, o);
}
function gu(e, t, n, r, o, i) {
  qp(e, t);
  var s = (t.flags & 128) !== 0;
  if (!r && !s) return o && Vc(t, n, !1), Xt(e, t, i);
  r = t.stateNode, Ly.current = t;
  var l = s && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && s ? (t.child = $r(t, e.child, null, i), t.child = $r(t, null, l, i)) : He(e, t, l, i), t.memoizedState = r.state, o && Vc(t, n, !0), t.child;
}
function Jp(e) {
  var t = e.stateNode;
  t.pendingContext ? Hc(e, t.pendingContext, t.pendingContext !== t.context) : t.context && Hc(e, t.context, !1), wa(e, t.containerInfo);
}
function rf(e, t, n, r, o) {
  return Rr(), pa(o), t.flags |= 256, He(e, t, n, r), t.child;
}
var yu = { dehydrated: null, treeContext: null, retryLane: 0 };
function vu(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function eh(e, t, n) {
  var r = t.pendingProps, o = fe.current, i = !1, s = (t.flags & 128) !== 0, l;
  if ((l = s) || (l = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0), l ? (i = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1), se(fe, o & 1), e === null)
    return cu(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (s = r.children, e = r.fallback, i ? (r = t.mode, i = t.child, s = { mode: "hidden", children: s }, !(r & 1) && i !== null ? (i.childLanes = 0, i.pendingProps = s) : i = Ds(s, r, 0, null), e = Hn(e, r, n, null), i.return = t, e.return = t, i.sibling = e, t.child = i, t.child.memoizedState = vu(n), t.memoizedState = yu, e) : Ma(t, s));
  if (o = e.memoizedState, o !== null && (l = o.dehydrated, l !== null)) return Oy(e, t, s, r, l, o, n);
  if (i) {
    i = r.fallback, s = t.mode, o = e.child, l = o.sibling;
    var u = { mode: "hidden", children: r.children };
    return !(s & 1) && t.child !== o ? (r = t.child, r.childLanes = 0, r.pendingProps = u, t.deletions = null) : (r = yn(o, u), r.subtreeFlags = o.subtreeFlags & 14680064), l !== null ? i = yn(l, i) : (i = Hn(i, s, n, null), i.flags |= 2), i.return = t, r.return = t, r.sibling = i, t.child = r, r = i, i = t.child, s = e.child.memoizedState, s = s === null ? vu(n) : { baseLanes: s.baseLanes | n, cachePool: null, transitions: s.transitions }, i.memoizedState = s, i.childLanes = e.childLanes & ~n, t.memoizedState = yu, r;
  }
  return i = e.child, e = i.sibling, r = yn(i, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Ma(e, t) {
  return t = Ds({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function yi(e, t, n, r) {
  return r !== null && pa(r), $r(t, e.child, null, n), e = Ma(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function Oy(e, t, n, r, o, i, s) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = xl(Error(B(422))), yi(e, t, s, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (i = r.fallback, o = t.mode, r = Ds({ mode: "visible", children: r.children }, o, 0, null), i = Hn(i, o, s, null), i.flags |= 2, r.return = t, i.return = t, r.sibling = i, t.child = r, t.mode & 1 && $r(t, e.child, null, s), t.child.memoizedState = vu(s), t.memoizedState = yu, i);
  if (!(t.mode & 1)) return yi(e, t, s, null);
  if (o.data === "$!") {
    if (r = o.nextSibling && o.nextSibling.dataset, r) var l = r.dgst;
    return r = l, i = Error(B(419)), r = xl(i, r, void 0), yi(e, t, s, r);
  }
  if (l = (s & e.childLanes) !== 0, We || l) {
    if (r = Ee, r !== null) {
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
      o = o & (r.suspendedLanes | s) ? 0 : o, o !== 0 && o !== i.retryLane && (i.retryLane = o, Yt(e, o), _t(r, e, o, -1));
    }
    return $a(), r = xl(Error(B(421))), yi(e, t, s, r);
  }
  return o.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Zy.bind(null, e), o._reactRetry = t, null) : (e = i.treeContext, qe = pn(o.nextSibling), Je = t, ce = !0, vt = null, e !== null && (ot[it++] = Ft, ot[it++] = Ht, ot[it++] = Un, Ft = e.id, Ht = e.overflow, Un = t), t = Ma(t, r.children), t.flags |= 4096, t);
}
function of(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), fu(e.return, t, n);
}
function _l(e, t, n, r, o) {
  var i = e.memoizedState;
  i === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: o } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = r, i.tail = n, i.tailMode = o);
}
function th(e, t, n) {
  var r = t.pendingProps, o = r.revealOrder, i = r.tail;
  if (He(e, t, r.children, n), r = fe.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && of(e, n, t);
      else if (e.tag === 19) of(e, n, t);
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
      n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), _l(t, !1, o, n, i);
      break;
    case "backwards":
      for (n = null, o = t.child, t.child = null; o !== null; ) {
        if (e = o.alternate, e !== null && us(e) === null) {
          t.child = o;
          break;
        }
        e = o.sibling, o.sibling = n, n = o, o = e;
      }
      _l(t, !0, n, null, i);
      break;
    case "together":
      _l(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function Oi(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function Xt(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), Yn |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(B(153));
  if (t.child !== null) {
    for (e = t.child, n = yn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = yn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function Fy(e, t, n) {
  switch (t.tag) {
    case 3:
      Jp(t), Rr();
      break;
    case 5:
      Mp(t);
      break;
    case 1:
      Ke(t.type) && ns(t);
      break;
    case 4:
      wa(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, o = t.memoizedProps.value;
      se(is, r._currentValue), r._currentValue = o;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (se(fe, fe.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? eh(e, t, n) : (se(fe, fe.current & 1), e = Xt(e, t, n), e !== null ? e.sibling : null);
      se(fe, fe.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return th(e, t, n);
        t.flags |= 128;
      }
      if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), se(fe, fe.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Zp(e, t, n);
  }
  return Xt(e, t, n);
}
var nh, wu, rh, oh;
nh = function(e, t) {
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
wu = function() {
};
rh = function(e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    e = t.stateNode, Dn(Tt.current);
    var i = null;
    switch (n) {
      case "input":
        o = Vl(e, o), r = Vl(e, r), i = [];
        break;
      case "select":
        o = pe({}, o, { value: void 0 }), r = pe({}, r, { value: void 0 }), i = [];
        break;
      case "textarea":
        o = Ul(e, o), r = Ul(e, r), i = [];
        break;
      default:
        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = es);
    }
    Yl(n, r);
    var s;
    n = null;
    for (a in o) if (!r.hasOwnProperty(a) && o.hasOwnProperty(a) && o[a] != null) if (a === "style") {
      var l = o[a];
      for (s in l) l.hasOwnProperty(s) && (n || (n = {}), n[s] = "");
    } else a !== "dangerouslySetInnerHTML" && a !== "children" && a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && a !== "autoFocus" && (No.hasOwnProperty(a) ? i || (i = []) : (i = i || []).push(a, null));
    for (a in r) {
      var u = r[a];
      if (l = o != null ? o[a] : void 0, r.hasOwnProperty(a) && u !== l && (u != null || l != null)) if (a === "style") if (l) {
        for (s in l) !l.hasOwnProperty(s) || u && u.hasOwnProperty(s) || (n || (n = {}), n[s] = "");
        for (s in u) u.hasOwnProperty(s) && l[s] !== u[s] && (n || (n = {}), n[s] = u[s]);
      } else n || (i || (i = []), i.push(
        a,
        n
      )), n = u;
      else a === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, l = l ? l.__html : void 0, u != null && l !== u && (i = i || []).push(a, u)) : a === "children" ? typeof u != "string" && typeof u != "number" || (i = i || []).push(a, "" + u) : a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && (No.hasOwnProperty(a) ? (u != null && a === "onScroll" && ue("scroll", e), i || l === u || (i = [])) : (i = i || []).push(a, u));
    }
    n && (i = i || []).push("style", n);
    var a = i;
    (t.updateQueue = a) && (t.flags |= 4);
  }
};
oh = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function to(e, t) {
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
function Hy(e, t, n) {
  var r = t.pendingProps;
  switch (da(t), t.tag) {
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
      return Ke(t.type) && ts(), Ie(t), null;
    case 3:
      return r = t.stateNode, Ar(), ae(Xe), ae(Le), _a(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (mi(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, vt !== null && (Mu(vt), vt = null))), wu(e, t), Ie(t), null;
    case 5:
      xa(t);
      var o = Dn(Lo.current);
      if (n = t.type, e !== null && t.stateNode != null) rh(e, t, n, r, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(B(166));
          return Ie(t), null;
        }
        if (e = Dn(Tt.current), mi(t)) {
          r = t.stateNode, n = t.type;
          var i = t.memoizedProps;
          switch (r[Pt] = t, r[Io] = i, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              ue("cancel", r), ue("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              ue("load", r);
              break;
            case "video":
            case "audio":
              for (o = 0; o < fo.length; o++) ue(fo[o], r);
              break;
            case "source":
              ue("error", r);
              break;
            case "img":
            case "image":
            case "link":
              ue(
                "error",
                r
              ), ue("load", r);
              break;
            case "details":
              ue("toggle", r);
              break;
            case "input":
              pc(r, i), ue("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!i.multiple }, ue("invalid", r);
              break;
            case "textarea":
              mc(r, i), ue("invalid", r);
          }
          Yl(n, i), o = null;
          for (var s in i) if (i.hasOwnProperty(s)) {
            var l = i[s];
            s === "children" ? typeof l == "string" ? r.textContent !== l && (i.suppressHydrationWarning !== !0 && hi(r.textContent, l, e), o = ["children", l]) : typeof l == "number" && r.textContent !== "" + l && (i.suppressHydrationWarning !== !0 && hi(
              r.textContent,
              l,
              e
            ), o = ["children", "" + l]) : No.hasOwnProperty(s) && l != null && s === "onScroll" && ue("scroll", r);
          }
          switch (n) {
            case "input":
              si(r), hc(r, i, !0);
              break;
            case "textarea":
              si(r), gc(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof i.onClick == "function" && (r.onclick = es);
          }
          r = o, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          s = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Rd(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = s.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = s.createElement(n, { is: r.is }) : (e = s.createElement(n), n === "select" && (s = e, r.multiple ? s.multiple = !0 : r.size && (s.size = r.size))) : e = s.createElementNS(e, n), e[Pt] = t, e[Io] = r, nh(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (s = Xl(n, r), n) {
              case "dialog":
                ue("cancel", e), ue("close", e), o = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                ue("load", e), o = r;
                break;
              case "video":
              case "audio":
                for (o = 0; o < fo.length; o++) ue(fo[o], e);
                o = r;
                break;
              case "source":
                ue("error", e), o = r;
                break;
              case "img":
              case "image":
              case "link":
                ue(
                  "error",
                  e
                ), ue("load", e), o = r;
                break;
              case "details":
                ue("toggle", e), o = r;
                break;
              case "input":
                pc(e, r), o = Vl(e, r), ue("invalid", e);
                break;
              case "option":
                o = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, o = pe({}, r, { value: void 0 }), ue("invalid", e);
                break;
              case "textarea":
                mc(e, r), o = Ul(e, r), ue("invalid", e);
                break;
              default:
                o = r;
            }
            Yl(n, o), l = o;
            for (i in l) if (l.hasOwnProperty(i)) {
              var u = l[i];
              i === "style" ? Id(e, u) : i === "dangerouslySetInnerHTML" ? (u = u ? u.__html : void 0, u != null && $d(e, u)) : i === "children" ? typeof u == "string" ? (n !== "textarea" || u !== "") && Co(e, u) : typeof u == "number" && Co(e, "" + u) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (No.hasOwnProperty(i) ? u != null && i === "onScroll" && ue("scroll", e) : u != null && Zu(e, i, u, s));
            }
            switch (n) {
              case "input":
                si(e), hc(e, r, !1);
                break;
              case "textarea":
                si(e), gc(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + wn(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, i = r.value, i != null ? _r(e, !!r.multiple, i, !1) : r.defaultValue != null && _r(
                  e,
                  !!r.multiple,
                  r.defaultValue,
                  !0
                );
                break;
              default:
                typeof o.onClick == "function" && (e.onclick = es);
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
      if (e && t.stateNode != null) oh(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(B(166));
        if (n = Dn(Lo.current), Dn(Tt.current), mi(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[Pt] = t, (i = r.nodeValue !== n) && (e = Je, e !== null)) switch (e.tag) {
            case 3:
              hi(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && hi(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          i && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[Pt] = t, t.stateNode = r;
      }
      return Ie(t), null;
    case 13:
      if (ae(fe), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (ce && qe !== null && t.mode & 1 && !(t.flags & 128)) Sp(), Rr(), t.flags |= 98560, i = !1;
        else if (i = mi(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!i) throw Error(B(318));
            if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(B(317));
            i[Pt] = t;
          } else Rr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Ie(t), i = !1;
        } else vt !== null && (Mu(vt), vt = null), i = !0;
        if (!i) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || fe.current & 1 ? _e === 0 && (_e = 3) : $a())), t.updateQueue !== null && (t.flags |= 4), Ie(t), null);
    case 4:
      return Ar(), wu(e, t), e === null && $o(t.stateNode.containerInfo), Ie(t), null;
    case 10:
      return ga(t.type._context), Ie(t), null;
    case 17:
      return Ke(t.type) && ts(), Ie(t), null;
    case 19:
      if (ae(fe), i = t.memoizedState, i === null) return Ie(t), null;
      if (r = (t.flags & 128) !== 0, s = i.rendering, s === null) if (r) to(i, !1);
      else {
        if (_e !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (s = us(e), s !== null) {
            for (t.flags |= 128, to(i, !1), r = s.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) i = n, e = r, i.flags &= 14680066, s = i.alternate, s === null ? (i.childLanes = 0, i.lanes = e, i.child = null, i.subtreeFlags = 0, i.memoizedProps = null, i.memoizedState = null, i.updateQueue = null, i.dependencies = null, i.stateNode = null) : (i.childLanes = s.childLanes, i.lanes = s.lanes, i.child = s.child, i.subtreeFlags = 0, i.deletions = null, i.memoizedProps = s.memoizedProps, i.memoizedState = s.memoizedState, i.updateQueue = s.updateQueue, i.type = s.type, e = s.dependencies, i.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return se(fe, fe.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        i.tail !== null && ye() > Dr && (t.flags |= 128, r = !0, to(i, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = us(s), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), to(i, !0), i.tail === null && i.tailMode === "hidden" && !s.alternate && !ce) return Ie(t), null;
        } else 2 * ye() - i.renderingStartTime > Dr && n !== 1073741824 && (t.flags |= 128, r = !0, to(i, !1), t.lanes = 4194304);
        i.isBackwards ? (s.sibling = t.child, t.child = s) : (n = i.last, n !== null ? n.sibling = s : t.child = s, i.last = s);
      }
      return i.tail !== null ? (t = i.tail, i.rendering = t, i.tail = t.sibling, i.renderingStartTime = ye(), t.sibling = null, n = fe.current, se(fe, r ? n & 1 | 2 : n & 1), t) : (Ie(t), null);
    case 22:
    case 23:
      return Ra(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? Ze & 1073741824 && (Ie(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ie(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(B(156, t.tag));
}
function Vy(e, t) {
  switch (da(t), t.tag) {
    case 1:
      return Ke(t.type) && ts(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Ar(), ae(Xe), ae(Le), _a(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return xa(t), null;
    case 13:
      if (ae(fe), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(B(340));
        Rr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return ae(fe), null;
    case 4:
      return Ar(), null;
    case 10:
      return ga(t.type._context), null;
    case 22:
    case 23:
      return Ra(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var vi = !1, De = !1, By = typeof WeakSet == "function" ? WeakSet : Set, W = null;
function vr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    he(e, t, r);
  }
  else n.current = null;
}
function xu(e, t, n) {
  try {
    n();
  } catch (r) {
    he(e, t, r);
  }
}
var sf = !1;
function by(e, t) {
  if (ru = Zi, e = ap(), ca(e)) {
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
        var s = 0, l = -1, u = -1, a = 0, c = 0, f = e, d = null;
        t: for (; ; ) {
          for (var m; f !== n || o !== 0 && f.nodeType !== 3 || (l = s + o), f !== i || r !== 0 && f.nodeType !== 3 || (u = s + r), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null; )
            d = f, f = m;
          for (; ; ) {
            if (f === e) break t;
            if (d === n && ++a === o && (l = s), d === i && ++c === r && (u = s), (m = f.nextSibling) !== null) break;
            f = d, d = f.parentNode;
          }
          f = m;
        }
        n = l === -1 || u === -1 ? null : { start: l, end: u };
      } else n = null;
    }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (ou = { focusedElem: e, selectionRange: n }, Zi = !1, W = t; W !== null; ) if (t = W, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, W = e;
  else for (; W !== null; ) {
    t = W;
    try {
      var w = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (w !== null) {
            var y = w.memoizedProps, k = w.memoizedState, p = t.stateNode, h = p.getSnapshotBeforeUpdate(t.elementType === t.type ? y : mt(t.type, y), k);
            p.__reactInternalSnapshotBeforeUpdate = h;
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
          throw Error(B(163));
      }
    } catch (v) {
      he(t, t.return, v);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, W = e;
      break;
    }
    W = t.return;
  }
  return w = sf, sf = !1, w;
}
function So(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var o = r = r.next;
    do {
      if ((o.tag & e) === e) {
        var i = o.destroy;
        o.destroy = void 0, i !== void 0 && xu(t, n, i);
      }
      o = o.next;
    } while (o !== r);
  }
}
function As(e, t) {
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
function _u(e) {
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
function ih(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, ih(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Pt], delete t[Io], delete t[lu], delete t[Ny], delete t[Cy])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function sh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function lf(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || sh(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Su(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = es));
  else if (r !== 4 && (e = e.child, e !== null)) for (Su(e, t, n), e = e.sibling; e !== null; ) Su(e, t, n), e = e.sibling;
}
function ku(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (ku(e, t, n), e = e.sibling; e !== null; ) ku(e, t, n), e = e.sibling;
}
var Me = null, gt = !1;
function Zt(e, t, n) {
  for (n = n.child; n !== null; ) lh(e, t, n), n = n.sibling;
}
function lh(e, t, n) {
  if (zt && typeof zt.onCommitFiberUnmount == "function") try {
    zt.onCommitFiberUnmount(Cs, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      De || vr(n, t);
    case 6:
      var r = Me, o = gt;
      Me = null, Zt(e, t, n), Me = r, gt = o, Me !== null && (gt ? (e = Me, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Me.removeChild(n.stateNode));
      break;
    case 18:
      Me !== null && (gt ? (e = Me, n = n.stateNode, e.nodeType === 8 ? hl(e.parentNode, n) : e.nodeType === 1 && hl(e, n), To(e)) : hl(Me, n.stateNode));
      break;
    case 4:
      r = Me, o = gt, Me = n.stateNode.containerInfo, gt = !0, Zt(e, t, n), Me = r, gt = o;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!De && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        o = r = r.next;
        do {
          var i = o, s = i.destroy;
          i = i.tag, s !== void 0 && (i & 2 || i & 4) && xu(n, t, s), o = o.next;
        } while (o !== r);
      }
      Zt(e, t, n);
      break;
    case 1:
      if (!De && (vr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
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
      n.mode & 1 ? (De = (r = De) || n.memoizedState !== null, Zt(e, t, n), De = r) : Zt(e, t, n);
      break;
    default:
      Zt(e, t, n);
  }
}
function uf(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new By()), t.forEach(function(r) {
      var o = qy.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(o, o));
    });
  }
}
function ht(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var o = n[r];
    try {
      var i = e, s = t, l = s;
      e: for (; l !== null; ) {
        switch (l.tag) {
          case 5:
            Me = l.stateNode, gt = !1;
            break e;
          case 3:
            Me = l.stateNode.containerInfo, gt = !0;
            break e;
          case 4:
            Me = l.stateNode.containerInfo, gt = !0;
            break e;
        }
        l = l.return;
      }
      if (Me === null) throw Error(B(160));
      lh(i, s, o), Me = null, gt = !1;
      var u = o.alternate;
      u !== null && (u.return = null), o.return = null;
    } catch (a) {
      he(o, t, a);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) uh(t, e), t = t.sibling;
}
function uh(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (ht(t, e), Ct(e), r & 4) {
        try {
          So(3, e, e.return), As(3, e);
        } catch (y) {
          he(e, e.return, y);
        }
        try {
          So(5, e, e.return);
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 1:
      ht(t, e), Ct(e), r & 512 && n !== null && vr(n, n.return);
      break;
    case 5:
      if (ht(t, e), Ct(e), r & 512 && n !== null && vr(n, n.return), e.flags & 32) {
        var o = e.stateNode;
        try {
          Co(o, "");
        } catch (y) {
          he(e, e.return, y);
        }
      }
      if (r & 4 && (o = e.stateNode, o != null)) {
        var i = e.memoizedProps, s = n !== null ? n.memoizedProps : i, l = e.type, u = e.updateQueue;
        if (e.updateQueue = null, u !== null) try {
          l === "input" && i.type === "radio" && i.name != null && Td(o, i), Xl(l, s);
          var a = Xl(l, i);
          for (s = 0; s < u.length; s += 2) {
            var c = u[s], f = u[s + 1];
            c === "style" ? Id(o, f) : c === "dangerouslySetInnerHTML" ? $d(o, f) : c === "children" ? Co(o, f) : Zu(o, c, f, a);
          }
          switch (l) {
            case "input":
              Bl(o, i);
              break;
            case "textarea":
              jd(o, i);
              break;
            case "select":
              var d = o._wrapperState.wasMultiple;
              o._wrapperState.wasMultiple = !!i.multiple;
              var m = i.value;
              m != null ? _r(o, !!i.multiple, m, !1) : d !== !!i.multiple && (i.defaultValue != null ? _r(
                o,
                !!i.multiple,
                i.defaultValue,
                !0
              ) : _r(o, !!i.multiple, i.multiple ? [] : "", !1));
          }
          o[Io] = i;
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 6:
      if (ht(t, e), Ct(e), r & 4) {
        if (e.stateNode === null) throw Error(B(162));
        o = e.stateNode, i = e.memoizedProps;
        try {
          o.nodeValue = i;
        } catch (y) {
          he(e, e.return, y);
        }
      }
      break;
    case 3:
      if (ht(t, e), Ct(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        To(t.containerInfo);
      } catch (y) {
        he(e, e.return, y);
      }
      break;
    case 4:
      ht(t, e), Ct(e);
      break;
    case 13:
      ht(t, e), Ct(e), o = e.child, o.flags & 8192 && (i = o.memoizedState !== null, o.stateNode.isHidden = i, !i || o.alternate !== null && o.alternate.memoizedState !== null || (Ta = ye())), r & 4 && uf(e);
      break;
    case 22:
      if (c = n !== null && n.memoizedState !== null, e.mode & 1 ? (De = (a = De) || c, ht(t, e), De = a) : ht(t, e), Ct(e), r & 8192) {
        if (a = e.memoizedState !== null, (e.stateNode.isHidden = a) && !c && e.mode & 1) for (W = e, c = e.child; c !== null; ) {
          for (f = W = c; W !== null; ) {
            switch (d = W, m = d.child, d.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                So(4, d, d.return);
                break;
              case 1:
                vr(d, d.return);
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
                vr(d, d.return);
                break;
              case 22:
                if (d.memoizedState !== null) {
                  cf(f);
                  continue;
                }
            }
            m !== null ? (m.return = d, W = m) : cf(f);
          }
          c = c.sibling;
        }
        e: for (c = null, f = e; ; ) {
          if (f.tag === 5) {
            if (c === null) {
              c = f;
              try {
                o = f.stateNode, a ? (i = o.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (l = f.stateNode, u = f.memoizedProps.style, s = u != null && u.hasOwnProperty("display") ? u.display : null, l.style.display = Ad("display", s));
              } catch (y) {
                he(e, e.return, y);
              }
            }
          } else if (f.tag === 6) {
            if (c === null) try {
              f.stateNode.nodeValue = a ? "" : f.memoizedProps;
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
      ht(t, e), Ct(e), r & 4 && uf(e);
      break;
    case 21:
      break;
    default:
      ht(
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
          if (sh(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(B(160));
      }
      switch (r.tag) {
        case 5:
          var o = r.stateNode;
          r.flags & 32 && (Co(o, ""), r.flags &= -33);
          var i = lf(e);
          ku(e, i, o);
          break;
        case 3:
        case 4:
          var s = r.stateNode.containerInfo, l = lf(e);
          Su(e, l, s);
          break;
        default:
          throw Error(B(161));
      }
    } catch (u) {
      he(e, e.return, u);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Uy(e, t, n) {
  W = e, ah(e);
}
function ah(e, t, n) {
  for (var r = (e.mode & 1) !== 0; W !== null; ) {
    var o = W, i = o.child;
    if (o.tag === 22 && r) {
      var s = o.memoizedState !== null || vi;
      if (!s) {
        var l = o.alternate, u = l !== null && l.memoizedState !== null || De;
        l = vi;
        var a = De;
        if (vi = s, (De = u) && !a) for (W = o; W !== null; ) s = W, u = s.child, s.tag === 22 && s.memoizedState !== null ? ff(o) : u !== null ? (u.return = s, W = u) : ff(o);
        for (; i !== null; ) W = i, ah(i), i = i.sibling;
        W = o, vi = l, De = a;
      }
      af(e);
    } else o.subtreeFlags & 8772 && i !== null ? (i.return = o, W = i) : af(e);
  }
}
function af(e) {
  for (; W !== null; ) {
    var t = W;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            De || As(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !De) if (n === null) r.componentDidMount();
            else {
              var o = t.elementType === t.type ? n.memoizedProps : mt(t.type, n.memoizedProps);
              r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var i = t.updateQueue;
            i !== null && Yc(t, i, r);
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
              Yc(t, s, n);
            }
            break;
          case 5:
            var l = t.stateNode;
            if (n === null && t.flags & 4) {
              n = l;
              var u = t.memoizedProps;
              switch (t.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  u.autoFocus && n.focus();
                  break;
                case "img":
                  u.src && (n.src = u.src);
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
              var a = t.alternate;
              if (a !== null) {
                var c = a.memoizedState;
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
            throw Error(B(163));
        }
        De || t.flags & 512 && _u(t);
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
function cf(e) {
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
function ff(e) {
  for (; W !== null; ) {
    var t = W;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            As(4, t);
          } catch (u) {
            he(t, n, u);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var o = t.return;
            try {
              r.componentDidMount();
            } catch (u) {
              he(t, o, u);
            }
          }
          var i = t.return;
          try {
            _u(t);
          } catch (u) {
            he(t, i, u);
          }
          break;
        case 5:
          var s = t.return;
          try {
            _u(t);
          } catch (u) {
            he(t, s, u);
          }
      }
    } catch (u) {
      he(t, t.return, u);
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
var Wy = Math.ceil, fs = Qt.ReactCurrentDispatcher, Pa = Qt.ReactCurrentOwner, at = Qt.ReactCurrentBatchConfig, ee = 0, Ee = null, ve = null, ze = 0, Ze = 0, wr = Sn(0), _e = 0, Vo = null, Yn = 0, Is = 0, za = 0, ko = null, Ue = null, Ta = 0, Dr = 1 / 0, Lt = null, ds = !1, Eu = null, mn = null, wi = !1, an = null, ps = 0, Eo = 0, Nu = null, Fi = -1, Hi = 0;
function Ve() {
  return ee & 6 ? ye() : Fi !== -1 ? Fi : Fi = ye();
}
function gn(e) {
  return e.mode & 1 ? ee & 2 && ze !== 0 ? ze & -ze : Py.transition !== null ? (Hi === 0 && (Hi = Xd()), Hi) : (e = oe, e !== 0 || (e = window.event, e = e === void 0 ? 16 : ep(e.type)), e) : 1;
}
function _t(e, t, n, r) {
  if (50 < Eo) throw Eo = 0, Nu = null, Error(B(185));
  Zo(e, n, r), (!(ee & 2) || e !== Ee) && (e === Ee && (!(ee & 2) && (Is |= n), _e === 4 && sn(e, ze)), Ge(e, r), n === 1 && ee === 0 && !(t.mode & 1) && (Dr = ye() + 500, js && kn()));
}
function Ge(e, t) {
  var n = e.callbackNode;
  P0(e, t);
  var r = Qi(e, e === Ee ? ze : 0);
  if (r === 0) n !== null && wc(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && wc(n), t === 1) e.tag === 0 ? My(df.bind(null, e)) : wp(df.bind(null, e)), ky(function() {
      !(ee & 6) && kn();
    }), n = null;
    else {
      switch (Kd(r)) {
        case 1:
          n = na;
          break;
        case 4:
          n = Wd;
          break;
        case 16:
          n = Gi;
          break;
        case 536870912:
          n = Yd;
          break;
        default:
          n = Gi;
      }
      n = yh(n, ch.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function ch(e, t) {
  if (Fi = -1, Hi = 0, ee & 6) throw Error(B(327));
  var n = e.callbackNode;
  if (Cr() && e.callbackNode !== n) return null;
  var r = Qi(e, e === Ee ? ze : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = hs(e, r);
  else {
    t = r;
    var o = ee;
    ee |= 2;
    var i = dh();
    (Ee !== e || ze !== t) && (Lt = null, Dr = ye() + 500, Fn(e, t));
    do
      try {
        Ky();
        break;
      } catch (l) {
        fh(e, l);
      }
    while (!0);
    ma(), fs.current = i, ee = o, ve !== null ? t = 0 : (Ee = null, ze = 0, t = _e);
  }
  if (t !== 0) {
    if (t === 2 && (o = ql(e), o !== 0 && (r = o, t = Cu(e, o))), t === 1) throw n = Vo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
    if (t === 6) sn(e, r);
    else {
      if (o = e.current.alternate, !(r & 30) && !Yy(o) && (t = hs(e, r), t === 2 && (i = ql(e), i !== 0 && (r = i, t = Cu(e, i))), t === 1)) throw n = Vo, Fn(e, 0), sn(e, r), Ge(e, ye()), n;
      switch (e.finishedWork = o, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(B(345));
        case 2:
          jn(e, Ue, Lt);
          break;
        case 3:
          if (sn(e, r), (r & 130023424) === r && (t = Ta + 500 - ye(), 10 < t)) {
            if (Qi(e, 0) !== 0) break;
            if (o = e.suspendedLanes, (o & r) !== r) {
              Ve(), e.pingedLanes |= e.suspendedLanes & o;
              break;
            }
            e.timeoutHandle = su(jn.bind(null, e, Ue, Lt), t);
            break;
          }
          jn(e, Ue, Lt);
          break;
        case 4:
          if (sn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, o = -1; 0 < r; ) {
            var s = 31 - xt(r);
            i = 1 << s, s = t[s], s > o && (o = s), r &= ~i;
          }
          if (r = o, r = ye() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * Wy(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = su(jn.bind(null, e, Ue, Lt), r);
            break;
          }
          jn(e, Ue, Lt);
          break;
        case 5:
          jn(e, Ue, Lt);
          break;
        default:
          throw Error(B(329));
      }
    }
  }
  return Ge(e, ye()), e.callbackNode === n ? ch.bind(null, e) : null;
}
function Cu(e, t) {
  var n = ko;
  return e.current.memoizedState.isDehydrated && (Fn(e, t).flags |= 256), e = hs(e, t), e !== 2 && (t = Ue, Ue = n, t !== null && Mu(t)), e;
}
function Mu(e) {
  Ue === null ? Ue = e : Ue.push.apply(Ue, e);
}
function Yy(e) {
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
  for (t &= ~za, t &= ~Is, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - xt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function df(e) {
  if (ee & 6) throw Error(B(327));
  Cr();
  var t = Qi(e, 0);
  if (!(t & 1)) return Ge(e, ye()), null;
  var n = hs(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = ql(e);
    r !== 0 && (t = r, n = Cu(e, r));
  }
  if (n === 1) throw n = Vo, Fn(e, 0), sn(e, t), Ge(e, ye()), n;
  if (n === 6) throw Error(B(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, jn(e, Ue, Lt), Ge(e, ye()), null;
}
function ja(e, t) {
  var n = ee;
  ee |= 1;
  try {
    return e(t);
  } finally {
    ee = n, ee === 0 && (Dr = ye() + 500, js && kn());
  }
}
function Xn(e) {
  an !== null && an.tag === 0 && !(ee & 6) && Cr();
  var t = ee;
  ee |= 1;
  var n = at.transition, r = oe;
  try {
    if (at.transition = null, oe = 1, e) return e();
  } finally {
    oe = r, at.transition = n, ee = t, !(ee & 6) && kn();
  }
}
function Ra() {
  Ze = wr.current, ae(wr);
}
function Fn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, Sy(n)), ve !== null) for (n = ve.return; n !== null; ) {
    var r = n;
    switch (da(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && ts();
        break;
      case 3:
        Ar(), ae(Xe), ae(Le), _a();
        break;
      case 5:
        xa(r);
        break;
      case 4:
        Ar();
        break;
      case 13:
        ae(fe);
        break;
      case 19:
        ae(fe);
        break;
      case 10:
        ga(r.type._context);
        break;
      case 22:
      case 23:
        Ra();
    }
    n = n.return;
  }
  if (Ee = e, ve = e = yn(e.current, null), ze = Ze = t, _e = 0, Vo = null, za = Is = Yn = 0, Ue = ko = null, In !== null) {
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
function fh(e, t) {
  do {
    var n = ve;
    try {
      if (ma(), Di.current = cs, as) {
        for (var r = de.memoizedState; r !== null; ) {
          var o = r.queue;
          o !== null && (o.pending = null), r = r.next;
        }
        as = !1;
      }
      if (Wn = 0, ke = xe = de = null, _o = !1, Oo = 0, Pa.current = null, n === null || n.return === null) {
        _e = 1, Vo = t, ve = null;
        break;
      }
      e: {
        var i = e, s = n.return, l = n, u = t;
        if (t = ze, l.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
          var a = u, c = l, f = c.tag;
          if (!(c.mode & 1) && (f === 0 || f === 11 || f === 15)) {
            var d = c.alternate;
            d ? (c.updateQueue = d.updateQueue, c.memoizedState = d.memoizedState, c.lanes = d.lanes) : (c.updateQueue = null, c.memoizedState = null);
          }
          var m = qc(s);
          if (m !== null) {
            m.flags &= -257, Jc(m, s, l, i, t), m.mode & 1 && Zc(i, a, t), t = m, u = a;
            var w = t.updateQueue;
            if (w === null) {
              var y = /* @__PURE__ */ new Set();
              y.add(u), t.updateQueue = y;
            } else w.add(u);
            break e;
          } else {
            if (!(t & 1)) {
              Zc(i, a, t), $a();
              break e;
            }
            u = Error(B(426));
          }
        } else if (ce && l.mode & 1) {
          var k = qc(s);
          if (k !== null) {
            !(k.flags & 65536) && (k.flags |= 256), Jc(k, s, l, i, t), pa(Ir(u, l));
            break e;
          }
        }
        i = u = Ir(u, l), _e !== 4 && (_e = 2), ko === null ? ko = [i] : ko.push(i), i = s;
        do {
          switch (i.tag) {
            case 3:
              i.flags |= 65536, t &= -t, i.lanes |= t;
              var p = Kp(i, u, t);
              Wc(i, p);
              break e;
            case 1:
              l = u;
              var h = i.type, g = i.stateNode;
              if (!(i.flags & 128) && (typeof h.getDerivedStateFromError == "function" || g !== null && typeof g.componentDidCatch == "function" && (mn === null || !mn.has(g)))) {
                i.flags |= 65536, t &= -t, i.lanes |= t;
                var v = Gp(i, l, t);
                Wc(i, v);
                break e;
              }
          }
          i = i.return;
        } while (i !== null);
      }
      hh(n);
    } catch (C) {
      t = C, ve === n && n !== null && (ve = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function dh() {
  var e = fs.current;
  return fs.current = cs, e === null ? cs : e;
}
function $a() {
  (_e === 0 || _e === 3 || _e === 2) && (_e = 4), Ee === null || !(Yn & 268435455) && !(Is & 268435455) || sn(Ee, ze);
}
function hs(e, t) {
  var n = ee;
  ee |= 2;
  var r = dh();
  (Ee !== e || ze !== t) && (Lt = null, Fn(e, t));
  do
    try {
      Xy();
      break;
    } catch (o) {
      fh(e, o);
    }
  while (!0);
  if (ma(), ee = n, fs.current = r, ve !== null) throw Error(B(261));
  return Ee = null, ze = 0, _e;
}
function Xy() {
  for (; ve !== null; ) ph(ve);
}
function Ky() {
  for (; ve !== null && !w0(); ) ph(ve);
}
function ph(e) {
  var t = gh(e.alternate, e, Ze);
  e.memoizedProps = e.pendingProps, t === null ? hh(e) : ve = t, Pa.current = null;
}
function hh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = Vy(n, t), n !== null) {
        n.flags &= 32767, ve = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        _e = 6, ve = null;
        return;
      }
    } else if (n = Hy(n, t, Ze), n !== null) {
      ve = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ve = t;
      return;
    }
    ve = t = e;
  } while (t !== null);
  _e === 0 && (_e = 5);
}
function jn(e, t, n) {
  var r = oe, o = at.transition;
  try {
    at.transition = null, oe = 1, Gy(e, t, n, r);
  } finally {
    at.transition = o, oe = r;
  }
  return null;
}
function Gy(e, t, n, r) {
  do
    Cr();
  while (an !== null);
  if (ee & 6) throw Error(B(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(B(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var i = n.lanes | n.childLanes;
  if (z0(e, i), e === Ee && (ve = Ee = null, ze = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || wi || (wi = !0, yh(Gi, function() {
    return Cr(), null;
  })), i = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || i) {
    i = at.transition, at.transition = null;
    var s = oe;
    oe = 1;
    var l = ee;
    ee |= 4, Pa.current = null, by(e, n), uh(n, e), my(ou), Zi = !!ru, ou = ru = null, e.current = n, Uy(n), x0(), ee = l, oe = s, at.transition = i;
  } else e.current = n;
  if (wi && (wi = !1, an = e, ps = o), i = e.pendingLanes, i === 0 && (mn = null), k0(n.stateNode), Ge(e, ye()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) o = t[n], r(o.value, { componentStack: o.stack, digest: o.digest });
  if (ds) throw ds = !1, e = Eu, Eu = null, e;
  return ps & 1 && e.tag !== 0 && Cr(), i = e.pendingLanes, i & 1 ? e === Nu ? Eo++ : (Eo = 0, Nu = e) : Eo = 0, kn(), null;
}
function Cr() {
  if (an !== null) {
    var e = Kd(ps), t = at.transition, n = oe;
    try {
      if (at.transition = null, oe = 16 > e ? 16 : e, an === null) var r = !1;
      else {
        if (e = an, an = null, ps = 0, ee & 6) throw Error(B(331));
        var o = ee;
        for (ee |= 4, W = e.current; W !== null; ) {
          var i = W, s = i.child;
          if (W.flags & 16) {
            var l = i.deletions;
            if (l !== null) {
              for (var u = 0; u < l.length; u++) {
                var a = l[u];
                for (W = a; W !== null; ) {
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
                    var d = c.sibling, m = c.return;
                    if (ih(c), c === a) {
                      W = null;
                      break;
                    }
                    if (d !== null) {
                      d.return = m, W = d;
                      break;
                    }
                    W = m;
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
            var p = i.sibling;
            if (p !== null) {
              p.return = i.return, W = p;
              break e;
            }
            W = i.return;
          }
        }
        var h = e.current;
        for (W = h; W !== null; ) {
          s = W;
          var g = s.child;
          if (s.subtreeFlags & 2064 && g !== null) g.return = s, W = g;
          else e: for (s = h; W !== null; ) {
            if (l = W, l.flags & 2048) try {
              switch (l.tag) {
                case 0:
                case 11:
                case 15:
                  As(9, l);
              }
            } catch (C) {
              he(l, l.return, C);
            }
            if (l === s) {
              W = null;
              break e;
            }
            var v = l.sibling;
            if (v !== null) {
              v.return = l.return, W = v;
              break e;
            }
            W = l.return;
          }
        }
        if (ee = o, kn(), zt && typeof zt.onPostCommitFiberRoot == "function") try {
          zt.onPostCommitFiberRoot(Cs, e);
        } catch {
        }
        r = !0;
      }
      return r;
    } finally {
      oe = n, at.transition = t;
    }
  }
  return !1;
}
function pf(e, t, n) {
  t = Ir(n, t), t = Kp(e, t, 1), e = hn(e, t, 1), t = Ve(), e !== null && (Zo(e, 1, t), Ge(e, t));
}
function he(e, t, n) {
  if (e.tag === 3) pf(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      pf(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (mn === null || !mn.has(r))) {
        e = Ir(n, e), e = Gp(t, e, 1), t = hn(t, e, 1), e = Ve(), t !== null && (Zo(t, 1, e), Ge(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function Qy(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Ve(), e.pingedLanes |= e.suspendedLanes & n, Ee === e && (ze & n) === n && (_e === 4 || _e === 3 && (ze & 130023424) === ze && 500 > ye() - Ta ? Fn(e, 0) : za |= n), Ge(e, t);
}
function mh(e, t) {
  t === 0 && (e.mode & 1 ? (t = ai, ai <<= 1, !(ai & 130023424) && (ai = 4194304)) : t = 1);
  var n = Ve();
  e = Yt(e, t), e !== null && (Zo(e, t, n), Ge(e, n));
}
function Zy(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), mh(e, n);
}
function qy(e, t) {
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
      throw Error(B(314));
  }
  r !== null && r.delete(t), mh(e, n);
}
var gh;
gh = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) We = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return We = !1, Fy(e, t, n);
    We = !!(e.flags & 131072);
  }
  else We = !1, ce && t.flags & 1048576 && xp(t, os, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      Oi(e, t), e = t.pendingProps;
      var o = jr(t, Le.current);
      Nr(t, n), o = ka(null, t, r, e, o, n);
      var i = Ea();
      return t.flags |= 1, typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ke(r) ? (i = !0, ns(t)) : i = !1, t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null, va(t), o.updater = $s, t.stateNode = o, o._reactInternals = t, pu(t, r, e, n), t = gu(null, t, r, !0, i, n)) : (t.tag = 0, ce && i && fa(t), He(null, t, o, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (Oi(e, t), e = t.pendingProps, o = r._init, r = o(r._payload), t.type = r, o = t.tag = ev(r), e = mt(r, e), o) {
          case 0:
            t = mu(null, t, r, e, n);
            break e;
          case 1:
            t = nf(null, t, r, e, n);
            break e;
          case 11:
            t = ef(null, t, r, e, n);
            break e;
          case 14:
            t = tf(null, t, r, mt(r.type, e), n);
            break e;
        }
        throw Error(B(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : mt(r, o), mu(e, t, r, o, n);
    case 1:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : mt(r, o), nf(e, t, r, o, n);
    case 3:
      e: {
        if (Jp(t), e === null) throw Error(B(387));
        r = t.pendingProps, i = t.memoizedState, o = i.element, Cp(e, t), ls(t, r, null, n);
        var s = t.memoizedState;
        if (r = s.element, i.isDehydrated) if (i = { element: r, isDehydrated: !1, cache: s.cache, pendingSuspenseBoundaries: s.pendingSuspenseBoundaries, transitions: s.transitions }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
          o = Ir(Error(B(423)), t), t = rf(e, t, r, n, o);
          break e;
        } else if (r !== o) {
          o = Ir(Error(B(424)), t), t = rf(e, t, r, n, o);
          break e;
        } else for (qe = pn(t.stateNode.containerInfo.firstChild), Je = t, ce = !0, vt = null, n = Ep(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
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
      return Mp(t), e === null && cu(t), r = t.type, o = t.pendingProps, i = e !== null ? e.memoizedProps : null, s = o.children, iu(r, o) ? s = null : i !== null && iu(r, i) && (t.flags |= 32), qp(e, t), He(e, t, s, n), t.child;
    case 6:
      return e === null && cu(t), null;
    case 13:
      return eh(e, t, n);
    case 4:
      return wa(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = $r(t, null, r, n) : He(e, t, r, n), t.child;
    case 11:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : mt(r, o), ef(e, t, r, o, n);
    case 7:
      return He(e, t, t.pendingProps, n), t.child;
    case 8:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return He(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, o = t.pendingProps, i = t.memoizedProps, s = o.value, se(is, r._currentValue), r._currentValue = s, i !== null) if (St(i.value, s)) {
          if (i.children === o.children && !Xe.current) {
            t = Xt(e, t, n);
            break e;
          }
        } else for (i = t.child, i !== null && (i.return = t); i !== null; ) {
          var l = i.dependencies;
          if (l !== null) {
            s = i.child;
            for (var u = l.firstContext; u !== null; ) {
              if (u.context === r) {
                if (i.tag === 1) {
                  u = Bt(-1, n & -n), u.tag = 2;
                  var a = i.updateQueue;
                  if (a !== null) {
                    a = a.shared;
                    var c = a.pending;
                    c === null ? u.next = u : (u.next = c.next, c.next = u), a.pending = u;
                  }
                }
                i.lanes |= n, u = i.alternate, u !== null && (u.lanes |= n), fu(
                  i.return,
                  n,
                  t
                ), l.lanes |= n;
                break;
              }
              u = u.next;
            }
          } else if (i.tag === 10) s = i.type === t.type ? null : i.child;
          else if (i.tag === 18) {
            if (s = i.return, s === null) throw Error(B(341));
            s.lanes |= n, l = s.alternate, l !== null && (l.lanes |= n), fu(s, n, t), s = i.sibling;
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
      return o = t.type, r = t.pendingProps.children, Nr(t, n), o = ft(o), r = r(o), t.flags |= 1, He(e, t, r, n), t.child;
    case 14:
      return r = t.type, o = mt(r, t.pendingProps), o = mt(r.type, o), tf(e, t, r, o, n);
    case 15:
      return Qp(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : mt(r, o), Oi(e, t), t.tag = 1, Ke(r) ? (e = !0, ns(t)) : e = !1, Nr(t, n), Xp(t, r, o), pu(t, r, o, n), gu(null, t, r, !0, e, n);
    case 19:
      return th(e, t, n);
    case 22:
      return Zp(e, t, n);
  }
  throw Error(B(156, t.tag));
};
function yh(e, t) {
  return Ud(e, t);
}
function Jy(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function lt(e, t, n, r) {
  return new Jy(e, t, n, r);
}
function Aa(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function ev(e) {
  if (typeof e == "function") return Aa(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === Ju) return 11;
    if (e === ea) return 14;
  }
  return 2;
}
function yn(e, t) {
  var n = e.alternate;
  return n === null ? (n = lt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function Vi(e, t, n, r, o, i) {
  var s = 2;
  if (r = e, typeof e == "function") Aa(e) && (s = 1);
  else if (typeof e == "string") s = 5;
  else e: switch (e) {
    case ar:
      return Hn(n.children, o, i, t);
    case qu:
      s = 8, o |= 8;
      break;
    case Ll:
      return e = lt(12, n, t, o | 2), e.elementType = Ll, e.lanes = i, e;
    case Ol:
      return e = lt(13, n, t, o), e.elementType = Ol, e.lanes = i, e;
    case Fl:
      return e = lt(19, n, t, o), e.elementType = Fl, e.lanes = i, e;
    case Md:
      return Ds(n, o, i, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Nd:
          s = 10;
          break e;
        case Cd:
          s = 9;
          break e;
        case Ju:
          s = 11;
          break e;
        case ea:
          s = 14;
          break e;
        case en:
          s = 16, r = null;
          break e;
      }
      throw Error(B(130, e == null ? e : typeof e, ""));
  }
  return t = lt(s, n, t, o), t.elementType = e, t.type = r, t.lanes = i, t;
}
function Hn(e, t, n, r) {
  return e = lt(7, e, r, t), e.lanes = n, e;
}
function Ds(e, t, n, r) {
  return e = lt(22, e, r, t), e.elementType = Md, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Sl(e, t, n) {
  return e = lt(6, e, null, t), e.lanes = n, e;
}
function kl(e, t, n) {
  return t = lt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function tv(e, t, n, r, o) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = rl(0), this.expirationTimes = rl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = rl(0), this.identifierPrefix = r, this.onRecoverableError = o, this.mutableSourceEagerHydrationData = null;
}
function Ia(e, t, n, r, o, i, s, l, u) {
  return e = new tv(e, t, n, l, u), t === 1 ? (t = 1, i === !0 && (t |= 8)) : t = 0, i = lt(3, null, null, t), e.current = i, i.stateNode = e, i.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, va(i), e;
}
function nv(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: ur, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function vh(e) {
  if (!e) return xn;
  e = e._reactInternals;
  e: {
    if (Zn(e) !== e || e.tag !== 1) throw Error(B(170));
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
    throw Error(B(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Ke(n)) return vp(e, n, t);
  }
  return t;
}
function wh(e, t, n, r, o, i, s, l, u) {
  return e = Ia(n, r, !0, e, o, i, s, l, u), e.context = vh(null), n = e.current, r = Ve(), o = gn(n), i = Bt(r, o), i.callback = t ?? null, hn(n, i, o), e.current.lanes = o, Zo(e, o, r), Ge(e, r), e;
}
function Ls(e, t, n, r) {
  var o = t.current, i = Ve(), s = gn(o);
  return n = vh(n), t.context === null ? t.context = n : t.pendingContext = n, t = Bt(i, s), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = hn(o, t, s), e !== null && (_t(e, o, s, i), Ii(e, o, s)), s;
}
function ms(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function hf(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Da(e, t) {
  hf(e, t), (e = e.alternate) && hf(e, t);
}
function rv() {
  return null;
}
var xh = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function La(e) {
  this._internalRoot = e;
}
Os.prototype.render = La.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(B(409));
  Ls(e, t, null, null);
};
Os.prototype.unmount = La.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    Xn(function() {
      Ls(null, e, null, null);
    }), t[Wt] = null;
  }
};
function Os(e) {
  this._internalRoot = e;
}
Os.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Zd();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < on.length && t !== 0 && t < on[n].priority; n++) ;
    on.splice(n, 0, e), n === 0 && Jd(e);
  }
};
function Oa(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Fs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function mf() {
}
function ov(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var i = r;
      r = function() {
        var a = ms(s);
        i.call(a);
      };
    }
    var s = wh(t, r, e, 0, null, !1, !1, "", mf);
    return e._reactRootContainer = s, e[Wt] = s.current, $o(e.nodeType === 8 ? e.parentNode : e), Xn(), s;
  }
  for (; o = e.lastChild; ) e.removeChild(o);
  if (typeof r == "function") {
    var l = r;
    r = function() {
      var a = ms(u);
      l.call(a);
    };
  }
  var u = Ia(e, 0, !1, null, null, !1, !1, "", mf);
  return e._reactRootContainer = u, e[Wt] = u.current, $o(e.nodeType === 8 ? e.parentNode : e), Xn(function() {
    Ls(t, u, n, r);
  }), u;
}
function Hs(e, t, n, r, o) {
  var i = n._reactRootContainer;
  if (i) {
    var s = i;
    if (typeof o == "function") {
      var l = o;
      o = function() {
        var u = ms(s);
        l.call(u);
      };
    }
    Ls(t, s, e, o);
  } else s = ov(n, t, e, o, r);
  return ms(s);
}
Gd = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = co(t.pendingLanes);
        n !== 0 && (ra(t, n | 1), Ge(t, ye()), !(ee & 6) && (Dr = ye() + 500, kn()));
      }
      break;
    case 13:
      Xn(function() {
        var r = Yt(e, 1);
        if (r !== null) {
          var o = Ve();
          _t(r, e, 1, o);
        }
      }), Da(e, 1);
  }
};
oa = function(e) {
  if (e.tag === 13) {
    var t = Yt(e, 134217728);
    if (t !== null) {
      var n = Ve();
      _t(t, e, 134217728, n);
    }
    Da(e, 134217728);
  }
};
Qd = function(e) {
  if (e.tag === 13) {
    var t = gn(e), n = Yt(e, t);
    if (n !== null) {
      var r = Ve();
      _t(n, e, t, r);
    }
    Da(e, t);
  }
};
Zd = function() {
  return oe;
};
qd = function(e, t) {
  var n = oe;
  try {
    return oe = e, t();
  } finally {
    oe = n;
  }
};
Gl = function(e, t, n) {
  switch (t) {
    case "input":
      if (Bl(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = Ts(r);
            if (!o) throw Error(B(90));
            zd(r), Bl(r, o);
          }
        }
      }
      break;
    case "textarea":
      jd(e, n);
      break;
    case "select":
      t = n.value, t != null && _r(e, !!n.multiple, t, !1);
  }
};
Od = ja;
Fd = Xn;
var iv = { usingClientEntryPoint: !1, Events: [Jo, pr, Ts, Dd, Ld, ja] }, no = { findFiberByHostInstance: An, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, sv = { bundleType: no.bundleType, version: no.version, rendererPackageName: no.rendererPackageName, rendererConfig: no.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Qt.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = Bd(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: no.findFiberByHostInstance || rv, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var xi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!xi.isDisabled && xi.supportsFiber) try {
    Cs = xi.inject(sv), zt = xi;
  } catch {
  }
}
nt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = iv;
nt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Oa(t)) throw Error(B(200));
  return nv(e, t, null, n);
};
nt.createRoot = function(e, t) {
  if (!Oa(e)) throw Error(B(299));
  var n = !1, r = "", o = xh;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = Ia(e, 1, !1, null, null, n, !1, r, o), e[Wt] = t.current, $o(e.nodeType === 8 ? e.parentNode : e), new La(t);
};
nt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(B(188)) : (e = Object.keys(e).join(","), Error(B(268, e)));
  return e = Bd(t), e = e === null ? null : e.stateNode, e;
};
nt.flushSync = function(e) {
  return Xn(e);
};
nt.hydrate = function(e, t, n) {
  if (!Fs(t)) throw Error(B(200));
  return Hs(null, e, t, !0, n);
};
nt.hydrateRoot = function(e, t, n) {
  if (!Oa(e)) throw Error(B(405));
  var r = n != null && n.hydratedSources || null, o = !1, i = "", s = xh;
  if (n != null && (n.unstable_strictMode === !0 && (o = !0), n.identifierPrefix !== void 0 && (i = n.identifierPrefix), n.onRecoverableError !== void 0 && (s = n.onRecoverableError)), t = wh(t, null, e, 1, n ?? null, o, !1, i, s), e[Wt] = t.current, $o(e), r) for (e = 0; e < r.length; e++) n = r[e], o = n._getVersion, o = o(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(
    n,
    o
  );
  return new Os(t);
};
nt.render = function(e, t, n) {
  if (!Fs(t)) throw Error(B(200));
  return Hs(null, e, t, !1, n);
};
nt.unmountComponentAtNode = function(e) {
  if (!Fs(e)) throw Error(B(40));
  return e._reactRootContainer ? (Xn(function() {
    Hs(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Wt] = null;
    });
  }), !0) : !1;
};
nt.unstable_batchedUpdates = ja;
nt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Fs(n)) throw Error(B(200));
  if (e == null || e._reactInternals === void 0) throw Error(B(38));
  return Hs(e, t, n, !1, r);
};
nt.version = "18.3.1-next-f1338f8080-20240426";
function _h() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_h);
    } catch (e) {
      console.error(e);
    }
}
_h(), _d.exports = nt;
var lv = _d.exports, Sh, gf = lv;
Sh = gf.createRoot, gf.hydrateRoot;
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
var kh = { exports: {} }, Eh = {}, Nh = { exports: {} }, Ch = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Lr = P;
function uv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var av = typeof Object.is == "function" ? Object.is : uv, cv = Lr.useState, fv = Lr.useEffect, dv = Lr.useLayoutEffect, pv = Lr.useDebugValue;
function hv(e, t) {
  var n = t(), r = cv({ inst: { value: n, getSnapshot: t } }), o = r[0].inst, i = r[1];
  return dv(
    function() {
      o.value = n, o.getSnapshot = t, El(o) && i({ inst: o });
    },
    [e, n, t]
  ), fv(
    function() {
      return El(o) && i({ inst: o }), e(function() {
        El(o) && i({ inst: o });
      });
    },
    [e]
  ), pv(n), n;
}
function El(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !av(e, n);
  } catch {
    return !0;
  }
}
function mv(e, t) {
  return t();
}
var gv = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? mv : hv;
Ch.useSyncExternalStore = Lr.useSyncExternalStore !== void 0 ? Lr.useSyncExternalStore : gv;
Nh.exports = Ch;
var yv = Nh.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Vs = P, vv = yv;
function wv(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var xv = typeof Object.is == "function" ? Object.is : wv, _v = vv.useSyncExternalStore, Sv = Vs.useRef, kv = Vs.useEffect, Ev = Vs.useMemo, Nv = Vs.useDebugValue;
Eh.useSyncExternalStoreWithSelector = function(e, t, n, r, o) {
  var i = Sv(null);
  if (i.current === null) {
    var s = { hasValue: !1, value: null };
    i.current = s;
  } else s = i.current;
  i = Ev(
    function() {
      function u(m) {
        if (!a) {
          if (a = !0, c = m, m = r(m), o !== void 0 && s.hasValue) {
            var w = s.value;
            if (o(w, m))
              return f = w;
          }
          return f = m;
        }
        if (w = f, xv(c, m)) return w;
        var y = r(m);
        return o !== void 0 && o(w, y) ? (c = m, w) : (c = m, f = y);
      }
      var a = !1, c, f, d = n === void 0 ? null : n;
      return [
        function() {
          return u(t());
        },
        d === null ? void 0 : function() {
          return u(d());
        }
      ];
    },
    [t, n, r, o]
  );
  var l = _v(e, i[0], i[1]);
  return kv(
    function() {
      s.hasValue = !0, s.value = l;
    },
    [l]
  ), Nv(l), l;
};
kh.exports = Eh;
var Cv = kh.exports;
const Mh = /* @__PURE__ */ Uu(Cv), Mv = {}, yf = (e) => {
  let t;
  const n = /* @__PURE__ */ new Set(), r = (c, f) => {
    const d = typeof c == "function" ? c(t) : c;
    if (!Object.is(d, t)) {
      const m = t;
      t = f ?? (typeof d != "object" || d === null) ? d : Object.assign({}, t, d), n.forEach((w) => w(t, m));
    }
  }, o = () => t, u = { setState: r, getState: o, getInitialState: () => a, subscribe: (c) => (n.add(c), () => n.delete(c)), destroy: () => {
    (Mv ? "production" : void 0) !== "production" && console.warn(
      "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
    ), n.clear();
  } }, a = t = e(r, o, u);
  return u;
}, Ph = (e) => e ? yf(e) : yf, { useDebugValue: Pv } = I, { useSyncExternalStoreWithSelector: zv } = Mh, Tv = (e) => e;
function zh(e, t = Tv, n) {
  const r = zv(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return Pv(r), r;
}
const vf = (e, t) => {
  const n = Ph(e), r = (o, i = t) => zh(n, o, i);
  return Object.assign(r, n), r;
}, jv = (e, t) => e ? vf(e, t) : vf;
function Ne(e, t) {
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
var Rv = { value: () => {
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
function $v(e, t) {
  return e.trim().split(/^|\s+/).map(function(n) {
    var r = "", o = n.indexOf(".");
    if (o >= 0 && (r = n.slice(o + 1), n = n.slice(0, o)), n && !t.hasOwnProperty(n)) throw new Error("unknown type: " + n);
    return { type: n, name: r };
  });
}
Bi.prototype = Bs.prototype = {
  constructor: Bi,
  on: function(e, t) {
    var n = this._, r = $v(e + "", n), o, i = -1, s = r.length;
    if (arguments.length < 2) {
      for (; ++i < s; ) if ((o = (e = r[i]).type) && (o = Av(n[o], e.name))) return o;
      return;
    }
    if (t != null && typeof t != "function") throw new Error("invalid callback: " + t);
    for (; ++i < s; )
      if (o = (e = r[i]).type) n[o] = wf(n[o], e.name, t);
      else if (t == null) for (o in n) n[o] = wf(n[o], e.name, null);
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
function Av(e, t) {
  for (var n = 0, r = e.length, o; n < r; ++n)
    if ((o = e[n]).name === t)
      return o.value;
}
function wf(e, t, n) {
  for (var r = 0, o = e.length; r < o; ++r)
    if (e[r].name === t) {
      e[r] = Rv, e = e.slice(0, r).concat(e.slice(r + 1));
      break;
    }
  return n != null && e.push({ name: t, value: n }), e;
}
var Pu = "http://www.w3.org/1999/xhtml";
const xf = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: Pu,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function bs(e) {
  var t = e += "", n = t.indexOf(":");
  return n >= 0 && (t = e.slice(0, n)) !== "xmlns" && (e = e.slice(n + 1)), xf.hasOwnProperty(t) ? { space: xf[t], local: e } : e;
}
function Iv(e) {
  return function() {
    var t = this.ownerDocument, n = this.namespaceURI;
    return n === Pu && t.documentElement.namespaceURI === Pu ? t.createElement(e) : t.createElementNS(n, e);
  };
}
function Dv(e) {
  return function() {
    return this.ownerDocument.createElementNS(e.space, e.local);
  };
}
function Th(e) {
  var t = bs(e);
  return (t.local ? Dv : Iv)(t);
}
function Lv() {
}
function Fa(e) {
  return e == null ? Lv : function() {
    return this.querySelector(e);
  };
}
function Ov(e) {
  typeof e != "function" && (e = Fa(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = new Array(s), u, a, c = 0; c < s; ++c)
      (u = i[c]) && (a = e.call(u, u.__data__, c, i)) && ("__data__" in u && (a.__data__ = u.__data__), l[c] = a);
  return new tt(r, this._parents);
}
function Fv(e) {
  return e == null ? [] : Array.isArray(e) ? e : Array.from(e);
}
function Hv() {
  return [];
}
function jh(e) {
  return e == null ? Hv : function() {
    return this.querySelectorAll(e);
  };
}
function Vv(e) {
  return function() {
    return Fv(e.apply(this, arguments));
  };
}
function Bv(e) {
  typeof e == "function" ? e = Vv(e) : e = jh(e);
  for (var t = this._groups, n = t.length, r = [], o = [], i = 0; i < n; ++i)
    for (var s = t[i], l = s.length, u, a = 0; a < l; ++a)
      (u = s[a]) && (r.push(e.call(u, u.__data__, a, s)), o.push(u));
  return new tt(r, o);
}
function Rh(e) {
  return function() {
    return this.matches(e);
  };
}
function $h(e) {
  return function(t) {
    return t.matches(e);
  };
}
var bv = Array.prototype.find;
function Uv(e) {
  return function() {
    return bv.call(this.children, e);
  };
}
function Wv() {
  return this.firstElementChild;
}
function Yv(e) {
  return this.select(e == null ? Wv : Uv(typeof e == "function" ? e : $h(e)));
}
var Xv = Array.prototype.filter;
function Kv() {
  return Array.from(this.children);
}
function Gv(e) {
  return function() {
    return Xv.call(this.children, e);
  };
}
function Qv(e) {
  return this.selectAll(e == null ? Kv : Gv(typeof e == "function" ? e : $h(e)));
}
function Zv(e) {
  typeof e != "function" && (e = Rh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], u, a = 0; a < s; ++a)
      (u = i[a]) && e.call(u, u.__data__, a, i) && l.push(u);
  return new tt(r, this._parents);
}
function Ah(e) {
  return new Array(e.length);
}
function qv() {
  return new tt(this._enter || this._groups.map(Ah), this._parents);
}
function gs(e, t) {
  this.ownerDocument = e.ownerDocument, this.namespaceURI = e.namespaceURI, this._next = null, this._parent = e, this.__data__ = t;
}
gs.prototype = {
  constructor: gs,
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
function Jv(e) {
  return function() {
    return e;
  };
}
function e1(e, t, n, r, o, i) {
  for (var s = 0, l, u = t.length, a = i.length; s < a; ++s)
    (l = t[s]) ? (l.__data__ = i[s], r[s] = l) : n[s] = new gs(e, i[s]);
  for (; s < u; ++s)
    (l = t[s]) && (o[s] = l);
}
function t1(e, t, n, r, o, i, s) {
  var l, u, a = /* @__PURE__ */ new Map(), c = t.length, f = i.length, d = new Array(c), m;
  for (l = 0; l < c; ++l)
    (u = t[l]) && (d[l] = m = s.call(u, u.__data__, l, t) + "", a.has(m) ? o[l] = u : a.set(m, u));
  for (l = 0; l < f; ++l)
    m = s.call(e, i[l], l, i) + "", (u = a.get(m)) ? (r[l] = u, u.__data__ = i[l], a.delete(m)) : n[l] = new gs(e, i[l]);
  for (l = 0; l < c; ++l)
    (u = t[l]) && a.get(d[l]) === u && (o[l] = u);
}
function n1(e) {
  return e.__data__;
}
function r1(e, t) {
  if (!arguments.length) return Array.from(this, n1);
  var n = t ? t1 : e1, r = this._parents, o = this._groups;
  typeof e != "function" && (e = Jv(e));
  for (var i = o.length, s = new Array(i), l = new Array(i), u = new Array(i), a = 0; a < i; ++a) {
    var c = r[a], f = o[a], d = f.length, m = o1(e.call(c, c && c.__data__, a, r)), w = m.length, y = l[a] = new Array(w), k = s[a] = new Array(w), p = u[a] = new Array(d);
    n(c, f, y, k, p, m, t);
    for (var h = 0, g = 0, v, C; h < w; ++h)
      if (v = y[h]) {
        for (h >= g && (g = h + 1); !(C = k[g]) && ++g < w; ) ;
        v._next = C || null;
      }
  }
  return s = new tt(s, r), s._enter = l, s._exit = u, s;
}
function o1(e) {
  return typeof e == "object" && "length" in e ? e : Array.from(e);
}
function i1() {
  return new tt(this._exit || this._groups.map(Ah), this._parents);
}
function s1(e, t, n) {
  var r = this.enter(), o = this, i = this.exit();
  return typeof e == "function" ? (r = e(r), r && (r = r.selection())) : r = r.append(e + ""), t != null && (o = t(o), o && (o = o.selection())), n == null ? i.remove() : n(i), r && o ? r.merge(o).order() : o;
}
function l1(e) {
  for (var t = e.selection ? e.selection() : e, n = this._groups, r = t._groups, o = n.length, i = r.length, s = Math.min(o, i), l = new Array(o), u = 0; u < s; ++u)
    for (var a = n[u], c = r[u], f = a.length, d = l[u] = new Array(f), m, w = 0; w < f; ++w)
      (m = a[w] || c[w]) && (d[w] = m);
  for (; u < o; ++u)
    l[u] = n[u];
  return new tt(l, this._parents);
}
function u1() {
  for (var e = this._groups, t = -1, n = e.length; ++t < n; )
    for (var r = e[t], o = r.length - 1, i = r[o], s; --o >= 0; )
      (s = r[o]) && (i && s.compareDocumentPosition(i) ^ 4 && i.parentNode.insertBefore(s, i), i = s);
  return this;
}
function a1(e) {
  e || (e = c1);
  function t(f, d) {
    return f && d ? e(f.__data__, d.__data__) : !f - !d;
  }
  for (var n = this._groups, r = n.length, o = new Array(r), i = 0; i < r; ++i) {
    for (var s = n[i], l = s.length, u = o[i] = new Array(l), a, c = 0; c < l; ++c)
      (a = s[c]) && (u[c] = a);
    u.sort(t);
  }
  return new tt(o, this._parents).order();
}
function c1(e, t) {
  return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function f1() {
  var e = arguments[0];
  return arguments[0] = this, e.apply(null, arguments), this;
}
function d1() {
  return Array.from(this);
}
function p1() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length; o < i; ++o) {
      var s = r[o];
      if (s) return s;
    }
  return null;
}
function h1() {
  let e = 0;
  for (const t of this) ++e;
  return e;
}
function m1() {
  return !this.node();
}
function g1(e) {
  for (var t = this._groups, n = 0, r = t.length; n < r; ++n)
    for (var o = t[n], i = 0, s = o.length, l; i < s; ++i)
      (l = o[i]) && e.call(l, l.__data__, i, o);
  return this;
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
function w1(e, t) {
  return function() {
    this.setAttribute(e, t);
  };
}
function x1(e, t) {
  return function() {
    this.setAttributeNS(e.space, e.local, t);
  };
}
function _1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttribute(e) : this.setAttribute(e, n);
  };
}
function S1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? this.removeAttributeNS(e.space, e.local) : this.setAttributeNS(e.space, e.local, n);
  };
}
function k1(e, t) {
  var n = bs(e);
  if (arguments.length < 2) {
    var r = this.node();
    return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n);
  }
  return this.each((t == null ? n.local ? v1 : y1 : typeof t == "function" ? n.local ? S1 : _1 : n.local ? x1 : w1)(n, t));
}
function Ih(e) {
  return e.ownerDocument && e.ownerDocument.defaultView || e.document && e || e.defaultView;
}
function E1(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function N1(e, t, n) {
  return function() {
    this.style.setProperty(e, t, n);
  };
}
function C1(e, t, n) {
  return function() {
    var r = t.apply(this, arguments);
    r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n);
  };
}
function M1(e, t, n) {
  return arguments.length > 1 ? this.each((t == null ? E1 : typeof t == "function" ? C1 : N1)(e, t, n ?? "")) : Or(this.node(), e);
}
function Or(e, t) {
  return e.style.getPropertyValue(t) || Ih(e).getComputedStyle(e, null).getPropertyValue(t);
}
function P1(e) {
  return function() {
    delete this[e];
  };
}
function z1(e, t) {
  return function() {
    this[e] = t;
  };
}
function T1(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    n == null ? delete this[e] : this[e] = n;
  };
}
function j1(e, t) {
  return arguments.length > 1 ? this.each((t == null ? P1 : typeof t == "function" ? T1 : z1)(e, t)) : this.node()[e];
}
function Dh(e) {
  return e.trim().split(/^|\s+/);
}
function Ha(e) {
  return e.classList || new Lh(e);
}
function Lh(e) {
  this._node = e, this._names = Dh(e.getAttribute("class") || "");
}
Lh.prototype = {
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
function Oh(e, t) {
  for (var n = Ha(e), r = -1, o = t.length; ++r < o; ) n.add(t[r]);
}
function Fh(e, t) {
  for (var n = Ha(e), r = -1, o = t.length; ++r < o; ) n.remove(t[r]);
}
function R1(e) {
  return function() {
    Oh(this, e);
  };
}
function $1(e) {
  return function() {
    Fh(this, e);
  };
}
function A1(e, t) {
  return function() {
    (t.apply(this, arguments) ? Oh : Fh)(this, e);
  };
}
function I1(e, t) {
  var n = Dh(e + "");
  if (arguments.length < 2) {
    for (var r = Ha(this.node()), o = -1, i = n.length; ++o < i; ) if (!r.contains(n[o])) return !1;
    return !0;
  }
  return this.each((typeof t == "function" ? A1 : t ? R1 : $1)(n, t));
}
function D1() {
  this.textContent = "";
}
function L1(e) {
  return function() {
    this.textContent = e;
  };
}
function O1(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.textContent = t ?? "";
  };
}
function F1(e) {
  return arguments.length ? this.each(e == null ? D1 : (typeof e == "function" ? O1 : L1)(e)) : this.node().textContent;
}
function H1() {
  this.innerHTML = "";
}
function V1(e) {
  return function() {
    this.innerHTML = e;
  };
}
function B1(e) {
  return function() {
    var t = e.apply(this, arguments);
    this.innerHTML = t ?? "";
  };
}
function b1(e) {
  return arguments.length ? this.each(e == null ? H1 : (typeof e == "function" ? B1 : V1)(e)) : this.node().innerHTML;
}
function U1() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function W1() {
  return this.each(U1);
}
function Y1() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function X1() {
  return this.each(Y1);
}
function K1(e) {
  var t = typeof e == "function" ? e : Th(e);
  return this.select(function() {
    return this.appendChild(t.apply(this, arguments));
  });
}
function G1() {
  return null;
}
function Q1(e, t) {
  var n = typeof e == "function" ? e : Th(e), r = t == null ? G1 : typeof t == "function" ? t : Fa(t);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), r.apply(this, arguments) || null);
  });
}
function Z1() {
  var e = this.parentNode;
  e && e.removeChild(this);
}
function q1() {
  return this.each(Z1);
}
function J1() {
  var e = this.cloneNode(!1), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function ew() {
  var e = this.cloneNode(!0), t = this.parentNode;
  return t ? t.insertBefore(e, this.nextSibling) : e;
}
function tw(e) {
  return this.select(e ? ew : J1);
}
function nw(e) {
  return arguments.length ? this.property("__data__", e) : this.node().__data__;
}
function rw(e) {
  return function(t) {
    e.call(this, t, this.__data__);
  };
}
function ow(e) {
  return e.trim().split(/^|\s+/).map(function(t) {
    var n = "", r = t.indexOf(".");
    return r >= 0 && (n = t.slice(r + 1), t = t.slice(0, r)), { type: t, name: n };
  });
}
function iw(e) {
  return function() {
    var t = this.__on;
    if (t) {
      for (var n = 0, r = -1, o = t.length, i; n < o; ++n)
        i = t[n], (!e.type || i.type === e.type) && i.name === e.name ? this.removeEventListener(i.type, i.listener, i.options) : t[++r] = i;
      ++r ? t.length = r : delete this.__on;
    }
  };
}
function sw(e, t, n) {
  return function() {
    var r = this.__on, o, i = rw(t);
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
function lw(e, t, n) {
  var r = ow(e + ""), o, i = r.length, s;
  if (arguments.length < 2) {
    var l = this.node().__on;
    if (l) {
      for (var u = 0, a = l.length, c; u < a; ++u)
        for (o = 0, c = l[u]; o < i; ++o)
          if ((s = r[o]).type === c.type && s.name === c.name)
            return c.value;
    }
    return;
  }
  for (l = t ? sw : iw, o = 0; o < i; ++o) this.each(l(r[o], t, n));
  return this;
}
function Hh(e, t, n) {
  var r = Ih(e), o = r.CustomEvent;
  typeof o == "function" ? o = new o(t, n) : (o = r.document.createEvent("Event"), n ? (o.initEvent(t, n.bubbles, n.cancelable), o.detail = n.detail) : o.initEvent(t, !1, !1)), e.dispatchEvent(o);
}
function uw(e, t) {
  return function() {
    return Hh(this, e, t);
  };
}
function aw(e, t) {
  return function() {
    return Hh(this, e, t.apply(this, arguments));
  };
}
function cw(e, t) {
  return this.each((typeof t == "function" ? aw : uw)(e, t));
}
function* fw() {
  for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
    for (var r = e[t], o = 0, i = r.length, s; o < i; ++o)
      (s = r[o]) && (yield s);
}
var Vh = [null];
function tt(e, t) {
  this._groups = e, this._parents = t;
}
function ti() {
  return new tt([[document.documentElement]], Vh);
}
function dw() {
  return this;
}
tt.prototype = ti.prototype = {
  constructor: tt,
  select: Ov,
  selectAll: Bv,
  selectChild: Yv,
  selectChildren: Qv,
  filter: Zv,
  data: r1,
  enter: qv,
  exit: i1,
  join: s1,
  merge: l1,
  selection: dw,
  order: u1,
  sort: a1,
  call: f1,
  nodes: d1,
  node: p1,
  size: h1,
  empty: m1,
  each: g1,
  attr: k1,
  style: M1,
  property: j1,
  classed: I1,
  text: F1,
  html: b1,
  raise: W1,
  lower: X1,
  append: K1,
  insert: Q1,
  remove: q1,
  clone: tw,
  datum: nw,
  on: lw,
  dispatch: cw,
  [Symbol.iterator]: fw
};
function st(e) {
  return typeof e == "string" ? new tt([[document.querySelector(e)]], [document.documentElement]) : new tt([[e]], Vh);
}
function pw(e) {
  let t;
  for (; t = e.sourceEvent; ) e = t;
  return e;
}
function yt(e, t) {
  if (e = pw(e), t === void 0 && (t = e.currentTarget), t) {
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
const hw = { passive: !1 }, Bo = { capture: !0, passive: !1 };
function Nl(e) {
  e.stopImmediatePropagation();
}
function Mr(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function Bh(e) {
  var t = e.document.documentElement, n = st(e).on("dragstart.drag", Mr, Bo);
  "onselectstart" in t ? n.on("selectstart.drag", Mr, Bo) : (t.__noselect = t.style.MozUserSelect, t.style.MozUserSelect = "none");
}
function bh(e, t) {
  var n = e.document.documentElement, r = st(e).on("dragstart.drag", null);
  t && (r.on("click.drag", Mr, Bo), setTimeout(function() {
    r.on("click.drag", null);
  }, 0)), "onselectstart" in n ? r.on("selectstart.drag", null) : (n.style.MozUserSelect = n.__noselect, delete n.__noselect);
}
const _i = (e) => () => e;
function zu(e, {
  sourceEvent: t,
  subject: n,
  target: r,
  identifier: o,
  active: i,
  x: s,
  y: l,
  dx: u,
  dy: a,
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
    dx: { value: u, enumerable: !0, configurable: !0 },
    dy: { value: a, enumerable: !0, configurable: !0 },
    _: { value: c }
  });
}
zu.prototype.on = function() {
  var e = this._.on.apply(this._, arguments);
  return e === this._ ? this : e;
};
function mw(e) {
  return !e.ctrlKey && !e.button;
}
function gw() {
  return this.parentNode;
}
function yw(e, t) {
  return t ?? { x: e.x, y: e.y };
}
function vw() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function ww() {
  var e = mw, t = gw, n = yw, r = vw, o = {}, i = Bs("start", "drag", "end"), s = 0, l, u, a, c, f = 0;
  function d(v) {
    v.on("mousedown.drag", m).filter(r).on("touchstart.drag", k).on("touchmove.drag", p, hw).on("touchend.drag touchcancel.drag", h).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  function m(v, C) {
    if (!(c || !e.call(this, v, C))) {
      var z = g(this, t.call(this, v, C), v, C, "mouse");
      z && (st(v.view).on("mousemove.drag", w, Bo).on("mouseup.drag", y, Bo), Bh(v.view), Nl(v), a = !1, l = v.clientX, u = v.clientY, z("start", v));
    }
  }
  function w(v) {
    if (Mr(v), !a) {
      var C = v.clientX - l, z = v.clientY - u;
      a = C * C + z * z > f;
    }
    o.mouse("drag", v);
  }
  function y(v) {
    st(v.view).on("mousemove.drag mouseup.drag", null), bh(v.view, a), Mr(v), o.mouse("end", v);
  }
  function k(v, C) {
    if (e.call(this, v, C)) {
      var z = v.changedTouches, j = t.call(this, v, C), T = z.length, S, N;
      for (S = 0; S < T; ++S)
        (N = g(this, j, v, C, z[S].identifier, z[S])) && (Nl(v), N("start", v, z[S]));
    }
  }
  function p(v) {
    var C = v.changedTouches, z = C.length, j, T;
    for (j = 0; j < z; ++j)
      (T = o[C[j].identifier]) && (Mr(v), T("drag", v, C[j]));
  }
  function h(v) {
    var C = v.changedTouches, z = C.length, j, T;
    for (c && clearTimeout(c), c = setTimeout(function() {
      c = null;
    }, 500), j = 0; j < z; ++j)
      (T = o[C[j].identifier]) && (Nl(v), T("end", v, C[j]));
  }
  function g(v, C, z, j, T, S) {
    var N = i.copy(), L = yt(S || z, C), D, V, _;
    if ((_ = n.call(v, new zu("beforestart", {
      sourceEvent: z,
      target: d,
      identifier: T,
      active: s,
      x: L[0],
      y: L[1],
      dx: 0,
      dy: 0,
      dispatch: N
    }), j)) != null)
      return D = _.x - L[0] || 0, V = _.y - L[1] || 0, function $(M, O, R) {
        var E = L, A;
        switch (M) {
          case "start":
            o[T] = $, A = s++;
            break;
          case "end":
            delete o[T], --s;
          case "drag":
            L = yt(R || O, C), A = s;
            break;
        }
        N.call(
          M,
          v,
          new zu(M, {
            sourceEvent: O,
            subject: _,
            target: d,
            identifier: T,
            active: A,
            x: L[0] + D,
            y: L[1] + V,
            dx: L[0] - E[0],
            dy: L[1] - E[1],
            dispatch: N
          }),
          j
        );
      };
  }
  return d.filter = function(v) {
    return arguments.length ? (e = typeof v == "function" ? v : _i(!!v), d) : e;
  }, d.container = function(v) {
    return arguments.length ? (t = typeof v == "function" ? v : _i(v), d) : t;
  }, d.subject = function(v) {
    return arguments.length ? (n = typeof v == "function" ? v : _i(v), d) : n;
  }, d.touchable = function(v) {
    return arguments.length ? (r = typeof v == "function" ? v : _i(!!v), d) : r;
  }, d.on = function() {
    var v = i.on.apply(i, arguments);
    return v === i ? d : v;
  }, d.clickDistance = function(v) {
    return arguments.length ? (f = (v = +v) * v, d) : Math.sqrt(f);
  }, d;
}
function Va(e, t, n) {
  e.prototype = t.prototype = n, n.constructor = e;
}
function Uh(e, t) {
  var n = Object.create(e.prototype);
  for (var r in t) n[r] = t[r];
  return n;
}
function ni() {
}
var bo = 0.7, ys = 1 / bo, Pr = "\\s*([+-]?\\d+)\\s*", Uo = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", jt = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", xw = /^#([0-9a-f]{3,8})$/, _w = new RegExp(`^rgb\\(${Pr},${Pr},${Pr}\\)$`), Sw = new RegExp(`^rgb\\(${jt},${jt},${jt}\\)$`), kw = new RegExp(`^rgba\\(${Pr},${Pr},${Pr},${Uo}\\)$`), Ew = new RegExp(`^rgba\\(${jt},${jt},${jt},${Uo}\\)$`), Nw = new RegExp(`^hsl\\(${Uo},${jt},${jt}\\)$`), Cw = new RegExp(`^hsla\\(${Uo},${jt},${jt},${Uo}\\)$`), _f = {
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
Va(ni, Wo, {
  copy(e) {
    return Object.assign(new this.constructor(), this, e);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: Sf,
  // Deprecated! Use color.formatHex.
  formatHex: Sf,
  formatHex8: Mw,
  formatHsl: Pw,
  formatRgb: kf,
  toString: kf
});
function Sf() {
  return this.rgb().formatHex();
}
function Mw() {
  return this.rgb().formatHex8();
}
function Pw() {
  return Wh(this).formatHsl();
}
function kf() {
  return this.rgb().formatRgb();
}
function Wo(e) {
  var t, n;
  return e = (e + "").trim().toLowerCase(), (t = xw.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? Ef(t) : n === 3 ? new Ye(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? Si(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? Si(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = _w.exec(e)) ? new Ye(t[1], t[2], t[3], 1) : (t = Sw.exec(e)) ? new Ye(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = kw.exec(e)) ? Si(t[1], t[2], t[3], t[4]) : (t = Ew.exec(e)) ? Si(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Nw.exec(e)) ? Mf(t[1], t[2] / 100, t[3] / 100, 1) : (t = Cw.exec(e)) ? Mf(t[1], t[2] / 100, t[3] / 100, t[4]) : _f.hasOwnProperty(e) ? Ef(_f[e]) : e === "transparent" ? new Ye(NaN, NaN, NaN, 0) : null;
}
function Ef(e) {
  return new Ye(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function Si(e, t, n, r) {
  return r <= 0 && (e = t = n = NaN), new Ye(e, t, n, r);
}
function zw(e) {
  return e instanceof ni || (e = Wo(e)), e ? (e = e.rgb(), new Ye(e.r, e.g, e.b, e.opacity)) : new Ye();
}
function Tu(e, t, n, r) {
  return arguments.length === 1 ? zw(e) : new Ye(e, t, n, r ?? 1);
}
function Ye(e, t, n, r) {
  this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
Va(Ye, Tu, Uh(ni, {
  brighter(e) {
    return e = e == null ? ys : Math.pow(ys, e), new Ye(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? bo : Math.pow(bo, e), new Ye(this.r * e, this.g * e, this.b * e, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Ye(Vn(this.r), Vn(this.g), Vn(this.b), vs(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: Nf,
  // Deprecated! Use color.formatHex.
  formatHex: Nf,
  formatHex8: Tw,
  formatRgb: Cf,
  toString: Cf
}));
function Nf() {
  return `#${Ln(this.r)}${Ln(this.g)}${Ln(this.b)}`;
}
function Tw() {
  return `#${Ln(this.r)}${Ln(this.g)}${Ln(this.b)}${Ln((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function Cf() {
  const e = vs(this.opacity);
  return `${e === 1 ? "rgb(" : "rgba("}${Vn(this.r)}, ${Vn(this.g)}, ${Vn(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function vs(e) {
  return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function Vn(e) {
  return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function Ln(e) {
  return e = Vn(e), (e < 16 ? "0" : "") + e.toString(16);
}
function Mf(e, t, n, r) {
  return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new wt(e, t, n, r);
}
function Wh(e) {
  if (e instanceof wt) return new wt(e.h, e.s, e.l, e.opacity);
  if (e instanceof ni || (e = Wo(e)), !e) return new wt();
  if (e instanceof wt) return e;
  e = e.rgb();
  var t = e.r / 255, n = e.g / 255, r = e.b / 255, o = Math.min(t, n, r), i = Math.max(t, n, r), s = NaN, l = i - o, u = (i + o) / 2;
  return l ? (t === i ? s = (n - r) / l + (n < r) * 6 : n === i ? s = (r - t) / l + 2 : s = (t - n) / l + 4, l /= u < 0.5 ? i + o : 2 - i - o, s *= 60) : l = u > 0 && u < 1 ? 0 : s, new wt(s, l, u, e.opacity);
}
function jw(e, t, n, r) {
  return arguments.length === 1 ? Wh(e) : new wt(e, t, n, r ?? 1);
}
function wt(e, t, n, r) {
  this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
Va(wt, jw, Uh(ni, {
  brighter(e) {
    return e = e == null ? ys : Math.pow(ys, e), new wt(this.h, this.s, this.l * e, this.opacity);
  },
  darker(e) {
    return e = e == null ? bo : Math.pow(bo, e), new wt(this.h, this.s, this.l * e, this.opacity);
  },
  rgb() {
    var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < 0.5 ? n : 1 - n) * t, o = 2 * n - r;
    return new Ye(
      Cl(e >= 240 ? e - 240 : e + 120, o, r),
      Cl(e, o, r),
      Cl(e < 120 ? e + 240 : e - 120, o, r),
      this.opacity
    );
  },
  clamp() {
    return new wt(Pf(this.h), ki(this.s), ki(this.l), vs(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const e = vs(this.opacity);
    return `${e === 1 ? "hsl(" : "hsla("}${Pf(this.h)}, ${ki(this.s) * 100}%, ${ki(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
  }
}));
function Pf(e) {
  return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function ki(e) {
  return Math.max(0, Math.min(1, e || 0));
}
function Cl(e, t, n) {
  return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
const Yh = (e) => () => e;
function Rw(e, t) {
  return function(n) {
    return e + n * t;
  };
}
function $w(e, t, n) {
  return e = Math.pow(e, n), t = Math.pow(t, n) - e, n = 1 / n, function(r) {
    return Math.pow(e + r * t, n);
  };
}
function Aw(e) {
  return (e = +e) == 1 ? Xh : function(t, n) {
    return n - t ? $w(t, n, e) : Yh(isNaN(t) ? n : t);
  };
}
function Xh(e, t) {
  var n = t - e;
  return n ? Rw(e, n) : Yh(isNaN(e) ? t : e);
}
const zf = function e(t) {
  var n = Aw(t);
  function r(o, i) {
    var s = n((o = Tu(o)).r, (i = Tu(i)).r), l = n(o.g, i.g), u = n(o.b, i.b), a = Xh(o.opacity, i.opacity);
    return function(c) {
      return o.r = s(c), o.g = l(c), o.b = u(c), o.opacity = a(c), o + "";
    };
  }
  return r.gamma = e, r;
}(1);
function nn(e, t) {
  return e = +e, t = +t, function(n) {
    return e * (1 - n) + t * n;
  };
}
var ju = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Ml = new RegExp(ju.source, "g");
function Iw(e) {
  return function() {
    return e;
  };
}
function Dw(e) {
  return function(t) {
    return e(t) + "";
  };
}
function Lw(e, t) {
  var n = ju.lastIndex = Ml.lastIndex = 0, r, o, i, s = -1, l = [], u = [];
  for (e = e + "", t = t + ""; (r = ju.exec(e)) && (o = Ml.exec(t)); )
    (i = o.index) > n && (i = t.slice(n, i), l[s] ? l[s] += i : l[++s] = i), (r = r[0]) === (o = o[0]) ? l[s] ? l[s] += o : l[++s] = o : (l[++s] = null, u.push({ i: s, x: nn(r, o) })), n = Ml.lastIndex;
  return n < t.length && (i = t.slice(n), l[s] ? l[s] += i : l[++s] = i), l.length < 2 ? u[0] ? Dw(u[0].x) : Iw(t) : (t = u.length, function(a) {
    for (var c = 0, f; c < t; ++c) l[(f = u[c]).i] = f.x(a);
    return l.join("");
  });
}
var Tf = 180 / Math.PI, Ru = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function Kh(e, t, n, r, o, i) {
  var s, l, u;
  return (s = Math.sqrt(e * e + t * t)) && (e /= s, t /= s), (u = e * n + t * r) && (n -= e * u, r -= t * u), (l = Math.sqrt(n * n + r * r)) && (n /= l, r /= l, u /= l), e * r < t * n && (e = -e, t = -t, u = -u, s = -s), {
    translateX: o,
    translateY: i,
    rotate: Math.atan2(t, e) * Tf,
    skewX: Math.atan(u) * Tf,
    scaleX: s,
    scaleY: l
  };
}
var Ei;
function Ow(e) {
  const t = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(e + "");
  return t.isIdentity ? Ru : Kh(t.a, t.b, t.c, t.d, t.e, t.f);
}
function Fw(e) {
  return e == null || (Ei || (Ei = document.createElementNS("http://www.w3.org/2000/svg", "g")), Ei.setAttribute("transform", e), !(e = Ei.transform.baseVal.consolidate())) ? Ru : (e = e.matrix, Kh(e.a, e.b, e.c, e.d, e.e, e.f));
}
function Gh(e, t, n, r) {
  function o(a) {
    return a.length ? a.pop() + " " : "";
  }
  function i(a, c, f, d, m, w) {
    if (a !== f || c !== d) {
      var y = m.push("translate(", null, t, null, n);
      w.push({ i: y - 4, x: nn(a, f) }, { i: y - 2, x: nn(c, d) });
    } else (f || d) && m.push("translate(" + f + t + d + n);
  }
  function s(a, c, f, d) {
    a !== c ? (a - c > 180 ? c += 360 : c - a > 180 && (a += 360), d.push({ i: f.push(o(f) + "rotate(", null, r) - 2, x: nn(a, c) })) : c && f.push(o(f) + "rotate(" + c + r);
  }
  function l(a, c, f, d) {
    a !== c ? d.push({ i: f.push(o(f) + "skewX(", null, r) - 2, x: nn(a, c) }) : c && f.push(o(f) + "skewX(" + c + r);
  }
  function u(a, c, f, d, m, w) {
    if (a !== f || c !== d) {
      var y = m.push(o(m) + "scale(", null, ",", null, ")");
      w.push({ i: y - 4, x: nn(a, f) }, { i: y - 2, x: nn(c, d) });
    } else (f !== 1 || d !== 1) && m.push(o(m) + "scale(" + f + "," + d + ")");
  }
  return function(a, c) {
    var f = [], d = [];
    return a = e(a), c = e(c), i(a.translateX, a.translateY, c.translateX, c.translateY, f, d), s(a.rotate, c.rotate, f, d), l(a.skewX, c.skewX, f, d), u(a.scaleX, a.scaleY, c.scaleX, c.scaleY, f, d), a = c = null, function(m) {
      for (var w = -1, y = d.length, k; ++w < y; ) f[(k = d[w]).i] = k.x(m);
      return f.join("");
    };
  };
}
var Hw = Gh(Ow, "px, ", "px)", "deg)"), Vw = Gh(Fw, ", ", ")", ")"), Bw = 1e-12;
function jf(e) {
  return ((e = Math.exp(e)) + 1 / e) / 2;
}
function bw(e) {
  return ((e = Math.exp(e)) - 1 / e) / 2;
}
function Uw(e) {
  return ((e = Math.exp(2 * e)) - 1) / (e + 1);
}
const Ww = function e(t, n, r) {
  function o(i, s) {
    var l = i[0], u = i[1], a = i[2], c = s[0], f = s[1], d = s[2], m = c - l, w = f - u, y = m * m + w * w, k, p;
    if (y < Bw)
      p = Math.log(d / a) / t, k = function(j) {
        return [
          l + j * m,
          u + j * w,
          a * Math.exp(t * j * p)
        ];
      };
    else {
      var h = Math.sqrt(y), g = (d * d - a * a + r * y) / (2 * a * n * h), v = (d * d - a * a - r * y) / (2 * d * n * h), C = Math.log(Math.sqrt(g * g + 1) - g), z = Math.log(Math.sqrt(v * v + 1) - v);
      p = (z - C) / t, k = function(j) {
        var T = j * p, S = jf(C), N = a / (n * h) * (S * Uw(t * T + C) - bw(C));
        return [
          l + N * m,
          u + N * w,
          a * S / jf(t * T + C)
        ];
      };
    }
    return k.duration = p * 1e3 * t / Math.SQRT2, k;
  }
  return o.rho = function(i) {
    var s = Math.max(1e-3, +i), l = s * s, u = l * l;
    return e(s, l, u);
  }, o;
}(Math.SQRT2, 2, 4);
var Fr = 0, po = 0, ro = 0, Qh = 1e3, ws, ho, xs = 0, Kn = 0, Us = 0, Yo = typeof performance == "object" && performance.now ? performance : Date, Zh = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(e) {
  setTimeout(e, 17);
};
function Ba() {
  return Kn || (Zh(Yw), Kn = Yo.now() + Us);
}
function Yw() {
  Kn = 0;
}
function _s() {
  this._call = this._time = this._next = null;
}
_s.prototype = qh.prototype = {
  constructor: _s,
  restart: function(e, t, n) {
    if (typeof e != "function") throw new TypeError("callback is not a function");
    n = (n == null ? Ba() : +n) + (t == null ? 0 : +t), !this._next && ho !== this && (ho ? ho._next = this : ws = this, ho = this), this._call = e, this._time = n, $u();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, $u());
  }
};
function qh(e, t, n) {
  var r = new _s();
  return r.restart(e, t, n), r;
}
function Xw() {
  Ba(), ++Fr;
  for (var e = ws, t; e; )
    (t = Kn - e._time) >= 0 && e._call.call(void 0, t), e = e._next;
  --Fr;
}
function Rf() {
  Kn = (xs = Yo.now()) + Us, Fr = po = 0;
  try {
    Xw();
  } finally {
    Fr = 0, Gw(), Kn = 0;
  }
}
function Kw() {
  var e = Yo.now(), t = e - xs;
  t > Qh && (Us -= t, xs = e);
}
function Gw() {
  for (var e, t = ws, n, r = 1 / 0; t; )
    t._call ? (r > t._time && (r = t._time), e = t, t = t._next) : (n = t._next, t._next = null, t = e ? e._next = n : ws = n);
  ho = e, $u(r);
}
function $u(e) {
  if (!Fr) {
    po && (po = clearTimeout(po));
    var t = e - Kn;
    t > 24 ? (e < 1 / 0 && (po = setTimeout(Rf, e - Yo.now() - Us)), ro && (ro = clearInterval(ro))) : (ro || (xs = Yo.now(), ro = setInterval(Kw, Qh)), Fr = 1, Zh(Rf));
  }
}
function $f(e, t, n) {
  var r = new _s();
  return t = t == null ? 0 : +t, r.restart((o) => {
    r.stop(), e(o + t);
  }, t, n), r;
}
var Qw = Bs("start", "end", "cancel", "interrupt"), Zw = [], Jh = 0, Af = 1, Au = 2, bi = 3, If = 4, Iu = 5, Ui = 6;
function Ws(e, t, n, r, o, i) {
  var s = e.__transition;
  if (!s) e.__transition = {};
  else if (n in s) return;
  qw(e, n, {
    name: t,
    index: r,
    // For context during callback.
    group: o,
    // For context during callback.
    on: Qw,
    tween: Zw,
    time: i.time,
    delay: i.delay,
    duration: i.duration,
    ease: i.ease,
    timer: null,
    state: Jh
  });
}
function ba(e, t) {
  var n = kt(e, t);
  if (n.state > Jh) throw new Error("too late; already scheduled");
  return n;
}
function Rt(e, t) {
  var n = kt(e, t);
  if (n.state > bi) throw new Error("too late; already running");
  return n;
}
function kt(e, t) {
  var n = e.__transition;
  if (!n || !(n = n[t])) throw new Error("transition not found");
  return n;
}
function qw(e, t, n) {
  var r = e.__transition, o;
  r[t] = n, n.timer = qh(i, 0, n.time);
  function i(a) {
    n.state = Af, n.timer.restart(s, n.delay, n.time), n.delay <= a && s(a - n.delay);
  }
  function s(a) {
    var c, f, d, m;
    if (n.state !== Af) return u();
    for (c in r)
      if (m = r[c], m.name === n.name) {
        if (m.state === bi) return $f(s);
        m.state === If ? (m.state = Ui, m.timer.stop(), m.on.call("interrupt", e, e.__data__, m.index, m.group), delete r[c]) : +c < t && (m.state = Ui, m.timer.stop(), m.on.call("cancel", e, e.__data__, m.index, m.group), delete r[c]);
      }
    if ($f(function() {
      n.state === bi && (n.state = If, n.timer.restart(l, n.delay, n.time), l(a));
    }), n.state = Au, n.on.call("start", e, e.__data__, n.index, n.group), n.state === Au) {
      for (n.state = bi, o = new Array(d = n.tween.length), c = 0, f = -1; c < d; ++c)
        (m = n.tween[c].value.call(e, e.__data__, n.index, n.group)) && (o[++f] = m);
      o.length = f + 1;
    }
  }
  function l(a) {
    for (var c = a < n.duration ? n.ease.call(null, a / n.duration) : (n.timer.restart(u), n.state = Iu, 1), f = -1, d = o.length; ++f < d; )
      o[f].call(e, c);
    n.state === Iu && (n.on.call("end", e, e.__data__, n.index, n.group), u());
  }
  function u() {
    n.state = Ui, n.timer.stop(), delete r[t];
    for (var a in r) return;
    delete e.__transition;
  }
}
function Wi(e, t) {
  var n = e.__transition, r, o, i = !0, s;
  if (n) {
    t = t == null ? null : t + "";
    for (s in n) {
      if ((r = n[s]).name !== t) {
        i = !1;
        continue;
      }
      o = r.state > Au && r.state < Iu, r.state = Ui, r.timer.stop(), r.on.call(o ? "interrupt" : "cancel", e, e.__data__, r.index, r.group), delete n[s];
    }
    i && delete e.__transition;
  }
}
function Jw(e) {
  return this.each(function() {
    Wi(this, e);
  });
}
function ex(e, t) {
  var n, r;
  return function() {
    var o = Rt(this, e), i = o.tween;
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
function tx(e, t, n) {
  var r, o;
  if (typeof n != "function") throw new Error();
  return function() {
    var i = Rt(this, e), s = i.tween;
    if (s !== r) {
      o = (r = s).slice();
      for (var l = { name: t, value: n }, u = 0, a = o.length; u < a; ++u)
        if (o[u].name === t) {
          o[u] = l;
          break;
        }
      u === a && o.push(l);
    }
    i.tween = o;
  };
}
function nx(e, t) {
  var n = this._id;
  if (e += "", arguments.length < 2) {
    for (var r = kt(this.node(), n).tween, o = 0, i = r.length, s; o < i; ++o)
      if ((s = r[o]).name === e)
        return s.value;
    return null;
  }
  return this.each((t == null ? ex : tx)(n, e, t));
}
function Ua(e, t, n) {
  var r = e._id;
  return e.each(function() {
    var o = Rt(this, r);
    (o.value || (o.value = {}))[t] = n.apply(this, arguments);
  }), function(o) {
    return kt(o, r).value[t];
  };
}
function em(e, t) {
  var n;
  return (typeof t == "number" ? nn : t instanceof Wo ? zf : (n = Wo(t)) ? (t = n, zf) : Lw)(e, t);
}
function rx(e) {
  return function() {
    this.removeAttribute(e);
  };
}
function ox(e) {
  return function() {
    this.removeAttributeNS(e.space, e.local);
  };
}
function ix(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttribute(e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function sx(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = this.getAttributeNS(e.space, e.local);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function lx(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), u;
    return l == null ? void this.removeAttribute(e) : (s = this.getAttribute(e), u = l + "", s === u ? null : s === r && u === o ? i : (o = u, i = t(r = s, l)));
  };
}
function ux(e, t, n) {
  var r, o, i;
  return function() {
    var s, l = n(this), u;
    return l == null ? void this.removeAttributeNS(e.space, e.local) : (s = this.getAttributeNS(e.space, e.local), u = l + "", s === u ? null : s === r && u === o ? i : (o = u, i = t(r = s, l)));
  };
}
function ax(e, t) {
  var n = bs(e), r = n === "transform" ? Vw : em;
  return this.attrTween(e, typeof t == "function" ? (n.local ? ux : lx)(n, r, Ua(this, "attr." + e, t)) : t == null ? (n.local ? ox : rx)(n) : (n.local ? sx : ix)(n, r, t));
}
function cx(e, t) {
  return function(n) {
    this.setAttribute(e, t.call(this, n));
  };
}
function fx(e, t) {
  return function(n) {
    this.setAttributeNS(e.space, e.local, t.call(this, n));
  };
}
function dx(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && fx(e, i)), n;
  }
  return o._value = t, o;
}
function px(e, t) {
  var n, r;
  function o() {
    var i = t.apply(this, arguments);
    return i !== r && (n = (r = i) && cx(e, i)), n;
  }
  return o._value = t, o;
}
function hx(e, t) {
  var n = "attr." + e;
  if (arguments.length < 2) return (n = this.tween(n)) && n._value;
  if (t == null) return this.tween(n, null);
  if (typeof t != "function") throw new Error();
  var r = bs(e);
  return this.tween(n, (r.local ? dx : px)(r, t));
}
function mx(e, t) {
  return function() {
    ba(this, e).delay = +t.apply(this, arguments);
  };
}
function gx(e, t) {
  return t = +t, function() {
    ba(this, e).delay = t;
  };
}
function yx(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? mx : gx)(t, e)) : kt(this.node(), t).delay;
}
function vx(e, t) {
  return function() {
    Rt(this, e).duration = +t.apply(this, arguments);
  };
}
function wx(e, t) {
  return t = +t, function() {
    Rt(this, e).duration = t;
  };
}
function xx(e) {
  var t = this._id;
  return arguments.length ? this.each((typeof e == "function" ? vx : wx)(t, e)) : kt(this.node(), t).duration;
}
function _x(e, t) {
  if (typeof t != "function") throw new Error();
  return function() {
    Rt(this, e).ease = t;
  };
}
function Sx(e) {
  var t = this._id;
  return arguments.length ? this.each(_x(t, e)) : kt(this.node(), t).ease;
}
function kx(e, t) {
  return function() {
    var n = t.apply(this, arguments);
    if (typeof n != "function") throw new Error();
    Rt(this, e).ease = n;
  };
}
function Ex(e) {
  if (typeof e != "function") throw new Error();
  return this.each(kx(this._id, e));
}
function Nx(e) {
  typeof e != "function" && (e = Rh(e));
  for (var t = this._groups, n = t.length, r = new Array(n), o = 0; o < n; ++o)
    for (var i = t[o], s = i.length, l = r[o] = [], u, a = 0; a < s; ++a)
      (u = i[a]) && e.call(u, u.__data__, a, i) && l.push(u);
  return new Kt(r, this._parents, this._name, this._id);
}
function Cx(e) {
  if (e._id !== this._id) throw new Error();
  for (var t = this._groups, n = e._groups, r = t.length, o = n.length, i = Math.min(r, o), s = new Array(r), l = 0; l < i; ++l)
    for (var u = t[l], a = n[l], c = u.length, f = s[l] = new Array(c), d, m = 0; m < c; ++m)
      (d = u[m] || a[m]) && (f[m] = d);
  for (; l < r; ++l)
    s[l] = t[l];
  return new Kt(s, this._parents, this._name, this._id);
}
function Mx(e) {
  return (e + "").trim().split(/^|\s+/).every(function(t) {
    var n = t.indexOf(".");
    return n >= 0 && (t = t.slice(0, n)), !t || t === "start";
  });
}
function Px(e, t, n) {
  var r, o, i = Mx(t) ? ba : Rt;
  return function() {
    var s = i(this, e), l = s.on;
    l !== r && (o = (r = l).copy()).on(t, n), s.on = o;
  };
}
function zx(e, t) {
  var n = this._id;
  return arguments.length < 2 ? kt(this.node(), n).on.on(e) : this.each(Px(n, e, t));
}
function Tx(e) {
  return function() {
    var t = this.parentNode;
    for (var n in this.__transition) if (+n !== e) return;
    t && t.removeChild(this);
  };
}
function jx() {
  return this.on("end.remove", Tx(this._id));
}
function Rx(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = Fa(e));
  for (var r = this._groups, o = r.length, i = new Array(o), s = 0; s < o; ++s)
    for (var l = r[s], u = l.length, a = i[s] = new Array(u), c, f, d = 0; d < u; ++d)
      (c = l[d]) && (f = e.call(c, c.__data__, d, l)) && ("__data__" in c && (f.__data__ = c.__data__), a[d] = f, Ws(a[d], t, n, d, a, kt(c, n)));
  return new Kt(i, this._parents, t, n);
}
function $x(e) {
  var t = this._name, n = this._id;
  typeof e != "function" && (e = jh(e));
  for (var r = this._groups, o = r.length, i = [], s = [], l = 0; l < o; ++l)
    for (var u = r[l], a = u.length, c, f = 0; f < a; ++f)
      if (c = u[f]) {
        for (var d = e.call(c, c.__data__, f, u), m, w = kt(c, n), y = 0, k = d.length; y < k; ++y)
          (m = d[y]) && Ws(m, t, n, y, d, w);
        i.push(d), s.push(c);
      }
  return new Kt(i, s, t, n);
}
var Ax = ti.prototype.constructor;
function Ix() {
  return new Ax(this._groups, this._parents);
}
function Dx(e, t) {
  var n, r, o;
  return function() {
    var i = Or(this, e), s = (this.style.removeProperty(e), Or(this, e));
    return i === s ? null : i === n && s === r ? o : o = t(n = i, r = s);
  };
}
function tm(e) {
  return function() {
    this.style.removeProperty(e);
  };
}
function Lx(e, t, n) {
  var r, o = n + "", i;
  return function() {
    var s = Or(this, e);
    return s === o ? null : s === r ? i : i = t(r = s, n);
  };
}
function Ox(e, t, n) {
  var r, o, i;
  return function() {
    var s = Or(this, e), l = n(this), u = l + "";
    return l == null && (u = l = (this.style.removeProperty(e), Or(this, e))), s === u ? null : s === r && u === o ? i : (o = u, i = t(r = s, l));
  };
}
function Fx(e, t) {
  var n, r, o, i = "style." + t, s = "end." + i, l;
  return function() {
    var u = Rt(this, e), a = u.on, c = u.value[i] == null ? l || (l = tm(t)) : void 0;
    (a !== n || o !== c) && (r = (n = a).copy()).on(s, o = c), u.on = r;
  };
}
function Hx(e, t, n) {
  var r = (e += "") == "transform" ? Hw : em;
  return t == null ? this.styleTween(e, Dx(e, r)).on("end.style." + e, tm(e)) : typeof t == "function" ? this.styleTween(e, Ox(e, r, Ua(this, "style." + e, t))).each(Fx(this._id, e)) : this.styleTween(e, Lx(e, r, t), n).on("end.style." + e, null);
}
function Vx(e, t, n) {
  return function(r) {
    this.style.setProperty(e, t.call(this, r), n);
  };
}
function Bx(e, t, n) {
  var r, o;
  function i() {
    var s = t.apply(this, arguments);
    return s !== o && (r = (o = s) && Vx(e, s, n)), r;
  }
  return i._value = t, i;
}
function bx(e, t, n) {
  var r = "style." + (e += "");
  if (arguments.length < 2) return (r = this.tween(r)) && r._value;
  if (t == null) return this.tween(r, null);
  if (typeof t != "function") throw new Error();
  return this.tween(r, Bx(e, t, n ?? ""));
}
function Ux(e) {
  return function() {
    this.textContent = e;
  };
}
function Wx(e) {
  return function() {
    var t = e(this);
    this.textContent = t ?? "";
  };
}
function Yx(e) {
  return this.tween("text", typeof e == "function" ? Wx(Ua(this, "text", e)) : Ux(e == null ? "" : e + ""));
}
function Xx(e) {
  return function(t) {
    this.textContent = e.call(this, t);
  };
}
function Kx(e) {
  var t, n;
  function r() {
    var o = e.apply(this, arguments);
    return o !== n && (t = (n = o) && Xx(o)), t;
  }
  return r._value = e, r;
}
function Gx(e) {
  var t = "text";
  if (arguments.length < 1) return (t = this.tween(t)) && t._value;
  if (e == null) return this.tween(t, null);
  if (typeof e != "function") throw new Error();
  return this.tween(t, Kx(e));
}
function Qx() {
  for (var e = this._name, t = this._id, n = nm(), r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, u, a = 0; a < l; ++a)
      if (u = s[a]) {
        var c = kt(u, t);
        Ws(u, e, n, a, s, {
          time: c.time + c.delay + c.duration,
          delay: 0,
          duration: c.duration,
          ease: c.ease
        });
      }
  return new Kt(r, this._parents, e, n);
}
function Zx() {
  var e, t, n = this, r = n._id, o = n.size();
  return new Promise(function(i, s) {
    var l = { value: s }, u = { value: function() {
      --o === 0 && i();
    } };
    n.each(function() {
      var a = Rt(this, r), c = a.on;
      c !== e && (t = (e = c).copy(), t._.cancel.push(l), t._.interrupt.push(l), t._.end.push(u)), a.on = t;
    }), o === 0 && i();
  });
}
var qx = 0;
function Kt(e, t, n, r) {
  this._groups = e, this._parents = t, this._name = n, this._id = r;
}
function nm() {
  return ++qx;
}
var Dt = ti.prototype;
Kt.prototype = {
  constructor: Kt,
  select: Rx,
  selectAll: $x,
  selectChild: Dt.selectChild,
  selectChildren: Dt.selectChildren,
  filter: Nx,
  merge: Cx,
  selection: Ix,
  transition: Qx,
  call: Dt.call,
  nodes: Dt.nodes,
  node: Dt.node,
  size: Dt.size,
  empty: Dt.empty,
  each: Dt.each,
  on: zx,
  attr: ax,
  attrTween: hx,
  style: Hx,
  styleTween: bx,
  text: Yx,
  textTween: Gx,
  remove: jx,
  tween: nx,
  delay: yx,
  duration: xx,
  ease: Sx,
  easeVarying: Ex,
  end: Zx,
  [Symbol.iterator]: Dt[Symbol.iterator]
};
function Jx(e) {
  return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2;
}
var e_ = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: Jx
};
function t_(e, t) {
  for (var n; !(n = e.__transition) || !(n = n[t]); )
    if (!(e = e.parentNode))
      throw new Error(`transition ${t} not found`);
  return n;
}
function n_(e) {
  var t, n;
  e instanceof Kt ? (t = e._id, e = e._name) : (t = nm(), (n = e_).time = Ba(), e = e == null ? null : e + "");
  for (var r = this._groups, o = r.length, i = 0; i < o; ++i)
    for (var s = r[i], l = s.length, u, a = 0; a < l; ++a)
      (u = s[a]) && Ws(u, e, t, a, s, n || t_(u, t));
  return new Kt(r, this._parents, e, t);
}
ti.prototype.interrupt = Jw;
ti.prototype.transition = n_;
const Ni = (e) => () => e;
function r_(e, {
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
var bt = new Vt(1, 0, 0);
Vt.prototype;
function Pl(e) {
  e.stopImmediatePropagation();
}
function oo(e) {
  e.preventDefault(), e.stopImmediatePropagation();
}
function o_(e) {
  return (!e.ctrlKey || e.type === "wheel") && !e.button;
}
function i_() {
  var e = this;
  return e instanceof SVGElement ? (e = e.ownerSVGElement || e, e.hasAttribute("viewBox") ? (e = e.viewBox.baseVal, [[e.x, e.y], [e.x + e.width, e.y + e.height]]) : [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]]) : [[0, 0], [e.clientWidth, e.clientHeight]];
}
function Df() {
  return this.__zoom || bt;
}
function s_(e) {
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * (e.ctrlKey ? 10 : 1);
}
function l_() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function u_(e, t, n) {
  var r = e.invertX(t[0][0]) - n[0][0], o = e.invertX(t[1][0]) - n[1][0], i = e.invertY(t[0][1]) - n[0][1], s = e.invertY(t[1][1]) - n[1][1];
  return e.translate(
    o > r ? (r + o) / 2 : Math.min(0, r) || Math.max(0, o),
    s > i ? (i + s) / 2 : Math.min(0, i) || Math.max(0, s)
  );
}
function rm() {
  var e = o_, t = i_, n = u_, r = s_, o = l_, i = [0, 1 / 0], s = [[-1 / 0, -1 / 0], [1 / 0, 1 / 0]], l = 250, u = Ww, a = Bs("start", "zoom", "end"), c, f, d, m = 500, w = 150, y = 0, k = 10;
  function p(_) {
    _.property("__zoom", Df).on("wheel.zoom", T, { passive: !1 }).on("mousedown.zoom", S).on("dblclick.zoom", N).filter(o).on("touchstart.zoom", L).on("touchmove.zoom", D).on("touchend.zoom touchcancel.zoom", V).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  p.transform = function(_, $, M, O) {
    var R = _.selection ? _.selection() : _;
    R.property("__zoom", Df), _ !== R ? C(_, $, M, O) : R.interrupt().each(function() {
      z(this, arguments).event(O).start().zoom(null, typeof $ == "function" ? $.apply(this, arguments) : $).end();
    });
  }, p.scaleBy = function(_, $, M, O) {
    p.scaleTo(_, function() {
      var R = this.__zoom.k, E = typeof $ == "function" ? $.apply(this, arguments) : $;
      return R * E;
    }, M, O);
  }, p.scaleTo = function(_, $, M, O) {
    p.transform(_, function() {
      var R = t.apply(this, arguments), E = this.__zoom, A = M == null ? v(R) : typeof M == "function" ? M.apply(this, arguments) : M, F = E.invert(A), H = typeof $ == "function" ? $.apply(this, arguments) : $;
      return n(g(h(E, H), A, F), R, s);
    }, M, O);
  }, p.translateBy = function(_, $, M, O) {
    p.transform(_, function() {
      return n(this.__zoom.translate(
        typeof $ == "function" ? $.apply(this, arguments) : $,
        typeof M == "function" ? M.apply(this, arguments) : M
      ), t.apply(this, arguments), s);
    }, null, O);
  }, p.translateTo = function(_, $, M, O, R) {
    p.transform(_, function() {
      var E = t.apply(this, arguments), A = this.__zoom, F = O == null ? v(E) : typeof O == "function" ? O.apply(this, arguments) : O;
      return n(bt.translate(F[0], F[1]).scale(A.k).translate(
        typeof $ == "function" ? -$.apply(this, arguments) : -$,
        typeof M == "function" ? -M.apply(this, arguments) : -M
      ), E, s);
    }, O, R);
  };
  function h(_, $) {
    return $ = Math.max(i[0], Math.min(i[1], $)), $ === _.k ? _ : new Vt($, _.x, _.y);
  }
  function g(_, $, M) {
    var O = $[0] - M[0] * _.k, R = $[1] - M[1] * _.k;
    return O === _.x && R === _.y ? _ : new Vt(_.k, O, R);
  }
  function v(_) {
    return [(+_[0][0] + +_[1][0]) / 2, (+_[0][1] + +_[1][1]) / 2];
  }
  function C(_, $, M, O) {
    _.on("start.zoom", function() {
      z(this, arguments).event(O).start();
    }).on("interrupt.zoom end.zoom", function() {
      z(this, arguments).event(O).end();
    }).tween("zoom", function() {
      var R = this, E = arguments, A = z(R, E).event(O), F = t.apply(R, E), H = M == null ? v(F) : typeof M == "function" ? M.apply(R, E) : M, U = Math.max(F[1][0] - F[0][0], F[1][1] - F[0][1]), b = R.__zoom, Y = typeof $ == "function" ? $.apply(R, E) : $, Q = u(b.invert(H).concat(U / b.k), Y.invert(H).concat(U / Y.k));
      return function(Z) {
        if (Z === 1) Z = Y;
        else {
          var re = Q(Z), ne = U / re[2];
          Z = new Vt(ne, H[0] - re[0] * ne, H[1] - re[1] * ne);
        }
        A.zoom(null, Z);
      };
    });
  }
  function z(_, $, M) {
    return !M && _.__zooming || new j(_, $);
  }
  function j(_, $) {
    this.that = _, this.args = $, this.active = 0, this.sourceEvent = null, this.extent = t.apply(_, $), this.taps = 0;
  }
  j.prototype = {
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
      a.call(
        _,
        this.that,
        new r_(_, {
          sourceEvent: this.sourceEvent,
          target: p,
          transform: this.that.__zoom,
          dispatch: a
        }),
        $
      );
    }
  };
  function T(_, ...$) {
    if (!e.apply(this, arguments)) return;
    var M = z(this, $).event(_), O = this.__zoom, R = Math.max(i[0], Math.min(i[1], O.k * Math.pow(2, r.apply(this, arguments)))), E = yt(_);
    if (M.wheel)
      (M.mouse[0][0] !== E[0] || M.mouse[0][1] !== E[1]) && (M.mouse[1] = O.invert(M.mouse[0] = E)), clearTimeout(M.wheel);
    else {
      if (O.k === R) return;
      M.mouse = [E, O.invert(E)], Wi(this), M.start();
    }
    oo(_), M.wheel = setTimeout(A, w), M.zoom("mouse", n(g(h(O, R), M.mouse[0], M.mouse[1]), M.extent, s));
    function A() {
      M.wheel = null, M.end();
    }
  }
  function S(_, ...$) {
    if (d || !e.apply(this, arguments)) return;
    var M = _.currentTarget, O = z(this, $, !0).event(_), R = st(_.view).on("mousemove.zoom", H, !0).on("mouseup.zoom", U, !0), E = yt(_, M), A = _.clientX, F = _.clientY;
    Bh(_.view), Pl(_), O.mouse = [E, this.__zoom.invert(E)], Wi(this), O.start();
    function H(b) {
      if (oo(b), !O.moved) {
        var Y = b.clientX - A, Q = b.clientY - F;
        O.moved = Y * Y + Q * Q > y;
      }
      O.event(b).zoom("mouse", n(g(O.that.__zoom, O.mouse[0] = yt(b, M), O.mouse[1]), O.extent, s));
    }
    function U(b) {
      R.on("mousemove.zoom mouseup.zoom", null), bh(b.view, O.moved), oo(b), O.event(b).end();
    }
  }
  function N(_, ...$) {
    if (e.apply(this, arguments)) {
      var M = this.__zoom, O = yt(_.changedTouches ? _.changedTouches[0] : _, this), R = M.invert(O), E = M.k * (_.shiftKey ? 0.5 : 2), A = n(g(h(M, E), O, R), t.apply(this, $), s);
      oo(_), l > 0 ? st(this).transition().duration(l).call(C, A, O, _) : st(this).call(p.transform, A, O, _);
    }
  }
  function L(_, ...$) {
    if (e.apply(this, arguments)) {
      var M = _.touches, O = M.length, R = z(this, $, _.changedTouches.length === O).event(_), E, A, F, H;
      for (Pl(_), A = 0; A < O; ++A)
        F = M[A], H = yt(F, this), H = [H, this.__zoom.invert(H), F.identifier], R.touch0 ? !R.touch1 && R.touch0[2] !== H[2] && (R.touch1 = H, R.taps = 0) : (R.touch0 = H, E = !0, R.taps = 1 + !!c);
      c && (c = clearTimeout(c)), E && (R.taps < 2 && (f = H[0], c = setTimeout(function() {
        c = null;
      }, m)), Wi(this), R.start());
    }
  }
  function D(_, ...$) {
    if (this.__zooming) {
      var M = z(this, $).event(_), O = _.changedTouches, R = O.length, E, A, F, H;
      for (oo(_), E = 0; E < R; ++E)
        A = O[E], F = yt(A, this), M.touch0 && M.touch0[2] === A.identifier ? M.touch0[0] = F : M.touch1 && M.touch1[2] === A.identifier && (M.touch1[0] = F);
      if (A = M.that.__zoom, M.touch1) {
        var U = M.touch0[0], b = M.touch0[1], Y = M.touch1[0], Q = M.touch1[1], Z = (Z = Y[0] - U[0]) * Z + (Z = Y[1] - U[1]) * Z, re = (re = Q[0] - b[0]) * re + (re = Q[1] - b[1]) * re;
        A = h(A, Math.sqrt(Z / re)), F = [(U[0] + Y[0]) / 2, (U[1] + Y[1]) / 2], H = [(b[0] + Q[0]) / 2, (b[1] + Q[1]) / 2];
      } else if (M.touch0) F = M.touch0[0], H = M.touch0[1];
      else return;
      M.zoom("touch", n(g(A, F, H), M.extent, s));
    }
  }
  function V(_, ...$) {
    if (this.__zooming) {
      var M = z(this, $).event(_), O = _.changedTouches, R = O.length, E, A;
      for (Pl(_), d && clearTimeout(d), d = setTimeout(function() {
        d = null;
      }, m), E = 0; E < R; ++E)
        A = O[E], M.touch0 && M.touch0[2] === A.identifier ? delete M.touch0 : M.touch1 && M.touch1[2] === A.identifier && delete M.touch1;
      if (M.touch1 && !M.touch0 && (M.touch0 = M.touch1, delete M.touch1), M.touch0) M.touch0[1] = this.__zoom.invert(M.touch0[0]);
      else if (M.end(), M.taps === 2 && (A = yt(A, this), Math.hypot(f[0] - A[0], f[1] - A[1]) < k)) {
        var F = st(this).on("dblclick.zoom");
        F && F.apply(this, arguments);
      }
    }
  }
  return p.wheelDelta = function(_) {
    return arguments.length ? (r = typeof _ == "function" ? _ : Ni(+_), p) : r;
  }, p.filter = function(_) {
    return arguments.length ? (e = typeof _ == "function" ? _ : Ni(!!_), p) : e;
  }, p.touchable = function(_) {
    return arguments.length ? (o = typeof _ == "function" ? _ : Ni(!!_), p) : o;
  }, p.extent = function(_) {
    return arguments.length ? (t = typeof _ == "function" ? _ : Ni([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), p) : t;
  }, p.scaleExtent = function(_) {
    return arguments.length ? (i[0] = +_[0], i[1] = +_[1], p) : [i[0], i[1]];
  }, p.translateExtent = function(_) {
    return arguments.length ? (s[0][0] = +_[0][0], s[1][0] = +_[1][0], s[0][1] = +_[0][1], s[1][1] = +_[1][1], p) : [[s[0][0], s[0][1]], [s[1][0], s[1][1]]];
  }, p.constrain = function(_) {
    return arguments.length ? (n = _, p) : n;
  }, p.duration = function(_) {
    return arguments.length ? (l = +_, p) : l;
  }, p.interpolate = function(_) {
    return arguments.length ? (u = _, p) : u;
  }, p.on = function() {
    var _ = a.on.apply(a, arguments);
    return _ === a ? p : _;
  }, p.clickDistance = function(_) {
    return arguments.length ? (y = (_ = +_) * _, p) : Math.sqrt(y);
  }, p.tapDistance = function(_) {
    return arguments.length ? (k = +_, p) : k;
  }, p;
}
const Ys = P.createContext(null), a_ = Ys.Provider, Gt = {
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
}, om = Gt.error001();
function le(e, t) {
  const n = P.useContext(Ys);
  if (n === null)
    throw new Error(om);
  return zh(n, e, t);
}
const Se = () => {
  const e = P.useContext(Ys);
  if (e === null)
    throw new Error(om);
  return P.useMemo(() => ({
    getState: e.getState,
    setState: e.setState,
    subscribe: e.subscribe,
    destroy: e.destroy
  }), [e]);
}, c_ = (e) => e.userSelectionActive ? "none" : "all";
function Wa({ position: e, children: t, className: n, style: r, ...o }) {
  const i = le(c_), s = `${e}`.split("-");
  return I.createElement("div", { className: je(["react-flow__panel", n, ...s]), style: { ...r, pointerEvents: i }, ...o }, t);
}
function f_({ proOptions: e, position: t = "bottom-right" }) {
  return e != null && e.hideAttribution ? null : I.createElement(
    Wa,
    { position: t, className: "react-flow__attribution", "data-message": "Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/pro" },
    I.createElement("a", { href: "https://reactflow.dev", target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution" }, "React Flow")
  );
}
const d_ = ({ x: e, y: t, label: n, labelStyle: r = {}, labelShowBg: o = !0, labelBgStyle: i = {}, labelBgPadding: s = [2, 4], labelBgBorderRadius: l = 2, children: u, className: a, ...c }) => {
  const f = P.useRef(null), [d, m] = P.useState({ x: 0, y: 0, width: 0, height: 0 }), w = je(["react-flow__edge-textwrapper", a]);
  return P.useEffect(() => {
    if (f.current) {
      const y = f.current.getBBox();
      m({
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
    u
  );
};
var p_ = P.memo(d_);
const Ya = (e) => ({
  width: e.offsetWidth,
  height: e.offsetHeight
}), Hr = (e, t = 0, n = 1) => Math.min(Math.max(e, t), n), Xa = (e = { x: 0, y: 0 }, t) => ({
  x: Hr(e.x, t[0][0], t[1][0]),
  y: Hr(e.y, t[0][1], t[1][1])
}), Lf = (e, t, n) => e < t ? Hr(Math.abs(e - t), 1, 50) / 50 : e > n ? -Hr(Math.abs(e - n), 1, 50) / 50 : 0, im = (e, t) => {
  const n = Lf(e.x, 35, t.width - 35) * 20, r = Lf(e.y, 35, t.height - 35) * 20;
  return [n, r];
}, sm = (e) => {
  var t;
  return ((t = e.getRootNode) == null ? void 0 : t.call(e)) || (window == null ? void 0 : window.document);
}, lm = (e, t) => ({
  x: Math.min(e.x, t.x),
  y: Math.min(e.y, t.y),
  x2: Math.max(e.x2, t.x2),
  y2: Math.max(e.y2, t.y2)
}), Xo = ({ x: e, y: t, width: n, height: r }) => ({
  x: e,
  y: t,
  x2: e + n,
  y2: t + r
}), um = ({ x: e, y: t, x2: n, y2: r }) => ({
  x: e,
  y: t,
  width: n - e,
  height: r - t
}), Of = (e) => ({
  ...e.positionAbsolute || { x: 0, y: 0 },
  width: e.width || 0,
  height: e.height || 0
}), h_ = (e, t) => um(lm(Xo(e), Xo(t))), Du = (e, t) => {
  const n = Math.max(0, Math.min(e.x + e.width, t.x + t.width) - Math.max(e.x, t.x)), r = Math.max(0, Math.min(e.y + e.height, t.y + t.height) - Math.max(e.y, t.y));
  return Math.ceil(n * r);
}, m_ = (e) => ut(e.width) && ut(e.height) && ut(e.x) && ut(e.y), ut = (e) => !isNaN(e) && isFinite(e), me = Symbol.for("internals"), am = ["Enter", " ", "Escape"], g_ = (e, t) => {
}, y_ = (e) => "nativeEvent" in e;
function Lu(e) {
  var o, i;
  const t = y_(e) ? e.nativeEvent : e, n = ((i = (o = t.composedPath) == null ? void 0 : o.call(t)) == null ? void 0 : i[0]) || e.target;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(n == null ? void 0 : n.nodeName) || (n == null ? void 0 : n.hasAttribute("contenteditable")) || !!(n != null && n.closest(".nokey"));
}
const cm = (e) => "clientX" in e, vn = (e, t) => {
  var i, s;
  const n = cm(e), r = n ? e.clientX : (i = e.touches) == null ? void 0 : i[0].clientX, o = n ? e.clientY : (s = e.touches) == null ? void 0 : s[0].clientY;
  return {
    x: r - ((t == null ? void 0 : t.left) ?? 0),
    y: o - ((t == null ? void 0 : t.top) ?? 0)
  };
}, Ss = () => {
  var e;
  return typeof navigator < "u" && ((e = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : e.indexOf("Mac")) >= 0;
}, ri = ({ id: e, path: t, labelX: n, labelY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a, style: c, markerEnd: f, markerStart: d, interactionWidth: m = 20 }) => I.createElement(
  I.Fragment,
  null,
  I.createElement("path", { id: e, style: c, d: t, fill: "none", className: "react-flow__edge-path", markerEnd: f, markerStart: d }),
  m && I.createElement("path", { d: t, fill: "none", strokeOpacity: 0, strokeWidth: m, className: "react-flow__edge-interaction" }),
  o && ut(n) && ut(r) ? I.createElement(p_, { x: n, y: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a }) : null
);
ri.displayName = "BaseEdge";
function io(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().edges.find((i) => i.id === e);
    o && n(r, { ...o });
  };
}
function fm({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const o = Math.abs(n - e) / 2, i = n < e ? n + o : n - o, s = Math.abs(r - t) / 2, l = r < t ? r + s : r - s;
  return [i, l, o, s];
}
function dm({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourceControlX: o, sourceControlY: i, targetControlX: s, targetControlY: l }) {
  const u = e * 0.125 + o * 0.375 + s * 0.375 + n * 0.125, a = t * 0.125 + i * 0.375 + l * 0.375 + r * 0.125, c = Math.abs(u - e), f = Math.abs(a - t);
  return [u, a, c, f];
}
var Gn;
(function(e) {
  e.Strict = "strict", e.Loose = "loose";
})(Gn || (Gn = {}));
var On;
(function(e) {
  e.Free = "free", e.Vertical = "vertical", e.Horizontal = "horizontal";
})(On || (On = {}));
var Ko;
(function(e) {
  e.Partial = "partial", e.Full = "full";
})(Ko || (Ko = {}));
var ln;
(function(e) {
  e.Bezier = "default", e.Straight = "straight", e.Step = "step", e.SmoothStep = "smoothstep", e.SimpleBezier = "simplebezier";
})(ln || (ln = {}));
var ks;
(function(e) {
  e.Arrow = "arrow", e.ArrowClosed = "arrowclosed";
})(ks || (ks = {}));
var K;
(function(e) {
  e.Left = "left", e.Top = "top", e.Right = "right", e.Bottom = "bottom";
})(K || (K = {}));
function Ff({ pos: e, x1: t, y1: n, x2: r, y2: o }) {
  return e === K.Left || e === K.Right ? [0.5 * (t + r), n] : [t, 0.5 * (n + o)];
}
function pm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top }) {
  const [s, l] = Ff({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o
  }), [u, a] = Ff({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t
  }), [c, f, d, m] = dm({
    sourceX: e,
    sourceY: t,
    targetX: r,
    targetY: o,
    sourceControlX: s,
    sourceControlY: l,
    targetControlX: u,
    targetControlY: a
  });
  return [
    `M${e},${t} C${s},${l} ${u},${a} ${r},${o}`,
    c,
    f,
    d,
    m
  ];
}
const Ka = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: u, labelBgStyle: a, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: m, markerStart: w, interactionWidth: y }) => {
  const [k, p, h] = pm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i
  });
  return I.createElement(ri, { path: k, labelX: p, labelY: h, label: s, labelStyle: l, labelShowBg: u, labelBgStyle: a, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: m, markerStart: w, interactionWidth: y });
});
Ka.displayName = "SimpleBezierEdge";
const Hf = {
  [K.Left]: { x: -1, y: 0 },
  [K.Right]: { x: 1, y: 0 },
  [K.Top]: { x: 0, y: -1 },
  [K.Bottom]: { x: 0, y: 1 }
}, v_ = ({ source: e, sourcePosition: t = K.Bottom, target: n }) => t === K.Left || t === K.Right ? e.x < n.x ? { x: 1, y: 0 } : { x: -1, y: 0 } : e.y < n.y ? { x: 0, y: 1 } : { x: 0, y: -1 }, Vf = (e, t) => Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
function w_({ source: e, sourcePosition: t = K.Bottom, target: n, targetPosition: r = K.Top, center: o, offset: i }) {
  const s = Hf[t], l = Hf[r], u = { x: e.x + s.x * i, y: e.y + s.y * i }, a = { x: n.x + l.x * i, y: n.y + l.y * i }, c = v_({
    source: u,
    sourcePosition: t,
    target: a
  }), f = c.x !== 0 ? "x" : "y", d = c[f];
  let m = [], w, y;
  const k = { x: 0, y: 0 }, p = { x: 0, y: 0 }, [h, g, v, C] = fm({
    sourceX: e.x,
    sourceY: e.y,
    targetX: n.x,
    targetY: n.y
  });
  if (s[f] * l[f] === -1) {
    w = o.x ?? h, y = o.y ?? g;
    const j = [
      { x: w, y: u.y },
      { x: w, y: a.y }
    ], T = [
      { x: u.x, y },
      { x: a.x, y }
    ];
    s[f] === d ? m = f === "x" ? j : T : m = f === "x" ? T : j;
  } else {
    const j = [{ x: u.x, y: a.y }], T = [{ x: a.x, y: u.y }];
    if (f === "x" ? m = s.x === d ? T : j : m = s.y === d ? j : T, t === r) {
      const V = Math.abs(e[f] - n[f]);
      if (V <= i) {
        const _ = Math.min(i - 1, i - V);
        s[f] === d ? k[f] = (u[f] > e[f] ? -1 : 1) * _ : p[f] = (a[f] > n[f] ? -1 : 1) * _;
      }
    }
    if (t !== r) {
      const V = f === "x" ? "y" : "x", _ = s[f] === l[V], $ = u[V] > a[V], M = u[V] < a[V];
      (s[f] === 1 && (!_ && $ || _ && M) || s[f] !== 1 && (!_ && M || _ && $)) && (m = f === "x" ? j : T);
    }
    const S = { x: u.x + k.x, y: u.y + k.y }, N = { x: a.x + p.x, y: a.y + p.y }, L = Math.max(Math.abs(S.x - m[0].x), Math.abs(N.x - m[0].x)), D = Math.max(Math.abs(S.y - m[0].y), Math.abs(N.y - m[0].y));
    L >= D ? (w = (S.x + N.x) / 2, y = m[0].y) : (w = m[0].x, y = (S.y + N.y) / 2);
  }
  return [[
    e,
    { x: u.x + k.x, y: u.y + k.y },
    ...m,
    { x: a.x + p.x, y: a.y + p.y },
    n
  ], w, y, v, C];
}
function x_(e, t, n, r) {
  const o = Math.min(Vf(e, t) / 2, Vf(t, n) / 2, r), { x: i, y: s } = t;
  if (e.x === i && i === n.x || e.y === s && s === n.y)
    return `L${i} ${s}`;
  if (e.y === s) {
    const a = e.x < n.x ? -1 : 1, c = e.y < n.y ? 1 : -1;
    return `L ${i + o * a},${s}Q ${i},${s} ${i},${s + o * c}`;
  }
  const l = e.x < n.x ? 1 : -1, u = e.y < n.y ? -1 : 1;
  return `L ${i},${s + o * u}Q ${i},${s} ${i + o * l},${s}`;
}
function Ou({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, borderRadius: s = 5, centerX: l, centerY: u, offset: a = 20 }) {
  const [c, f, d, m, w] = w_({
    source: { x: e, y: t },
    sourcePosition: n,
    target: { x: r, y: o },
    targetPosition: i,
    center: { x: l, y: u },
    offset: a
  });
  return [c.reduce((k, p, h) => {
    let g = "";
    return h > 0 && h < c.length - 1 ? g = x_(c[h - 1], p, c[h + 1], s) : g = `${h === 0 ? "M" : "L"}${p.x} ${p.y}`, k += g, k;
  }, ""), f, d, m, w];
}
const Xs = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a, style: c, sourcePosition: f = K.Bottom, targetPosition: d = K.Top, markerEnd: m, markerStart: w, pathOptions: y, interactionWidth: k }) => {
  const [p, h, g] = Ou({
    sourceX: e,
    sourceY: t,
    sourcePosition: f,
    targetX: n,
    targetY: r,
    targetPosition: d,
    borderRadius: y == null ? void 0 : y.borderRadius,
    offset: y == null ? void 0 : y.offset
  });
  return I.createElement(ri, { path: p, labelX: h, labelY: g, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a, style: c, markerEnd: m, markerStart: w, interactionWidth: k });
});
Xs.displayName = "SmoothStepEdge";
const Ga = P.memo((e) => {
  var t;
  return I.createElement(Xs, { ...e, pathOptions: P.useMemo(() => {
    var n;
    return { borderRadius: 0, offset: (n = e.pathOptions) == null ? void 0 : n.offset };
  }, [(t = e.pathOptions) == null ? void 0 : t.offset]) });
});
Ga.displayName = "StepEdge";
function __({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
  const [o, i, s, l] = fm({
    sourceX: e,
    sourceY: t,
    targetX: n,
    targetY: r
  });
  return [`M ${e},${t}L ${n},${r}`, o, i, s, l];
}
const Qa = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a, style: c, markerEnd: f, markerStart: d, interactionWidth: m }) => {
  const [w, y, k] = __({ sourceX: e, sourceY: t, targetX: n, targetY: r });
  return I.createElement(ri, { path: w, labelX: y, labelY: k, label: o, labelStyle: i, labelShowBg: s, labelBgStyle: l, labelBgPadding: u, labelBgBorderRadius: a, style: c, markerEnd: f, markerStart: d, interactionWidth: m });
});
Qa.displayName = "StraightEdge";
function Ci(e, t) {
  return e >= 0 ? 0.5 * e : t * 25 * Math.sqrt(-e);
}
function Bf({ pos: e, x1: t, y1: n, x2: r, y2: o, c: i }) {
  switch (e) {
    case K.Left:
      return [t - Ci(t - r, i), n];
    case K.Right:
      return [t + Ci(r - t, i), n];
    case K.Top:
      return [t, n - Ci(n - o, i)];
    case K.Bottom:
      return [t, n + Ci(o - n, i)];
  }
}
function hm({ sourceX: e, sourceY: t, sourcePosition: n = K.Bottom, targetX: r, targetY: o, targetPosition: i = K.Top, curvature: s = 0.25 }) {
  const [l, u] = Bf({
    pos: n,
    x1: e,
    y1: t,
    x2: r,
    y2: o,
    c: s
  }), [a, c] = Bf({
    pos: i,
    x1: r,
    y1: o,
    x2: e,
    y2: t,
    c: s
  }), [f, d, m, w] = dm({
    sourceX: e,
    sourceY: t,
    targetX: r,
    targetY: o,
    sourceControlX: l,
    sourceControlY: u,
    targetControlX: a,
    targetControlY: c
  });
  return [
    `M${e},${t} C${l},${u} ${a},${c} ${r},${o}`,
    f,
    d,
    m,
    w
  ];
}
const Es = P.memo(({ sourceX: e, sourceY: t, targetX: n, targetY: r, sourcePosition: o = K.Bottom, targetPosition: i = K.Top, label: s, labelStyle: l, labelShowBg: u, labelBgStyle: a, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: m, markerStart: w, pathOptions: y, interactionWidth: k }) => {
  const [p, h, g] = hm({
    sourceX: e,
    sourceY: t,
    sourcePosition: o,
    targetX: n,
    targetY: r,
    targetPosition: i,
    curvature: y == null ? void 0 : y.curvature
  });
  return I.createElement(ri, { path: p, labelX: h, labelY: g, label: s, labelStyle: l, labelShowBg: u, labelBgStyle: a, labelBgPadding: c, labelBgBorderRadius: f, style: d, markerEnd: m, markerStart: w, interactionWidth: k });
});
Es.displayName = "BezierEdge";
const Za = P.createContext(null), S_ = Za.Provider;
Za.Consumer;
const k_ = () => P.useContext(Za), E_ = (e) => "id" in e && "source" in e && "target" in e, N_ = ({ source: e, sourceHandle: t, target: n, targetHandle: r }) => `reactflow__edge-${e}${t || ""}-${n}${r || ""}`, Fu = (e, t) => typeof e > "u" ? "" : typeof e == "string" ? e : `${t ? `${t}__` : ""}${Object.keys(e).sort().map((r) => `${r}=${e[r]}`).join("&")}`, C_ = (e, t) => t.some((n) => n.source === e.source && n.target === e.target && (n.sourceHandle === e.sourceHandle || !n.sourceHandle && !e.sourceHandle) && (n.targetHandle === e.targetHandle || !n.targetHandle && !e.targetHandle)), M_ = (e, t) => {
  if (!e.source || !e.target)
    return t;
  let n;
  return E_(e) ? n = { ...e } : n = {
    ...e,
    id: N_(e)
  }, C_(n, t) ? t : t.concat(n);
}, Hu = ({ x: e, y: t }, [n, r, o], i, [s, l]) => {
  const u = {
    x: (e - n) / o,
    y: (t - r) / o
  };
  return i ? {
    x: s * Math.round(u.x / s),
    y: l * Math.round(u.y / l)
  } : u;
}, mm = ({ x: e, y: t }, [n, r, o]) => ({
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
}, Ks = (e, t = [0, 0]) => {
  if (e.length === 0)
    return { x: 0, y: 0, width: 0, height: 0 };
  const n = e.reduce((r, o) => {
    const { x: i, y: s } = Bn(o, t).positionAbsolute;
    return lm(r, Xo({
      x: i,
      y: s,
      width: o.width || 0,
      height: o.height || 0
    }));
  }, { x: 1 / 0, y: 1 / 0, x2: -1 / 0, y2: -1 / 0 });
  return um(n);
}, gm = (e, t, [n, r, o] = [0, 0, 1], i = !1, s = !1, l = [0, 0]) => {
  const u = {
    x: (t.x - n) / o,
    y: (t.y - r) / o,
    width: t.width / o,
    height: t.height / o
  }, a = [];
  return e.forEach((c) => {
    const { width: f, height: d, selectable: m = !0, hidden: w = !1 } = c;
    if (s && !m || w)
      return !1;
    const { positionAbsolute: y } = Bn(c, l), k = {
      x: y.x,
      y: y.y,
      width: f || 0,
      height: d || 0
    }, p = Du(u, k), h = typeof f > "u" || typeof d > "u" || f === null || d === null, g = i && p > 0, v = (f || 0) * (d || 0);
    (h || g || p >= v || c.dragging) && a.push(c);
  }), a;
}, ym = (e, t) => {
  const n = e.map((r) => r.id);
  return t.filter((r) => n.includes(r.source) || n.includes(r.target));
}, vm = (e, t, n, r, o, i = 0.1) => {
  const s = t / (e.width * (1 + i)), l = n / (e.height * (1 + i)), u = Math.min(s, l), a = Hr(u, r, o), c = e.x + e.width / 2, f = e.y + e.height / 2, d = t / 2 - c * a, m = n / 2 - f * a;
  return { x: d, y: m, zoom: a };
}, Rn = (e, t = 0) => e.transition().duration(t);
function bf(e, t, n, r) {
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
function P_(e, t, n, r, o, i) {
  const { x: s, y: l } = vn(e), a = t.elementsFromPoint(s, l).find((w) => w.classList.contains("react-flow__handle"));
  if (a) {
    const w = a.getAttribute("data-nodeid");
    if (w) {
      const y = qa(void 0, a), k = a.getAttribute("data-handleid"), p = i({ nodeId: w, id: k, type: y });
      if (p) {
        const h = o.find((g) => g.nodeId === w && g.type === y && g.id === k);
        return {
          handle: {
            id: k,
            type: y,
            nodeId: w,
            x: (h == null ? void 0 : h.x) || n.x,
            y: (h == null ? void 0 : h.y) || n.y
          },
          validHandleResult: p
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
    return { handle: null, validHandleResult: wm() };
  if (c.length === 1)
    return c[0];
  const d = c.some(({ validHandleResult: w }) => w.isValid), m = c.some(({ handle: w }) => w.type === "target");
  return c.find(({ handle: w, validHandleResult: y }) => m ? w.type === "target" : d ? y.isValid : !0) || c[0];
}
const z_ = { source: null, target: null, sourceHandle: null, targetHandle: null }, wm = () => ({
  handleDomNode: null,
  isValid: !1,
  connection: z_,
  endHandle: null
});
function xm(e, t, n, r, o, i, s) {
  const l = o === "target", u = s.querySelector(`.react-flow__handle[data-id="${e == null ? void 0 : e.nodeId}-${e == null ? void 0 : e.id}-${e == null ? void 0 : e.type}"]`), a = {
    ...wm(),
    handleDomNode: u
  };
  if (u) {
    const c = qa(void 0, u), f = u.getAttribute("data-nodeid"), d = u.getAttribute("data-handleid"), m = u.classList.contains("connectable"), w = u.classList.contains("connectableend"), y = {
      source: l ? f : n,
      sourceHandle: l ? d : r,
      target: l ? n : f,
      targetHandle: l ? r : d
    };
    a.connection = y, m && w && (t === Gn.Strict ? l && c === "source" || !l && c === "target" : f !== n || d !== r) && (a.endHandle = {
      nodeId: f,
      handleId: d,
      type: c
    }, a.isValid = i(y));
  }
  return a;
}
function T_({ nodes: e, nodeId: t, handleId: n, handleType: r }) {
  return e.reduce((o, i) => {
    if (i[me]) {
      const { handleBounds: s } = i[me];
      let l = [], u = [];
      s && (l = bf(i, s, "source", `${t}-${n}-${r}`), u = bf(i, s, "target", `${t}-${n}-${r}`)), o.push(...l, ...u);
    }
    return o;
  }, []);
}
function qa(e, t) {
  return e || (t != null && t.classList.contains("target") ? "target" : t != null && t.classList.contains("source") ? "source" : null);
}
function zl(e) {
  e == null || e.classList.remove("valid", "connecting", "react-flow__handle-valid", "react-flow__handle-connecting");
}
function j_(e, t) {
  let n = null;
  return t ? n = "valid" : e && !t && (n = "invalid"), n;
}
function _m({ event: e, handleId: t, nodeId: n, onConnect: r, isTarget: o, getState: i, setState: s, isValidConnection: l, edgeUpdaterType: u, onReconnectEnd: a }) {
  const c = sm(e.target), { connectionMode: f, domNode: d, autoPanOnConnect: m, connectionRadius: w, onConnectStart: y, panBy: k, getNodes: p, cancelConnection: h } = i();
  let g = 0, v;
  const { x: C, y: z } = vn(e), j = c == null ? void 0 : c.elementFromPoint(C, z), T = qa(u, j), S = d == null ? void 0 : d.getBoundingClientRect();
  if (!S || !T)
    return;
  let N, L = vn(e, S), D = !1, V = null, _ = !1, $ = null;
  const M = T_({
    nodes: p(),
    nodeId: n,
    handleId: t,
    handleType: T
  }), O = () => {
    if (!m)
      return;
    const [A, F] = im(L, S);
    k({ x: A, y: F }), g = requestAnimationFrame(O);
  };
  s({
    connectionPosition: L,
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
  }), y == null || y(e, { nodeId: n, handleId: t, handleType: T });
  function R(A) {
    const { transform: F } = i();
    L = vn(A, S);
    const { handle: H, validHandleResult: U } = P_(A, c, Hu(L, F, !1, [1, 1]), w, M, (b) => xm(b, f, n, t, o ? "target" : "source", l, c));
    if (v = H, D || (O(), D = !0), $ = U.handleDomNode, V = U.connection, _ = U.isValid, s({
      connectionPosition: v && _ ? mm({
        x: v.x,
        y: v.y
      }, F) : L,
      connectionStatus: j_(!!v, _),
      connectionEndHandle: U.endHandle
    }), !v && !_ && !$)
      return zl(N);
    V.source !== V.target && $ && (zl(N), N = $, $.classList.add("connecting", "react-flow__handle-connecting"), $.classList.toggle("valid", _), $.classList.toggle("react-flow__handle-valid", _));
  }
  function E(A) {
    var F, H;
    (v || $) && V && _ && (r == null || r(V)), (H = (F = i()).onConnectEnd) == null || H.call(F, A), u && (a == null || a(A)), zl(N), h(), cancelAnimationFrame(g), D = !1, _ = !1, V = null, $ = null, c.removeEventListener("mousemove", R), c.removeEventListener("mouseup", E), c.removeEventListener("touchmove", R), c.removeEventListener("touchend", E);
  }
  c.addEventListener("mousemove", R), c.addEventListener("mouseup", E), c.addEventListener("touchmove", R), c.addEventListener("touchend", E);
}
const Uf = () => !0, R_ = (e) => ({
  connectionStartHandle: e.connectionStartHandle,
  connectOnClick: e.connectOnClick,
  noPanClassName: e.noPanClassName
}), $_ = (e, t, n) => (r) => {
  const { connectionStartHandle: o, connectionEndHandle: i, connectionClickStartHandle: s } = r;
  return {
    connecting: (o == null ? void 0 : o.nodeId) === e && (o == null ? void 0 : o.handleId) === t && (o == null ? void 0 : o.type) === n || (i == null ? void 0 : i.nodeId) === e && (i == null ? void 0 : i.handleId) === t && (i == null ? void 0 : i.type) === n,
    clickConnecting: (s == null ? void 0 : s.nodeId) === e && (s == null ? void 0 : s.handleId) === t && (s == null ? void 0 : s.type) === n
  };
}, Sm = P.forwardRef(({ type: e = "source", position: t = K.Top, isValidConnection: n, isConnectable: r = !0, isConnectableStart: o = !0, isConnectableEnd: i = !0, id: s, onConnect: l, children: u, className: a, onMouseDown: c, onTouchStart: f, ...d }, m) => {
  var S, N;
  const w = s || null, y = e === "target", k = Se(), p = k_(), { connectOnClick: h, noPanClassName: g } = le(R_, Ne), { connecting: v, clickConnecting: C } = le($_(p, w, e), Ne);
  p || (N = (S = k.getState()).onError) == null || N.call(S, "010", Gt.error010());
  const z = (L) => {
    const { defaultEdgeOptions: D, onConnect: V, hasDefaultEdges: _ } = k.getState(), $ = {
      ...D,
      ...L
    };
    if (_) {
      const { edges: M, setEdges: O } = k.getState();
      O(M_($, M));
    }
    V == null || V($), l == null || l($);
  }, j = (L) => {
    if (!p)
      return;
    const D = cm(L);
    o && (D && L.button === 0 || !D) && _m({
      event: L,
      handleId: w,
      nodeId: p,
      onConnect: z,
      isTarget: y,
      getState: k.getState,
      setState: k.setState,
      isValidConnection: n || k.getState().isValidConnection || Uf
    }), D ? c == null || c(L) : f == null || f(L);
  }, T = (L) => {
    const { onClickConnectStart: D, onClickConnectEnd: V, connectionClickStartHandle: _, connectionMode: $, isValidConnection: M } = k.getState();
    if (!p || !_ && !o)
      return;
    if (!_) {
      D == null || D(L, { nodeId: p, handleId: w, handleType: e }), k.setState({ connectionClickStartHandle: { nodeId: p, type: e, handleId: w } });
      return;
    }
    const O = sm(L.target), R = n || M || Uf, { connection: E, isValid: A } = xm({
      nodeId: p,
      id: w,
      type: e
    }, $, _.nodeId, _.handleId || null, _.type, R, O);
    A && z(E), V == null || V(L), k.setState({ connectionClickStartHandle: null });
  };
  return I.createElement("div", { "data-handleid": w, "data-nodeid": p, "data-handlepos": t, "data-id": `${p}-${w}-${e}`, className: je([
    "react-flow__handle",
    `react-flow__handle-${t}`,
    "nodrag",
    g,
    a,
    {
      source: !y,
      target: y,
      connectable: r,
      connectablestart: o,
      connectableend: i,
      connecting: C,
      // this class is used to style the handle when the user is connecting
      connectionindicator: r && (o && !v || i && v)
    }
  ]), onMouseDown: j, onTouchStart: j, onClick: h ? T : void 0, ref: m, ...d }, u);
});
Sm.displayName = "Handle";
var Vr = P.memo(Sm);
const km = ({ data: e, isConnectable: t, targetPosition: n = K.Top, sourcePosition: r = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Vr, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label,
  I.createElement(Vr, { type: "source", position: r, isConnectable: t })
);
km.displayName = "DefaultNode";
var Vu = P.memo(km);
const Em = ({ data: e, isConnectable: t, sourcePosition: n = K.Bottom }) => I.createElement(
  I.Fragment,
  null,
  e == null ? void 0 : e.label,
  I.createElement(Vr, { type: "source", position: n, isConnectable: t })
);
Em.displayName = "InputNode";
var Nm = P.memo(Em);
const Cm = ({ data: e, isConnectable: t, targetPosition: n = K.Top }) => I.createElement(
  I.Fragment,
  null,
  I.createElement(Vr, { type: "target", position: n, isConnectable: t }),
  e == null ? void 0 : e.label
);
Cm.displayName = "OutputNode";
var Mm = P.memo(Cm);
const Ja = () => null;
Ja.displayName = "GroupNode";
const A_ = (e) => ({
  selectedNodes: e.getNodes().filter((t) => t.selected),
  selectedEdges: e.edges.filter((t) => t.selected).map((t) => ({ ...t }))
}), Mi = (e) => e.id;
function I_(e, t) {
  return Ne(e.selectedNodes.map(Mi), t.selectedNodes.map(Mi)) && Ne(e.selectedEdges.map(Mi), t.selectedEdges.map(Mi));
}
const Pm = P.memo(({ onSelectionChange: e }) => {
  const t = Se(), { selectedNodes: n, selectedEdges: r } = le(A_, I_);
  return P.useEffect(() => {
    const o = { nodes: n, edges: r };
    e == null || e(o), t.getState().onSelectionChange.forEach((i) => i(o));
  }, [n, r, e]), null;
});
Pm.displayName = "SelectionListener";
const D_ = (e) => !!e.onSelectionChange;
function L_({ onSelectionChange: e }) {
  const t = le(D_);
  return e || t ? I.createElement(Pm, { onSelectionChange: e }) : null;
}
const O_ = (e) => ({
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
const F_ = ({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: o, onConnectStart: i, onConnectEnd: s, onClickConnectStart: l, onClickConnectEnd: u, nodesDraggable: a, nodesConnectable: c, nodesFocusable: f, edgesFocusable: d, edgesUpdatable: m, elevateNodesOnSelect: w, minZoom: y, maxZoom: k, nodeExtent: p, onNodesChange: h, onEdgesChange: g, elementsSelectable: v, connectionMode: C, snapGrid: z, snapToGrid: j, translateExtent: T, connectOnClick: S, defaultEdgeOptions: N, fitView: L, fitViewOptions: D, onNodesDelete: V, onEdgesDelete: _, onNodeDrag: $, onNodeDragStart: M, onNodeDragStop: O, onSelectionDrag: R, onSelectionDragStart: E, onSelectionDragStop: A, noPanClassName: F, nodeOrigin: H, rfId: U, autoPanOnConnect: b, autoPanOnNodeDrag: Y, onError: Q, connectionRadius: Z, isValidConnection: re, nodeDragThreshold: ne }) => {
  const { setNodes: te, setEdges: Ce, setDefaultNodesAndEdges: we, setMinZoom: Oe, setMaxZoom: Re, setTranslateExtent: ge, setNodeExtent: Qe, reset: ie } = le(O_, Ne), G = Se();
  return P.useEffect(() => {
    const Fe = r == null ? void 0 : r.map(($t) => ({ ...$t, ...N }));
    return we(n, Fe), () => {
      ie();
    };
  }, []), q("defaultEdgeOptions", N, G.setState), q("connectionMode", C, G.setState), q("onConnect", o, G.setState), q("onConnectStart", i, G.setState), q("onConnectEnd", s, G.setState), q("onClickConnectStart", l, G.setState), q("onClickConnectEnd", u, G.setState), q("nodesDraggable", a, G.setState), q("nodesConnectable", c, G.setState), q("nodesFocusable", f, G.setState), q("edgesFocusable", d, G.setState), q("edgesUpdatable", m, G.setState), q("elementsSelectable", v, G.setState), q("elevateNodesOnSelect", w, G.setState), q("snapToGrid", j, G.setState), q("snapGrid", z, G.setState), q("onNodesChange", h, G.setState), q("onEdgesChange", g, G.setState), q("connectOnClick", S, G.setState), q("fitViewOnInit", L, G.setState), q("fitViewOnInitOptions", D, G.setState), q("onNodesDelete", V, G.setState), q("onEdgesDelete", _, G.setState), q("onNodeDrag", $, G.setState), q("onNodeDragStart", M, G.setState), q("onNodeDragStop", O, G.setState), q("onSelectionDrag", R, G.setState), q("onSelectionDragStart", E, G.setState), q("onSelectionDragStop", A, G.setState), q("noPanClassName", F, G.setState), q("nodeOrigin", H, G.setState), q("rfId", U, G.setState), q("autoPanOnConnect", b, G.setState), q("autoPanOnNodeDrag", Y, G.setState), q("onError", Q, G.setState), q("connectionRadius", Z, G.setState), q("isValidConnection", re, G.setState), q("nodeDragThreshold", ne, G.setState), or(e, te), or(t, Ce), or(y, Oe), or(k, Re), or(T, ge), or(p, Qe), null;
}, Wf = { display: "none" }, H_ = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0px, 0px, 0px, 0px)",
  clipPath: "inset(100%)"
}, zm = "react-flow__node-desc", Tm = "react-flow__edge-desc", V_ = "react-flow__aria-live", B_ = (e) => e.ariaLiveMessage;
function b_({ rfId: e }) {
  const t = le(B_);
  return I.createElement("div", { id: `${V_}-${e}`, "aria-live": "assertive", "aria-atomic": "true", style: H_ }, t);
}
function U_({ rfId: e, disableKeyboardA11y: t }) {
  return I.createElement(
    I.Fragment,
    null,
    I.createElement(
      "div",
      { id: `${zm}-${e}`, style: Wf },
      "Press enter or space to select a node.",
      !t && "You can then use the arrow keys to move the node around.",
      " Press delete to remove it and escape to cancel.",
      " "
    ),
    I.createElement("div", { id: `${Tm}-${e}`, style: Wf }, "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel."),
    !t && I.createElement(b_, { rfId: e })
  );
}
var Go = (e = null, t = { actInsideInputWithModifier: !0 }) => {
  const [n, r] = P.useState(!1), o = P.useRef(!1), i = P.useRef(/* @__PURE__ */ new Set([])), [s, l] = P.useMemo(() => {
    if (e !== null) {
      const a = (Array.isArray(e) ? e : [e]).filter((f) => typeof f == "string").map((f) => f.split("+")), c = a.reduce((f, d) => f.concat(...d), []);
      return [a, c];
    }
    return [[], []];
  }, [e]);
  return P.useEffect(() => {
    const u = typeof document < "u" ? document : null, a = (t == null ? void 0 : t.target) || u;
    if (e !== null) {
      const c = (m) => {
        if (o.current = m.ctrlKey || m.metaKey || m.shiftKey, (!o.current || o.current && !t.actInsideInputWithModifier) && Lu(m))
          return !1;
        const y = Xf(m.code, l);
        i.current.add(m[y]), Yf(s, i.current, !1) && (m.preventDefault(), r(!0));
      }, f = (m) => {
        if ((!o.current || o.current && !t.actInsideInputWithModifier) && Lu(m))
          return !1;
        const y = Xf(m.code, l);
        Yf(s, i.current, !0) ? (r(!1), i.current.clear()) : i.current.delete(m[y]), m.key === "Meta" && i.current.clear(), o.current = !1;
      }, d = () => {
        i.current.clear(), r(!1);
      };
      return a == null || a.addEventListener("keydown", c), a == null || a.addEventListener("keyup", f), window.addEventListener("blur", d), () => {
        a == null || a.removeEventListener("keydown", c), a == null || a.removeEventListener("keyup", f), window.removeEventListener("blur", d);
      };
    }
  }, [e, r]), n;
};
function Yf(e, t, n) {
  return e.filter((r) => n || r.length === t.size).some((r) => r.every((o) => t.has(o)));
}
function Xf(e, t) {
  return t.includes(e) ? "code" : "key";
}
function jm(e, t, n, r) {
  var l, u;
  const o = e.parentNode || e.parentId;
  if (!o)
    return n;
  const i = t.get(o), s = Bn(i, r);
  return jm(i, t, {
    x: (n.x ?? 0) + s.x,
    y: (n.y ?? 0) + s.y,
    z: (((l = i[me]) == null ? void 0 : l.z) ?? 0) > (n.z ?? 0) ? ((u = i[me]) == null ? void 0 : u.z) ?? 0 : n.z ?? 0
  }, r);
}
function Rm(e, t, n) {
  e.forEach((r) => {
    var i;
    const o = r.parentNode || r.parentId;
    if (o && !e.has(o))
      throw new Error(`Parent node ${o} not found`);
    if (o || n != null && n[r.id]) {
      const { x: s, y: l, z: u } = jm(r, e, {
        ...r.position,
        z: ((i = r[me]) == null ? void 0 : i.z) ?? 0
      }, t);
      r.positionAbsolute = {
        x: s,
        y: l
      }, r[me].z = u, n != null && n[r.id] && (r[me].isParent = !0);
    }
  });
}
function Tl(e, t, n, r) {
  const o = /* @__PURE__ */ new Map(), i = {}, s = r ? 1e3 : 0;
  return e.forEach((l) => {
    var m;
    const u = (ut(l.zIndex) ? l.zIndex : 0) + (l.selected ? s : 0), a = t.get(l.id), c = {
      ...l,
      positionAbsolute: {
        x: l.position.x,
        y: l.position.y
      }
    }, f = l.parentNode || l.parentId;
    f && (i[f] = !0);
    const d = (a == null ? void 0 : a.type) && (a == null ? void 0 : a.type) !== l.type;
    Object.defineProperty(c, me, {
      enumerable: !1,
      value: {
        handleBounds: d || (m = a == null ? void 0 : a[me]) == null ? void 0 : m.handleBounds,
        z: u
      }
    }), o.set(l.id, c);
  }), Rm(o, n, i), o;
}
function $m(e, t = {}) {
  const { getNodes: n, width: r, height: o, minZoom: i, maxZoom: s, d3Zoom: l, d3Selection: u, fitViewOnInitDone: a, fitViewOnInit: c, nodeOrigin: f } = e(), d = t.initial && !a && c;
  if (l && u && (d || !t.initial)) {
    const w = n().filter((k) => {
      var h;
      const p = t.includeHiddenNodes ? k.width && k.height : !k.hidden;
      return (h = t.nodes) != null && h.length ? p && t.nodes.some((g) => g.id === k.id) : p;
    }), y = w.every((k) => k.width && k.height);
    if (w.length > 0 && y) {
      const k = Ks(w, f), { x: p, y: h, zoom: g } = vm(k, r, o, t.minZoom ?? i, t.maxZoom ?? s, t.padding ?? 0.1), v = bt.translate(p, h).scale(g);
      return typeof t.duration == "number" && t.duration > 0 ? l.transform(Rn(u, t.duration), v) : l.transform(u, v), !0;
    }
  }
  return !1;
}
function W_(e, t) {
  return e.forEach((n) => {
    const r = t.get(n.id);
    r && t.set(r.id, {
      ...r,
      [me]: r[me],
      selected: n.selected
    });
  }), new Map(t);
}
function Y_(e, t) {
  return t.map((n) => {
    const r = e.find((o) => o.id === n.id);
    return r && (n.selected = r.selected), n;
  });
}
function Pi({ changedNodes: e, changedEdges: t, get: n, set: r }) {
  const { nodeInternals: o, edges: i, onNodesChange: s, onEdgesChange: l, hasDefaultNodes: u, hasDefaultEdges: a } = n();
  e != null && e.length && (u && r({ nodeInternals: W_(e, o) }), s == null || s(e)), t != null && t.length && (a && r({ edges: Y_(t, i) }), l == null || l(t));
}
const ir = () => {
}, X_ = {
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
}, K_ = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection
}), G_ = () => {
  const e = Se(), { d3Zoom: t, d3Selection: n } = le(K_, Ne);
  return P.useMemo(() => n && t ? {
    zoomIn: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1.2),
    zoomOut: (o) => t.scaleBy(Rn(n, o == null ? void 0 : o.duration), 1 / 1.2),
    zoomTo: (o, i) => t.scaleTo(Rn(n, i == null ? void 0 : i.duration), o),
    getZoom: () => e.getState().transform[2],
    setViewport: (o, i) => {
      const [s, l, u] = e.getState().transform, a = bt.translate(o.x ?? s, o.y ?? l).scale(o.zoom ?? u);
      t.transform(Rn(n, i == null ? void 0 : i.duration), a);
    },
    getViewport: () => {
      const [o, i, s] = e.getState().transform;
      return { x: o, y: i, zoom: s };
    },
    fitView: (o) => $m(e.getState, o),
    setCenter: (o, i, s) => {
      const { width: l, height: u, maxZoom: a } = e.getState(), c = typeof (s == null ? void 0 : s.zoom) < "u" ? s.zoom : a, f = l / 2 - o * c, d = u / 2 - i * c, m = bt.translate(f, d).scale(c);
      t.transform(Rn(n, s == null ? void 0 : s.duration), m);
    },
    fitBounds: (o, i) => {
      const { width: s, height: l, minZoom: u, maxZoom: a } = e.getState(), { x: c, y: f, zoom: d } = vm(o, s, l, u, a, (i == null ? void 0 : i.padding) ?? 0.1), m = bt.translate(c, f).scale(d);
      t.transform(Rn(n, i == null ? void 0 : i.duration), m);
    },
    // @deprecated Use `screenToFlowPosition`.
    project: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l } = e.getState();
      return console.warn("[DEPRECATED] `project` is deprecated. Instead use `screenToFlowPosition`. There is no need to subtract the react flow bounds anymore! https://reactflow.dev/api-reference/types/react-flow-instance#screen-to-flow-position"), Hu(o, i, s, l);
    },
    screenToFlowPosition: (o) => {
      const { transform: i, snapToGrid: s, snapGrid: l, domNode: u } = e.getState();
      if (!u)
        return o;
      const { x: a, y: c } = u.getBoundingClientRect(), f = {
        x: o.x - a,
        y: o.y - c
      };
      return Hu(f, i, s, l);
    },
    flowToScreenPosition: (o) => {
      const { transform: i, domNode: s } = e.getState();
      if (!s)
        return o;
      const { x: l, y: u } = s.getBoundingClientRect(), a = mm(o, i);
      return {
        x: a.x + l,
        y: a.y + u
      };
    },
    viewportInitialized: !0
  } : X_, [t, n]);
};
function ec() {
  const e = G_(), t = Se(), n = P.useCallback(() => t.getState().getNodes().map((y) => ({ ...y })), []), r = P.useCallback((y) => t.getState().nodeInternals.get(y), []), o = P.useCallback(() => {
    const { edges: y = [] } = t.getState();
    return y.map((k) => ({ ...k }));
  }, []), i = P.useCallback((y) => {
    const { edges: k = [] } = t.getState();
    return k.find((p) => p.id === y);
  }, []), s = P.useCallback((y) => {
    const { getNodes: k, setNodes: p, hasDefaultNodes: h, onNodesChange: g } = t.getState(), v = k(), C = typeof y == "function" ? y(v) : y;
    if (h)
      p(C);
    else if (g) {
      const z = C.length === 0 ? v.map((j) => ({ type: "remove", id: j.id })) : C.map((j) => ({ item: j, type: "reset" }));
      g(z);
    }
  }, []), l = P.useCallback((y) => {
    const { edges: k = [], setEdges: p, hasDefaultEdges: h, onEdgesChange: g } = t.getState(), v = typeof y == "function" ? y(k) : y;
    if (h)
      p(v);
    else if (g) {
      const C = v.length === 0 ? k.map((z) => ({ type: "remove", id: z.id })) : v.map((z) => ({ item: z, type: "reset" }));
      g(C);
    }
  }, []), u = P.useCallback((y) => {
    const k = Array.isArray(y) ? y : [y], { getNodes: p, setNodes: h, hasDefaultNodes: g, onNodesChange: v } = t.getState();
    if (g) {
      const z = [...p(), ...k];
      h(z);
    } else if (v) {
      const C = k.map((z) => ({ item: z, type: "add" }));
      v(C);
    }
  }, []), a = P.useCallback((y) => {
    const k = Array.isArray(y) ? y : [y], { edges: p = [], setEdges: h, hasDefaultEdges: g, onEdgesChange: v } = t.getState();
    if (g)
      h([...p, ...k]);
    else if (v) {
      const C = k.map((z) => ({ item: z, type: "add" }));
      v(C);
    }
  }, []), c = P.useCallback(() => {
    const { getNodes: y, edges: k = [], transform: p } = t.getState(), [h, g, v] = p;
    return {
      nodes: y().map((C) => ({ ...C })),
      edges: k.map((C) => ({ ...C })),
      viewport: {
        x: h,
        y: g,
        zoom: v
      }
    };
  }, []), f = P.useCallback(({ nodes: y, edges: k }) => {
    const { nodeInternals: p, getNodes: h, edges: g, hasDefaultNodes: v, hasDefaultEdges: C, onNodesDelete: z, onEdgesDelete: j, onNodesChange: T, onEdgesChange: S } = t.getState(), N = (y || []).map(($) => $.id), L = (k || []).map(($) => $.id), D = h().reduce(($, M) => {
      const O = M.parentNode || M.parentId, R = !N.includes(M.id) && O && $.find((A) => A.id === O);
      return (typeof M.deletable == "boolean" ? M.deletable : !0) && (N.includes(M.id) || R) && $.push(M), $;
    }, []), V = g.filter(($) => typeof $.deletable == "boolean" ? $.deletable : !0), _ = V.filter(($) => L.includes($.id));
    if (D || _) {
      const $ = ym(D, V), M = [..._, ...$], O = M.reduce((R, E) => (R.includes(E.id) || R.push(E.id), R), []);
      if ((C || v) && (C && t.setState({
        edges: g.filter((R) => !O.includes(R.id))
      }), v && (D.forEach((R) => {
        p.delete(R.id);
      }), t.setState({
        nodeInternals: new Map(p)
      }))), O.length > 0 && (j == null || j(M), S && S(O.map((R) => ({
        id: R,
        type: "remove"
      })))), D.length > 0 && (z == null || z(D), T)) {
        const R = D.map((E) => ({ id: E.id, type: "remove" }));
        T(R);
      }
    }
  }, []), d = P.useCallback((y) => {
    const k = m_(y), p = k ? null : t.getState().nodeInternals.get(y.id);
    return !k && !p ? [null, null, k] : [k ? y : Of(p), p, k];
  }, []), m = P.useCallback((y, k = !0, p) => {
    const [h, g, v] = d(y);
    return h ? (p || t.getState().getNodes()).filter((C) => {
      if (!v && (C.id === g.id || !C.positionAbsolute))
        return !1;
      const z = Of(C), j = Du(z, h);
      return k && j > 0 || j >= h.width * h.height;
    }) : [];
  }, []), w = P.useCallback((y, k, p = !0) => {
    const [h] = d(y);
    if (!h)
      return !1;
    const g = Du(h, k);
    return p && g > 0 || g >= h.width * h.height;
  }, []);
  return P.useMemo(() => ({
    ...e,
    getNodes: n,
    getNode: r,
    getEdges: o,
    getEdge: i,
    setNodes: s,
    setEdges: l,
    addNodes: u,
    addEdges: a,
    toObject: c,
    deleteElements: f,
    getIntersectingNodes: m,
    isNodeIntersecting: w
  }), [
    e,
    n,
    r,
    o,
    i,
    s,
    l,
    u,
    a,
    c,
    f,
    m,
    w
  ]);
}
const Q_ = { actInsideInputWithModifier: !1 };
var Z_ = ({ deleteKeyCode: e, multiSelectionKeyCode: t }) => {
  const n = Se(), { deleteElements: r } = ec(), o = Go(e, Q_), i = Go(t);
  P.useEffect(() => {
    if (o) {
      const { edges: s, getNodes: l } = n.getState(), u = l().filter((c) => c.selected), a = s.filter((c) => c.selected);
      r({ nodes: u, edges: a }), n.setState({ nodesSelectionActive: !1 });
    }
  }, [o]), P.useEffect(() => {
    n.setState({ multiSelectionActive: i });
  }, [i]);
};
function q_(e) {
  const t = Se();
  P.useEffect(() => {
    let n;
    const r = () => {
      var i, s;
      if (!e.current)
        return;
      const o = Ya(e.current);
      (o.height === 0 || o.width === 0) && ((s = (i = t.getState()).onError) == null || s.call(i, "004", Gt.error004())), t.setState({ width: o.width || 500, height: o.height || 500 });
    };
    return r(), window.addEventListener("resize", r), e.current && (n = new ResizeObserver(() => r()), n.observe(e.current)), () => {
      window.removeEventListener("resize", r), n && e.current && n.unobserve(e.current);
    };
  }, []);
}
const tc = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0
}, J_ = (e, t) => e.x !== t.x || e.y !== t.y || e.zoom !== t.k, zi = (e) => ({
  x: e.x,
  y: e.y,
  zoom: e.k
}), sr = (e, t) => e.target.closest(`.${t}`), Kf = (e, t) => t === 2 && Array.isArray(e) && e.includes(2), Gf = (e) => {
  const t = e.ctrlKey && Ss() ? 10 : 1;
  return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 2e-3) * t;
}, eS = (e) => ({
  d3Zoom: e.d3Zoom,
  d3Selection: e.d3Selection,
  d3ZoomHandler: e.d3ZoomHandler,
  userSelectionActive: e.userSelectionActive
}), tS = ({ onMove: e, onMoveStart: t, onMoveEnd: n, onPaneContextMenu: r, zoomOnScroll: o = !0, zoomOnPinch: i = !0, panOnScroll: s = !1, panOnScrollSpeed: l = 0.5, panOnScrollMode: u = On.Free, zoomOnDoubleClick: a = !0, elementsSelectable: c, panOnDrag: f = !0, defaultViewport: d, translateExtent: m, minZoom: w, maxZoom: y, zoomActivationKeyCode: k, preventScrolling: p = !0, children: h, noWheelClassName: g, noPanClassName: v }) => {
  const C = P.useRef(), z = Se(), j = P.useRef(!1), T = P.useRef(!1), S = P.useRef(null), N = P.useRef({ x: 0, y: 0, zoom: 0 }), { d3Zoom: L, d3Selection: D, d3ZoomHandler: V, userSelectionActive: _ } = le(eS, Ne), $ = Go(k), M = P.useRef(0), O = P.useRef(!1), R = P.useRef();
  return q_(S), P.useEffect(() => {
    if (S.current) {
      const E = S.current.getBoundingClientRect(), A = rm().scaleExtent([w, y]).translateExtent(m), F = st(S.current).call(A), H = bt.translate(d.x, d.y).scale(Hr(d.zoom, w, y)), U = [
        [0, 0],
        [E.width, E.height]
      ], b = A.constrain()(H, U, m);
      A.transform(F, b), A.wheelDelta(Gf), z.setState({
        d3Zoom: A,
        d3Selection: F,
        d3ZoomHandler: F.on("wheel.zoom"),
        // we need to pass transform because zoom handler is not registered when we set the initial transform
        transform: [b.x, b.y, b.k],
        domNode: S.current.closest(".react-flow")
      });
    }
  }, []), P.useEffect(() => {
    D && L && (s && !$ && !_ ? D.on("wheel.zoom", (E) => {
      if (sr(E, g))
        return !1;
      E.preventDefault(), E.stopImmediatePropagation();
      const A = D.property("__zoom").k || 1;
      if (E.ctrlKey && i) {
        const re = yt(E), ne = Gf(E), te = A * Math.pow(2, ne);
        L.scaleTo(D, te, re, E);
        return;
      }
      const F = E.deltaMode === 1 ? 20 : 1;
      let H = u === On.Vertical ? 0 : E.deltaX * F, U = u === On.Horizontal ? 0 : E.deltaY * F;
      !Ss() && E.shiftKey && u !== On.Vertical && (H = E.deltaY * F, U = 0), L.translateBy(
        D,
        -(H / A) * l,
        -(U / A) * l,
        // @ts-ignore
        { internal: !0 }
      );
      const b = zi(D.property("__zoom")), { onViewportChangeStart: Y, onViewportChange: Q, onViewportChangeEnd: Z } = z.getState();
      clearTimeout(R.current), O.current || (O.current = !0, t == null || t(E, b), Y == null || Y(b)), O.current && (e == null || e(E, b), Q == null || Q(b), R.current = setTimeout(() => {
        n == null || n(E, b), Z == null || Z(b), O.current = !1;
      }, 150));
    }, { passive: !1 }) : typeof V < "u" && D.on("wheel.zoom", function(E, A) {
      if (!p && E.type === "wheel" && !E.ctrlKey || sr(E, g))
        return null;
      E.preventDefault(), V.call(this, E, A);
    }, { passive: !1 }));
  }, [
    _,
    s,
    u,
    D,
    L,
    V,
    $,
    i,
    p,
    g,
    t,
    e,
    n
  ]), P.useEffect(() => {
    L && L.on("start", (E) => {
      var H, U;
      if (!E.sourceEvent || E.sourceEvent.internal)
        return null;
      M.current = (H = E.sourceEvent) == null ? void 0 : H.button;
      const { onViewportChangeStart: A } = z.getState(), F = zi(E.transform);
      j.current = !0, N.current = F, ((U = E.sourceEvent) == null ? void 0 : U.type) === "mousedown" && z.setState({ paneDragging: !0 }), A == null || A(F), t == null || t(E.sourceEvent, F);
    });
  }, [L, t]), P.useEffect(() => {
    L && (_ && !j.current ? L.on("zoom", null) : _ || L.on("zoom", (E) => {
      var F;
      const { onViewportChange: A } = z.getState();
      if (z.setState({ transform: [E.transform.x, E.transform.y, E.transform.k] }), T.current = !!(r && Kf(f, M.current ?? 0)), (e || A) && !((F = E.sourceEvent) != null && F.internal)) {
        const H = zi(E.transform);
        A == null || A(H), e == null || e(E.sourceEvent, H);
      }
    }));
  }, [_, L, e, f, r]), P.useEffect(() => {
    L && L.on("end", (E) => {
      if (!E.sourceEvent || E.sourceEvent.internal)
        return null;
      const { onViewportChangeEnd: A } = z.getState();
      if (j.current = !1, z.setState({ paneDragging: !1 }), r && Kf(f, M.current ?? 0) && !T.current && r(E.sourceEvent), T.current = !1, (n || A) && J_(N.current, E.transform)) {
        const F = zi(E.transform);
        N.current = F, clearTimeout(C.current), C.current = setTimeout(() => {
          A == null || A(F), n == null || n(E.sourceEvent, F);
        }, s ? 150 : 0);
      }
    });
  }, [L, s, f, n, r]), P.useEffect(() => {
    L && L.filter((E) => {
      const A = $ || o, F = i && E.ctrlKey;
      if ((f === !0 || Array.isArray(f) && f.includes(1)) && E.button === 1 && E.type === "mousedown" && (sr(E, "react-flow__node") || sr(E, "react-flow__edge")))
        return !0;
      if (!f && !A && !s && !a && !i || _ || !a && E.type === "dblclick" || sr(E, g) && E.type === "wheel" || sr(E, v) && (E.type !== "wheel" || s && E.type === "wheel" && !$) || !i && E.ctrlKey && E.type === "wheel" || !A && !s && !F && E.type === "wheel" || !f && (E.type === "mousedown" || E.type === "touchstart") || Array.isArray(f) && !f.includes(E.button) && E.type === "mousedown")
        return !1;
      const H = Array.isArray(f) && f.includes(E.button) || !E.button || E.button <= 1;
      return (!E.ctrlKey || E.type === "wheel") && H;
    });
  }, [
    _,
    L,
    o,
    i,
    s,
    a,
    f,
    c,
    $
  ]), I.createElement("div", { className: "react-flow__renderer", ref: S, style: tc }, h);
}, nS = (e) => ({
  userSelectionActive: e.userSelectionActive,
  userSelectionRect: e.userSelectionRect
});
function rS() {
  const { userSelectionActive: e, userSelectionRect: t } = le(nS, Ne);
  return e && t ? I.createElement("div", { className: "react-flow__selection react-flow__container", style: {
    width: t.width,
    height: t.height,
    transform: `translate(${t.x}px, ${t.y}px)`
  } }) : null;
}
function Qf(e, t) {
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
function oS(e, t) {
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
            typeof l.position < "u" && (s.position = l.position), typeof l.positionAbsolute < "u" && (s.positionAbsolute = l.positionAbsolute), typeof l.dragging < "u" && (s.dragging = l.dragging), s.expandParent && Qf(r, s);
            break;
          }
          case "dimensions": {
            typeof l.dimensions < "u" && (s.width = l.dimensions.width, s.height = l.dimensions.height), typeof l.updateStyle < "u" && (s.style = { ...s.style || {}, ...l.dimensions }), typeof l.resizing == "boolean" && (s.resizing = l.resizing), s.expandParent && Qf(r, s);
            break;
          }
          case "remove":
            return r;
        }
    return r.push(s), r;
  }, n);
}
function iS(e, t) {
  return oS(e, t);
}
const rn = (e, t) => ({
  id: e,
  type: "select",
  selected: t
});
function xr(e, t) {
  return e.reduce((n, r) => {
    const o = t.includes(r.id);
    return !r.selected && o ? (r.selected = !0, n.push(rn(r.id, !0))) : r.selected && !o && (r.selected = !1, n.push(rn(r.id, !1))), n;
  }, []);
}
const jl = (e, t) => (n) => {
  n.target === t.current && (e == null || e(n));
}, sS = (e) => ({
  userSelectionActive: e.userSelectionActive,
  elementsSelectable: e.elementsSelectable,
  dragging: e.paneDragging
}), Am = P.memo(({ isSelecting: e, selectionMode: t = Ko.Full, panOnDrag: n, onSelectionStart: r, onSelectionEnd: o, onPaneClick: i, onPaneContextMenu: s, onPaneScroll: l, onPaneMouseEnter: u, onPaneMouseMove: a, onPaneMouseLeave: c, children: f }) => {
  const d = P.useRef(null), m = Se(), w = P.useRef(0), y = P.useRef(0), k = P.useRef(), { userSelectionActive: p, elementsSelectable: h, dragging: g } = le(sS, Ne), v = () => {
    m.setState({ userSelectionActive: !1, userSelectionRect: null }), w.current = 0, y.current = 0;
  }, C = (V) => {
    i == null || i(V), m.getState().resetSelectedElements(), m.setState({ nodesSelectionActive: !1 });
  }, z = (V) => {
    if (Array.isArray(n) && (n != null && n.includes(2))) {
      V.preventDefault();
      return;
    }
    s == null || s(V);
  }, j = l ? (V) => l(V) : void 0, T = (V) => {
    const { resetSelectedElements: _, domNode: $ } = m.getState();
    if (k.current = $ == null ? void 0 : $.getBoundingClientRect(), !h || !e || V.button !== 0 || V.target !== d.current || !k.current)
      return;
    const { x: M, y: O } = vn(V, k.current);
    _(), m.setState({
      userSelectionRect: {
        width: 0,
        height: 0,
        startX: M,
        startY: O,
        x: M,
        y: O
      }
    }), r == null || r(V);
  }, S = (V) => {
    const { userSelectionRect: _, nodeInternals: $, edges: M, transform: O, onNodesChange: R, onEdgesChange: E, nodeOrigin: A, getNodes: F } = m.getState();
    if (!e || !k.current || !_)
      return;
    m.setState({ userSelectionActive: !0, nodesSelectionActive: !1 });
    const H = vn(V, k.current), U = _.startX ?? 0, b = _.startY ?? 0, Y = {
      ..._,
      x: H.x < U ? H.x : U,
      y: H.y < b ? H.y : b,
      width: Math.abs(H.x - U),
      height: Math.abs(H.y - b)
    }, Q = F(), Z = gm($, Y, O, t === Ko.Partial, !0, A), re = ym(Z, M).map((te) => te.id), ne = Z.map((te) => te.id);
    if (w.current !== ne.length) {
      w.current = ne.length;
      const te = xr(Q, ne);
      te.length && (R == null || R(te));
    }
    if (y.current !== re.length) {
      y.current = re.length;
      const te = xr(M, re);
      te.length && (E == null || E(te));
    }
    m.setState({
      userSelectionRect: Y
    });
  }, N = (V) => {
    if (V.button !== 0)
      return;
    const { userSelectionRect: _ } = m.getState();
    !p && _ && V.target === d.current && (C == null || C(V)), m.setState({ nodesSelectionActive: w.current > 0 }), v(), o == null || o(V);
  }, L = (V) => {
    p && (m.setState({ nodesSelectionActive: w.current > 0 }), o == null || o(V)), v();
  }, D = h && (e || p);
  return I.createElement(
    "div",
    { className: je(["react-flow__pane", { dragging: g, selection: e }]), onClick: D ? void 0 : jl(C, d), onContextMenu: jl(z, d), onWheel: jl(j, d), onMouseEnter: D ? void 0 : u, onMouseDown: D ? T : void 0, onMouseMove: D ? S : a, onMouseUp: D ? N : void 0, onMouseLeave: D ? L : c, ref: d, style: tc },
    f,
    I.createElement(rS, null)
  );
});
Am.displayName = "Pane";
function Im(e, t) {
  const n = e.parentNode || e.parentId;
  if (!n)
    return !1;
  const r = t.get(n);
  return r ? r.selected ? !0 : Im(r, t) : !1;
}
function Zf(e, t, n) {
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
function lS(e, t, n, r) {
  return Array.from(e.values()).filter((o) => (o.selected || o.id === r) && (!o.parentNode || o.parentId || !Im(o, e)) && (o.draggable || t && typeof o.draggable > "u")).map((o) => {
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
function uS(e, t) {
  return !t || t === "parent" ? t : [t[0], [t[1][0] - (e.width || 0), t[1][1] - (e.height || 0)]];
}
function Dm(e, t, n, r, o = [0, 0], i) {
  const s = uS(e, e.extent || r);
  let l = s;
  const u = e.parentNode || e.parentId;
  if (e.extent === "parent" && !e.expandParent)
    if (u && e.width && e.height) {
      const f = n.get(u), { x: d, y: m } = Bn(f, o).positionAbsolute;
      l = f && ut(d) && ut(m) && ut(f.width) && ut(f.height) ? [
        [d + e.width * o[0], m + e.height * o[1]],
        [
          d + f.width - e.width + e.width * o[0],
          m + f.height - e.height + e.height * o[1]
        ]
      ] : l;
    } else
      i == null || i("005", Gt.error005()), l = s;
  else if (e.extent && u && e.extent !== "parent") {
    const f = n.get(u), { x: d, y: m } = Bn(f, o).positionAbsolute;
    l = [
      [e.extent[0][0] + d, e.extent[0][1] + m],
      [e.extent[1][0] + d, e.extent[1][1] + m]
    ];
  }
  let a = { x: 0, y: 0 };
  if (u) {
    const f = n.get(u);
    a = Bn(f, o).positionAbsolute;
  }
  const c = l && l !== "parent" ? Xa(t, l) : t;
  return {
    position: {
      x: c.x - a.x,
      y: c.y - a.y
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
const qf = (e, t, n, r) => {
  const o = t.querySelectorAll(e);
  if (!o || !o.length)
    return null;
  const i = Array.from(o), s = t.getBoundingClientRect(), l = {
    x: s.width * r[0],
    y: s.height * r[1]
  };
  return i.map((u) => {
    const a = u.getBoundingClientRect();
    return {
      id: u.getAttribute("data-handleid"),
      position: u.getAttribute("data-handlepos"),
      x: (a.left - s.left - l.x) / n,
      y: (a.top - s.top - l.y) / n,
      ...Ya(u)
    };
  });
};
function so(e, t, n) {
  return n === void 0 ? n : (r) => {
    const o = t().nodeInternals.get(e);
    o && n(r, { ...o });
  };
}
function Bu({ id: e, store: t, unselect: n = !1, nodeRef: r }) {
  const { addSelectedNodes: o, unselectNodesAndEdges: i, multiSelectionActive: s, nodeInternals: l, onError: u } = t.getState(), a = l.get(e);
  if (!a) {
    u == null || u("012", Gt.error012(e));
    return;
  }
  t.setState({ nodesSelectionActive: !1 }), a.selected ? (n || a.selected && s) && (i({ nodes: [a], edges: [] }), requestAnimationFrame(() => {
    var c;
    return (c = r == null ? void 0 : r.current) == null ? void 0 : c.blur();
  })) : o([e]);
}
function aS() {
  const e = Se();
  return P.useCallback(({ sourceEvent: n }) => {
    const { transform: r, snapGrid: o, snapToGrid: i } = e.getState(), s = n.touches ? n.touches[0].clientX : n.clientX, l = n.touches ? n.touches[0].clientY : n.clientY, u = {
      x: (s - r[0]) / r[2],
      y: (l - r[1]) / r[2]
    };
    return {
      xSnapped: i ? o[0] * Math.round(u.x / o[0]) : u.x,
      ySnapped: i ? o[1] * Math.round(u.y / o[1]) : u.y,
      ...u
    };
  }, []);
}
function $l(e) {
  return (t, n, r) => e == null ? void 0 : e(t, r);
}
function Lm({ nodeRef: e, disabled: t = !1, noDragClassName: n, handleSelector: r, nodeId: o, isSelectable: i, selectNodesOnDrag: s }) {
  const l = Se(), [u, a] = P.useState(!1), c = P.useRef([]), f = P.useRef({ x: null, y: null }), d = P.useRef(0), m = P.useRef(null), w = P.useRef({ x: 0, y: 0 }), y = P.useRef(null), k = P.useRef(!1), p = P.useRef(!1), h = P.useRef(!1), g = aS();
  return P.useEffect(() => {
    if (e != null && e.current) {
      const v = st(e.current), C = ({ x: T, y: S }) => {
        const { nodeInternals: N, onNodeDrag: L, onSelectionDrag: D, updateNodePositions: V, nodeExtent: _, snapGrid: $, snapToGrid: M, nodeOrigin: O, onError: R } = l.getState();
        f.current = { x: T, y: S };
        let E = !1, A = { x: 0, y: 0, x2: 0, y2: 0 };
        if (c.current.length > 1 && _) {
          const H = Ks(c.current, O);
          A = Xo(H);
        }
        if (c.current = c.current.map((H) => {
          const U = { x: T - H.distance.x, y: S - H.distance.y };
          M && (U.x = $[0] * Math.round(U.x / $[0]), U.y = $[1] * Math.round(U.y / $[1]));
          const b = [
            [_[0][0], _[0][1]],
            [_[1][0], _[1][1]]
          ];
          c.current.length > 1 && _ && !H.extent && (b[0][0] = H.positionAbsolute.x - A.x + _[0][0], b[1][0] = H.positionAbsolute.x + (H.width ?? 0) - A.x2 + _[1][0], b[0][1] = H.positionAbsolute.y - A.y + _[0][1], b[1][1] = H.positionAbsolute.y + (H.height ?? 0) - A.y2 + _[1][1]);
          const Y = Dm(H, U, N, b, O, R);
          return E = E || H.position.x !== Y.position.x || H.position.y !== Y.position.y, H.position = Y.position, H.positionAbsolute = Y.positionAbsolute, H;
        }), !E)
          return;
        V(c.current, !0, !0), a(!0);
        const F = o ? L : $l(D);
        if (F && y.current) {
          const [H, U] = Rl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: N
          });
          F(y.current, H, U);
        }
      }, z = () => {
        if (!m.current)
          return;
        const [T, S] = im(w.current, m.current);
        if (T !== 0 || S !== 0) {
          const { transform: N, panBy: L } = l.getState();
          f.current.x = (f.current.x ?? 0) - T / N[2], f.current.y = (f.current.y ?? 0) - S / N[2], L({ x: T, y: S }) && C(f.current);
        }
        d.current = requestAnimationFrame(z);
      }, j = (T) => {
        var O;
        const { nodeInternals: S, multiSelectionActive: N, nodesDraggable: L, unselectNodesAndEdges: D, onNodeDragStart: V, onSelectionDragStart: _ } = l.getState();
        p.current = !0;
        const $ = o ? V : $l(_);
        (!s || !i) && !N && o && ((O = S.get(o)) != null && O.selected || D()), o && i && s && Bu({
          id: o,
          store: l,
          nodeRef: e
        });
        const M = g(T);
        if (f.current = M, c.current = lS(S, L, M, o), $ && c.current) {
          const [R, E] = Rl({
            nodeId: o,
            dragItems: c.current,
            nodeInternals: S
          });
          $(T.sourceEvent, R, E);
        }
      };
      if (t)
        v.on(".drag", null);
      else {
        const T = ww().on("start", (S) => {
          const { domNode: N, nodeDragThreshold: L } = l.getState();
          L === 0 && j(S), h.current = !1;
          const D = g(S);
          f.current = D, m.current = (N == null ? void 0 : N.getBoundingClientRect()) || null, w.current = vn(S.sourceEvent, m.current);
        }).on("drag", (S) => {
          var V, _;
          const N = g(S), { autoPanOnNodeDrag: L, nodeDragThreshold: D } = l.getState();
          if (S.sourceEvent.type === "touchmove" && S.sourceEvent.touches.length > 1 && (h.current = !0), !h.current) {
            if (!k.current && p.current && L && (k.current = !0, z()), !p.current) {
              const $ = N.xSnapped - (((V = f == null ? void 0 : f.current) == null ? void 0 : V.x) ?? 0), M = N.ySnapped - (((_ = f == null ? void 0 : f.current) == null ? void 0 : _.y) ?? 0);
              Math.sqrt($ * $ + M * M) > D && j(S);
            }
            (f.current.x !== N.xSnapped || f.current.y !== N.ySnapped) && c.current && p.current && (y.current = S.sourceEvent, w.current = vn(S.sourceEvent, m.current), C(N));
          }
        }).on("end", (S) => {
          if (!(!p.current || h.current) && (a(!1), k.current = !1, p.current = !1, cancelAnimationFrame(d.current), c.current)) {
            const { updateNodePositions: N, nodeInternals: L, onNodeDragStop: D, onSelectionDragStop: V } = l.getState(), _ = o ? D : $l(V);
            if (N(c.current, !1, !1), _) {
              const [$, M] = Rl({
                nodeId: o,
                dragItems: c.current,
                nodeInternals: L
              });
              _(S.sourceEvent, $, M);
            }
          }
        }).filter((S) => {
          const N = S.target;
          return !S.button && (!n || !Zf(N, `.${n}`, e)) && (!r || Zf(N, r, e));
        });
        return v.call(T), () => {
          v.on(".drag", null);
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
  ]), u;
}
function Om() {
  const e = Se();
  return P.useCallback((n) => {
    const { nodeInternals: r, nodeExtent: o, updateNodePositions: i, getNodes: s, snapToGrid: l, snapGrid: u, onError: a, nodesDraggable: c } = e.getState(), f = s().filter((h) => h.selected && (h.draggable || c && typeof h.draggable > "u")), d = l ? u[0] : 5, m = l ? u[1] : 5, w = n.isShiftPressed ? 4 : 1, y = n.x * d * w, k = n.y * m * w, p = f.map((h) => {
      if (h.positionAbsolute) {
        const g = { x: h.positionAbsolute.x + y, y: h.positionAbsolute.y + k };
        l && (g.x = u[0] * Math.round(g.x / u[0]), g.y = u[1] * Math.round(g.y / u[1]));
        const { positionAbsolute: v, position: C } = Dm(h, g, r, o, void 0, a);
        h.position = C, h.positionAbsolute = v;
      }
      return h;
    });
    i(p, !0, !1);
  }, []);
}
const zr = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
var lo = (e) => {
  const t = ({ id: n, type: r, data: o, xPos: i, yPos: s, xPosOrigin: l, yPosOrigin: u, selected: a, onClick: c, onMouseEnter: f, onMouseMove: d, onMouseLeave: m, onContextMenu: w, onDoubleClick: y, style: k, className: p, isDraggable: h, isSelectable: g, isConnectable: v, isFocusable: C, selectNodesOnDrag: z, sourcePosition: j, targetPosition: T, hidden: S, resizeObserver: N, dragHandle: L, zIndex: D, isParent: V, noDragClassName: _, noPanClassName: $, initialized: M, disableKeyboardA11y: O, ariaLabel: R, rfId: E, hasHandleBounds: A }) => {
    const F = Se(), H = P.useRef(null), U = P.useRef(null), b = P.useRef(j), Y = P.useRef(T), Q = P.useRef(r), Z = g || h || c || f || d || m, re = Om(), ne = so(n, F.getState, f), te = so(n, F.getState, d), Ce = so(n, F.getState, m), we = so(n, F.getState, w), Oe = so(n, F.getState, y), Re = (ie) => {
      const { nodeDragThreshold: G } = F.getState();
      if (g && (!z || !h || G > 0) && Bu({
        id: n,
        store: F,
        nodeRef: H
      }), c) {
        const Fe = F.getState().nodeInternals.get(n);
        Fe && c(ie, { ...Fe });
      }
    }, ge = (ie) => {
      if (!Lu(ie) && !O)
        if (am.includes(ie.key) && g) {
          const G = ie.key === "Escape";
          Bu({
            id: n,
            store: F,
            unselect: G,
            nodeRef: H
          });
        } else h && a && Object.prototype.hasOwnProperty.call(zr, ie.key) && (F.setState({
          ariaLiveMessage: `Moved selected node ${ie.key.replace("Arrow", "").toLowerCase()}. New position, x: ${~~i}, y: ${~~s}`
        }), re({
          x: zr[ie.key].x,
          y: zr[ie.key].y,
          isShiftPressed: ie.shiftKey
        }));
    };
    P.useEffect(() => () => {
      U.current && (N == null || N.unobserve(U.current), U.current = null);
    }, []), P.useEffect(() => {
      if (H.current && !S) {
        const ie = H.current;
        (!M || !A || U.current !== ie) && (U.current && (N == null || N.unobserve(U.current)), N == null || N.observe(ie), U.current = ie);
      }
    }, [S, M, A]), P.useEffect(() => {
      const ie = Q.current !== r, G = b.current !== j, Fe = Y.current !== T;
      H.current && (ie || G || Fe) && (ie && (Q.current = r), G && (b.current = j), Fe && (Y.current = T), F.getState().updateNodeDimensions([{ id: n, nodeElement: H.current, forceUpdate: !0 }]));
    }, [n, r, j, T]);
    const Qe = Lm({
      nodeRef: H,
      disabled: S || !h,
      noDragClassName: _,
      handleSelector: L,
      nodeId: n,
      isSelectable: g,
      selectNodesOnDrag: z
    });
    return S ? null : I.createElement(
      "div",
      { className: je([
        "react-flow__node",
        `react-flow__node-${r}`,
        {
          // this is overwritable by passing `nopan` as a class name
          [$]: h
        },
        p,
        {
          selected: a,
          selectable: g,
          parent: V,
          dragging: Qe
        }
      ]), ref: H, style: {
        zIndex: D,
        transform: `translate(${l}px,${u}px)`,
        pointerEvents: Z ? "all" : "none",
        visibility: M ? "visible" : "hidden",
        ...k
      }, "data-id": n, "data-testid": `rf__node-${n}`, onMouseEnter: ne, onMouseMove: te, onMouseLeave: Ce, onContextMenu: we, onClick: Re, onDoubleClick: Oe, onKeyDown: C ? ge : void 0, tabIndex: C ? 0 : void 0, role: C ? "button" : void 0, "aria-describedby": O ? void 0 : `${zm}-${E}`, "aria-label": R },
      I.createElement(
        S_,
        { value: n },
        I.createElement(e, { id: n, data: o, type: r, xPos: i, yPos: s, selected: a, isConnectable: v, sourcePosition: j, targetPosition: T, dragging: Qe, dragHandle: L, zIndex: D })
      )
    );
  };
  return t.displayName = "NodeWrapper", P.memo(t);
};
const cS = (e) => {
  const t = e.getNodes().filter((n) => n.selected);
  return {
    ...Ks(t, e.nodeOrigin),
    transformString: `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`,
    userSelectionActive: e.userSelectionActive
  };
};
function fS({ onSelectionContextMenu: e, noPanClassName: t, disableKeyboardA11y: n }) {
  const r = Se(), { width: o, height: i, x: s, y: l, transformString: u, userSelectionActive: a } = le(cS, Ne), c = Om(), f = P.useRef(null);
  if (P.useEffect(() => {
    var w;
    n || (w = f.current) == null || w.focus({
      preventScroll: !0
    });
  }, [n]), Lm({
    nodeRef: f
  }), a || !o || !i)
    return null;
  const d = e ? (w) => {
    const y = r.getState().getNodes().filter((k) => k.selected);
    e(w, y);
  } : void 0, m = (w) => {
    Object.prototype.hasOwnProperty.call(zr, w.key) && c({
      x: zr[w.key].x,
      y: zr[w.key].y,
      isShiftPressed: w.shiftKey
    });
  };
  return I.createElement(
    "div",
    { className: je(["react-flow__nodesselection", "react-flow__container", t]), style: {
      transform: u
    } },
    I.createElement("div", { ref: f, className: "react-flow__nodesselection-rect", onContextMenu: d, tabIndex: n ? void 0 : -1, onKeyDown: n ? void 0 : m, style: {
      width: o,
      height: i,
      top: l,
      left: s
    } })
  );
}
var dS = P.memo(fS);
const pS = (e) => e.nodesSelectionActive, Fm = ({ children: e, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, deleteKeyCode: l, onMove: u, onMoveStart: a, onMoveEnd: c, selectionKeyCode: f, selectionOnDrag: d, selectionMode: m, onSelectionStart: w, onSelectionEnd: y, multiSelectionKeyCode: k, panActivationKeyCode: p, zoomActivationKeyCode: h, elementsSelectable: g, zoomOnScroll: v, zoomOnPinch: C, panOnScroll: z, panOnScrollSpeed: j, panOnScrollMode: T, zoomOnDoubleClick: S, panOnDrag: N, defaultViewport: L, translateExtent: D, minZoom: V, maxZoom: _, preventScrolling: $, onSelectionContextMenu: M, noWheelClassName: O, noPanClassName: R, disableKeyboardA11y: E }) => {
  const A = le(pS), F = Go(f), H = Go(p), U = H || N, b = H || z, Y = F || d && U !== !0;
  return Z_({ deleteKeyCode: l, multiSelectionKeyCode: k }), I.createElement(
    tS,
    { onMove: u, onMoveStart: a, onMoveEnd: c, onPaneContextMenu: i, elementsSelectable: g, zoomOnScroll: v, zoomOnPinch: C, panOnScroll: b, panOnScrollSpeed: j, panOnScrollMode: T, zoomOnDoubleClick: S, panOnDrag: !F && U, defaultViewport: L, translateExtent: D, minZoom: V, maxZoom: _, zoomActivationKeyCode: h, preventScrolling: $, noWheelClassName: O, noPanClassName: R },
    I.createElement(
      Am,
      { onSelectionStart: w, onSelectionEnd: y, onPaneClick: t, onPaneMouseEnter: n, onPaneMouseMove: r, onPaneMouseLeave: o, onPaneContextMenu: i, onPaneScroll: s, panOnDrag: U, isSelecting: !!Y, selectionMode: m },
      e,
      A && I.createElement(dS, { onSelectionContextMenu: M, noPanClassName: R, disableKeyboardA11y: E })
    )
  );
};
Fm.displayName = "FlowRenderer";
var hS = P.memo(Fm);
function mS(e) {
  return le(P.useCallback((n) => e ? gm(n.nodeInternals, { x: 0, y: 0, width: n.width, height: n.height }, n.transform, !0) : n.getNodes(), [e]));
}
function gS(e) {
  const t = {
    input: lo(e.input || Nm),
    default: lo(e.default || Vu),
    output: lo(e.output || Mm),
    group: lo(e.group || Ja)
  }, n = {}, r = Object.keys(e).filter((o) => !["input", "default", "output", "group"].includes(o)).reduce((o, i) => (o[i] = lo(e[i] || Vu), o), n);
  return {
    ...t,
    ...r
  };
}
const yS = ({ x: e, y: t, width: n, height: r, origin: o }) => !n || !r ? { x: e, y: t } : o[0] < 0 || o[1] < 0 || o[0] > 1 || o[1] > 1 ? { x: e, y: t } : {
  x: e - n * o[0],
  y: t - r * o[1]
}, vS = (e) => ({
  nodesDraggable: e.nodesDraggable,
  nodesConnectable: e.nodesConnectable,
  nodesFocusable: e.nodesFocusable,
  elementsSelectable: e.elementsSelectable,
  updateNodeDimensions: e.updateNodeDimensions,
  onError: e.onError
}), Hm = (e) => {
  const { nodesDraggable: t, nodesConnectable: n, nodesFocusable: r, elementsSelectable: o, updateNodeDimensions: i, onError: s } = le(vS, Ne), l = mS(e.onlyRenderVisibleElements), u = P.useRef(), a = P.useMemo(() => {
    if (typeof ResizeObserver > "u")
      return null;
    const c = new ResizeObserver((f) => {
      const d = f.map((m) => ({
        id: m.target.getAttribute("data-id"),
        nodeElement: m.target,
        forceUpdate: !0
      }));
      i(d);
    });
    return u.current = c, c;
  }, []);
  return P.useEffect(() => () => {
    var c;
    (c = u == null ? void 0 : u.current) == null || c.disconnect();
  }, []), I.createElement("div", { className: "react-flow__nodes", style: tc }, l.map((c) => {
    var C, z, j;
    let f = c.type || "default";
    e.nodeTypes[f] || (s == null || s("003", Gt.error003(f)), f = "default");
    const d = e.nodeTypes[f] || e.nodeTypes.default, m = !!(c.draggable || t && typeof c.draggable > "u"), w = !!(c.selectable || o && typeof c.selectable > "u"), y = !!(c.connectable || n && typeof c.connectable > "u"), k = !!(c.focusable || r && typeof c.focusable > "u"), p = e.nodeExtent ? Xa(c.positionAbsolute, e.nodeExtent) : c.positionAbsolute, h = (p == null ? void 0 : p.x) ?? 0, g = (p == null ? void 0 : p.y) ?? 0, v = yS({
      x: h,
      y: g,
      width: c.width ?? 0,
      height: c.height ?? 0,
      origin: e.nodeOrigin
    });
    return I.createElement(d, { key: c.id, id: c.id, className: c.className, style: c.style, type: f, data: c.data, sourcePosition: c.sourcePosition || K.Bottom, targetPosition: c.targetPosition || K.Top, hidden: c.hidden, xPos: h, yPos: g, xPosOrigin: v.x, yPosOrigin: v.y, selectNodesOnDrag: e.selectNodesOnDrag, onClick: e.onNodeClick, onMouseEnter: e.onNodeMouseEnter, onMouseMove: e.onNodeMouseMove, onMouseLeave: e.onNodeMouseLeave, onContextMenu: e.onNodeContextMenu, onDoubleClick: e.onNodeDoubleClick, selected: !!c.selected, isDraggable: m, isSelectable: w, isConnectable: y, isFocusable: k, resizeObserver: a, dragHandle: c.dragHandle, zIndex: ((C = c[me]) == null ? void 0 : C.z) ?? 0, isParent: !!((z = c[me]) != null && z.isParent), noDragClassName: e.noDragClassName, noPanClassName: e.noPanClassName, initialized: !!c.width && !!c.height, rfId: e.rfId, disableKeyboardA11y: e.disableKeyboardA11y, ariaLabel: c.ariaLabel, hasHandleBounds: !!((j = c[me]) != null && j.handleBounds) });
  }));
};
Hm.displayName = "NodeRenderer";
var wS = P.memo(Hm);
const xS = (e, t, n) => n === K.Left ? e - t : n === K.Right ? e + t : e, _S = (e, t, n) => n === K.Top ? e - t : n === K.Bottom ? e + t : e, Jf = "react-flow__edgeupdater", ed = ({ position: e, centerX: t, centerY: n, radius: r = 10, onMouseDown: o, onMouseEnter: i, onMouseOut: s, type: l }) => I.createElement("circle", { onMouseDown: o, onMouseEnter: i, onMouseOut: s, className: je([Jf, `${Jf}-${l}`]), cx: xS(t, r, e), cy: _S(n, r, e), r, stroke: "transparent", fill: "transparent" }), SS = () => !0;
var lr = (e) => {
  const t = ({ id: n, className: r, type: o, data: i, onClick: s, onEdgeDoubleClick: l, selected: u, animated: a, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: m, labelBgPadding: w, labelBgBorderRadius: y, style: k, source: p, target: h, sourceX: g, sourceY: v, targetX: C, targetY: z, sourcePosition: j, targetPosition: T, elementsSelectable: S, hidden: N, sourceHandleId: L, targetHandleId: D, onContextMenu: V, onMouseEnter: _, onMouseMove: $, onMouseLeave: M, reconnectRadius: O, onReconnect: R, onReconnectStart: E, onReconnectEnd: A, markerEnd: F, markerStart: H, rfId: U, ariaLabel: b, isFocusable: Y, isReconnectable: Q, pathOptions: Z, interactionWidth: re, disableKeyboardA11y: ne }) => {
    const te = P.useRef(null), [Ce, we] = P.useState(!1), [Oe, Re] = P.useState(!1), ge = Se(), Qe = P.useMemo(() => `url('#${Fu(H, U)}')`, [H, U]), ie = P.useMemo(() => `url('#${Fu(F, U)}')`, [F, U]);
    if (N)
      return null;
    const G = ($e) => {
      var Et;
      const { edges: pt, addSelectedEdges: Cn, unselectNodesAndEdges: Mn, multiSelectionActive: Pn } = ge.getState(), It = pt.find((Xr) => Xr.id === n);
      It && (S && (ge.setState({ nodesSelectionActive: !1 }), It.selected && Pn ? (Mn({ nodes: [], edges: [It] }), (Et = te.current) == null || Et.blur()) : Cn([n])), s && s($e, It));
    }, Fe = io(n, ge.getState, l), $t = io(n, ge.getState, V), Wr = io(n, ge.getState, _), qn = io(n, ge.getState, $), Jn = io(n, ge.getState, M), At = ($e, pt) => {
      if ($e.button !== 0)
        return;
      const { edges: Cn, isValidConnection: Mn } = ge.getState(), Pn = pt ? h : p, It = (pt ? D : L) || null, Et = pt ? "target" : "source", Xr = Mn || SS, Gs = pt, Kr = Cn.find((zn) => zn.id === n);
      Re(!0), E == null || E($e, Kr, Et);
      const Qs = (zn) => {
        Re(!1), A == null || A(zn, Kr, Et);
      };
      _m({
        event: $e,
        handleId: It,
        nodeId: Pn,
        onConnect: (zn) => R == null ? void 0 : R(Kr, zn),
        isTarget: Gs,
        getState: ge.getState,
        setState: ge.setState,
        isValidConnection: Xr,
        edgeUpdaterType: Et,
        onReconnectEnd: Qs
      });
    }, er = ($e) => At($e, !0), En = ($e) => At($e, !1), Nn = () => we(!0), tr = () => we(!1), nr = !S && !s, Yr = ($e) => {
      var pt;
      if (!ne && am.includes($e.key) && S) {
        const { unselectNodesAndEdges: Cn, addSelectedEdges: Mn, edges: Pn } = ge.getState();
        $e.key === "Escape" ? ((pt = te.current) == null || pt.blur(), Cn({ edges: [Pn.find((Et) => Et.id === n)] })) : Mn([n]);
      }
    };
    return I.createElement(
      "g",
      { className: je([
        "react-flow__edge",
        `react-flow__edge-${o}`,
        r,
        { selected: u, animated: a, inactive: nr, updating: Ce }
      ]), onClick: G, onDoubleClick: Fe, onContextMenu: $t, onMouseEnter: Wr, onMouseMove: qn, onMouseLeave: Jn, onKeyDown: Y ? Yr : void 0, tabIndex: Y ? 0 : void 0, role: Y ? "button" : "img", "data-testid": `rf__edge-${n}`, "aria-label": b === null ? void 0 : b || `Edge from ${p} to ${h}`, "aria-describedby": Y ? `${Tm}-${U}` : void 0, ref: te },
      !Oe && I.createElement(e, { id: n, source: p, target: h, selected: u, animated: a, label: c, labelStyle: f, labelShowBg: d, labelBgStyle: m, labelBgPadding: w, labelBgBorderRadius: y, data: i, style: k, sourceX: g, sourceY: v, targetX: C, targetY: z, sourcePosition: j, targetPosition: T, sourceHandleId: L, targetHandleId: D, markerStart: Qe, markerEnd: ie, pathOptions: Z, interactionWidth: re }),
      Q && I.createElement(
        I.Fragment,
        null,
        (Q === "source" || Q === !0) && I.createElement(ed, { position: j, centerX: g, centerY: v, radius: O, onMouseDown: er, onMouseEnter: Nn, onMouseOut: tr, type: "source" }),
        (Q === "target" || Q === !0) && I.createElement(ed, { position: T, centerX: C, centerY: z, radius: O, onMouseDown: En, onMouseEnter: Nn, onMouseOut: tr, type: "target" })
      )
    );
  };
  return t.displayName = "EdgeWrapper", P.memo(t);
};
function kS(e) {
  const t = {
    default: lr(e.default || Es),
    straight: lr(e.bezier || Qa),
    step: lr(e.step || Ga),
    smoothstep: lr(e.step || Xs),
    simplebezier: lr(e.simplebezier || Ka)
  }, n = {}, r = Object.keys(e).filter((o) => !["default", "bezier"].includes(o)).reduce((o, i) => (o[i] = lr(e[i] || Es), o), n);
  return {
    ...t,
    ...r
  };
}
function td(e, t, n = null) {
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
function nd(e, t) {
  return e ? e.length === 1 || !t ? e[0] : t && e.find((n) => n.id === t) || null : null;
}
const ES = (e, t, n, r, o, i) => {
  const s = td(n, e, t), l = td(i, r, o);
  return {
    sourceX: s.x,
    sourceY: s.y,
    targetX: l.x,
    targetY: l.y
  };
};
function NS({ sourcePos: e, targetPos: t, sourceWidth: n, sourceHeight: r, targetWidth: o, targetHeight: i, width: s, height: l, transform: u }) {
  const a = {
    x: Math.min(e.x, t.x),
    y: Math.min(e.y, t.y),
    x2: Math.max(e.x + n, t.x + o),
    y2: Math.max(e.y + r, t.y + i)
  };
  a.x === a.x2 && (a.x2 += 1), a.y === a.y2 && (a.y2 += 1);
  const c = Xo({
    x: (0 - u[0]) / u[2],
    y: (0 - u[1]) / u[2],
    width: s / u[2],
    height: l / u[2]
  }), f = Math.max(0, Math.min(c.x2, a.x2) - Math.max(c.x, a.x)), d = Math.max(0, Math.min(c.y2, a.y2) - Math.max(c.y, a.y));
  return Math.ceil(f * d) > 0;
}
function rd(e) {
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
const CS = [{ level: 0, isMaxLevel: !0, edges: [] }];
function MS(e, t, n = !1) {
  let r = -1;
  const o = e.reduce((s, l) => {
    var c, f;
    const u = ut(l.zIndex);
    let a = u ? l.zIndex : 0;
    if (n) {
      const d = t.get(l.target), m = t.get(l.source), w = l.selected || (d == null ? void 0 : d.selected) || (m == null ? void 0 : m.selected), y = Math.max(((c = m == null ? void 0 : m[me]) == null ? void 0 : c.z) || 0, ((f = d == null ? void 0 : d[me]) == null ? void 0 : f.z) || 0, 1e3);
      a = (u ? l.zIndex : 0) + (w ? y : 0);
    }
    return s[a] ? s[a].push(l) : s[a] = [l], r = a > r ? a : r, s;
  }, {}), i = Object.entries(o).map(([s, l]) => {
    const u = +s;
    return {
      edges: l,
      level: u,
      isMaxLevel: u === r
    };
  });
  return i.length === 0 ? CS : i;
}
function PS(e, t, n) {
  const r = le(P.useCallback((o) => e ? o.edges.filter((i) => {
    const s = t.get(i.source), l = t.get(i.target);
    return (s == null ? void 0 : s.width) && (s == null ? void 0 : s.height) && (l == null ? void 0 : l.width) && (l == null ? void 0 : l.height) && NS({
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
  return MS(r, t, n);
}
const zS = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", points: "-5,-4 0,0 -5,4" }), TS = ({ color: e = "none", strokeWidth: t = 1 }) => I.createElement("polyline", { style: {
  stroke: e,
  fill: e,
  strokeWidth: t
}, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" }), od = {
  [ks.Arrow]: zS,
  [ks.ArrowClosed]: TS
};
function jS(e) {
  const t = Se();
  return P.useMemo(() => {
    var o, i;
    return Object.prototype.hasOwnProperty.call(od, e) ? od[e] : ((i = (o = t.getState()).onError) == null || i.call(o, "009", Gt.error009(e)), null);
  }, [e]);
}
const RS = ({ id: e, type: t, color: n, width: r = 12.5, height: o = 12.5, markerUnits: i = "strokeWidth", strokeWidth: s, orient: l = "auto-start-reverse" }) => {
  const u = jS(t);
  return u ? I.createElement(
    "marker",
    { className: "react-flow__arrowhead", id: e, markerWidth: `${r}`, markerHeight: `${o}`, viewBox: "-10 -10 20 20", markerUnits: i, orient: l, refX: "0", refY: "0" },
    I.createElement(u, { color: n, strokeWidth: s })
  ) : null;
}, $S = ({ defaultColor: e, rfId: t }) => (n) => {
  const r = [];
  return n.edges.reduce((o, i) => ([i.markerStart, i.markerEnd].forEach((s) => {
    if (s && typeof s == "object") {
      const l = Fu(s, t);
      r.includes(l) || (o.push({ id: l, color: s.color || e, ...s }), r.push(l));
    }
  }), o), []).sort((o, i) => String(o && o.id || '').localeCompare(String(i && i.id || '')));
}, Vm = ({ defaultColor: e, rfId: t }) => {
  const n = le(
    P.useCallback($S({ defaultColor: e, rfId: t }), [e, t]),
    // the id includes all marker options, so we just need to look at that part of the marker
    (r, o) => !(r.length !== o.length || r.some((i, s) => i.id !== o[s].id))
  );
  return I.createElement("defs", null, n.map((r) => I.createElement(RS, { id: r.id, key: r.id, type: r.type, color: r.color, width: r.width, height: r.height, markerUnits: r.markerUnits, strokeWidth: r.strokeWidth, orient: r.orient })));
};
Vm.displayName = "MarkerDefinitions";
var AS = P.memo(Vm);
const IS = (e) => ({
  nodesConnectable: e.nodesConnectable,
  edgesFocusable: e.edgesFocusable,
  edgesUpdatable: e.edgesUpdatable,
  elementsSelectable: e.elementsSelectable,
  width: e.width,
  height: e.height,
  connectionMode: e.connectionMode,
  nodeInternals: e.nodeInternals,
  onError: e.onError
}), Bm = ({ defaultMarkerColor: e, onlyRenderVisibleElements: t, elevateEdgesOnSelect: n, rfId: r, edgeTypes: o, noPanClassName: i, onEdgeContextMenu: s, onEdgeMouseEnter: l, onEdgeMouseMove: u, onEdgeMouseLeave: a, onEdgeClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: m, onReconnectEnd: w, reconnectRadius: y, children: k, disableKeyboardA11y: p }) => {
  const { edgesFocusable: h, edgesUpdatable: g, elementsSelectable: v, width: C, height: z, connectionMode: j, nodeInternals: T, onError: S } = le(IS, Ne), N = PS(t, T, n);
  return C ? I.createElement(
    I.Fragment,
    null,
    N.map(({ level: L, edges: D, isMaxLevel: V }) => I.createElement(
      "svg",
      { key: L, style: { zIndex: L }, width: C, height: z, className: "react-flow__edges react-flow__container" },
      V && I.createElement(AS, { defaultColor: e, rfId: r }),
      I.createElement("g", null, D.map((_) => {
        const [$, M, O] = rd(T.get(_.source)), [R, E, A] = rd(T.get(_.target));
        if (!O || !A)
          return null;
        let F = _.type || "default";
        o[F] || (S == null || S("011", Gt.error011(F)), F = "default");
        const H = o[F] || o.default, U = j === Gn.Strict ? E.target : (E.target ?? []).concat(E.source ?? []), b = nd(M.source, _.sourceHandle), Y = nd(U, _.targetHandle), Q = (b == null ? void 0 : b.position) || K.Bottom, Z = (Y == null ? void 0 : Y.position) || K.Top, re = !!(_.focusable || h && typeof _.focusable > "u"), ne = _.reconnectable || _.updatable, te = typeof d < "u" && (ne || g && typeof ne > "u");
        if (!b || !Y)
          return S == null || S("008", Gt.error008(b, _)), null;
        const { sourceX: Ce, sourceY: we, targetX: Oe, targetY: Re } = ES($, b, Q, R, Y, Z);
        return I.createElement(H, { key: _.id, id: _.id, className: je([_.className, i]), type: F, data: _.data, selected: !!_.selected, animated: !!_.animated, hidden: !!_.hidden, label: _.label, labelStyle: _.labelStyle, labelShowBg: _.labelShowBg, labelBgStyle: _.labelBgStyle, labelBgPadding: _.labelBgPadding, labelBgBorderRadius: _.labelBgBorderRadius, style: _.style, source: _.source, target: _.target, sourceHandleId: _.sourceHandle, targetHandleId: _.targetHandle, markerEnd: _.markerEnd, markerStart: _.markerStart, sourceX: Ce, sourceY: we, targetX: Oe, targetY: Re, sourcePosition: Q, targetPosition: Z, elementsSelectable: v, onContextMenu: s, onMouseEnter: l, onMouseMove: u, onMouseLeave: a, onClick: c, onEdgeDoubleClick: f, onReconnect: d, onReconnectStart: m, onReconnectEnd: w, reconnectRadius: y, rfId: r, ariaLabel: _.ariaLabel, isFocusable: re, isReconnectable: te, pathOptions: "pathOptions" in _ ? _.pathOptions : void 0, interactionWidth: _.interactionWidth, disableKeyboardA11y: p });
      }))
    )),
    k
  ) : null;
};
Bm.displayName = "EdgeRenderer";
var DS = P.memo(Bm);
const LS = (e) => `translate(${e.transform[0]}px,${e.transform[1]}px) scale(${e.transform[2]})`;
function OS({ children: e }) {
  const t = le(LS);
  return I.createElement("div", { className: "react-flow__viewport react-flow__container", style: { transform: t } }, e);
}
function FS(e) {
  const t = ec(), n = P.useRef(!1);
  P.useEffect(() => {
    !n.current && t.viewportInitialized && e && (setTimeout(() => e(t), 1), n.current = !0);
  }, [e, t.viewportInitialized]);
}
const HS = {
  [K.Left]: K.Right,
  [K.Right]: K.Left,
  [K.Top]: K.Bottom,
  [K.Bottom]: K.Top
}, bm = ({ nodeId: e, handleType: t, style: n, type: r = ln.Bezier, CustomComponent: o, connectionStatus: i }) => {
  var z, j, T;
  const { fromNode: s, handleId: l, toX: u, toY: a, connectionMode: c } = le(P.useCallback((S) => ({
    fromNode: S.nodeInternals.get(e),
    handleId: S.connectionHandleId,
    toX: (S.connectionPosition.x - S.transform[0]) / S.transform[2],
    toY: (S.connectionPosition.y - S.transform[1]) / S.transform[2],
    connectionMode: S.connectionMode
  }), [e]), Ne), f = (z = s == null ? void 0 : s[me]) == null ? void 0 : z.handleBounds;
  let d = f == null ? void 0 : f[t];
  if (c === Gn.Loose && (d = d || (f == null ? void 0 : f[t === "source" ? "target" : "source"])), !s || !d)
    return null;
  const m = l ? d.find((S) => S.id === l) : d[0], w = m ? m.x + m.width / 2 : (s.width ?? 0) / 2, y = m ? m.y + m.height / 2 : s.height ?? 0, k = (((j = s.positionAbsolute) == null ? void 0 : j.x) ?? 0) + w, p = (((T = s.positionAbsolute) == null ? void 0 : T.y) ?? 0) + y, h = m == null ? void 0 : m.position, g = h ? HS[h] : null;
  if (!h || !g)
    return null;
  if (o)
    return I.createElement(o, { connectionLineType: r, connectionLineStyle: n, fromNode: s, fromHandle: m, fromX: k, fromY: p, toX: u, toY: a, fromPosition: h, toPosition: g, connectionStatus: i });
  let v = "";
  const C = {
    sourceX: k,
    sourceY: p,
    sourcePosition: h,
    targetX: u,
    targetY: a,
    targetPosition: g
  };
  return r === ln.Bezier ? [v] = hm(C) : r === ln.Step ? [v] = Ou({
    ...C,
    borderRadius: 0
  }) : r === ln.SmoothStep ? [v] = Ou(C) : r === ln.SimpleBezier ? [v] = pm(C) : v = `M${k},${p} ${u},${a}`, I.createElement("path", { d: v, fill: "none", className: "react-flow__connection-path", style: n });
};
bm.displayName = "ConnectionLine";
const VS = (e) => ({
  nodeId: e.connectionNodeId,
  handleType: e.connectionHandleType,
  nodesConnectable: e.nodesConnectable,
  connectionStatus: e.connectionStatus,
  width: e.width,
  height: e.height
});
function BS({ containerStyle: e, style: t, type: n, component: r }) {
  const { nodeId: o, handleType: i, nodesConnectable: s, width: l, height: u, connectionStatus: a } = le(VS, Ne);
  return !(o && i && l && s) ? null : I.createElement(
    "svg",
    { style: e, width: l, height: u, className: "react-flow__edges react-flow__connectionline react-flow__container" },
    I.createElement(
      "g",
      { className: je(["react-flow__connection", a]) },
      I.createElement(bm, { nodeId: o, handleType: i, style: t, type: n, CustomComponent: r, connectionStatus: a })
    )
  );
}
function id(e, t) {
  return P.useRef(null), Se(), P.useMemo(() => t(e), [e]);
}
const Um = ({ nodeTypes: e, edgeTypes: t, onMove: n, onMoveStart: r, onMoveEnd: o, onInit: i, onNodeClick: s, onEdgeClick: l, onNodeDoubleClick: u, onEdgeDoubleClick: a, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: m, onSelectionContextMenu: w, onSelectionStart: y, onSelectionEnd: k, connectionLineType: p, connectionLineStyle: h, connectionLineComponent: g, connectionLineContainerStyle: v, selectionKeyCode: C, selectionOnDrag: z, selectionMode: j, multiSelectionKeyCode: T, panActivationKeyCode: S, zoomActivationKeyCode: N, deleteKeyCode: L, onlyRenderVisibleElements: D, elementsSelectable: V, selectNodesOnDrag: _, defaultViewport: $, translateExtent: M, minZoom: O, maxZoom: R, preventScrolling: E, defaultMarkerColor: A, zoomOnScroll: F, zoomOnPinch: H, panOnScroll: U, panOnScrollSpeed: b, panOnScrollMode: Y, zoomOnDoubleClick: Q, panOnDrag: Z, onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: Ce, onPaneScroll: we, onPaneContextMenu: Oe, onEdgeContextMenu: Re, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: $t, reconnectRadius: Wr, noDragClassName: qn, noWheelClassName: Jn, noPanClassName: At, elevateEdgesOnSelect: er, disableKeyboardA11y: En, nodeOrigin: Nn, nodeExtent: tr, rfId: nr }) => {
  const Yr = id(e, gS), $e = id(t, kS);
  return FS(i), I.createElement(
    hS,
    { onPaneClick: re, onPaneMouseEnter: ne, onPaneMouseMove: te, onPaneMouseLeave: Ce, onPaneContextMenu: Oe, onPaneScroll: we, deleteKeyCode: L, selectionKeyCode: C, selectionOnDrag: z, selectionMode: j, onSelectionStart: y, onSelectionEnd: k, multiSelectionKeyCode: T, panActivationKeyCode: S, zoomActivationKeyCode: N, elementsSelectable: V, onMove: n, onMoveStart: r, onMoveEnd: o, zoomOnScroll: F, zoomOnPinch: H, zoomOnDoubleClick: Q, panOnScroll: U, panOnScrollSpeed: b, panOnScrollMode: Y, panOnDrag: Z, defaultViewport: $, translateExtent: M, minZoom: O, maxZoom: R, onSelectionContextMenu: w, preventScrolling: E, noDragClassName: qn, noWheelClassName: Jn, noPanClassName: At, disableKeyboardA11y: En },
    I.createElement(
      OS,
      null,
      I.createElement(
        DS,
        { edgeTypes: $e, onEdgeClick: l, onEdgeDoubleClick: a, onlyRenderVisibleElements: D, onEdgeContextMenu: Re, onEdgeMouseEnter: ge, onEdgeMouseMove: Qe, onEdgeMouseLeave: ie, onReconnect: G, onReconnectStart: Fe, onReconnectEnd: $t, reconnectRadius: Wr, defaultMarkerColor: A, noPanClassName: At, elevateEdgesOnSelect: !!er, disableKeyboardA11y: En, rfId: nr },
        I.createElement(BS, { style: h, type: p, component: g, containerStyle: v })
      ),
      I.createElement("div", { className: "react-flow__edgelabel-renderer" }),
      I.createElement(wS, { nodeTypes: Yr, onNodeClick: s, onNodeDoubleClick: u, onNodeMouseEnter: c, onNodeMouseMove: f, onNodeMouseLeave: d, onNodeContextMenu: m, selectNodesOnDrag: _, onlyRenderVisibleElements: D, noPanClassName: At, noDragClassName: qn, disableKeyboardA11y: En, nodeOrigin: Nn, nodeExtent: tr, rfId: nr })
    )
  );
};
Um.displayName = "GraphView";
var bS = P.memo(Um);
const bu = [
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
  translateExtent: bu,
  nodeExtent: bu,
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
  onError: g_,
  isValidConnection: void 0
}, US = () => jv((e, t) => ({
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
    const { onNodesChange: r, nodeInternals: o, fitViewOnInit: i, fitViewOnInitDone: s, fitViewOnInitOptions: l, domNode: u, nodeOrigin: a } = t(), c = u == null ? void 0 : u.querySelector(".react-flow__viewport");
    if (!c)
      return;
    const f = window.getComputedStyle(c), { m22: d } = new window.DOMMatrixReadOnly(f.transform), m = n.reduce((y, k) => {
      const p = o.get(k.id);
      if (p != null && p.hidden)
        o.set(p.id, {
          ...p,
          [me]: {
            ...p[me],
            // we need to reset the handle bounds when the node is hidden
            // in order to force a new observation when the node is shown again
            handleBounds: void 0
          }
        });
      else if (p) {
        const h = Ya(k.nodeElement);
        !!(h.width && h.height && (p.width !== h.width || p.height !== h.height || k.forceUpdate)) && (o.set(p.id, {
          ...p,
          [me]: {
            ...p[me],
            handleBounds: {
              source: qf(".source", k.nodeElement, d, a),
              target: qf(".target", k.nodeElement, d, a)
            }
          },
          ...h
        }), y.push({
          id: p.id,
          type: "dimensions",
          dimensions: h
        }));
      }
      return y;
    }, []);
    Rm(o, a);
    const w = s || i && !s && $m(t, { initial: !0, ...l });
    e({ nodeInternals: new Map(o), fitViewOnInitDone: w }), (m == null ? void 0 : m.length) > 0 && (r == null || r(m));
  },
  updateNodePositions: (n, r = !0, o = !1) => {
    const { triggerNodeChanges: i } = t(), s = n.map((l) => {
      const u = {
        id: l.id,
        type: "position",
        dragging: o
      };
      return r && (u.positionAbsolute = l.positionAbsolute, u.position = l.position), u;
    });
    i(s);
  },
  triggerNodeChanges: (n) => {
    const { onNodesChange: r, nodeInternals: o, hasDefaultNodes: i, nodeOrigin: s, getNodes: l, elevateNodesOnSelect: u } = t();
    if (n != null && n.length) {
      if (i) {
        const a = iS(n, l()), c = Tl(a, o, s, u);
        e({ nodeInternals: c });
      }
      r == null || r(n);
    }
  },
  addSelectedNodes: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((u) => rn(u, !0)) : (s = xr(i(), n), l = xr(o, [])), Pi({
      changedNodes: s,
      changedEdges: l,
      get: t,
      set: e
    });
  },
  addSelectedEdges: (n) => {
    const { multiSelectionActive: r, edges: o, getNodes: i } = t();
    let s, l = null;
    r ? s = n.map((u) => rn(u, !0)) : (s = xr(o, n), l = xr(i(), [])), Pi({
      changedNodes: l,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  unselectNodesAndEdges: ({ nodes: n, edges: r } = {}) => {
    const { edges: o, getNodes: i } = t(), s = n || i(), l = r || o, u = s.map((c) => (c.selected = !1, rn(c.id, !1))), a = l.map((c) => rn(c.id, !1));
    Pi({
      changedNodes: u,
      changedEdges: a,
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
    Pi({
      changedNodes: i,
      changedEdges: s,
      get: t,
      set: e
    });
  },
  setNodeExtent: (n) => {
    const { nodeInternals: r } = t();
    r.forEach((o) => {
      o.positionAbsolute = Xa(o.position, n);
    }), e({
      nodeExtent: n,
      nodeInternals: new Map(r)
    });
  },
  panBy: (n) => {
    const { transform: r, width: o, height: i, d3Zoom: s, d3Selection: l, translateExtent: u } = t();
    if (!s || !l || !n.x && !n.y)
      return !1;
    const a = bt.translate(r[0] + n.x, r[1] + n.y).scale(r[2]), c = [
      [0, 0],
      [o, i]
    ], f = s == null ? void 0 : s.constrain()(a, c, u);
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
}), Object.is), nc = ({ children: e }) => {
  const t = P.useRef(null);
  return t.current || (t.current = US()), I.createElement(a_, { value: t.current }, e);
};
nc.displayName = "ReactFlowProvider";
const Wm = ({ children: e }) => P.useContext(Ys) ? I.createElement(I.Fragment, null, e) : I.createElement(nc, null, e);
Wm.displayName = "ReactFlowWrapper";
const WS = {
  input: Nm,
  default: Vu,
  output: Mm,
  group: Ja
}, YS = {
  default: Es,
  straight: Qa,
  step: Ga,
  smoothstep: Xs,
  simplebezier: Ka
}, XS = [0, 0], KS = [15, 15], GS = { x: 0, y: 0, zoom: 1 }, QS = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  zIndex: 0
}, Ym = P.forwardRef(({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, className: o, nodeTypes: i = WS, edgeTypes: s = YS, onNodeClick: l, onEdgeClick: u, onInit: a, onMove: c, onMoveStart: f, onMoveEnd: d, onConnect: m, onConnectStart: w, onConnectEnd: y, onClickConnectStart: k, onClickConnectEnd: p, onNodeMouseEnter: h, onNodeMouseMove: g, onNodeMouseLeave: v, onNodeContextMenu: C, onNodeDoubleClick: z, onNodeDragStart: j, onNodeDrag: T, onNodeDragStop: S, onNodesDelete: N, onEdgesDelete: L, onSelectionChange: D, onSelectionDragStart: V, onSelectionDrag: _, onSelectionDragStop: $, onSelectionContextMenu: M, onSelectionStart: O, onSelectionEnd: R, connectionMode: E = Gn.Strict, connectionLineType: A = ln.Bezier, connectionLineStyle: F, connectionLineComponent: H, connectionLineContainerStyle: U, deleteKeyCode: b = "Backspace", selectionKeyCode: Y = "Shift", selectionOnDrag: Q = !1, selectionMode: Z = Ko.Full, panActivationKeyCode: re = "Space", multiSelectionKeyCode: ne = Ss() ? "Meta" : "Control", zoomActivationKeyCode: te = Ss() ? "Meta" : "Control", snapToGrid: Ce = !1, snapGrid: we = KS, onlyRenderVisibleElements: Oe = !1, selectNodesOnDrag: Re = !0, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, nodeOrigin: G = XS, edgesFocusable: Fe, edgesUpdatable: $t, elementsSelectable: Wr, defaultViewport: qn = GS, minZoom: Jn = 0.5, maxZoom: At = 2, translateExtent: er = bu, preventScrolling: En = !0, nodeExtent: Nn, defaultMarkerColor: tr = "#b1b1b7", zoomOnScroll: nr = !0, zoomOnPinch: Yr = !0, panOnScroll: $e = !1, panOnScrollSpeed: pt = 0.5, panOnScrollMode: Cn = On.Free, zoomOnDoubleClick: Mn = !0, panOnDrag: Pn = !0, onPaneClick: It, onPaneMouseEnter: Et, onPaneMouseMove: Xr, onPaneMouseLeave: Gs, onPaneScroll: Kr, onPaneContextMenu: Qs, children: rc, onEdgeContextMenu: zn, onEdgeDoubleClick: tg, onEdgeMouseEnter: ng, onEdgeMouseMove: rg, onEdgeMouseLeave: og, onEdgeUpdate: ig, onEdgeUpdateStart: sg, onEdgeUpdateEnd: lg, onReconnect: ug, onReconnectStart: ag, onReconnectEnd: cg, reconnectRadius: fg = 10, edgeUpdaterRadius: dg = 10, onNodesChange: pg, onEdgesChange: hg, noDragClassName: mg = "nodrag", noWheelClassName: gg = "nowheel", noPanClassName: oc = "nopan", fitView: yg = !1, fitViewOptions: vg, connectOnClick: wg = !0, attributionPosition: xg, proOptions: _g, defaultEdgeOptions: Sg, elevateNodesOnSelect: kg = !0, elevateEdgesOnSelect: Eg = !1, disableKeyboardA11y: ic = !1, autoPanOnConnect: Ng = !0, autoPanOnNodeDrag: Cg = !0, connectionRadius: Mg = 20, isValidConnection: Pg, onError: zg, style: Tg, id: sc, nodeDragThreshold: jg, ...Rg }, $g) => {
  const Zs = sc || "1";
  return I.createElement(
    "div",
    { ...Rg, style: { ...Tg, ...QS }, ref: $g, className: je(["react-flow", o]), "data-testid": "rf__wrapper", id: sc },
    I.createElement(
      Wm,
      null,
      I.createElement(bS, { onInit: a, onMove: c, onMoveStart: f, onMoveEnd: d, onNodeClick: l, onEdgeClick: u, onNodeMouseEnter: h, onNodeMouseMove: g, onNodeMouseLeave: v, onNodeContextMenu: C, onNodeDoubleClick: z, nodeTypes: i, edgeTypes: s, connectionLineType: A, connectionLineStyle: F, connectionLineComponent: H, connectionLineContainerStyle: U, selectionKeyCode: Y, selectionOnDrag: Q, selectionMode: Z, deleteKeyCode: b, multiSelectionKeyCode: ne, panActivationKeyCode: re, zoomActivationKeyCode: te, onlyRenderVisibleElements: Oe, selectNodesOnDrag: Re, defaultViewport: qn, translateExtent: er, minZoom: Jn, maxZoom: At, preventScrolling: En, zoomOnScroll: nr, zoomOnPinch: Yr, zoomOnDoubleClick: Mn, panOnScroll: $e, panOnScrollSpeed: pt, panOnScrollMode: Cn, panOnDrag: Pn, onPaneClick: It, onPaneMouseEnter: Et, onPaneMouseMove: Xr, onPaneMouseLeave: Gs, onPaneScroll: Kr, onPaneContextMenu: Qs, onSelectionContextMenu: M, onSelectionStart: O, onSelectionEnd: R, onEdgeContextMenu: zn, onEdgeDoubleClick: tg, onEdgeMouseEnter: ng, onEdgeMouseMove: rg, onEdgeMouseLeave: og, onReconnect: ug ?? ig, onReconnectStart: ag ?? sg, onReconnectEnd: cg ?? lg, reconnectRadius: fg ?? dg, defaultMarkerColor: tr, noDragClassName: mg, noWheelClassName: gg, noPanClassName: oc, elevateEdgesOnSelect: Eg, rfId: Zs, disableKeyboardA11y: ic, nodeOrigin: G, nodeExtent: Nn }),
      I.createElement(F_, { nodes: e, edges: t, defaultNodes: n, defaultEdges: r, onConnect: m, onConnectStart: w, onConnectEnd: y, onClickConnectStart: k, onClickConnectEnd: p, nodesDraggable: ge, nodesConnectable: Qe, nodesFocusable: ie, edgesFocusable: Fe, edgesUpdatable: $t, elementsSelectable: Wr, elevateNodesOnSelect: kg, minZoom: Jn, maxZoom: At, nodeExtent: Nn, onNodesChange: pg, onEdgesChange: hg, snapToGrid: Ce, snapGrid: we, connectionMode: E, translateExtent: er, connectOnClick: wg, defaultEdgeOptions: Sg, fitView: yg, fitViewOptions: vg, onNodesDelete: N, onEdgesDelete: L, onNodeDragStart: j, onNodeDrag: T, onNodeDragStop: S, onSelectionDrag: _, onSelectionDragStart: V, onSelectionDragStop: $, noPanClassName: oc, nodeOrigin: G, rfId: Zs, autoPanOnConnect: Ng, autoPanOnNodeDrag: Cg, onError: zg, connectionRadius: Mg, isValidConnection: Pg, nodeDragThreshold: jg }),
      I.createElement(L_, { onSelectionChange: D }),
      rc,
      I.createElement(f_, { proOptions: _g, position: xg }),
      I.createElement(U_, { rfId: Zs, disableKeyboardA11y: ic })
    )
  );
});
Ym.displayName = "ReactFlow";
const Xm = ({ id: e, x: t, y: n, width: r, height: o, style: i, color: s, strokeColor: l, strokeWidth: u, className: a, borderRadius: c, shapeRendering: f, onClick: d, selected: m }) => {
  const { background: w, backgroundColor: y } = i || {}, k = s || w || y;
  return I.createElement("rect", { className: je(["react-flow__minimap-node", { selected: m }, a]), x: t, y: n, rx: c, ry: c, width: r, height: o, fill: k, stroke: l, strokeWidth: u, shapeRendering: f, onClick: d ? (p) => d(p, e) : void 0 });
};
Xm.displayName = "MiniMapNode";
var ZS = P.memo(Xm);
const qS = (e) => e.nodeOrigin, JS = (e) => e.getNodes().filter((t) => !t.hidden && t.width && t.height), Al = (e) => e instanceof Function ? e : () => e;
function ek({
  nodeStrokeColor: e = "transparent",
  nodeColor: t = "#e2e2e2",
  nodeClassName: n = "",
  nodeBorderRadius: r = 5,
  nodeStrokeWidth: o = 2,
  // We need to rename the prop to be `CapitalCase` so that JSX will render it as
  // a component properly.
  nodeComponent: i = ZS,
  onClick: s
}) {
  const l = le(JS, Ne), u = le(qS), a = Al(t), c = Al(e), f = Al(n), d = typeof window > "u" || window.chrome ? "crispEdges" : "geometricPrecision";
  return I.createElement(I.Fragment, null, l.map((m) => {
    const { x: w, y } = Bn(m, u).positionAbsolute;
    return I.createElement(i, { key: m.id, x: w, y, width: m.width, height: m.height, style: m.style, selected: m.selected, className: f(m), color: a(m), borderRadius: r, strokeColor: c(m), strokeWidth: o, shapeRendering: d, onClick: s, id: m.id });
  }));
}
var tk = P.memo(ek);
const nk = 200, rk = 150, ok = (e) => {
  const t = e.getNodes(), n = {
    x: -e.transform[0] / e.transform[2],
    y: -e.transform[1] / e.transform[2],
    width: e.width / e.transform[2],
    height: e.height / e.transform[2]
  };
  return {
    viewBB: n,
    boundingRect: t.length > 0 ? h_(Ks(t, e.nodeOrigin), n) : n,
    rfId: e.rfId
  };
}, ik = "react-flow__minimap-desc";
function Km({
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
  maskColor: u = "rgb(240, 240, 240, 0.6)",
  maskStrokeColor: a = "none",
  maskStrokeWidth: c = 1,
  position: f = "bottom-right",
  onClick: d,
  onNodeClick: m,
  pannable: w = !1,
  zoomable: y = !1,
  ariaLabel: k = "React Flow mini map",
  inversePan: p = !1,
  zoomStep: h = 10,
  offsetScale: g = 5
}) {
  const v = Se(), C = P.useRef(null), { boundingRect: z, viewBB: j, rfId: T } = le(ok, Ne), S = (e == null ? void 0 : e.width) ?? nk, N = (e == null ? void 0 : e.height) ?? rk, L = z.width / S, D = z.height / N, V = Math.max(L, D), _ = V * S, $ = V * N, M = g * V, O = z.x - (_ - z.width) / 2 - M, R = z.y - ($ - z.height) / 2 - M, E = _ + M * 2, A = $ + M * 2, F = `${ik}-${T}`, H = P.useRef(0);
  H.current = V, P.useEffect(() => {
    if (C.current) {
      const Y = st(C.current), Q = (ne) => {
        const { transform: te, d3Selection: Ce, d3Zoom: we } = v.getState();
        if (ne.sourceEvent.type !== "wheel" || !Ce || !we)
          return;
        const Oe = -ne.sourceEvent.deltaY * (ne.sourceEvent.deltaMode === 1 ? 0.05 : ne.sourceEvent.deltaMode ? 1 : 2e-3) * h, Re = te[2] * Math.pow(2, Oe);
        we.scaleTo(Ce, Re);
      }, Z = (ne) => {
        const { transform: te, d3Selection: Ce, d3Zoom: we, translateExtent: Oe, width: Re, height: ge } = v.getState();
        if (ne.sourceEvent.type !== "mousemove" || !Ce || !we)
          return;
        const Qe = H.current * Math.max(1, te[2]) * (p ? -1 : 1), ie = {
          x: te[0] - ne.sourceEvent.movementX * Qe,
          y: te[1] - ne.sourceEvent.movementY * Qe
        }, G = [
          [0, 0],
          [Re, ge]
        ], Fe = bt.translate(ie.x, ie.y).scale(te[2]), $t = we.constrain()(Fe, G, Oe);
        we.transform(Ce, $t);
      }, re = rm().on("zoom", w ? Z : null).on("zoom.wheel", y ? Q : null);
      return Y.call(re), () => {
        Y.on("zoom", null);
      };
    }
  }, [w, y, p, h]);
  const U = d ? (Y) => {
    const Q = yt(Y);
    d(Y, { x: Q[0], y: Q[1] });
  } : void 0, b = m ? (Y, Q) => {
    const Z = v.getState().nodeInternals.get(Q);
    m(Y, Z);
  } : void 0;
  return I.createElement(
    Wa,
    { position: f, style: e, className: je(["react-flow__minimap", t]), "data-testid": "rf__minimap" },
    I.createElement(
      "svg",
      { width: S, height: N, viewBox: `${O} ${R} ${E} ${A}`, role: "img", "aria-labelledby": F, ref: C, onClick: U },
      k && I.createElement("title", { id: F }, k),
      I.createElement(tk, { onClick: b, nodeColor: r, nodeStrokeColor: n, nodeBorderRadius: i, nodeClassName: o, nodeStrokeWidth: s, nodeComponent: l }),
      I.createElement("path", { className: "react-flow__minimap-mask", d: `M${O - M},${R - M}h${E + M * 2}v${A + M * 2}h${-E - M * 2}z
        M${j.x},${j.y}h${j.width}v${j.height}h${-j.width}z`, fill: u, fillRule: "evenodd", stroke: a, strokeWidth: c, pointerEvents: "none" })
    )
  );
}
Km.displayName = "MiniMap";
var sk = P.memo(Km);
function lk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32" },
    I.createElement("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" })
  );
}
function uk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5" },
    I.createElement("path", { d: "M0 0h32v4.2H0z" })
  );
}
function ak() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30" },
    I.createElement("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" })
  );
}
function ck() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" })
  );
}
function fk() {
  return I.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32" },
    I.createElement("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" })
  );
}
const mo = ({ children: e, className: t, ...n }) => I.createElement("button", { type: "button", className: je(["react-flow__controls-button", t]), ...n }, e);
mo.displayName = "ControlButton";
const dk = (e) => ({
  isInteractive: e.nodesDraggable || e.nodesConnectable || e.elementsSelectable,
  minZoomReached: e.transform[2] <= e.minZoom,
  maxZoomReached: e.transform[2] >= e.maxZoom
}), Gm = ({ style: e, showZoom: t = !0, showFitView: n = !0, showInteractive: r = !0, fitViewOptions: o, onZoomIn: i, onZoomOut: s, onFitView: l, onInteractiveChange: u, className: a, children: c, position: f = "bottom-left" }) => {
  const d = Se(), [m, w] = P.useState(!1), { isInteractive: y, minZoomReached: k, maxZoomReached: p } = le(dk, Ne), { zoomIn: h, zoomOut: g, fitView: v } = ec();
  if (P.useEffect(() => {
    w(!0);
  }, []), !m)
    return null;
  const C = () => {
    h(), i == null || i();
  }, z = () => {
    g(), s == null || s();
  }, j = () => {
    v(o), l == null || l();
  }, T = () => {
    d.setState({
      nodesDraggable: !y,
      nodesConnectable: !y,
      elementsSelectable: !y
    }), u == null || u(!y);
  };
  return I.createElement(
    Wa,
    { className: je(["react-flow__controls", a]), position: f, style: e, "data-testid": "rf__controls" },
    t && I.createElement(
      I.Fragment,
      null,
      I.createElement(
        mo,
        { onClick: C, className: "react-flow__controls-zoomin", title: "zoom in", "aria-label": "zoom in", disabled: p },
        I.createElement(lk, null)
      ),
      I.createElement(
        mo,
        { onClick: z, className: "react-flow__controls-zoomout", title: "zoom out", "aria-label": "zoom out", disabled: k },
        I.createElement(uk, null)
      )
    ),
    n && I.createElement(
      mo,
      { className: "react-flow__controls-fitview", onClick: j, title: "fit view", "aria-label": "fit view" },
      I.createElement(ak, null)
    ),
    r && I.createElement(mo, { className: "react-flow__controls-interactive", onClick: T, title: "toggle interactivity", "aria-label": "toggle interactivity" }, y ? I.createElement(fk, null) : I.createElement(ck, null)),
    c
  );
};
Gm.displayName = "Controls";
var pk = P.memo(Gm), ct;
(function(e) {
  e.Lines = "lines", e.Dots = "dots", e.Cross = "cross";
})(ct || (ct = {}));
function hk({ color: e, dimensions: t, lineWidth: n }) {
  return I.createElement("path", { stroke: e, strokeWidth: n, d: `M${t[0] / 2} 0 V${t[1]} M0 ${t[1] / 2} H${t[0]}` });
}
function mk({ color: e, radius: t }) {
  return I.createElement("circle", { cx: t, cy: t, r: t, fill: e });
}
const gk = {
  [ct.Dots]: "#91919a",
  [ct.Lines]: "#eee",
  [ct.Cross]: "#e2e2e2"
}, yk = {
  [ct.Dots]: 1,
  [ct.Lines]: 1,
  [ct.Cross]: 6
}, vk = (e) => ({ transform: e.transform, patternId: `pattern-${e.rfId}` });
function Qm({
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
  className: u
}) {
  const a = P.useRef(null), { transform: c, patternId: f } = le(vk, Ne), d = s || gk[t], m = r || yk[t], w = t === ct.Dots, y = t === ct.Cross, k = Array.isArray(n) ? n : [n, n], p = [k[0] * c[2] || 1, k[1] * c[2] || 1], h = m * c[2], g = y ? [h, h] : p, v = w ? [h / i, h / i] : [g[0] / i, g[1] / i];
  return I.createElement(
    "svg",
    { className: je(["react-flow__background", u]), style: {
      ...l,
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0
    }, ref: a, "data-testid": "rf__background" },
    I.createElement("pattern", { id: f + e, x: c[0] % p[0], y: c[1] % p[1], width: p[0], height: p[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${v[0]},-${v[1]})` }, w ? I.createElement(mk, { color: d, radius: h / i }) : I.createElement(hk, { dimensions: g, color: d, lineWidth: o })),
    I.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${f + e})` })
  );
}
Qm.displayName = "Background";
var wk = P.memo(Qm);
const Zm = {}, { useDebugValue: xk } = I, { useSyncExternalStoreWithSelector: _k } = Mh;
let sd = !1;
const Sk = (e) => e;
function kk(e, t = Sk, n) {
  (Zm ? "production" : void 0) !== "production" && n && !sd && (console.warn(
    "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
  ), sd = !0);
  const r = _k(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n
  );
  return xk(r), r;
}
const ld = (e) => {
  (Zm ? "production" : void 0) !== "production" && typeof e != "function" && console.warn(
    "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
  );
  const t = typeof e == "function" ? Ph(e) : e, n = (r, o) => kk(t, r, o);
  return Object.assign(n, t), n;
}, Ek = (e) => e ? ld(e) : ld, qm = { nodes: [], edges: [] }, X = Ek((e, t) => ({
  graph: qm,
  catalog: [],
  selectedNodeId: null,
  runContext: null,
  readOnly: !1,
  paletteFilter: "",
  rightView: "none",
  drawerNodeId: null,
  setGraph: (n) => e({ graph: Ck(n) }),
  setCatalog: (n) => e({ catalog: n }),
  setRunContext: (n) => e({ runContext: n }),
  setReadOnly: (n) => e({ readOnly: n }),
  setSelectedNodeId: (n) => e({ selectedNodeId: n }),
  setPaletteFilter: (n) => e({ paletteFilter: n }),
  setRightView: (n) => e({ rightView: n }),
  setDrawerNodeId: (n) => e({ drawerNodeId: n }),
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
    const r = Nk(n);
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
function Nk(e) {
  const i = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
  for (const d of e.nodes)
    i.set(d.id, []), s.set(d.id, 0);
  for (const d of e.edges)
    !i.has(d.source) || !s.has(d.target) || (i.get(d.source).push(d.target), s.set(d.target, (s.get(d.target) || 0) + 1));
  const l = /* @__PURE__ */ new Map(), u = [];
  for (const d of e.nodes)
    (s.get(d.id) || 0) === 0 && (l.set(d.id, 0), u.push(d.id));
  u.length === 0 && e.nodes.length > 0 && (l.set(e.nodes[0].id, 0), u.push(e.nodes[0].id));
  const a = new Set(u);
  for (; u.length > 0; ) {
    const d = u.shift(), m = l.get(d) || 0;
    for (const w of i.get(d) || []) {
      const y = m + 1;
      (!l.has(w) || (l.get(w) || 0) < y) && l.set(w, y), a.has(w) || (a.add(w), u.push(w));
    }
  }
  const c = /* @__PURE__ */ new Map();
  e.nodes.forEach((d) => {
    const m = l.get(d.id) ?? 0;
    c.has(m) || c.set(m, []), c.get(m).push(d.id);
  });
  const f = {};
  for (const [d, m] of Array.from(c.entries())) {
    const w = 80 + d * 280, y = m.length, k = 80 + Math.max(0, 3 - y) * 30;
    m.forEach((p, h) => {
      f[p] = { x: w, y: k + h * 160 };
    });
  }
  return f;
}
function Ck(e) {
  return !e || !Array.isArray(e.nodes) ? qm : {
    nodes: e.nodes.map((t) => ({
      ...t,
      params: t.params || {},
      position: t.position || { x: 0, y: 0 }
    })),
    edges: Array.isArray(e.edges) ? e.edges : []
  };
}
var Jm = { exports: {} };
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
})(Jm);
var Mk = Jm.exports;
const Pe = /* @__PURE__ */ Uu(Mk);
function eg(e) {
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
function Pk(e, t, n, r) {
  if (!e || !n) return { ok: !1, reason: "Spec faltante" };
  const o = e.outputs.find((s) => s.name === t), i = n.inputs.find((s) => s.name === r);
  return o ? i ? { ok: !0 } : { ok: !1, reason: `Puerto de entrada "${r}" no existe` } : { ok: !1, reason: `Puerto de salida "${t}" no existe` };
}
function zk(e, t) {
  var o;
  if (!t || !t.schema) return [];
  const n = [], r = Array.isArray(t.schema.required) ? t.schema.required : [];
  for (const i of r) {
    const s = (o = e.params) == null ? void 0 : o[i];
    (s == null || s === "") && n.push(`Falta parámetro requerido: ${i}`);
  }
  return n;
}
function $n(e, t) {
  return e.find((n) => n.type === t);
}
function Tk(e) {
  return (e == null ? void 0 : e.inputs) ?? [];
}
function jk(e) {
  return (e == null ? void 0 : e.outputs) ?? [{ name: "main" }];
}
const Rk = ({ id: e, data: t, selected: n }) => {
  var C, z, j;
  const r = X(
    (T) => {
      var S, N;
      return (N = (S = T.runContext) == null ? void 0 : S.nodeStates) == null ? void 0 : N[e];
    }
  ), o = X((T) => {
    var S;
    return ((S = T.runContext) == null ? void 0 : S.status) === "running";
  }), i = X((T) => T.setSelectedNodeId), s = X((T) => T.setRightView), l = (r == null ? void 0 : r.status) || "pending", u = r == null ? void 0 : r.durationMs, a = r == null ? void 0 : r.attempt, c = (C = r == null ? void 0 : r.error) == null ? void 0 : C.message, f = t.spec, d = t.flowNode, m = (f == null ? void 0 : f.color) || "#5E72E4", w = Tk(f), y = jk(f), k = (f == null ? void 0 : f.displayName) || d.type, p = P.useMemo(() => $k(d.params), [d.params]), h = P.useCallback(
    (T) => {
      T.stopPropagation(), i(e), s("runs");
    },
    [e, i, s]
  ), g = o && l === "running", v = ((j = (z = r == null ? void 0 : r.output) == null ? void 0 : z.main) == null ? void 0 : j.reduce((T, S) => T + ((S == null ? void 0 : S.length) || 0), 0)) ?? 0;
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      className: Pe("kfc-node", {
        "kfc-node--selected": n,
        "kfc-node--disabled": d.disabled,
        "kfc-node--live": g,
        [`kfc-node--status-${l}`]: !0
      }),
      style: { "--kfc-node-color": m },
      children: [
        w.map((T, S) => /* @__PURE__ */ x.jsx(
          Vr,
          {
            id: T.name,
            type: "target",
            position: K.Left,
            className: Pe("kfc-node__handle", {
              "kfc-node__handle--error": T.isError
            }),
            style: { top: 24 + S * 18 }
          },
          `in-${T.name}`
        )),
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-node__header", children: [
          /* @__PURE__ */ x.jsx("i", { className: Pe("kfc-node__icon", (f == null ? void 0 : f.icon) || "pi pi-circle") }),
          /* @__PURE__ */ x.jsx("span", { className: "kfc-node__title", title: k, children: k }),
          r && (l === "success" || l === "failed" || l === "skipped") && /* @__PURE__ */ x.jsx(
            "button",
            {
              type: "button",
              className: "kfc-node__info-btn",
              onClick: h,
              title: "Ver logs de este nodo",
              "aria-label": "Ver logs",
              children: /* @__PURE__ */ x.jsx("i", { className: "pi pi-info-circle" })
            }
          ),
          (f == null ? void 0 : f.category) && /* @__PURE__ */ x.jsx("span", { className: "kfc-node__category-badge", children: Ak(f.category) })
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-node__body", children: [
          p.length > 0 ? /* @__PURE__ */ x.jsx("ul", { className: "kfc-node__params", children: p.slice(0, 3).map(([T, S]) => /* @__PURE__ */ x.jsxs("li", { children: [
            /* @__PURE__ */ x.jsxs("b", { children: [
              T,
              ":"
            ] }),
            " ",
            S
          ] }, T)) }) : /* @__PURE__ */ x.jsx("em", { style: { color: "#9ca3af" }, children: "Sin parámetros configurados" }),
          /* @__PURE__ */ x.jsxs("div", { className: "kfc-node__status-row", children: [
            /* @__PURE__ */ x.jsxs("span", { className: Pe("kfc-node__status", `kfc-node__status--${l}`), children: [
              g && /* @__PURE__ */ x.jsx("i", { className: "pi pi-spin pi-spinner kfc-node__status-spinner" }),
              !g && l === "success" && /* @__PURE__ */ x.jsx("i", { className: "pi pi-check" }),
              !g && l === "failed" && /* @__PURE__ */ x.jsx("i", { className: "pi pi-times" }),
              !g && l === "skipped" && /* @__PURE__ */ x.jsx("i", { className: "pi pi-forward" }),
              Ik(l)
            ] }),
            u != null && l !== "running" && /* @__PURE__ */ x.jsx("span", { className: "kfc-node__metric", title: "Duración", children: Dk(u) }),
            v > 0 && l === "success" && /* @__PURE__ */ x.jsxs("span", { className: "kfc-node__metric", title: "Items procesados", children: [
              v,
              " ",
              v === 1 ? "item" : "items"
            ] }),
            a != null && a > 1 && /* @__PURE__ */ x.jsxs(
              "span",
              {
                className: "kfc-node__metric kfc-node__metric--warn",
                title: "Reintentos",
                children: [
                  "int. ",
                  a
                ]
              }
            )
          ] }),
          c && l === "failed" && /* @__PURE__ */ x.jsx("div", { className: "kfc-node__error", title: c, children: Lk(c, 60) })
        ] }),
        y.map((T, S) => /* @__PURE__ */ x.jsx(
          Vr,
          {
            id: T.name,
            type: "source",
            position: K.Right,
            className: Pe("kfc-node__handle", {
              "kfc-node__handle--error": T.isError
            }),
            style: { top: 24 + S * 18 }
          },
          `out-${T.name}`
        )),
        g && /* @__PURE__ */ x.jsx("div", { className: "kfc-node__live-pulse", "aria-hidden": !0 })
      ]
    }
  );
};
function $k(e) {
  return e ? Object.entries(e).filter(([, t]) => t != null && t !== "").map(([t, n]) => {
    const r = typeof n == "object" ? JSON.stringify(n).slice(0, 40) : String(n).slice(0, 40);
    return [t, r];
  }) : [];
}
function Ak(e) {
  return e === "flow-control" ? "flow" : e.slice(0, 6);
}
function Ik(e) {
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
function Dk(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function Lk(e, t) {
  return e.length > t ? e.slice(0, t - 1) + "…" : e;
}
const Ok = P.memo(Rk);
function ud(e = "n") {
  const t = Date.now().toString(36).slice(-4), n = Math.random().toString(36).slice(2, 8);
  return `${e}_${t}${n}`;
}
const Fk = { katuqNode: Ok }, Hk = ({ onSelectNode: e, onIntent: t }) => {
  const n = X((S) => S.graph), r = X((S) => S.catalog), o = X((S) => S.runContext), i = X((S) => S.readOnly), s = X((S) => S.selectedNodeId);
  X((S) => S.setGraph);
  const l = X((S) => S.addNode), u = X((S) => S.addEdge), a = X((S) => S.moveNode), c = X((S) => S.deleteNode), f = X((S) => S.deleteEdge), d = X((S) => S.setDrawerNodeId), m = P.useRef(null), w = P.useRef(null), y = P.useMemo(
    () => n.nodes.map((S) => {
      const N = $n(r, S.type);
      return {
        id: S.id,
        type: "katuqNode",
        position: S.position,
        selected: s === S.id,
        data: { flowNode: S, spec: N }
      };
    }),
    [n.nodes, r, s]
  ), k = P.useMemo(
    () => n.edges.map((S) => {
      var $, M, O, R;
      const N = (M = ($ = o == null ? void 0 : o.nodeStates) == null ? void 0 : $[S.source]) == null ? void 0 : M.status, L = (R = (O = o == null ? void 0 : o.nodeStates) == null ? void 0 : O[S.target]) == null ? void 0 : R.status, D = N === "success", V = (o == null ? void 0 : o.status) === "running" && D && (L === "running" || L === "pending"), _ = S.sourcePort === "error";
      return {
        id: S.id,
        source: S.source,
        sourcePort: S.sourcePort,
        target: S.target,
        sourceHandle: S.sourcePort,
        targetHandle: S.targetPort,
        animated: V,
        className: Pe({
          "kfc-edge--complete": D && !V,
          "kfc-edge--live": V,
          "kfc-edge--error": _
        })
      };
    }),
    [n.edges, o]
  ), p = P.useCallback(
    (S) => {
      for (const N of S)
        N.type === "position" && N.position ? a(N.id, { x: N.position.x, y: N.position.y }) : N.type === "remove" ? c(N.id) : N.type === "select" && e(N.selected ? N.id : null);
    },
    [a, c, e]
  ), h = P.useCallback(
    (S) => {
      for (const N of S)
        N.type === "remove" && f(N.id);
    },
    [f]
  ), g = P.useCallback(
    (S) => {
      if (i || !S.source || !S.target) return;
      if (S.source === S.target) {
        t == null || t("connectionRejected", {
          reason: "Un nodo no puede conectarse a sí mismo."
        });
        return;
      }
      const N = n.nodes.find((O) => O.id === S.source), L = n.nodes.find((O) => O.id === S.target);
      if (!N || !L) return;
      const D = $n(r, N.type), V = $n(r, L.type), _ = Pk(
        D,
        S.sourceHandle || "main",
        V,
        S.targetHandle || "main"
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
            source: S.source,
            sourcePort: S.sourceHandle || "main",
            target: S.target,
            targetPort: S.targetHandle || "main"
          }
        ]
      };
      if (eg($)) {
        t == null || t("connectionRejected", {
          reason: "Esta conexión crearía un ciclo en el flow."
        });
        return;
      }
      const M = {
        id: ud("e"),
        source: S.source,
        sourcePort: S.sourceHandle || "main",
        target: S.target,
        targetPort: S.targetHandle || "main"
      };
      u(M), t == null || t("connectionCreated", { edgeId: M.id });
    },
    [i, n, r, u, t]
  ), v = P.useCallback((S) => {
    S.preventDefault(), S.dataTransfer.dropEffect = "move";
  }, []), C = P.useCallback(
    (S) => {
      var M;
      if (S.preventDefault(), i) return;
      const N = S.dataTransfer.getData("application/x-katuq-node-type");
      if (!N) return;
      const L = $n(r, N);
      if (!L) return;
      const D = (M = m.current) == null ? void 0 : M.getBoundingClientRect();
      if (!D) return;
      const V = w.current, _ = (V == null ? void 0 : V.project({
        x: S.clientX - D.left,
        y: S.clientY - D.top
      })) ?? { x: 100, y: 100 }, $ = {
        id: ud("n"),
        type: N,
        position: _,
        params: { ...L.defaults || {} }
      };
      l($), e($.id), t == null || t("nodeAdded", { nodeId: $.id, type: N });
    },
    [i, r, l, e, t]
  ), z = P.useCallback(() => e(null), [e]), j = P.useCallback(
    (S, N) => e(N.id),
    [e]
  ), T = P.useCallback(
    (S, N) => {
      S.preventDefault(), d(N.id);
    },
    [d]
  );
  return /* @__PURE__ */ x.jsx("div", { ref: m, className: "kfc-canvas-wrapper", onDragOver: v, onDrop: C, children: /* @__PURE__ */ x.jsxs(
    Ym,
    {
      nodes: y,
      edges: k,
      onNodesChange: p,
      onEdgesChange: h,
      onConnect: g,
      onPaneClick: z,
      onNodeClick: j,
      onNodeContextMenu: T,
      nodeTypes: Fk,
      fitView: !0,
      fitViewOptions: { padding: 0.2 },
      onInit: (S) => w.current = S,
      proOptions: { hideAttribution: !0 },
      deleteKeyCode: i ? null : ["Delete", "Backspace"],
      minZoom: 0.2,
      maxZoom: 2,
      defaultEdgeOptions: {
        style: { strokeWidth: 1.5 }
      },
      children: [
        /* @__PURE__ */ x.jsx(wk, { variant: ct.Dots, gap: 18, size: 1, color: "#d1d5db" }),
        /* @__PURE__ */ x.jsx(
          sk,
          {
            pannable: !0,
            zoomable: !0,
            nodeColor: (S) => {
              var D;
              const N = (D = S.data) == null ? void 0 : D.flowNode, L = N ? $n(r, N.type) : void 0;
              return (L == null ? void 0 : L.color) || "#94a3b8";
            }
          }
        ),
        /* @__PURE__ */ x.jsx(pk, { position: "bottom-left" })
      ]
    }
  ) });
}, Vk = {
  osmosis: "Osmosis (Guía Cereza)",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  katuq: "Katuq Internal",
  "flow-control": "Control de Flujo",
  http: "HTTP",
  kai: "KAI (AI)"
}, Bk = ({ readOnly: e }) => {
  const t = X((s) => s.catalog), n = X((s) => s.paletteFilter), r = X((s) => s.setPaletteFilter), o = P.useMemo(() => bk(t, n), [t, n]), i = (s, l) => {
    if (e) {
      s.preventDefault();
      return;
    }
    s.dataTransfer.setData("application/x-katuq-node-type", l.type), s.dataTransfer.effectAllowed = "move";
  };
  return /* @__PURE__ */ x.jsxs("aside", { className: "kfc-sidebar", "aria-label": "Catálogo de nodos", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-sidebar__header", children: [
      /* @__PURE__ */ x.jsx("h3", { className: "kfc-sidebar__title", children: "Catálogo de nodos" }),
      /* @__PURE__ */ x.jsx(
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
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-sidebar__list", children: [
      t.length === 0 && /* @__PURE__ */ x.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__title", children: "Sin catálogo cargado" }),
        /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "El backend debe enviar el array de NodeSpec[]." })
      ] }),
      Object.entries(o).map(([s, l]) => /* @__PURE__ */ x.jsxs("section", { className: "kfc-group", children: [
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-group__title", children: [
          Vk[s] || s,
          " (",
          l.length,
          ")"
        ] }),
        l.map((u) => /* @__PURE__ */ x.jsxs(
          "div",
          {
            className: Pe("kfc-palette-card"),
            draggable: !e,
            onDragStart: (a) => i(a, u),
            style: { borderLeftColor: u.color },
            title: u.description,
            children: [
              /* @__PURE__ */ x.jsx("i", { className: Pe("kfc-palette-card__icon", u.icon) }),
              /* @__PURE__ */ x.jsxs("div", { className: "kfc-palette-card__body", children: [
                /* @__PURE__ */ x.jsx("div", { className: "kfc-palette-card__title", children: u.displayName }),
                /* @__PURE__ */ x.jsx("div", { className: "kfc-palette-card__desc", children: u.description })
              ] })
            ]
          },
          u.type
        ))
      ] }, s))
    ] })
  ] });
};
function bk(e, t) {
  const n = (t || "").trim().toLowerCase(), r = n ? e.filter((i) => `${i.displayName} ${i.description} ${i.type} ${(i.tags || []).join(" ")} ${i.group}`.toLowerCase().includes(n)) : e, o = {};
  for (const i of r)
    o[i.group] || (o[i.group] = []), o[i.group].push(i);
  for (const i of Object.keys(o))
    o[i].sort((s, l) => String((s == null ? void 0 : s.displayName) ?? "").localeCompare(String((l == null ? void 0 : l.displayName) ?? "")));
  return o;
}
const Uk = ({ onClose: e }) => {
  var T, S;
  const t = X((N) => N.selectedNodeId), n = X((N) => N.graph), r = X((N) => N.catalog), o = X((N) => N.updateNodeParams), i = X((N) => N.updateNode), s = X((N) => N.deleteNode), l = X((N) => N.readOnly), u = P.useMemo(
    () => n.nodes.find((N) => N.id === t),
    [n.nodes, t]
  ), a = P.useMemo(
    () => u ? $n(r, u.type) : void 0,
    [r, u]
  ), [c, f] = P.useState({}), [d, m] = P.useState({}), [w, y] = P.useState("");
  if (P.useEffect(() => {
    if (!u) return;
    f({ ...(a == null ? void 0 : a.defaults) || {}, ...u.params || {} }), y(u.notes || "");
    const N = {};
    for (const [L, D] of Object.entries(u.params || {}))
      typeof D == "string" && D.trim().startsWith("{{") && (N[L] = "expression");
    m(N);
  }, [u, a]), !u || !a)
    return /* @__PURE__ */ x.jsx("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: /* @__PURE__ */ x.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__title", children: "Sin nodo seleccionado" }),
      /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "Click en un nodo del canvas para editar sus parámetros." })
    ] }) });
  const k = zk({ ...u, params: c }, a), p = ((T = a.schema) == null ? void 0 : T.properties) || {}, h = Array.isArray((S = a.schema) == null ? void 0 : S.required) ? a.schema.required : [], g = (N, L) => f((D) => ({ ...D, [N]: L })), v = (N, L) => m((D) => ({ ...D, [N]: L })), C = () => {
    o(u.id, c), w !== (u.notes || "") && i(u.id, { notes: w }), e();
  }, z = () => e(), j = () => {
    confirm(`Eliminar el nodo "${a.displayName}"?`) && (s(u.id), e());
  };
  return /* @__PURE__ */ x.jsxs("aside", { className: "kfc-config", "aria-label": "Panel de configuración", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-config__header", children: [
      /* @__PURE__ */ x.jsxs("div", { children: [
        /* @__PURE__ */ x.jsx("div", { className: "kfc-config__title", children: a.displayName }),
        /* @__PURE__ */ x.jsxs("div", { style: { fontSize: 11, color: "#6b7280" }, children: [
          a.type,
          " · v",
          a.version
        ] })
      ] }),
      /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: e, "aria-label": "Cerrar", children: "Cerrar" })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-config__body", children: [
      a.description && /* @__PURE__ */ x.jsx("p", { style: { marginTop: 0, color: "#4b5563", fontSize: 12 }, children: a.description }),
      k.length > 0 && /* @__PURE__ */ x.jsx(
        "div",
        {
          style: {
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 6,
            padding: 10,
            fontSize: 12,
            marginBottom: 12
          },
          children: k.map((N) => /* @__PURE__ */ x.jsxs("div", { children: [
            "· ",
            N
          ] }, N))
        }
      ),
      Object.keys(p).length === 0 && /* @__PURE__ */ x.jsx("div", { style: { color: "#6b7280", fontSize: 12 }, children: "Este nodo no tiene parámetros configurables." }),
      Object.entries(p).map(([N, L]) => /* @__PURE__ */ x.jsx(
        Wk,
        {
          name: N,
          schema: L,
          value: c[N],
          mode: d[N] || "fixed",
          required: h.includes(N),
          readOnly: l,
          onChange: (D) => g(N, D),
          onModeChange: (D) => v(N, D)
        },
        N
      )),
      /* @__PURE__ */ x.jsx("hr", { style: { border: 0, borderTop: "1px solid #e5e7eb", margin: "16px 0" } }),
      /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
        /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", children: "Notas (visibles en el canvas)" }),
        /* @__PURE__ */ x.jsx(
          "textarea",
          {
            className: "kfc-textarea",
            value: w,
            readOnly: l,
            onChange: (N) => y(N.target.value),
            placeholder: "Comentarios, contexto, decisiones..."
          }
        )
      ] }),
      a.category === "trigger" && /* @__PURE__ */ x.jsx(
        "div",
        {
          style: {
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            color: "#92400e",
            borderRadius: 6,
            padding: 10,
            fontSize: 12
          },
          children: "Trigger: la suscripción (cron, webhook) se configura en el header del flow."
        }
      )
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-config__footer", children: [
      !l && /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn kfc-btn--danger", onClick: j, children: "Eliminar nodo" }),
      /* @__PURE__ */ x.jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: z, children: "Cancelar" }),
      !l && /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn kfc-btn--primary", onClick: C, children: "Guardar" })
    ] })
  ] });
}, Wk = ({
  name: e,
  schema: t,
  value: n,
  mode: r,
  required: o,
  readOnly: i,
  onChange: s,
  onModeChange: l
}) => {
  var m;
  const u = t.title || e, a = t.description, c = t.type, f = t.enum, d = `kfc-field-${e}`;
  if (c === "boolean")
    return /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ x.jsxs("label", { className: "kfc-checkbox-row", children: [
        /* @__PURE__ */ x.jsx(
          "input",
          {
            id: d,
            type: "checkbox",
            checked: !!n,
            disabled: i,
            onChange: (w) => s(w.target.checked)
          }
        ),
        /* @__PURE__ */ x.jsxs("span", { children: [
          u,
          o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
        ] })
      ] }),
      a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
    ] });
  if (Array.isArray(f))
    return /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", htmlFor: d, children: /* @__PURE__ */ x.jsxs("span", { children: [
        u,
        o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
      ] }) }),
      /* @__PURE__ */ x.jsxs(
        "select",
        {
          id: d,
          className: "kfc-select",
          value: n ?? "",
          disabled: i,
          onChange: (w) => s(w.target.value),
          children: [
            /* @__PURE__ */ x.jsx("option", { value: "", children: "— elegí una opción —" }),
            f.map((w) => /* @__PURE__ */ x.jsx("option", { value: String(w), children: String(w) }, String(w)))
          ]
        }
      ),
      a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
    ] });
  if (c === "array") {
    const w = (m = t.items) == null ? void 0 : m.enum, y = Array.isArray(n) ? n : [];
    return w ? /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", children: /* @__PURE__ */ x.jsxs("span", { children: [
        u,
        o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
      ] }) }),
      /* @__PURE__ */ x.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: w.map((k) => {
        const p = y.includes(k);
        return /* @__PURE__ */ x.jsxs(
          "label",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: p ? "#dbeafe" : "#f3f4f6",
              color: p ? "#1d4ed8" : "#374151",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              cursor: i ? "default" : "pointer"
            },
            children: [
              /* @__PURE__ */ x.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: p,
                  disabled: i,
                  onChange: (h) => {
                    h.target.checked ? s([...y, k]) : s(y.filter((g) => g !== k));
                  }
                }
              ),
              k
            ]
          },
          k
        );
      }) }),
      a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
    ] }) : /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
      /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", htmlFor: d, children: /* @__PURE__ */ x.jsxs("span", { children: [
        u,
        o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
      ] }) }),
      /* @__PURE__ */ x.jsx(
        "input",
        {
          id: d,
          type: "text",
          className: "kfc-input",
          value: y.join(", "),
          readOnly: i,
          onChange: (k) => s(
            k.target.value.split(",").map((p) => p.trim()).filter(Boolean)
          ),
          placeholder: "valor1, valor2, valor3"
        }
      ),
      a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
    ] });
  }
  return c === "object" ? /* @__PURE__ */ x.jsx(
    Yk,
    {
      inputId: d,
      label: u,
      description: a,
      required: !!o,
      readOnly: !!i,
      value: n,
      onChange: s,
      name: e
    }
  ) : c === "number" || c === "integer" ? /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", htmlFor: d, children: /* @__PURE__ */ x.jsxs("span", { children: [
      u,
      o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
    ] }) }),
    /* @__PURE__ */ x.jsx(
      "input",
      {
        id: d,
        type: "number",
        className: "kfc-input",
        value: n ?? "",
        readOnly: i,
        min: t.minimum,
        max: t.maximum,
        step: c === "integer" ? 1 : "any",
        onChange: (w) => {
          const y = w.target.value;
          s(y === "" ? void 0 : c === "integer" ? parseInt(y, 10) : parseFloat(y));
        }
      }
    ),
    a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ x.jsxs("label", { className: "kfc-field__label", htmlFor: d, children: [
      /* @__PURE__ */ x.jsxs("span", { children: [
        u,
        o && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
      ] }),
      /* @__PURE__ */ x.jsxs("span", { className: "kfc-mode-toggle", role: "tablist", children: [
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: Pe({ "is-active": r === "fixed" }),
            onClick: () => l("fixed"),
            disabled: i,
            children: "Fijo"
          }
        ),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: Pe({ "is-active": r === "expression" }),
            onClick: () => l("expression"),
            disabled: i,
            children: "Expresión"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ x.jsx(
      "input",
      {
        id: d,
        type: "text",
        className: "kfc-input",
        value: n ?? "",
        readOnly: i,
        onChange: (w) => s(w.target.value),
        placeholder: r === "expression" ? "{{ $json.field }}" : t.default ? `Por defecto: ${t.default}` : ""
      }
    ),
    a && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: a })
  ] });
}, Yk = ({
  inputId: e,
  label: t,
  description: n,
  required: r,
  readOnly: o,
  value: i,
  onChange: s,
  name: l
}) => {
  const u = P.useMemo(() => {
    try {
      return JSON.stringify(i ?? {}, null, 2);
    } catch {
      return "{}";
    }
  }, [i]), [a, c] = P.useState(u), [f, d] = P.useState(null);
  return P.useEffect(() => {
    c(u), d(null);
  }, [u]), /* @__PURE__ */ x.jsxs("div", { className: "kfc-field", children: [
    /* @__PURE__ */ x.jsx("label", { className: "kfc-field__label", htmlFor: e, children: /* @__PURE__ */ x.jsxs("span", { children: [
      t,
      r && /* @__PURE__ */ x.jsx("span", { style: { color: "#dc2626" }, children: " *" })
    ] }) }),
    /* @__PURE__ */ x.jsx(
      "textarea",
      {
        id: e,
        className: "kfc-textarea",
        value: a,
        readOnly: o,
        onChange: (m) => c(m.target.value),
        onBlur: () => {
          try {
            s(JSON.parse(a || "{}")), d(null);
          } catch (m) {
            d("JSON inválido: " + (m && m.message ? m.message : String(m)));
          }
        }
      }
    ),
    f && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", style: { color: "#dc2626" }, children: f }),
    n && !f && /* @__PURE__ */ x.jsx("div", { className: "kfc-field__hint", children: n })
  ] });
}, Xk = {
  pending: "#9ca3af",
  running: "#2563eb",
  success: "#10b981",
  failed: "#ef4444",
  skipped: "#6b7280"
}, Kk = ({ runContext: e, onClose: t }) => {
  const [n, r] = P.useState({}), o = P.useMemo(() => {
    if (!e) return [];
    const s = Object.entries(e.nodeStates).map(([l, u]) => ({
      nodeId: l,
      state: u
    }));
    return s.sort((l, u) => {
      const a = l.state.startedAt ? Date.parse(l.state.startedAt) : 0, c = u.state.startedAt ? Date.parse(u.state.startedAt) : 0;
      return a - c;
    }), s;
  }, [e]);
  if (!e)
    return /* @__PURE__ */ x.jsxs("div", { className: "kfc-empty", children: [
      /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__title", children: "Sin ejecuciones todavía" }),
      /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "Ejecutá el flow manualmente o esperá a que un trigger lo dispare." })
    ] });
  const i = (s) => r((l) => ({ ...l, [s]: !l[s] }));
  return /* @__PURE__ */ x.jsxs("div", { className: "kfc-runlist", "aria-label": "Historial de ejecución", children: [
    /* @__PURE__ */ x.jsxs(
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
          /* @__PURE__ */ x.jsxs("div", { children: [
            /* @__PURE__ */ x.jsxs("div", { style: { fontWeight: 600, fontSize: 14 }, children: [
              "Run · ",
              e.runId.slice(0, 12),
              "…"
            ] }),
            /* @__PURE__ */ x.jsxs("div", { style: { fontSize: 12, color: "#6b7280" }, children: [
              e.startedAt,
              " · ",
              e.totalDurationMs ?? "—",
              " ms ·",
              " ",
              /* @__PURE__ */ x.jsx(
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
          t && /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: t, children: "Cerrar" })
        ]
      }
    ),
    o.length === 0 && /* @__PURE__ */ x.jsx("div", { className: "kfc-empty", children: /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "No se ejecutó ningún nodo en este run." }) }),
    o.map(({ nodeId: s, state: l }) => {
      const u = !!n[s];
      return /* @__PURE__ */ x.jsxs(
        "div",
        {
          className: "kfc-runlist__item",
          style: { borderLeftColor: Xk[l.status] || "#9ca3af" },
          onClick: () => i(s),
          children: [
            /* @__PURE__ */ x.jsxs("div", { className: "kfc-runlist__head", children: [
              /* @__PURE__ */ x.jsx("span", { children: s }),
              /* @__PURE__ */ x.jsx(
                "span",
                {
                  className: Pe(
                    "kfc-node__status",
                    `kfc-node__status--${l.status}`
                  ),
                  style: { marginTop: 0 },
                  children: l.status
                }
              )
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "kfc-runlist__sub", children: [
              l.startedAt || "—",
              " · ",
              l.durationMs ?? "—",
              " ms · intento",
              " ",
              l.attempt
            ] }),
            u && /* @__PURE__ */ x.jsxs("div", { children: [
              l.error && /* @__PURE__ */ x.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d" }, children: `${l.error.code || "ERROR"}: ${l.error.message}

${l.error.stack || ""}` }),
              l.output && /* @__PURE__ */ x.jsx("pre", { className: "kfc-runlist__pre", children: Gk(l.output, 8e3) })
            ] })
          ]
        },
        s
      );
    })
  ] });
};
function Gk(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
const Qk = ({ nodeId: e, onClose: t }) => {
  var y, k, p, h;
  const n = X((g) => g.runContext), r = X((g) => g.graph), o = X((g) => g.catalog), [i, s] = P.useState("output"), l = P.useMemo(() => r.nodes.find((g) => g.id === e), [r.nodes, e]), u = P.useMemo(() => l ? $n(o, l.type) : void 0, [o, l]), a = (y = n == null ? void 0 : n.nodeStates) == null ? void 0 : y[e], c = P.useMemo(() => {
    var C, z;
    if (!n || !l) return [];
    const g = r.edges.filter((j) => j.target === e), v = [];
    for (const j of g) {
      const T = (C = n.nodeStates) == null ? void 0 : C[j.source];
      if ((z = T == null ? void 0 : T.output) != null && z.main)
        for (const S of T.output.main)
          Array.isArray(S) && v.push(...S);
    }
    return v;
  }, [n, l, r.edges, e]);
  if (!l)
    return /* @__PURE__ */ x.jsx("aside", { className: "kfc-drawer", "aria-label": "Logs del nodo", children: /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ x.jsx("div", { children: /* @__PURE__ */ x.jsx("div", { className: "kfc-drawer__title", children: "Nodo no encontrado" }) }),
      /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ x.jsx("i", { className: "pi pi-times" }) })
    ] }) });
  const f = (a == null ? void 0 : a.status) || "pending", d = ((p = (k = a == null ? void 0 : a.output) == null ? void 0 : k.main) == null ? void 0 : p.flat()) || [], m = ((h = a == null ? void 0 : a.output) == null ? void 0 : h.error) || [], w = d.length;
  return /* @__PURE__ */ x.jsxs("aside", { className: "kfc-drawer", "aria-label": `Logs del nodo ${l.id}`, children: [
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__header", children: [
      /* @__PURE__ */ x.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__title", title: (u == null ? void 0 : u.displayName) || l.type, children: [
          /* @__PURE__ */ x.jsx(
            "i",
            {
              className: Pe((u == null ? void 0 : u.icon) || "pi pi-circle"),
              style: { color: (u == null ? void 0 : u.color) || "#5E72E4", marginRight: 6 }
            }
          ),
          (u == null ? void 0 : u.displayName) || l.type
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__sub", children: [
          /* @__PURE__ */ x.jsx("span", { className: Pe("kfc-node__status", `kfc-node__status--${f}`), children: f }),
          (a == null ? void 0 : a.durationMs) != null && /* @__PURE__ */ x.jsxs("span", { children: [
            "· ",
            ad(a.durationMs)
          ] }),
          (a == null ? void 0 : a.attempt) != null && /* @__PURE__ */ x.jsxs("span", { children: [
            "· intento ",
            a.attempt
          ] })
        ] })
      ] }),
      /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: t, "aria-label": "Cerrar", children: /* @__PURE__ */ x.jsx("i", { className: "pi pi-times" }) })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__tabs", role: "tablist", children: [
      /* @__PURE__ */ x.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "output",
          className: Pe("kfc-drawer__tab", { "is-active": i === "output" }),
          onClick: () => s("output"),
          children: [
            "Salida ",
            w > 0 && /* @__PURE__ */ x.jsx("span", { className: "kfc-drawer__tab-count", children: w })
          ]
        }
      ),
      /* @__PURE__ */ x.jsxs(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "input",
          className: Pe("kfc-drawer__tab", { "is-active": i === "input" }),
          onClick: () => s("input"),
          children: [
            "Entrada ",
            c.length > 0 && /* @__PURE__ */ x.jsx("span", { className: "kfc-drawer__tab-count", children: c.length })
          ]
        }
      ),
      /* @__PURE__ */ x.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "error",
          className: Pe("kfc-drawer__tab", { "is-active": i === "error" }),
          onClick: () => s("error"),
          disabled: !(a != null && a.error) && m.length === 0,
          children: "Error"
        }
      ),
      /* @__PURE__ */ x.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i === "meta",
          className: Pe("kfc-drawer__tab", { "is-active": i === "meta" }),
          onClick: () => s("meta"),
          children: "Detalles"
        }
      )
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__body", children: [
      !a && /* @__PURE__ */ x.jsxs("div", { className: "kfc-empty", children: [
        /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__title", children: "Sin datos de ejecución" }),
        /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "Este nodo no se ha ejecutado en el run actual. Probá ejecutar el flow." })
      ] }),
      a && i === "output" && /* @__PURE__ */ x.jsx(x.Fragment, { children: d.length === 0 ? /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de salida." }) : d.map((g, v) => /* @__PURE__ */ x.jsx(Il, { index: v, item: g }, v)) }),
      a && i === "input" && /* @__PURE__ */ x.jsx(x.Fragment, { children: c.length === 0 ? /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", style: { padding: 16 }, children: "Sin items de entrada (probablemente es un trigger)." }) : c.map((g, v) => /* @__PURE__ */ x.jsx(Il, { index: v, item: g }, v)) }),
      a && i === "error" && /* @__PURE__ */ x.jsxs("div", { style: { padding: 12 }, children: [
        a.error ? /* @__PURE__ */ x.jsx("pre", { className: "kfc-runlist__pre", style: { background: "#7f1d1d", color: "#fee2e2" }, children: `${a.error.code || "ERROR"}: ${a.error.message}

${a.error.stack || ""}` }) : /* @__PURE__ */ x.jsx("div", { className: "kfc-empty__desc", children: "Sin errores." }),
        m.length > 0 && /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx("div", { className: "kfc-drawer__section-title", children: "Items en branch de error" }),
          m.map((g, v) => /* @__PURE__ */ x.jsx(Il, { index: v, item: g }, v))
        ] })
      ] }),
      a && i === "meta" && /* @__PURE__ */ x.jsxs("div", { style: { padding: 12, fontSize: 12 }, children: [
        /* @__PURE__ */ x.jsx(Jt, { k: "Status", v: a.status }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Iniciado", v: a.startedAt || "—" }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Finalizado", v: a.finishedAt || "—" }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Duración", v: a.durationMs != null ? ad(a.durationMs) : "—" }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Intento", v: String(a.attempt ?? "—") }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Items salida", v: String(w) }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Spec", v: (u == null ? void 0 : u.type) || l.type }),
        /* @__PURE__ */ x.jsx(Jt, { k: "Versión spec", v: u ? `v${u.version}` : "—" })
      ] })
    ] })
  ] });
}, Il = ({ item: e, index: t }) => {
  const [n, r] = P.useState(t < 3);
  return /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__item", children: [
    /* @__PURE__ */ x.jsxs(
      "button",
      {
        type: "button",
        className: "kfc-drawer__item-head",
        onClick: () => r((o) => !o),
        "aria-expanded": n,
        children: [
          /* @__PURE__ */ x.jsx("i", { className: `pi ${n ? "pi-chevron-down" : "pi-chevron-right"}` }),
          /* @__PURE__ */ x.jsxs("span", { children: [
            "Item #",
            t + 1
          ] }),
          (e == null ? void 0 : e.json) && typeof e.json == "object" && /* @__PURE__ */ x.jsx("span", { className: "kfc-drawer__item-summary", children: qk(e.json) })
        ]
      }
    ),
    n && /* @__PURE__ */ x.jsx("pre", { className: "kfc-runlist__pre", children: Zk(e, 6e3) })
  ] });
}, Jt = ({ k: e, v: t }) => /* @__PURE__ */ x.jsxs("div", { className: "kfc-drawer__kv", children: [
  /* @__PURE__ */ x.jsx("span", { className: "kfc-drawer__kv-k", children: e }),
  /* @__PURE__ */ x.jsx("span", { className: "kfc-drawer__kv-v", children: t })
] });
function Zk(e, t) {
  try {
    const n = JSON.stringify(e, null, 2);
    return n.length > t ? n.slice(0, t) + `
…(truncado)` : n;
  } catch {
    return String(e);
  }
}
function ad(e) {
  if (e < 1e3) return `${e}ms`;
  if (e < 6e4) return `${(e / 1e3).toFixed(1)}s`;
  const t = Math.floor(e / 6e4), n = Math.floor(e % 6e4 / 1e3);
  return `${t}m ${n}s`;
}
function qk(e) {
  if (!e) return "";
  const t = Object.keys(e);
  return t.length === 0 ? "(vacío)" : t.slice(0, 3).join(", ") + (t.length > 3 ? `, +${t.length - 3} más` : "");
}
const Jk = [
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
], eE = ({ readOnly: e, onTemplateClick: t }) => e ? null : /* @__PURE__ */ x.jsx("div", { className: "kfc-canvas-empty", role: "status", "aria-live": "polite", children: /* @__PURE__ */ x.jsxs("div", { className: "kfc-canvas-empty__inner", children: [
  /* @__PURE__ */ x.jsx("div", { className: "kfc-canvas-empty__arrow", "aria-hidden": !0, children: /* @__PURE__ */ x.jsxs("svg", { viewBox: "0 0 80 60", width: "80", height: "60", children: [
    /* @__PURE__ */ x.jsx(
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
    /* @__PURE__ */ x.jsx("polygon", { points: "14,24 6,30 14,36", fill: "#94a3b8" })
  ] }) }),
  /* @__PURE__ */ x.jsx("h2", { className: "kfc-canvas-empty__title", children: "Empezá tu flujo" }),
  /* @__PURE__ */ x.jsx("p", { className: "kfc-canvas-empty__desc", children: "Arrastrá un nodo desde el catálogo de la izquierda hacia este canvas. O empezá con una plantilla rápida." }),
  /* @__PURE__ */ x.jsx("div", { className: "kfc-canvas-empty__templates", children: Jk.map((n) => /* @__PURE__ */ x.jsxs(
    "button",
    {
      type: "button",
      className: "kfc-template-card",
      onClick: () => t == null ? void 0 : t(n.slug),
      style: { borderLeftColor: n.color },
      children: [
        /* @__PURE__ */ x.jsx("i", { className: `kfc-template-card__icon ${n.icon}`, style: { color: n.color } }),
        /* @__PURE__ */ x.jsxs("div", { className: "kfc-template-card__body", children: [
          /* @__PURE__ */ x.jsx("div", { className: "kfc-template-card__title", children: n.title }),
          /* @__PURE__ */ x.jsx("div", { className: "kfc-template-card__desc", children: n.desc })
        ] }),
        /* @__PURE__ */ x.jsx("i", { className: "pi pi-arrow-right kfc-template-card__cta" })
      ]
    },
    n.slug
  )) }),
  /* @__PURE__ */ x.jsxs("div", { className: "kfc-canvas-empty__hint", children: [
    /* @__PURE__ */ x.jsx("i", { className: "pi pi-info-circle" }),
    /* @__PURE__ */ x.jsxs("span", { children: [
      "Tip: presioná ",
      /* @__PURE__ */ x.jsx("kbd", { children: "?" }),
      " para ver todos los atajos de teclado."
    ] })
  ] })
] }) }), tE = ({
  onGraphChange: e,
  onNodeSelected: t,
  onRunRequested: n,
  onIntent: r
}) => {
  const o = X((D) => D.graph), i = X((D) => D.selectedNodeId), s = X((D) => D.setSelectedNodeId), l = X((D) => D.readOnly), u = X((D) => D.runContext), a = X((D) => D.rightView), c = X((D) => D.setRightView), f = X((D) => D.drawerNodeId), d = X((D) => D.setDrawerNodeId), m = X((D) => D.applyAutoLayout), [w, y] = I.useState(!1);
  P.useEffect(() => {
    e(o), y(eg(o));
  }, [o, e]), P.useEffect(() => {
    t(i), i && a === "none" ? c("config") : !i && a === "config" && c("none");
  }, [i]);
  const k = P.useCallback(
    (D) => {
      s(D);
    },
    [s]
  ), p = P.useCallback(() => {
    c("none"), s(null);
  }, [s, c]), h = P.useCallback(() => {
    n({ triggerData: [] });
  }, [n]), g = P.useCallback(() => {
    m(), r && r("autoLayoutApplied");
  }, [m, r]), v = P.useCallback(() => {
    r && r("showShortcuts");
  }, [r]), C = u == null ? void 0 : u.status, z = C === "running", j = P.useMemo(() => {
    if (!u) return null;
    const D = Object.values(u.nodeStates || {}), V = D.length, _ = D.filter((M) => M.status === "success" || M.status === "failed" || M.status === "skipped").length, $ = D.filter((M) => M.status === "failed").length;
    return { total: V, done: _, failed: $ };
  }, [u]), T = !o.nodes || o.nodes.length === 0, S = P.useCallback(() => d(null), [d]), N = a === "config" && i, L = a === "runs";
  return /* @__PURE__ */ x.jsx(nc, { children: /* @__PURE__ */ x.jsxs("div", { className: "kfc-root", children: [
    /* @__PURE__ */ x.jsx(Bk, { readOnly: l }),
    /* @__PURE__ */ x.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }, children: [
      /* @__PURE__ */ x.jsxs("div", { className: "kfc-toolbar", children: [
        /* @__PURE__ */ x.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: () => c(a === "runs" ? "none" : "runs"),
            title: "Ver historial / detalles del run",
            children: [
              /* @__PURE__ */ x.jsx("i", { className: "pi pi-history" }),
              "Historial"
            ]
          }
        ),
        !l && /* @__PURE__ */ x.jsxs(
          "button",
          {
            type: "button",
            className: "kfc-btn",
            onClick: g,
            title: "Reorganizar nodos automáticamente",
            children: [
              /* @__PURE__ */ x.jsx("i", { className: "pi pi-sitemap" }),
              "Reorganizar"
            ]
          }
        ),
        !l && /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: `kfc-btn kfc-btn--primary ${z ? "kfc-btn--running" : ""}`,
            onClick: h,
            disabled: z,
            title: "Ejecutar test-run (Ctrl+Enter)",
            children: z ? /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
              /* @__PURE__ */ x.jsx("i", { className: "pi pi-spin pi-spinner" }),
              "Ejecutando…"
            ] }) : /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
              /* @__PURE__ */ x.jsx("i", { className: "pi pi-play" }),
              "Ejecutar"
            ] })
          }
        ),
        j && j.total > 0 && /* @__PURE__ */ x.jsxs(
          "span",
          {
            className: `kfc-run-badge kfc-run-badge--${C === "success" ? "success" : C === "failed" ? "failed" : z ? "running" : "neutral"}`,
            title: `Run: ${C}`,
            children: [
              z && /* @__PURE__ */ x.jsx("i", { className: "pi pi-spin pi-spinner" }),
              !z && C === "success" && /* @__PURE__ */ x.jsx("i", { className: "pi pi-check-circle" }),
              !z && C === "failed" && /* @__PURE__ */ x.jsx("i", { className: "pi pi-times-circle" }),
              j.done,
              "/",
              j.total,
              " nodos",
              j.failed > 0 && /* @__PURE__ */ x.jsxs("span", { className: "kfc-run-badge__failed", children: [
                "· ",
                j.failed,
                " con error"
              ] })
            ]
          }
        ),
        w && /* @__PURE__ */ x.jsxs("span", { className: "kfc-pill kfc-pill--danger", title: "Hay un ciclo en el grafo", children: [
          /* @__PURE__ */ x.jsx("i", { className: "pi pi-exclamation-triangle" }),
          "Ciclo detectado · revisá conexiones"
        ] }),
        /* @__PURE__ */ x.jsx("span", { style: { flex: 1 } }),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: "kfc-btn kfc-btn--ghost",
            onClick: v,
            title: "Atajos de teclado (?)",
            "aria-label": "Atajos de teclado",
            children: /* @__PURE__ */ x.jsx("i", { className: "pi pi-question-circle" })
          }
        ),
        l && /* @__PURE__ */ x.jsxs("span", { className: "kfc-pill kfc-pill--neutral", children: [
          /* @__PURE__ */ x.jsx("i", { className: "pi pi-lock" }),
          "Solo lectura"
        ] })
      ] }),
      /* @__PURE__ */ x.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
        /* @__PURE__ */ x.jsx(Hk, { onSelectNode: k, onIntent: r }),
        T && /* @__PURE__ */ x.jsx(
          eE,
          {
            readOnly: l,
            onTemplateClick: (D) => r == null ? void 0 : r("installTemplate", { slug: D })
          }
        )
      ] })
    ] }),
    N && /* @__PURE__ */ x.jsx(Uk, { onClose: p }),
    L && /* @__PURE__ */ x.jsxs("aside", { className: "kfc-config", "aria-label": "Historial de ejecuciones", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "kfc-config__header", children: [
        /* @__PURE__ */ x.jsxs("div", { children: [
          /* @__PURE__ */ x.jsx("div", { className: "kfc-config__title", children: "Detalles del run" }),
          u && /* @__PURE__ */ x.jsxs("div", { style: { fontSize: 11, color: "#6b7280" }, children: [
            C,
            " · ",
            u.totalDurationMs ?? "—",
            " ms"
          ] })
        ] }),
        /* @__PURE__ */ x.jsx("button", { type: "button", className: "kfc-btn", onClick: () => c("none"), "aria-label": "Cerrar", children: /* @__PURE__ */ x.jsx("i", { className: "pi pi-times" }) })
      ] }),
      /* @__PURE__ */ x.jsx("div", { className: "kfc-config__body", style: { padding: 0 }, children: /* @__PURE__ */ x.jsx(Kk, { runContext: u }) })
    ] }),
    f && /* @__PURE__ */ x.jsx(Qk, { nodeId: f, onClose: S })
  ] }) });
};
class nE extends HTMLElement {
  constructor() {
    super(...arguments);
    Nt(this, "root", null);
    Nt(this, "mountPoint", null);
    Nt(this, "suppressEmit", !1);
    Nt(this, "keydownHandler");
    Nt(this, "_graph", { nodes: [], edges: [] });
    Nt(this, "_catalog", []);
    Nt(this, "_runContext", null);
    Nt(this, "_readOnly", !1);
    Nt(this, "_selectedNodeId", null);
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
  static get observedAttributes() {
    return ["read-only"];
  }
  attributeChangedCallback(n, r, o) {
    n === "read-only" && (this.readOnly = o !== null && o !== "false");
  }
  connectedCallback() {
    this.root || (this.mountPoint = document.createElement("div"), this.mountPoint.style.width = "100%", this.mountPoint.style.height = "100%", this.mountPoint.style.position = "relative", this.mountPoint.style.display = "flex", this.style.display = this.style.display || "block", this.style.position = this.style.position || "relative", this.style.minHeight = this.style.minHeight || "500px", this.appendChild(this.mountPoint), X.getState().setGraph(this._graph), X.getState().setCatalog(this._catalog), X.getState().setRunContext(this._runContext), X.getState().setReadOnly(this._readOnly), X.getState().setSelectedNodeId(this._selectedNodeId), this.root = Sh(this.mountPoint), this.root.render(
      /* @__PURE__ */ x.jsx(
        tE,
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
customElements.get("katuq-flow-canvas") || customElements.define("katuq-flow-canvas", nE);
export {
  nE as KatuqFlowCanvas
};
//# sourceMappingURL=flow-canvas.js.map
