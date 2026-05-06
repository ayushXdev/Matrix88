/**
 * App.jsx — Matrix08 Frontend
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *   1. Login page   — JWT-based authentication against backend
 *   2. RBAC         — admin sees ALL controls; user sees routing only
 *   3. Multi-select — select multiple OUT buttons; "ALL" selects 1-8
 *   4. Switch-multi — single backend call with staggered TCP cmds (fixes Display 3 bug)
 *   5. Live logs    — RX stream + full log panel, auto-scroll, stable keys
 *   6. Admin panel  — change credentials + user management
 *   7. TCP config   — admin-only settings panel
 *   8. Label rename — admin-only, double-click on buttons
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import LiveRoutingMatrix from "./components/LiveRoutingMatrix";

const API_BASE  = import.meta.env.VITE_API_BASE  || "http://localhost:4000";
const SOCKET_URL= import.meta.env.VITE_SOCKET_URL || API_BASE;
const NUMS      = Array.from({ length: 8 }, (_, i) => i + 1);

// ── Helpers ───────────────────────────────────────────────────────────────────
let _logSeq = 0;
function mkLog(type, message, ts) {
  return { id: ++_logSeq, type, message, timestamp: ts || new Date().toISOString(),
           line: `${new Date(ts || Date.now()).toLocaleTimeString()} [${type}] ${message}` };
}
function logColor(type) {
  if (type === "RX")     return "text-emerald-400";
  if (type === "TX")     return "text-slate-400";
  if (type === "SYSTEM") return "text-sky-400";
  if (type === "ERROR")  return "text-rose-400";
  if (type === "API")    return "text-amber-300";
  return "text-slate-400";
}
function storedJSON(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Auth helpers (localStorage token) ────────────────────────────────────────
function getSession() { return storedJSON("matrix08_session", null); }
function setSession(s){ saveJSON("matrix08_session", s); }
function clearSession(){ localStorage.removeItem("matrix08_session"); }
function authHeader()  {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true); setError("");
    const { ok, data } = await apiFetch("/api/auth/login", { method: "POST", body: { username, password } });
    if (ok) {
      setSession({ token: data.token, username: data.username, role: data.role });
      onLogin({ username: data.username, role: data.role });
    } else {
      setError(data.error || "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#020a0f" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{ backgroundImage:"linear-gradient(#00e5ff 1px,transparent 1px),linear-gradient(90deg,#00e5ff 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-4 rounded-2xl opacity-20 blur-2xl" style={{ background:"radial-gradient(ellipse,#00e5ff 0%,transparent 70%)" }}/>
        <div className="relative rounded-xl border border-cyan-500/30 bg-black/80 p-8"
          style={{ boxShadow:"0 0 40px rgba(0,229,255,0.08),inset 0 1px 0 rgba(0,229,255,0.15)" }}>
          <div className="mb-8 text-center">
            <h1 className="text-3xl uppercase tracking-[0.35em] font-normal"
              style={{ color:"#00e5ff", textShadow:"0 0 20px rgba(0,229,255,0.6)" }}>Matrix08</h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">8×8 HDMI Matrix Switcher</p>
            <div className="mt-4 h-px w-full" style={{ background:"linear-gradient(90deg,transparent,rgba(0,229,255,0.4),transparent)" }}/>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Username</label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="username"
                className="w-full rounded border border-cyan-500/30 bg-black/60 px-3 py-2.5 text-sm text-cyan-100 outline-none transition focus:border-cyan-400 placeholder:text-slate-600"
                placeholder="admin or user"/>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="current-password"
                className="w-full rounded border border-cyan-500/30 bg-black/60 px-3 py-2.5 text-sm text-cyan-100 outline-none transition focus:border-cyan-400 placeholder:text-slate-600"
                placeholder="••••••••"/>
            </div>
            {error && <p className="text-center text-xs text-rose-400">{error}</p>}
            <button type="button" onClick={handleLogin} disabled={loading||!username||!password}
              className="mt-2 w-full rounded border border-cyan-500/60 bg-cyan-950/40 py-3 text-xs uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-900/50 disabled:opacity-40">
              {loading ? "Authenticating…" : "Sign In"}
            </button>
          </div>
          <p className="mt-6 text-center text-[9px] text-slate-600">
            Default: admin/admin123 · user/user123
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#050508]/95 p-6"
        style={{ boxShadow:"0 0 50px rgba(0,229,255,0.1)" }} onClick={e=>e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.3em] text-cyan-400">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Admin: change own credentials */
function ChangeCredentialsModal({ session, onClose, onUpdate }) {
  const [curPass,  setCurPass]  = useState("");
  const [newUser,  setNewUser]  = useState(session.username);
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!curPass)                          return setError("Current password required");
    if (newPass && newPass.length < 4)     return setError("New password must be ≥ 4 characters");
    if (newPass && newPass !== confirm)    return setError("New passwords do not match");
    setLoading(true);
    const { ok, data } = await apiFetch("/api/auth/change-password", {
      method:"POST", body:{ currentPassword:curPass, newUsername:newUser, newPassword:newPass||undefined },
    });
    setLoading(false);
    if (!ok) return setError(data.error || "Update failed");
    setSuccess("Credentials updated! Please log in again.");
    setTimeout(() => { onUpdate(); onClose(); }, 1500);
  };

  return (
    <Modal title="Change Credentials" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Current Password"><Input type="password" value={curPass} onChange={setCurPass} placeholder="Verify current password" autoFocus/></Field>
        <div className="h-px bg-white/5"/>
        <Field label="New Username (optional)"><Input value={newUser} onChange={setNewUser}/></Field>
        <Field label="New Password (leave blank to keep)"><Input type="password" value={newPass} onChange={setNewPass} placeholder="New password (optional)"/></Field>
        {newPass && <Field label="Confirm New Password"><Input type="password" value={confirm} onChange={setConfirm} onEnter={handleSave}/></Field>}
        {error   && <p className="text-xs text-rose-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}
        <div className="flex gap-2 pt-1">
          <Btn onClick={handleSave} disabled={loading} variant="cyan">{loading?"Saving…":"Save"}</Btn>
          <Btn onClick={onClose} variant="muted">Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

/** Admin: manage all users */
function UserManagementModal({ onClose }) {
  const [users,   setUsers]   = useState([]);
  const [form,    setForm]    = useState({ username:"", password:"", role:"user" });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch("/api/auth/users");
    if (ok) setUsers(data.users || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpsert = async () => {
    setError(""); setSuccess("");
    if (!form.username) return setError("Username required");
    const { ok, data } = await apiFetch("/api/auth/users", { method:"POST", body:form });
    if (!ok) return setError(data.error || "Failed");
    setSuccess("User saved"); setForm({ username:"", password:"", role:"user" }); load();
  };

  const handleDelete = async (uname) => {
    if (!window.confirm(`Delete user "${uname}"?`)) return;
    const { ok, data } = await apiFetch(`/api/auth/users/${uname}`, { method:"DELETE" });
    if (!ok) return setError(data.error || "Failed");
    load();
  };

  return (
    <Modal title="User Management" onClose={onClose}>
      {/* Current users */}
      <div className="mb-4 max-h-40 overflow-y-auto scroll-dark rounded border border-white/10">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-white/10">
            <th className="p-2 text-left text-slate-500 uppercase tracking-wider">Username</th>
            <th className="p-2 text-left text-slate-500 uppercase tracking-wider">Role</th>
            <th className="p-2"/>
          </tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.username} className="border-b border-white/5">
                <td className="p-2 text-cyan-300">{u.username}</td>
                <td className="p-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${u.role==="admin"?"bg-cyan-950/60 text-cyan-400":"bg-slate-900 text-slate-400"}`}>{u.role}</span>
                </td>
                <td className="p-2 text-right">
                  <button onClick={()=>handleDelete(u.username)} className="text-rose-500/60 hover:text-rose-400 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Add / update user */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Add / Update User</p>
        <Field label="Username"><Input value={form.username} onChange={v=>setForm(f=>({...f,username:v}))}/></Field>
        <Field label="Password"><Input type="password" value={form.password} onChange={v=>setForm(f=>({...f,password:v}))} placeholder="Leave blank to keep existing"/></Field>
        <Field label="Role">
          <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
            className="w-full rounded border border-cyan-500/25 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        {error   && <p className="text-xs text-rose-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}
        <Btn onClick={handleUpsert} variant="cyan">Save User</Btn>
      </div>
    </Modal>
  );
}

/** Admin: rename an IN or OUT button */
function RenameModal({ type, index, currentLabel, onSave, onClose }) {
  const [value, setValue] = useState(currentLabel);
  return (
    <Modal title={`Rename ${type==="input"?"HDMI Source":"Display"} ${index}`} onClose={onClose}>
      <Input autoFocus value={value} onChange={setValue}
        onEnter={()=>onSave(value)} onEscape={onClose}/>
      <div className="mt-4 flex gap-2">
        <Btn onClick={()=>onSave(value)} variant="cyan">Save</Btn>
        <Btn onClick={onClose} variant="muted">Cancel</Btn>
      </div>
    </Modal>
  );
}

// ── Small shared UI atoms ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}
function Input({ type="text", value, onChange, placeholder, autoFocus, onEnter, onEscape }) {
  return (
    <input type={type} value={value} autoFocus={autoFocus}
      onChange={e=>onChange(e.target.value)}
      onKeyDown={e=>{ if(e.key==="Enter"&&onEnter) onEnter(); if(e.key==="Escape"&&onEscape) onEscape(); }}
      placeholder={placeholder}
      className="w-full rounded border border-cyan-500/25 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400 placeholder:text-slate-700"/>
  );
}
function Btn({ onClick, disabled, variant="muted", children }) {
  const cls = {
    cyan:   "border-cyan-500/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50",
    orange: "border-orange-500/50 bg-orange-950/30 text-orange-300 hover:bg-orange-900/40",
    muted:  "border-white/15 bg-black/40 text-slate-400 hover:border-white/30",
    danger: "border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40",
  }[variant];
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex-1 rounded border py-2 text-xs uppercase tracking-wider transition disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

// ── Auto-scrolling log box ────────────────────────────────────────────────────
function LogBox({ entries, renderEntry, emptyMsg, maxH="max-h-48" }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }, [entries]);
  return (
    <div className={`${maxH} overflow-y-auto scroll-dark rounded border border-white/10 bg-black/60 p-3 font-mono text-[11px]`}>
      {entries.length===0
        ? <p className="text-slate-600">{emptyMsg}</p>
        : entries.map(renderEntry)
      }
      <div ref={bottomRef}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [session,  setSessionState] = useState(() => getSession()); // { token, username, role }
  const isAdmin    = session?.role === "admin";

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showChangeCreds, setShowChangeCreds] = useState(false);
  const [showUserMgmt,    setShowUserMgmt]    = useState(false);
  const [renameModal,     setRenameModal]     = useState(null);  // { type, index }

  // ── Labels (admin-only edit) ───────────────────────────────────────────────
  const [inputLabels,  setInputLabels]  = useState(() => storedJSON("inputLabels",  {}));
  const [outputLabels, setOutputLabels] = useState(() => storedJSON("outputLabels", {}));
  const inLabel  = (n) => inputLabels[n]  || `IN ${n}`;
  const outLabel = (n) => outputLabels[n] || `OUT ${n}`;
  const saveInLabel  = (n, v) => { const u={...inputLabels,[n]:v};  setInputLabels(u);  saveJSON("inputLabels",u); };
  const saveOutLabel = (n, v) => { const u={...outputLabels,[n]:v}; setOutputLabels(u); saveJSON("outputLabels",u); };

  // ── Matrix state ───────────────────────────────────────────────────────────
  const [routes,          setRoutes]          = useState({});
  const [selectedInput,   setSelectedInput]   = useState(1);
  const [selectedOutputs, setSelectedOutputs] = useState([1]);
  const [pickPhase,       setPickPhase]       = useState("in");
  const [connected,       setConnected]       = useState(false);
  const [lastTx,          setLastTx]          = useState("");
  const [lastRx,          setLastRx]          = useState("");
  const [rxFeed,          setRxFeed]          = useState([]); // RX-only stream
  const [fullLog,         setFullLog]         = useState([]); // all types
  const [loading,         setLoading]         = useState(false);
  const [syncBusy,        setSyncBusy]        = useState(false);
  const [pendingRoute,    setPendingRoute]     = useState(null);
  const [mongoConnected,  setMongoConnected]   = useState(false);
  const [tcp,             setTcp]              = useState({ matrixIp:"", matrixPort:23, timeoutMs:1000, reconnectMs:3000 });
  const [tcpSaving,       setTcpSaving]        = useState(false);

  // ── Log helpers ────────────────────────────────────────────────────────────
  const addLog = useCallback((type, message, ts) => {
    setFullLog(prev => [...prev, mkLog(type, message, ts)].slice(-200));
  }, []);
  const addRx = useCallback((message, ts) => {
    setRxFeed(prev => {
      if (prev.length && prev[prev.length-1].message === message) return prev;
      return [...prev, mkLog("RX", message, ts)].slice(-100);
    });
  }, []);

  // ── Socket ─────────────────────────────────────────────────────────────────
  const socket = useMemo(() => io(SOCKET_URL, { transports:["polling","websocket"], reconnection:true }), []);

  // ── Settings (admin only) ──────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!isAdmin) return;
    const { ok, data } = await apiFetch("/api/settings");
    if (!ok) return;
    setMongoConnected(Boolean(data.mongoConnected));
    setTcp({ matrixIp:data.matrixIp||"", matrixPort:data.matrixPort??23, timeoutMs:data.timeoutMs??1000, reconnectMs:data.reconnectMs??3000 });
  }, [isAdmin]);

  useEffect(() => { if (session) loadSettings(); }, [session, loadSettings]);

  // ── Clear pending when route confirmed ─────────────────────────────────────
  const clearPending = useCallback((state) => {
    setPendingRoute(prev => (!prev||!state) ? prev : (state[prev.output]===prev.input ? null : prev));
  }, []);

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    // Initial REST fetch
    apiFetch("/api/state").then(({ ok, data }) => {
      if (!ok) return setConnected(false);
      setRoutes(data.routes||{}); setConnected(Boolean(data.connected));
      if (data.lastTx) setLastTx(data.lastTx);
      if (data.lastRx) setLastRx(data.lastRx);
      clearPending(data.routes||{});
      // Populate log panels from history
      const rxH = Array.isArray(data.recentRx)   ? [...data.recentRx].reverse()   : [];
      const lgH = Array.isArray(data.recentLogs)  ? [...data.recentLogs].reverse() : [];
      rxH.forEach(e => addRx(e.message, e.timestamp));
      lgH.forEach(e => addLog(e.type, e.message, e.timestamp));
      if (rxH.length) setLastRx(data.recentRx[0].message);
    }).catch(() => setConnected(false));

    const onInit = (p) => {
      setRoutes(p.routes||{}); setConnected(Boolean(p.connected));
      if (p.lastTx) setLastTx(p.lastTx);
      if (p.lastRx) setLastRx(p.lastRx);
      clearPending(p.routes||{});
      setRxFeed([]); setFullLog([]);
      const rxH = Array.isArray(p.recentRx)   ? [...p.recentRx].reverse()   : [];
      const lgH = Array.isArray(p.recentLogs)  ? [...p.recentLogs].reverse() : [];
      rxH.forEach(e => addRx(e.message, e.timestamp));
      lgH.forEach(e => addLog(e.type, e.message, e.timestamp));
      if (rxH.length) setLastRx(p.recentRx[0].message);
    };
    const onUpdate = (p) => {
      setRoutes(p.matrixState||{}); clearPending(p.matrixState||{});
    };
    const onConn = (p) => {
      setConnected(Boolean(p.connected));
      addLog("SYSTEM", p.connected ? "Device connected" : "Device disconnected");
    };
    const onLog = (e) => {
      addLog(e.type, e.message, e.timestamp);
      if (e.type==="TX") setLastTx(e.message);
      if (e.type==="RX") { setLastRx(e.message); addRx(e.message, e.timestamp); }
    };
    const onErr = (e) => addLog("ERROR", e.message);

    socket.on("matrix:init",       onInit);
    socket.on("matrix:update",     onUpdate);
    socket.on("matrix:connection", onConn);
    socket.on("matrix:log",        onLog);
    socket.on("matrix:error",      onErr);
    return () => {
      socket.off("matrix:init",       onInit);
      socket.off("matrix:update",     onUpdate);
      socket.off("matrix:connection", onConn);
      socket.off("matrix:log",        onLog);
      socket.off("matrix:error",      onErr);
    };
  }, [socket, session, clearPending, addLog, addRx]);

  // ── Output selection ───────────────────────────────────────────────────────
  const toggleOutput = (n) => {
    setSelectedOutputs(prev =>
      prev.includes(n)
        ? prev.length===1 ? prev : prev.filter(x=>x!==n)
        : [...prev, n].sort((a,b)=>a-b)
    );
  };
  /** Select ALL 8 outputs — fixes the "ALL skips Display 3" bug.
   *  We simply set state to [1,2,3,4,5,6,7,8] explicitly, no loops with conditions. */
  const selectAll = () => setSelectedOutputs([1,2,3,4,5,6,7,8]);
  const clearAll  = () => setSelectedOutputs([1]);

  // ── Switch ─────────────────────────────────────────────────────────────────
  /**
   * handleSwitch — uses /api/switch-multi endpoint.
   * Sends ONE request with all outputs; backend staggers the TCP commands
   * 300ms apart to prevent the device from dropping Display 3 (or any other).
   */
  const handleSwitch = async () => {
    try {
      setLoading(true);
      const { ok, data } = await apiFetch("/api/switch-multi", {
        method: "POST",
        body:   { input: selectedInput, outputs: selectedOutputs },
      });
      if (!ok) throw new Error(data.error || "Switch failed");
      setPendingRoute({ input: selectedInput, output: selectedOutputs[selectedOutputs.length-1] });
      addLog("API", `Switch queued: IN${selectedInput} → OUT[${selectedOutputs.join(",")}]`);
    } catch (err) {
      addLog("ERROR", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncBusy(true);
      const { ok, data } = await apiFetch("/api/sync-all", { method:"POST" });
      if (!ok) throw new Error(data.error || "Sync failed");
      addLog("API", data.message);
    } catch (err) {
      addLog("ERROR", err.message);
    } finally {
      setTimeout(() => setSyncBusy(false), 1200);
    }
  };

  const handleSaveTcp = async () => {
    try {
      setTcpSaving(true);
      const { ok, data } = await apiFetch("/api/settings", { method:"POST", body:tcp });
      if (!ok) throw new Error(data.error || "Save failed");
      addLog("API", data.message || "Settings saved");
      loadSettings();
    } catch (err) {
      addLog("ERROR", err.message);
    } finally {
      setTcpSaving(false);
    }
  };

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleLogout = () => { clearSession(); setSessionState(null); setRoutes({}); setFullLog([]); setRxFeed([]); };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!session) {
    return <LoginPage onLogin={(s) => { setSessionState({ ...getSession(), ...s }); }} />;
  }

  const instruction = pickPhase==="in"
    ? "Step 1 — Select HDMI Source (IN)"
    : "Step 2 — Select Display(s) (OUT) — multi-select enabled";

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen p-3 text-slate-100 md:p-6">

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showChangeCreds && (
        <ChangeCredentialsModal session={session} onClose={()=>setShowChangeCreds(false)}
          onUpdate={handleLogout}/>
      )}
      {showUserMgmt && <UserManagementModal onClose={()=>setShowUserMgmt(false)}/>}
      {renameModal && (
        <RenameModal type={renameModal.type} index={renameModal.index}
          currentLabel={renameModal.type==="input" ? inLabel(renameModal.index) : outLabel(renameModal.index)}
          onSave={(label) => {
            if (renameModal.type==="input") saveInLabel(renameModal.index, label);
            else saveOutLabel(renameModal.index, label);
            setRenameModal(null);
          }}
          onClose={()=>setRenameModal(null)}/>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-3xl font-normal uppercase tracking-[0.35em] text-glow-cyan text-cyan-400 md:text-4xl">Matrix08</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">8×8 HDMI Matrix Switcher Control</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Role badge */}
            <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${isAdmin?"border-cyan-500/40 bg-cyan-950/30 text-cyan-400":"border-slate-700 bg-slate-900/40 text-slate-400"}`}>
              {isAdmin ? "⚙ Admin" : "👤 User"}
            </span>
            {/* DB status (admin only) */}
            {isAdmin && (
              <span className={`text-[10px] uppercase tracking-widest ${mongoConnected?"text-emerald-500":"text-slate-600"}`}>
                DB {mongoConnected?"live":"off"}
              </span>
            )}
            {/* Connection status */}
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest ${connected?"border-emerald-500/50 bg-emerald-950/40 text-emerald-300":"border-rose-500/50 bg-rose-950/30 text-rose-300"}`}>
              <span className={`h-2 w-2 rounded-full ${connected?"bg-emerald-400 shadow-[0_0_8px_#34d399]":"bg-rose-500"}`}/>
              {connected ? "Online" : "Offline"}
            </div>
            {/* Admin-only buttons */}
            {isAdmin && (<>
              <button type="button" onClick={()=>setShowChangeCreds(true)}
                className="rounded border border-cyan-500/30 bg-cyan-950/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-cyan-400 hover:border-cyan-400/60 transition">
                🔑 Credentials
              </button>
              <button type="button" onClick={()=>setShowUserMgmt(true)}
                className="rounded border border-cyan-500/30 bg-cyan-950/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-cyan-400 hover:border-cyan-400/60 transition">
                👥 Users
              </button>
            </>)}
            <button type="button" onClick={handleLogout}
              className="rounded border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:border-rose-500/40 hover:text-rose-400 transition">
              Logout
            </button>
          </div>
        </header>

        {/* ── TCP CONFIG (admin only) ────────────────────────────────────────── */}
        {isAdmin && (
          <section className="border-glow-cyan rounded-lg border border-cyan-500/25 bg-[#0a0c10]/80 p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-cyan-400/80">TCP Configuration — Xilica DSP</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Device IP">
                <input className="w-full rounded border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
                  value={tcp.matrixIp} onChange={e=>setTcp(t=>({...t,matrixIp:e.target.value}))}/>
              </Field>
              <Field label="TCP Port">
                <input type="number" className="w-full rounded border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
                  value={tcp.matrixPort} onChange={e=>setTcp(t=>({...t,matrixPort:Number(e.target.value)}))}/>
              </Field>
              <Field label="Timeout (ms)">
                <input type="number" className="w-full rounded border border-cyan-500/30 bg-black/50 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400"
                  value={tcp.timeoutMs} onChange={e=>setTcp(t=>({...t,timeoutMs:Number(e.target.value)}))}/>
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={handleSaveTcp} disabled={tcpSaving}
                  className="w-full rounded border border-orange-500/50 bg-orange-950/30 py-2 text-xs uppercase tracking-wider text-orange-300 transition hover:bg-orange-900/40 disabled:opacity-50">
                  {tcpSaving ? "Saving…" : "Apply & Reconnect"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── IN / OUT BUTTONS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* HDMI Source — IN 1-8 */}
          <section className="border-glow-cyan rounded-lg border border-cyan-500/25 bg-[#0a0c10]/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-400">HDMI Source — IN 1–8</h2>
              {isAdmin && <span className="text-[9px] text-slate-600">Double-click to rename</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {NUMS.map(n => (
                <button key={n} type="button"
                  onClick={() => { setSelectedInput(n); setPickPhase("out"); }}
                  onDoubleClick={() => isAdmin && setRenameModal({ type:"input", index:n })}
                  onContextMenu={e => { if(!isAdmin) return; e.preventDefault(); setRenameModal({ type:"input", index:n }); }}
                  className={`rounded-lg border py-3 text-center transition ${selectedInput===n
                    ? "border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                    : "border-cyan-900/40 bg-black/40 text-slate-400 hover:border-cyan-500/50"}`}>
                  <span className="block text-xl font-semibold">{n}</span>
                  {inputLabels[n]
                    ? <span className="block truncate px-1 text-[9px] text-cyan-400/80">{inputLabels[n]}</span>
                    : <span className="text-[10px] uppercase tracking-widest text-slate-600">IN</span>}
                </button>
              ))}
            </div>
          </section>

          {/* Display Destination — OUT 1-8 + ALL / CLEAR buttons */}
          <section className="border-glow-orange rounded-lg border border-orange-500/30 bg-[#0a0c10]/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs uppercase tracking-[0.25em] text-orange-400">
                Display Destination — OUT 1–8
                <span className="ml-2 text-[9px] text-orange-400/50">(multi)</span>
              </h2>
              <div className="flex gap-1.5">
                {/* ALL button — selects [1,2,3,4,5,6,7,8] explicitly */}
                <button type="button" onClick={selectAll}
                  className="rounded border border-orange-500/50 bg-orange-950/30 px-2 py-1 text-[10px] uppercase tracking-wider text-orange-300 hover:bg-orange-900/40">
                  ALL
                </button>
                <button type="button" onClick={clearAll}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:border-white/30">
                  CLR
                </button>
                {isAdmin && <span className="self-center text-[9px] text-slate-600">DblClick=rename</span>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {NUMS.map(n => (
                <button key={n} type="button"
                  onClick={() => toggleOutput(n)}
                  onDoubleClick={() => isAdmin && setRenameModal({ type:"output", index:n })}
                  onContextMenu={e => { if(!isAdmin) return; e.preventDefault(); setRenameModal({ type:"output", index:n }); }}
                  className={`relative rounded-lg border py-3 text-center transition ${selectedOutputs.includes(n)
                    ? "border-orange-400 bg-orange-950/50 text-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.25)]"
                    : "border-orange-900/40 bg-black/40 text-slate-400 hover:border-orange-500/50"}`}>
                  {selectedOutputs.includes(n) && (
                    <span className="absolute right-1.5 top-1 text-[8px] text-orange-300">✓</span>
                  )}
                  <span className="block text-xl font-semibold">{n}</span>
                  {outputLabels[n]
                    ? <span className="block truncate px-1 text-[9px] text-orange-400/80">{outputLabels[n]}</span>
                    : <span className="text-[10px] uppercase tracking-widest text-slate-600">OUT</span>}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-slate-600">
              Selected: <span className="text-orange-400">{selectedOutputs.map(n=>outLabel(n)).join(", ")}</span>
            </p>
          </section>
        </div>

        {/* ── SOURCE → DIST PANEL ───────────────────────────────────────────── */}
        <section className="border-glow-cyan rounded-lg border border-cyan-500/20 bg-[#0a0c10]/80 p-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Source IN</p>
              <p className="text-4xl font-light text-cyan-300">{selectedInput}</p>
              {inputLabels[selectedInput] && <p className="mt-0.5 text-[10px] text-cyan-400/70">{inputLabels[selectedInput]}</p>}
            </div>
            <span className="text-3xl text-slate-700">→</span>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">DIST OUT</p>
              <div className="mt-1 flex flex-wrap justify-center gap-3">
                {selectedOutputs.map(n => (
                  <div key={n} className="min-w-[2rem] text-center">
                    <span className="block text-4xl font-light text-orange-300">{n}</span>
                    {outputLabels[n] && <span className="block text-[9px] text-orange-400/70">{outputLabels[n]}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs uppercase tracking-widest text-slate-600">{instruction}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={handleSwitch} disabled={loading}
              className="flex items-center gap-2 rounded border border-cyan-500/60 bg-cyan-950/40 px-6 py-3 text-sm uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-900/50 disabled:opacity-50"
              style={{ boxShadow:"0 0 16px rgba(0,229,255,0.15)" }}>
              <span>⚡</span>
              {loading ? "Switching…" : `Switch Now${selectedOutputs.length>1?` (${selectedOutputs.length} outputs)`:""}`}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={()=>{ setSelectedInput(1); setPickPhase("in"); }}
              className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 hover:border-white/25">Reset IN</button>
            <button type="button" onClick={()=>{ setSelectedOutputs([1]); setPickPhase("in"); }}
              className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 hover:border-white/25">Reset OUT</button>
            <button type="button" onClick={()=>{ setFullLog([]); setRxFeed([]); setPendingRoute(null); setPickPhase("in"); }}
              className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 hover:border-rose-500/40 hover:text-rose-400">Clear Logs</button>
          </div>
        </section>

        {/* ── SYSTEM MONITOR ────────────────────────────────────────────────── */}
        <section className="border-glow-cyan rounded-lg border border-cyan-500/20 bg-[#0a0c10]/80 p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">System Monitor</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded border border-white/10 bg-black/50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Last Command (TX)</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">{lastTx||"—"}</p>
            </div>
            <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-600">Last Device Response (RX)</p>
              <p className="mt-1 break-all font-mono text-xs text-emerald-200">{lastRx||"Waiting…"}</p>
            </div>
          </div>
          {/* RX Stream */}
          <div className="mt-3">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-600">Device Feedback (RX Stream)</p>
            <LogBox maxH="max-h-40" entries={rxFeed} emptyMsg="No RX lines yet. Waiting for device responses…"
              renderEntry={e=>(
                <p key={e.id} className="text-emerald-400 leading-5">
                  <span className="text-slate-600 mr-1">{new Date(e.timestamp).toLocaleTimeString()}</span>{e.message}
                </p>
              )}/>
          </div>
          {/* Full log — admin only (user can't see raw TCP logs) */}
          {isAdmin && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-600">Full Log (All Events)</p>
              <LogBox maxH="max-h-52" entries={fullLog} emptyMsg="No log entries yet."
                renderEntry={e=>(
                  <p key={e.id} className={`leading-5 ${logColor(e.type)}`}>{e.line}</p>
                )}/>
            </div>
          )}
        </section>

        {/* ── LIVE ROUTING MATRIX ───────────────────────────────────────────── */}
        <LiveRoutingMatrix
          routes={routes} pendingRoute={pendingRoute}
          onSyncAll={handleSyncAll} syncBusy={syncBusy}
          inputLabels={inputLabels} outputLabels={outputLabels}
          isAdmin={isAdmin}
        />

      </div>
    </main>
  );
}
