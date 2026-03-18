const API_URL = 'https://api.tongateway.ai';
const POLL_INTERVAL = 5000;

let clientToken = null;
let clientSessionId = null;
let walletAddress = null;
let pollTimer = null;

// --- TON Connect ---

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: window.location.origin + '/tonconnect-manifest.json',
  buttonRootId: 'ton-connect',
});

tonConnectUI.onStatusChange(async (wallet) => {
  if (wallet) {
    walletAddress = wallet.account.address;
    log('Wallet connected: ' + shortAddr(walletAddress));
    await initSession();
    await persistTcSession();
  } else {
    walletAddress = null;
    clientToken = null;
    clientSessionId = null;
    stopPolling();
    hide('auth-section');
    hide('tx-section');
    log('Wallet disconnected');
  }
});

// --- Auth ---

async function initSession() {
  try {
    const res = await fetch(API_URL + '/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, label: 'dashboard', reuse: true }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Auth failed');

    clientToken = data.token;
    clientSessionId = data.sessionId;
    show('auth-section');
    show('tx-section');
    startPolling();
    await loadSessions();
    log('Connected', 'ok');
  } catch (e) {
    log('Auth error: ' + e.message, 'err');
  }
}

// --- Persist TON Connect session to server ---

async function persistTcSession() {
  try {
    const connector = tonConnectUI.connector;
    if (!connector) return;

    // Access the internal bridge provider session
    const provider = connector._provider;
    if (!provider || !provider.session) return;

    const session = provider.session;
    if (!session.sessionCrypto || !session.walletPublicKey) return;

    const crypto = session.sessionCrypto;
    const secretKeyHex = Array.from(crypto.keyPair.secretKey).map(b => b.toString(16).padStart(2, '0')).join('');
    const publicKeyHex = crypto.sessionId; // already hex
    const bridgeUrl = provider.gateway?.bridgeUrl || 'https://bridge.tonapi.io/bridge';

    await fetch(API_URL + '/v1/auth/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + clientToken,
      },
      body: JSON.stringify({
        secretKey: secretKeyHex,
        publicKey: publicKeyHex,
        walletPublicKey: session.walletPublicKey,
        bridgeUrl: bridgeUrl,
      }),
    });
    log('Wallet session saved for server-side signing', 'ok');
  } catch (e) {
    console.error('Failed to persist TC session:', e);
  }
}

// --- Token Management ---

async function createToken() {
  const labelInput = document.getElementById('token-label');
  const label = labelInput.value.trim() || 'agent';
  try {
    const res = await fetch(API_URL + '/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, label }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    labelInput.value = '';
    log('Token "' + label + '" created', 'ok');

    showNewToken(data.token, data.label, data.sessionId);
    await loadSessions();
    setTimeout(() => loadSessions(), 1500);
  } catch (e) {
    log('Create token error: ' + e.message, 'err');
  }
}

async function loadSessions() {
  if (!clientToken) return;
  try {
    const res = await fetch(API_URL + '/v1/auth/sessions', {
      headers: { Authorization: 'Bearer ' + clientToken },
    });
    if (!res.ok) return;
    const data = await res.json();
    renderSessions(data.sessions);
  } catch {
    // silent
  }
}

async function revokeToken(sid, label) {
  try {
    const res = await fetch(API_URL + '/v1/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + clientToken,
      },
      body: JSON.stringify({ sessionId: sid }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    log('Token "' + label + '" revoked', 'ok');
    await loadSessions();
    setTimeout(() => loadSessions(), 1500);
  } catch (e) {
    log('Revoke error: ' + e.message, 'err');
  }
}

async function revokeAll() {
  try {
    const res = await fetch(API_URL + '/v1/auth/revoke-all', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + clientToken },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    log('Revoked ' + data.revoked + ' token(s)', 'ok');
    await loadSessions();
    setTimeout(() => loadSessions(), 1500);
  } catch (e) {
    log('Revoke all error: ' + e.message, 'err');
  }
}

document.getElementById('create-token').addEventListener('click', createToken);
document.getElementById('token-label').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createToken();
});

// --- Render Tokens ---

function showNewToken(token, label, sid) {
  const existing = document.getElementById('new-token-banner');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'new-token-banner';
  el.className = 'new-token-banner';
  el.innerHTML = `
    <div class="new-token-header">
      <span>New token created: <strong>${esc(label)}</strong></span>
      <button class="dismiss" onclick="this.closest('.new-token-banner').remove()">Dismiss</button>
    </div>
    <p class="new-token-warning">Copy this token now — it won't be shown again.</p>
    <div class="token-box">
      <code>${esc(token)}</code>
      <button onclick="navigator.clipboard.writeText('${esc(token)}');log('Token copied','ok')">Copy</button>
    </div>
  `;
  document.getElementById('token-list').prepend(el);
}

function renderSessions(sessions) {
  const list = document.getElementById('token-list');
  const banner = document.getElementById('new-token-banner');

  const others = sessions.filter(s => s.sid !== clientSessionId);
  const sorted = others.sort((a, b) => b.createdAt - a.createdAt);
  const cards = sorted.map((s) => {
    const age = timeAgo(s.createdAt);
    return `
      <div class="token-card">
        <div class="token-card-row">
          <span class="token-label">${esc(s.label)}</span>
          <span class="token-age">${age}</span>
        </div>
        <div class="token-card-actions">
          <button class="revoke" onclick="revokeToken('${s.sid}','${esc(s.label)}')">Revoke</button>
        </div>
      </div>
    `;
  }).join('');

  const bannerHtml = banner ? banner.outerHTML : '';
  list.innerHTML = bannerHtml + cards;

  if (!sorted.length && !banner) {
    list.innerHTML = '<p class="empty">No tokens yet</p>';
  }

  const othersCount = sorted.length;
  const revokeAllRow = document.getElementById('revoke-all-row');
  if (revokeAllRow) {
    if (othersCount > 0) revokeAllRow.classList.remove('hidden');
    else revokeAllRow.classList.add('hidden');
  }
}

// --- Polling (Transaction Log) ---

function startPolling() {
  stopPolling();
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function poll() {
  if (!clientToken) return;
  try {
    const res = await fetch(API_URL + '/v1/auth/tx-log', {
      headers: { Authorization: 'Bearer ' + clientToken },
    });
    if (!res.ok) return;
    const data = await res.json();
    renderTxLog(data.transactions || []);
  } catch {
    // silent
  }
}

// --- Render Transaction Log ---

function renderTxLog(transactions) {
  const list = document.getElementById('tx-log-list');
  if (!list) return;
  if (!transactions.length) {
    list.innerHTML = '<p class="empty">No transactions yet. Create a token and use the API or MCP server to request transfers.</p>';
    return;
  }
  list.innerHTML = transactions.map(tx => {
    const statusClass = tx.status === 'confirmed' ? 'ok'
      : tx.status === 'rejected' ? 'err'
      : tx.status === 'expired' ? 'dim'
      : '';
    return `
      <div class="tx-card">
        <div class="row"><span class="label">To</span><span class="value">${shortAddr(tx.to)}</span></div>
        <div class="row"><span class="label">Amount</span><span class="value">${formatNano(tx.amountNano)} TON</span></div>
        <div class="row"><span class="label">Status</span><span class="value status-${statusClass}">${tx.status}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${timeAgo(tx.createdAt)}</span></div>
      </div>
    `;
  }).join('');
}

// --- Helpers ---

function shortAddr(addr) {
  if (!addr) return '\u2014';
  if (addr.length <= 16) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-6);
}

function formatNano(nano) {
  return (BigInt(nano) / 1000000000n).toString() + '.' +
    (BigInt(nano) % 1000000000n).toString().padStart(9, '0').replace(/0+$/, '') || '0';
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  return Math.floor(hr / 24) + 'd ago';
}

function esc(s) {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}

function log(msg, cls) {
  const el = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = 'entry' + (cls ? ' ' + cls : '');
  entry.textContent = new Date().toLocaleTimeString() + ' \u2014 ' + msg;
  el.prepend(entry);
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
