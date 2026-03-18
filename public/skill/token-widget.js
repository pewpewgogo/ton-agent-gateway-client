// Token Generator Widget for skill pages
// Connects wallet via TON Connect, creates a token, shows it inline

const API_URL = 'https://api.tongateway.ai';
let twTonConnect = null;
let twWalletAddress = null;

function initTokenWidget() {
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    w.innerHTML = `
      <div class="tw-connect">
        <button class="tw-btn" onclick="twConnect()">Connect Wallet & Generate Token</button>
        <p class="tw-hint">Connects via TON Connect, creates a token instantly</p>
      </div>
      <div class="tw-generating tw-hidden">
        <div class="tw-spinner"></div>
        <span>Connecting wallet...</span>
      </div>
      <div class="tw-result tw-hidden">
        <div class="tw-token-box">
          <code class="tw-token-value"></code>
          <button class="tw-copy-btn" onclick="twCopyToken(this)">Copy</button>
        </div>
        <p class="tw-token-hint">Paste this token into your config above.</p>
        <button class="tw-btn tw-btn-sm" onclick="twGenerateAnother()">Generate another token</button>
        <button class="tw-btn-link" onclick="twDisconnect()">Disconnect wallet</button>
      </div>
    `;
  });
}

async function twConnect() {
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    w.querySelector('.tw-connect').classList.add('tw-hidden');
    w.querySelector('.tw-generating').classList.remove('tw-hidden');
  });

  try {
    if (!twTonConnect) {
      twTonConnect = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: window.location.origin + '/tonconnect-manifest.json',
      });
    }

    const connected = twTonConnect.connected;
    if (!connected) {
      await twTonConnect.openModal();
      // Wait for connection
      await new Promise((resolve, reject) => {
        const unsub = twTonConnect.onStatusChange((wallet) => {
          unsub();
          if (wallet) resolve(wallet);
          else reject(new Error('Connection cancelled'));
        });
      });
    }

    twWalletAddress = twTonConnect.account.address;
    await twCreateToken();
  } catch (e) {
    // Reset to connect state
    widgets.forEach(w => {
      w.querySelector('.tw-connect').classList.remove('tw-hidden');
      w.querySelector('.tw-generating').classList.add('tw-hidden');
    });
  }
}

async function twCreateToken() {
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    const gen = w.querySelector('.tw-generating');
    gen.classList.remove('tw-hidden');
    gen.querySelector('span').textContent = 'Generating token...';
  });

  try {
    const res = await fetch(API_URL + '/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: twWalletAddress, label: 'skill-page' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    widgets.forEach(w => {
      w.querySelector('.tw-generating').classList.add('tw-hidden');
      w.querySelector('.tw-result').classList.remove('tw-hidden');
      w.querySelector('.tw-token-value').textContent = data.token;
    });
  } catch (e) {
    widgets.forEach(w => {
      w.querySelector('.tw-generating').classList.add('tw-hidden');
      w.querySelector('.tw-connect').classList.remove('tw-hidden');
      const btn = w.querySelector('.tw-btn');
      btn.textContent = 'Try again';
    });
  }
}

async function twGenerateAnother() {
  await twCreateToken();
}

function twCopyToken(btn) {
  const token = btn.closest('.tw-token-box').querySelector('.tw-token-value').textContent;
  navigator.clipboard.writeText(token).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('tw-copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('tw-copied');
    }, 2000);
  });
}

async function twDisconnect() {
  if (twTonConnect) {
    await twTonConnect.disconnect();
  }
  twWalletAddress = null;
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    w.querySelector('.tw-result').classList.add('tw-hidden');
    w.querySelector('.tw-generating').classList.add('tw-hidden');
    w.querySelector('.tw-connect').classList.remove('tw-hidden');
    w.querySelector('.tw-connect .tw-btn').textContent = 'Connect Wallet & Generate Token';
  });
}

document.addEventListener('DOMContentLoaded', initTokenWidget);
