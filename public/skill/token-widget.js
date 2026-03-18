// Token Generator Widget for skill pages
// Connects wallet via TON Connect, creates a token, shows it inline

const API_URL = 'https://api.tongateway.ai';
let twTonConnect = null;
let twWalletAddress = null;
let twReady = false;

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

  // Initialize TON Connect early so it restores session from localStorage
  twTonConnect = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
  });

  // Listen for restored session
  twTonConnect.onStatusChange((wallet) => {
    if (wallet) {
      twWalletAddress = wallet.account.address;
      twReady = true;
      // Update button text to show wallet is already connected
      widgets.forEach(w => {
        const btn = w.querySelector('.tw-connect .tw-btn');
        if (btn && !w.querySelector('.tw-result:not(.tw-hidden)')) {
          btn.textContent = 'Generate Token';
        }
      });
    } else {
      twWalletAddress = null;
      twReady = false;
    }
  });
}

function twShowState(state) {
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    w.querySelector('.tw-connect').classList.toggle('tw-hidden', state !== 'connect');
    w.querySelector('.tw-generating').classList.toggle('tw-hidden', state !== 'generating');
    w.querySelector('.tw-result').classList.toggle('tw-hidden', state !== 'result');
  });
}

async function twConnect() {
  twShowState('generating');

  try {
    // Already connected (restored from localStorage or same session)
    if (twTonConnect.connected && twTonConnect.account) {
      twWalletAddress = twTonConnect.account.address;
      await twCreateToken();
      return;
    }

    // Not connected — open modal and wait
    await twTonConnect.openModal();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new Error('Timeout')); }, 120000);
      const unsub = twTonConnect.onStatusChange((wallet) => {
        clearTimeout(timeout);
        unsub();
        if (wallet) {
          twWalletAddress = wallet.account.address;
          resolve(wallet);
        } else {
          reject(new Error('Connection cancelled'));
        }
      });
    });

    await twCreateToken();
  } catch (e) {
    twShowState('connect');
  }
}

async function twCreateToken() {
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    const gen = w.querySelector('.tw-generating');
    gen.classList.remove('tw-hidden');
    gen.querySelector('span').textContent = 'Generating token...';
  });
  twShowState('generating');

  try {
    const res = await fetch(API_URL + '/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: twWalletAddress, label: 'skill-page' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    widgets.forEach(w => {
      w.querySelector('.tw-token-value').textContent = data.token;
    });
    twShowState('result');
  } catch (e) {
    twShowState('connect');
    const widgets = document.querySelectorAll('.token-widget');
    widgets.forEach(w => {
      w.querySelector('.tw-connect .tw-btn').textContent = 'Try again';
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
  twReady = false;
  twShowState('connect');
  const widgets = document.querySelectorAll('.token-widget');
  widgets.forEach(w => {
    w.querySelector('.tw-connect .tw-btn').textContent = 'Connect Wallet & Generate Token';
  });
}

document.addEventListener('DOMContentLoaded', initTokenWidget);
