/**
 * Rahul Kumar portfolio AI assistant - embeddable chat widget.
 *
 * Usage: drop this file next to your portfolio's index.html, then add before
 * </body>:
 *
 *   <script src="ask-rahul-widget.js" data-worker-url="https://YOUR-WORKER.workers.dev"></script>
 *
 * No build step, no dependencies - plain JS + injected CSS, matches the
 * portfolio's dark navy / gold theme.
 */
;(function () {
  const scriptTag = document.currentScript
  const WORKER_URL = scriptTag?.dataset.workerUrl
  if (!WORKER_URL) {
    console.error('[ask-rahul-widget] Missing data-worker-url attribute on the script tag.')
    return
  }

  const STORAGE_KEY = 'ask_rahul_history_v1'

  const style = document.createElement('style')
  style.textContent = `
    .ar-launcher {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      min-width: 60px; height: 60px; padding: 0 18px; border-radius: 999px;
      background: linear-gradient(135deg, #d4af37, #f0d878);
      color: #0b1220; border: none; cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      font-size: 22px; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: transform 0.2s ease, width 0.25s ease, box-shadow 0.2s ease;
    }
    .ar-launcher:hover { transform: scale(1.04); box-shadow: 0 12px 30px rgba(0,0,0,0.42); }
    .ar-launcher-label { font-size: 12px; font-weight: 700; letter-spacing: .2px; }
    .ar-launcher.is-compact .ar-launcher-label { display: inline; }
    .ar-launcher.is-highlighted { min-width: 156px; }
    @media (max-width: 700px) {
      .ar-launcher.is-compact .ar-launcher-label { display: none; }
    }
    .ar-launcher-icon { line-height: 1; }
    .ar-panel {
      position: fixed; bottom: 96px; right: 24px; z-index: 9999;
      width: min(380px, calc(100vw - 32px)); height: min(560px, calc(100vh - 140px));
      background: #0e1626; border: 1px solid rgba(212,175,55,0.25);
      border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      display: none; flex-direction: column; overflow: hidden;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .ar-panel.ar-open { display: flex; }
    .ar-header {
      background: linear-gradient(135deg, #10192c, #0b1220);
      border-bottom: 1px solid rgba(212,175,55,0.25);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    .ar-header-avatar {
      width: 34px; height: 34px; border-radius: 999px;
      background: linear-gradient(135deg, #d4af37, #f0d878);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: #0b1220; font-size: 14px; flex-shrink: 0;
    }
    .ar-header-text { flex: 1; min-width: 0; }
    .ar-header-title { color: #f3ead0; font-weight: 600; font-size: 14px; margin: 0; }
    .ar-header-subtitle { color: #9aa5b8; font-size: 11px; margin: 0; }
    .ar-close {
      background: none; border: none; color: #9aa5b8; cursor: pointer;
      font-size: 18px; padding: 4px 8px; line-height: 1;
    }
    .ar-close:hover { color: #f3ead0; }
    .ar-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex;
      flex-direction: column; gap: 10px; background: #0b1220;
    }
    .ar-msg { max-width: 85%; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.45; white-space: pre-wrap; }
    .ar-msg.ar-user { align-self: flex-end; background: #d4af37; color: #0b1220; border-bottom-right-radius: 3px; }
    .ar-msg.ar-bot { align-self: flex-start; background: #182338; color: #e7ecf5; border-bottom-left-radius: 3px; }
    .ar-msg.ar-error { align-self: flex-start; background: #3a1f1f; color: #f3c8c8; border-bottom-left-radius: 3px; }
    .ar-typing { align-self: flex-start; color: #9aa5b8; font-size: 12px; padding: 2px 12px; }
    .ar-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; background: #0b1220; }
    .ar-suggestion {
      background: #182338; color: #d4af37; border: 1px solid rgba(212,175,55,0.3);
      border-radius: 999px; padding: 5px 10px; font-size: 11.5px; cursor: pointer;
    }
    .ar-suggestion:hover { background: #1f2c46; }
    .ar-inputbar { display: flex; gap: 8px; padding: 12px; border-top: 1px solid rgba(212,175,55,0.2); background: #10192c; }
    .ar-input {
      flex: 1; background: #0b1220; border: 1px solid rgba(212,175,55,0.25);
      border-radius: 999px; padding: 9px 14px; color: #f3ead0; font-size: 13.5px; outline: none;
    }
    .ar-input::placeholder { color: #6b7690; }
    .ar-send {
      background: #d4af37; color: #0b1220; border: none; border-radius: 999px;
      width: 36px; height: 36px; flex-shrink: 0; cursor: pointer; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
    }
    .ar-send:disabled { opacity: 0.5; cursor: default; }
    .ar-footer-note { text-align: center; font-size: 10px; color: #5c6784; padding: 0 12px 10px; background: #10192c; }
    @media (max-width: 480px) {
      .ar-panel { right: 16px; bottom: 88px; }
      .ar-launcher { right: 16px; bottom: 16px; }
    }
  `
  document.head.appendChild(style)

  const launcher = document.createElement('button')
  launcher.className = 'ar-launcher is-highlighted'
  launcher.setAttribute('aria-label', 'Ask Rahul\'s AI assistant a question')
  launcher.innerHTML = '<span class="ar-launcher-icon">🤖</span><span class="ar-launcher-label">Ask Rahul AI</span>'

  const panel = document.createElement('div')
  panel.className = 'ar-panel'
  panel.innerHTML = `
    <div class="ar-header">
      <div class="ar-header-avatar">RK</div>
      <div class="ar-header-text">
        <p class="ar-header-title">Ask about Rahul</p>
        <p class="ar-header-subtitle">AI assistant &middot; answers from his resume</p>
      </div>
      <button class="ar-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="ar-messages" id="ar-messages"></div>
    <div class="ar-suggestions" id="ar-suggestions">
      <button class="ar-suggestion" data-q="What's Rahul's current role?">Current role?</button>
      <button class="ar-suggestion" data-q="What are his strongest technical skills?">Top skills?</button>
      <button class="ar-suggestion" data-q="Does he have experience with Java and Spring Boot?">Java/Spring exp?</button>
      <button class="ar-suggestion" data-q="What are his key achievements?">Key achievements?</button>
    </div>
    <div class="ar-inputbar">
      <input class="ar-input" id="ar-input" type="text" placeholder="Ask about his experience, skills..." maxlength="500" />
      <button class="ar-send" id="ar-send" aria-label="Send">&#10148;</button>
    </div>
    <p class="ar-footer-note">AI-generated answers grounded in Rahul's actual resume.</p>
  `

  document.body.appendChild(launcher)
  document.body.appendChild(panel)

  const messagesEl = panel.querySelector('#ar-messages')
  const suggestionsEl = panel.querySelector('#ar-suggestions')
  const inputEl = panel.querySelector('#ar-input')
  const sendBtn = panel.querySelector('#ar-send')
  const closeBtn = panel.querySelector('.ar-close')

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20)))
    } catch {
      // sessionStorage may be unavailable (private browsing) - conversation just won't persist across reload
    }
  }

  let history = loadHistory()

  function renderMessage(role, text, isError) {
    const div = document.createElement('div')
    div.className = `ar-msg ${isError ? 'ar-error' : role === 'user' ? 'ar-user' : 'ar-bot'}`
    div.textContent = text
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  // restore any prior conversation from this browser tab
  history.forEach((turn) => renderMessage(turn.role === 'model' ? 'bot' : 'user', turn.text))
  if (history.length === 0) {
    renderMessage('bot', "Hi! I'm an AI assistant trained on Rahul's resume. Ask me about his experience, skills, or projects.")
  } else {
    suggestionsEl.style.display = 'none'
  }

  let isOpen = false
  function toggle(open) {
    isOpen = open ?? !isOpen
    panel.classList.toggle('ar-open', isOpen)
    if (isOpen) inputEl.focus()
  }
  launcher.addEventListener('click', () => {
    toggle()
    if (isOpen) window.dispatchEvent(new CustomEvent('rahul:ai-opened'))
  })
  closeBtn.addEventListener('click', () => toggle(false))

  // Allow other portfolio UI elements (for example Recruiter View)
  // to open the same AI panel without duplicating the widget UI.
  window.openRahulAI = () => {
    toggle(true)
    window.dispatchEvent(new CustomEvent('rahul:ai-opened'))
  }

  window.addEventListener('rahul:open-ai', () => {
    window.openRahulAI?.()
  })

  // Make the AI feature obvious for first-time visitors, then keep it compact.
  // Keep the AI launcher labeled so visitors immediately know what it does.
  launcher.classList.add('is-highlighted')

  function applyWidgetTheme(theme) {
    const palettes = {
      midnight: ['#d4af37','#f0d878','#0b1220'],
      developer: ['#22d3ee','#67e8f9','#07100d'],
      corporate: ['#3b82f6','#76a9ff','#071a36'],
      modern: ['#8b5cf6','#c4b5fd','#100a1f'],
      light: ['#b07a08','#d6a52f','#182235']
    }
    const p = palettes[theme] || palettes.midnight
    launcher.style.background = `linear-gradient(135deg, ${p[0]}, ${p[1]})`
    launcher.style.color = p[2]
  }

  applyWidgetTheme(document.body?.dataset?.theme || 'midnight')
  window.addEventListener('rahul:theme-changed', (event) => {
    applyWidgetTheme(event.detail?.theme || 'midnight')
  })

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed) return

    suggestionsEl.style.display = 'none'
    renderMessage('user', trimmed)
    history.push({ role: 'user', text: trimmed })
    saveHistory(history)

    inputEl.value = ''
    inputEl.disabled = true
    sendBtn.disabled = true

    const typingEl = document.createElement('div')
    typingEl.className = 'ar-typing'
    typingEl.textContent = 'Thinking...'
    messagesEl.appendChild(typingEl)
    messagesEl.scrollTop = messagesEl.scrollHeight

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: history.slice(0, -1) })
      })
      const data = await res.json()
      typingEl.remove()

      if (!res.ok) {
        renderMessage('bot', data.error || 'Something went wrong. Please try again.', true)
        return
      }

      renderMessage('bot', data.reply)
      history.push({ role: 'model', text: data.reply })
      saveHistory(history)
    } catch (err) {
      typingEl.remove()
      renderMessage('bot', 'Could not reach the assistant - please check your connection and try again.', true)
    } finally {
      inputEl.disabled = false
      sendBtn.disabled = false
      inputEl.focus()
    }
  }

  sendBtn.addEventListener('click', () => sendMessage(inputEl.value))
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage(inputEl.value)
  })
  suggestionsEl.querySelectorAll('.ar-suggestion').forEach((btn) => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.q))
  })
})()
