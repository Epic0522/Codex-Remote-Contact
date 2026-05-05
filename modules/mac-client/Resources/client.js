const HUB = location.protocol.startsWith("http") ? "" : "http://127.0.0.1:3789";
const pollMs = 2200;

const els = {
  hubStatus: document.querySelector("#hubStatus"),
  refresh: document.querySelector("#refresh"),
  openHub: document.querySelector("#openHub"),
  qqToggle: document.querySelector("#qqToggle"),
  imessageToggle: document.querySelector("#imessageToggle"),
  refreshMaintenance: document.querySelector("#refreshMaintenance"),
  refreshMemory: document.querySelector("#refreshMemory"),
  healthGrid: document.querySelector("#healthGrid"),
  lastUpdated: document.querySelector("#lastUpdated"),
  groupCount: document.querySelector("#groupCount"),
  groupList: document.querySelector("#groupList"),
  groupInput: document.querySelector("#groupInput"),
  addGroupForm: document.querySelector("#addGroupForm"),
  handleCount: document.querySelector("#handleCount"),
  handleList: document.querySelector("#handleList"),
  handleInput: document.querySelector("#handleInput"),
  addHandleForm: document.querySelector("#addHandleForm"),
  replyHandleInput: document.querySelector("#replyHandleInput"),
  replyHandleForm: document.querySelector("#replyHandleForm"),
  qqEvents: document.querySelector("#qqEvents"),
  imessageEvents: document.querySelector("#imessageEvents"),
  memoryView: document.querySelector("#memoryView"),
  memoryTabs: Array.from(document.querySelectorAll("[data-memory-tab]"))
};

let lastState = null;
let lastMemory = null;
let activeMemoryTab = "unified";
const openMemoryGroups = new Set();
let busy = false;

async function api(path, options = {}) {
  const response = await fetch(`${HUB}${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function refreshAll() {
  if (busy) return;
  busy = true;
  try {
    const [state, maintenance, memory] = await Promise.all([
      api("/api/state"),
      api("/api/maintenance"),
      api("/api/memory")
    ]);
    setHubStatus(true);
    lastState = state;
    lastMemory = memory;
    try {
      renderState(state);
      renderMaintenance(maintenance);
      renderMemory(memory);
    } catch (renderError) {
      console.error(renderError);
    }
  } catch (error) {
    setHubStatus(false, error.message);
  } finally {
    busy = false;
  }
}

function setHubStatus(ok, message = "") {
  els.hubStatus.textContent = ok ? "Hub 在线" : "Hub 离线";
  els.hubStatus.title = message;
  els.hubStatus.classList.toggle("warn", !ok);
  els.hubStatus.classList.toggle("bad", !ok);
}

function renderState(state) {
  els.qqToggle.checked = Boolean(state.channels?.qq);
  els.imessageToggle.checked = Boolean(state.channels?.imessage);
  renderGroups(state.qq?.allowedGroups || []);
  renderHandles(state.imessage?.trustedHandles || []);
  els.replyHandleInput.value = state.imessage?.replyHandle || "";
  renderQqEvents(state.qq?.events || []);
  renderIMessageEvents(state.imessage?.events || []);
}

function renderMaintenance(health) {
  setHubStatus(true);
  els.lastUpdated.textContent = `上次同步 ${new Date().toLocaleTimeString()}`;
  const cards = [
    {
      title: "LLBot / OneBot",
      ok: health.oneBot?.ok,
      lines: [
        health.oneBot?.ok ? "API 在线" : "API 离线",
        health.oneBot?.nickname ? `账号 ${health.oneBot.nickname}` : null,
        health.oneBot?.selfId ? `QQ ${health.oneBot.selfId}` : null,
        health.oneBot?.lastError
      ]
    },
    {
      title: "Codex CLI",
      ok: health.codex?.pathExists && health.codex?.lastOk !== false,
      lines: [
        health.codex?.pathExists ? "路径存在" : "路径缺失",
        health.codex?.lastRunAt ? `运行 ${formatTime(health.codex.lastRunAt)}` : "还未运行",
        health.codex?.lastDurationMs != null ? `${health.codex.lastDurationMs} ms` : null,
        health.codex?.lastError
      ],
      detailHtml: renderCodexQuotaBlock(health.codex?.quota)
    },
    {
      title: "iMessage",
      ok: health.channels?.imessage && health.imessage?.status !== "error",
      lines: [
        health.channels?.imessage ? "开关开启" : "开关关闭",
        `状态 ${health.imessage?.status || "idle"}`,
        `可信 ${health.imessage?.trustedHandles ?? 0} 个`,
        health.imessage?.lastError
      ]
    },
    {
      title: "远程执行模式",
      ok: Boolean(health.remoteExecution?.enabled),
      lines: [
        health.remoteExecution?.enabled ? "当前开启" : "当前关闭",
        `模型 ${health.remoteExecution?.model || "未知"}`,
        `智能 ${health.remoteExecution?.reasoningEffort || "未知"}`,
        `记忆 ${health.remoteExecution?.memoryCount ?? 0} 条`,
        health.remoteExecution?.busy ? "Codex 正在运行" : null
      ]
    },
    {
      title: "QQ",
      ok: health.channels?.qq,
      lines: [
        health.channels?.qq ? "开关开启" : "开关关闭",
        `白名单 ${health.qq?.allowedGroups ?? 0} 个`,
        `记忆 ${health.qq?.memoryGroups ?? 0} 个群`,
        `事件 ${health.qq?.recentEvents ?? 0} 条`
      ]
    },
    {
      title: "联网查询",
      ok: health.webLookup?.enabled && health.webLookup?.lastOk !== false,
      lines: [
        health.webLookup?.enabled ? "开关开启" : "开关关闭",
        health.webLookup?.lastQuery ? `查询 ${health.webLookup.lastQuery}` : "还未查询",
        health.webLookup?.lastDurationMs != null ? `${health.webLookup.lastDurationMs} ms` : null,
        health.webLookup?.lastError
      ]
    }
  ];

  els.healthGrid.innerHTML = cards.map((card) => `
    <article class="health-card ${card.ok ? "ok" : "bad"}">
      <div class="title">
        <strong>${escapeHtml(card.title)}</strong>
        <span>${card.ok ? "正常" : "注意"}</span>
      </div>
      ${card.lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      ${card.detailHtml || ""}
    </article>
  `).join("");
}

function renderCodexQuotaBlock(quota) {
  if (!quota?.available) return "";
  const rows = [
    renderQuotaRow("5 小时", quota.primary),
    renderQuotaRow("7 天", quota.secondary)
  ].filter(Boolean).join("");
  const summary = quota.totalTokens != null && quota.modelContextWindow != null
    ? `<p class="quota-summary">已使用 ${escapeHtml(formatTokenNumber(quota.totalTokens))} / 共 ${escapeHtml(formatContextWindow(quota.modelContextWindow))}</p>`
    : "";
  const updated = quota.updatedAt
    ? `<p class="quota-updated">记录 ${escapeHtml(formatTime(quota.updatedAt))}</p>`
    : "";
  return rows || summary ? `<div class="quota-block">${summary}${rows}${updated}</div>` : "";
}

function renderQuotaRow(label, window) {
  if (!window) return "";
  return `
    <div class="quota-row">
      <div class="quota-meta">
        <strong>${escapeHtml(label)}</strong>
        <span>剩余 ${escapeHtml(formatPercent(window.remainingPercent))} · 重置 ${escapeHtml(formatResetTime(window.resetsAt))}</span>
      </div>
      <div class="quota-track" aria-hidden="true">
        <span class="quota-fill" style="width: ${escapeHtml(formatPercent(window.remainingPercent))}"></span>
      </div>
    </div>
  `;
}

function renderMemory(memory) {
  if (!els.memoryView) return;
  rememberOpenMemoryGroups();
  els.memoryTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.memoryTab === activeMemoryTab);
  });

  if (activeMemoryTab === "unified") {
    els.memoryView.innerHTML = renderUnifiedMemory(memory?.unified || {});
    return;
  }

  if (activeMemoryTab === "remoteExecution") {
    const entries = memory?.remoteExecution?.entries || [];
    els.memoryView.innerHTML = `
      <div class="memory-toolbar">
        <strong>远程执行模式记忆 · ${entries.length} 条</strong>
        <button class="button danger" data-clear-memory="remoteExecution">清空</button>
      </div>
      ${renderMemoryEntries(entries, "远程执行模式还没有记忆。")}
    `;
    return;
  }

  if (activeMemoryTab === "qq") {
    const lightweight = memory?.qq?.lightweight || [];
    const recent = memory?.qq?.recent || [];
    const groups = [...lightweight, ...recent];
    els.memoryView.innerHTML = groups.length
      ? groups.map((group) => `
        <details class="memory-group" data-memory-key="qq:${escapeHtml(group.id)}" ${openMemoryGroups.has(`qq:${group.id}`) ? "open" : ""}>
          <summary>
            <span>${escapeHtml(group.title)}</span>
            <em>${group.count} 条</em>
            <button class="small-danger" data-clear-memory="qq" data-memory-id="${escapeHtml(group.id)}" type="button">清空</button>
          </summary>
          ${renderMemoryEntries(group.entries, "这个群还没有可显示的记忆。")}
        </details>
      `).join("")
      : `<p class="empty">QQ 还没有记忆。</p>`;
    return;
  }

  const handles = memory?.imessage || [];
  els.memoryView.innerHTML = handles.length
    ? handles.map((handle) => `
      <details class="memory-group" data-memory-key="imessage:${escapeHtml(handle.id)}" ${openMemoryGroups.has(`imessage:${handle.id}`) ? "open" : ""}>
        <summary>
          <span>${escapeHtml(handle.title)}</span>
          <em>${handle.count} 条</em>
          <button class="small-danger" data-clear-memory="imessage" data-memory-id="${escapeHtml(handle.id)}" type="button">清空</button>
        </summary>
        ${renderMemoryEntries(handle.entries, "这个联系人还没有可显示的记忆。")}
      </details>
    `).join("")
    : `<p class="empty">iMessage 还没有记忆。</p>`;
}

function renderUnifiedMemory(unified) {
  const settings = unified.settings || {};
  const counts = unified.counts || {};
  const entries = unified.entries || [];
  const stateParts = [
    unified.currentState?.timeContext,
    unified.currentState?.sleepState,
    unified.currentState?.recentMeal,
    unified.currentState?.bodyState,
    unified.currentState?.mood
  ].filter(Boolean);
  return `
    <div class="memory-toolbar">
      <strong>统一记忆 · ${entries.length} 条可读摘要</strong>
      <span class="muted-text">${escapeHtml(unified.updatedAt ? `更新 ${formatTime(unified.updatedAt)}` : "暂无更新")}</span>
    </div>
    <div class="unified-switches">
      ${renderUnifiedSwitch("autoWriteOnSkillRecall", "电脑端 skill 调用后写入", settings.autoWriteOnSkillRecall)}
      ${renderUnifiedSwitch("autoWriteOnIMessageRecall", "iMessage 跨端回看后写入", settings.autoWriteOnIMessageRecall)}
      ${renderUnifiedSwitch("manualHandoffCommand", "允许 /交接 手动写入", settings.manualHandoffCommand !== false)}
    </div>
    <div class="memory-summary-grid">
      <span>交接 ${escapeHtml(counts.handoffHistory || 0)}</span>
      <span>点子 ${escapeHtml(counts.ideas || 0)}</span>
      <span>项目 ${escapeHtml(counts.projectNotes || 0)}</span>
      <span>待办 ${escapeHtml(counts.openLoops || 0)}</span>
      <span>日常 ${escapeHtml(counts.dailyTimeline || 0)}</span>
    </div>
    ${stateParts.length ? `<p class="memory-state">近期状态：${escapeHtml(stateParts.join("；"))}</p>` : ""}
    ${unified.latestHandoff?.summary ? `
      <article class="memory-entry">
        <div class="meta">最近交接</div>
        <p>${escapeHtml(unified.latestHandoff.summary)}</p>
      </article>
    ` : ""}
    ${entries.length ? `<div class="memory-entries">${entries.map(renderUnifiedEntry).join("")}</div>` : `<p class="empty">统一记忆还没有可显示条目。</p>`}
  `;
}

function renderUnifiedSwitch(key, label, checked) {
  return `
    <label class="switch-row">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" data-unified-setting="${escapeHtml(key)}" ${checked ? "checked" : ""} />
    </label>
  `;
}

function renderUnifiedEntry(entry) {
  const title = [formatUnifiedType(entry.type), entry.topic].filter(Boolean).join(" · ");
  const meta = [title, entry.updatedAt ? formatTime(entry.updatedAt) : null].filter(Boolean).join(" · ");
  return `
    <article class="memory-entry">
      <div class="meta">${escapeHtml(meta || "统一记忆")}</div>
      <p>${escapeHtml(entry.summary || "")}</p>
    </article>
  `;
}

function formatUnifiedType(type) {
  return {
    handoff: "交接",
    idea: "点子",
    projectNote: "项目",
    preference: "偏好",
    openLoop: "待办",
    dailyState: "日常"
  }[type] || type || "";
}

function rememberOpenMemoryGroups() {
  els.memoryView?.querySelectorAll?.(".memory-group[data-memory-key]").forEach((group) => {
    const key = group.dataset.memoryKey;
    if (!key) return;
    if (group.open) openMemoryGroups.add(key);
    else openMemoryGroups.delete(key);
  });
}

function renderMemoryEntries(entries, emptyText) {
  return entries?.length
    ? `<div class="memory-entries">${entries.slice().reverse().map((entry) => `
      <article class="memory-entry">
        <div class="meta">${escapeHtml(formatMemoryRole(entry.role))}${entry.at ? ` · ${escapeHtml(formatTime(entry.at))}` : ""}</div>
        <p>${escapeHtml(entry.text)}</p>
      </article>
    `).join("")}</div>`
    : `<p class="empty">${escapeHtml(emptyText)}</p>`;
}

function formatMemoryRole(role) {
  const value = String(role || "");
  if (value === "assistant") return "assistant";
  if (value === "user") return "owner";
  return value || "消息";
}

function renderGroups(groups) {
  els.groupCount.textContent = `${groups.length} 个`;
  els.groupList.innerHTML = groups.length
    ? groups.map((groupId) => `
      <div class="list-item">
        <code>${escapeHtml(groupId)}</code>
        <button class="remove" data-remove-group="${escapeHtml(groupId)}" title="移除">×</button>
      </div>
    `).join("")
    : `<p class="empty">还没有群白名单。</p>`;
}

function renderHandles(handles) {
  els.handleCount.textContent = `${handles.length} 个`;
  els.handleList.innerHTML = handles.length
    ? handles.map((handle) => `
      <div class="list-item">
        <code>${escapeHtml(handle)}</code>
        <button class="remove" data-remove-handle="${escapeHtml(handle)}" title="移除">×</button>
      </div>
    `).join("")
    : `<p class="empty">还没有可信联系人。</p>`;
}

function renderQqEvents(events) {
  els.qqEvents.innerHTML = events.length
    ? events.slice(0, 8).map((record) => {
      const ok = Boolean(record.decision?.ok);
      const sender = record.event?.senderLabel || record.event?.senderName || "群友";
      const reply = record.reply ? `<p>回复：${escapeHtml(record.reply)}</p>` : "";
      return `
        <article class="event ${ok ? "ok" : "skip"}">
          <div class="meta">${formatTime(record.receivedAt)} · ${ok ? "回复" : "忽略"} · ${escapeHtml(record.decision?.reason || "")}</div>
          <p>${escapeHtml(sender)}：${escapeHtml(record.event?.text || "")}</p>
          ${reply}
        </article>
      `;
    }).join("")
    : `<p class="empty">暂无 QQ 事件。</p>`;
}

function renderIMessageEvents(events) {
  els.imessageEvents.innerHTML = events.length
    ? events.slice(0, 8).map((record) => {
      const ok = record.result?.ok || record.send?.ok;
      const attachments = record.event?.attachments?.length
        ? `<p>附件：${record.event.attachments.map((item) => escapeHtml(item.transferName || item.filename || "附件")).join("、")}</p>`
        : "";
      const reply = record.reply ? `<p>回复：${escapeHtml(record.reply)}</p>` : "";
      return `
        <article class="event ${ok ? "ok" : "skip"}">
          <div class="meta">${formatTime(record.receivedAt)} · ${record.trusted ? "可信" : "未授权"} · ${escapeHtml(record.result?.summary || "")}</div>
          <p>${escapeHtml(record.event?.handle || "未知")}：${escapeHtml(record.event?.text || "")}</p>
          ${attachments}
          ${reply}
        </article>
      `;
    }).join("")
    : `<p class="empty">暂无 iMessage 事件。</p>`;
}

async function setChannel(channel, enabled) {
  await api("/api/channel", {
    method: "POST",
    body: JSON.stringify({ channel, enabled })
  });
  await refreshAll();
}

async function saveGroups(groups) {
  await api("/api/qq/groups", {
    method: "POST",
    body: JSON.stringify({ allowedGroups: groups })
  });
  await refreshAll();
}

async function saveHandles(handles) {
  await api("/api/imessage/trusted-handles", {
    method: "POST",
    body: JSON.stringify({ trustedHandles: handles })
  });
  await refreshAll();
}

async function clearMemory(scope, id = "") {
  await api("/api/memory/clear", {
    method: "POST",
    body: JSON.stringify({ scope, id })
  });
  await refreshAll();
}

async function saveUnifiedMemorySettings(nextSettings) {
  await api("/api/unified-memory/settings", {
    method: "POST",
    body: JSON.stringify(nextSettings)
  });
  await refreshAll();
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString();
}

function formatResetTime(epochSeconds) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  const now = new Date();
  const sameDate = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return sameDate
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
}

function formatTokenNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return Math.round(numeric).toLocaleString("en-US");
}

function formatContextWindow(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}K`;
  return `${Math.round(numeric)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.refresh.addEventListener("click", refreshAll);
els.refreshMaintenance.addEventListener("click", refreshAll);
els.refreshMemory.addEventListener("click", refreshAll);
els.openHub.addEventListener("click", () => {
  window.webkit?.messageHandlers?.codexRemoteContactNative?.postMessage({ action: "openHub" });
});

els.qqToggle.addEventListener("change", () => setChannel("qq", els.qqToggle.checked).catch(refreshAll));
els.imessageToggle.addEventListener("change", () => setChannel("imessage", els.imessageToggle.checked).catch(refreshAll));

els.addGroupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = els.groupInput.value.trim();
  if (!value || !lastState) return;
  const groups = Array.from(new Set([...(lastState.qq?.allowedGroups || []), value]));
  els.groupInput.value = "";
  await saveGroups(groups);
});

els.groupList.addEventListener("click", async (event) => {
  const groupId = event.target?.dataset?.removeGroup;
  if (!groupId || !lastState) return;
  await saveGroups((lastState.qq?.allowedGroups || []).filter((item) => item !== groupId));
});

els.addHandleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = els.handleInput.value.trim();
  if (!value || !lastState) return;
  const handles = Array.from(new Set([...(lastState.imessage?.trustedHandles || []), value]));
  els.handleInput.value = "";
  await saveHandles(handles);
});

els.handleList.addEventListener("click", async (event) => {
  const handle = event.target?.dataset?.removeHandle;
  if (!handle || !lastState) return;
  await saveHandles((lastState.imessage?.trustedHandles || []).filter((item) => item !== handle));
});

els.replyHandleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/api/imessage/reply-handle", {
    method: "POST",
    body: JSON.stringify({ replyHandle: els.replyHandleInput.value.trim() })
  });
  await refreshAll();
});

els.memoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeMemoryTab = tab.dataset.memoryTab;
    renderMemory(lastMemory);
  });
});

els.memoryView.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-clear-memory]");
  if (!button) return;
  event.preventDefault();
  const scope = button.dataset.clearMemory;
  const id = button.dataset.memoryId || "";
  await clearMemory(scope, id);
});

els.memoryView.addEventListener("change", async (event) => {
  const input = event.target?.closest?.("[data-unified-setting]");
  if (!input || !lastMemory?.unified) return;
  const key = input.dataset.unifiedSetting;
  const settings = {
    autoWriteOnSkillRecall: Boolean(lastMemory.unified.settings?.autoWriteOnSkillRecall),
    autoWriteOnIMessageRecall: lastMemory.unified.settings?.autoWriteOnIMessageRecall !== false,
    manualHandoffCommand: lastMemory.unified.settings?.manualHandoffCommand !== false
  };
  settings[key] = input.checked;
  await saveUnifiedMemorySettings(settings);
});

refreshAll();
setInterval(refreshAll, pollMs);
